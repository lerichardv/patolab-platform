<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Services\DateFilterService;
use App\Services\ReportPdfService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class KeywordSearchReportController extends Controller
{
    /**
     * Display the Keyword Search Report page.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('reports.keywords.view');

        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_report_keywords_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );

        $specimenTypes = SpecimenType::where('active', true)
            ->orderBy('name', 'asc')
            ->get(['id', 'name']);

        $examinations = SpecimenTypeExamination::where('active', true)
            ->orderBy('name', 'asc')
            ->get(['id', 'name', 'specimen_type']);

        $pathologists = $this->getPathologistsList();

        return Inertia::render('reports/keywords/index', [
            'filters' => [
                'search' => $request->get('search', ''),
                'date_from' => $resolvedDates['from'],
                'date_to' => $resolvedDates['to'],
                'specimen_type_id' => $request->get('specimen_type_id', 'all'),
                'examination_id' => $request->get('examination_id', 'all'),
                'pathologist_id' => $request->get('pathologist_id', 'all'),
            ],
            'specimenTypes' => $specimenTypes,
            'examinations' => $examinations,
            'pathologists' => $pathologists,
        ]);
    }

    /**
     * Progressive streaming of keyword search matches using NDJSON.
     */
    public function stream(Request $request): StreamedResponse
    {
        Gate::authorize('reports.keywords.view');

        set_time_limit(180);

        return response()->stream(function () use ($request) {
            if (ob_get_length() > 0) {
                ob_flush();
            }
            flush();

            $term = trim((string) $request->get('search', ''));
            $query = $this->buildQuery($request);

            $totalFound = 0;

            $query->chunk(25, function ($specimens) use (&$totalFound, $term) {
                foreach ($specimens as $specimen) {
                    $totalFound++;
                    $row = $this->transformSpecimenRow($specimen, $term);

                    echo json_encode([
                        'type' => 'result',
                        'data' => $row,
                    ], JSON_UNESCAPED_UNICODE)."\n";

                    flush();
                }
            });

            echo json_encode([
                'type' => 'done',
                'total' => $totalFound,
            ], JSON_UNESCAPED_UNICODE)."\n";

            flush();
        }, 200, [
            'Content-Type' => 'application/x-ndjson',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Get preview data for specimen report (detects if PDF file exists or provides specimen data for HTML rendering).
     */
    public function previewData(Specimen $specimen)
    {
        Gate::authorize('reports.keywords.view');

        $specimen->load([
            'customerRelation',
            'type',
            'examination',
            'examinations',
            'specimenExaminations.examination',
            'category',
            'referrerRelation',
            'report',
            'users.role',
            'cuttings.code',
            'cuttings.prefix',
            'cuttings.responsible',
        ]);

        $report = $specimen->report;
        $hasPdf = $report && ! empty($report->report_file) && Storage::disk('public')->exists($report->report_file);

        return response()->json([
            'has_pdf' => (bool) $hasPdf,
            'pdf_url' => $hasPdf ? Storage::disk('public')->url($report->report_file) : null,
            'specimen' => [
                'id' => $specimen->id,
                'sequence_code' => $specimen->sequence_code,
                'sample_collection_date' => $specimen->sample_collection_date ? $specimen->sample_collection_date->format('Y-m-d') : '',
                'sample_collection_date_na' => (bool) $specimen->sample_collection_date_na,
                'anatomic_site' => $specimen->anatomic_site ?? '',
                'diagnosis' => $specimen->diagnosis,
                'clinical_notes' => $specimen->clinical_notes,
                'status' => $specimen->status,
                'customer_relation' => $specimen->customerRelation ? [
                    'id' => $specimen->customerRelation->id,
                    'name' => $specimen->customerRelation->name,
                    'id_number' => $specimen->customerRelation->id_number,
                    'phone' => $specimen->customerRelation->phone,
                    'gender' => $specimen->customerRelation->gender,
                    'age' => $specimen->customerRelation->age,
                    'age_unit' => $specimen->customerRelation->age_unit,
                    'type' => $specimen->customerRelation->type,
                ] : null,
                'referrer_relation' => $specimen->referrerRelation ? [
                    'name' => $specimen->referrerRelation->name,
                    'notes' => $specimen->referrerRelation->notes ?? null,
                ] : null,
                'type' => $specimen->type ? [
                    'name' => $specimen->type->name,
                ] : null,
                'examination' => $specimen->examination ? [
                    'name' => $specimen->examination->name,
                ] : null,
                'users' => $specimen->users->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role' => $u->role ? ['name' => $u->role->name] : null,
                    'user_signature' => $u->user_signature,
                    'signature_url' => $u->signature_url,
                    'signature_subtext' => $u->signature_subtext,
                ]),
                'report' => $report ? [
                    'id' => $report->id,
                    'report_code' => $report->report_code,
                    'report_validation_token' => $report->report_validation_token,
                    'report_validation_qr_code' => $report->report_validation_qr_code,
                    'report_date' => $report->report_date ? $report->report_date->format('Y-m-d') : '',
                    'finalization_date' => $report->finalization_date ? $report->finalization_date->format('Y-m-d') : '',
                    'diagnosis_html' => $report->diagnosis_html,
                    'macroscopy_html' => $report->macroscopy_html,
                    'microscopy_html' => $report->microscopy_html,
                    'clinical_details_html' => $report->clinical_details_html,
                    'comments_notes_html' => $report->comments_notes_html,
                    'protocols_html' => $report->protocols_html,
                    'legend_html' => $report->legend_html,
                    'open_text_html' => $report->open_text_html,
                    'open_text_label' => $report->open_text_label,
                    'addendum_html' => $report->addendum_html,
                    'sections_order' => $report->sections_order,
                    'headings_toggles' => $report->headings_toggles,
                ] : null,
            ],
            'report' => $report,
        ]);
    }

    /**
     * Preview specimen report PDF inline.
     */
    public function previewPdf(Specimen $specimen)
    {
        Gate::authorize('reports.keywords.view');

        $specimen->load(['report']);
        $report = $specimen->report;

        if ($report && ! empty($report->report_file) && Storage::disk('public')->exists($report->report_file)) {
            return response()->file(Storage::disk('public')->path($report->report_file), [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="reporte_'.$specimen->sequence_code.'.pdf"',
            ]);
        }

        if (! $report) {
            abort(404, 'No hay reporte asociado a esta muestra.');
        }

        $pdfContent = app(ReportPdfService::class)->generatePdfContent($specimen);

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="reporte_'.$specimen->sequence_code.'.pdf"',
        ]);
    }

    /**
     * Export matching results to an Excel spreadsheet.
     */
    public function export(Request $request): StreamedResponse
    {
        Gate::authorize('reports.keywords.view');

        $term = trim((string) $request->get('search', ''));
        $query = $this->buildQuery($request);
        $specimens = $query->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Palabras Clave');
        $sheet->setShowGridLines(true);

        // Header and branding
        $logoPath = public_path('images/patolab.png');
        if (file_exists($logoPath)) {
            $drawing = new Drawing;
            $drawing->setName('PatoLab');
            $drawing->setDescription('PatoLab Logo');
            $drawing->setPath($logoPath);
            $drawing->setHeight(45);
            $drawing->setCoordinates('A2');
            $drawing->setWorksheet($sheet);
        }

        $sheet->setCellValue('C2', 'REPORTE DE PALABRAS CLAVE');
        $sheet->getStyle('C2')->getFont()->setSize(16)->setBold(true)->getColor()->setARGB('1E3A8A');

        $sheet->setCellValue('C3', 'Informes patológicos filtrados por término de búsqueda y criterios clínicos');
        $sheet->getStyle('C3')->getFont()->setSize(10)->setItalic(true)->getColor()->setARGB('666666');

        $dateRangeText = 'Generado el: '.Carbon::now()->format('d/m/Y H:i');
        if ($request->filled('date_from') && $request->filled('date_to')) {
            $dateRangeText .= " | Rango de fechas: {$request->get('date_from')} al {$request->get('date_to')}";
        }
        if (! empty($term)) {
            $dateRangeText .= " | Término buscado: \"{$term}\"";
        }
        $sheet->setCellValue('C4', $dateRangeText);
        $sheet->getStyle('C4')->getFont()->setSize(9)->getColor()->setARGB('444444');

        // Column headers
        $headers = [
            'A7' => 'PACIENTE',
            'B7' => 'ID / RTN',
            'C7' => 'CÓDIGO MUESTRA',
            'D7' => 'TIPO DE MUESTRA',
            'E7' => 'ANÁLISIS',
            'F7' => 'PALABRAS CLAVE (CONTEXTO)',
            'G7' => 'FECHA INFORME',
            'H7' => 'PATÓLOGO',
            'I7' => 'ESTADO',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['argb' => 'FFFFFF'],
                'size' => 10,
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => '1E3A8A'],
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => '0F172A'],
                ],
            ],
        ];

        $sheet->getStyle('A7:I7')->applyFromArray($headerStyle);
        $sheet->getRowDimension(7)->setRowHeight(26);

        // Data rows
        $currentRow = 8;
        foreach ($specimens as $specimen) {
            $row = $this->transformSpecimenRow($specimen, $term);

            $sheet->setCellValue("A{$currentRow}", $row['patient_name']);
            $sheet->setCellValue("B{$currentRow}", $row['patient_id']);
            $sheet->setCellValue("C{$currentRow}", $row['sequence_code']);
            $sheet->setCellValue("D{$currentRow}", $row['specimen_type']);
            $sheet->setCellValue("E{$currentRow}", $row['examination']);
            $sheet->setCellValue("F{$currentRow}", $row['keyword_context_clean'] ?? $row['keyword_context']);
            $sheet->setCellValue("G{$currentRow}", $row['report_date']);
            $sheet->setCellValue("H{$currentRow}", $row['pathologists']);
            $sheet->setCellValue("I{$currentRow}", $row['status_label']);

            $sheet->getStyle("A{$currentRow}:I{$currentRow}")
                ->getBorders()
                ->getAllBorders()
                ->setBorderStyle(Border::BORDER_THIN)
                ->getColor()
                ->setARGB('E2E8F0');

            $sheet->getStyle("B{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("C{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("G{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("I{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $sheet->getRowDimension($currentRow)->setRowHeight(22);
            $currentRow++;
        }

        // Auto column dimensions
        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'reporte_palabras_clave_'.date('Y_m_d_His').'.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Build the query for specimens matching filters and keywords.
     */
    private function buildQuery(Request $request)
    {
        $query = Specimen::with([
            'customerRelation',
            'type',
            'specimenExaminations.examination',
            'examinations',
            'examination',
            'users',
            'report',
            'invoiceRelation',
        ])->where('status', '!=', 'cancelled');

        // Date range filter
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        if ($dateFrom || $dateTo) {
            $query->where(function ($q) use ($dateFrom, $dateTo) {
                $q->whereHas('report', function ($rq) use ($dateFrom, $dateTo) {
                    if ($dateFrom) {
                        $rq->whereDate('report_date', '>=', $dateFrom)
                            ->orWhereDate('report_finalization_datetime', '>=', $dateFrom);
                    }
                    if ($dateTo) {
                        $rq->whereDate('report_date', '<=', $dateTo)
                            ->orWhereDate('report_finalization_datetime', '<=', $dateTo);
                    }
                })->orWhere(function ($fallbackQ) use ($dateFrom, $dateTo) {
                    $fallbackQ->whereDoesntHave('report');
                    if ($dateFrom) {
                        $fallbackQ->whereDate('created_at', '>=', $dateFrom);
                    }
                    if ($dateTo) {
                        $fallbackQ->whereDate('created_at', '<=', $dateTo);
                    }
                });
            });
        }

        // Specimen Type filter
        $typeIds = $this->parseFilterIds($request, 'specimen_type_id');
        if ($typeIds !== null) {
            if (empty($typeIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('specimen_type', $typeIds);
            }
        }

        // Examination filter
        $examIds = $this->parseFilterIds($request, 'examination_id');
        if ($examIds !== null) {
            if (empty($examIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->where(function ($q) use ($examIds) {
                    $q->whereHas('specimenExaminations', function ($sq) use ($examIds) {
                        $sq->whereIn('examination_id', $examIds);
                    })->orWhereIn('specimen_type_examination', $examIds);
                });
            }
        }

        // Pathologist filter
        $pathologistIds = $this->parseFilterIds($request, 'pathologist_id');
        if ($pathologistIds !== null) {
            if (empty($pathologistIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereHas('users', function ($uq) use ($pathologistIds) {
                    $uq->whereIn('users.id', $pathologistIds);
                });
            }
        }

        // Search term filter
        if ($request->filled('search')) {
            $term = trim((string) $request->get('search'));
            if ($term !== '') {
                $query->where(function ($q) use ($term) {
                    $q->where('sequence_code', 'like', "%{$term}%")
                        ->orWhere('anatomic_site', 'like', "%{$term}%")
                        ->orWhere('diagnosis', 'like', "%{$term}%")
                        ->orWhere('clinical_notes', 'like', "%{$term}%")
                        ->orWhereHas('customerRelation', function ($cq) use ($term) {
                            $cq->where('name', 'like', "%{$term}%")
                                ->orWhere('id_number', 'like', "%{$term}%");
                        })
                        ->orWhereHas('invoiceRelation', function ($iq) use ($term) {
                            $iq->where('invoice_number', 'like', "%{$term}%");
                        })
                        ->orWhereHas('report', function ($rq) use ($term) {
                            $rq->where('microscopy_html', 'like', "%{$term}%")
                                ->orWhere('macroscopy_html', 'like', "%{$term}%")
                                ->orWhere('diagnosis_html', 'like', "%{$term}%")
                                ->orWhere('comments_notes_html', 'like', "%{$term}%")
                                ->orWhere('clinical_details_html', 'like', "%{$term}%")
                                ->orWhere('addendum_html', 'like', "%{$term}%")
                                ->orWhere('protocols_html', 'like', "%{$term}%")
                                ->orWhere('legend_html', 'like', "%{$term}%")
                                ->orWhere('open_text_html', 'like', "%{$term}%");
                        });
                });
            }
        }

        $query->orderBy('created_at', 'desc');

        return $query;
    }

    /**
     * Transform a specimen into a row representation for table/stream/export.
     */
    private function transformSpecimenRow(Specimen $specimen, string $term): array
    {
        $customer = $specimen->customerRelation;
        $report = $specimen->report;
        $type = $specimen->type;

        // Examination name resolution
        $examinationName = $specimen->specimenExaminations
            ->map(fn ($se) => $se->examination?->name)
            ->filter()
            ->unique()
            ->join(', ');

        if (empty($examinationName)) {
            $examinationName = $specimen->examination?->name ?? 'N/A';
        }

        // Pathologists names resolution
        $pathologistsName = $specimen->users && $specimen->users->isNotEmpty()
            ? $specimen->users->pluck('name')->join(', ')
            : 'Sin asignar';

        // Report date resolution
        $reportDate = $report?->report_date
            ? $report->report_date->format('d/m/Y')
            : ($report?->report_finalization_datetime
                ? $report->report_finalization_datetime->format('d/m/Y')
                : ($specimen->finalized_at
                    ? $specimen->finalized_at->format('d/m/Y')
                    : ($specimen->created_at ? $specimen->created_at->format('d/m/Y') : 'N/A')
                )
            );

        // Find match snippet & source field
        [$contextSnippet, $contextSnippetClean, $matchedField] = $this->extractContextSnippet($specimen, $term);

        return [
            'id' => $specimen->id,
            'sequence_code' => $specimen->sequence_code,
            'patient_name' => $customer?->name ?? 'N/A',
            'patient_id' => $customer?->id_number ?? 'N/A',
            'specimen_type' => $type?->name ?? 'N/A',
            'examination' => $examinationName,
            'keyword_context' => $contextSnippet,
            'keyword_context_clean' => $contextSnippetClean,
            'matched_field' => $matchedField,
            'report_date' => $reportDate,
            'pathologists' => $pathologistsName,
            'status' => $specimen->status,
            'status_label' => $specimen->status_label,
            'status_color' => $specimen->status_color,
            'has_report' => (bool) $report,
        ];
    }

    /**
     * Extract context snippet around the search term.
     */
    private function extractContextSnippet(Specimen $specimen, string $term): array
    {
        if (empty($term)) {
            // If no term, provide a general clinical excerpt
            $diagnosis = $specimen->report?->diagnosis_html
                ?: ($specimen->diagnosis ?: $specimen->clinical_notes);
            $clean = trim(preg_replace('/\s+/', ' ', strip_tags(html_entity_decode((string) $diagnosis, ENT_QUOTES | ENT_HTML5, 'UTF-8'))));
            $short = mb_substr($clean, 0, 100, 'UTF-8').(mb_strlen($clean) > 100 ? '...' : '');

            return [$short ?: 'Sin observaciones registradas', $short ?: 'Sin observaciones registradas', 'General'];
        }

        $report = $specimen->report;
        $fieldsToCheck = [
            ['content' => $report?->microscopy_html, 'field' => 'Microscopía'],
            ['content' => $report?->macroscopy_html, 'field' => 'Macroscopía'],
            ['content' => $report?->diagnosis_html, 'field' => 'Diagnóstico'],
            ['content' => $report?->comments_notes_html, 'field' => 'Comentarios'],
            ['content' => $report?->clinical_details_html, 'field' => 'Datos Clínicos'],
            ['content' => $report?->addendum_html, 'field' => 'Adenda'],
            ['content' => $report?->protocols_html, 'field' => 'Protocolos'],
            ['content' => $report?->legend_html, 'field' => 'Leyenda'],
            ['content' => $report?->open_text_html, 'field' => 'Texto Libre'],
            ['content' => $specimen->diagnosis, 'field' => 'Diagnóstico Muestra'],
            ['content' => $specimen->clinical_notes, 'field' => 'Notas Clínicas'],
            ['content' => $specimen->anatomic_site, 'field' => 'Sitio Anatómico'],
            ['content' => $specimen->customerRelation?->name, 'field' => 'Paciente'],
            ['content' => $specimen->customerRelation?->id_number, 'field' => 'ID / RTN'],
            ['content' => $specimen->sequence_code, 'field' => 'Código'],
        ];

        foreach ($fieldsToCheck as $check) {
            $raw = (string) $check['content'];
            if (empty($raw)) {
                continue;
            }

            $cleanText = html_entity_decode(strip_tags($raw), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $cleanText = trim(preg_replace('/\s+/', ' ', $cleanText));

            $pos = mb_stripos($cleanText, $term, 0, 'UTF-8');
            if ($pos !== false) {
                $radius = 50;
                $start = max(0, $pos - $radius);
                $length = mb_strlen($term, 'UTF-8') + ($radius * 2);
                $snippet = mb_substr($cleanText, $start, $length, 'UTF-8');

                $prefix = $start > 0 ? '... ' : '';
                $suffix = ($start + $length) < mb_strlen($cleanText, 'UTF-8') ? ' ...' : '';

                $cleanSnippet = $prefix.trim($snippet).$suffix;

                return [
                    $cleanSnippet,
                    $cleanSnippet,
                    $check['field'],
                ];
            }
        }

        // Fallback if not directly matched in stripped text (e.g. whitespace differences)
        return ['... '.$term.' ...', $term, 'Coincidencia'];
    }

    /**
     * Parse multi-select filter parameters into array of IDs.
     * Returns null if 'all' or not present.
     * Returns empty array if 'none' or empty.
     *
     * @return string[]|null
     */
    private function parseFilterIds(Request $request, string $key): ?array
    {
        if (! $request->has($key)) {
            return null;
        }

        $val = $request->get($key);
        if ($val === 'all') {
            return null;
        }

        if ($val === 'none') {
            return [];
        }

        if (! is_array($val)) {
            if (is_string($val) && str_contains($val, ',')) {
                $val = explode(',', $val);
            } else {
                $val = [$val];
            }
        }

        return array_values(array_filter(array_map('strval', $val), fn ($v) => $v !== '' && $v !== 'all' && $v !== 'none'));
    }

    /**
     * Get active users with pathologist or assistant pathologist role.
     */
    private function getPathologistsList()
    {
        $pathologistRoleId = Setting::where('setting_key', 'pathologist_role_id')->value('setting_value');
        $pathologistRoleIds = [];

        if ($pathologistRoleId) {
            $assistantRole = Role::where('slug', 'assistant_pathologist')->first();
            $pathologistRoleIds = array_filter([$pathologistRoleId, $assistantRole?->id]);
        } else {
            $pathologistRoleIds = Role::whereIn('slug', ['pathologist', 'assistant_pathologist'])->pluck('id')->toArray();
        }

        return User::where('active', true)
            ->when(! empty($pathologistRoleIds), fn ($q) => $q->whereIn('role_id', $pathologistRoleIds))
            ->orderBy('name', 'asc')
            ->get(['id', 'name']);
    }
}
