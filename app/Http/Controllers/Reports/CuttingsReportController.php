<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Cutting;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Models\WorkOrderType;
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

class CuttingsReportController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('reports.cuttings.view');

        $query = $this->buildQuery($request);

        // Sorting
        $sortField = $request->get('sort_field', 'date');
        $sortDirection = $request->get('sort_direction', 'desc');
        if (! in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        switch ($sortField) {
            case 'specimen_code':
                $query->join('specimen', 'cuttings.specimen_id', '=', 'specimen.id')
                    ->orderBy('specimen.sequence_code', $sortDirection)
                    ->select('cuttings.*');
                break;
            case 'number_of_cuttings':
                $query->orderBy('cuttings.number_of_cuttings', $sortDirection);
                break;
            case 'number_of_slides':
                $query->orderBy('cuttings.number_of_slides', $sortDirection);
                break;
            case 'status':
                $query->orderBy('cuttings.status', $sortDirection);
                break;
            case 'responsible':
                $query->join('users', 'cuttings.responsible_id', '=', 'users.id')
                    ->orderBy('users.name', $sortDirection)
                    ->select('cuttings.*');
                break;
            case 'date':
            default:
                $query->orderBy('cuttings.created_at', $sortDirection);
                break;
        }

        $cuttings = $query->get();

        // Resolve WorkOrderTypes names map for special stains mapping
        $workOrderTypes = WorkOrderType::withTrashed()->pluck('name', 'id')->toArray();

        // Transform results
        $formattedCuttings = $cuttings->map(function ($cutting) use ($workOrderTypes) {
            $specimen = $cutting->specimen;
            $numberOfCassettes = 1;
            $range = $cutting->code?->code ?? '';

            $specialStains = [];
            if (is_array($cutting->cutting_slide_types)) {
                foreach ($cutting->cutting_slide_types as $id) {
                    if (isset($workOrderTypes[$id])) {
                        $specialStains[] = $workOrderTypes[$id];
                    }
                }
            }

            return [
                'id' => $cutting->id,
                'created_at' => $cutting->created_at ? $cutting->created_at->toIso8601String() : null,
                'number_of_cuttings' => $cutting->number_of_cuttings,
                'cuttings_description' => $cutting->cuttings_description,
                'number_of_slides' => $cutting->number_of_slides,
                'status' => $cutting->status,
                'comments' => $cutting->comments,
                'responsible' => $cutting->responsible ? [
                    'id' => $cutting->responsible->id,
                    'name' => $cutting->responsible->name,
                    'role' => $cutting->responsible->role ? [
                        'name' => $cutting->responsible->role->name,
                    ] : null,
                ] : null,
                'specimen' => $specimen ? [
                    'id' => $specimen->id,
                    'sequence_code' => $specimen->sequence_code,
                    'type' => $specimen->type ? ['name' => $specimen->type->name] : null,
                    'examination' => $specimen->examination ? ['name' => $specimen->examination->name] : null,
                ] : null,
                'number_of_cassettes' => $numberOfCassettes,
                'cassettes_range' => $range ?: 'N/A',
                'cassette_color' => $cutting->code?->color ?? '#e2e8f0',
                'special_stains' => implode(', ', $specialStains),
                'is_new_cut' => (bool) $cutting->is_new_cut,
                'description' => $cutting->description,
                'prefix' => $cutting->prefix ? [
                    'id' => $cutting->prefix->id,
                    'prefix' => $cutting->prefix->prefix,
                ] : null,
                'code' => $cutting->code ? [
                    'id' => $cutting->code->id,
                    'code' => $cutting->code->code,
                    'color' => $cutting->code->color,
                ] : null,
                'cutting_slide_types' => $cutting->cutting_slide_types,
                'macroscopy_date' => $cutting->macroscopy_date ? $cutting->macroscopy_date->toIso8601String() : null,
                'processing_date' => $cutting->processing_date ? $cutting->processing_date->toIso8601String() : null,
                'delivery_date' => $cutting->delivery_date ? $cutting->delivery_date->toIso8601String() : null,
            ];
        });

        // Fetch users who are active for filtering
        $usersList = User::where('active', true)->orderBy('name', 'asc')->get()->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'role' => $u->role ? ['name' => $u->role->name] : null,
            ];
        });

        $specimenTypes = SpecimenType::where('active', true)->orderBy('name', 'asc')->get();
        $examinations = SpecimenTypeExamination::where('active', true)->with('prices')->get();

        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_cuttings_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );

        return Inertia::render('reports/cuttings/index', [
            'cuttings' => $formattedCuttings,
            'filters' => array_merge(
                $request->only([
                    'search', 'responsible_id', 'specimen_type_id', 'examination_id', 'sort_field', 'sort_direction',
                ]),
                [
                    'date_from' => $resolvedDates['from'],
                    'date_to' => $resolvedDates['to'],
                ]
            ),
            'usersList' => $usersList,
            'specimenTypes' => $specimenTypes,
            'examinations' => $examinations,
        ]);
    }

    public function export(Request $request)
    {
        Gate::authorize('reports.cuttings.view');

        $query = $this->buildQuery($request);

        // Sorting
        $sortField = $request->get('sort_field', 'date');
        $sortDirection = $request->get('sort_direction', 'desc');
        if (! in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        switch ($sortField) {
            case 'specimen_code':
                $query->join('specimen', 'cuttings.specimen_id', '=', 'specimen.id')
                    ->orderBy('specimen.sequence_code', $sortDirection)
                    ->select('cuttings.*');
                break;
            case 'number_of_cuttings':
                $query->orderBy('cuttings.number_of_cuttings', $sortDirection);
                break;
            case 'number_of_slides':
                $query->orderBy('cuttings.number_of_slides', $sortDirection);
                break;
            case 'status':
                $query->orderBy('cuttings.status', $sortDirection);
                break;
            case 'responsible':
                $query->join('users', 'cuttings.responsible_id', '=', 'users.id')
                    ->orderBy('users.name', $sortDirection)
                    ->select('cuttings.*');
                break;
            case 'date':
            default:
                $query->orderBy('cuttings.created_at', $sortDirection);
                break;
        }

        $cuttings = $query->get()->sort(function ($a, $b) {
            $specA = $a->specimen?->sequence_code ?? '';
            $specB = $b->specimen?->sequence_code ?? '';

            $specComp = strnatcasecmp($specA, $specB);
            if ($specComp !== 0) {
                return $specComp;
            }

            $codeA = $a->code?->code ?? '';
            $codeB = $b->code?->code ?? '';

            return strnatcasecmp($codeA, $codeB);
        });

        // Resolve WorkOrderTypes names map for special stains mapping
        $workOrderTypes = WorkOrderType::withTrashed()->pluck('name', 'id')->toArray();

        // Format Cuttings Data
        $formattedCuttings = $cuttings->map(function ($cutting) use ($workOrderTypes) {
            $specimen = $cutting->specimen;
            $numberOfCassettes = 1;
            $range = $cutting->code?->code ?? '';

            $specialStains = [];
            if (is_array($cutting->cutting_slide_types)) {
                foreach ($cutting->cutting_slide_types as $id) {
                    if (isset($workOrderTypes[$id])) {
                        $specialStains[] = $workOrderTypes[$id];
                    }
                }
            }

            $statusLabels = [
                'macroscopy' => 'Macroscopía',
                'processing' => 'Procesamiento',
                'delivered' => 'Entregado',
            ];

            return [
                'created_at' => $cutting->created_at ? $cutting->created_at->format('d/m/Y h:i A') : 'N/A',
                'sequence_code' => $specimen->sequence_code ?? 'N/A',
                'type_exam' => ($specimen && $specimen->type) ? ($specimen->type->name.' - '.($specimen->examination->name ?? 'N/A')) : 'N/A',
                'number_of_cuttings' => $cutting->number_of_cuttings,
                'cuttings_description' => $cutting->cuttings_description ?: 'N/A',
                'number_of_cassettes' => $numberOfCassettes,
                'special_stains' => implode(', ', $specialStains) ?: 'Ninguna',
                'cassettes_range' => $range ?: 'N/A',
                'number_of_slides' => $cutting->number_of_slides ?? 0,
                'status' => $statusLabels[$cutting->status] ?? $cutting->status,
                'comments' => $cutting->comments ?: 'N/A',
                'responsible_name' => $cutting->responsible->name ?? 'N/A',
            ];
        });

        $format = $request->get('format', 'xlsx');
        $headers = [
            'Fecha',
            'No. BIOPSIA',
            'Tipo de Muestra-Análisis',
            '# Cortes',
            'Descripción Cortes',
            '# Casetes',
            'T. ESPECIALES (Señalar)',
            'Código de Casete',
            'Total Laminas',
            'Estado',
            'Comentarios',
            'Responsables',
        ];

        if ($format === 'csv') {
            $filename = 'reporte_hoja_relacion_biopsias_'.date('Y_m_d_His').'.csv';

            return response()->streamDownload(function () use ($headers, $formattedCuttings) {
                $output = fopen('php://output', 'w');
                fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
                fputcsv($output, $headers);

                foreach ($formattedCuttings as $row) {
                    fputcsv($output, array_values($row));
                }

                fclose($output);
            }, $filename, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        }

        // default to xlsx
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Relación de Biopsias (Cortes)');

        // Paint entire worksheet area solid white
        $sheet->getStyle('A1:Z500')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFFF');

        // Resolve date range text for subtitle
        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_cuttings_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateSubtitle = ($resolvedDates['from'] && $resolvedDates['to'])
            ? 'Del '.$this->formatDateSpanish($resolvedDates['from']).' al '.$this->formatDateSpanish($resolvedDates['to'])
            : 'Todo el Historial';

        // Define column widths
        $columnWidths = [
            'A' => 22, // Fecha
            'B' => 20, // No. BIOPSIA
            'C' => 38, // Tipo de Muestra-Análisis
            'D' => 12, // # Cortes
            'E' => 20, // Descripción Cortes
            'F' => 12, // # Casetes
            'G' => 25, // T. ESPECIALES (Señalar)
            'H' => 18, // Rango de Casetes
            'I' => 16, // Total Laminas
            'J' => 16, // Estado
            'K' => 25, // Comentarios
            'L' => 25, // Responsables
        ];
        foreach ($columnWidths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // Add logo if exists
        $logoPath = public_path('images/PATOLABLOGO.png');
        if (file_exists($logoPath)) {
            $drawing = new Drawing;
            $drawing->setName('Logo');
            $drawing->setPath($logoPath);
            $drawing->setHeight(120);

            // Dynamically calculate centering
            [$imgWidth, $imgHeight] = getimagesize($logoPath);
            $logoWidth = ($imgWidth / $imgHeight) * 120;
            $totalWidthPx = array_sum($columnWidths) * 7.5;
            $leftEdgePx = ($totalWidthPx / 2) - ($logoWidth / 2);

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

        // Title styling (Row 5)
        $sheet->mergeCells('A5:L5');
        $sheet->setCellValue('A5', 'PATOLAB - HOJA DE RELACIÓN DE BIOPSIAS');
        $sheet->getStyle('A5')->getFont()->setBold(true)->setSize(16)->setName('Calibri');
        $sheet->getStyle('A5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Subtitle/Dates styling (Row 6)
        $sheet->mergeCells('A6:L6');
        $sheet->setCellValue('A6', $dateSubtitle);
        $sheet->getStyle('A6')->getFont()->setBold(true)->setSize(14)->setName('Calibri');
        $sheet->getStyle('A6')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Adjust row heights
        foreach (range(1, 4) as $r) {
            $sheet->getRowDimension($r)->setRowHeight(30);
        }
        $sheet->getRowDimension(5)->setRowHeight(25); // Title
        $sheet->getRowDimension(6)->setRowHeight(22); // Subtitle
        $sheet->getRowDimension(7)->setRowHeight(10); // Spacing
        $sheet->getRowDimension(8)->setRowHeight(28); // Header row

        // Set Headers at row 8
        foreach ($headers as $colIndex => $headerText) {
            $sheet->setCellValue([$colIndex + 1, 8], $headerText);
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
        $sheet->getStyle('A8:L8')->applyFromArray($headerStyle);

        // Populate data starting at row 9
        $rowNum = 9;
        foreach ($formattedCuttings as $row) {
            foreach (array_values($row) as $colIndex => $val) {
                $sheet->setCellValue([$colIndex + 1, $rowNum], $val);
            }
            $sheet->getStyle('A'.$rowNum.':L'.$rowNum)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('E0E0E0');
            $sheet->getRowDimension($rowNum)->setRowHeight(20);
            $rowNum++;
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'reporte_hoja_relacion_biopsias_'.date('Y_m_d_His').'.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function buildQuery(Request $request)
    {
        $query = Cutting::with([
            'code',
            'responsible.role',
            'specimen.type',
            'specimen.examination',
            'specimen.cuttings.code',
            'prefix',
        ]);

        // Search spec code, comments, or doctor name
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('comments', 'like', "%{$search}%")
                    ->orWhereHas('specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('responsible', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Date range filter
        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_cuttings_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(DateFilterService::getCookieToQueue(
                "date_filter_report_cuttings_user_{$userId}",
                $dateFrom,
                $dateTo,
                $resolvedDates['range']
            ));
        }

        if (! empty($dateFrom)) {
            $query->whereDate('cuttings.created_at', '>=', $dateFrom);
        }
        if (! empty($dateTo)) {
            $dateToEnd = Carbon::parse($dateTo)->addDays(1)->toDateString();
            $query->whereDate('cuttings.created_at', '<=', $dateToEnd);
        }

        // Doctor filter
        if ($request->filled('responsible_id') && $request->get('responsible_id') !== 'all') {
            $query->where('responsible_id', $request->get('responsible_id'));
        }

        // Specimen Type filter
        if ($request->filled('specimen_type_id') && $request->get('specimen_type_id') !== 'all') {
            $query->whereHas('specimen', function ($q) use ($request) {
                $q->where('specimen_type', $request->get('specimen_type_id'));
            });
        }

        // Examination filter
        if ($request->filled('examination_id') && $request->get('examination_id') !== 'all') {
            $query->whereHas('specimen', function ($q) use ($request) {
                $q->where('specimen_type_examination', $request->get('examination_id'));
            });
        }

        return $query;
    }

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
