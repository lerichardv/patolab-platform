<?php

namespace App\Http\Controllers\Editor;

use App\Http\Controllers\Controller;
use App\Models\CaiRange;
use App\Models\CuttingCode;
use App\Models\CuttingPrefix;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\InvoiceSpecimen;
use App\Models\Location;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Product;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Sequence;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenReport;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\SpecimenTypeTemplate;
use App\Models\User;
use App\Models\UserCommission;
use App\Models\UserCommissionRule;
use App\Models\WorkOrderTask;
use App\Models\WorkOrderType;
use App\Services\ImageOptimizerService;
use App\Services\ReportPdfService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Browsershot\Browsershot;

class ReportEditorController extends Controller
{
    /**
     * Handle incoming real-time lifecycle requests from the Hocuspocus Express server.
     */
    public function handleWebhook(Request $request)
    {
        $event = $request->input('event');
        $payload = $request->input('payload');
        $roomName = $payload['documentName'] ?? $payload['roomName'] ?? null; // Formatted as: "report-{id}-{field}"

        // 1. Extract the report ID and the target block editor field
        if (! $roomName || ! preg_match('/report-(\d+)-(.+)/', $roomName, $matches)) {
            return response()->json(['error' => 'Invalid room layout format'], 400);
        }

        $reportId = $matches[1];
        $field = $matches[2]; // Will match: 'macroscopy', 'microscopy', or 'diagnosis'

        // 2. Verify that the target report row actually exists
        $report = DB::table('specimen_reports')->where('id', $reportId)->first();
        if (! $report) {
            return response()->json(['error' => 'Specimen report row not found'], 404);
        }

        if ($field === 'sample_collection_date') {
            if ($event === 'onConnect') {
                return response()->json([
                    'document' => null,
                ]);
            }
            if ($event === 'create') {
                $specimen = DB::table('specimen')->where('report_id', $reportId)->first();

                return response()->json([
                    'content' => $specimen ? $specimen->sample_collection_date : '',
                ]);
            }
            if ($event === 'onChange') {
                $htmlValue = $payload['html'] ?? '';
                if (! empty($htmlValue) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $htmlValue)) {
                    DB::table('specimen')
                        ->where('report_id', $reportId)
                        ->update(['sample_collection_date' => $htmlValue, 'updated_at' => now()]);
                }

                return response()->json(['status' => 'success']);
            }

            return response()->json(['status' => 'ignored']);
        }

        if ($field === 'finalization_date') {
            if ($event === 'onConnect') {
                return response()->json([
                    'document' => null,
                ]);
            }
            if ($event === 'create') {
                return response()->json([
                    'content' => $report ? $report->finalization_date : '',
                ]);
            }
            if ($event === 'onChange') {
                $htmlValue = $payload['html'] ?? '';
                if (! empty($htmlValue) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $htmlValue)) {
                    DB::table('specimen_reports')
                        ->where('id', $reportId)
                        ->update(['finalization_date' => $htmlValue, 'updated_at' => now()]);
                }

                return response()->json(['status' => 'success']);
            }

            return response()->json(['status' => 'ignored']);
        }

        if ($field === 'status') {
            if ($event === 'onConnect') {
                return response()->json([
                    'document' => null,
                ]);
            }
            if ($event === 'create') {
                $specimen = DB::table('specimen')->where('report_id', $reportId)->first();

                return response()->json([
                    'content' => $specimen ? $specimen->status : '',
                ]);
            }
            if ($event === 'onChange') {
                return response()->json(['status' => 'success']);
            }

            return response()->json(['status' => 'ignored']);
        }

        if ($field === 'save-status') {
            if ($event === 'onConnect') {
                return response()->json([
                    'document' => null,
                ]);
            }
            if ($event === 'create') {
                return response()->json([
                    'content' => 'idle',
                ]);
            }
            if ($event === 'onChange') {
                return response()->json(['status' => 'success']);
            }

            return response()->json(['status' => 'ignored']);
        }

        if ($field === 'insumos') {
            if ($event === 'onConnect') {
                return response()->json([
                    'document' => null,
                ]);
            }
            if ($event === 'create') {
                return response()->json([
                    'content' => '',
                ]);
            }
            if ($event === 'onChange') {
                return response()->json(['status' => 'success']);
            }

            return response()->json(['status' => 'ignored']);
        }

        if ($field === 'sections_order') {
            if ($event === 'onConnect') {
                return response()->json([
                    'document' => null,
                ]);
            }
            if ($event === 'create') {
                $report = DB::table('specimen_reports')->where('id', $reportId)->first();

                return response()->json([
                    'content' => $report ? $report->sections_order : '[]',
                ]);
            }
            if ($event === 'onChange') {
                $htmlValue = $payload['html'] ?? '[]';
                DB::table('specimen_reports')
                    ->where('id', $reportId)
                    ->update([
                        'sections_order' => $htmlValue,
                        'updated_at' => now(),
                    ]);

                return response()->json(['status' => 'success']);
            }

            return response()->json(['status' => 'ignored']);
        }

        if ($field === 'open_text_label') {
            if ($event === 'onConnect') {
                return response()->json([
                    'document' => null,
                ]);
            }
            if ($event === 'create') {
                $report = DB::table('specimen_reports')->where('id', $reportId)->first();

                return response()->json([
                    'content' => $report ? $report->open_text_label : 'Texto Libre',
                ]);
            }
            if ($event === 'onChange') {
                $htmlValue = $payload['html'] ?? 'Texto Libre';
                if (preg_match('/^(Texto\s*Libre){2,}$/i', trim($htmlValue))) {
                    $htmlValue = 'Texto Libre';
                }
                DB::table('specimen_reports')
                    ->where('id', $reportId)
                    ->update([
                        'open_text_label' => $htmlValue,
                        'updated_at' => now(),
                    ]);

                return response()->json(['status' => 'success']);
            }

            return response()->json(['status' => 'ignored']);
        }

        if ($field === 'headings_toggles') {
            if ($event === 'onConnect') {
                return response()->json([
                    'document' => null,
                ]);
            }
            if ($event === 'create') {
                $report = DB::table('specimen_reports')->where('id', $reportId)->first();

                return response()->json([
                    'content' => $report ? $report->headings_toggles : '{}',
                ]);
            }
            if ($event === 'onChange') {
                $htmlValue = $payload['html'] ?? '{}';
                DB::table('specimen_reports')
                    ->where('id', $reportId)
                    ->update([
                        'headings_toggles' => $htmlValue,
                        'updated_at' => now(),
                    ]);

                return response()->json(['status' => 'success']);
            }

            return response()->json(['status' => 'ignored']);
        }

        // 3. Map the room string parameters to your exact database schema columns
        $columnMap = [
            'macroscopy' => ['state' => 'yjs_macroscopy_state', 'html' => 'macroscopy_html'],
            'microscopy' => ['state' => 'yjs_microscopy_state', 'html' => 'microscopy_html'],
            'diagnosis' => ['state' => 'yjs_diagnosis_state',  'html' => 'diagnosis_html'],
            'report_date' => ['state' => 'yjs_report_date_state', 'html' => 'report_date'],
            'clinical_details' => ['state' => 'yjs_clinical_details_state', 'html' => 'clinical_details_html'],
            'comments_notes' => ['state' => 'yjs_comments_notes_state', 'html' => 'comments_notes_html'],
            'protocols' => ['state' => 'yjs_protocols_state', 'html' => 'protocols_html'],
            'legend' => ['state' => 'yjs_legend_state', 'html' => 'legend_html'],
            'open_text' => ['state' => 'yjs_open_text_state', 'html' => 'open_text_html'],
            'addendum' => ['state' => 'yjs_addendum_state', 'html' => 'addendum_html'],
        ];

        if (! array_key_exists($field, $columnMap)) {
            return response()->json(['error' => 'Invalid structural report field'], 400);
        }

        $stateColumn = $columnMap[$field]['state'];
        $htmlColumn = $columnMap[$field]['html'];

        // SCENARIO A: User opens an editor workspace window (Initialization phase)
        if ($event === 'onConnect') {
            $htmlVal = $report->$htmlColumn ?? '';
            $cleanText = trim(strip_tags(str_replace(['&nbsp;', "\xc2\xa0"], ' ', $htmlVal)));
            $hasMediaOrTable = (bool) preg_match('/<img|<table/i', $htmlVal);

            // If the field is empty, purge any stale Yjs binary state and return null document
            if (empty($cleanText) && ! $hasMediaOrTable && $htmlColumn !== 'report_date') {
                if ($report->$stateColumn) {
                    DB::table('specimen_reports')
                        ->where('id', $reportId)
                        ->update([$stateColumn => null]);
                }

                return response()->json([
                    'document' => null,
                ]);
            }

            return response()->json([
                'document' => $report->$stateColumn ? $report->$stateColumn : null,
            ]);
        }

        // SCENARIO C: Document initialization/load (called when room is created on server)
        if ($event === 'create') {
            return response()->json([
                'content' => $report->$htmlColumn ?? '',
            ]);
        }

        // SCENARIO B: Typing pause threshold reached (Background automatic save process)
        if ($event === 'onChange') {
            $htmlValue = $payload['html'] ?? '';
            $cleanText = trim(strip_tags(str_replace(['&nbsp;', "\xc2\xa0"], ' ', $htmlValue)));
            $hasMediaOrTable = (bool) preg_match('/<img|<table/i', $htmlValue);

            $updateData = [
                'updated_at' => now(),
            ];

            if ($htmlColumn === 'report_date') {
                if (! empty($htmlValue) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $htmlValue)) {
                    $updateData[$htmlColumn] = $htmlValue;
                    $updateData[$stateColumn] = $payload['document'] ?? null;
                }
            } else {
                if (empty($cleanText) && ! $hasMediaOrTable) {
                    $updateData[$htmlColumn] = '';
                    $updateData[$stateColumn] = null; // Clear binary state so no ghost info persists
                } else {
                    $updateData[$htmlColumn] = $htmlValue;
                    $updateData[$stateColumn] = $payload['document'] ?? null;
                }
            }

            DB::table('specimen_reports')
                ->where('id', $reportId)
                ->update($updateData);

            return response()->json(['status' => 'success']);
        }

        return response()->json(['status' => 'ignored']);
    }

    /**
     * Render the unified multi-editor workspace view via Inertia.
     */
    public function show(Specimen $specimen)
    {
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
            'collaborators',
            'group.invoice.caiRange',
            'group.invoice.creditRelation',
            'group.invoice.transferBank',
            'group.invoice.invoiceSpecimens.examination',
            'group.specimens.examinations',
            'group.specimens.specimenExaminations.examination',
            'invoiceRelation.caiRange',
            'invoiceRelation.creditRelation',
            'invoiceRelation.transferBank',
            'invoiceRelation.invoiceSpecimens.examination',
            'products.prices',
            'cuttings.code',
            'cuttings.prefix',
            'cuttings.responsible',
            'workOrders.task',
            'workOrders.users',
        ]);

        $pathologistRoleId = Setting::where('setting_key', 'pathologist_role_id')->value('setting_value');
        $pathologists = [];
        if ($pathologistRoleId) {
            $assistantRole = Role::where('slug', 'assistant_pathologist')->first();
            $roleIds = array_filter([$pathologistRoleId, $assistantRole?->id]);
            $pathologists = User::where('active', true)->whereIn('role_id', $roleIds)->get();
        }

        $products = Product::where('active', true)
            ->whereHas('inventory', function ($q) {
                $q->where('active', true);
            })
            ->withSum(['inventory as total_stock' => function ($q) {
                $q->where('active', true);
            }], 'quantity')
            ->with('prices')
            ->get();

        $examinationIds = $specimen->examinations()->pluck('specimen_type_examination.id')->toArray();
        if ($specimen->specimen_type_examination && ! in_array($specimen->specimen_type_examination, $examinationIds)) {
            $examinationIds[] = $specimen->specimen_type_examination;
        }

        $templates = SpecimenTypeTemplate::where('specimen_type_id', $specimen->specimen_type)
            ->when(! empty($examinationIds), function ($query) use ($examinationIds) {
                $query->whereIn('specimen_type_examination_id', $examinationIds);
            })
            ->where(function ($query) {
                $query->where('user_id', auth()->id())
                    ->orWhereExists(function ($q) {
                        $q->select(DB::raw(1))
                            ->from('user_templates_permissions')
                            ->whereColumn('user_templates_permissions.template_id', 'specimen_type_templates.id')
                            ->where('user_templates_permissions.shared_with_id', auth()->id());
                    });
            })
            ->with(['user:id,name', 'specimenType:id,name', 'specimenTypeExamination:id,name'])
            ->get();

        $priorities = Priority::orderBy('order')->get();
        $specimenTypes = SpecimenType::where('active', true)->get();
        $examinations = SpecimenTypeExamination::where('active', true)->with('prices')->get();
        $categories = SpecimenCategory::where('active', true)->get();
        $referrers = Referrer::where('active', true)->get();
        $referrerTypes = ReferrerType::where('active', true)->get();
        $locations = Location::where('active', true)->get();

        $activeCai = CaiRange::where('status', 'active')->first();
        $activeLocationId = $activeCai ? $activeCai->location_id : null;
        $sequences = Sequence::where('active', true)->get()->map(function ($sequence) {
            $tempSequence = clone $sequence;
            $currentMonth = now()->format('m');
            $currentYear = now()->format('Y');
            do {
                $paddedSeq = str_pad($tempSequence->current_sequence, $tempSequence->fill ?? 4, '0', STR_PAD_LEFT);
                $paddedMonth = str_pad($currentMonth, 2, '0', STR_PAD_LEFT);
                $sequenceCode = $tempSequence->prefix.$tempSequence->separator.$paddedSeq.$tempSequence->separator.$paddedMonth.$tempSequence->separator.$currentYear;

                $exists = Specimen::where('sequence_code', $sequenceCode)->exists();
                if ($exists) {
                    $tempSequence->current_sequence++;
                }
            } while ($exists);
            $sequence->current_sequence = $tempSequence->current_sequence;

            return $sequence;
        });

        $usersList = User::where('active', true)->select('id', 'name')->get();
        $workOrderTypes = WorkOrderType::orderBy('name')->get();
        $workOrderTasks = WorkOrderTask::orderBy('name')->get();

        return Inertia::render('specimens/report-editor/report-editor', [
            'specimen' => $specimen,
            'report' => $specimen->report,
            'templates' => $templates,
            'auth' => [
                'user' => [
                    'id' => auth()->user()->id,
                    'name' => auth()->user()->name ?? 'Dr. Specialist',
                    'cursor_color' => '#'.substr(md5(rand()), 0, 6),
                    'role' => auth()->user()->role ? [
                        'slug' => auth()->user()->role->slug,
                        'name' => auth()->user()->role->name,
                    ] : null,
                ],
                'permissions' => auth()->user()->role ? (auth()->user()->role->slug === 'admin' ? Permission::pluck('slug')->toArray() : auth()->user()->role->permissions->pluck('slug')->toArray()) : [],
            ],
            'pathologists' => $pathologists,
            'products' => $products,
            'cutting_codes' => CuttingCode::orderByRaw('LENGTH(code) asc')->orderBy('code', 'asc')->get(),
            'cutting_prefixes' => CuttingPrefix::orderByRaw('LENGTH(prefix) asc')->orderBy('prefix', 'asc')->get(),
            'cutting_slide_types' => $workOrderTypes,
            'users' => $usersList,
            'usersList' => $usersList,
            'workOrderTypes' => $workOrderTypes,
            'workOrderTasks' => $workOrderTasks,
            'specimenTypes' => $specimenTypes,
            'examinations' => $examinations,
            'categories' => $categories,
            'referrers' => $referrers,
            'referrerTypes' => $referrerTypes,
            'priorities' => $priorities,
            'locations' => $locations,
            'sequences' => $sequences,
            'activeLocationId' => $activeLocationId,
        ]);
    }

    /**
     * Ensure a specimen has an associated report row, creating one if not present.
     */
    protected function ensureReport(Specimen $specimen): SpecimenReport
    {
        $specimen->load('report');
        if ($specimen->report) {
            return $specimen->report;
        }

        $report = SpecimenReport::create([
            'report_date' => now()->format('Y-m-d'),
            'finalization_date' => now()->format('Y-m-d'),
            'macroscopy_html' => '',
            'microscopy_html' => '',
            'diagnosis_html' => '',
            'clinical_details_html' => '',
            'comments_notes_html' => '',
            'protocols_html' => '',
            'legend_html' => '',
            'open_text_html' => '',
            'open_text_label' => 'Texto Libre',
            'addendum_html' => '',
            'sections_order' => null,
            'headings_toggles' => null,
        ]);

        $updateData = ['report_id' => $report->id];
        if (in_array($specimen->status, ['registered', 'received', 'pending'])) {
            $updateData['status'] = 'macroscopic_review';
        }

        $specimen->update($updateData);
        $specimen->setRelation('report', $report);

        return $report;
    }

    /**
     * Create a new specimen report row and update specimen state to macroscopic_review.
     */
    public function store(Request $request, Specimen $specimen)
    {
        $this->authorizeSpecimenAccess($specimen);

        if ($specimen->report_id) {
            if (! $request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'Esta muestra ya tiene un reporte creado.',
                    'report' => $specimen->report,
                ]);
            }

            return redirect()->back()->with('error', 'Esta muestra ya tiene un reporte creado.');
        }

        $examinationIds = $specimen->examinations()->pluck('specimen_type_examination.id')->toArray();
        if ($specimen->specimen_type_examination && ! in_array($specimen->specimen_type_examination, $examinationIds)) {
            $examinationIds[] = $specimen->specimen_type_examination;
        }

        $templatesExist = SpecimenTypeTemplate::where('specimen_type_id', $specimen->specimen_type)
            ->when(! empty($examinationIds), function ($query) use ($examinationIds) {
                $query->whereIn('specimen_type_examination_id', $examinationIds);
            })
            ->where(function ($query) {
                $query->where('user_id', auth()->id())
                    ->orWhereExists(function ($q) {
                        $q->select(DB::raw(1))
                            ->from('user_templates_permissions')
                            ->whereColumn('user_templates_permissions.template_id', 'specimen_type_templates.id')
                            ->where('user_templates_permissions.shared_with_id', auth()->id());
                    });
            })
            ->exists();

        $request->validate([
            'template_id' => 'nullable',
            'template_ids' => 'nullable|array',
            'template_ids.*' => 'exists:specimen_type_templates,id',
        ]);

        $orderedIds = [];
        if ($request->filled('template_ids') && is_array($request->template_ids)) {
            $orderedIds = array_values(array_filter($request->template_ids));
        } elseif ($request->filled('template_id')) {
            $orderedIds = [$request->template_id];
        }

        if ($templatesExist && empty($orderedIds)) {
            throw ValidationException::withMessages([
                'template_ids' => ['Debe seleccionar al menos una plantilla para continuar.'],
            ]);
        }

        $createdReport = null;

        DB::transaction(function () use ($specimen, $orderedIds, $examinationIds, &$createdReport) {
            $orderedTemplates = collect();
            if (! empty($orderedIds)) {
                $fetched = SpecimenTypeTemplate::whereIn('id', $orderedIds)
                    ->where('specimen_type_id', $specimen->specimen_type)
                    ->when(! empty($examinationIds), function ($query) use ($examinationIds) {
                        $query->whereIn('specimen_type_examination_id', $examinationIds);
                    })
                    ->where(function ($query) {
                        $query->where('user_id', auth()->id())
                            ->orWhereExists(function ($q) {
                                $q->select(DB::raw(1))
                                    ->from('user_templates_permissions')
                                    ->whereColumn('user_templates_permissions.template_id', 'specimen_type_templates.id')
                                    ->where('user_templates_permissions.shared_with_id', auth()->id());
                            });
                    })
                    ->get()
                    ->keyBy('id');

                foreach ($orderedIds as $tId) {
                    if (isset($fetched[$tId])) {
                        $orderedTemplates->push($fetched[$tId]);
                    }
                }

                if ($orderedTemplates->isEmpty() && ! empty($orderedIds)) {
                    throw ValidationException::withMessages([
                        'template_ids' => ['Las plantillas seleccionadas no son válidas o no tienes permisos para usarlas.'],
                    ]);
                }
            }

            $concatHtml = function ($templates, $field) {
                $parts = [];
                foreach ($templates as $t) {
                    $content = trim($t->{$field} ?? '');
                    if ($content !== '' && $content !== '<p></p>' && $content !== '<p></p><p></p>') {
                        $parts[] = $content;
                    }
                }

                return implode('', $parts);
            };

            $firstTemplate = $orderedTemplates->first();

            $report = SpecimenReport::create([
                'report_date' => now()->format('Y-m-d'),
                'finalization_date' => now()->format('Y-m-d'),
                'macroscopy_html' => $concatHtml($orderedTemplates, 'macroscopy_html'),
                'microscopy_html' => $concatHtml($orderedTemplates, 'microscopy_html'),
                'diagnosis_html' => $concatHtml($orderedTemplates, 'diagnosis_html'),
                'clinical_details_html' => $concatHtml($orderedTemplates, 'clinical_details_html'),
                'comments_notes_html' => $concatHtml($orderedTemplates, 'comments_notes_html'),
                'protocols_html' => $concatHtml($orderedTemplates, 'protocols_html'),
                'legend_html' => $concatHtml($orderedTemplates, 'legend_html'),
                'open_text_html' => $concatHtml($orderedTemplates, 'open_text_html'),
                'open_text_label' => $firstTemplate?->open_text_label ?? 'Texto Libre',
                'addendum_html' => $concatHtml($orderedTemplates, 'addendum_html'),
                'sections_order' => $firstTemplate?->sections_order ?? null,
                'headings_toggles' => $firstTemplate?->headings_toggles ?? null,
            ]);

            $specimen->update([
                'report_id' => $report->id,
                'status' => 'macroscopic_review',
            ]);

            $createdReport = $report;
        });

        if (! $request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
            return response()->json([
                'status' => 'success',
                'message' => 'Reporte creado y estado de muestra actualizado a revisión macroscópica.',
                'report' => $createdReport ?? $specimen->report,
            ]);
        }

        return redirect()->back()->with('success', 'Reporte creado y estado de muestra actualizado a revisión macroscópica.');
    }

    /**
     * Update the report date.
     */
    public function updateDate(Request $request, Specimen $specimen)
    {
        $this->authorizeSpecimenAccess($specimen);

        $request->validate([
            'report_date' => 'required|date',
        ]);

        [$hasMacroAccess, $hasMicroAccess] = $this->getUserAccess($specimen);

        if (! $hasMacroAccess && ! $hasMicroAccess) {
            return redirect()->back()->with('error', 'No tienes permisos de edición para esta muestra.');
        }

        $report = $this->ensureReport($specimen);

        $report->update([
            'report_date' => $request->report_date,
        ]);

        return redirect()->back()->with('success', 'Fecha del reporte actualizada.');
    }

    /**
     * Apply a template to an existing report.
     */
    public function applyTemplate(Request $request, Specimen $specimen)
    {
        $this->authorizeSpecimenAccess($specimen);

        $request->validate([
            'template_id' => 'nullable|exists:specimen_type_templates,id',
            'template_ids' => 'nullable|array',
            'template_ids.*' => 'exists:specimen_type_templates,id',
        ]);

        $this->ensureReport($specimen);

        // When report is finalized, changing templates is forbidden.
        if (in_array($specimen->status, ['finalized', 'delivered'])) {
            return response()->json(['error' => 'No se puede cambiar la plantilla de un reporte finalizado.'], 403);
        }

        [$hasMacroAccess, $hasMicroAccess] = $this->getUserAccess($specimen);

        if (! $hasMacroAccess && ! $hasMicroAccess) {
            return response()->json(['error' => 'No tienes permisos de edición para esta muestra.'], 403);
        }

        $examinationIds = $specimen->examinations()->pluck('specimen_type_examination.id')->toArray();
        if ($specimen->specimen_type_examination && ! in_array($specimen->specimen_type_examination, $examinationIds)) {
            $examinationIds[] = $specimen->specimen_type_examination;
        }

        $orderedIds = [];
        if ($request->filled('template_ids') && is_array($request->template_ids)) {
            $orderedIds = array_values(array_filter($request->template_ids));
        } elseif ($request->filled('template_id')) {
            $orderedIds = [$request->template_id];
        }

        if (empty($orderedIds)) {
            return response()->json(['error' => 'Debe seleccionar al menos una plantilla.'], 422);
        }

        $fetched = SpecimenTypeTemplate::whereIn('id', $orderedIds)
            ->where('specimen_type_id', $specimen->specimen_type)
            ->when(! empty($examinationIds), function ($query) use ($examinationIds) {
                $query->whereIn('specimen_type_examination_id', $examinationIds);
            })
            ->where(function ($query) {
                $query->where('user_id', auth()->id())
                    ->orWhereExists(function ($q) {
                        $q->select(DB::raw(1))
                            ->from('user_templates_permissions')
                            ->whereColumn('user_templates_permissions.template_id', 'specimen_type_templates.id')
                            ->where('user_templates_permissions.shared_with_id', auth()->id());
                    });
            })
            ->get()
            ->keyBy('id');

        $orderedTemplates = collect();
        foreach ($orderedIds as $tId) {
            if (isset($fetched[$tId])) {
                $orderedTemplates->push($fetched[$tId]);
            }
        }

        if ($orderedTemplates->isEmpty()) {
            return response()->json(['error' => 'Las plantillas seleccionadas no son válidas o no tienes permisos para usarlas.'], 422);
        }

        $cleanTemplateHtml = function (string $html): string {
            if (empty($html)) {
                return '';
            }

            // Strip Office comments & XML namespaces
            $clean = preg_replace('/<!--[\s\S]*?-->/i', '', $html);
            $clean = preg_replace('/<\/?(o|w|m|v|xml):[^>]*>/i', '', $clean);
            $clean = preg_replace('/<style[\s\S]*?<\/style>/i', '', $clean);
            $clean = preg_replace('/<script[\s\S]*?<\/script>/i', '', $clean);

            $textOnly = trim(strip_tags(str_replace(['&nbsp;', "\xc2\xa0"], ' ', $clean)));
            $hasMediaOrTable = (bool) preg_match('/<img|<table/i', $clean);

            if (empty($textOnly) && ! $hasMediaOrTable) {
                return '';
            }

            return trim($clean);
        };

        $concatHtml = function ($templates, $field) use ($cleanTemplateHtml) {
            $parts = [];
            foreach ($templates as $t) {
                $content = $cleanTemplateHtml($t->{$field} ?? '');
                if (! empty($content)) {
                    $parts[] = $content;
                }
            }

            return implode('', $parts);
        };

        $firstTemplate = $orderedTemplates->first();

        $mergedTemplate = (object) [
            'id' => $firstTemplate->id,
            'name' => $orderedTemplates->pluck('name')->implode(', '),
            'user' => $firstTemplate->user,
            'macroscopy_html' => $concatHtml($orderedTemplates, 'macroscopy_html'),
            'microscopy_html' => $concatHtml($orderedTemplates, 'microscopy_html'),
            'diagnosis_html' => $concatHtml($orderedTemplates, 'diagnosis_html'),
            'clinical_details_html' => $concatHtml($orderedTemplates, 'clinical_details_html'),
            'comments_notes_html' => $concatHtml($orderedTemplates, 'comments_notes_html'),
            'protocols_html' => $concatHtml($orderedTemplates, 'protocols_html'),
            'legend_html' => $concatHtml($orderedTemplates, 'legend_html'),
            'open_text_html' => $concatHtml($orderedTemplates, 'open_text_html'),
            'open_text_label' => $firstTemplate->open_text_label ?? 'Texto Libre',
            'addendum_html' => $concatHtml($orderedTemplates, 'addendum_html'),
            'sections_order' => $firstTemplate->sections_order ?? null,
            'headings_toggles' => $firstTemplate->headings_toggles ?? null,
        ];

        // Update database report columns
        $specimen->report->update([
            'macroscopy_html' => $mergedTemplate->macroscopy_html,
            'microscopy_html' => $mergedTemplate->microscopy_html,
            'diagnosis_html' => $mergedTemplate->diagnosis_html,
            'clinical_details_html' => $mergedTemplate->clinical_details_html,
            'comments_notes_html' => $mergedTemplate->comments_notes_html,
            'protocols_html' => $mergedTemplate->protocols_html,
            'legend_html' => $mergedTemplate->legend_html,
            'open_text_html' => $mergedTemplate->open_text_html,
            'open_text_label' => $mergedTemplate->open_text_label,
            'addendum_html' => $mergedTemplate->addendum_html,
            'sections_order' => $mergedTemplate->sections_order,
            'headings_toggles' => $mergedTemplate->headings_toggles,
        ]);

        DB::table('specimen_reports')->where('id', $specimen->report->id)->update([
            'yjs_macroscopy_state' => null,
            'yjs_microscopy_state' => null,
            'yjs_diagnosis_state' => null,
            'yjs_report_date_state' => null,
            'yjs_clinical_details_state' => null,
            'yjs_comments_notes_state' => null,
            'yjs_protocols_state' => null,
            'yjs_legend_state' => null,
            'yjs_open_text_state' => null,
            'yjs_addendum_state' => null,
        ]);

        if (in_array($specimen->status, ['finalized', 'delivered'])) {
            $specimen->report->ensureValidationQrCode();
            app(ReportPdfService::class)->generateAndStoreReport($specimen);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Plantilla aplicada y guardada con éxito.',
            'template' => $mergedTemplate,
            'templates' => $orderedTemplates,
        ]);
    }

    /**
     * Save/Update the entire report content manually.
     */
    public function save(Request $request, Specimen $specimen)
    {
        $this->authorizeSpecimenAccess($specimen);

        $request->validate([
            'report_date' => 'nullable|string',
            'sample_collection_date' => 'nullable|string',
            'sample_collection_date_na' => 'nullable|boolean',
            'finalization_date' => 'nullable|string',
            'auto_finalization_date' => 'nullable|boolean',
            'macroscopy_html' => 'nullable|string',
            'microscopy_html' => 'nullable|string',
            'diagnosis_html' => 'nullable|string',
            'clinical_details_html' => 'nullable|string',
            'comments_notes_html' => 'nullable|string',
            'protocols_html' => 'nullable|string',
            'legend_html' => 'nullable|string',
            'open_text_html' => 'nullable|string',
            'open_text_label' => 'nullable|string|max:255',
            'addendum_html' => 'nullable|string',
            'sections_order' => 'nullable|array',
            'sections_order.*.key' => 'required|string',
            'sections_order.*.order' => 'required|integer',
            'sections_order.*.active' => 'required|boolean',
            'headings_toggles' => 'nullable|array',
            'headings_toggles.*' => 'boolean',
        ]);

        $report = $this->ensureReport($specimen);

        [$hasMacroAccess, $hasMicroAccess] = $this->getUserAccess($specimen);

        if (! $hasMacroAccess && ! $hasMicroAccess) {
            return response()->json(['error' => 'No tienes permisos de edición para esta muestra.'], 403);
        }

        $hasGeneralAccess = $hasMacroAccess || $hasMicroAccess;
        $updateData = [];

        if ($request->has('report_date')) {
            $reportDate = $request->input('report_date');
            if (! empty($reportDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $reportDate)) {
                $updateData['report_date'] = $reportDate;
            }
        }

        if ($request->has('sample_collection_date')) {
            $sampleCollectionDate = $request->input('sample_collection_date');
            if (! empty($sampleCollectionDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $sampleCollectionDate)) {
                $specimen->update(['sample_collection_date' => $sampleCollectionDate]);
            }
        }

        if ($request->has('sample_collection_date_na')) {
            $specimen->update(['sample_collection_date_na' => $request->boolean('sample_collection_date_na')]);
        }

        if ($request->has('finalization_date')) {
            $finalizationDate = $request->input('finalization_date');
            if (! empty($finalizationDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $finalizationDate)) {
                $updateData['finalization_date'] = $finalizationDate;
            }
        }

        if ($request->has('auto_finalization_date')) {
            $updateData['auto_finalization_date'] = $request->boolean('auto_finalization_date');
        }

        if ($request->has('macroscopy_html') && $hasMacroAccess) {
            $updateData['macroscopy_html'] = $request->input('macroscopy_html') ?? '';
        }
        if ($request->has('microscopy_html') && $hasMicroAccess) {
            $updateData['microscopy_html'] = $request->input('microscopy_html') ?? '';
        }
        if ($request->has('diagnosis_html') && $hasGeneralAccess) {
            $updateData['diagnosis_html'] = $request->input('diagnosis_html') ?? '';
        }
        if ($request->has('clinical_details_html') && $hasGeneralAccess) {
            $updateData['clinical_details_html'] = $request->input('clinical_details_html') ?? '';
        }
        if ($request->has('comments_notes_html') && $hasGeneralAccess) {
            $updateData['comments_notes_html'] = $request->input('comments_notes_html') ?? '';
        }
        if ($request->has('protocols_html') && $hasGeneralAccess) {
            $updateData['protocols_html'] = $request->input('protocols_html') ?? '';
        }
        if ($request->has('legend_html') && $hasGeneralAccess) {
            $updateData['legend_html'] = $request->input('legend_html') ?? '';
        }
        if ($request->has('open_text_html') && $hasGeneralAccess) {
            $updateData['open_text_html'] = $request->input('open_text_html') ?? '';
        }
        if ($request->has('open_text_label') && $hasGeneralAccess) {
            $rawLabel = $request->input('open_text_label') ?? '';
            if (preg_match('/^(Texto\s*Libre){2,}$/i', trim($rawLabel))) {
                $rawLabel = 'Texto Libre';
            }
            $updateData['open_text_label'] = $rawLabel;
        }
        if ($request->has('addendum_html') && $hasGeneralAccess) {
            $updateData['addendum_html'] = $request->input('addendum_html') ?? '';
        }
        if ($request->has('sections_order') && $hasGeneralAccess) {
            $updateData['sections_order'] = $request->input('sections_order');
        }
        if ($request->has('headings_toggles') && $hasGeneralAccess) {
            $updateData['headings_toggles'] = $request->input('headings_toggles');
        }

        if (! empty($updateData)) {
            $report->update($updateData);
        }

        if (in_array($specimen->status, ['finalized', 'delivered'])) {
            $report->ensureValidationQrCode();
            app(ReportPdfService::class)->generateAndStoreReport($specimen);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Reporte guardado con éxito.',
            'report' => $report->fresh(),
        ]);
    }

    /**
     * Transition the specimen state and update timestamps.
     */
    public function transitionState(Request $request, Specimen $specimen)
    {
        $this->authorizeSpecimenAccess($specimen);

        $request->validate([
            'status' => 'required|string|in:macroscopic_review,processing,microscopic_review,finalized',
        ]);

        $report = $this->ensureReport($specimen);

        $status = $request->status;

        if ($status === 'finalized') {
            if (! $request->user()?->can('specimens.finalize')) {
                return redirect()->back()->withErrors([
                    'error' => 'No tienes permiso para finalizar el reporte de esta muestra.',
                ]);
            }

            $unsignedUsers = $specimen->users()->where(function ($q) {
                $q->whereNull('user_signature')->orWhere('user_signature', '');
            })->get();

            if ($unsignedUsers->isNotEmpty()) {
                $names = $unsignedUsers->pluck('name')->implode(', ');

                return redirect()->back()->withErrors([
                    'error' => "No se puede finalizar el reporte porque los siguientes patólogos no han definido su firma: {$names}.",
                ]);
            }
        }

        $reportData = [];

        if ($status === 'processing') {
            $reportData['macroscopy_finalization_datetime'] = now();
        } elseif ($status === 'microscopic_review') {
            $reportData['microscopy_finalization_datetime'] = now();
        } elseif ($status === 'finalized') {
            $reportData['report_finalization_datetime'] = now();
            if ($report->auto_finalization_date || empty($report->finalization_date)) {
                $reportData['finalization_date'] = now()->format('Y-m-d');
            }
            $reportData['auto_finalization_date'] = false;
        }

        DB::transaction(function () use ($specimen, $report, $status, $reportData) {
            if (! empty($reportData)) {
                $report->update($reportData);
            }
            $specimen->update([
                'status' => $status,
            ]);

            if ($status === 'finalized') {
                $report->ensureValidationQrCode();

                app(ReportPdfService::class)->generateAndStoreReport($specimen);

                $this->calculateCommissions($specimen);

                // Enviar notificación de WhatsApp al paciente
                try {
                    $customer = $specimen->customerRelation;
                    if ($customer) {
                        $link = route('specimens.show-public', [
                            'specimen_code' => $specimen->sequence_code,
                            'token' => $specimen->access_token,
                            'delivery_token' => $specimen->delivery_token,
                        ]);
                        $patientName = $customer->name;
                        $message = "Hola, {$patientName}. El reporte de su muestra con código {$specimen->sequence_code} ha sido finalizado. Puede ver el progreso y descargar su reporte en el siguiente enlace: {$link}";

                        $phone = $customer->phone;
                        $cleanPhone = preg_replace('/\D/', '', $phone);
                        if (strlen($cleanPhone) === 8) {
                            $cleanPhone = '504'.$cleanPhone;
                        }

                        // All messages will be sent to +504 3366-6885 while testing
                        if (config('app.env') !== 'production') {
                            $cleanPhone = '50433666885';
                        }

                        if (! empty($cleanPhone)) {
                            $whatsapp = app(WhatsAppService::class);
                            $whatsapp->sendText($cleanPhone, $message);
                        }

                        Log::info('WhatsApp de finalización de reporte enviado: '.$message);
                    }
                } catch (\Exception $e) {
                    Log::error('Error enviando notificación de WhatsApp de finalización: '.$e->getMessage());
                }
            }
        });

        return redirect()->back()->with('success', 'Estado de la muestra actualizado con éxito.');
    }

    /**
     * Calculate and store pathologist commissions when the report is finalized.
     */
    protected function calculateCommissions(Specimen $specimen)
    {
        // 1. Get all assigned pathologists
        $assignedUsers = $specimen->users()->withPivot(['macroscopy_access', 'microscopy_access'])->get();

        // 2. Filter pathologists with macroscopy access
        $macroUsers = $assignedUsers->filter(function ($user) {
            return (bool) $user->pivot->macroscopy_access;
        });

        // 3. Filter pathologists with microscopy access
        $microUsers = $assignedUsers->filter(function ($user) {
            return (bool) $user->pivot->microscopy_access;
        });

        // 4. Calculate base amount for the specimen
        $baseAmount = 0.00;
        if ($specimen->is_group || ! empty($specimen->group_id)) {
            $groupSpecimen = InvoiceSpecimen::where('specimen_id', $specimen->id)->first();
            if ($groupSpecimen) {
                $baseAmount = (float) $groupSpecimen->total;
            }
        } else {
            $invoice = $specimen->invoiceRelation;
            if ($invoice) {
                $baseAmount = (float) $invoice->total;
            }
        }

        // 5. Macroscopy commission: for all pathologists with macroscopy access
        foreach ($macroUsers as $macroUser) {
            $rule = UserCommissionRule::where('user_id', $macroUser->id)
                ->where('specimen_type_id', $specimen->specimen_type)
                ->where('specimen_type_examination_id', $specimen->specimen_type_examination)
                ->first();

            if ($rule && $rule->macroscopy_commission_enabled) {
                $commissionAmount = 0.00;
                if ($rule->macroscopy_calculation_type === 'fixed') {
                    $commissionAmount = (float) $rule->macroscopy_commission_value;
                } elseif ($rule->macroscopy_calculation_type === 'percentage') {
                    $commissionAmount = ($baseAmount * (float) $rule->macroscopy_commission_value) / 100.00;
                }

                UserCommission::updateOrCreate(
                    [
                        'user_id' => $macroUser->id,
                        'specimen_id' => $specimen->id,
                        'phase' => 'macroscopy',
                    ],
                    [
                        'user_commission_rule_id' => $rule->id,
                        'specimen_base_amount' => $baseAmount,
                        'calculated_comission_amount' => $commissionAmount,
                        'user_commission_rule_applied' => $rule->toArray(),
                        'created_by' => auth()->id() ?? $macroUser->id,
                        'updated_by' => auth()->id(),
                    ]
                );
            }
        }

        // 6. Microscopy commission: for all pathologists with microscopy access
        $microCount = $microUsers->count();
        foreach ($microUsers as $microUser) {
            $rule = UserCommissionRule::where('user_id', $microUser->id)
                ->where('specimen_type_id', $specimen->specimen_type)
                ->where('specimen_type_examination_id', $specimen->specimen_type_examination)
                ->first();

            if ($rule && $rule->microscopy_commission_enabled) {
                $commissionAmount = 0.00;
                if ($rule->microscopy_calculation_type === 'fixed') {
                    $commissionAmount = (float) $rule->microscopy_commission_value;
                } elseif ($rule->microscopy_calculation_type === 'percentage') {
                    $commissionAmount = ($baseAmount * (float) $rule->microscopy_commission_value) / 100.00;
                }

                if ($microCount > 1) {
                    $commissionAmount = $commissionAmount / $microCount;
                }

                UserCommission::updateOrCreate(
                    [
                        'user_id' => $microUser->id,
                        'specimen_id' => $specimen->id,
                        'phase' => 'microscopy',
                    ],
                    [
                        'user_commission_rule_id' => $rule->id,
                        'specimen_base_amount' => $baseAmount,
                        'calculated_comission_amount' => $commissionAmount,
                        'user_commission_rule_applied' => $rule->toArray(),
                        'created_by' => auth()->id() ?? $microUser->id,
                        'updated_by' => auth()->id(),
                    ]
                );
            }
        }
    }

    /**
     * Generate a temporary PDF file for report editor preview.
     */
    public function generateTempPdf(Specimen $specimen)
    {
        $this->authorizeSpecimenAccess($specimen);

        [$hasMacroAccess, $hasMicroAccess] = $this->getUserAccess($specimen);

        if (! $hasMacroAccess && ! $hasMicroAccess) {
            return response()->json(['error' => 'No tienes permisos de edición para esta muestra.'], 403);
        }

        $this->ensureReport($specimen);

        // Generate the PDF and return computed pages
        $pages = [];
        $pdfContent = app(ReportPdfService::class)->generatePdfContent($specimen, $pages);

        // Delete any existing temp files for this specimen to keep storage clean
        Storage::disk('public')->deleteDirectory("temp_reports/{$specimen->sequence_code}");

        // Save new temp PDF file
        $tempPath = "temp_reports/{$specimen->sequence_code}/report_".time().'.pdf';
        Storage::disk('public')->put($tempPath, $pdfContent);

        return response()->json([
            'url' => Storage::disk('public')->url($tempPath),
            'total_pages' => count($pages),
        ]);
    }

    /**
     * Generate and download PDF using Browsershot or directly from storage.
     */
    public function downloadPdf(Specimen $specimen)
    {
        $this->authorizeSpecimenAccess($specimen);

        $report = $this->ensureReport($specimen);

        $isFinalized = in_array($specimen->status, ['finalized', 'delivered']);

        if ($isFinalized && $report->report_file && Storage::disk('public')->exists($report->report_file)) {
            return Storage::disk('public')->download(
                $report->report_file,
                "reporte_{$specimen->sequence_code}.pdf"
            );
        }

        $pdfContent = app(ReportPdfService::class)->generatePdfContent($specimen);

        return response($pdfContent)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="reporte_'.$specimen->sequence_code.'.pdf"');
    }

    /**
     * Upload and optimize an image for use inside the report editor.
     * Stores the result under public/report-images/{sequence_code}/.
     */
    public function uploadImage(Request $request, Specimen $specimen)
    {
        $this->authorizeSpecimenAccess($specimen);

        $request->validate([
            'image' => 'required|image|max:10240', // 10 MB max
        ]);

        $optimizer = app(ImageOptimizerService::class);
        $path = $optimizer->optimizeAndStore(
            $request->file('image'),
            'report-images/'.$specimen->sequence_code,
            'public'
        );

        return response()->json([
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /**
     * Update the list of insumos (products) for the specimen.
     */
    public function updateProducts(Request $request, Specimen $specimen)
    {
        $this->authorizeSpecimenAccess($specimen);

        $request->validate([
            'insumos' => 'nullable|array',
            'insumos.*.id' => 'required|exists:products,id',
            'insumos.*.quantity' => 'required|integer|min:1',
            'insumos.*.price' => 'required|numeric|min:0',
        ]);

        [$hasMacroAccess, $hasMicroAccess] = $this->getUserAccess($specimen);

        if (! $hasMacroAccess && ! $hasMicroAccess) {
            return redirect()->back()->with('error', 'No tienes permisos de edición para esta muestra.');
        }

        try {
            DB::transaction(function () use ($request, $specimen) {
                // 1. Get current products on this specimen
                $oldInsumos = $specimen->products()->withPivot(['quantity', 'price'])->get()->keyBy('id');
                $newInsumos = collect($request->input('insumos', []))->keyBy('id');

                // 2. Identify and restore stock for deleted/decreased insumos
                foreach ($oldInsumos as $id => $oldInsumo) {
                    $oldQty = $oldInsumo->pivot->quantity;
                    if (! $newInsumos->has($id)) {
                        $this->restoreStock($oldInsumo, $oldQty);
                    } else {
                        $newQty = $newInsumos->get($id)['quantity'];
                        if ($newQty < $oldQty) {
                            $this->restoreStock($oldInsumo, $oldQty - $newQty);
                        }
                    }
                }

                // 3. Identify and deduct stock for added/increased insumos
                foreach ($newInsumos as $id => $newInsumo) {
                    $newQty = $newInsumo['quantity'];
                    $oldQty = $oldInsumos->has($id) ? $oldInsumos->get($id)->pivot->quantity : 0;

                    if ($newQty > $oldQty) {
                        $diff = $newQty - $oldQty;
                        $this->deductStock($id, $diff);
                    }
                }

                // 4. Sync the specimen products relationship in DB
                $syncData = [];
                foreach ($newInsumos as $id => $insumo) {
                    $syncData[$id] = [
                        'quantity' => $insumo['quantity'],
                        'price' => $insumo['price'],
                    ];
                }
                $specimen->products()->sync($syncData);
            });

            // Notify Express server to refresh insumos
            try {
                $serverUrl = env('COLLABORATION_SERVER_URL', 'http://127.0.0.1:1234');
                Http::timeout(2)->post($serverUrl.'/api/refresh-insumos', [
                    'reportId' => $specimen->report_id,
                ]);
            } catch (\Exception $e) {
                Log::warning('Could not notify collaboration server to refresh insumos: '.$e->getMessage());
            }
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        return redirect()->back()->with('success', 'Insumos actualizados con éxito.');
    }

    /**
     * Restore stock for a product when removed/decreased.
     */
    private function restoreStock($product, $qty)
    {
        $inventory = Inventory::where('product', $product->id)
            ->where('active', true)
            ->orderBy('id', 'asc')
            ->first();

        if ($inventory) {
            $before = $inventory->quantity;
            $inventory->quantity += $qty;
            $inventory->save();

            InventoryMovement::create([
                'inventory_name' => $product->name,
                'inventory' => $inventory->id,
                'storage_name' => $inventory->storageRelation->name ?? 'Bodega Principal',
                'storage' => $inventory->storage,
                'quantity_added' => $qty,
                'quantity_before_update' => $before,
                'quantity_after_update' => $inventory->quantity,
                'movement' => 'added',
                'user_id' => auth()->id() ?? 1,
            ]);
        }
    }

    /**
     * Deduct stock for a product when added/increased.
     */
    private function deductStock($productId, $qty)
    {
        $remaining = $qty;
        $inventories = Inventory::where('product', $productId)
            ->where('active', true)
            ->where('quantity', '>', 0)
            ->orderBy('id', 'asc')
            ->get();

        $totalAvailableStock = $inventories->sum('quantity');

        if ($totalAvailableStock < $remaining) {
            $product = Product::find($productId);
            throw new \Exception('Stock insuficiente para el insumo: '.($product ? $product->name : 'ID '.$productId).". Requerido: {$remaining}, Disponible: {$totalAvailableStock}.");
        }

        foreach ($inventories as $inv) {
            if ($remaining <= 0) {
                break;
            }

            $before = $inv->quantity;
            if ($inv->quantity >= $remaining) {
                $inv->quantity -= $remaining;
                $inv->save();

                $this->logInventoryMovement($inv, -$remaining, $before, $inv->quantity);
                $remaining = 0;
            } else {
                $subtracted = $inv->quantity;
                $remaining -= $subtracted;
                $inv->quantity = 0;
                $inv->save();

                $this->logInventoryMovement($inv, -$subtracted, $before, 0);
            }
        }
    }

    /**
     * Log inventory movement.
     */
    private function logInventoryMovement(Inventory $inventory, $quantityAdded, $before, $after)
    {
        InventoryMovement::create([
            'inventory_name' => $inventory->productRelation->name,
            'inventory' => $inventory->id,
            'storage_name' => $inventory->storageRelation->name ?? 'Bodega Principal',
            'storage' => $inventory->storage,
            'quantity_added' => $quantityAdded,
            'quantity_before_update' => $before,
            'quantity_after_update' => $after,
            'movement' => 'removed',
            'user_id' => auth()->id() ?? 1,
        ]);
    }

    /**
     * Get available templates for a specimen type and examination.
     */
    public function getAvailableTemplates(Request $request)
    {
        $request->validate([
            'specimen_type_id' => 'required|exists:specimen_type,id',
            'specimen_type_examination_id' => 'required|exists:specimen_type_examination,id',
        ]);

        $specimenTypeId = $request->specimen_type_id;
        $examinationId = $request->specimen_type_examination_id;
        $userId = auth()->id();

        $templates = SpecimenTypeTemplate::where('specimen_type_id', $specimenTypeId)
            ->where('specimen_type_examination_id', $examinationId)
            ->where(function ($query) use ($userId) {
                $query->where('user_id', $userId)
                    ->orWhereExists(function ($q) use ($userId) {
                        $q->select(DB::raw(1))
                            ->from('user_templates_permissions')
                            ->whereColumn('user_templates_permissions.template_id', 'specimen_type_templates.id')
                            ->where('user_templates_permissions.shared_with_id', $userId);
                    });
            })
            ->with(['user:id,name', 'specimenType:id,name', 'specimenTypeExamination:id,name'])
            ->get();

        return response()->json($templates);
    }

    /**
     * Check if the authenticated user has permission to finalize specimens.
     */
    public function canFinalize(Request $request): JsonResponse
    {
        return response()->json([
            'can_finalize' => $request->user()?->can('specimens.finalize') ?? false,
        ]);
    }

    /**
     * Helper to get user access (macro/micro) either as a pathologist or collaborator.
     */
    private function getUserAccess(Specimen $specimen)
    {
        $userId = auth()->id();

        $assignment = DB::table('specimen_user')
            ->where('specimen_id', $specimen->id)
            ->where('user_id', $userId)
            ->first();

        $collaborator = DB::table('specimen_collaborators')
            ->where('specimen_id', $specimen->id)
            ->where('user_id', $userId)
            ->first();

        $hasMacroAccess = ($assignment ? (bool) $assignment->macroscopy_access : false)
            || ($collaborator ? (bool) $collaborator->macroscopy_access : false);

        $hasMicroAccess = ($assignment ? (bool) $assignment->microscopy_access : false)
            || ($collaborator ? (bool) $collaborator->microscopy_access : false);

        return [$hasMacroAccess, $hasMicroAccess];
    }

    /**
     * Authorize that the current authenticated user is assigned to the specimen (either as a pathologist or collaborator).
     */
    private function authorizeSpecimenAccess(Specimen $specimen): void
    {
        $userId = auth()->id();

        $isAssigned = DB::table('specimen_user')
            ->where('specimen_id', $specimen->id)
            ->where('user_id', $userId)
            ->exists()
            || DB::table('specimen_collaborators')
                ->where('specimen_id', $specimen->id)
                ->where('user_id', $userId)
                ->exists();

        if (! $isAssigned) {
            abort(403, 'No estás asignado a esta muestra y no puedes acceder al editor de reportes.');
        }
    }
}
