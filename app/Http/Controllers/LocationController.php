<?php

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Gate;

class LocationController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('locations.view');
        $query = Location::query()->where('active', true);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('rtn', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        $locations = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('locations/index', [
            'locations' => $locations,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('locations.create');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'rtn' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
        ]);

        Location::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, Location $location)
    {
        Gate::authorize('locations.edit');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'rtn' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
        ]);

        $location->update($validated);

        return redirect()->back();
    }

    public function destroy(Location $location)
    {
        Gate::authorize('locations.delete');
        $location->update(['active' => false]);

        return redirect()->back();
    }
}
