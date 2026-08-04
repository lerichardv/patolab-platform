<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Specimen;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Services\DateFilterService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class DeliveryReportController extends Controller
{
    /**
     * Display the specimen delivery report page.
     */
    public function index(Request $request)
    {
        Gate::authorize('reports.delivery.view');

        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_delivery_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );

        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        // Build base query
        $query = Specimen::with(['customerRelation', 'type', 'examination', 'category'])
            ->where('status', '!=', 'cancelled');

        // Apply filters in database
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('sequence_code', 'like', "%{$search}%")
                    ->orWhereHas('customerRelation', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('id_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('customer_id') && $request->get('customer_id') !== 'all') {
            $query->where('customer', $request->get('customer_id'));
        }

        if ($request->filled('specimen_type_id') && $request->get('specimen_type_id') !== 'all') {
            $query->where('specimen_type', $request->get('specimen_type_id'));
        }

        if ($request->filled('examination_id') && $request->get('examination_id') !== 'all') {
            $query->where('specimen_type_examination', $request->get('examination_id'));
        }

        // Performance limit: created_at must be <= dateTo
        if ($dateTo) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        // Fetch and filter in PHP
        $specimens = $query->get();

        $filteredSpecimens = $specimens->filter(function ($specimen) use ($dateFrom, $dateTo) {
            $deliveryDate = $specimen->expected_finalization_date;
            if (! $deliveryDate) {
                return false;
            }

            $from = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : null;
            $to = $dateTo ? Carbon::parse($dateTo)->endOfDay() : null;

            if ($from && $to) {
                return $deliveryDate->between($from, $to);
            }
            if ($from) {
                return $deliveryDate->greaterThanOrEqualTo($from);
            }
            if ($to) {
                return $deliveryDate->lessThanOrEqualTo($to);
            }

            return true;
        })->values();

        // Manual pagination
        $page = (int) $request->get('page', 1);
        $perPage = 15;
        $sliced = $filteredSpecimens->slice(($page - 1) * $perPage, $perPage)->values();

        $paginated = new LengthAwarePaginator(
            $sliced,
            $filteredSpecimens->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        // Compile Summary breakdown
        $allExaminations = SpecimenTypeExamination::with('type')
            ->where('active', true)
            ->get();

        $summary = $allExaminations->map(function ($exam) use ($filteredSpecimens) {
            $count = $filteredSpecimens->filter(function ($specimen) use ($exam) {
                return $specimen->specimen_type == $exam->specimen_type &&
                       $specimen->specimen_type_examination == $exam->id;
            })->count();

            return [
                'specimen_type_name' => $exam->type?->name ?? 'N/A',
                'examination_name' => $exam->name,
                'total' => $count,
            ];
        })->values();

        // Resolve customer
        $selectedCustomer = null;
        $filteredCustomerId = $request->get('customer_id');
        if ($filteredCustomerId && $filteredCustomerId !== 'all') {
            $selectedCustomer = Customer::where('id', $filteredCustomerId)
                ->select('id', 'name', 'id_number')
                ->first();
        }

        $specimenTypes = SpecimenType::where('active', true)->orderBy('name', 'asc')->get();
        $examinations = SpecimenTypeExamination::where('active', true)->get();

        return Inertia::render('reports/delivery/index', [
            'specimens' => $paginated,
            'summary' => $summary,
            'filters' => array_merge(
                $request->only(['search', 'customer_id', 'specimen_type_id', 'examination_id']),
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
     * Export the delivery report as an Excel spreadsheet.
     */
    public function export(Request $request)
    {
        Gate::authorize('reports.delivery.view');

        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_delivery_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );

        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        // Build query
        $query = Specimen::with(['customerRelation', 'type', 'examination', 'category'])
            ->where('status', '!=', 'cancelled');

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('sequence_code', 'like', "%{$search}%")
                    ->orWhereHas('customerRelation', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('id_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('customer_id') && $request->get('customer_id') !== 'all') {
            $query->where('customer', $request->get('customer_id'));
        }

        if ($request->filled('specimen_type_id') && $request->get('specimen_type_id') !== 'all') {
            $query->where('specimen_type', $request->get('specimen_type_id'));
        }

        if ($request->filled('examination_id') && $request->get('examination_id') !== 'all') {
            $query->where('specimen_type_examination', $request->get('examination_id'));
        }

        if ($dateTo) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        $specimens = $query->get();

        $filteredSpecimens = $specimens->filter(function ($specimen) use ($dateFrom, $dateTo) {
            $deliveryDate = $specimen->expected_finalization_date;
            if (! $deliveryDate) {
                return false;
            }

            $from = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : null;
            $to = $dateTo ? Carbon::parse($dateTo)->endOfDay() : null;

            if ($from && $to) {
                return $deliveryDate->between($from, $to);
            }
            if ($from) {
                return $deliveryDate->greaterThanOrEqualTo($from);
            }
            if ($to) {
                return $deliveryDate->lessThanOrEqualTo($to);
            }

            return true;
        })->values();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Hoja de Entrega');

        // Paint background solid white
        $sheet->getStyle('A1:Z500')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFFF');

        // Subtitle range
        $dateFromText = $this->formatDateSpanish($dateFrom);
        $dateToText = $this->formatDateSpanish($dateTo);
        $dateSubtitle = ($dateFromText && $dateToText) ? "Del {$dateFromText} al {$dateToText}" : 'Todo el Historial';

        // Column widths
        $columnWidths = [
            'A' => 28,
            'B' => 16,
            'C' => 32,
            'D' => 24,
            'E' => 22,
            'F' => 18,
            'G' => 24,
            'H' => 26,
            'I' => 10,
        ];
        foreach ($columnWidths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // Add logo centered
        $logoPath = public_path('images/PATOLABLOGO.png');
        if (file_exists($logoPath)) {
            $drawing = new Drawing;
            $drawing->setName('Logo');
            $drawing->setPath($logoPath);
            $drawing->setHeight(150);

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
            $drawing->setOffsetY(30);
            $drawing->setWorksheet($sheet);
        }

        // Title (Row 5)
        $sheet->mergeCells('A5:I5');
        $sheet->setCellValue('A5', 'PATOLAB - HOJA DE ENTREGA DE MUESTRAS');
        $sheet->getStyle('A5')->getFont()->setBold(true)->setSize(16)->setName('Calibri');
        $sheet->getStyle('A5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Subtitle (Row 6)
        $sheet->mergeCells('A6:I6');
        $sheet->setCellValue('A6', $dateSubtitle);
        $sheet->getStyle('A6')->getFont()->setBold(true)->setSize(14)->setName('Calibri');
        $sheet->getStyle('A6')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Row heights
        foreach (range(1, 4) as $r) {
            $sheet->getRowDimension($r)->setRowHeight(35);
        }
        $sheet->getRowDimension(5)->setRowHeight(30);
        $sheet->getRowDimension(6)->setRowHeight(25);
        $sheet->getRowDimension(7)->setRowHeight(15);
        $sheet->getRowDimension(8)->setRowHeight(28);

        // Table headers (Row 8)
        $headers = [
            'Cliente/Empresa',
            'ID/RTN',
            'Tipo de Muestra-Análisis',
            'Categoría',
            'Código de la Muestra',
            'Fecha de Ingreso',
            'Fecha Estimada Interna',
            'Fecha Estimada de Entrega',
            'Total',
        ];

        foreach ($headers as $idx => $headerText) {
            $colLetter = chr(65 + $idx);
            $cell = $colLetter.'8';
            $sheet->setCellValue($cell, $headerText);

            $sheet->getStyle($cell)->getFont()->setBold(true)->setSize(11)->setName('Calibri');
            $sheet->getStyle($cell)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);

            // Double border bottom, simple border top for header
            $sheet->getStyle($cell)->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
            $sheet->getStyle($cell)->getBorders()->getBottom()->setBorderStyle(Border::BORDER_DOUBLE);

            // Highlight yellow for estimated delivery date column
            if ($headerText === 'Fecha Estimada de Entrega') {
                $sheet->getStyle($cell)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFF00');
            }
        }

        // Loop rows
        $currentRow = 9;
        foreach ($filteredSpecimens as $specimen) {
            $sheet->getRowDimension($currentRow)->setRowHeight(20);

            $service = ($specimen->type?->name ?? 'N/A').' - '.($specimen->examination?->name ?? 'N/A');
            $expectedInternal = $specimen->expected_internal_finalization_date
                ? $specimen->expected_internal_finalization_date->format('d/m/Y')
                : 'N/A';
            $expectedDelivery = $specimen->expected_finalization_date
                ? $specimen->expected_finalization_date->format('d/m/Y')
                : 'N/A';

            $sheet->setCellValue('A'.$currentRow, $specimen->customerRelation?->name ?? 'N/A');
            $sheet->setCellValue('B'.$currentRow, $specimen->customerRelation?->id_number ?? 'N/A');
            $sheet->setCellValue('C'.$currentRow, $service);
            $sheet->setCellValue('D'.$currentRow, $specimen->category?->name ?? 'N/A');
            $sheet->setCellValue('E'.$currentRow, $specimen->sequence_code ?? 'N/A');
            $sheet->setCellValue('F'.$currentRow, $specimen->created_at ? $specimen->created_at->format('d/m/Y') : 'N/A');
            $sheet->setCellValue('G'.$currentRow, $expectedInternal);
            $sheet->setCellValue('H'.$currentRow, $expectedDelivery);
            $sheet->setCellValue('I'.$currentRow, 1);

            // Styles for details row
            $sheet->getStyle("A{$currentRow}:D{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            $sheet->getStyle("E{$currentRow}:H{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("I{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

            $sheet->getStyle("A{$currentRow}:I{$currentRow}")->getFont()->setSize(10)->setName('Calibri');

            // Accent yellow highlight on estimated delivery date column cell
            $sheet->getStyle('H'.$currentRow)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFE0');

            $currentRow++;
        }

        // Totals Row (at bottom of details list)
        $sheet->getRowDimension($currentRow)->setRowHeight(24);
        $sheet->mergeCells("A{$currentRow}:H{$currentRow}");
        $sheet->setCellValue("A{$currentRow}", 'Total');
        $sheet->getStyle("A{$currentRow}")->getFont()->setBold(true)->setSize(10)->setName('Calibri');
        $sheet->getStyle("A{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        $sheet->setCellValue("I{$currentRow}", '=SUM(I9:I'.($currentRow - 1).')');
        $sheet->getStyle("I{$currentRow}")->getFont()->setBold(true)->setSize(10)->setName('Calibri');
        $sheet->getStyle("I{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        // Double borders for total row
        $sheet->getStyle("A{$currentRow}:I{$currentRow}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$currentRow}:I{$currentRow}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_DOUBLE);

        // Dynamic Space
        $currentRow += 3;

        // Summary Title
        $sheet->getRowDimension($currentRow)->setRowHeight(24);
        $sheet->mergeCells("A{$currentRow}:C{$currentRow}");
        $sheet->setCellValue("A{$currentRow}", 'Resumen por tipo de Muestra y Análisis');
        $sheet->getStyle("A{$currentRow}")->getFont()->setBold(true)->setSize(11)->setName('Calibri');
        $sheet->getStyle("A{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("A{$currentRow}:C{$currentRow}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

        $currentRow++;

        // Summary Headers
        $sheet->getRowDimension($currentRow)->setRowHeight(22);
        $sheet->setCellValue('A'.$currentRow, 'Tipo de Muestra');
        $sheet->setCellValue('B'.$currentRow, 'Tipo de Análisis');
        $sheet->setCellValue('C'.$currentRow, 'Total');

        $sheet->getStyle("A{$currentRow}:C{$currentRow}")->getFont()->setBold(true)->setSize(10)->setName('Calibri');
        $sheet->getStyle('A'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
        $sheet->getStyle('B'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
        $sheet->getStyle('C'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle("A{$currentRow}:C{$currentRow}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

        $summaryStartRow = $currentRow + 1;
        $currentRow++;

        // Summary Rows
        $allExaminations = SpecimenTypeExamination::with('type')
            ->where('active', true)
            ->get();

        foreach ($allExaminations as $exam) {
            $count = $filteredSpecimens->filter(function ($specimen) use ($exam) {
                return $specimen->specimen_type == $exam->specimen_type &&
                       $specimen->specimen_type_examination == $exam->id;
            })->count();

            if ($count === 0) {
                continue;
            }

            $sheet->getRowDimension($currentRow)->setRowHeight(20);
            $sheet->setCellValue('A'.$currentRow, $exam->type?->name ?? 'N/A');
            $sheet->setCellValue('B'.$currentRow, $exam->name);
            $sheet->setCellValue('C'.$currentRow, $count);

            $sheet->getStyle("A{$currentRow}:C{$currentRow}")->getFont()->setSize(10)->setName('Calibri');
            $sheet->getStyle('A'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            $sheet->getStyle('B'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            $sheet->getStyle('C'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

            $currentRow++;
        }

        // Summary Total Row
        $sheet->getRowDimension($currentRow)->setRowHeight(22);
        $sheet->mergeCells("A{$currentRow}:B{$currentRow}");
        $sheet->setCellValue("A{$currentRow}", 'Total');
        $sheet->getStyle("A{$currentRow}")->getFont()->setBold(true)->setSize(10)->setName('Calibri');
        $sheet->getStyle("A{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        $sheet->setCellValue("C{$currentRow}", "=SUM(C{$summaryStartRow}:C".($currentRow - 1).')');
        $sheet->getStyle("C{$currentRow}")->getFont()->setBold(true)->setSize(10)->setName('Calibri');
        $sheet->getStyle("C{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        $sheet->getStyle("A{$currentRow}:C{$currentRow}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$currentRow}:C{$currentRow}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_DOUBLE);

        // Export
        $writer = new Xlsx($spreadsheet);
        $filename = 'hoja_de_entrega_muestras_'.date('Y_m_d_His').'.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Format a date into Spanish text representation.
     */
    private function formatDateSpanish($dateString)
    {
        if (! $dateString) {
            return null;
        }

        $date = Carbon::parse($dateString);
        $months = [
            1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
            5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
            9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre',
        ];

        return $date->day.' de '.$months[$date->month];
    }
}
