<?php

namespace App\Http\Controllers;

use App\Models\WorkOrderType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class WorkOrderTypeController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('work_orders.view');
        $query = WorkOrderType::query()->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        $workOrderTypes = $query->paginate(10)->withQueryString();

        return Inertia::render('work-orders/index', [
            'workOrderTypes' => $workOrderTypes,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('work_orders.create');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'duration_unit' => 'required|in:hours,days',
            'duration_value' => 'required|integer|min:1',
            'same_day_rule_enabled' => 'required|boolean',
            'same_day_cutoff_start' => 'nullable|required_if:same_day_rule_enabled,true|date_format:H:i',
            'same_day_cutoff_end' => 'nullable|required_if:same_day_rule_enabled,true|date_format:H:i|after:same_day_cutoff_start',
        ], [
            'same_day_cutoff_end.after' => 'El rango fin (límite) debe ser posterior al rango inicio (entrada).',
        ]);

        if (! $validated['same_day_rule_enabled']) {
            $validated['same_day_cutoff_start'] = null;
            $validated['same_day_cutoff_end'] = null;
        }

        WorkOrderType::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, WorkOrderType $workOrderType)
    {
        Gate::authorize('work_orders.edit');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'duration_unit' => 'required|in:hours,days',
            'duration_value' => 'required|integer|min:1',
            'same_day_rule_enabled' => 'required|boolean',
            'same_day_cutoff_start' => 'nullable|required_if:same_day_rule_enabled,true|date_format:H:i',
            'same_day_cutoff_end' => 'nullable|required_if:same_day_rule_enabled,true|date_format:H:i|after:same_day_cutoff_start',
        ], [
            'same_day_cutoff_end.after' => 'El rango fin (límite) debe ser posterior al rango inicio (entrada).',
        ]);

        if (! $validated['same_day_rule_enabled']) {
            $validated['same_day_cutoff_start'] = null;
            $validated['same_day_cutoff_end'] = null;
        }

        $workOrderType->update($validated);

        return redirect()->back();
    }

    public function destroy(WorkOrderType $workOrderType)
    {
        Gate::authorize('work_orders.delete');
        $workOrderType->delete();

        return redirect()->back();
    }
}
