<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Invoice;
use App\Services\DateFilterService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class BillingReconciliationReportController extends Controller
{
    /**
     * Payment method mapping to numerical codes used in accounting cuadre.
     */
    const PAYMENT_CODES = [
        'cash' => 1,
        'check' => 2,
        'card' => 3,
        'credit card' => 3,
        'transfer' => 4,
        'bank transfer' => 4,
        'credit' => 5,
    ];

    const PAYMENT_LABELS = [
        1 => 'Efectivo',
        2 => 'Cheque',
        3 => 'T/C POS',
        4 => 'Transferencia',
        5 => 'Crédito',
    ];

    /**
     * Display the Cuadre de Facturación report with non-blocking async calculation.
     */
    public function index(Request $request)
    {
        Gate::authorize('reports.billing_reconciliation.view');

        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_billing_reconciliation_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );

        $dateFrom = $resolvedDates['from'] ?: Carbon::today()->startOfMonth()->toDateString();
        $dateTo = $resolvedDates['to'] ?: Carbon::today()->toDateString();

        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(DateFilterService::getCookieToQueue(
                "date_filter_report_billing_reconciliation_user_{$userId}",
                $dateFrom,
                $dateTo,
                $resolvedDates['range']
            ));
        }

        $customerId = $request->get('customer_id');
        $search = $request->get('search');

        // Resolve customer for display label if filtered
        $selectedCustomer = null;
        if ($customerId && $customerId !== 'all') {
            $selectedCustomer = Customer::where('id', $customerId)
                ->select('id', 'name', 'id_number')
                ->first();
        }

        // Return Inertia response with deferred calculations to keep page rendering non-blocking
        return Inertia::render('reports/billing-reconciliation/index', [
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'customer_id' => $customerId,
                'search' => $search,
            ],
            'selectedCustomer' => $selectedCustomer,
            'reportData' => Inertia::defer(fn () => $this->calculateReportData(
                $dateFrom,
                $dateTo,
                $customerId,
                $search
            )),
        ]);
    }

    /**
     * Calculate all daily settlement tables, summaries and period stats.
     */
    public function calculateReportData(string $dateFrom, string $dateTo, ?string $customerId = null, ?string $search = null): array
    {
        $startDate = Carbon::parse($dateFrom)->startOfDay();
        $endDate = Carbon::parse($dateTo)->endOfDay();

        // 1. Fetch all invoices in the date range with necessary relations
        $query = Invoice::with(['customer', 'specimen.type', 'createdBy', 'creditRelation'])
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween(DB::raw('COALESCE(invoices.invoice_date, invoices.created_at)'), [
                    $startDate->toDateTimeString(),
                    $endDate->toDateTimeString(),
                ]);
            });

        // Invoices must have an invoice number assigned
        $query->whereNotNull('invoices.invoice_number')
            ->where('invoices.invoice_number', '!=', '');

        // Only include invoices that are already paid:
        // - Cancelled invoices are retained for sequential audit trail
        // - Invoices with a credit assigned must have their credit in 'paid' status
        // - Invoices without a credit assigned must not have payment_type = 'credit'
        $query->where(function ($q) {
            $q->where('invoices.invoice_type', 'cancelled')
                ->orWhere(function ($sub) {
                    $sub->whereNotNull('invoices.credit_payment_id')
                        ->whereHas('creditRelation', function ($cq) {
                            $cq->where('status', 'paid');
                        });
                })
                ->orWhere(function ($sub) {
                    $sub->whereNull('invoices.credit_payment_id')
                        ->where('invoices.payment_type', '!=', 'credit');
                });
        });

        if ($customerId && $customerId !== 'all') {
            $query->where('customer_id', $customerId);
        }

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('full_invoice_number', 'like', "%{$search}%")
                    ->orWhere('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('id_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    });
            });
        }

        $invoices = $query->orderBy(DB::raw('COALESCE(invoices.invoice_date, invoices.created_at)'), 'asc')
            ->orderBy('id', 'asc')
            ->get();

        // 2. Group invoices by date string Y-m-d
        $invoicesByDate = [];
        foreach ($invoices as $invoice) {
            $date = $invoice->invoice_date
                ? Carbon::parse($invoice->invoice_date)->toDateString()
                : ($invoice->created_at ? $invoice->created_at->toDateString() : null);

            if ($date) {
                $invoicesByDate[$date][] = $invoice;
            }
        }

        // 3. Generate list of working days (MONDAY through SATURDAY, STRICTLY EXCLUDING SUNDAY)
        $dailyTables = [];
        $resumenRows = [];

        $period = CarbonPeriod::create($startDate->toDateString(), $endDate->toDateString());

        $periodTotals = [
            'gross' => 0.0,
            'discount' => 0.0,
            'net' => 0.0,
            'cash' => 0.0,
            'check' => 0.0,
            'card' => 0.0,
            'transfer' => 0.0,
            'credit' => 0.0,
            'taxable_15' => 0.0,
            'exempt' => 0.0,
            'isv_15' => 0.0,
            'total_sales' => 0.0,
            'invoice_count' => 0,
            'active_count' => 0,
            'cancelled_count' => 0,
        ];

        foreach ($period as $day) {
            // STRICTLY IGNORE SUNDAYS
            if ($day->isSunday()) {
                continue;
            }

            $dateKey = $day->toDateString();
            $dayInvoices = $invoicesByDate[$dateKey] ?? [];

            $dayRows = [];
            $itemIndex = 1;

            $dayTotals = [
                'gross' => 0.0,
                'discount' => 0.0,
                'net' => 0.0,
            ];

            $settlement = [
                'cash' => 0.0,
                'check' => 0.0,
                'card' => 0.0,
                'transfer' => 0.0,
                'credit' => 0.0,
                'total' => 0.0,
                'difference' => 0.0,
                'is_balanced' => true,
            ];

            $dayTaxable15 = 0.0;
            $dayExempt = 0.0;
            $dayDiscount = 0.0;
            $dayIsv15 = 0.0;
            $dayTotalSales = 0.0;

            $firstInvoiceNum = null;
            $lastInvoiceNum = null;

            foreach ($dayInvoices as $inv) {
                $isCancelled = ($inv->invoice_type === 'cancelled');
                $invoiceNum = $inv->full_invoice_number ?: (string) $inv->invoice_number;

                if (! $firstInvoiceNum) {
                    $firstInvoiceNum = $invoiceNum;
                }
                $lastInvoiceNum = $invoiceNum;

                if ($isCancelled) {
                    $periodTotals['cancelled_count']++;
                    $dayRows[] = [
                        'item' => $itemIndex++,
                        'date' => $day->format('d/m/Y'),
                        'customer_name' => 'Anulada',
                        'quantity' => 0,
                        'payment_type_code' => 0,
                        'payment_type_label' => '-',
                        'gross_amount' => 0.0,
                        'discount' => 0.0,
                        'net_amount' => 0.0,
                        'comment' => 'Factura Anulada',
                        'invoice_number' => $invoiceNum,
                        'is_cancelled' => true,
                        'invoice_id' => $inv->id,
                    ];
                } else {
                    $periodTotals['active_count']++;

                    $pmKey = strtolower(trim((string) $inv->payment_type));
                    $pmCode = self::PAYMENT_CODES[$pmKey] ?? 1;
                    $pmLabel = self::PAYMENT_LABELS[$pmCode] ?? 'Efectivo';

                    $discount = (float) $inv->discount;
                    $net = (float) ($inv->total > 0 ? $inv->total : ($inv->total_paid > 0 ? $inv->total_paid : $inv->subtotal));
                    $gross = $net + $discount;

                    $quantity = (int) ($inv->quantity ?: 1);

                    $dayRows[] = [
                        'item' => $itemIndex++,
                        'date' => $day->format('d/m/Y'),
                        'customer_name' => $inv->customer?->name ?: 'Consumidor Final',
                        'quantity' => $quantity,
                        'payment_type_code' => $pmCode,
                        'payment_type_label' => $pmLabel,
                        'gross_amount' => $gross,
                        'discount' => $discount,
                        'net_amount' => $net,
                        'comment' => $inv->description ?: '',
                        'invoice_number' => $invoiceNum,
                        'is_cancelled' => false,
                        'invoice_id' => $inv->id,
                        'invoice' => $inv,
                    ];

                    $dayTotals['gross'] += $gross;
                    $dayTotals['discount'] += $discount;
                    $dayTotals['net'] += $net;

                    // Breakdown by payment code into settlement block
                    switch ($pmCode) {
                        case 1:
                            $settlement['cash'] += $net;
                            break;
                        case 2:
                            $settlement['check'] += $net;
                            break;
                        case 3:
                            $settlement['card'] += $net;
                            break;
                        case 4:
                            $settlement['transfer'] += $net;
                            break;
                        case 5:
                            $settlement['credit'] += $net;
                            break;
                    }

                    // Taxes for Resumen sheet
                    $t15 = (float) ($inv->taxable_amount_15 ?? ($inv->pay_isv ? $inv->subtotal : 0.0));
                    $ex = (float) ($inv->exempt_amount ?? ($inv->pay_isv ? 0.0 : $inv->subtotal));
                    $isv = (float) ($inv->isv_15 ?? ($inv->pay_isv ? round($t15 * 0.15, 2) : 0.0));

                    $dayTaxable15 += $t15;
                    $dayExempt += $ex;
                    $dayDiscount += $discount;
                    $dayIsv15 += $isv;
                    $dayTotalSales += ($t15 + $ex - $discount + $isv);
                }

                $periodTotals['invoice_count']++;
            }

            $settlement['total'] = $settlement['cash'] + $settlement['check'] + $settlement['card'] + $settlement['transfer'] + $settlement['credit'];
            $settlement['difference'] = round($dayTotals['net'] - $settlement['total'], 2);
            $settlement['is_balanced'] = (abs($settlement['difference']) < 0.01);

            // Accumulate into period totals
            $periodTotals['gross'] += $dayTotals['gross'];
            $periodTotals['discount'] += $dayTotals['discount'];
            $periodTotals['net'] += $dayTotals['net'];
            $periodTotals['cash'] += $settlement['cash'];
            $periodTotals['check'] += $settlement['check'];
            $periodTotals['card'] += $settlement['card'];
            $periodTotals['transfer'] += $settlement['transfer'];
            $periodTotals['credit'] += $settlement['credit'];
            $periodTotals['taxable_15'] += $dayTaxable15;
            $periodTotals['exempt'] += $dayExempt;
            $periodTotals['isv_15'] += $dayIsv15;
            $periodTotals['total_sales'] += $dayTotalSales;

            $spanishTitle = $this->formatDayTitleSpanish($day);

            $dailyTables[] = [
                'date' => $dateKey,
                'day_name' => strtoupper($this->getSpanishDayName($day->dayOfWeek)),
                'formatted_date' => $day->format('d/m/Y'),
                'title' => $spanishTitle,
                'items' => $dayRows,
                'totals' => $dayTotals,
                'settlement' => $settlement,
                'invoice_count' => count($dayRows),
            ];

            // Resumen row for this day
            $resumenRows[] = [
                'date' => $dateKey,
                'formatted_date' => $day->format('d/m/Y'),
                'start_invoice' => $firstInvoiceNum ?: '-',
                'end_invoice' => $lastInvoiceNum ?: '-',
                'customer' => 'Consumidor Final',
                'taxable_15' => $dayTaxable15,
                'exempt' => $dayExempt,
                'discount' => $dayDiscount,
                'isv_15' => $dayIsv15,
                'total' => $dayTotalSales,
                'has_invoices' => count($dayInvoices) > 0,
            ];
        }

        return [
            'dailyTables' => $dailyTables,
            'resumenRows' => $resumenRows,
            'periodTotals' => $periodTotals,
            'dateRange' => [
                'from' => $dateFrom,
                'to' => $dateTo,
                'from_formatted' => Carbon::parse($dateFrom)->format('d/m/Y'),
                'to_formatted' => Carbon::parse($dateTo)->format('d/m/Y'),
            ],
        ];
    }

    /**
     * Export the Cuadre de Facturación report to a 2-sheet Excel workbook.
     */
    public function export(Request $request)
    {
        Gate::authorize('reports.billing_reconciliation.view');

        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_billing_reconciliation_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );

        $dateFrom = $resolvedDates['from'] ?: Carbon::today()->startOfMonth()->toDateString();
        $dateTo = $resolvedDates['to'] ?: Carbon::today()->toDateString();
        $customerId = $request->get('customer_id');
        $search = $request->get('search');

        $reportData = $this->calculateReportData($dateFrom, $dateTo, $customerId, $search);

        $spreadsheet = new Spreadsheet;

        // ---------------------------------------------------------
        // SHEET 1: Ventas (Detalle Diario con Tablas y Arqueo)
        // ---------------------------------------------------------
        $sheetVentas = $spreadsheet->getActiveSheet();
        $sheetVentas->setTitle('Ventas');

        // Column widths matching reference Excel
        $columnWidths = [
            'A' => 4,
            'B' => 7,
            'C' => 12,
            'D' => 38,
            'E' => 10,
            'F' => 20,
            'G' => 18,
            'H' => 16,
            'I' => 18,
            'J' => 28,
            'K' => 16,
        ];
        foreach ($columnWidths as $col => $w) {
            $sheetVentas->getColumnDimension($col)->setWidth($w);
        }

        // White background
        $sheetVentas->getStyle('A1:L1000')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFFF');

        $currentRow = 2;

        foreach ($reportData['dailyTables'] as $dayTable) {
            $itemsCount = count($dayTable['items']);

            // 1. Day Banner: LIQUIDACIÓN DEL DIA [DÍA] [DD] [MES] [YYYY]
            $sheetVentas->setCellValue('B'.$currentRow, $dayTable['title']);
            $sheetVentas->getStyle('B'.$currentRow)->getFont()->setBold(true)->setSize(14)->setName('Calibri');
            $sheetVentas->getRowDimension($currentRow)->setRowHeight(24);
            $currentRow++;

            // 2. Header Row
            $headerRow = $currentRow;
            $headers = [
                'B' => 'ITEM',
                'C' => 'FECHA',
                'D' => 'NOMBRE PACIENTE',
                'E' => 'CANTIDAD',
                'F' => 'FORMA DE PAGO',
                'G' => 'VALOR DE FACTURA',
                'H' => 'DESCUENTO',
                'I' => 'PAGO RECIBIDO',
                'J' => 'COMENTARIO',
                'K' => 'FACTURA',
            ];
            foreach ($headers as $col => $text) {
                $sheetVentas->setCellValue($col.$headerRow, $text);
            }

            $sheetVentas->getStyle("B{$headerRow}:K{$headerRow}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 10, 'name' => 'Calibri'],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders' => [
                    'top' => ['borderStyle' => Border::BORDER_MEDIUM],
                    'bottom' => ['borderStyle' => Border::BORDER_MEDIUM],
                    'left' => ['borderStyle' => Border::BORDER_THIN],
                    'right' => ['borderStyle' => Border::BORDER_THIN],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'F2F2F2'],
                ],
            ]);
            $sheetVentas->getRowDimension($headerRow)->setRowHeight(22);
            $currentRow++;

            // 3. Data Rows
            $tableStartRow = $currentRow;
            if ($itemsCount === 0) {
                $sheetVentas->setCellValue('B'.$currentRow, '-');
                $sheetVentas->setCellValue('C'.$currentRow, $dayTable['formatted_date']);
                $sheetVentas->setCellValue('D'.$currentRow, 'Sin facturación registrada');
                $sheetVentas->setCellValue('E'.$currentRow, 0);
                $sheetVentas->setCellValue('F'.$currentRow, '-');
                $sheetVentas->setCellValue('G'.$currentRow, 0.0);
                $sheetVentas->setCellValue('H'.$currentRow, 0.0);
                $sheetVentas->setCellValue('I'.$currentRow, 0.0);
                $sheetVentas->setCellValue('J'.$currentRow, '');
                $sheetVentas->setCellValue('K'.$currentRow, '-');

                $sheetVentas->getStyle("B{$currentRow}:K{$currentRow}")->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'E0E0E0']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $sheetVentas->getStyle("G{$currentRow}:I{$currentRow}")->getNumberFormat()->setFormatCode('"L. " #,##0.00');
                $currentRow++;
            } else {
                foreach ($dayTable['items'] as $item) {
                    $sheetVentas->setCellValue('B'.$currentRow, $item['item']);
                    $sheetVentas->setCellValue('C'.$currentRow, $item['date']);
                    $sheetVentas->setCellValue('D'.$currentRow, $item['customer_name']);
                    $sheetVentas->setCellValue('E'.$currentRow, $item['quantity']);
                    $formaDePago = $item['is_cancelled']
                        ? 'Anulada'
                        : (! empty($item['payment_type_code']) ? "{$item['payment_type_label']} ({$item['payment_type_code']})" : '-');
                    $sheetVentas->setCellValue('F'.$currentRow, $formaDePago);
                    $sheetVentas->setCellValue('G'.$currentRow, $item['gross_amount']);
                    $sheetVentas->setCellValue('H'.$currentRow, $item['discount']);
                    // Native formula for Pago Recibido: =+G{row}-H{row}
                    $sheetVentas->setCellValue('I'.$currentRow, "=+G{$currentRow}-H{$currentRow}");
                    $sheetVentas->setCellValue('J'.$currentRow, $item['comment']);
                    $sheetVentas->setCellValue('K'.$currentRow, $item['invoice_number']);

                    // Alignment
                    $sheetVentas->getStyle('B'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheetVentas->getStyle('C'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheetVentas->getStyle('E'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheetVentas->getStyle('F'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheetVentas->getStyle('K'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                    // Formats
                    $sheetVentas->getStyle("G{$currentRow}:I{$currentRow}")->getNumberFormat()->setFormatCode('"L. " #,##0.00');
                    $sheetVentas->getStyle("B{$currentRow}:K{$currentRow}")->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'E0E0E0']]],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                    ]);

                    $sheetVentas->getRowDimension($currentRow)->setRowHeight(19);
                    $currentRow++;
                }
            }
            $tableEndRow = $currentRow - 1;

            // 4. Totals Row
            $sheetVentas->setCellValue('F'.$currentRow, 'TOTAL');
            $sheetVentas->setCellValue('G'.$currentRow, "=SUM(G{$tableStartRow}:G{$tableEndRow})");
            $sheetVentas->setCellValue('H'.$currentRow, "=SUM(H{$tableStartRow}:H{$tableEndRow})");
            $sheetVentas->setCellValue('I'.$currentRow, "=SUM(I{$tableStartRow}:I{$tableEndRow})");

            $sheetVentas->getStyle("F{$currentRow}:I{$currentRow}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 11, 'name' => 'Calibri'],
                'borders' => [
                    'top' => ['borderStyle' => Border::BORDER_THIN],
                    'bottom' => ['borderStyle' => Border::BORDER_MEDIUM],
                ],
            ]);
            $sheetVentas->getStyle('F'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheetVentas->getStyle("G{$currentRow}:I{$currentRow}")->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheetVentas->getRowDimension($currentRow)->setRowHeight(22);

            $tableTotalRow = $currentRow;
            $currentRow += 2; // Spacing before settlement block

            // 5. Daily Settlement Summary Block (Liquidación / Valores)
            $sheetVentas->setCellValue('D'.$currentRow, 'Liquidación');
            $sheetVentas->setCellValue('F'.$currentRow, 'Valores');
            $sheetVentas->getStyle("D{$currentRow}:F{$currentRow}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 10, 'name' => 'Calibri'],
                'borders' => ['top' => ['borderStyle' => Border::BORDER_THIN], 'bottom' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
            $sheetVentas->getRowDimension($currentRow)->setRowHeight(19);
            $currentRow++;

            $settlementStartRow = $currentRow;
            $settlementItems = [
                '1.-Total Recibido en Efectivo' => $dayTable['settlement']['cash'],
                '2.-Total Recibido en Cheques' => $dayTable['settlement']['check'],
                '3.-Total Recibido en T/C POS' => $dayTable['settlement']['card'],
                '4.-Total Recibido en Transferencia' => $dayTable['settlement']['transfer'],
                '5.-Facturas al Crédito' => $dayTable['settlement']['credit'],
            ];

            foreach ($settlementItems as $label => $val) {
                $sheetVentas->setCellValue('D'.$currentRow, $label);
                $sheetVentas->setCellValue('F'.$currentRow, $val);
                $sheetVentas->getStyle("D{$currentRow}:F{$currentRow}")->applyFromArray([
                    'borders' => ['top' => ['borderStyle' => Border::BORDER_THIN], 'bottom' => ['borderStyle' => Border::BORDER_THIN]],
                ]);
                $sheetVentas->getStyle('F'.$currentRow)->getNumberFormat()->setFormatCode('"L. " #,##0.00');
                $sheetVentas->getRowDimension($currentRow)->setRowHeight(19);
                $currentRow++;
            }
            $settlementEndRow = $currentRow - 1;

            // Total Ventas Diarias
            $sheetVentas->setCellValue('D'.$currentRow, 'Total Ventas Diarias');
            $sheetVentas->setCellValue('F'.$currentRow, "=SUM(F{$settlementStartRow}:F{$settlementEndRow})");
            // Cuadre Check Verification formula: =+I{tableTotalRow}-F{currentRow}
            $sheetVentas->setCellValue('G'.$currentRow, "=+I{$tableTotalRow}-F{$currentRow}");

            $sheetVentas->getStyle("D{$currentRow}:F{$currentRow}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 11, 'name' => 'Calibri'],
                'borders' => [
                    'top' => ['borderStyle' => Border::BORDER_THIN],
                    'bottom' => ['borderStyle' => Border::BORDER_DOUBLE],
                ],
            ]);
            $sheetVentas->getStyle('F'.$currentRow)->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheetVentas->getStyle('G'.$currentRow)->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheetVentas->getStyle('G'.$currentRow)->getFont()->setItalic(true)->setSize(9);
            $sheetVentas->getRowDimension($currentRow)->setRowHeight(22);

            $currentRow += 3; // Spacing before next day table
        }

        // Global Period Summary Block at the very bottom
        $sheetVentas->setCellValue('D'.$currentRow, 'Detalle');
        $sheetVentas->setCellValue('E'.$currentRow, 'Gravadas');
        $sheetVentas->setCellValue('F'.$currentRow, 'Exentas');
        $sheetVentas->setCellValue('G'.$currentRow, 'Descuentos');
        $sheetVentas->setCellValue('H'.$currentRow, 'IVA');
        $sheetVentas->setCellValue('I'.$currentRow, 'Total');

        $sheetVentas->getStyle("D{$currentRow}:I{$currentRow}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 10, 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders' => ['top' => ['borderStyle' => Border::BORDER_MEDIUM], 'bottom' => ['borderStyle' => Border::BORDER_MEDIUM]],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'F2F2F2']],
        ]);
        $currentRow++;

        $sheetVentas->setCellValue('D'.$currentRow, 'Ventas');
        $sheetVentas->setCellValue('E'.$currentRow, $reportData['periodTotals']['taxable_15']);
        $sheetVentas->setCellValue('F'.$currentRow, $reportData['periodTotals']['exempt']);
        $sheetVentas->setCellValue('G'.$currentRow, $reportData['periodTotals']['discount']);
        // IVA formula: =+E{row}*0.15
        $sheetVentas->setCellValue('H'.$currentRow, "=+E{$currentRow}*0.15");
        // Total formula: =+E{row}+F{row}+H{row}-G{row}
        $sheetVentas->setCellValue('I'.$currentRow, "=+E{$currentRow}+F{$currentRow}+H{$currentRow}-G{$currentRow}");

        $sheetVentas->getStyle("D{$currentRow}:I{$currentRow}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'name' => 'Calibri'],
            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_DOUBLE]],
        ]);
        $sheetVentas->getStyle("E{$currentRow}:I{$currentRow}")->getNumberFormat()->setFormatCode('"L. " #,##0.00');

        // ---------------------------------------------------------
        // SHEET 2: Resumen (Resumen de Ventas del Período por Día)
        // ---------------------------------------------------------
        $sheetResumen = $spreadsheet->createSheet();
        $sheetResumen->setTitle('Resumen');

        $resumenColWidths = [
            'A' => 14,
            'B' => 26,
            'C' => 26,
            'D' => 22,
            'E' => 18,
            'F' => 18,
            'G' => 18,
            'H' => 18,
            'I' => 18,
        ];
        foreach ($resumenColWidths as $col => $w) {
            $sheetResumen->getColumnDimension($col)->setWidth($w);
        }

        $sheetResumen->getStyle('A1:I500')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFFF');

        // Title Header
        $sheetResumen->setCellValue('A2', 'PATOLAB S. DE R.L.');
        $sheetResumen->getStyle('A2')->getFont()->setBold(true)->setSize(16)->setName('Calibri');

        $subtitleText = 'RESUMEN DE VENTAS DEL '.Carbon::parse($dateFrom)->format('d/m/Y').' AL '.Carbon::parse($dateTo)->format('d/m/Y');
        $sheetResumen->setCellValue('A3', $subtitleText);
        $sheetResumen->getStyle('A3')->getFont()->setBold(true)->setSize(12)->setName('Calibri');

        $headersResumen = [
            'A' => 'Fecha',
            'B' => 'No. de Fact (Inicial)',
            'C' => 'No. de Fact (Final)',
            'D' => 'Cliente',
            'E' => 'Gravadas',
            'F' => 'Exentas',
            'G' => 'Descuentos',
            'H' => 'IVA',
            'I' => 'Total',
        ];
        foreach ($headersResumen as $col => $text) {
            $sheetResumen->setCellValue($col.'4', $text);
        }

        $sheetResumen->getStyle('A4:I4')->applyFromArray([
            'font' => ['bold' => true, 'size' => 10, 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders' => ['top' => ['borderStyle' => Border::BORDER_MEDIUM], 'bottom' => ['borderStyle' => Border::BORDER_MEDIUM]],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'F2F2F2']],
        ]);
        $sheetResumen->getRowDimension(4)->setRowHeight(22);

        $resumenRowIndex = 5;
        $resumenStartRow = 5;

        foreach ($reportData['resumenRows'] as $rRow) {
            $sheetResumen->setCellValue('A'.$resumenRowIndex, $rRow['formatted_date']);
            $sheetResumen->setCellValue('B'.$resumenRowIndex, $rRow['start_invoice']);
            $sheetResumen->setCellValue('C'.$resumenRowIndex, $rRow['end_invoice']);
            $sheetResumen->setCellValue('D'.$resumenRowIndex, $rRow['customer']);
            $sheetResumen->setCellValue('E'.$resumenRowIndex, $rRow['taxable_15']);
            $sheetResumen->setCellValue('F'.$resumenRowIndex, $rRow['exempt']);
            $sheetResumen->setCellValue('G'.$resumenRowIndex, $rRow['discount']);
            $sheetResumen->setCellValue('H'.$resumenRowIndex, "=+E{$resumenRowIndex}*0.15");
            $sheetResumen->setCellValue('I'.$resumenRowIndex, "=+E{$resumenRowIndex}+F{$resumenRowIndex}+H{$resumenRowIndex}-G{$resumenRowIndex}");

            $sheetResumen->getStyle('A'.$resumenRowIndex)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheetResumen->getStyle('B'.$resumenRowIndex)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheetResumen->getStyle('C'.$resumenRowIndex)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $sheetResumen->getStyle("E{$resumenRowIndex}:I{$resumenRowIndex}")->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheetResumen->getStyle("A{$resumenRowIndex}:I{$resumenRowIndex}")->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'E0E0E0']]],
            ]);
            $sheetResumen->getRowDimension($resumenRowIndex)->setRowHeight(19);

            $resumenRowIndex++;
        }
        $resumenEndRow = $resumenRowIndex - 1;

        // Grand Total row on Resumen
        $sheetResumen->setCellValue('A'.$resumenRowIndex, 'Ventas del período');
        $sheetResumen->setCellValue('E'.$resumenRowIndex, "=SUM(E{$resumenStartRow}:E{$resumenEndRow})");
        $sheetResumen->setCellValue('F'.$resumenRowIndex, "=SUM(F{$resumenStartRow}:F{$resumenEndRow})");
        $sheetResumen->setCellValue('G'.$resumenRowIndex, "=SUM(G{$resumenStartRow}:G{$resumenEndRow})");
        $sheetResumen->setCellValue('H'.$resumenRowIndex, "=SUM(H{$resumenStartRow}:H{$resumenEndRow})");
        $sheetResumen->setCellValue('I'.$resumenRowIndex, "=SUM(I{$resumenStartRow}:I{$resumenEndRow})");

        $sheetResumen->getStyle("A{$resumenRowIndex}:I{$resumenRowIndex}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'name' => 'Calibri'],
            'borders' => [
                'top' => ['borderStyle' => Border::BORDER_THIN],
                'bottom' => ['borderStyle' => Border::BORDER_DOUBLE],
            ],
        ]);
        $sheetResumen->getStyle("E{$resumenRowIndex}:I{$resumenRowIndex}")->getNumberFormat()->setFormatCode('"L. " #,##0.00');
        $sheetResumen->getRowDimension($resumenRowIndex)->setRowHeight(24);

        // Set active sheet back to Ventas
        $spreadsheet->setActiveSheetIndex(0);

        $writer = new Xlsx($spreadsheet);
        $filename = 'cuadre_de_facturacion_'.date('Y_m_d_His').'.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Format full Spanish banner title for a day.
     */
    private function formatDayTitleSpanish(Carbon $date): string
    {
        $dayName = strtoupper($this->getSpanishDayName($date->dayOfWeek));
        $dayNum = str_pad((string) $date->day, 2, '0', STR_PAD_LEFT);
        $monthName = strtoupper($this->getSpanishMonthName($date->month));
        $year = $date->year;

        return "LIQUIDACIÓN DEL DIA {$dayName} {$dayNum} {$monthName} {$year}";
    }

    private function getSpanishDayName(int $dayOfWeek): string
    {
        return match ($dayOfWeek) {
            Carbon::MONDAY => 'LUNES',
            Carbon::TUESDAY => 'MARTES',
            Carbon::WEDNESDAY => 'MIERCOLES',
            Carbon::THURSDAY => 'JUEVES',
            Carbon::FRIDAY => 'VIERNES',
            Carbon::SATURDAY => 'SABADO',
            Carbon::SUNDAY => 'DOMINGO',
            default => '',
        };
    }

    private function getSpanishMonthName(int $month): string
    {
        return match ($month) {
            1 => 'ENERO',
            2 => 'FEBRERO',
            3 => 'MARZO',
            4 => 'ABRIL',
            5 => 'MAYO',
            6 => 'JUNIO',
            7 => 'JULIO',
            8 => 'AGOSTO',
            9 => 'SEPTIEMBRE',
            10 => 'OCTUBRE',
            11 => 'NOVIEMBRE',
            12 => 'DICIEMBRE',
            default => '',
        };
    }
}
