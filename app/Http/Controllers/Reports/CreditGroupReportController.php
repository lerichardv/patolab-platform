<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Specimen;
use App\Models\SpecimenGroup;
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

class CreditGroupReportController extends Controller
{
    /**
     * Display the Agrupación de Créditos report (one row per specimen).
     */
    public function index(Request $request)
    {
        Gate::authorize('reports.credit_group.view');

        $query = $this->buildQuery($request);

        // Sorting
        $sortField = $request->get('sort_field', 'date');
        $sortDirection = $request->get('sort_direction', 'desc');
        if (! in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        $query->select('specimen.*');

        switch ($sortField) {
            case 'customer':
                $query->join('customers', 'specimen.customer', '=', 'customers.id')
                    ->orderBy('customers.name', $sortDirection);
                break;
            case 'specimen_code':
                $query->orderBy('specimen.sequence_code', $sortDirection);
                break;
            case 'payment_method':
                $query->leftJoin('invoices as inv_pm', 'specimen.id', '=', 'inv_pm.specimen_id')
                    ->leftJoin('invoice_group_specimens as igs_pm', 'specimen.id', '=', 'igs_pm.specimen_id')
                    ->leftJoin('invoices as inv_grp_pm', 'igs_pm.invoice_id', '=', 'inv_grp_pm.id')
                    ->orderByRaw('COALESCE(inv_pm.payment_type, inv_grp_pm.payment_type) '.$sortDirection);
                break;
            case 'credit':
                $query->leftJoin('invoices as inv_cr', 'specimen.id', '=', 'inv_cr.specimen_id')
                    ->leftJoin('invoice_group_specimens as igs_cr', 'specimen.id', '=', 'igs_cr.specimen_id')
                    ->leftJoin('invoices as inv_grp_cr', 'igs_cr.invoice_id', '=', 'inv_grp_cr.id')
                    ->orderByRaw('CASE WHEN COALESCE(inv_cr.credit_payment_id, inv_grp_cr.credit_payment_id) IS NULL THEN 0 ELSE 1 END '.$sortDirection);
                break;
            case 'total':
                $query->leftJoin('invoices as inv_tot', 'specimen.id', '=', 'inv_tot.specimen_id')
                    ->leftJoin('invoice_group_specimens as igs_tot', 'specimen.id', '=', 'igs_tot.specimen_id')
                    ->orderByRaw('COALESCE(igs_tot.total, inv_tot.total) '.$sortDirection);
                break;
            case 'total_paid':
                $query->leftJoin('invoices as inv_pd', 'specimen.id', '=', 'inv_pd.specimen_id')
                    ->leftJoin('invoice_group_specimens as igs_pd', 'specimen.id', '=', 'igs_pd.specimen_id')
                    ->leftJoin('invoices as inv_grp_pd', 'igs_pd.invoice_id', '=', 'inv_grp_pd.id')
                    ->orderByRaw('COALESCE(inv_pd.total_paid, inv_grp_pd.total_paid) '.$sortDirection);
                break;
            case 'date':
            default:
                $query->orderBy('specimen.created_at', $sortDirection);
                break;
        }

        $specimens = $query->paginate(15)->withQueryString();

        // Resolve the currently-filtered customer for the async combobox initial label
        $selectedCustomer = null;
        $filteredCustomerId = $request->get('customer_id');
        if ($filteredCustomerId && $filteredCustomerId !== 'all') {
            $selectedCustomer = Customer::where('id', $filteredCustomerId)
                ->select('id', 'name', 'id_number')
                ->first();
        }

        $specimenTypes = SpecimenType::where('active', true)->orderBy('name', 'asc')->get();
        $examinations = SpecimenTypeExamination::where('active', true)->with('prices')->get();
        $groups = SpecimenGroup::orderBy('name', 'asc')->get();

        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_credit_group_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );

        return Inertia::render('reports/credit-group/index', [
            'specimens' => $specimens,
            'filters' => array_merge(
                $request->only([
                    'search', 'payment_type', 'customer_id', 'specimen_type_id',
                    'examination_id', 'has_credit', 'sort_field', 'sort_direction', 'group_id',
                ]),
                [
                    'date_from' => $resolvedDates['from'],
                    'date_to' => $resolvedDates['to'],
                ]
            ),
            'selectedCustomer' => $selectedCustomer,
            'specimenTypes' => $specimenTypes,
            'examinations' => $examinations,
            'groups' => $groups,
        ]);
    }

    /**
     * Export the Agrupación de Créditos report to Excel (.xlsx) or CSV (one row per specimen).
     */
    public function export(Request $request)
    {
        Gate::authorize('reports.credit_group.view');

        $query = $this->buildQuery($request);

        // Sorting
        $sortField = $request->get('sort_field', 'date');
        $sortDirection = $request->get('sort_direction', 'desc');
        if (! in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        $query->select('specimen.*');

        switch ($sortField) {
            case 'customer':
                $query->join('customers', 'specimen.customer', '=', 'customers.id')
                    ->orderBy('customers.name', $sortDirection);
                break;
            case 'specimen_code':
                $query->orderBy('specimen.sequence_code', $sortDirection);
                break;
            case 'payment_method':
                $query->leftJoin('invoices as inv_pm', 'specimen.id', '=', 'inv_pm.specimen_id')
                    ->leftJoin('invoice_group_specimens as igs_pm', 'specimen.id', '=', 'igs_pm.specimen_id')
                    ->leftJoin('invoices as inv_grp_pm', 'igs_pm.invoice_id', '=', 'inv_grp_pm.id')
                    ->orderByRaw('COALESCE(inv_pm.payment_type, inv_grp_pm.payment_type) '.$sortDirection);
                break;
            case 'credit':
                $query->leftJoin('invoices as inv_cr', 'specimen.id', '=', 'inv_cr.specimen_id')
                    ->leftJoin('invoice_group_specimens as igs_cr', 'specimen.id', '=', 'igs_cr.specimen_id')
                    ->leftJoin('invoices as inv_grp_cr', 'igs_cr.invoice_id', '=', 'inv_grp_cr.id')
                    ->orderByRaw('CASE WHEN COALESCE(inv_cr.credit_payment_id, inv_grp_cr.credit_payment_id) IS NULL THEN 0 ELSE 1 END '.$sortDirection);
                break;
            case 'total':
                $query->leftJoin('invoices as inv_tot', 'specimen.id', '=', 'inv_tot.specimen_id')
                    ->leftJoin('invoice_group_specimens as igs_tot', 'specimen.id', '=', 'igs_tot.specimen_id')
                    ->orderByRaw('COALESCE(igs_tot.total, inv_tot.total) '.$sortDirection);
                break;
            case 'total_paid':
                $query->leftJoin('invoices as inv_pd', 'specimen.id', '=', 'inv_pd.specimen_id')
                    ->leftJoin('invoice_group_specimens as igs_pd', 'specimen.id', '=', 'igs_pd.specimen_id')
                    ->leftJoin('invoices as inv_grp_pd', 'igs_pd.invoice_id', '=', 'inv_grp_pd.id')
                    ->orderByRaw('COALESCE(inv_pd.total_paid, inv_grp_pd.total_paid) '.$sortDirection);
                break;
            case 'date':
            default:
                $query->orderBy('specimen.created_at', $sortDirection);
                break;
        }

        $specimens = $query->get();
        $format = $request->get('format', 'xlsx');
        $headers = [
            'Fecha',
            'Código Muestra',
            'No. Factura',
            'Cliente',
            'Grupo / Agrupación',
            'Tipo / Examen',
            'Método Pago',
            'Crédito',
            'Monto Total',
            'Total Pagado',
            'Saldo Pendiente',
        ];

        if ($format === 'csv') {
            $filename = 'reporte_agrupacion_creditos_'.date('Y_m_d_His').'.csv';

            return response()->streamDownload(function () use ($headers, $specimens) {
                $output = fopen('php://output', 'w');
                // UTF-8 BOM for Excel compatibility
                fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
                fputcsv($output, $headers);

                foreach ($specimens as $specimen) {
                    $row = $this->buildSpecimenExportRow($specimen);
                    fputcsv($output, $row);
                }

                fclose($output);
            }, $filename, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        }
        // Default XLSX export
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Agrupación de Créditos');

        // Paint entire worksheet area solid white before adding elements
        $sheet->getStyle('A1:Z500')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFFF');

        // Resolve date range text for subtitle
        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_credit_group_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        $dateFromText = $this->formatDateSpanish($dateFrom);
        $dateToText = $this->formatDateSpanish($dateTo);
        $dateSubtitle = ($dateFromText && $dateToText) ? "Del {$dateFromText} al {$dateToText}" : 'Todo el Historial';

        // Define column widths
        $columnWidths = [
            'A' => 22,
            'B' => 16,
            'C' => 24,
            'D' => 38,
            'E' => 24,
            'F' => 38,
            'G' => 18,
            'H' => 12,
            'I' => 16,
            'J' => 16,
            'K' => 16,
        ];
        foreach ($columnWidths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // Add logo if exists
        $logoPath = public_path('images/PATOLABLOGO.png');
        if (file_exists($logoPath)) {
            $drawing = new Drawing;
            $drawing->setName('Logo');
            $drawing->setDescription('Logo');
            $drawing->setPath($logoPath);
            $drawing->setHeight(150); // Center and bigger as requested

            // Dynamically calculate centering
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
            $drawing->setOffsetY(30); // Small space at the top
            $drawing->setWorksheet($sheet);
        }

        // Title styling (Row 5)
        $sheet->mergeCells('A5:K5');
        $sheet->setCellValue('A5', 'Reporte de Agrupación de Créditos');
        $sheet->getStyle('A5')->getFont()->setBold(true)->setSize(18)->setName('Calibri');
        $sheet->getStyle('A5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Subtitle/Dates styling (Row 6)
        $sheet->mergeCells('A6:K6');
        $sheet->setCellValue('A6', $dateSubtitle);
        $sheet->getStyle('A6')->getFont()->setBold(true)->setSize(16)->setName('Calibri');
        $sheet->getStyle('A6')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Row height adjustment for spacing
        foreach (range(1, 4) as $r) {
            $sheet->getRowDimension($r)->setRowHeight(35); // Height for 120px logo with top margin
        }
        $sheet->getRowDimension(5)->setRowHeight(30); // Title
        $sheet->getRowDimension(6)->setRowHeight(25); // Subtitle
        $sheet->getRowDimension(7)->setRowHeight(15); // Spacing
        $sheet->getRowDimension(8)->setRowHeight(28); // Header row

        // Set Headers at row 8
        foreach ($headers as $colIndex => $headerText) {
            $sheet->setCellValue([$colIndex + 1, 8], $headerText);
        }

        // Header style
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
                'startColor' => [
                    'argb' => 'F2F2F2',
                ],
            ],
            'borders' => [
                'bottom' => [
                    'borderStyle' => Border::BORDER_MEDIUM,
                    'color' => ['argb' => '000000'],
                ],
            ],
        ];
        $sheet->getStyle('A8:K8')->applyFromArray($headerStyle);

        // Populate data starting at row 9
        $rowNum = 9;
        foreach ($specimens as $specimen) {
            $rowData = $this->buildSpecimenExportRow($specimen);
            foreach ($rowData as $colIndex => $val) {
                $sheet->setCellValue([$colIndex + 1, $rowNum], $val);
            }
            // Thin borders for data cells
            $sheet->getStyle('A'.$rowNum.':K'.$rowNum)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('E0E0E0');
            $sheet->getRowDimension($rowNum)->setRowHeight(20);
            $rowNum++;
        }

        // Format currency columns: I, J, K (Monto Total, Total Pagado, Saldo Pendiente)
        if ($rowNum > 9) {
            $sheet->getStyle('I9:K'.($rowNum - 1))
                ->getNumberFormat()
                ->setFormatCode('"L. " #,##0.00');
        }

        // Align right for currency columns
        $sheet->getStyle('I8:K'.($rowNum - 1))
            ->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        // Add summary totals row
        $sheet->setCellValue('H'.$rowNum, 'Total');
        $sheet->getStyle('H'.$rowNum)->getFont()->setBold(true);
        $sheet->getStyle('H'.$rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        $sheet->setCellValue('I'.$rowNum, '=SUM(I9:I'.($rowNum - 1).')');
        $sheet->setCellValue('J'.$rowNum, '=SUM(J9:J'.($rowNum - 1).')');
        $sheet->setCellValue('K'.$rowNum, '=SUM(K9:K'.($rowNum - 1).')');

        // Summary row styling
        $summaryStyle = [
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
                    'borderStyle' => Border::BORDER_DOUBLE,
                    'color' => ['argb' => '000000'],
                ],
            ],
        ];
        $sheet->getStyle('H'.$rowNum.':K'.$rowNum)->applyFromArray($summaryStyle);
        $sheet->getStyle('I'.$rowNum.':K'.$rowNum)
            ->getNumberFormat()
            ->setFormatCode('"L. " #,##0.00');
        $sheet->getRowDimension($rowNum)->setRowHeight(22);

        $writer = new Xlsx($spreadsheet);
        $filename = 'reporte_agrupacion_creditos_'.date('Y_m_d_His').'.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Build the query returning specimen records with invoice & group breakdown relations.
     */
    private function buildQuery(Request $request)
    {
        $query = Specimen::with([
            'customerRelation',
            'type',
            'examination.prices',
            'group.customer',
            'group.invoice.creditRelation.creditInvoiceSpecimens',
            'group.invoice.transferBank',
            'group.invoice.caiRange',
            'group.specimens.type',
            'group.specimens.customerRelation',
            'group.specimens.examination.prices',
            'group.specimens.category',
            'group.specimens.referrerRelation',
            'group.specimens.priority',
            'group.specimens.cancelledBy',
            'group.specimens.invoiceGroupSpecimen',
            'group.specimens.products',
            'invoiceRelation.creditRelation.creditInvoiceSpecimens',
            'invoiceGroupSpecimen.invoice.creditRelation.creditInvoiceSpecimens',
        ]);

        // Search query across invoice number, customer name/ID, or specimen sequence code
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('sequence_code', 'like', "%{$search}%")
                    ->orWhereHas('customerRelation', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('id_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('invoiceRelation', function ($iq) use ($search) {
                        $iq->where('full_invoice_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('invoiceGroupSpecimen.invoice', function ($giq) use ($search) {
                        $giq->where('full_invoice_number', 'like', "%{$search}%");
                    });
            });
        }

        // Date range filter
        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_credit_group_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(DateFilterService::getCookieToQueue(
                "date_filter_report_credit_group_user_{$userId}",
                $dateFrom,
                $dateTo,
                $resolvedDates['range']
            ));
        }

        if (! empty($dateFrom)) {
            $query->whereDate('specimen.created_at', '>=', $dateFrom);
        }
        if (! empty($dateTo)) {
            $dateToEnd = Carbon::parse($dateTo)->addDays(1)->toDateString();
            $query->whereDate('specimen.created_at', '<=', $dateToEnd);
        }

        // Payment method filter
        if ($request->filled('payment_type') && $request->get('payment_type') !== 'all') {
            $paymentType = $request->get('payment_type');
            $query->where(function ($q) use ($paymentType) {
                $q->whereHas('invoiceRelation', function ($iq) use ($paymentType) {
                    $iq->where('payment_type', $paymentType);
                })->orWhereHas('invoiceGroupSpecimen.invoice', function ($giq) use ($paymentType) {
                    $giq->where('payment_type', $paymentType);
                });
            });
        }

        // Customer filter
        if ($request->filled('customer_id') && $request->get('customer_id') !== 'all') {
            $query->where('customer', $request->get('customer_id'));
        }

        // Credit status filter
        if ($request->filled('has_credit') && $request->get('has_credit') !== 'all') {
            if ($request->get('has_credit') === 'yes') {
                $query->where(function ($q) {
                    $q->whereHas('invoiceRelation', function ($iq) {
                        $iq->whereNotNull('credit_payment_id');
                    })->orWhereHas('invoiceGroupSpecimen.invoice', function ($giq) {
                        $giq->whereNotNull('credit_payment_id');
                    });
                });
            } elseif ($request->get('has_credit') === 'no') {
                $query->where(function ($q) {
                    $q->whereHas('invoiceRelation', function ($iq) {
                        $iq->whereNull('credit_payment_id');
                    })->orWhereHas('invoiceGroupSpecimen.invoice', function ($giq) {
                        $giq->whereNull('credit_payment_id');
                    })->orWhere(function ($subq) {
                        $subq->doesntHave('invoiceRelation')->doesntHave('invoiceGroupSpecimen');
                    });
                });
            }
        }

        // Specimen Group filter
        if ($request->filled('group_id') && $request->get('group_id') !== 'all') {
            $query->where('group_id', $request->get('group_id'));
        }

        // Specimen Type filter
        if ($request->filled('specimen_type_id') && $request->get('specimen_type_id') !== 'all') {
            $query->where('specimen_type', $request->get('specimen_type_id'));
        }

        // Examination filter
        if ($request->filled('examination_id') && $request->get('examination_id') !== 'all') {
            $query->where('specimen_type_examination', $request->get('examination_id'));
        }

        return $query;
    }

    /**
     * Map a specimen record to export row values.
     */
    private function buildSpecimenExportRow(Specimen $specimen): array
    {
        $invoice = $specimen->invoiceRelation ?: $specimen->invoiceGroupSpecimen?->invoice;
        $igs = $specimen->invoiceGroupSpecimen;

        $paymentLabels = [
            'cash' => 'Efectivo',
            'card' => 'Tarjeta de Crédito',
            'credit card' => 'Tarjeta de Crédito',
            'transfer' => 'Transferencia Bancaria',
            'bank transfer' => 'Transferencia Bancaria',
            'check' => 'Cheque',
            'credit' => 'Crédito',
        ];

        $total = $igs ? (float) $igs->total : ($invoice ? (float) $invoice->total : 0.0);
        $totalPaid = $invoice ? (float) $invoice->total_paid : 0.0;
        $remaining = max(0.0, $total - $totalPaid);

        $customerName = $specimen->customerRelation?->name ?? 'N/A';
        if ($specimen->customerRelation?->id_number) {
            $customerName .= ' ('.$specimen->customerRelation->id_number.')';
        }

        $groupName = 'N/A';
        if ($specimen->group_id) {
            $groupName = ($specimen->group?->name ?? 'Grupo').' (#'.$specimen->group_id.')';
        }

        $specimenTypeExam = ($specimen->type?->name ?? 'N/A').' - '.($specimen->examination?->name ?? 'N/A');

        return [
            $specimen->created_at ? $specimen->created_at->format('d/m/Y h:i A') : 'N/A',
            $specimen->sequence_code ?: 'N/A',
            $invoice?->full_invoice_number ?: 'N/A',
            $customerName,
            $groupName,
            $specimenTypeExam,
            $invoice ? ($paymentLabels[$invoice->payment_type] ?? $invoice->payment_type) : 'N/A',
            $invoice?->credit_payment_id ? 'Sí (#'.$invoice->credit_payment_id.')' : 'No',
            $total,
            $totalPaid,
            $remaining,
        ];
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
