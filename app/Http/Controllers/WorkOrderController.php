<?php

namespace App\Http\Controllers;

use App\Models\WorkOrder;
use App\Models\WorkOrderTask;
use App\Models\WorkOrderType;
use App\Services\DateFilterService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WorkOrderController extends Controller
{
    /**
     * Muestra la lista de todas las órdenes de trabajo para administradores.
     */
    public function index(Request $request)
    {
        $query = WorkOrder::with(['specimen.customerRelation', 'task', 'users']);

        // Filter status
        if ($request->has('status') && $request->status !== 'all' && $request->status !== '') {
            $query->where('status', $request->status);
        }

        // Filter priority
        if ($request->has('priority') && $request->priority !== 'all' && $request->priority !== '') {
            $query->where('priority', $request->priority);
        }

        // Filter type
        if ($request->has('work_order_type_id') && $request->work_order_type_id !== 'all' && $request->work_order_type_id !== '') {
            $query->whereJsonContains('work_order_type_id', (int) $request->work_order_type_id);
        }

        // 2. Date Range Filter
        $userId = auth()->id();
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_admin_work_orders_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(DateFilterService::getCookieToQueue(
                "date_filter_admin_work_orders_user_{$userId}",
                $dateFrom,
                $dateTo,
                $resolvedDates['range']
            ));
        }

        if (! empty($dateFrom)) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if (! empty($dateTo)) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // Search text (by specimen code, comments, or patient/user name)
        if ($request->filled('search')) {
            $search = $request->search;
            $matchingTypeIds = WorkOrderType::where('name', 'like', "%{$search}%")->pluck('id')->toArray();
            $query->where(function ($q) use ($search, $matchingTypeIds) {
                $q->where('comments', 'like', "%{$search}%")
                    ->orWhere('status', 'like', "%{$search}%")
                    ->orWhereHas('specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%")
                            ->orWhereHas('customerRelation', function ($cq) use ($search) {
                                $cq->where('name', 'like', "%{$search}%");
                            });
                    })
                    ->orWhereHas('users', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });

                if (! empty($matchingTypeIds)) {
                    foreach ($matchingTypeIds as $typeId) {
                        $q->orWhereJsonContains('work_order_type_id', (int) $typeId);
                    }
                }
            });
        }

        // Sorting
        $sortField = $request->get('sort_field', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');

        $allowedSortFields = ['created_at', 'due_date', 'status', 'priority'];
        if (in_array($sortField, $allowedSortFields)) {
            $query->orderBy($sortField, $sortDirection);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $workOrders = $query->paginate(15)->withQueryString();

        $workOrderTypes = WorkOrderType::orderBy('name')->get();

        return Inertia::render('work-orders/admin', [
            'workOrders' => $workOrders,
            'workOrderTypes' => $workOrderTypes,
            'filters' => array_merge(
                $request->only(['search', 'status', 'priority', 'work_order_type_id', 'sort_field', 'sort_direction']),
                [
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]
            ),
        ]);
    }

    /**
     * Guarda una nueva orden de trabajo en la base de datos.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'specimen_id' => 'required_without:specimen_ids|nullable|exists:specimen,id',
            'specimen_ids' => 'nullable|array',
            'specimen_ids.*' => 'exists:specimen,id',
            'work_order_type_id' => 'required|array|min:1',
            'work_order_type_id.*' => 'exists:work_order_types,id',
            'work_order_task_id' => 'required|exists:work_order_tasks,id',
            'quantity' => 'nullable|integer|min:0',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
            'status' => 'required|in:Enviada,En Proceso,Finalizada',
            'priority' => 'required|integer|in:1,2,3',
            'comments' => 'nullable|string',
        ]);

        $specimenIds = ($request->has('specimen_ids') && ! empty($request->input('specimen_ids'))) ? $validated['specimen_ids'] : [$validated['specimen_id']];
        $userIds = $validated['user_ids'] ?? [];
        $primaryUserId = ! empty($userIds) ? $userIds[0] : null;

        $task = WorkOrderTask::find($validated['work_order_task_id']);
        $dueDate = null;

        if ($task) {
            $now = Carbon::now();
            $isSameDay = false;

            if ($task->same_day_rule_enabled && $task->same_day_cutoff_start && $task->same_day_cutoff_end) {
                $currentTime = $now->format('H:i:s');
                if ($currentTime >= $task->same_day_cutoff_start && $currentTime <= $task->same_day_cutoff_end) {
                    $isSameDay = true;
                }
            }

            if ($isSameDay) {
                $dueDate = Carbon::today()->endOfDay();
            } else {
                if ($task->duration_unit === 'hours') {
                    $dueDate = $now->copy();
                    for ($i = 0; $i < $task->duration_value; $i++) {
                        $dueDate->addHour();
                        while ($dueDate->isWeekend()) {
                            $dueDate->addDay();
                        }
                    }
                } else {
                    $dueDate = $now->copy()->addWeekdays($task->duration_value);
                }
            }
        }

        foreach ($specimenIds as $specimenId) {
            $workOrder = WorkOrder::create([
                'specimen_id' => $specimenId,
                'work_order_type_id' => array_map('intval', $validated['work_order_type_id']),
                'work_order_task_id' => $validated['work_order_task_id'] ?? null,
                'quantity' => $validated['quantity'] ?? 1,
                'user_id' => $primaryUserId,
                'status' => $validated['status'],
                'priority' => $validated['priority'],
                'comments' => $validated['comments'] ?? null,
                'due_date' => $dueDate,
                'created_by_id' => auth()->id(),
            ]);

            // Sincronizar todos los usuarios/patólogos en la relación N:M
            $workOrder->users()->sync($userIds);
        }

        return redirect()->back();
    }
}
