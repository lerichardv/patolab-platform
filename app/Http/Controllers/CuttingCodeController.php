<?php

namespace App\Http\Controllers;

use App\Models\CuttingCode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CuttingCodeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('cutting_codes.view');
        $query = CuttingCode::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where('code', 'like', "%{$search}%");
        }

        $cuttingCodes = $query->orderBy('code', 'asc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('specimens/report-editor/cuttings/index', [
            'cuttingCodes' => $cuttingCodes,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Gate::authorize('cutting_codes.create');

        $isBulk = $request->has('codes') && is_array($request->input('codes'));

        if ($isBulk) {
            $validated = $request->validate([
                'codes' => 'required|array|min:1',
                'codes.*.code' => 'required|string|max:2|unique:cutting_codes,code',
                'codes.*.color' => 'required|string|regex:/^#[a-fA-F0-9]{6}$/',
            ], [
                'codes.*.code.required' => 'El código es requerido.',
                'codes.*.code.unique' => 'El código :input ya está registrado.',
                'codes.*.color.required' => 'El color es requerido.',
                'codes.*.color.regex' => 'El formato del color debe ser un hexadecimal válido.',
            ]);

            $inputCodes = array_map('strtoupper', array_column($validated['codes'], 'code'));
            if (count($inputCodes) !== count(array_unique($inputCodes))) {
                return redirect()->back()->withErrors([
                    'codes' => 'No se permiten códigos duplicados en la misma solicitud.',
                ]);
            }

            foreach ($validated['codes'] as $item) {
                CuttingCode::create([
                    'code' => strtoupper($item['code']),
                    'color' => $item['color'],
                ]);
            }

            return redirect()->back()->with('success', 'Códigos de casete creados correctamente.');
        }

        $validated = $request->validate([
            'code' => 'required|string|max:2|unique:cutting_codes,code',
            'color' => 'required|string|regex:/^#[a-fA-F0-9]{6}$/',
        ], [
            'code.unique' => 'Este código de casete ya está registrado.',
            'color.regex' => 'El formato del color debe ser un hexadecimal válido (ej. #FF0000).',
        ]);

        $validated['code'] = strtoupper($validated['code']);
        CuttingCode::create($validated);

        return redirect()->back()->with('success', 'Código de casete creado correctamente.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, CuttingCode $cuttingCode)
    {
        Gate::authorize('cutting_codes.edit');
        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:2',
                Rule::unique('cutting_codes', 'code')->ignore($cuttingCode->id),
            ],
            'color' => 'required|string|regex:/^#[a-fA-F0-9]{6}$/',
        ], [
            'code.unique' => 'Este código de casete ya está registrado.',
            'color.regex' => 'El formato del color debe ser un hexadecimal válido (ej. #FF0000).',
        ]);

        $cuttingCode->update($validated);

        return redirect()->back()->with('success', 'Código de casete actualizado correctamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(CuttingCode $cuttingCode)
    {
        Gate::authorize('cutting_codes.delete');
        $cuttingCode->delete();

        return redirect()->back()->with('success', 'Código de casete eliminado correctamente.');
    }
}
