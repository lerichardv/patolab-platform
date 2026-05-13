<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SpecimenTypeController extends Controller
{
    public function index(Request $request)
    {
        $query = SpecimenType::query()->where('active', true)->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $specimenTypes = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('specimen-types/index', [
            'specimenTypes' => $specimenTypes,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        SpecimenType::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, SpecimenType $specimenType)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $specimenType->update($validated);

        return redirect()->back();
    }

    public function destroy(SpecimenType $specimenType)
    {
        $specimenType->update(['active' => false]);

        return redirect()->back();
    }
}
