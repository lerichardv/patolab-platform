<?php

namespace App\Http\Controllers\Editor;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\InvoiceGroupSpecimen;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenReport;
use App\Models\SpecimenTypeTemplate;
use App\Models\User;
use App\Models\UserCommission;
use App\Models\UserCommissionRule;
use App\Services\ImageOptimizerService;
use App\Services\ReportPdfService;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
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
        ];

        if (! array_key_exists($field, $columnMap)) {
            return response()->json(['error' => 'Invalid structural report field'], 400);
        }

        $stateColumn = $columnMap[$field]['state'];
        $htmlColumn = $columnMap[$field]['html'];

        // SCENARIO A: User opens an editor workspace window (Initialization phase)
        if ($event === 'onConnect') {
            $clientToken = $payload['requestParameters']['token'] ?? null;

            // Optional: Implement permission checks here using $clientToken
            // if (!$clientToken || !secureCheck($clientToken)) return response()->json(['error' => 'Forbidden'], 403);

            return response()->json([
                // Read binary block timeline data and hand it off safely encoded
                'document' => $report->$stateColumn ? base64_encode($report->$stateColumn) : null,
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
            $updateData = [
                $stateColumn => base64_decode($payload['document']), // Save raw binary vector history
                'updated_at' => now(),
            ];

            $htmlValue = $payload['html'] ?? '';

            if ($htmlColumn === 'report_date') {
                if (! empty($htmlValue) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $htmlValue)) {
                    $updateData[$htmlColumn] = $htmlValue;
                }
            } else {
                $updateData[$htmlColumn] = $htmlValue;
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
            'category',
            'referrerRelation',
            'report',
            'users.role',
            'group.invoice.caiRange',
            'group.invoice.creditRelation',
            'group.invoice.transferBank',
            'invoiceRelation.caiRange',
            'invoiceRelation.creditRelation',
            'invoiceRelation.transferBank',
            'products.prices',
        ]);

        $pathologistRoleId = Setting::where('setting_key', 'pathologist_role_id')->value('setting_value');
        $pathologists = [];
        if ($pathologistRoleId) {
            $pathologists = User::where('active', true)->where('role_id', $pathologistRoleId)->get();
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

        return Inertia::render('specimens/report-editor', [
            'specimen' => $specimen,
            'report' => $specimen->report,
            'auth' => [
                'user' => [
                    'id' => auth()->user()->id,
                    'name' => auth()->user()->name ?? 'Dr. Specialist',
                    'cursor_color' => '#'.substr(md5(rand()), 0, 6),
                ],
            ],
            'pathologists' => $pathologists,
            'products' => $products,
        ]);
    }

    /**
     * Create a new specimen report row and update specimen state to macroscopic_review.
     */
    public function store(Specimen $specimen)
    {
        if ($specimen->report_id) {
            return redirect()->back()->with('error', 'Esta muestra ya tiene un reporte creado.');
        }

        DB::transaction(function () use ($specimen) {
            $template = SpecimenTypeTemplate::where('user_id', auth()->id())
                ->where('specimen_type_id', $specimen->specimen_type)
                ->where('specimen_type_examination_id', $specimen->specimen_type_examination)
                ->first();

            if (! $template) {
                $template = SpecimenTypeTemplate::where('user_id', auth()->id())
                    ->where('specimen_type_id', $specimen->specimen_type)
                    ->first();
            }

            if (! $template) {
                $template = SpecimenTypeTemplate::where('specimen_type_id', $specimen->specimen_type)
                    ->where('specimen_type_examination_id', $specimen->specimen_type_examination)
                    ->first();
            }

            if (! $template) {
                $template = SpecimenTypeTemplate::where('specimen_type_id', $specimen->specimen_type)->first();
            }

            $report = SpecimenReport::create([
                'report_date' => now()->format('Y-m-d'),
                'macroscopy_html' => $template?->macroscopy_html ?? '',
                'microscopy_html' => $template?->microscopy_html ?? '',
                'diagnosis_html' => $template?->diagnosis_html ?? '',
                'clinical_details_html' => $template?->clinical_details_html ?? '',
                'comments_notes_html' => $template?->comments_notes_html ?? '',
                'protocols_html' => $template?->protocols_html ?? '',
                'legend_html' => $template?->legend_html ?? '',
                'sections_order' => $template?->sections_order ?? null,
            ]);

            $specimen->update([
                'report_id' => $report->id,
                'status' => 'macroscopic_review',
            ]);
        });

        return redirect()->back()->with('success', 'Reporte creado y estado de muestra actualizado a revisión macroscópica.');
    }

    /**
     * Update the report date.
     */
    public function updateDate(Request $request, Specimen $specimen)
    {
        $request->validate([
            'report_date' => 'required|date',
        ]);

        $assignment = DB::table('specimen_user')
            ->where('specimen_id', $specimen->id)
            ->where('user_id', auth()->id())
            ->first();

        $hasMacroAccess = $assignment ? (bool) $assignment->macroscopy_access : false;
        $hasMicroAccess = $assignment ? (bool) $assignment->microscopy_access : false;

        if (! $hasMacroAccess && ! $hasMicroAccess) {
            return redirect()->back()->with('error', 'No tienes permisos de edición para esta muestra.');
        }

        $specimen->load('report');
        if (! $specimen->report) {
            return redirect()->back()->with('error', 'No hay reporte asociado a esta muestra.');
        }

        $specimen->report->update([
            'report_date' => $request->report_date,
        ]);

        return redirect()->back()->with('success', 'Fecha del reporte actualizada.');
    }

    /**
     * Save/Update the entire report content manually.
     */
    public function save(Request $request, Specimen $specimen)
    {
        $request->validate([
            'report_date' => 'nullable|string',
            'macroscopy_html' => 'nullable|string',
            'microscopy_html' => 'nullable|string',
            'diagnosis_html' => 'nullable|string',
            'clinical_details_html' => 'nullable|string',
            'comments_notes_html' => 'nullable|string',
            'protocols_html' => 'nullable|string',
            'legend_html' => 'nullable|string',
            'yjs_macroscopy_state' => 'nullable|string',
            'yjs_microscopy_state' => 'nullable|string',
            'yjs_diagnosis_state' => 'nullable|string',
            'yjs_report_date_state' => 'nullable|string',
            'yjs_clinical_details_state' => 'nullable|string',
            'yjs_comments_notes_state' => 'nullable|string',
            'yjs_protocols_state' => 'nullable|string',
            'yjs_legend_state' => 'nullable|string',
            'sections_order' => 'nullable|array',
            'sections_order.*.key' => 'required|string',
            'sections_order.*.order' => 'required|integer',
            'sections_order.*.active' => 'required|boolean',
        ]);

        $specimen->load('report');
        if (! $specimen->report) {
            return response()->json(['error' => 'No hay reporte asociado a esta muestra.'], 404);
        }

        $assignment = DB::table('specimen_user')
            ->where('specimen_id', $specimen->id)
            ->where('user_id', auth()->id())
            ->first();

        $hasMacroAccess = $assignment ? (bool) $assignment->macroscopy_access : false;
        $hasMicroAccess = $assignment ? (bool) $assignment->microscopy_access : false;

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
        if ($request->has('sections_order') && $hasGeneralAccess) {
            $updateData['sections_order'] = $request->input('sections_order');
        }

        if ($request->filled('yjs_macroscopy_state') && $hasMacroAccess) {
            $updateData['yjs_macroscopy_state'] = base64_decode($request->input('yjs_macroscopy_state'));
        }
        if ($request->filled('yjs_microscopy_state') && $hasMicroAccess) {
            $updateData['yjs_microscopy_state'] = base64_decode($request->input('yjs_microscopy_state'));
        }
        if ($request->filled('yjs_diagnosis_state') && $hasGeneralAccess) {
            $updateData['yjs_diagnosis_state'] = base64_decode($request->input('yjs_diagnosis_state'));
        }
        if ($request->filled('yjs_clinical_details_state') && $hasGeneralAccess) {
            $updateData['yjs_clinical_details_state'] = base64_decode($request->input('yjs_clinical_details_state'));
        }
        if ($request->filled('yjs_comments_notes_state') && $hasGeneralAccess) {
            $updateData['yjs_comments_notes_state'] = base64_decode($request->input('yjs_comments_notes_state'));
        }
        if ($request->filled('yjs_protocols_state') && $hasGeneralAccess) {
            $updateData['yjs_protocols_state'] = base64_decode($request->input('yjs_protocols_state'));
        }
        if ($request->filled('yjs_legend_state') && $hasGeneralAccess) {
            $updateData['yjs_legend_state'] = base64_decode($request->input('yjs_legend_state'));
        }
        if ($request->filled('yjs_report_date_state') && $hasGeneralAccess) {
            $updateData['yjs_report_date_state'] = base64_decode($request->input('yjs_report_date_state'));
        }

        if (! empty($updateData)) {
            $specimen->report->update($updateData);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Reporte guardado con éxito.',
            'report' => $specimen->report,
        ]);
    }

    /**
     * Transition the specimen state and update timestamps.
     */
    public function transitionState(Request $request, Specimen $specimen)
    {
        $request->validate([
            'status' => 'required|string|in:macroscopic_review,processing,microscopic_review,finalized',
        ]);

        $specimen->load('report');
        if (! $specimen->report) {
            return redirect()->back()->with('error', 'No hay reporte asociado a esta muestra.');
        }

        $status = $request->status;

        if ($status === 'finalized') {
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
        }

        DB::transaction(function () use ($specimen, $status, $reportData) {
            if (! empty($reportData)) {
                $specimen->report->update($reportData);
            }
            $specimen->update([
                'status' => $status,
            ]);

            if ($status === 'finalized') {
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
            $groupSpecimen = InvoiceGroupSpecimen::where('specimen_id', $specimen->id)->first();
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
        $assignment = DB::table('specimen_user')
            ->where('specimen_id', $specimen->id)
            ->where('user_id', auth()->id())
            ->first();

        $hasMacroAccess = $assignment ? (bool) $assignment->macroscopy_access : false;
        $hasMicroAccess = $assignment ? (bool) $assignment->microscopy_access : false;

        if (! $hasMacroAccess && ! $hasMicroAccess) {
            return response()->json(['error' => 'No tienes permisos de edición para esta muestra.'], 403);
        }

        $specimen->load('report');
        if (! $specimen->report) {
            return response()->json(['error' => 'No hay reporte asociado a esta muestra.'], 404);
        }

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
        $specimen->load('report');
        if (! $specimen->report) {
            abort(404, 'No hay reporte asociado a esta muestra.');
        }

        if ($specimen->report->report_file && Storage::disk('public')->exists($specimen->report->report_file)) {
            return Storage::disk('public')->download(
                $specimen->report->report_file,
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
        $request->validate([
            'insumos' => 'nullable|array',
            'insumos.*.id' => 'required|exists:products,id',
            'insumos.*.quantity' => 'required|integer|min:1',
            'insumos.*.price' => 'required|numeric|min:0',
        ]);

        $assignment = DB::table('specimen_user')
            ->where('specimen_id', $specimen->id)
            ->where('user_id', auth()->id())
            ->first();

        $hasMacroAccess = $assignment ? (bool) $assignment->macroscopy_access : false;
        $hasMicroAccess = $assignment ? (bool) $assignment->microscopy_access : false;

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
}
