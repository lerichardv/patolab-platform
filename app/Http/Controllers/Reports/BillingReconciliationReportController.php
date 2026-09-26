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
        $cookieValue = $request->cookie("date_filter_report_billing_reconciliation_user_{$userId}");
        $resolvedDates = DateFilterService::resolveFilter(
            $cookieValue,
            $request->get('date_from'),
            $request->get('date_to'),
            'this_month'
        );

        // If no explicit dates passed and the cookie had legacy 14_days or this_week, default to full current month
        if (! $request->has('date_from') && in_array($resolvedDates['range'], ['14_days', 'this_week'])) {
            $dateFrom = Carbon::today()->startOfMonth()->toDateString();
            $dateTo = Carbon::today()->toDateString();
            $range = 'this_month';
        } else {
            $dateFrom = $resolvedDates['from'] ?: Carbon::today()->startOfMonth()->toDateString();
            $dateTo = $resolvedDates['to'] ?: Carbon::today()->toDateString();
            $range = $resolvedDates['range'];
        }

        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(DateFilterService::getCookieToQueue(
                "date_filter_report_billing_reconciliation_user_{$userId}",
                $dateFrom,
                $dateTo,
                $range
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
                        'taxable_15' => 0.0,
                        'exempt' => 0.0,
                        'isv_15' => 0.0,
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

                    // Taxes for Resumen & Liquidación sheet
                    $t15 = (float) ($inv->taxable_amount_15 > 0 ? $inv->taxable_amount_15 : ($inv->pay_isv ? $inv->subtotal : 0.0));
                    $ex = (float) ($inv->exempt_amount > 0 ? $inv->exempt_amount : ($inv->pay_isv ? 0.0 : $inv->subtotal));
                    $isv = (float) ($inv->isv_15 > 0 ? $inv->isv_15 : ($inv->pay_isv ? round($t15 * 0.15, 2) : 0.0));

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
                        'taxable_15' => $t15,
                        'exempt' => $ex,
                        'isv_15' => $isv,
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

            // Resumen row for this day (all month days without sundays and with first and last invoice correlatives)
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

        $generalInvoices = [];
        foreach ($dailyTables as $dayTable) {
            foreach ($dayTable['items'] as $item) {
                $generalInvoices[] = $item;
            }
        }

        $resumenTotals = [
            'taxable_15' => 0.0,
            'exempt' => 0.0,
            'discount' => 0.0,
            'isv_15' => 0.0,
            'total' => 0.0,
        ];
        foreach ($resumenRows as $rRow) {
            $resumenTotals['taxable_15'] += $rRow['taxable_15'];
            $resumenTotals['exempt'] += $rRow['exempt'];
            $resumenTotals['discount'] += $rRow['discount'];
            $resumenTotals['isv_15'] += $rRow['isv_15'];
            $resumenTotals['total'] += $rRow['total'];
        }

        return [
            'dailyTables' => $dailyTables,
            'generalInvoices' => $generalInvoices,
            'resumenRows' => $resumenRows,
            'resumenTotals' => $resumenTotals,
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
        $cookieValue = $request->cookie("date_filter_report_billing_reconciliation_user_{$userId}");
        $resolvedDates = DateFilterService::resolveFilter(
            $cookieValue,
            $request->get('date_from'),
            $request->get('date_to'),
            'this_month'
        );

        if (! $request->has('date_from') && in_array($resolvedDates['range'], ['14_days', 'this_week'])) {
            $dateFrom = Carbon::today()->startOfMonth()->toDateString();
            $dateTo = Carbon::today()->toDateString();
        } else {
            $dateFrom = $resolvedDates['from'] ?: Carbon::today()->startOfMonth()->toDateString();
            $dateTo = $resolvedDates['to'] ?: Carbon::today()->toDateString();
        }
        $customerId = $request->get('customer_id');
        $search = $request->get('search');

        $reportData = $this->calculateReportData($dateFrom, $dateTo, $customerId, $search);

        $spreadsheet = new Spreadsheet;

        $fromCarbon = Carbon::parse($dateFrom);
        $toCarbon = Carbon::parse($dateTo);
        $monthYear = $fromCarbon->format('my');
        $isSingleMonth = ($fromCarbon->format('Y-m') === $toCarbon->format('Y-m'));

        $sheetVentasTitle = $isSingleMonth ? "Ventas {$monthYear}" : 'Ventas';
        $sheetLiquidacionTitle = 'Liquidación';
        $sheetResumenTitle = 'Resumen';

        // ---------------------------------------------------------
        // SHEET 1: Ventas (Detalle Diario con Tablas y Arqueo)
        // ---------------------------------------------------------
        $sheetVentas = $spreadsheet->getActiveSheet();
        $sheetVentas->setTitle($sheetVentasTitle);

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
        // SHEET 2: Hoja14 (Liquidación General Continua de Facturas)
        // ---------------------------------------------------------
        $sheetHoja14 = $spreadsheet->createSheet();
        $sheetHoja14->setTitle($sheetLiquidacionTitle);

        $h14ColWidths = [
            'A' => 4,
            'B' => 7,   // ITEM
            'C' => 12,  // FECHA
            'D' => 24,  // No. de Factura
            'E' => 38,  // NOMBRE PACIENTE
            'F' => 15,  // Gravadas
            'G' => 15,  // Exentas
            'H' => 15,  // DESCUENTO
            'I' => 15,  // IVA
            'J' => 16,  // PAGO RECIBIDO
            'K' => 26,  // COMENTARIO
        ];
        foreach ($h14ColWidths as $col => $w) {
            $sheetHoja14->getColumnDimension($col)->setWidth($w);
        }

        $sheetHoja14->getStyle('A1:L2000')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFFF');

        // Banner in Row 2
        $monthNameSpanish = strtoupper($this->getSpanishMonthName($fromCarbon->month));
        $h14Banner = $isSingleMonth
            ? "LIQUIDACIÓN DEL MES DE {$monthNameSpanish} {$fromCarbon->year}"
            : "LIQUIDACIÓN DE VENTAS DEL {$fromCarbon->format('d/m/Y')} AL {$toCarbon->format('d/m/Y')}";

        $sheetHoja14->mergeCells('B2:K2');
        $sheetHoja14->setCellValue('B2', $h14Banner);
        $sheetHoja14->getStyle('B2')->applyFromArray([
            'font' => ['bold' => true, 'size' => 16, 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheetHoja14->getRowDimension(2)->setRowHeight(28);

        // Header in Row 3
        $h14Headers = [
            'B' => 'ITEM',
            'C' => 'FECHA',
            'D' => 'No. de Factura',
            'E' => 'NOMBRE PACIENTE',
            'F' => 'Gravadas',
            'G' => 'Exentas',
            'H' => 'DESCUENTO',
            'I' => 'IVA',
            'J' => 'PAGO RECIBIDO',
            'K' => 'COMENTARIO',
        ];
        foreach ($h14Headers as $col => $text) {
            $sheetHoja14->setCellValue($col.'3', $text);
        }

        $sheetHoja14->getStyle('B3:K3')->applyFromArray([
            'font' => ['bold' => true, 'size' => 9, 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => [
                'top' => ['borderStyle' => Border::BORDER_MEDIUM],
                'bottom' => ['borderStyle' => Border::BORDER_MEDIUM],
            ],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'F2F2F2']],
        ]);
        $sheetHoja14->getRowDimension(3)->setRowHeight(24);

        // Rows 4+: Continuous invoices
        $h14CurrentRow = 4;
        $h14StartRow = 4;

        foreach ($reportData['dailyTables'] as $dayTable) {
            $dayItemIdx = 1;

            foreach ($dayTable['items'] as $item) {
                if ($dayItemIdx === 1) {
                    $sheetHoja14->setCellValue('B'.$h14CurrentRow, 1);
                } else {
                    $prevRow = $h14CurrentRow - 1;
                    $sheetHoja14->setCellValue('B'.$h14CurrentRow, "=+B{$prevRow}+1");
                }

                $sheetHoja14->setCellValue('C'.$h14CurrentRow, $item['date']);
                $sheetHoja14->setCellValue('D'.$h14CurrentRow, $item['invoice_number']);
                $sheetHoja14->setCellValue('E'.$h14CurrentRow, $item['customer_name']);
                $sheetHoja14->setCellValue('F'.$h14CurrentRow, $item['taxable_15']);
                $sheetHoja14->setCellValue('G'.$h14CurrentRow, $item['exempt']);
                $sheetHoja14->setCellValue('H'.$h14CurrentRow, $item['discount']);
                $sheetHoja14->setCellValue('I'.$h14CurrentRow, $item['isv_15']);
                $sheetHoja14->setCellValue('J'.$h14CurrentRow, "=+F{$h14CurrentRow}+G{$h14CurrentRow}+I{$h14CurrentRow}-H{$h14CurrentRow}");
                $sheetHoja14->setCellValue('K'.$h14CurrentRow, $item['comment']);

                // Alignment
                $sheetHoja14->getStyle('B'.$h14CurrentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheetHoja14->getStyle('C'.$h14CurrentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheetHoja14->getStyle('D'.$h14CurrentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                // Number formatting
                $sheetHoja14->getStyle("F{$h14CurrentRow}:J{$h14CurrentRow}")->getNumberFormat()->setFormatCode('"L. " #,##0.00');

                // Styling
                $sheetHoja14->getStyle("B{$h14CurrentRow}:K{$h14CurrentRow}")->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'E8E8E8']]],
                    'font' => ['name' => 'Calibri', 'size' => 9],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);

                $sheetHoja14->getRowDimension($h14CurrentRow)->setRowHeight(19);

                $dayItemIdx++;
                $h14CurrentRow++;
            }
        }

        $h14EndRow = $h14CurrentRow - 1;

        if ($h14EndRow >= $h14StartRow) {
            // Totals Row
            $sheetHoja14->setCellValue('F'.$h14CurrentRow, "=SUM(F{$h14StartRow}:F{$h14EndRow})");
            $sheetHoja14->setCellValue('G'.$h14CurrentRow, "=SUM(G{$h14StartRow}:G{$h14EndRow})");
            $sheetHoja14->setCellValue('H'.$h14CurrentRow, "=SUM(H{$h14StartRow}:H{$h14EndRow})");
            $sheetHoja14->setCellValue('I'.$h14CurrentRow, "=SUM(I{$h14StartRow}:I{$h14EndRow})");
            $sheetHoja14->setCellValue('J'.$h14CurrentRow, "=+F{$h14CurrentRow}+G{$h14CurrentRow}+I{$h14CurrentRow}-H{$h14CurrentRow}");

            $sheetHoja14->getStyle("F{$h14CurrentRow}:J{$h14CurrentRow}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 11, 'name' => 'Calibri'],
                'borders' => [
                    'top' => ['borderStyle' => Border::BORDER_THIN],
                    'bottom' => ['borderStyle' => Border::BORDER_DOUBLE],
                ],
            ]);
            $sheetHoja14->getStyle("F{$h14CurrentRow}:J{$h14CurrentRow}")->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheetHoja14->getRowDimension($h14CurrentRow)->setRowHeight(22);

            $h14TotalRow = $h14CurrentRow;
            $h14CurrentRow += 2; // Spacing

            // Summary Header Row
            $sheetHoja14->setCellValue('E'.$h14CurrentRow, 'Detalle');
            $sheetHoja14->setCellValue('F'.$h14CurrentRow, 'Gravadas');
            $sheetHoja14->setCellValue('G'.$h14CurrentRow, 'exentas');
            $sheetHoja14->setCellValue('H'.$h14CurrentRow, 'Descuentos');
            $sheetHoja14->setCellValue('I'.$h14CurrentRow, 'IVA');
            $sheetHoja14->setCellValue('J'.$h14CurrentRow, 'Total');

            $sheetHoja14->getStyle("E{$h14CurrentRow}:J{$h14CurrentRow}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 10, 'name' => 'Calibri'],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'borders' => [
                    'top' => ['borderStyle' => Border::BORDER_MEDIUM],
                    'bottom' => ['borderStyle' => Border::BORDER_MEDIUM],
                ],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'F2F2F2']],
            ]);
            $sheetHoja14->getRowDimension($h14CurrentRow)->setRowHeight(20);
            $h14CurrentRow++;

            // Summary Data Row
            $sheetHoja14->setCellValue('E'.$h14CurrentRow, 'Ventas');
            $sheetHoja14->setCellValue('F'.$h14CurrentRow, "=+F{$h14TotalRow}");
            $sheetHoja14->setCellValue('G'.$h14CurrentRow, "=+G{$h14TotalRow}");
            $sheetHoja14->setCellValue('H'.$h14CurrentRow, "=+H{$h14TotalRow}");
            $sheetHoja14->setCellValue('I'.$h14CurrentRow, "=+I{$h14TotalRow}");
            $sheetHoja14->setCellValue('J'.$h14CurrentRow, "=+F{$h14CurrentRow}+G{$h14CurrentRow}-H{$h14CurrentRow}+I{$h14CurrentRow}");

            $sheetHoja14->getStyle("E{$h14CurrentRow}:J{$h14CurrentRow}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 11, 'name' => 'Calibri'],
                'borders' => ['bottom' => ['borderStyle' => Border::BORDER_DOUBLE]],
            ]);
            $sheetHoja14->getStyle("F{$h14CurrentRow}:J{$h14CurrentRow}")->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheetHoja14->getRowDimension($h14CurrentRow)->setRowHeight(22);
        }

        // ---------------------------------------------------------
        // SHEET 3: Resumen (Resumen de Ventas del Período por Día)
        // ---------------------------------------------------------
        $sheetResumen = $spreadsheet->createSheet();
        $sheetResumen->setTitle($sheetResumenTitle);

        $resumenColWidths = [
            'A' => 14,
            'B' => 24,
            'C' => 24,
            'D' => 22,
            'E' => 16,
            'F' => 16,
            'G' => 16,
            'H' => 16,
            'I' => 16,
        ];
        foreach ($resumenColWidths as $col => $w) {
            $sheetResumen->getColumnDimension($col)->setWidth($w);
        }

        $sheetResumen->getStyle('A1:I500')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFFF');

        // Merged Header Row 2: PATOLAB S. DE R.L.
        $sheetResumen->mergeCells('A2:I2');
        $sheetResumen->setCellValue('A2', 'PATOLAB S. DE R.L.');
        $sheetResumen->getStyle('A2')->applyFromArray([
            'font' => ['bold' => true, 'size' => 14, 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheetResumen->getRowDimension(2)->setRowHeight(24);

        $isFullMonth = $isSingleMonth && ($fromCarbon->day === 1 && ($toCarbon->isLastOfMonth() || $toCarbon->isToday()));

        // Merged Header Row 3: Subtitle
        $resumenSubtitle = $isFullMonth
            ? "RESUMEN DE VENTAS DEL MES DE {$monthNameSpanish} DEL {$fromCarbon->year}"
            : "RESUMEN DE VENTAS DEL {$fromCarbon->format('d/m/Y')} AL {$toCarbon->format('d/m/Y')}";

        $sheetResumen->mergeCells('A3:I3');
        $sheetResumen->setCellValue('A3', $resumenSubtitle);
        $sheetResumen->getStyle('A3')->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheetResumen->getRowDimension(3)->setRowHeight(22);

        // Row 4: Column Headers
        $headersResumen = [
            'A' => 'Fecha',
            'B' => 'No. de Fact',
            'C' => 'No. de Fact',
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
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
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
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'E8E8E8']]],
                'font' => ['name' => 'Calibri', 'size' => 9],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheetResumen->getRowDimension($resumenRowIndex)->setRowHeight(19);

            $resumenRowIndex++;
        }
        $resumenEndRow = $resumenRowIndex - 1;

        if ($resumenEndRow < $resumenStartRow) {
            $sheetResumen->setCellValue('A5', '-');
            $sheetResumen->setCellValue('B5', '-');
            $sheetResumen->setCellValue('C5', '-');
            $sheetResumen->setCellValue('D5', 'Sin facturación registrada');
            $sheetResumen->setCellValue('E5', 0.0);
            $sheetResumen->setCellValue('F5', 0.0);
            $sheetResumen->setCellValue('G5', 0.0);
            $sheetResumen->setCellValue('H5', 0.0);
            $sheetResumen->setCellValue('I5', 0.0);
            $sheetResumen->getStyle('E5:I5')->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheetResumen->getStyle('A5:I5')->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'E8E8E8']]],
                'font' => ['name' => 'Calibri', 'size' => 9],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheetResumen->getRowDimension(5)->setRowHeight(19);
            $resumenEndRow = 5;
            $resumenRowIndex = 6;
        }

        // Grand Total row on Resumen with merged A..D
        $totalMonthLabel = $isFullMonth
            ? 'Ventas del mes de '.ucfirst(strtolower($monthNameSpanish))." del {$fromCarbon->year}"
            : 'Ventas del período';

        $sheetResumen->mergeCells("A{$resumenRowIndex}:D{$resumenRowIndex}");
        $sheetResumen->setCellValue('A'.$resumenRowIndex, $totalMonthLabel);
        $sheetResumen->getStyle('A'.$resumenRowIndex)->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);

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
