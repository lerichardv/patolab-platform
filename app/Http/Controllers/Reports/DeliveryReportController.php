<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
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

        $internalDateFrom = $request->get('internal_date_from');
        $internalDateTo = $request->get('internal_date_to');

        // Build base query
        $query = Specimen::with(['customerRelation', 'type', 'examination', 'category', 'users'])
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

        if ($request->has('specimen_type_id') && $request->get('specimen_type_id') !== 'all') {
            $typeIds = $request->get('specimen_type_id');
            if (! is_array($typeIds)) {
                $typeIds = [$typeIds];
            }
            $typeIds = array_values(array_filter(array_map('strval', $typeIds), fn ($v) => $v !== '' && $v !== 'all'));
            if (empty($typeIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('specimen_type', $typeIds);
            }
        }

        if ($request->has('examination_id') && $request->get('examination_id') !== 'all') {
            $examIds = $request->get('examination_id');
            if (! is_array($examIds)) {
                $examIds = [$examIds];
            }
            $examIds = array_values(array_filter(array_map('strval', $examIds), fn ($v) => $v !== '' && $v !== 'all'));
            if (empty($examIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('specimen_type_examination', $examIds);
            }
        }

        if ($request->has('pathologist_id') && $request->get('pathologist_id') !== 'all') {
            $pathologistIds = $request->get('pathologist_id');
            if (! is_array($pathologistIds)) {
                $pathologistIds = [$pathologistIds];
            }
            $pathologistIds = array_values(array_filter(array_map('strval', $pathologistIds), fn ($v) => $v !== '' && $v !== 'all'));
            if (empty($pathologistIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereHas('users', function ($uq) use ($pathologistIds) {
                    $uq->whereIn('users.id', $pathologistIds);
                });
            }
        }

        // Performance limit: created_at must be <= dateTo if specified
        if ($dateTo) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        // Fetch and filter in PHP
        $specimens = $query->get();

        $filteredSpecimens = $specimens->filter(function ($specimen) use ($dateFrom, $dateTo, $internalDateFrom, $internalDateTo) {
            $deliveryDate = $specimen->expected_finalization_date;
            $internalDate = $specimen->expected_internal_finalization_date;

            // Delivery Date Filter
            if ($dateFrom || $dateTo) {
                if (! $deliveryDate) {
                    return false;
                }

                $from = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : null;
                $to = $dateTo ? Carbon::parse($dateTo)->endOfDay() : null;

                if ($from && $to && ! $deliveryDate->between($from, $to)) {
                    return false;
                }
                if ($from && $deliveryDate->lessThan($from)) {
                    return false;
                }
                if ($to && $deliveryDate->greaterThan($to)) {
                    return false;
                }
            }

            // Internal Estimated Date Filter
            if ($internalDateFrom || $internalDateTo) {
                if (! $internalDate) {
                    return false;
                }

                $intFrom = $internalDateFrom ? Carbon::parse($internalDateFrom)->startOfDay() : null;
                $intTo = $internalDateTo ? Carbon::parse($internalDateTo)->endOfDay() : null;

                if ($intFrom && $intTo && ! $internalDate->between($intFrom, $intTo)) {
                    return false;
                }
                if ($intFrom && $internalDate->lessThan($intFrom)) {
                    return false;
                }
                if ($intTo && $internalDate->greaterThan($intTo)) {
                    return false;
                }
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

        $pathologistRoleId = Setting::where('setting_key', 'pathologist_role_id')->value('setting_value');
        $pathologistRoleIds = [];
        if ($pathologistRoleId) {
            $assistantRole = Role::where('slug', 'assistant_pathologist')->first();
            $pathologistRoleIds = array_filter([$pathologistRoleId, $assistantRole?->id]);
        } else {
            $pathologistRoleIds = Role::whereIn('slug', ['pathologist', 'assistant_pathologist'])->pluck('id')->toArray();
        }

        $pathologists = User::where('active', true)
            ->when(! empty($pathologistRoleIds), fn ($q) => $q->whereIn('role_id', $pathologistRoleIds))
            ->orderBy('name', 'asc')
            ->get(['id', 'name']);

        return Inertia::render('reports/delivery/index', [
            'specimens' => $paginated,
            'summary' => $summary,
            'filters' => array_merge(
                $request->only(['search', 'customer_id', 'specimen_type_id', 'examination_id', 'pathologist_id', 'internal_date_from', 'internal_date_to']),
                [
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]
            ),
            'selectedCustomer' => $selectedCustomer,
            'specimenTypes' => $specimenTypes,
            'examinations' => $examinations,
            'pathologists' => $pathologists,
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

        $internalDateFrom = $request->get('internal_date_from');
        $internalDateTo = $request->get('internal_date_to');

        // Build query
        $query = Specimen::with(['customerRelation', 'type', 'examination', 'category', 'users'])
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

        if ($request->has('specimen_type_id') && $request->get('specimen_type_id') !== 'all') {
            $typeIds = $request->get('specimen_type_id');
            if (! is_array($typeIds)) {
                $typeIds = [$typeIds];
            }
            $typeIds = array_values(array_filter(array_map('strval', $typeIds), fn ($v) => $v !== '' && $v !== 'all'));
            if (empty($typeIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('specimen_type', $typeIds);
            }
        }

        if ($request->has('examination_id') && $request->get('examination_id') !== 'all') {
            $examIds = $request->get('examination_id');
            if (! is_array($examIds)) {
                $examIds = [$examIds];
            }
            $examIds = array_values(array_filter(array_map('strval', $examIds), fn ($v) => $v !== '' && $v !== 'all'));
            if (empty($examIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('specimen_type_examination', $examIds);
            }
        }

        if ($request->has('pathologist_id') && $request->get('pathologist_id') !== 'all') {
            $pathologistIds = $request->get('pathologist_id');
            if (! is_array($pathologistIds)) {
                $pathologistIds = [$pathologistIds];
            }
            $pathologistIds = array_values(array_filter(array_map('strval', $pathologistIds), fn ($v) => $v !== '' && $v !== 'all'));
            if (empty($pathologistIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereHas('users', function ($uq) use ($pathologistIds) {
                    $uq->whereIn('users.id', $pathologistIds);
                });
            }
        }

        if ($dateTo) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        $specimens = $query->get();

        $filteredSpecimens = $specimens->filter(function ($specimen) use ($dateFrom, $dateTo, $internalDateFrom, $internalDateTo) {
            $deliveryDate = $specimen->expected_finalization_date;
            $internalDate = $specimen->expected_internal_finalization_date;

            // Delivery Date Filter
            if ($dateFrom || $dateTo) {
                if (! $deliveryDate) {
                    return false;
                }

                $from = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : null;
                $to = $dateTo ? Carbon::parse($dateTo)->endOfDay() : null;

                if ($from && $to && ! $deliveryDate->between($from, $to)) {
                    return false;
                }
                if ($from && $deliveryDate->lessThan($from)) {
                    return false;
                }
                if ($to && $deliveryDate->greaterThan($to)) {
                    return false;
                }
            }

            // Internal Estimated Date Filter
            if ($internalDateFrom || $internalDateTo) {
                if (! $internalDate) {
                    return false;
                }

                $intFrom = $internalDateFrom ? Carbon::parse($internalDateFrom)->startOfDay() : null;
                $intTo = $internalDateTo ? Carbon::parse($internalDateTo)->endOfDay() : null;

                if ($intFrom && $intTo && ! $internalDate->between($intFrom, $intTo)) {
                    return false;
                }
                if ($intFrom && $internalDate->lessThan($intFrom)) {
                    return false;
                }
                if ($intTo && $internalDate->greaterThan($intTo)) {
                    return false;
                }
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
            'F' => 24,
            'G' => 18,
            'H' => 18,
            'I' => 24,
            'J' => 26,
            'K' => 22,
            'L' => 10,
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
        $sheet->mergeCells('A5:L5');
        $sheet->setCellValue('A5', 'PATOLAB - HOJA DE ENTREGA DE MUESTRAS');
        $sheet->getStyle('A5')->getFont()->setBold(true)->setSize(16)->setName('Calibri');
        $sheet->getStyle('A5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Subtitle (Row 6)
        $sheet->mergeCells('A6:L6');
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
            'Patólogos',
            'Estado',
            'Fecha de Finalización',
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

        $statusLabels = [
            'received' => 'Recibida',
            'macroscopic_review' => 'Rev. Macroscópica',
            'processing' => 'En Proceso',
            'microscopic_review' => 'Rev. Microscópica',
            'finalized' => 'Finalizada',
            'delivered' => 'Entregada',
            'cancelled' => 'Cancelada',
        ];

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
            $finalizedAt = $specimen->finalized_at
                ? $specimen->finalized_at->format('d/m/Y')
                : 'N/A';
            $statusName = $statusLabels[$specimen->status] ?? $specimen->status;
            $pathologists = $specimen->users && $specimen->users->isNotEmpty()
                ? $specimen->users->pluck('name')->join(', ')
                : 'Sin asignar';

            $sheet->setCellValue('A'.$currentRow, $specimen->customerRelation?->name ?? 'N/A');
            $sheet->setCellValue('B'.$currentRow, $specimen->customerRelation?->id_number ?? 'N/A');
            $sheet->setCellValue('C'.$currentRow, $service);
            $sheet->setCellValue('D'.$currentRow, $specimen->category?->name ?? 'N/A');
            $sheet->setCellValue('E'.$currentRow, $specimen->sequence_code ?? 'N/A');
            $sheet->setCellValue('F'.$currentRow, $pathologists);
            $sheet->setCellValue('G'.$currentRow, $statusName);
            $sheet->setCellValue('H'.$currentRow, $finalizedAt);
            $sheet->setCellValue('I'.$currentRow, $specimen->created_at ? $specimen->created_at->format('d/m/Y') : 'N/A');
            $sheet->setCellValue('J'.$currentRow, $expectedInternal);
            $sheet->setCellValue('K'.$currentRow, $expectedDelivery);
            $sheet->setCellValue('L'.$currentRow, 1);

            // Styles for details row
            $sheet->getStyle("A{$currentRow}:D{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            $sheet->getStyle("E{$currentRow}:K{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("L{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

            $sheet->getStyle("A{$currentRow}:L{$currentRow}")->getFont()->setSize(10)->setName('Calibri');

            // Accent yellow highlight on estimated delivery date column cell (Column K)
            $sheet->getStyle('K'.$currentRow)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFE0');

            $currentRow++;
        }

        // Totals Row (at bottom of details list)
        $sheet->getRowDimension($currentRow)->setRowHeight(24);
        $sheet->mergeCells("A{$currentRow}:K{$currentRow}");
        $sheet->setCellValue("A{$currentRow}", 'Total');
        $sheet->getStyle("A{$currentRow}")->getFont()->setBold(true)->setSize(10)->setName('Calibri');
        $sheet->getStyle("A{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        $sheet->setCellValue("L{$currentRow}", '=SUM(L9:L'.($currentRow - 1).')');
        $sheet->getStyle("L{$currentRow}")->getFont()->setBold(true)->setSize(10)->setName('Calibri');
        $sheet->getStyle("L{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        // Double borders for total row
        $sheet->getStyle("A{$currentRow}:L{$currentRow}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$currentRow}:L{$currentRow}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_DOUBLE);

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
