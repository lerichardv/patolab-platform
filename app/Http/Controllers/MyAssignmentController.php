<?php

namespace App\Http\Controllers;

use App\Models\CuttingCode;
use App\Models\CuttingPrefix;
use App\Models\Priority;
use App\Models\Specimen;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Models\WorkOrderTask;
use App\Models\WorkOrderType;
use App\Services\DateFilterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class MyAssignmentController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('my_assignments.view');
        $user = auth()->user();
        $userId = $user->id;

        // 1. Status Filter
        $statusCookie = $request->cookie("status_filter_my_assignments_user_{$userId}");
        $statuses = $request->get('status');
        if (! $request->has('status') && $statusCookie) {
            $statuses = json_decode($statusCookie, true);
        }
        $validStatuses = ['received', 'macroscopic_review', 'processing', 'microscopic_review', 'finalized', 'delivered', 'cancelled'];
        if (! $statuses || ! is_array($statuses)) {
            $statuses = ['received', 'macroscopic_review', 'processing', 'microscopic_review'];
        } else {
            $statuses = array_values(array_intersect($statuses, $validStatuses));
            if (empty($statuses)) {
                $statuses = ['received', 'macroscopic_review', 'processing', 'microscopic_review'];
            }
        }
        if ($request->has('status')) {
            cookie()->queue(cookie("status_filter_my_assignments_user_{$userId}", json_encode($statuses), 525600, null, null, null, false));
        }

        // 2. Specimen Type Filter
        $typeCookie = $request->cookie("specimen_type_filter_my_assignments_user_{$userId}");
        $specimenTypeId = $request->get('specimen_type_id');
        if (! $request->has('specimen_type_id') && $typeCookie) {
            $decoded = json_decode($typeCookie, true);
            $specimenTypeId = is_array($decoded) ? $decoded : $typeCookie;
        }
        if ($specimenTypeId === 'all' || $specimenTypeId === null || $specimenTypeId === '') {
            $specimenTypeIds = null;
        } elseif ($specimenTypeId === 'none' || (is_array($specimenTypeId) && empty($specimenTypeId))) {
            $specimenTypeIds = [];
        } else {
            $specimenTypeIds = is_array($specimenTypeId) ? array_map('strval', $specimenTypeId) : [strval($specimenTypeId)];
        }
        if ($request->has('specimen_type_id')) {
            $cookieVal = $specimenTypeIds === null ? 'all' : (empty($specimenTypeIds) ? 'none' : $specimenTypeIds);
            cookie()->queue(cookie("specimen_type_filter_my_assignments_user_{$userId}", json_encode($cookieVal), 525600, null, null, null, false));
        }

        // 3. Examination Filter
        $examCookie = $request->cookie("examination_filter_my_assignments_user_{$userId}");
        $examinationId = $request->get('examination_id');
        if (! $request->has('examination_id') && $examCookie) {
            $decoded = json_decode($examCookie, true);
            $examinationId = is_array($decoded) ? $decoded : $examCookie;
        }
        if ($examinationId === 'all' || $examinationId === null || $examinationId === '') {
            $examinationIds = null;
        } elseif ($examinationId === 'none' || (is_array($examinationId) && empty($examinationId))) {
            $examinationIds = [];
        } else {
            $examinationIds = is_array($examinationId) ? array_map('strval', $examinationId) : [strval($examinationId)];
        }
        if ($request->has('examination_id')) {
            $cookieVal = $examinationIds === null ? 'all' : (empty($examinationIds) ? 'none' : $examinationIds);
            cookie()->queue(cookie("examination_filter_my_assignments_user_{$userId}", json_encode($cookieVal), 525600, null, null, null, false));
        }

        // 4. Date Range Filter
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_my_assignments_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(DateFilterService::getCookieToQueue(
                "date_filter_my_assignments_user_{$userId}",
                $dateFrom,
                $dateTo,
                $resolvedDates['range']
            ));
        }

        $query = Specimen::where('specimen.active', true)
            ->where(function ($q) use ($userId) {
                $q->whereHas('users', function ($sub) use ($userId) {
                    $sub->where('users.id', $userId);
                })->orWhereHas('collaborators', function ($sub) use ($userId) {
                    $sub->where('users.id', $userId);
                });
            });

        // Filter by statuses
        if (! empty($statuses)) {
            $query->whereIn('specimen.status', $statuses);
        }

        // Filter by specimen type
        if ($specimenTypeIds !== null) {
            if (empty($specimenTypeIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('specimen.specimen_type', $specimenTypeIds);
            }
        }

        // Filter by examination
        if ($examinationIds !== null) {
            if (empty($examinationIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('specimen.specimen_type_examination', $examinationIds);
            }
        }

        // Filter by date range
        if (! empty($dateFrom)) {
            $query->whereDate('specimen.created_at', '>=', $dateFrom);
        }
        if (! empty($dateTo)) {
            $query->whereDate('specimen.created_at', '<=', $dateTo);
        }

        $specimens = $query->join('priorities', 'specimen.priority_id', '=', 'priorities.id')
            ->select('specimen.*')
            ->orderBy('priorities.order', 'asc')
            ->orderBy('specimen.created_at', 'desc')
            ->with(['priority', 'customerRelation', 'type', 'examination', 'category', 'referrerRelation', 'invoiceRelation.creditRelation', 'invoiceRelation.transferBank', 'users', 'collaborators', 'group.invoice.creditRelation', 'group.invoice.transferBank', 'report', 'workOrders.task', 'workOrders.users', 'cuttings.code', 'cuttings.prefix', 'cuttings.responsible'])
            ->get();

        $priorities = Priority::orderBy('order', 'asc')->get();
        $specimenTypes = SpecimenType::where('active', true)->get();
        $examinations = SpecimenTypeExamination::where('active', true)->get();
        $workOrderTypes = WorkOrderType::orderBy('name')->get();
        $workOrderTasks = WorkOrderTask::orderBy('name')->get();
        $usersList = User::where('active', true)->orderBy('name')->get();
        $cuttingCodes = CuttingCode::orderByRaw('LENGTH(code) asc')->orderBy('code', 'asc')->get();
        $cuttingPrefixes = CuttingPrefix::orderByRaw('LENGTH(prefix) asc')->orderBy('prefix', 'asc')->get();
        $cuttingSlideTypes = WorkOrderType::all();

        return Inertia::render('my-assignments/index', [
            'specimens' => $specimens,
            'priorities' => $priorities,
            'specimenTypes' => $specimenTypes,
            'examinations' => $examinations,
            'workOrderTypes' => $workOrderTypes,
            'workOrderTasks' => $workOrderTasks,
            'usersList' => $usersList,
            'cuttingCodes' => $cuttingCodes,
            'cuttingPrefixes' => $cuttingPrefixes,
            'cuttingSlideTypes' => $cuttingSlideTypes,
            'filters' => [
                'status' => $statuses,
                'specimen_type_id' => $specimenTypeIds === null ? 'all' : (empty($specimenTypeIds) ? 'none' : $specimenTypeIds),
                'examination_id' => $examinationIds === null ? 'all' : (empty($examinationIds) ? 'none' : $examinationIds),
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }
}
