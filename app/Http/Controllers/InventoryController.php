<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\Storage;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Inventory::query()
            ->with(['storageRelation', 'productRelation'])
            ->where('active', true);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->whereHas('productRelation', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->has('storage') && $request->get('storage') !== 'all') {
            $query->where('storage', $request->get('storage'));
        }

        $inventories = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('inventories/index', [
            'inventories' => $inventories,
            'storages' => Storage::where('active', true)->get(),
            'products' => Product::where('active', true)->get(),
            'filters' => $request->only(['search', 'storage']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'storage' => 'required|exists:storage,id',
            'product' => 'required|exists:products,id',
            'quantity' => 'required|numeric|min:0',
        ]);

        $existing = Inventory::where('storage', $validated['storage'])
            ->where('product', $validated['product'])
            ->first();

        if ($existing) {
            $before = $existing->quantity;
            $existing->update([
                'quantity' => $existing->quantity + $validated['quantity'],
                'active' => true,
            ]);
            $inventory = $existing;
            $movementType = 'updated';
        } else {
            $before = 0;
            $inventory = Inventory::create($validated);
            $movementType = 'added';
        }

        $this->logMovement($inventory, $validated['quantity'], $before, $inventory->quantity, $movementType);

        return redirect()->back();
    }

    public function update(Request $request, Inventory $inventory)
    {
        $validated = $request->validate([
            'storage' => 'required|exists:storage,id',
            'product' => 'required|exists:products,id',
            'quantity' => 'required|numeric|min:0',
        ]);

        $before = $inventory->quantity;
        $inventory->update($validated);

        $this->logMovement($inventory, $validated['quantity'] - $before, $before, $inventory->quantity, 'updated');

        return redirect()->back();
    }

    public function abastecer(Request $request, Inventory $inventory)
    {
        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.01',
        ]);

        $before = $inventory->quantity;
        $inventory->increment('quantity', $validated['quantity']);

        $this->logMovement($inventory, $validated['quantity'], $before, $inventory->quantity, 'added');

        return redirect()->back();
    }

    public function destroy(Inventory $inventory)
    {
        $before = $inventory->quantity;
        $inventory->update(['active' => false]);

        $this->logMovement($inventory, 0, $before, $before, 'deleted');

        return redirect()->back();
    }

    private function logMovement(Inventory $inventory, $quantityAdded, $before, $after, $type)
    {
        \App\Models\InventoryMovement::create([
            'inventory_name' => $inventory->productRelation->name,
            'inventory' => $inventory->id,
            'storage_name' => $inventory->storageRelation->name,
            'storage' => $inventory->storage,
            'quantity_added' => $quantityAdded,
            'quantity_before_update' => $before,
            'quantity_after_update' => $after,
            'movement' => $type,
            'user_id' => \Illuminate\Support\Facades\Auth::id(),
        ]);
    }
}
