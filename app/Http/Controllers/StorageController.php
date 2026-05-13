<?php

namespace App\Http\Controllers;

use App\Models\Storage;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StorageController extends Controller
{
    public function index(Request $request)
    {
        $query = Storage::query()->where('active', true);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $storages = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('storages/index', [
            'storages' => $storages,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        Storage::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, Storage $storage)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $storage->update($validated);

        return redirect()->back();
    }

    public function destroy(Storage $storage)
    {
        $storage->update(['active' => false]);

        return redirect()->back();
    }
}
