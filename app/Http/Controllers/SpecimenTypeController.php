<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SpecimenTypeController extends Controller
{
    public function index(Request $request)
    {
        $query = SpecimenType::query()->with('prices')->where('active', true)->orderBy('created_at', 'desc');

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
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'prices' => 'nullable|array',
            'prices.*.amount' => 'required|numeric|min:0',
        ]);

        $specimenType = SpecimenType::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        if (! empty($validated['prices'])) {
            foreach ($validated['prices'] as $priceData) {
                $specimenType->prices()->create([
                    'amount' => $priceData['amount'],
                ]);
            }
        }

        return redirect()->back();
    }

    public function update(Request $request, SpecimenType $specimenType)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'prices' => 'nullable|array',
            'prices.*.id' => 'nullable|integer',
            'prices.*.amount' => 'required|numeric|min:0',
        ]);

        $specimenType->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        $priceIdsToKeep = [];

        if (isset($validated['prices'])) {
            foreach ($validated['prices'] as $priceData) {
                if (isset($priceData['id'])) {
                    $price = $specimenType->prices()->find($priceData['id']);
                    if ($price) {
                        $price->update(['amount' => $priceData['amount']]);
                        $priceIdsToKeep[] = $price->id;
                    }
                } else {
                    $price = $specimenType->prices()->create(['amount' => $priceData['amount']]);
                    $priceIdsToKeep[] = $price->id;
                }
            }
        }

        $specimenType->prices()->whereNotIn('id', $priceIdsToKeep)->delete();

        return redirect()->back();
    }

    public function destroy(SpecimenType $specimenType)
    {
        $specimenType->update(['active' => false]);

        return redirect()->back();
    }
}
