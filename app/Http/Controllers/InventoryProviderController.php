<?php

namespace App\Http\Controllers;

use App\Models\InventoryProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class InventoryProviderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('inventory.view');

        if ($request->wantsJson() || $request->has('all')) {
            return response()->json(InventoryProvider::all());
        }

        $query = InventoryProvider::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
                if (is_numeric($search)) {
                    $q->orWhere('id', $search);
                }
            });
        }

        $providers = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('inventory-providers/index', [
            'providers' => $providers,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Gate::authorize('inventory.manage');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'required|string|max:500',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:50|regex:/^\+?[0-9\s\-()]{7,20}$/',
            'phone2' => 'nullable|string|max:50|regex:/^\+?[0-9\s\-()]{7,20}$/',
        ]);

        InventoryProvider::create($validated);

        return redirect()->back();
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, InventoryProvider $inventoryProvider)
    {
        Gate::authorize('inventory.manage');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'required|string|max:500',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:50|regex:/^\+?[0-9\s\-()]{7,20}$/',
            'phone2' => 'nullable|string|max:50|regex:/^\+?[0-9\s\-()]{7,20}$/',
        ]);

        $inventoryProvider->update($validated);

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(InventoryProvider $inventoryProvider)
    {
        Gate::authorize('inventory.manage');

        $inventoryProvider->delete();

        return redirect()->back();
    }
}
