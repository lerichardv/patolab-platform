<?php

namespace App\Http\Controllers;

use App\Models\ReferrerType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Gate;

class ReferrerTypeController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('referrer_types.view');
        $query = ReferrerType::query()->where('active', true)->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where('name', 'like', "%{$search}%");
        }

        return Inertia::render('referrer-types/index', [
            'referrerTypes' => $query->paginate(10)->withQueryString(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('referrer_types.create');
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        ReferrerType::create([
            'name' => $request->name,
            'active' => true,
        ]);

        return redirect()->back();
    }

    public function update(Request $request, ReferrerType $referrerType)
    {
        Gate::authorize('referrer_types.edit');
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $referrerType->update($request->only('name'));

        return redirect()->back();
    }

    public function destroy(ReferrerType $referrerType)
    {
        Gate::authorize('referrer_types.delete');
        $referrerType->update(['active' => false]);

        return redirect()->back();
    }
}
