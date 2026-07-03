<?php

namespace App\Http\Controllers;

use App\Models\WorkOrderTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class WorkOrderTaskController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('work_order_tasks.view');
        $query = WorkOrderTask::query()->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $tasks = $query->paginate(10)->withQueryString();

        return Inertia::render('work-order-tasks/index', [
            'tasks' => $tasks,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('work_order_tasks.create');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string|max:255',
        ]);

        WorkOrderTask::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, WorkOrderTask $workOrderTask)
    {
        Gate::authorize('work_order_tasks.edit');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string|max:255',
        ]);

        $workOrderTask->update($validated);

        return redirect()->back();
    }

    public function destroy(WorkOrderTask $workOrderTask)
    {
        Gate::authorize('work_order_tasks.delete');
        $workOrderTask->delete();

        return redirect()->back();
    }
}
