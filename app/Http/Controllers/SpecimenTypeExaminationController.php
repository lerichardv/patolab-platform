<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SpecimenTypeExaminationController extends Controller
{
    public function index(Request $request)
    {
        $query = SpecimenTypeExamination::query()->with('type')->where('active', true)->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('specimen_type') && $request->get('specimen_type') !== 'all') {
            $query->where('specimen_type', $request->get('specimen_type'));
        }

        $examinations = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('specimen-type-examinations/index', [
            'examinations' => $examinations,
            'specimenTypes' => SpecimenType::where('active', true)->get(),
            'filters' => $request->only(['search', 'specimen_type']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'specimen_type' => 'required|exists:specimen_type,id',
            'name' => 'required|string|max:255',
            'description' => 'required|string',
        ]);

        SpecimenTypeExamination::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, SpecimenTypeExamination $specimenTypeExamination)
    {
        $validated = $request->validate([
            'specimen_type' => 'required|exists:specimen_type,id',
            'name' => 'required|string|max:255',
            'description' => 'required|string',
        ]);

        $specimenTypeExamination->update($validated);

        return redirect()->back();
    }

    public function destroy(SpecimenTypeExamination $specimenTypeExamination)
    {
        $specimenTypeExamination->update(['active' => false]);

        return redirect()->back();
    }
}
