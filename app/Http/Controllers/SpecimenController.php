<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SpecimenController extends Controller
{
    public function index()
    {
        $priorities = \App\Models\Priority::orderBy('order', 'desc')->get();
        
        $priorities->load(['specimens' => function($q) {
            $q->where('specimen.active', true)
              ->with(['customerRelation', 'type', 'examination', 'category', 'referrerRelation'])
              ->leftJoin('priorities_specimens_order', function($join) {
                  $join->on('specimen.id', '=', 'priorities_specimens_order.specimen_id')
                       ->on('specimen.priority_id', '=', 'priorities_specimens_order.priority_id');
              })
              ->select('specimen.*', 'priorities_specimens_order.order as board_order')
              ->orderBy('board_order', 'asc')
              ->orderBy('specimen.created_at', 'desc');
        }]);

        return \Inertia\Inertia::render('specimens/index', [
            'priorities' => $priorities,
            'customers' => \App\Models\Customer::where('active', true)->get(),
            'specimenTypes' => \App\Models\SpecimenType::where('active', true)->get(),
            'examinations' => \App\Models\SpecimenTypeExamination::where('active', true)->get(),
            'categories' => \App\Models\SpecimenCategory::where('active', true)->get(),
            'referrers' => \App\Models\Referrer::where('active', true)->get(),
        ]);
    }

    public function store(\Illuminate\Http\Request $request)
    {
        $validated = $request->validate([
            'customer' => 'required|exists:customers,id',
            'specimen_type' => 'required|exists:specimen_type,id',
            'specimen_type_examination' => 'required|exists:specimen_type_examination,id',
            'specimen_category' => 'required|exists:specimen_category,id',
            'referrer' => 'required|exists:referrers,id',
            'anatomic_site' => 'required|string|max:255',
            'diagnosis' => 'nullable|string',
            'clinical_notes' => 'nullable|string',
            'status' => 'required|string',
            'priority_id' => 'required|exists:priorities,id',
        ]);

        $specimen = \App\Models\Specimen::create($validated);
        
        $maxOrder = \App\Models\PrioritySpecimenOrder::where('priority_id', $validated['priority_id'])->max('order') ?? 0;
        \App\Models\PrioritySpecimenOrder::create([
            'priority_id' => $validated['priority_id'],
            'specimen_id' => $specimen->id,
            'order' => $maxOrder + 1,
        ]);

        return redirect()->back();
    }

    public function update(\Illuminate\Http\Request $request, \App\Models\Specimen $specimen)
    {
        $validated = $request->validate([
            'customer' => 'required|exists:customers,id',
            'specimen_type' => 'required|exists:specimen_type,id',
            'specimen_type_examination' => 'required|exists:specimen_type_examination,id',
            'specimen_category' => 'required|exists:specimen_category,id',
            'referrer' => 'required|exists:referrers,id',
            'anatomic_site' => 'required|string|max:255',
            'diagnosis' => 'nullable|string',
            'clinical_notes' => 'nullable|string',
            'status' => 'required|string',
            'priority_id' => 'required|exists:priorities,id',
        ]);

        $oldPriorityId = $specimen->priority_id;
        
        $specimen->update($validated);

        if ($oldPriorityId != $validated['priority_id']) {
            $maxOrder = \App\Models\PrioritySpecimenOrder::where('priority_id', $validated['priority_id'])->max('order') ?? 0;
            \App\Models\PrioritySpecimenOrder::updateOrCreate(
                ['priority_id' => $validated['priority_id'], 'specimen_id' => $specimen->id],
                ['order' => $maxOrder + 1]
            );
        }

        return redirect()->back();
    }

    public function updateOrder(\Illuminate\Http\Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|integer|exists:specimen,id',
            'items.*.priority_id' => 'required|integer|exists:priorities,id',
            'items.*.order' => 'required|integer',
        ]);

        \Illuminate\Support\Facades\DB::transaction(function() use ($validated) {
            foreach ($validated['items'] as $item) {
                $specimen = \App\Models\Specimen::find($item['id']);
                if ($specimen && $specimen->priority_id != $item['priority_id']) {
                    $specimen->update(['priority_id' => $item['priority_id']]);
                }

                \App\Models\PrioritySpecimenOrder::updateOrCreate(
                    ['priority_id' => $item['priority_id'], 'specimen_id' => $item['id']],
                    ['order' => $item['order']]
                );
            }
        });

        return redirect()->back();
    }

    public function destroy(\App\Models\Specimen $specimen)
    {
        $specimen->update(['active' => false]);
        return redirect()->back();
    }
}
