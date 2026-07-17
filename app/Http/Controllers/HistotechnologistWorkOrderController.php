<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
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
        $dateCookie = $request->cookie("date_filter_histotechnologist_work_orders_user_{$userId}");
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');
        if (! $request->has('date_from') && ! $request->has('date_to')) {
            if ($dateCookie) {
                $decoded = json_decode($dateCookie, true);
                if (is_array($decoded)) {
                    $dateFrom = $decoded['from'] ?? '';
                    $dateTo = $decoded['to'] ?? '';
                }
            } else {
                $dateFrom = now()->subDays(14)->toDateString();
                $dateTo = now()->toDateString();
            }
        }
        $isValidDate = function ($date) {
            return ! empty($date) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date);
        };
        if ($dateFrom && ! $isValidDate($dateFrom)) {
            $dateFrom = now()->subDays(14)->toDateString();
        }
        if ($dateTo && ! $isValidDate($dateTo)) {
            $dateTo = now()->toDateString();
        }
        if ($request->has('date_from') || $request->has('date_to')) {
            cookie()->queue(cookie("date_filter_histotechnologist_work_orders_user_{$userId}", json_encode(['from' => $dateFrom ?? '', 'to' => $dateTo ?? '']), 525600, null, null, null, false));
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

        $workOrders = $query->with([
            'specimen.customerRelation',
            'specimen.type',
            'specimen.examination',
            'task',
            'completedBy',
            'users',
        ])
            ->orderBy('priority', 'asc') // 1 = Alta, 2 = Media, 3 = Baja
            ->orderBy('due_date', 'asc')
            ->get();

        // Get all technicians for assignment based on configured setting
        $setting = Setting::where('setting_key', 'pathologist_technician_role_id')->first();
        $roleIds = $setting ? ($setting->setting_value_multiple ?? []) : [];
        $technicians = User::where('active', true)->whereIn('role_id', $roleIds)->get();

        return Inertia::render('work-orders/control', [
            'workOrders' => $workOrders,
            'technicians' => $technicians,
            'filters' => [
                'status' => $statuses,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }

    /**
     * Asigna un técnico patólogo a la orden de trabajo.
     */
    public function assignTechnician(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('work_orders.admin_view');

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
