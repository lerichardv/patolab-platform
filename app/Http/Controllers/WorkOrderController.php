<?php

namespace App\Http\Controllers;

use App\Models\WorkOrder;
use App\Models\WorkOrderType;
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
        $query = WorkOrder::with(['specimen.customerRelation', 'type', 'task', 'users']);

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
            $query->where('work_order_type_id', $request->work_order_type_id);
        }

        // Date Range (created_at range)
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Search text (by specimen code, comments, or patient/user name)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('comments', 'like', "%{$search}%")
                    ->orWhere('status', 'like', "%{$search}%")
                    ->orWhereHas('specimen', function ($sq) use ($search) {
                        $sq->where('sequence_code', 'like', "%{$search}%")
                            ->orWhereHas('customerRelation', function ($cq) use ($search) {
                                $cq->where('name', 'like', "%{$search}%");
                            });
                    })
                    ->orWhereHas('type', function ($tq) use ($search) {
                        $tq->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('users', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });
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
            'filters' => $request->only(['search', 'status', 'priority', 'work_order_type_id', 'date_from', 'date_to', 'sort_field', 'sort_direction']),
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
            'work_order_type_id' => 'required|exists:work_order_types,id',
            'work_order_task_id' => 'required|exists:work_order_tasks,id',
            'quantity' => 'nullable|integer|min:1',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
            'status' => 'required|in:Enviada,En Proceso,Finalizada',
            'priority' => 'required|integer|in:1,2,3',
            'comments' => 'nullable|string',
        ]);

        $specimenIds = ($request->has('specimen_ids') && ! empty($request->input('specimen_ids'))) ? $validated['specimen_ids'] : [$validated['specimen_id']];
        $userIds = $validated['user_ids'];
        $primaryUserId = $userIds[0];

        $type = WorkOrderType::find($validated['work_order_type_id']);
        $dueDate = null;

        if ($type) {
            $now = Carbon::now();
            $isSameDay = false;

            if ($type->same_day_rule_enabled && $type->same_day_cutoff_start && $type->same_day_cutoff_end) {
                $currentTime = $now->format('H:i:s');
                if ($currentTime >= $type->same_day_cutoff_start && $currentTime <= $type->same_day_cutoff_end) {
                    $isSameDay = true;
                }
            }

            if ($isSameDay) {
                $dueDate = Carbon::today()->endOfDay();
            } else {
                if ($type->duration_unit === 'hours') {
                    $dueDate = $now->copy()->addHours($type->duration_value);
                } else {
                    $dueDate = $now->copy()->addDays($type->duration_value);
                }
            }
        }

        foreach ($specimenIds as $specimenId) {
            $workOrder = WorkOrder::create([
                'specimen_id' => $specimenId,
                'work_order_type_id' => $validated['work_order_type_id'],
                'work_order_task_id' => $validated['work_order_task_id'] ?? null,
                'quantity' => $validated['quantity'] ?? 1,
                'user_id' => $primaryUserId,
                'status' => $validated['status'],
                'priority' => $validated['priority'],
                'comments' => $validated['comments'] ?? null,
                'due_date' => $dueDate,
            ]);

            // Sincronizar todos los usuarios/patólogos en la relación N:M
            $workOrder->users()->sync($userIds);
        }

        return redirect()->back();
    }
}
