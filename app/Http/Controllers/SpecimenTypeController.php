<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class SpecimenTypeController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('specimen_types.view');
        $query = SpecimenType::query()->where('active', true)->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $specimenTypes = $query->paginate(10)->withQueryString();

        return Inertia::render('specimen-types/index', [
            'specimenTypes' => $specimenTypes,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('specimen_types.create');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        SpecimenType::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        return redirect()->back();
    }

    public function update(Request $request, SpecimenType $specimenType)
    {
        Gate::authorize('specimen_types.edit');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $specimenType->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        return redirect()->back();
    }

    public function destroy(SpecimenType $specimenType)
    {
        Gate::authorize('specimen_types.delete');
        $specimenType->update(['active' => false]);

        return redirect()->back();
    }
}
