<?php

namespace App\Http\Controllers;

use App\Models\InventoryMovement;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Gate;

class InventoryMovementController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('inventory.movements.view');

        $query = InventoryMovement::query()
            ->with(['user'])
            ->latest();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('inventory_name', 'like', "%{$search}%")
                    ->orWhere('storage_name', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->has('movement') && $request->get('movement') !== 'all') {
            $query->where('movement', $request->get('movement'));
        }

        $movements = $query->paginate(15)->withQueryString();

        return Inertia::render('inventory-movements/index', [
            'movements' => $movements,
            'filters' => $request->only(['search', 'movement']),
        ]);
    }
}
