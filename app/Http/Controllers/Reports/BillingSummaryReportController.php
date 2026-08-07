<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Services\DateFilterService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class BillingSummaryReportController extends Controller
{
    /**
     * Display the Billing Summary report.
     */
    public function index(Request $request)
    {
        Gate::authorize('reports.billing_summary.view');

        // Build base queries
        $activeQuery = $this->buildQuery($request, false);
        $cancelledQuery = $this->buildQuery($request, true);

        // Date filter cookie handling
        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_billing_summary_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(DateFilterService::getCookieToQueue(
                "date_filter_report_billing_summary_user_{$userId}",
                $dateFrom,
                $dateTo,
                $resolvedDates['range']
            ));
        }

        $sortOrder = $request->get('sort_order', 'desc');
        if (! in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        // Run queries with pagination
        $activeInvoicesPaginated = $activeQuery->paginate(15, ['*'], 'active_page')->withQueryString();
        $cancelledInvoicesPaginated = $cancelledQuery->paginate(10, ['*'], 'cancelled_page')->withQueryString();

        // Transform collection to flat-mapped specimen/item rows
        $activeRows = $this->transformInvoicesToRows($activeInvoicesPaginated->items(), $dateFrom, $dateTo, $sortOrder);
        $cancelledRows = $this->transformInvoicesToRows($cancelledInvoicesPaginated->items(), $dateFrom, $dateTo, $sortOrder);

        // Replace the raw paginated items with our processed rows
        $activeInvoicesData = $activeInvoicesPaginated->toArray();
        $activeInvoicesData['data'] = $activeRows;

        $cancelledInvoicesData = $cancelledInvoicesPaginated->toArray();
        $cancelledInvoicesData['data'] = $cancelledRows;

        // Calculate totals and payment details for the entire filtered set (unpaginated)
        $allActiveInvoices = $this->buildQuery($request, false)->get();
        $activeRowsAll = $this->transformInvoicesToRows($allActiveInvoices, $dateFrom, $dateTo, $sortOrder);

        $paymentDetails = [
            'cash' => 0.0,
            'card' => 0.0,
            'check' => 0.0,
            'transfer' => 0.0,
            'credit' => 0.0,
            'total' => 0.0,
        ];

        $totals = [
            'gross' => 0.0,
            'isv' => 0.0,
            'discount' => 0.0,
            'net' => 0.0,
        ];

        foreach ($activeRowsAll as $row) {
            $paymentType = $row['payment_type'];
            $normalizedType = 'cash';
            if (in_array($paymentType, ['card', 'credit card'])) {
                $normalizedType = 'card';
            } elseif (in_array($paymentType, ['transfer', 'bank transfer'])) {
                $normalizedType = 'transfer';
            } elseif ($paymentType === 'check') {
                $normalizedType = 'check';
            } elseif ($paymentType === 'credit') {
                $normalizedType = 'credit';
            }

            if (isset($paymentDetails[$normalizedType])) {
                $paymentDetails[$normalizedType] += $row['net_amount'];
            }
            $paymentDetails['total'] += $row['net_amount'];

            $totals['gross'] += $row['gross_amount'];
            $totals['isv'] += $row['isv_15'];
            $totals['discount'] += $row['discount'];
            $totals['net'] += $row['net_amount'];
        }

        // Calculate cancelled totals
        $allCancelledInvoices = $this->buildQuery($request, true)->get();
        $cancelledRowsAll = $this->transformInvoicesToRows($allCancelledInvoices, $dateFrom, $dateTo, $sortOrder);

        $cancelledTotals = [
            'gross' => 0.0,
            'isv' => 0.0,
            'discount' => 0.0,
            'net' => 0.0,
        ];

        foreach ($cancelledRowsAll as $row) {
            $cancelledTotals['gross'] += $row['gross_amount'];
            $cancelledTotals['isv'] += $row['isv_15'];
            $cancelledTotals['discount'] += $row['discount'];
            $cancelledTotals['net'] += $row['net_amount'];
        }

        // Resolve selected customer for label
        $selectedCustomer = null;
        $filteredCustomerId = $request->get('customer_id');
        if ($filteredCustomerId && $filteredCustomerId !== 'all') {
            $selectedCustomer = Customer::where('id', $filteredCustomerId)
                ->select('id', 'name', 'id_number')
                ->first();
        }

        $specimenTypes = SpecimenType::where('active', true)->orderBy('name', 'asc')->get();
        $examinations = SpecimenTypeExamination::where('active', true)->with('prices')->get();

        return Inertia::render('reports/billing-summary/index', [
            'activeInvoices' => $activeInvoicesData,
            'cancelledInvoices' => $cancelledInvoicesData,
            'paymentDetails' => $paymentDetails,
            'totals' => $totals,
            'cancelledTotals' => $cancelledTotals,
            'filters' => array_merge(
                $request->only([
                    'search', 'payment_type', 'customer_id', 'specimen_type_id', 'examination_id', 'sort_order',
                ]),
                [
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]
            ),
            'selectedCustomer' => $selectedCustomer,
            'specimenTypes' => $specimenTypes,
            'examinations' => $examinations,
        ]);
    }

    /**
     * Export the Billing Summary report to Excel (.xlsx).
     */
    public function export(Request $request)
    {
        Gate::authorize('reports.billing_summary.view');

        // Resolve date range text
        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_billing_summary_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        $sortOrder = $request->get('sort_order', 'desc');
        if (! in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        // Fetch active and cancelled items
        $allActiveInvoices = $this->buildQuery($request, false)->get();
        $activeRows = $this->transformInvoicesToRows($allActiveInvoices, $dateFrom, $dateTo, $sortOrder);

        $allCancelledInvoices = $this->buildQuery($request, true)->get();
        $cancelledRows = $this->transformInvoicesToRows($allCancelledInvoices, $dateFrom, $dateTo, $sortOrder);

        // Build Excel Sheet
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Reporte de Facturación');

        // Paint background white
        $sheet->getStyle('A1:Z1000')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFFF');

        $dateFromText = $this->formatDateSpanish($dateFrom);
        $dateToText = $this->formatDateSpanish($dateTo);
        $dateSubtitle = ($dateFromText && $dateToText) ? "Del {$dateFromText} al {$dateToText}" : 'Todo el Historial';

        // Column widths matching format
        $columnWidths = [
            'A' => 12,  // Fecha
            'B' => 16,  // ID/RTN
            'C' => 30,  // Cliente/Empresa
            'D' => 24,  // # Factura
            'E' => 14,  // ISV 15%
            'F' => 14,  // Descuento
            'G' => 16,  // Total
            'H' => 16,  // Total Pagado
            'I' => 30,  // Servicio
            'J' => 20,  // # de la Muestra
            'K' => 24,  // Usuario
            'L' => 16,  // Tipo de Pago
        ];
        foreach ($columnWidths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // Add Logo if exists
        $logoPath = public_path('images/PATOLABLOGO.png');
        if (file_exists($logoPath)) {
            $drawing = new Drawing;
            $drawing->setName('Logo');
            $drawing->setDescription('Logo');
            $drawing->setPath($logoPath);
            $drawing->setHeight(150);

            // Calculate center offset
            [$imgWidth, $imgHeight] = getimagesize($logoPath);
            $logoWidth = ($imgWidth / $imgHeight) * 150;
            $totalWidthPx = array_sum($columnWidths) * 7.5;
            $centerPx = $totalWidthPx / 2;
            $leftEdgePx = $centerPx - ($logoWidth / 2);

            $currentPx = 0;
            $targetCol = 'A';
            $offsetX = 0;
            foreach ($columnWidths as $col => $width) {
                $colWidthPx = $width * 7.5;
                if ($currentPx + $colWidthPx > $leftEdgePx) {
                    $targetCol = $col;
                    $offsetX = $leftEdgePx - $currentPx;
                    break;
                }
                $currentPx += $colWidthPx;
            }

            $drawing->setCoordinates($targetCol.'1');
            $drawing->setOffsetX((int) $offsetX);
            $drawing->setOffsetY(20);
            $drawing->setWorksheet($sheet);
        }

        // Set up spacing at top
        foreach (range(1, 4) as $r) {
            $sheet->getRowDimension($r)->setRowHeight(35);
        }

        // Title Block Styling
        $sheet->mergeCells('A5:L5');
        $sheet->setCellValue('A5', 'Reporte de Facturación');
        $sheet->getStyle('A5')->getFont()->setBold(true)->setSize(18)->setName('Calibri');
        $sheet->getStyle('A5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->mergeCells('A6:L6');
        $sheet->setCellValue('A6', 'Castro Urbina y Asociados S. De R. L.');
        $sheet->getStyle('A6')->getFont()->setBold(true)->setSize(14)->setName('Calibri');
        $sheet->getStyle('A6')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->mergeCells('A7:L7');
        $sheet->setCellValue('A7', 'RTN: 05019021248785');
        $sheet->getStyle('A7')->getFont()->setBold(true)->setSize(11)->setName('Calibri');
        $sheet->getStyle('A7')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->mergeCells('A8:L8');
        $sheet->setCellValue('A8', 'Barrio: los Andes: 7, 12-13 Calle Avenida, Sector: N.O., Casa NO.: 105, Departamento: Cortes, Municipio: San Pedro Sula');
        $sheet->getStyle('A8')->getFont()->setItalic(true)->setSize(10)->setName('Calibri');
        $sheet->getStyle('A8')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->mergeCells('A9:L9');
        $sheet->setCellValue('A9', $dateSubtitle);
        $sheet->getStyle('A9')->getFont()->setBold(true)->setSize(12)->setName('Calibri');
        $sheet->getStyle('A9')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Row Heights
        $sheet->getRowDimension(5)->setRowHeight(26);
        $sheet->getRowDimension(6)->setRowHeight(20);
        $sheet->getRowDimension(7)->setRowHeight(18);
        $sheet->getRowDimension(8)->setRowHeight(18);
        $sheet->getRowDimension(9)->setRowHeight(20);
        $sheet->getRowDimension(10)->setRowHeight(15); // Spacer
        $sheet->getRowDimension(11)->setRowHeight(28); // Header row

        // Headers
        $headers = [
            'Fecha',
            'ID/RTN',
            'Cliente/Empresa',
            '# Factura',
            'ISV 15%',
            'Descuento',
            'Total',
            'Total Pagado',
            'Servicio',
            '# de la Muestra',
            'Usuario',
            'Tipo de Pago',
        ];

        foreach ($headers as $colIndex => $text) {
            $sheet->setCellValue([$colIndex + 1, 11], $text);
        }

        $headerStyle = [
            'font' => [
                'bold' => true,
                'size' => 11,
                'name' => 'Calibri',
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => 'F2F2F2'],
            ],
            'borders' => [
                'bottom' => [
                    'borderStyle' => Border::BORDER_MEDIUM,
                    'color' => ['argb' => '000000'],
                ],
            ],
        ];
        $sheet->getStyle('A11:L11')->applyFromArray($headerStyle);

        // Active rows
        $rowNum = 12;
        foreach ($activeRows as $row) {
            $formattedDate = $row['date'] ? Carbon::parse($row['date'])->format('j/n/y') : 'N/A';
            $paymentLabel = $this->getPaymentLabel($row['payment_type']);

            $sheet->setCellValue('A'.$rowNum, $formattedDate);
            $sheet->setCellValue('B'.$rowNum, $row['customer_id_number']);
            $sheet->setCellValue('C'.$rowNum, $row['customer_name']);
            $sheet->setCellValue('D'.$rowNum, $row['invoice_number']);
            $sheet->setCellValue('E'.$rowNum, $row['isv_15']);
            $sheet->setCellValue('F'.$rowNum, $row['discount']);
            $sheet->setCellValue('G'.$rowNum, $row['gross_amount']);
            $sheet->setCellValue('H'.$rowNum, $row['net_amount']);
            $qty = $row['quantity'] ?? 1;
            $sheet->setCellValue('I'.$rowNum, "({$qty}) ".$row['service']);
            $sheet->setCellValue('J'.$rowNum, $row['specimen_code']);
            $sheet->setCellValue('K'.$rowNum, $row['username']);
            $sheet->setCellValue('L'.$rowNum, $paymentLabel);

            $sheet->getStyle('A'.$rowNum.':L'.$rowNum)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('E0E0E0');
            $sheet->getStyle('A'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('D'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('J'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('L'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $sheet->getRowDimension($rowNum)->setRowHeight(20);
            $rowNum++;
        }

        // Active Totals row
        $activeTotalRow = $rowNum;
        if ($rowNum > 12) {
            // Apply Currency Format to E, F, G, H
            $sheet->getStyle('E12:H'.($rowNum - 1))->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheet->getStyle('E12:H'.($rowNum - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

            $sheet->setCellValue('D'.$rowNum, 'Total');
            $sheet->setCellValue('E'.$rowNum, '=SUM(E12:E'.($rowNum - 1).')');
            $sheet->setCellValue('F'.$rowNum, '=SUM(F12:F'.($rowNum - 1).')');
            $sheet->setCellValue('G'.$rowNum, '=SUM(G12:G'.($rowNum - 1).')');
            $sheet->setCellValue('H'.$rowNum, '=SUM(H12:H'.($rowNum - 1).')');

            $totalRowStyle = [
                'font' => [
                    'bold' => true,
                    'size' => 11,
                    'name' => 'Calibri',
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_RIGHT,
                ],
                'borders' => [
                    'top' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['argb' => '000000'],
                    ],
                    'bottom' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['argb' => '000000'],
                    ],
                ],
            ];
            $sheet->getStyle('D'.$rowNum.':H'.$rowNum)->applyFromArray($totalRowStyle);
            $sheet->getStyle('E'.$rowNum.':H'.$rowNum)->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheet->getRowDimension($rowNum)->setRowHeight(22);
            $rowNum++;

            // Add Pendiente de Pago row
            $sheet->setCellValue('D'.$rowNum, 'Pendiente de Pago');
            $sheet->setCellValue('H'.$rowNum, '=G'.($rowNum - 1).'-H'.($rowNum - 1));

            $pendingRowStyle = [
                'font' => [
                    'bold' => true,
                    'size' => 11,
                    'name' => 'Calibri',
                    'color' => ['argb' => 'FF0000'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_RIGHT,
                ],
                'borders' => [
                    'bottom' => [
                        'borderStyle' => Border::BORDER_DOUBLE,
                        'color' => ['argb' => '000000'],
                    ],
                ],
            ];
            $sheet->getStyle('D'.$rowNum.':H'.$rowNum)->applyFromArray($pendingRowStyle);
            $sheet->getStyle('H'.$rowNum)->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheet->getRowDimension($rowNum)->setRowHeight(22);
            $rowNum++;
        } else {
            $sheet->setCellValue('A'.$rowNum, 'No hay facturas registradas.');
            $sheet->mergeCells("A{$rowNum}:L{$rowNum}");
            $sheet->getStyle('A'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getRowDimension($rowNum)->setRowHeight(20);
            $rowNum++;
        }

        // Space before Payment Details
        $rowNum += 2;

        // Payment Details Header
        $sheet->mergeCells('A'.$rowNum.':B'.$rowNum);
        $sheet->setCellValue('A'.$rowNum, 'Detalles del Pago');
        $sheet->getStyle('A'.$rowNum)->getFont()->setBold(true)->setSize(11)->setName('Calibri');
        $sheet->getRowDimension($rowNum)->setRowHeight(22);
        $rowNum++;

        // Calculate specific payment summaries in PHP for fallback & direct values
        $cashTotal = 0.0;
        $cardTotal = 0.0;
        $checkTotal = 0.0;
        $transferTotal = 0.0;
        $creditTotal = 0.0;
        foreach ($activeRows as $r) {
            $paymentType = $r['payment_type'];
            if ($paymentType === 'cash') {
                $cashTotal += $r['net_amount'];
            } elseif (in_array($paymentType, ['card', 'credit card'])) {
                $cardTotal += $r['net_amount'];
            } elseif ($paymentType === 'check') {
                $checkTotal += $r['net_amount'];
            } elseif (in_array($paymentType, ['transfer', 'bank transfer'])) {
                $transferTotal += $r['net_amount'];
            } elseif ($paymentType === 'credit') {
                $creditTotal += $r['net_amount'];
            }
        }
        $paymentDetailsSummaryTotal = $cashTotal + $cardTotal + $checkTotal + $transferTotal + $creditTotal;

        $paymentDetailsRows = [
            ['Efectivo', $cashTotal],
            ['Tarjeta', $cardTotal],
            ['Cheque', $checkTotal],
            ['Transferencia', $transferTotal],
            ['Al Crédito', $creditTotal],
        ];

        $paymentStartRow = $rowNum;
        foreach ($paymentDetailsRows as $pDetail) {
            $sheet->setCellValue('A'.$rowNum, $pDetail[0]);
            $sheet->setCellValue('B'.$rowNum, $pDetail[1]);

            $sheet->getStyle('A'.$rowNum.':B'.$rowNum)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('E0E0E0');
            $sheet->getStyle('B'.$rowNum)->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheet->getStyle('B'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            $sheet->getRowDimension($rowNum)->setRowHeight(20);
            $rowNum++;
        }

        // Payment Details Total
        $sheet->setCellValue('A'.$rowNum, 'Total');
        $sheet->setCellValue('B'.$rowNum, '=SUM(B'.$paymentStartRow.':B'.($rowNum - 1).')');
        $sheet->getStyle('A'.$rowNum.':B'.$rowNum)->getFont()->setBold(true)->setName('Calibri');
        $sheet->getStyle('A'.$rowNum.':B'.$rowNum)->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('000000');
        $sheet->getStyle('A'.$rowNum.':B'.$rowNum)->getBorders()->getBottom()->setBorderStyle(Border::BORDER_DOUBLE)->getColor()->setARGB('000000');
        $sheet->getStyle('B'.$rowNum)->getNumberFormat()->setFormatCode('"L. " #,##0.00');
        $sheet->getStyle('B'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getRowDimension($rowNum)->setRowHeight(22);
        $rowNum++;

        // Space before Cancelled Invoices
        $rowNum += 2;

        // Facturas Anuladas Section Header (Yellow background)
        $sheet->mergeCells('A'.$rowNum.':L'.$rowNum);
        $sheet->setCellValue('A'.$rowNum, 'Facturas Anuladas');
        $sheet->getStyle('A'.$rowNum)->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 12,
                'name' => 'Calibri',
                'color' => ['argb' => '000000'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FFFF00'], // Bright Yellow
            ],
        ]);
        $sheet->getRowDimension($rowNum)->setRowHeight(30);
        $rowNum++;

        // Cancelled Headers row
        foreach ($headers as $colIndex => $text) {
            $sheet->setCellValue([$colIndex + 1, $rowNum], $text);
        }
        $sheet->getStyle('A'.$rowNum.':L'.$rowNum)->applyFromArray($headerStyle);
        $sheet->getRowDimension($rowNum)->setRowHeight(28);
        $rowNum++;

        // Cancelled data rows
        $cancelledStartRow = $rowNum;
        foreach ($cancelledRows as $row) {
            $formattedDate = $row['date'] ? Carbon::parse($row['date'])->format('j/n/y') : 'N/A';
            $paymentLabel = $this->getPaymentLabel($row['payment_type']);

            $sheet->setCellValue('A'.$rowNum, $formattedDate);
            $sheet->setCellValue('B'.$rowNum, $row['customer_id_number']);
            $sheet->setCellValue('C'.$rowNum, $row['customer_name']);
            $sheet->setCellValue('D'.$rowNum, $row['invoice_number']);
            $sheet->setCellValue('E'.$rowNum, $row['isv_15']);
            $sheet->setCellValue('F'.$rowNum, $row['discount']);
            $sheet->setCellValue('G'.$rowNum, $row['gross_amount']);
            $sheet->setCellValue('H'.$rowNum, $row['net_amount']);
            $qty = $row['quantity'] ?? 1;
            $sheet->setCellValue('I'.$rowNum, "({$qty}) ".$row['service']);
            $sheet->setCellValue('J'.$rowNum, $row['specimen_code']);
            $sheet->setCellValue('K'.$rowNum, $row['username']);
            $sheet->setCellValue('L'.$rowNum, $paymentLabel);

            $sheet->getStyle('A'.$rowNum.':L'.$rowNum)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('E0E0E0');
            $sheet->getStyle('A'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('D'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('J'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('L'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $sheet->getRowDimension($rowNum)->setRowHeight(20);
            $rowNum++;
        }

        // Cancelled Totals row
        if ($rowNum > $cancelledStartRow) {
            // Apply Currency Format to E, F, G, H
            $sheet->getStyle('E'.$cancelledStartRow.':H'.($rowNum - 1))->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheet->getStyle('E'.$cancelledStartRow.':H'.($rowNum - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

            $sheet->setCellValue('D'.$rowNum, 'Total');
            $sheet->setCellValue('E'.$rowNum, '=SUM(E'.$cancelledStartRow.':E'.($rowNum - 1).')');
            $sheet->setCellValue('F'.$rowNum, '=SUM(F'.$cancelledStartRow.':F'.($rowNum - 1).')');
            $sheet->setCellValue('G'.$rowNum, '=SUM(G'.$cancelledStartRow.':G'.($rowNum - 1).')');
            $sheet->setCellValue('H'.$rowNum, '=SUM(H'.$cancelledStartRow.':H'.($rowNum - 1).')');

            $sheet->getStyle('D'.$rowNum.':H'.$rowNum)->applyFromArray($totalRowStyle);
            $sheet->getStyle('D'.$rowNum.':H'.$rowNum)->getBorders()->getBottom()->setBorderStyle(Border::BORDER_DOUBLE);
            $sheet->getStyle('E'.$rowNum.':H'.$rowNum)->getNumberFormat()->setFormatCode('"L. " #,##0.00');
            $sheet->getRowDimension($rowNum)->setRowHeight(22);
        } else {
            $sheet->setCellValue('A'.$rowNum, 'No hay facturas anuladas en este período.');
            $sheet->mergeCells("A{$rowNum}:L{$rowNum}");
            $sheet->getStyle('A'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getRowDimension($rowNum)->setRowHeight(20);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'reporte_facturacion_'.date('Y_m_d_His').'.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Query all invoices matching filters.
     */
    private function buildQuery(Request $request, bool $isCancelled)
    {
        $query = Invoice::with([
            'customer',
            'specimen.type',
            'specimen.examination',
            'groupSpecimens.specimen.type',
            'groupSpecimens.specimen.examination',
            'creditInvoiceSpecimens.specimen.type',
            'creditInvoiceSpecimens.specimen.examination',
            'createdBy',
        ]);

        if ($isCancelled) {
            $query->where('invoice_type', 'cancelled');
        } else {
            $query->where('invoice_type', '!=', 'cancelled');
        }

        // Search filter (Invoice code, Customer name/ID or Specimen Code)
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('full_invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('id_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('groupSpecimens.specimen', function ($gsq) use ($search) {
                        $gsq->where('sequence_code', 'like', "%{$search}%");
                    });
            });
        }

        // Date Range
        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_billing_summary_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        if (! empty($dateFrom) || ! empty($dateTo)) {
            $query->where(function ($q) use ($dateFrom, $dateTo) {
                // Scenario A: Non-grouped invoices within date range
                $q->where(function ($sub) use ($dateFrom, $dateTo) {
                    $sub->where('is_group', false);
                    if (! empty($dateFrom)) {
                        $sub->whereDate('invoices.created_at', '>=', $dateFrom);
                    }
                    if (! empty($dateTo)) {
                        $sub->whereDate('invoices.created_at', '<=', $dateTo);
                    }
                });

                // Scenario B: Grouped credit invoices with specimens added within date range
                $q->orWhere(function ($sub) use ($dateFrom, $dateTo) {
                    $sub->where('is_group', true)
                        ->where('payment_type', 'credit')
                        ->whereHas('creditInvoiceSpecimens', function ($subQ) use ($dateFrom, $dateTo) {
                            if (! empty($dateFrom)) {
                                $subQ->whereDate('created_at', '>=', $dateFrom);
                            }
                            if (! empty($dateTo)) {
                                $subQ->whereDate('created_at', '<=', $dateTo);
                            }
                        });
                });

                // Scenario C: Grouped non-credit invoices with specimens added within date range
                $q->orWhere(function ($sub) use ($dateFrom, $dateTo) {
                    $sub->where('is_group', true)
                        ->where('payment_type', '!=', 'credit')
                        ->whereHas('groupSpecimens', function ($subQ) use ($dateFrom, $dateTo) {
                            if (! empty($dateFrom)) {
                                $subQ->whereDate('created_at', '>=', $dateFrom);
                            }
                            if (! empty($dateTo)) {
                                $subQ->whereDate('created_at', '<=', $dateTo);
                            }
                        });
                });

                // Scenario D: Credit payment and social security invoices within date range
                $q->orWhere(function ($sub) use ($dateFrom, $dateTo) {
                    $sub->whereIn('invoice_type', ['credit payment', 'social security']);
                    if (! empty($dateFrom)) {
                        $sub->whereDate('invoices.created_at', '>=', $dateFrom);
                    }
                    if (! empty($dateTo)) {
                        $sub->whereDate('invoices.created_at', '<=', $dateTo);
                    }
                });
            });
        }

        // Payment Method
        if ($request->filled('payment_type') && $request->get('payment_type') !== 'all') {
            $query->where('payment_type', $request->get('payment_type'));
        }

        // Customer
        if ($request->filled('customer_id') && $request->get('customer_id') !== 'all') {
            $query->where('customer_id', $request->get('customer_id'));
        }

        // Specimen Type
        if ($request->filled('specimen_type_id') && $request->get('specimen_type_id') !== 'all') {
            $typeId = $request->get('specimen_type_id');
            $query->where(function ($q) use ($typeId) {
                $q->whereHas('specimen', function ($sq) use ($typeId) {
                    $sq->where('specimen_type', $typeId);
                })->orWhereHas('groupSpecimens.specimen', function ($gsq) use ($typeId) {
                    $gsq->where('specimen_type', $typeId);
                });
            });
        }

        // Examination
        if ($request->filled('examination_id') && $request->get('examination_id') !== 'all') {
            $examId = $request->get('examination_id');
            $query->where(function ($q) use ($examId) {
                $q->whereHas('specimen', function ($sq) use ($examId) {
                    $sq->where('specimen_type_examination', $examId);
                })->orWhereHas('groupSpecimens.specimen', function ($gsq) use ($examId) {
                    $gsq->where('specimen_type_examination', $examId);
                });
            });
        }

        // Order by Date Created
        $sortOrder = $request->get('sort_order', 'desc');
        if (! in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }
        $query->orderBy('invoices.created_at', $sortOrder);

        return $query;
    }

    /**
     * Map raw invoices list into detailed specimen/item rows.
     */
    private function transformInvoicesToRows($invoices, $dateFrom = null, $dateTo = null, $sortOrder = 'desc')
    {
        $rows = [];
        foreach ($invoices as $invoice) {
            if ($invoice->is_group && ! in_array($invoice->invoice_type, ['credit payment', 'social security'])) {
                if ($invoice->payment_type === 'credit') {
                    $cisItems = $invoice->creditInvoiceSpecimens;
                    if (! empty($dateFrom)) {
                        $cisItems = $cisItems->filter(fn ($cis) => $cis->created_at && $cis->created_at->toDateString() >= $dateFrom);
                    }
                    if (! empty($dateTo)) {
                        $cisItems = $cisItems->filter(fn ($cis) => $cis->created_at && $cis->created_at->toDateString() <= $dateTo);
                    }

                    if ($cisItems->count() > 0) {
                        foreach ($cisItems as $cis) {
                            $quantity = $cis->quantity ?? 1;
                            $rows[] = [
                                'id' => 'cis-'.$cis->id,
                                'invoice_id' => $invoice->id,
                                'invoice' => $invoice,
                                'date' => $cis->created_at ? $cis->created_at->toIso8601String() : null,
                                'customer_id_number' => $invoice->customer?->id_number ?? 'N/A',
                                'customer_name' => $invoice->customer?->name ?? 'N/A',
                                'invoice_number' => $invoice->full_invoice_number,
                                'gross_amount' => (float) $cis->total,
                                'isv_15' => (float) $cis->isv_15,
                                'discount' => (float) $cis->discount,
                                'net_amount' => $cis->is_paid ? (float) $cis->total : 0.0,
                                'service' => ($cis->specimen?->type?->name ?? 'N/A').' - '.($cis->specimen?->examination?->name ?? 'N/A'),
                                'specimen_code' => $cis->specimen?->sequence_code ?? 'N/A',
                                'username' => $invoice->createdBy?->name ?? 'N/A',
                                'payment_type' => $invoice->payment_type,
                                'is_cancelled' => $invoice->invoice_type === 'cancelled',
                                'quantity' => $quantity,
                            ];
                        }
                    }
                } else {
                    $igsItems = $invoice->groupSpecimens;
                    if (! empty($dateFrom)) {
                        $igsItems = $igsItems->filter(fn ($igs) => $igs->created_at && $igs->created_at->toDateString() >= $dateFrom);
                    }
                    if (! empty($dateTo)) {
                        $igsItems = $igsItems->filter(fn ($igs) => $igs->created_at && $igs->created_at->toDateString() <= $dateTo);
                    }

                    if ($igsItems->count() > 0) {
                        foreach ($igsItems as $igs) {
                            $quantity = $igs->quantity ?? 1;
                            $rows[] = [
                                'id' => 'igs-'.$igs->id,
                                'invoice_id' => $invoice->id,
                                'invoice' => $invoice,
                                'date' => $igs->created_at ? $igs->created_at->toIso8601String() : null,
                                'customer_id_number' => $invoice->customer?->id_number ?? 'N/A',
                                'customer_name' => $invoice->customer?->name ?? 'N/A',
                                'invoice_number' => $invoice->full_invoice_number,
                                'gross_amount' => (float) $igs->total,
                                'isv_15' => (float) $igs->isv_15,
                                'discount' => (float) $igs->discount,
                                'net_amount' => (float) $igs->total,
                                'service' => ($igs->specimen?->type?->name ?? 'N/A').' - '.($igs->specimen?->examination?->name ?? 'N/A'),
                                'specimen_code' => $igs->specimen?->sequence_code ?? 'N/A',
                                'username' => $invoice->createdBy?->name ?? 'N/A',
                                'payment_type' => $invoice->payment_type,
                                'is_cancelled' => $invoice->invoice_type === 'cancelled',
                                'quantity' => $quantity,
                            ];
                        }
                    }
                }
            } else {
                $service = 'N/A';
                $specimenCode = 'N/A';
                if ($invoice->specimen) {
                    $service = ($invoice->specimen->type?->name ?? 'N/A').' - '.($invoice->specimen->examination?->name ?? 'N/A');
                    $specimenCode = $invoice->specimen->sequence_code ?? 'N/A';
                } elseif ($invoice->invoice_type === 'credit payment') {
                    $service = 'Abono de Crédito';
                } elseif ($invoice->invoice_type === 'social security') {
                    $service = 'Pago IHSS (Seguridad Social)';
                } else {
                    $service = $invoice->description ?? 'Alquiler';
                }

                $quantity = $invoice->quantity ?? 1;
                $rows[] = [
                    'id' => 'inv-'.$invoice->id,
                    'invoice_id' => $invoice->id,
                    'invoice' => $invoice,
                    'date' => $invoice->created_at ? $invoice->created_at->toIso8601String() : null,
                    'customer_id_number' => $invoice->customer?->id_number ?? 'N/A',
                    'customer_name' => $invoice->customer?->name ?? 'N/A',
                    'invoice_number' => $invoice->full_invoice_number,
                    'gross_amount' => (float) $invoice->total,
                    'isv_15' => (float) $invoice->isv_15,
                    'discount' => (float) $invoice->discount,
                    'net_amount' => (float) $invoice->total_paid,
                    'service' => $service,
                    'specimen_code' => $specimenCode,
                    'username' => $invoice->createdBy?->name ?? 'N/A',
                    'payment_type' => $invoice->payment_type,
                    'is_cancelled' => $invoice->invoice_type === 'cancelled',
                    'quantity' => $quantity,
                ];
            }
        }

        usort($rows, function ($a, $b) use ($sortOrder) {
            $dateA = $a['date'] ? strtotime($a['date']) : 0;
            $dateB = $b['date'] ? strtotime($b['date']) : 0;
            if ($dateA == $dateB) {
                return 0;
            }
            if ($sortOrder === 'asc') {
                return $dateA < $dateB ? -1 : 1;
            } else {
                return $dateA > $dateB ? -1 : 1;
            }
        });

        return $rows;
    }

    /**
     * Map database payment type key to Spanish label.
     */
    private function getPaymentLabel(string $type): string
    {
        $labels = [
            'cash' => 'Efectivo',
            'card' => 'Tarjeta',
            'credit card' => 'Tarjeta',
            'transfer' => 'Transferencia',
            'bank transfer' => 'Transferencia',
            'check' => 'Cheque',
            'credit' => 'Al Crédito',
        ];

        return $labels[$type] ?? $type;
    }

    /**
     * Format a date string into Spanish day and month name text.
     */
    private function formatDateSpanish($dateString)
    {
        if (empty($dateString)) {
            return '';
        }
        try {
            $date = Carbon::parse($dateString);
            $months = [
                1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
                5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
                9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre',
            ];

            return $date->day.' de '.$months[$date->month];
        } catch (\Exception $e) {
            return $dateString;
        }
    }
}
