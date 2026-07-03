<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class SpecimenTypeExaminationController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('specimen_type_examinations.view');
        $query = SpecimenTypeExamination::query()->with(['type', 'prices'])->where('active', true)->orderBy('created_at', 'desc');

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
        Gate::authorize('specimen_type_examinations.create');
        $validated = $request->validate([
            'specimen_type' => 'required|exists:specimen_type,id',
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'prices' => 'nullable|array',
            'prices.*.amount' => 'required|numeric|min:0',
        ]);

        $examination = SpecimenTypeExamination::create([
            'specimen_type' => $validated['specimen_type'],
            'name' => $validated['name'],
            'description' => $validated['description'],
        ]);

        if (! empty($validated['prices'])) {
            foreach ($validated['prices'] as $priceData) {
                $examination->prices()->create([
                    'amount' => $priceData['amount'],
                ]);
            }
        }

        return redirect()->back();
    }

    public function update(Request $request, SpecimenTypeExamination $specimenTypeExamination)
    {
        Gate::authorize('specimen_type_examinations.edit');
        $validated = $request->validate([
            'specimen_type' => 'required|exists:specimen_type,id',
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'prices' => 'nullable|array',
            'prices.*.id' => 'nullable|integer',
            'prices.*.amount' => 'required|numeric|min:0',
        ]);

        $specimenTypeExamination->update([
            'specimen_type' => $validated['specimen_type'],
            'name' => $validated['name'],
            'description' => $validated['description'],
        ]);

        $priceIdsToKeep = [];

        if (isset($validated['prices'])) {
            foreach ($validated['prices'] as $priceData) {
                if (isset($priceData['id'])) {
                    $price = $specimenTypeExamination->prices()->find($priceData['id']);
                    if ($price) {
                        $price->update(['amount' => $priceData['amount']]);
                        $priceIdsToKeep[] = $price->id;
                    }
                } else {
                    $price = $specimenTypeExamination->prices()->create(['amount' => $priceData['amount']]);
                    $priceIdsToKeep[] = $price->id;
                }
            }
        }

        $specimenTypeExamination->prices()->whereNotIn('id', $priceIdsToKeep)->delete();

        return redirect()->back();
    }

    public function destroy(SpecimenTypeExamination $specimenTypeExamination)
    {
        Gate::authorize('specimen_type_examinations.delete');
        $specimenTypeExamination->update(['active' => false]);

        return redirect()->back();
    }
}
