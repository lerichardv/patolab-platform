<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\PathologistExaminationDuration;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Services\WorkloadPressureCalculator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SpecimenBalanceController extends Controller
{
    /**
     * Display the specimens balance board matrix.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('specimens_balance.view');

        // 1. Fetch active, non-finalized specimens
        $query = Specimen::query()
            ->where('specimen.active', true)
            ->whereNotIn('specimen.status', ['finalized', 'delivered', 'cancelled'])
            ->with([
                'customerRelation:id,name,id_number',
                'type:id,name,requires_report',
                'examination:id,name,color,specimen_type',
                'examinations:id,name,color,specimen_type',
                'category:id,name,unit,quantity,intern_unit,intern_quantity',
                'users:users.id,name,email',
                'priority:id,name,color',
                'group:id,name',
            ]);

        // Filter: Specimen Type
        $specimenTypeId = $request->get('specimen_type_id');
        if ($specimenTypeId === 'all' || $specimenTypeId === null || $specimenTypeId === '') {
            $specimenTypeIds = null;
        } elseif ($specimenTypeId === 'none' || (is_array($specimenTypeId) && empty($specimenTypeId))) {
            $specimenTypeIds = [];
        } else {
            $specimenTypeIds = is_array($specimenTypeId) ? array_map('strval', $specimenTypeId) : [strval($specimenTypeId)];
        }

        if ($specimenTypeIds !== null) {
            if (empty($specimenTypeIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('specimen.specimen_type', $specimenTypeIds);
            }
        }

        // Filter: Examination
        $examinationId = $request->get('examination_id');
        if ($examinationId === 'all' || $examinationId === null || $examinationId === '') {
            $examinationIds = null;
        } elseif ($examinationId === 'none' || (is_array($examinationId) && empty($examinationId))) {
            $examinationIds = [];
        } else {
            $examinationIds = is_array($examinationId) ? array_map('strval', $examinationId) : [strval($examinationId)];
        }

        if ($examinationIds !== null) {
            if (empty($examinationIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->where(function ($q) use ($examinationIds) {
                    $q->whereIn('specimen.specimen_type_examination', $examinationIds)
                        ->orWhereHas('examinations', fn ($eq) => $eq->whereIn('specimen_type_examination.id', $examinationIds));
                });
            }
        }

        // Filter: Category
        if ($request->filled('category_id') && $request->get('category_id') !== 'all') {
            $query->where('specimen.specimen_category', $request->get('category_id'));
        }

        // Filter: Pathologist
        if ($request->filled('pathologist_id') && $request->get('pathologist_id') !== 'all') {
            $pathologistId = $request->get('pathologist_id');
            if ($pathologistId === 'unassigned') {
                $query->doesntHave('users');
            } else {
                $query->whereHas('users', fn ($uq) => $uq->where('users.id', $pathologistId));
            }
        }

        // Filter: Search query (code or patient name)
        if ($request->filled('search')) {
            $search = trim((string) $request->get('search'));
            $query->where(function ($q) use ($search) {
                $q->where('specimen.sequence_code', 'like', "%{$search}%")
                    ->orWhereHas('customerRelation', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        $specimens = $query->get();

        // 2. Resolve Pathologists (User with pathologist / assistant_pathologist role)
        $pathologistRoleId = Setting::where('setting_key', 'pathologist_role_id')->value('setting_value');
        if ($pathologistRoleId) {
            $assistantRole = Role::where('slug', 'assistant_pathologist')->first();
            $pathologistRoleIds = array_filter([(int) $pathologistRoleId, $assistantRole?->id]);
        } else {
            $pathologistRoleIds = Role::whereIn('slug', ['pathologist', 'assistant_pathologist'])->pluck('id')->toArray();
        }

        $pathologists = User::where('active', true)
            ->when(! empty($pathologistRoleIds), fn ($q) => $q->whereIn('role_id', $pathologistRoleIds))
            ->orderBy('name', 'asc')
            ->get(['id', 'name', 'email']);

        // 3. Durations map [ user_id => [ exam_id => duration_minutes ] ]
        $allUserIds = $pathologists->pluck('id')->toArray();
        $durationsMap = WorkloadPressureCalculator::getDurationsMap($allUserIds);

        // 4. Resolve internal & client expiration dates and find date boundaries
        $todayStr = Carbon::today()->format('Y-m-d');
        $minDateStr = $todayStr;
        $maxDateStr = Carbon::today()->addDays(7)->format('Y-m-d');

        $specimensProcessed = [];

        foreach ($specimens as $specimen) {
            $internalDate = $specimen->expected_internal_finalization_date?->format('Y-m-d')
                ?? Carbon::parse($specimen->created_at)->format('Y-m-d');
            $clientDate = $specimen->expected_finalization_date?->format('Y-m-d')
                ?? Carbon::parse($specimen->created_at)->format('Y-m-d');

            if ($internalDate < $minDateStr) {
                $minDateStr = $internalDate;
            }
            if ($internalDate > $maxDateStr) {
                $maxDateStr = $internalDate;
            }

            // Primary examination color fallback
            $color = '#3b82f6';
            if ($specimen->examinations->isNotEmpty() && $specimen->examinations->first()->color) {
                $color = $specimen->examinations->first()->color;
            } elseif ($specimen->examination && $specimen->examination->color) {
                $color = $specimen->examination->color;
            }

            $durationMinutes = 30;
            if ($specimen->examinations->isNotEmpty()) {
                $durationMinutes = $specimen->examinations->count() * 30;
            }
            $points = max(1, (int) round($durationMinutes / 15));

            $specimensProcessed[] = [
                'id' => $specimen->id,
                'sequence_code' => $specimen->sequence_code,
                'status' => $specimen->status,
                'status_label' => $specimen->status_label,
                'status_color' => $specimen->status_color,
                'customer_name' => $specimen->customerRelation?->name ?? 'N/A',
                'type_id' => $specimen->specimen_type,
                'type_name' => $specimen->type?->name ?? 'N/A',
                'requires_report' => $specimen->type?->requires_report ?? true,
                'examination_name' => $specimen->examinations->isNotEmpty()
                    ? $specimen->examinations->pluck('name')->join(', ')
                    : ($specimen->examination?->name ?? 'N/A'),
                'examination_color' => $color,
                'category_name' => $specimen->category?->name,
                'priority_id' => $specimen->priority_id,
                'priority_name' => $specimen->priority?->name ?? 'Normal',
                'priority_color' => $specimen->priority?->color ?? '#3b82f6',
                'duration_minutes' => $durationMinutes,
                'points' => $points,
                'internal_date' => $internalDate,
                'client_date' => $clientDate,
                'is_manual_internal' => (bool) $specimen->is_manual_delivery_date_intern_enabled,
                'is_manual_client' => (bool) $specimen->is_manual_delivery_date_enabled,
                'assigned_user_ids' => $specimen->users->pluck('id')->toArray(),
                'assigned_users' => $specimen->users->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])->toArray(),
                'group_id' => $specimen->group_id,
                'group_name' => $specimen->group?->name,
                'created_at' => $specimen->created_at?->toISOString(),
            ];
        }

        // 5. Generate continuous day-by-day date list
        $calendarDays = [];
        $cursor = Carbon::parse($minDateStr)->startOfDay();
        $end = Carbon::parse($maxDateStr)->startOfDay();

        $spanishDays = [
            0 => 'Dom',
            1 => 'Lun',
            2 => 'Mar',
            3 => 'Mié',
            4 => 'Jue',
            5 => 'Vie',
            6 => 'Sáb',
        ];

        $spanishMonths = [
            1 => 'Ene', 2 => 'Feb', 3 => 'Mar', 4 => 'Abr',
            5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Ago',
            9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dic',
        ];

        while ($cursor->lte($end)) {
            $dateStr = $cursor->format('Y-m-d');
            $calendarDays[] = [
                'date' => $dateStr,
                'day_name' => $spanishDays[$cursor->dayOfWeek],
                'day_number' => $cursor->format('d'),
                'month_name' => $spanishMonths[$cursor->month],
                'formatted' => "{$cursor->format('d')} {$spanishMonths[$cursor->month]}",
                'is_today' => $dateStr === $todayStr,
                'is_past' => $dateStr < $todayStr,
                'is_weekend' => $cursor->isWeekend(),
            ];
            $cursor->addDay();
        }

        // 6. Group specimens by row and calculate daily workload
        // Row "unassigned" (user_id = 'unassigned')
        $unassignedSpecimens = collect($specimensProcessed)->filter(fn ($s) => empty($s['assigned_user_ids']))->values();
        $unassignedByDate = $unassignedSpecimens->groupBy('internal_date')->toArray();

        // Pathologist rows
        $pathologistRows = [];
        foreach ($pathologists as $pathologist) {
            $pId = $pathologist->id;
            $pSpecimens = collect($specimensProcessed)->filter(fn ($s) => in_array($pId, $s['assigned_user_ids']))->values();

            $dailyData = [];
            foreach ($calendarDays as $day) {
                $dateStr = $day['date'];
                $daySpecs = $pSpecimens->where('internal_date', $dateStr)->values();

                // Calculate workload pressure
                $workload = WorkloadPressureCalculator::calculateDailyWorkload(
                    $specimens->whereIn('id', $daySpecs->pluck('id')),
                    $pId,
                    $durationsMap
                );

                $dailyData[$dateStr] = [
                    'specimens' => $daySpecs->toArray(),
                    'workload' => $workload,
                ];
            }

            // Overall workload summary
            $totalMinutes = 0;
            foreach ($dailyData as $d) {
                $totalMinutes += $d['workload']['total_minutes'];
            }
            $totalHours = round($totalMinutes / 60, 1);

            $overallColor = 'green';
            if ($totalHours > 8.0) {
                $overallColor = 'red';
            } elseif ($totalHours >= 6.0) {
                $overallColor = 'yellow';
            }

            $pathologistRows[] = [
                'user' => [
                    'id' => $pathologist->id,
                    'name' => $pathologist->name,
                    'email' => $pathologist->email,
                ],
                'total_specimens' => $pSpecimens->count(),
                'total_hours' => $totalHours,
                'overall_color' => $overallColor,
                'days' => $dailyData,
            ];
        }

        // 7. Calculate Summary Cards Data
        $totalSpecimensCount = count($specimensProcessed);
        $unassignedCount = $unassignedSpecimens->count();
        $assignedCount = $totalSpecimensCount - $unassignedCount;
        $assignedPercentage = $totalSpecimensCount > 0 ? (int) round(($assignedCount / $totalSpecimensCount) * 100) : 0;

        $palette = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6', '#f97316'];
        $pathologistDistribution = [];
        foreach ($pathologists as $idx => $pathologist) {
            $pCount = collect($specimensProcessed)->filter(fn ($s) => in_array($pathologist->id, $s['assigned_user_ids']))->count();
            $color = $palette[$idx % count($palette)];
            $percentage = $assignedCount > 0 ? (int) round(($pCount / $assignedCount) * 100) : 0;

            $pathologistDistribution[] = [
                'id' => $pathologist->id,
                'name' => $pathologist->name,
                'count' => $pCount,
                'color' => $color,
                'percentage' => $percentage,
            ];
        }

        $unassignedPreview = $unassignedSpecimens->take(5)->map(fn ($s) => [
            'id' => $s['id'],
            'sequence_code' => $s['sequence_code'],
            'customer_name' => $s['customer_name'],
            'examination_name' => $s['examination_name'],
            'examination_color' => $s['examination_color'],
            'priority_name' => $s['priority_name'],
            'priority_color' => $s['priority_color'],
            'points' => $s['points'],
            'internal_date' => $s['internal_date'],
        ])->values()->toArray();

        $todayCarbon = Carbon::today()->startOfDay();
        $expiredCollection = collect($specimensProcessed)
            ->filter(fn ($s) => $s['internal_date'] < $todayStr)
            ->sortBy('internal_date')
            ->values();
        $expiredCount = $expiredCollection->count();

        $expiredPreview = $expiredCollection->take(5)->map(function ($s) use ($todayCarbon) {
            $daysOverdue = Carbon::parse($s['internal_date'])->startOfDay()->diffInDays($todayCarbon, false);
            $label = $daysOverdue === 0 ? 'Vence hoy' : ($daysOverdue === 1 ? 'Venció ayer' : "Venció hace {$daysOverdue} d");

            return [
                'id' => $s['id'],
                'sequence_code' => $s['sequence_code'],
                'customer_name' => $s['customer_name'],
                'examination_name' => $s['examination_name'],
                'examination_color' => $s['examination_color'],
                'priority_name' => $s['priority_name'],
                'priority_color' => $s['priority_color'],
                'internal_date' => $s['internal_date'],
                'overdue_label' => $label,
                'days_overdue' => (int) $daysOverdue,
            ];
        })->values()->toArray();

        $summary = [
            'total_specimens' => $totalSpecimensCount,
            'assigned_count' => $assignedCount,
            'unassigned_count' => $unassignedCount,
            'assigned_percentage' => $assignedPercentage,
            'pathologists_distribution' => $pathologistDistribution,
            'unassigned_preview' => $unassignedPreview,
            'expired_count' => $expiredCount,
            'expired_preview' => $expiredPreview,
        ];

        // 8. Filter options
        $specimenTypes = SpecimenType::where('active', true)->orderBy('name')->get(['id', 'name']);
        $examinations = SpecimenTypeExamination::where('active', true)
            ->with('type:id,name')
            ->orderBy('specimen_type')
            ->orderBy('name')
            ->get(['id', 'name', 'color', 'specimen_type']);
        $categories = SpecimenCategory::where('active', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('specimens-balance/index', [
            'calendarDays' => $calendarDays,
            'today' => $todayStr,
            'unassignedRow' => [
                'total_specimens' => $unassignedSpecimens->count(),
                'days' => $unassignedByDate,
            ],
            'pathologistRows' => $pathologistRows,
            'pathologists' => $pathologists,
            'durationsMap' => $durationsMap,
            'summary' => $summary,
            'filterOptions' => [
                'specimenTypes' => $specimenTypes,
                'examinations' => $examinations,
                'categories' => $categories,
            ],
            'filters' => [
                'specimen_type_id' => $specimenTypeIds === null ? 'all' : (empty($specimenTypeIds) ? 'none' : $specimenTypeIds),
                'examination_id' => $examinationIds === null ? 'all' : (empty($examinationIds) ? 'none' : $examinationIds),
                'category_id' => $request->get('category_id'),
                'pathologist_id' => $request->get('pathologist_id'),
                'search' => $request->get('search'),
            ],
        ]);
    }

    /**
     * Get full list of unassigned specimens for the slide-over sheet.
     */
    public function unassignedList(Request $request): JsonResponse
    {
        Gate::authorize('specimens_balance.view');

        $query = Specimen::query()
            ->where('specimen.active', true)
            ->whereNotIn('specimen.status', ['finalized', 'delivered', 'cancelled'])
            ->doesntHave('users')
            ->with([
                'customerRelation:id,name,id_number',
                'type:id,name',
                'examination:id,name,color,specimen_type',
                'examinations:id,name,color,specimen_type',
                'category:id,name',
                'priority:id,name,color',
            ]);

        if ($request->filled('search')) {
            $search = trim((string) $request->get('search'));
            $query->where(function ($q) use ($search) {
                $q->where('specimen.sequence_code', 'like', "%{$search}%")
                    ->orWhereHas('customerRelation', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        $specimens = $query->orderBy('created_at', 'desc')->get();
        $today = Carbon::today()->startOfDay();

        $items = $specimens->map(function ($specimen) use ($today) {
            $internalDate = $specimen->expected_internal_finalization_date?->format('Y-m-d')
                ?? Carbon::parse($specimen->created_at)->format('Y-m-d');
            $clientDate = $specimen->expected_finalization_date?->format('Y-m-d')
                ?? Carbon::parse($specimen->created_at)->format('Y-m-d');

            $color = '#3b82f6';
            if ($specimen->examinations->isNotEmpty() && $specimen->examinations->first()->color) {
                $color = $specimen->examinations->first()->color;
            } elseif ($specimen->examination && $specimen->examination->color) {
                $color = $specimen->examination->color;
            }

            $isExpired = $internalDate < $today->format('Y-m-d');
            $daysOverdue = $isExpired ? Carbon::parse($internalDate)->startOfDay()->diffInDays($today, false) : 0;
            $overdueLabel = $isExpired
                ? ($daysOverdue === 1 ? 'Venció ayer' : "Venció hace {$daysOverdue} d")
                : 'En tiempo';

            $durationMinutes = 30;
            if ($specimen->examinations->isNotEmpty()) {
                $durationMinutes = $specimen->examinations->count() * 30;
            }
            $points = max(1, (int) round($durationMinutes / 15));

            return [
                'id' => $specimen->id,
                'sequence_code' => $specimen->sequence_code,
                'customer_name' => $specimen->customerRelation?->name ?? 'N/A',
                'type_name' => $specimen->type?->name ?? 'N/A',
                'examination_name' => $specimen->examinations->isNotEmpty()
                    ? $specimen->examinations->pluck('name')->join(', ')
                    : ($specimen->examination?->name ?? 'N/A'),
                'examination_color' => $color,
                'category_name' => $specimen->category?->name,
                'priority_name' => $specimen->priority?->name ?? 'Normal',
                'priority_color' => $specimen->priority?->color ?? '#3b82f6',
                'duration_minutes' => $durationMinutes,
                'points' => $points,
                'internal_date' => $internalDate,
                'client_date' => $clientDate,
                'is_expired' => $isExpired,
                'overdue_label' => $overdueLabel,
                'days_overdue' => $daysOverdue,
                'status' => $specimen->status,
                'status_label' => $specimen->status_label,
                'status_color' => $specimen->status_color,
                'created_at' => $specimen->created_at?->format('d/m/Y H:i'),
            ];
        });

        return response()->json([
            'specimens' => $items,
            'total' => $items->count(),
        ]);
    }

    /**
     * Get full list of expired specimens for the slide-over sheet.
     */
    public function expiredList(Request $request): JsonResponse
    {
        Gate::authorize('specimens_balance.view');

        $todayStr = Carbon::today()->format('Y-m-d');
        $today = Carbon::today()->startOfDay();

        $query = Specimen::query()
            ->where('specimen.active', true)
            ->whereNotIn('specimen.status', ['finalized', 'delivered', 'cancelled'])
            ->with([
                'customerRelation:id,name,id_number',
                'type:id,name',
                'examination:id,name,color,specimen_type',
                'examinations:id,name,color,specimen_type',
                'category:id,name',
                'priority:id,name,color',
                'users:users.id,name,email',
            ]);

        if ($request->filled('search')) {
            $search = trim((string) $request->get('search'));
            $query->where(function ($q) use ($search) {
                $q->where('specimen.sequence_code', 'like', "%{$search}%")
                    ->orWhereHas('customerRelation', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        $allSpecimens = $query->get();

        $expiredSpecimens = $allSpecimens->filter(function ($specimen) use ($todayStr) {
            $internalDate = $specimen->expected_internal_finalization_date?->format('Y-m-d')
                ?? Carbon::parse($specimen->created_at)->format('Y-m-d');

            return $internalDate < $todayStr;
        })->values();

        $items = $expiredSpecimens->map(function ($specimen) use ($today) {
            $internalDate = $specimen->expected_internal_finalization_date?->format('Y-m-d')
                ?? Carbon::parse($specimen->created_at)->format('Y-m-d');
            $clientDate = $specimen->expected_finalization_date?->format('Y-m-d')
                ?? Carbon::parse($specimen->created_at)->format('Y-m-d');

            $color = '#3b82f6';
            if ($specimen->examinations->isNotEmpty() && $specimen->examinations->first()->color) {
                $color = $specimen->examinations->first()->color;
            } elseif ($specimen->examination && $specimen->examination->color) {
                $color = $specimen->examination->color;
            }

            $daysOverdue = Carbon::parse($internalDate)->startOfDay()->diffInDays($today, false);
            $overdueLabel = $daysOverdue === 1 ? 'Venció ayer' : "Venció hace {$daysOverdue} d";

            $durationMinutes = 30;
            if ($specimen->examinations->isNotEmpty()) {
                $durationMinutes = $specimen->examinations->count() * 30;
            }
            $points = max(1, (int) round($durationMinutes / 15));

            return [
                'id' => $specimen->id,
                'sequence_code' => $specimen->sequence_code,
                'customer_name' => $specimen->customerRelation?->name ?? 'N/A',
                'type_name' => $specimen->type?->name ?? 'N/A',
                'examination_name' => $specimen->examinations->isNotEmpty()
                    ? $specimen->examinations->pluck('name')->join(', ')
                    : ($specimen->examination?->name ?? 'N/A'),
                'examination_color' => $color,
                'category_name' => $specimen->category?->name,
                'priority_name' => $specimen->priority?->name ?? 'Normal',
                'priority_color' => $specimen->priority?->color ?? '#3b82f6',
                'duration_minutes' => $durationMinutes,
                'points' => $points,
                'internal_date' => $internalDate,
                'client_date' => $clientDate,
                'is_expired' => true,
                'overdue_label' => $overdueLabel,
                'days_overdue' => (int) $daysOverdue,
                'assigned_users' => $specimen->users->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])->toArray(),
                'status' => $specimen->status,
                'status_label' => $specimen->status_label,
                'status_color' => $specimen->status_color,
                'created_at' => $specimen->created_at?->format('d/m/Y H:i'),
            ];
        })->sortByDesc('days_overdue')->values();

        return response()->json([
            'specimens' => $items,
            'total' => $items->count(),
        ]);
    }

    /**
     * Reschedule a specimen to a new date and/or reassign to a pathologist.
     */
    public function reschedule(Request $request, Specimen $specimen): JsonResponse|RedirectResponse
    {
        Gate::authorize('specimens_balance.manage');

        $validated = $request->validate([
            'target_date' => 'nullable|date',
            'target_user_id' => 'nullable', // integer, 'unassigned', or null
        ]);

        DB::transaction(function () use ($specimen, $validated) {
            // 1. Pathologist Reassignment (Vertical Drag)
            // Reassignment is only allowed when specimen has at most 1 assigned pathologist.
            // When assigned to more than one pathologist, moving to another pathologist is disabled.
            if (array_key_exists('target_user_id', $validated)) {
                $targetUserId = $validated['target_user_id'];

                if ($specimen->users()->count() <= 1) {
                    if ($targetUserId === 'unassigned' || empty($targetUserId)) {
                        $specimen->users()->detach();
                    } else {
                        $specimen->users()->sync([
                            (int) $targetUserId => [
                                'assigned_by' => auth()->id(),
                                'macroscopy_access' => true,
                                'microscopy_access' => true,
                            ],
                        ]);
                    }
                }
            }

            // 2. Date Rescheduling (Horizontal Drag)
            if (! empty($validated['target_date'])) {
                $targetDate = $validated['target_date'];

                $currentInternalDate = $specimen->expected_internal_finalization_date?->format('Y-m-d')
                    ?? Carbon::parse($specimen->created_at)->format('Y-m-d');
                $currentClientDate = $specimen->expected_finalization_date?->format('Y-m-d')
                    ?? Carbon::parse($specimen->created_at)->format('Y-m-d');

                $internWeekdays = WorkloadPressureCalculator::calculateWeekdays($specimen->created_at, $targetDate);

                // Calculate calendar day difference between current internal date and target date
                $targetCarbon = Carbon::parse($targetDate)->startOfDay();
                $currentInternalCarbon = Carbon::parse($currentInternalDate)->startOfDay();
                $calendarDaysDiff = $currentInternalCarbon->diffInDays($targetCarbon, false);

                // Shift customer date by the exact same number of calendar days
                $newClientDate = Carbon::parse($currentClientDate)->addDays($calendarDaysDiff);
                $clientWeekdays = WorkloadPressureCalculator::calculateWeekdays($specimen->created_at, $newClientDate);

                $specimen->update([
                    'is_manual_delivery_date_intern_enabled' => true,
                    'delivery_date_intern_unit' => 'days',
                    'delivery_date_intern_quantity' => $internWeekdays,
                    'is_manual_delivery_date_enabled' => true,
                    'delivery_date_unit' => 'days',
                    'delivery_date_quantity' => $clientWeekdays,
                ]);
            }
        });

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Muestra reprogramada exitosamente.',
                'specimen_id' => $specimen->id,
            ]);
        }

        return redirect()->back()->with('success', 'Muestra reprogramada exitosamente.');
    }

    /**
     * Save estimated examination durations and colors for a pathologist.
     */
    public function saveDurations(Request $request): RedirectResponse
    {
        Gate::authorize('specimens_balance.manage');

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'durations' => 'required|array',
            'durations.*.specimen_type_examination_id' => 'required|exists:specimen_type_examination,id',
            'durations.*.duration_minutes' => 'required|integer|min:1|max:1440',
            'durations.*.color' => 'nullable|string|max:7',
        ]);

        DB::transaction(function () use ($validated) {
            $userId = (int) $validated['user_id'];

            foreach ($validated['durations'] as $item) {
                PathologistExaminationDuration::updateOrCreate(
                    [
                        'user_id' => $userId,
                        'specimen_type_examination_id' => $item['specimen_type_examination_id'],
                    ],
                    [
                        'duration_minutes' => (int) $item['duration_minutes'],
                    ]
                );

                if (! empty($item['color'])) {
                    SpecimenTypeExamination::where('id', $item['specimen_type_examination_id'])
                        ->update(['color' => $item['color']]);
                }
            }
        });

        return redirect()->back()->with('success', 'Configuración de tiempos actualizada correctamente.');
    }
}
