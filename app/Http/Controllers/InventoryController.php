<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Storage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Gate;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('inventory.view');

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
            'existingInventories' => Inventory::where('active', true)->get(['storage', 'product']),
            'filters' => $request->only(['search', 'storage']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('inventory.add');

        $validated = $request->validate([
            'storage' => 'required|exists:storage,id',
            'items' => 'required|array|min:1',
            'items.*.product' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            foreach ($validated['items'] as $item) {
                $productId = $item['product'];
                $quantity = $item['quantity'];

                $existing = Inventory::where('storage', $validated['storage'])
                    ->where('product', $productId)
                    ->first();

                if ($existing) {
                    $before = $existing->quantity;
                    $existing->update([
                        'quantity' => $existing->quantity + $quantity,
                        'active' => true,
                    ]);
                    $inventory = $existing;
                    $movementType = 'updated';
                } else {
                    $before = 0;
                    $inventory = Inventory::create([
                        'storage' => $validated['storage'],
                        'product' => $productId,
                        'quantity' => $quantity,
                    ]);
                    $movementType = 'added';
                }

                $this->logMovement($inventory, $quantity, $before, $inventory->quantity, $movementType);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return redirect()->back();
    }

    public function update(Request $request, Inventory $inventory)
    {
        Gate::authorize('inventory.manage');

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

    public function abastecer(Request $request)
    {
        Gate::authorize('inventory.manage');

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.inventory_id' => 'required|exists:inventory,id',
            'items.*.quantity' => 'required|numeric|not_in:0',
        ]);

        DB::beginTransaction();

        try {
            foreach ($validated['items'] as $item) {
                $inventory = Inventory::findOrFail($item['inventory_id']);
                $before = $inventory->quantity;
                $inventory->increment('quantity', $item['quantity']);

                $this->logMovement($inventory, $item['quantity'], $before, $inventory->quantity, 'added');
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return redirect()->back();
    }

    public function destroy(Inventory $inventory)
    {
        Gate::authorize('inventory.manage');

        $before = $inventory->quantity;
        $inventory->update(['active' => false]);

        $this->logMovement($inventory, 0, $before, $before, 'deleted');

        return redirect()->back();
    }

    private function logMovement(Inventory $inventory, $quantityAdded, $before, $after, $type)
    {
        InventoryMovement::create([
            'inventory_name' => $inventory->productRelation->name,
            'inventory' => $inventory->id,
            'storage_name' => $inventory->storageRelation->name,
            'storage' => $inventory->storage,
            'quantity_added' => $quantityAdded,
            'quantity_before_update' => $before,
            'quantity_after_update' => $after,
            'movement' => $type,
            'user_id' => Auth::id(),
        ]);
    }
}
