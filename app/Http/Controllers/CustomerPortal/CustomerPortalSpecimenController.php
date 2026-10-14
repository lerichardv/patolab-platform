<?php

namespace App\Http\Controllers\CustomerPortal;

use App\Http\Controllers\Controller;
use App\Models\Specimen;
use App\Models\SpecimenTypeState;
use App\Services\ReportPdfService;
use App\Services\SpecimenStatusService;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CustomerPortalSpecimenController extends Controller
{
    /**
     * Display a listing of accessible specimens for the authenticated customer.
     */
    public function index(Request $request): Response
    {
        $customer = $request->user('customer');

        $query = $customer->accessibleSpecimens()
            ->where('active', true)
            ->with([
                'customerRelation',
                'type',
                'examination',
                'specimenExaminations.examination',
                'category',
                'report',
            ]);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('sequence_code', 'like', "%{$search}%")
                    ->orWhereHas('customerRelation', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('id_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('received_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('received_at', '<=', $request->input('date_to'));
        }

        // Calculate quick summary metrics for the customer's portal
        $stats = [
            'total' => (clone $customer->accessibleSpecimens())->where('active', true)->count(),
            'in_progress' => (clone $customer->accessibleSpecimens())->where('active', true)->whereIn('status', ['received', 'macroscopic_review', 'processing', 'microscopic_review'])->count(),
            'finalized' => (clone $customer->accessibleSpecimens())->where('active', true)->whereIn('status', ['finalized', 'delivered'])->count(),
        ];

        $specimens = $query->latest('received_at')
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('customers/customer-portal/index', [
            'specimens' => $specimens,
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to']),
            'stats' => $stats,
        ]);
    }

    /**
     * Display the specified specimen details and status timeline.
     */
    public function show(Request $request, string $sequence_code): Response
    {
        $customer = $request->user('customer');

        $specimen = $customer->accessibleSpecimens()
            ->where('sequence_code', $sequence_code)
            ->where('active', true)
            ->with([
                'customerRelation',
                'type.activeStates',
                'examination',
                'specimenExaminations.examination',
                'category',
                'report',
            ])
            ->firstOrFail();

        $canDownloadReport = in_array($specimen->status, ['finalized', 'delivered']) && (bool) $specimen->report_id;

        $statusService = app(SpecimenStatusService::class);
        $availableStates = $statusService->getAvailableStatesForType($specimen->specimen_type);

        // Exclude cancelled from sequential timeline as it is a lateral terminal state
        $flowStates = $availableStates->filter(fn ($s) => ($s->status ?? $s['status']) !== 'cancelled')->values();

        $currentStatus = $specimen->status;
        $currentStepIndex = $flowStates->search(fn ($s) => ($s->status ?? $s['status']) === $currentStatus);

        $timelineSteps = $flowStates->map(function ($state, $index) use ($specimen, $currentStepIndex) {
            $key = $state->status ?? $state['status'];
            $meta = SpecimenTypeState::ALL_STATUSES[$key] ?? [
                'label' => ucfirst(str_replace('_', ' ', (string) $key)),
                'color' => '#3b82f6',
                'description' => '',
            ];

            $dateCol = Specimen::STATUS_DATE_COLUMNS[$key] ?? null;
            $date = ($dateCol && ! empty($specimen->{$dateCol}))
                ? $specimen->{$dateCol}->toIso8601String()
                : null;

            $isCompleted = false;
            $isCurrent = false;

            if ($specimen->status === 'delivered') {
                $isCompleted = true;
                $isCurrent = ($key === 'delivered');
            } elseif ($currentStepIndex !== false) {
                if ($index < $currentStepIndex) {
                    $isCompleted = true;
                } elseif ($index === $currentStepIndex) {
                    $isCurrent = true;
                }
            }

            return [
                'key' => $key,
                'step_number' => $index + 1,
                'label' => $meta['label'],
                'color' => $meta['color'],
                'description' => $meta['description'] ?? '',
                'date' => $date,
                'date_key' => $dateCol,
                'is_completed' => $isCompleted,
                'is_current' => $isCurrent,
            ];
        })->values()->all();

        $currentMeta = SpecimenTypeState::ALL_STATUSES[$currentStatus] ?? [
            'label' => ucfirst(str_replace('_', ' ', (string) $currentStatus)),
            'color' => '#64748b',
        ];

        $statusMeta = [
            'key' => $currentStatus,
            'label' => $currentMeta['label'],
            'color' => $currentMeta['color'],
            'is_cancelled' => $currentStatus === 'cancelled',
        ];

        return Inertia::render('customers/customer-portal/show', [
            'specimen' => $specimen,
            'can_download_report' => $canDownloadReport,
            'timeline_steps' => $timelineSteps,
            'status_meta' => $statusMeta,
        ]);
    }

    /**
     * Download the finalized diagnostic report PDF for the specimen.
     *
     * Enforces strict authorization: specimen must belong to the authenticated customer,
     * and status must be finalized or delivered.
     */
    public function downloadReport(Request $request, string $sequence_code): StreamedResponse|HttpResponse
    {
        $customer = $request->user('customer');

        $specimen = $customer->accessibleSpecimens()
            ->where('sequence_code', $sequence_code)
            ->where('active', true)
            ->with(['report', 'customerRelation', 'type', 'examination', 'category'])
            ->firstOrFail();

        if (! in_array($specimen->status, ['finalized', 'delivered'])) {
            abort(403, 'El reporte de este estudio aún no se encuentra finalizado.');
        }

        $report = $specimen->report;
        if (! $report) {
            abort(404, 'Reporte no disponible.');
        }

        if ($report->report_file && Storage::disk('public')->exists($report->report_file)) {
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
}
