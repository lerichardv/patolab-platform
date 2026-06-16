<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Models\Sequence;
use App\Models\SpecimenType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SequenceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('sequences.view');
        $query = Sequence::query()
            ->with(['location', 'specimenTypeRelation'])
            ->where('active', true);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('prefix', 'like', "%{$search}%")
                    ->orWhereHas('location', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('specimenTypeRelation', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $sequences = $query->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('sequences/index', [
            'sequences' => $sequences,
            'locations' => Location::where('active', true)->get(['id', 'name']),
            'specimenTypes' => SpecimenType::where('active', true)->get(['id', 'name']),
            'allSequences' => Sequence::where('active', true)->get(['id', 'location_id', 'specimen_type', 'prefix']),
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Gate::authorize('sequences.create');
        $validated = $request->validate([
            'location_id' => 'required|exists:locations,id',
            'specimen_type' => 'required|exists:specimen_type,id',
            'prefix' => [
                'required',
                'string',
                'max:10',
                Rule::unique('sequences', 'prefix')->where('active', true),
            ],
            'separator' => 'required|string|max:5',
            'fill' => 'required|integer|min:1|max:10',
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2000|max:2100',
            'current_sequence' => 'required|integer|min:1',
        ], [
            'prefix.unique' => 'El prefijo ya está en uso por otra secuencia activa.',
        ]);

        Sequence::create($validated);

        return redirect()->back();
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Sequence $sequence)
    {
        Gate::authorize('sequences.edit');
        $validated = $request->validate([
            'location_id' => 'required|exists:locations,id',
            'specimen_type' => 'required|exists:specimen_type,id',
            'prefix' => [
                'required',
                'string',
                'max:10',
                Rule::unique('sequences', 'prefix')
                    ->where('active', true)
                    ->ignore($sequence->id),
            ],
            'separator' => 'required|string|max:5',
            'fill' => 'required|integer|min:1|max:10',
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2000|max:2100',
            'current_sequence' => 'required|integer|min:1',
        ], [
            'prefix.unique' => 'El prefijo ya está en uso por otra secuencia activa.',
        ]);

        $sequence->update($validated);

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Sequence $sequence)
    {
        Gate::authorize('sequences.delete');
        $sequence->update(['active' => false]);

        return redirect()->back();
    }
}
