<?php

namespace App\Http\Controllers\Editor;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenReport;
use App\Models\SpecimenTypeTemplate;
use App\Models\User;
use App\Services\ImageOptimizerService;
use App\Services\ReportPaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        // 3. Map the room string parameters to your exact database schema columns
        $columnMap = [
            'macroscopy' => ['state' => 'yjs_macroscopy_state', 'html' => 'macroscopy_html'],
            'microscopy' => ['state' => 'yjs_microscopy_state', 'html' => 'microscopy_html'],
            'diagnosis' => ['state' => 'yjs_diagnosis_state',  'html' => 'diagnosis_html'],
            'report_date' => ['state' => 'yjs_report_date_state', 'html' => 'report_date'],
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
        ]);

        $pathologistRoleId = Setting::where('setting_key', 'pathologist_role_id')->value('setting_value');
        $pathologists = [];
        if ($pathologistRoleId) {
            $pathologists = User::where('active', true)->where('role_id', $pathologistRoleId)->get();
        }

        return Inertia::render('specimens/report-editor', [
            'specimen' => $specimen,
            'report' => $specimen->report,
            'auth' => [
                'user' => [
                    'name' => auth()->user()->name ?? 'Dr. Specialist',
                    'cursor_color' => '#'.substr(md5(rand()), 0, 6),
                ],
            ],
            'pathologists' => $pathologists,
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
            $template = SpecimenTypeTemplate::where('specimen_type_id', $specimen->specimen_type)->first();

            $report = SpecimenReport::create([
                'report_date' => now()->format('Y-m-d'),
                'macroscopy_html' => $template?->macroscopy_html ?? '',
                'microscopy_html' => $template?->microscopy_html ?? '',
                'diagnosis_html' => $template?->diagnosis_html ?? '',
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
            'yjs_macroscopy_state' => 'nullable|string',
            'yjs_microscopy_state' => 'nullable|string',
            'yjs_diagnosis_state' => 'nullable|string',
            'yjs_report_date_state' => 'nullable|string',
        ]);

        $specimen->load('report');
        if (! $specimen->report) {
            return response()->json(['error' => 'No hay reporte asociado a esta muestra.'], 404);
        }

        $updateData = [];

        if ($request->has('report_date')) {
            $reportDate = $request->input('report_date');
            if (! empty($reportDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $reportDate)) {
                $updateData['report_date'] = $reportDate;
            }
        }

        if ($request->has('macroscopy_html')) {
            $updateData['macroscopy_html'] = $request->input('macroscopy_html') ?? '';
        }
        if ($request->has('microscopy_html')) {
            $updateData['microscopy_html'] = $request->input('microscopy_html') ?? '';
        }
        if ($request->has('diagnosis_html')) {
            $updateData['diagnosis_html'] = $request->input('diagnosis_html') ?? '';
        }

        if ($request->filled('yjs_macroscopy_state')) {
            $updateData['yjs_macroscopy_state'] = base64_decode($request->input('yjs_macroscopy_state'));
        }
        if ($request->filled('yjs_microscopy_state')) {
            $updateData['yjs_microscopy_state'] = base64_decode($request->input('yjs_microscopy_state'));
        }
        if ($request->filled('yjs_diagnosis_state')) {
            $updateData['yjs_diagnosis_state'] = base64_decode($request->input('yjs_diagnosis_state'));
        }
        if ($request->filled('yjs_report_date_state')) {
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
        });

        return redirect()->back()->with('success', 'Estado de la muestra actualizado con éxito.');
    }

    /**
     * Generate and download PDF using Browsershot.
     */
    public function downloadPdf(Specimen $specimen)
    {
        $specimen->load(['customerRelation', 'type', 'examination', 'category', 'referrerRelation', 'report']);
        if (! $specimen->report) {
            abort(404, 'No hay reporte asociado a esta muestra.');
        }

        $customer = $specimen->customerRelation;
        $report = $specimen->report;
        $examination = $specimen->examination;
        $referrer = $specimen->referrerRelation;

        // Convert all local/remote images in editor contents to Base64 data URIs so Browsershot can render them.
        $report->diagnosis_html = $this->convertImagesToBase64($report->diagnosis_html);
        $report->macroscopy_html = $this->convertImagesToBase64($report->macroscopy_html);
        $report->microscopy_html = $this->convertImagesToBase64($report->microscopy_html);

        $isMicroscopyVisible = in_array($specimen->status, ['microscopic_review', 'finalized', 'delivered']);

        $pages = ReportPaginator::paginate($specimen, $report, $customer, $referrer, $isMicroscopyVisible);

        $htmlContent = view('pdf.report.body', compact('specimen', 'report', 'customer', 'examination', 'referrer', 'pages'))->render();

        $pdfContent = Browsershot::html($htmlContent)
            ->setIncludePath(env('BROWSERSHOT_INCLUDE_PATH', '$PATH:/usr/local/bin:/usr/bin'))
            ->addChromiumArguments([
                'disable-crash-reporter',
                'disable-dev-shm-usage',
                'no-sandbox',
            ])
            ->noSandbox()
            ->paperWidth('215.9mm')
            ->paperHeight('279.4mm')
            ->margins(0, 0, 0, 0)
            ->pdf();

        return response($pdfContent)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="reporte_'.$specimen->sequence_code.'.pdf"');
    }

    /**
     * Convert image src attributes in the given HTML to Base64 inline data URIs.
     */
    private function convertImagesToBase64($html)
    {
        if (empty($html)) {
            return $html;
        }

        return preg_replace_callback('/<img\s+([^>]*\s*)src=["\']([^"\']+)["\']([^>]*)/i', function ($matches) {
            $beforeSrc = $matches[1];
            $url = $matches[2];
            $afterSrc = $matches[3];

            // If it's already base64, don't convert again
            if (str_starts_with($url, 'data:image/')) {
                return $matches[0];
            }

            $base64 = $this->getImageBase64($url);
            if ($base64) {
                return '<img '.$beforeSrc.'src="'.$base64.'"'.$afterSrc;
            }

            return $matches[0];
        }, $html);
    }

    /**
     * Retrieve base64 encoded data URI of an image by local path mapping or URL request.
     */
    private function getImageBase64($url)
    {
        $path = parse_url($url, PHP_URL_PATH);
        if ($path) {
            // Check if it's a storage path (e.g. /storage/report-images/...)
            if (preg_match('/^\/storage\/(.+)$/', $path, $storageMatches)) {
                $relativePath = $storageMatches[1];
                $localPath = storage_path('app/public/'.$relativePath);
                if (file_exists($localPath)) {
                    $data = file_get_contents($localPath);
                    $mime = mime_content_type($localPath) ?: 'image/jpeg';

                    return 'data:'.$mime.';base64,'.base64_encode($data);
                }
            }

            // Fallback: check public directory
            $publicPath = public_path(ltrim($path, '/'));
            if (file_exists($publicPath)) {
                $data = file_get_contents($publicPath);
                $mime = mime_content_type($publicPath) ?: 'image/jpeg';

                return 'data:'.$mime.';base64,'.base64_encode($data);
            }
        }

        // External/Remote URL fallback
        try {
            $data = file_get_contents($url);
            if ($data !== false) {
                $mime = 'image/jpeg';
                $ext = pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION);
                if (in_array(strtolower($ext), ['png', 'gif', 'webp', 'svg'])) {
                    $mime = 'image/'.strtolower($ext);
                    if (strtolower($ext) === 'svg') {
                        $mime = 'image/svg+xml';
                    }
                }

                return 'data:'.$mime.';base64,'.base64_encode($data);
            }
        } catch (\Exception $e) {
            // Ignore/Log
        }

        return null;
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
}
