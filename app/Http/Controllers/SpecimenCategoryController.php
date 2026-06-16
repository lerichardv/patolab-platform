<?php

namespace App\Http\Controllers;

use App\Models\SpecimenCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class SpecimenCategoryController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('specimen_categories.view');
        $query = SpecimenCategory::query()->where('active', true)->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('unit', 'like', "%{$search}%");
            });
        }

        $categories = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('specimen-categories/index', [
            'categories' => $categories,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('specimen_categories.create');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'unit' => 'required|in:minutes,hours,days,weeks',
            'quantity' => 'required|integer|min:0',
        ]);

        SpecimenCategory::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, SpecimenCategory $specimenCategory)
    {
        Gate::authorize('specimen_categories.edit');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'unit' => 'required|in:minutes,hours,days,weeks',
            'quantity' => 'required|integer|min:0',
        ]);

        $specimenCategory->update($validated);

        return redirect()->back();
    }

    public function destroy(SpecimenCategory $specimenCategory)
    {
        Gate::authorize('specimen_categories.delete');
        $specimenCategory->update(['active' => false]);

        return redirect()->back();
    }
}
