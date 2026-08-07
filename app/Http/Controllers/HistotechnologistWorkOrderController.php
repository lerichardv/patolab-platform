<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderTask;
use App\Services\DateFilterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class HistotechnologistWorkOrderController extends Controller
{
    /**
     * Muestra la lista de todas las órdenes de trabajo para histotecnólogos y administradores.
     */
    public function index(Request $request)
    {
        Gate::authorize('work_orders.admin_view');

        $user = auth()->user();
        $userId = $user->id;

        // 1. Status Filter
        $statusCookie = $request->cookie("status_filter_histotechnologist_work_orders_user_{$userId}");
        $statuses = $request->get('status');
        if (! $request->has('status') && $statusCookie) {
            $statuses = json_decode($statusCookie, true);
        }
        $validStatuses = ['Enviada', 'En Proceso', 'Finalizada'];
        if (! $statuses || ! is_array($statuses)) {
            $statuses = ['Enviada', 'En Proceso', 'Finalizada'];
        } else {
            $statuses = array_values(array_intersect($statuses, $validStatuses));
            if (empty($statuses)) {
                $statuses = ['Enviada', 'En Proceso', 'Finalizada'];
            }
        }
        if ($request->has('status')) {
            cookie()->queue(cookie("status_filter_histotechnologist_work_orders_user_{$userId}", json_encode($statuses), 525600, null, null, null, false));
        }

        // 2. Date Range Filter
        $resolvedDates = DateFilterService::resolveFilter(
            $request->cookie("date_filter_histotechnologist_work_orders_user_{$userId}"),
            $request->get('date_from'),
            $request->get('date_to')
        );
        $dateFrom = $resolvedDates['from'];
        $dateTo = $resolvedDates['to'];

        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(DateFilterService::getCookieToQueue(
                "date_filter_histotechnologist_work_orders_user_{$userId}",
                $dateFrom,
                $dateTo,
                $resolvedDates['range']
            ));
        }

        // Get all available work order tasks
        $tasks = WorkOrderTask::orderBy('name')->get();
        $allTaskIds = $tasks->pluck('id')->toArray();

        // 3. Task Filter
        $taskCookie = $request->cookie("task_filter_histotechnologist_work_orders_user_{$userId}");
        $taskIds = $request->get('task_ids');
        if (! $request->has('task_ids') && $taskCookie) {
            $taskIds = json_decode($taskCookie, true);
        }
        if (! $taskIds || ! is_array($taskIds)) {
            $taskIds = $allTaskIds;
        } else {
            $taskIds = array_values(array_map('intval', array_intersect($taskIds, $allTaskIds)));
            if (empty($taskIds)) {
                $taskIds = $allTaskIds;
            }
        }
        if ($request->has('task_ids')) {
            cookie()->queue(cookie("task_filter_histotechnologist_work_orders_user_{$userId}", json_encode($taskIds), 525600, null, null, null, false));
        }

        // Base Query (All work orders)
        $query = WorkOrder::query();

        if (! empty($statuses)) {
            $query->whereIn('status', $statuses);
        }

        if (! empty($dateFrom)) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if (! empty($dateTo)) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        if (count($taskIds) < count($allTaskIds)) {
            $query->whereIn('work_order_task_id', $taskIds);
        }

        $workOrders = $query->with([
            'specimen.customerRelation',
            'specimen.type',
            'specimen.examination',
            'task',
            'completedBy',
            'createdBy',
            'users',
        ])
            ->get();

        // Sorting
        $sortField = $request->get('sort_field');
        $sortDirection = $request->get('sort_direction', 'asc');

        if ($sortField === 'due_date') {
            $workOrders = $sortDirection === 'desc'
                ? $workOrders->sortByDesc(fn ($wo) => $wo->due_date ? $wo->due_date->timestamp : 0)
                : $workOrders->sortBy(fn ($wo) => $wo->due_date ? $wo->due_date->timestamp : PHP_INT_MAX);
        } elseif ($sortField === 'task') {
            $workOrders = $sortDirection === 'desc'
                ? $workOrders->sortByDesc(fn ($wo) => optional($wo->task)->name ?? '')
                : $workOrders->sortBy(fn ($wo) => optional($wo->task)->name ?? '');
        } elseif ($sortField === 'type') {
            $workOrders = $sortDirection === 'desc'
                ? $workOrders->sortByDesc(fn ($wo) => optional($wo->type)->name ?? '')
                : $workOrders->sortBy(fn ($wo) => optional($wo->type)->name ?? '');
        } else {
            // Default sorting: priority asc, then due_date asc
            $workOrders = $workOrders->sortBy([
                ['priority', 'asc'],
                ['due_date', 'asc'],
            ]);
        }

        $workOrders = $workOrders->values();

        // Get all technicians for assignment based on configured setting
        $setting = Setting::where('setting_key', 'pathologist_technician_role_id')->first();
        $roleIds = $setting ? ($setting->setting_value_multiple ?? []) : [];
        $technicians = User::where('active', true)->whereIn('role_id', $roleIds)->get();

        return Inertia::render('work-orders/control', [
            'workOrders' => $workOrders,
            'technicians' => $technicians,
            'tasks' => $tasks,
            'filters' => [
                'status' => $statuses,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'task_ids' => $taskIds,
                'sort_field' => $sortField,
                'sort_direction' => $sortDirection,
            ],
        ]);
    }

    /**
     * Asigna un técnico patólogo a la orden de trabajo.
     */
    public function assignTechnician(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('work_orders.admin_view');

        if ($workOrder->status === 'Finalizada') {
            throw ValidationException::withMessages([
                'status' => 'No se pueden asignar técnicos a una orden de trabajo finalizada.',
            ]);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $workOrder->users()->syncWithoutDetaching([$validated['user_id']]);

        // If work_order's user_id is null, set this one as the primary technician
        if (is_null($workOrder->user_id)) {
            $workOrder->update(['user_id' => $validated['user_id']]);
        }

        return redirect()->back()->with('success', 'Técnico asignado correctamente.');
    }

    /**
     * Desasigna un técnico patólogo de la orden de trabajo.
     */
    public function unassignTechnician(WorkOrder $workOrder, User $user)
    {
        Gate::authorize('work_orders.admin_view');

        if ($workOrder->status === 'Finalizada') {
            throw ValidationException::withMessages([
                'status' => 'No se pueden desasignar técnicos de una orden de trabajo finalizada.',
            ]);
        }

        $workOrder->users()->detach($user->id);

        // If the primary technician is the one being detached, update user_id to the next remaining, or null
        if ($workOrder->user_id === $user->id) {
            $nextUser = $workOrder->users()->first();
            $workOrder->update(['user_id' => $nextUser?->id]);
        }

        return redirect()->back()->with('success', 'Técnico desasignado correctamente.');
    }

    /**
     * Actualiza el estado de una orden de trabajo.
     */
    public function updateStatus(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('work_orders.admin_view');

        $validated = $request->validate([
            'status' => 'required|in:En Proceso,Finalizada',
        ]);

        $updateData = [
            'status' => $validated['status'],
        ];

        if ($validated['status'] === 'Finalizada') {
            $updateData['completed_by_id'] = auth()->id();
            $updateData['completed_at'] = now();
        }

        $workOrder->update($updateData);

        return redirect()->back()->with('success', 'Estado de la orden actualizado.');
    }
}
