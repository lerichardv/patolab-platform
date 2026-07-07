<?php

namespace App\Http\Controllers;

use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class MyWorkOrderController extends Controller
{
    /**
     * Muestra las órdenes de trabajo asignadas al usuario autenticado.
     */
    public function index(Request $request)
    {
        Gate::authorize('my_work_orders.view');

        $user = auth()->user();
        $userId = $user->id;

        // 1. Status Filter
        $statusCookie = $request->cookie("status_filter_my_work_orders_user_{$userId}");
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
            cookie()->queue(cookie("status_filter_my_work_orders_user_{$userId}", json_encode($statuses), 525600, null, null, null, false));
        }

        // 2. Date Range Filter
        $dateCookie = $request->cookie("date_filter_my_work_orders_user_{$userId}");
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
            cookie()->queue(cookie("date_filter_my_work_orders_user_{$userId}", json_encode(['from' => $dateFrom ?? '', 'to' => $dateTo ?? '']), 525600, null, null, null, false));
        }

        $query = WorkOrder::where('user_id', $userId);

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
        ])
            ->orderBy('priority', 'asc') // 1 = Alta, 2 = Media, 3 = Baja
            ->orderBy('due_date', 'asc')
            ->get();

        return Inertia::render('my-work-orders/index', [
            'workOrders' => $workOrders,
            'filters' => [
                'status' => $statuses,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }

    /**
     * Actualiza el estado de una orden de trabajo asignada.
     */
    public function updateStatus(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('my_work_orders.view');

        if ($workOrder->user_id !== auth()->id()) {
            abort(403, 'No autorizado para modificar esta orden de trabajo.');
        }

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

        return redirect()->back();
    }
}
