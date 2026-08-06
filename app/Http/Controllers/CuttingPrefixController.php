<?php

namespace App\Http\Controllers;

use App\Models\CuttingPrefix;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CuttingPrefixController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('cutting_prefixes.view');
        $query = CuttingPrefix::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where('prefix', 'like', "%{$search}%");
        }

        $cuttingPrefixes = $query->orderByRaw('LENGTH(prefix) asc')
            ->orderBy('prefix', 'asc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('specimens/report-editor/cuttings/prefixes/index', [
            'cuttingPrefixes' => $cuttingPrefixes,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Gate::authorize('cutting_prefixes.create');

        $isBulk = $request->has('prefixes') && is_array($request->input('prefixes'));

        if ($isBulk) {
            $validated = $request->validate([
                'prefixes' => 'required|array|min:1',
                'prefixes.*.prefix' => 'required|string|max:20|unique:cutting_prefixes,prefix',
            ], [
                'prefixes.*.prefix.required' => 'El prefijo es requerido.',
                'prefixes.*.prefix.unique' => 'El prefijo :input ya está registrado.',
            ]);

            $inputPrefixes = array_map('strtoupper', array_column($validated['prefixes'], 'prefix'));
            if (count($inputPrefixes) !== count(array_unique($inputPrefixes))) {
                return redirect()->back()->withErrors([
                    'prefixes' => 'No se permiten prefijos duplicados en la misma solicitud.',
                ]);
            }

            foreach ($validated['prefixes'] as $item) {
                CuttingPrefix::create([
                    'prefix' => strtoupper($item['prefix']),
                ]);
            }

            return redirect()->back()->with('success', 'Prefijos de cortes creados correctamente.');
        }

        $validated = $request->validate([
            'prefix' => 'required|string|max:20|unique:cutting_prefixes,prefix',
        ], [
            'prefix.unique' => 'Este prefijo ya está registrado.',
        ]);

        $validated['prefix'] = strtoupper($validated['prefix']);
        CuttingPrefix::create($validated);

        return redirect()->back()->with('success', 'Prefijo de corte creado correctamente.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, CuttingPrefix $cuttingPrefix)
    {
        Gate::authorize('cutting_prefixes.edit');
        $validated = $request->validate([
            'prefix' => [
                'required',
                'string',
                'max:20',
                Rule::unique('cutting_prefixes', 'prefix')->ignore($cuttingPrefix->id),
            ],
        ], [
            'prefix.unique' => 'Este prefijo ya está registrado.',
        ]);

        $validated['prefix'] = strtoupper($validated['prefix']);
        $cuttingPrefix->update($validated);

        return redirect()->back()->with('success', 'Prefijo de corte actualizado correctamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(CuttingPrefix $cuttingPrefix)
    {
        Gate::authorize('cutting_prefixes.delete');
        $cuttingPrefix->delete();

        return redirect()->back()->with('success', 'Prefijo de corte eliminado correctamente.');
    }
}
