<?php

namespace App\Http\Controllers\Editor;

use App\Http\Controllers\Controller;
use App\Models\Cutting;
use App\Models\CuttingCode;
use App\Models\Specimen;
use Illuminate\Http\Request;

class CuttingController extends Controller
{
    /**
     * Store a newly created cutting in storage.
     */
    public function store(Request $request, Specimen $specimen)
    {
        $validated = $request->validate([
            'code_id' => 'required|exists:cutting_codes,id',
            'description' => 'required|string|max:255',
            'number_of_cuttings' => 'required|integer|min:0',
            'cuttings_description' => 'nullable|string|max:255',
            'number_of_slides' => 'nullable|integer|min:0',
            'cutting_slide_types' => 'required|array|min:1',
            'cutting_slide_types.*' => 'integer|exists:work_order_types,id',
            'comments' => 'nullable|string|max:255',
            'responsible_id' => 'required|exists:users,id',
            'status' => 'nullable|string|in:processing,macroscopy,delivered',
        ]);

        $validated['specimen_id'] = $specimen->id;
        $validated['cuttings_description'] = $validated['cuttings_description'] ?? '';
        $validated['status'] = $validated['status'] ?? 'macroscopy';

        Cutting::create($validated);

        return redirect()->back()->with('success', 'Corte registrado correctamente.');
    }

    /**
     * Update the specified cutting in storage.
     */
    public function update(Request $request, Cutting $cutting)
    {
        $validated = $request->validate([
            'code_id' => 'required|exists:cutting_codes,id',
            'description' => 'required|string|max:255',
            'number_of_cuttings' => 'required|integer|min:0',
            'cuttings_description' => 'nullable|string|max:255',
            'number_of_slides' => 'nullable|integer|min:0',
            'cutting_slide_types' => 'required|array|min:1',
            'cutting_slide_types.*' => 'integer|exists:work_order_types,id',
            'comments' => 'nullable|string|max:255',
            'responsible_id' => 'required|exists:users,id',
            'status' => 'nullable|string|in:processing,macroscopy,delivered',
        ]);

        $validated['cuttings_description'] = $validated['cuttings_description'] ?? '';
        $cutting->update($validated);

        return redirect()->back()->with('success', 'Corte actualizado correctamente.');
    }

    /**
     * Update only the status of the specified cutting in storage.
     */
    public function updateStatus(Request $request, Cutting $cutting)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:processing,macroscopy,delivered',
        ]);

        $cutting->update([
            'status' => $validated['status'],
        ]);

        return redirect()->back()->with('success', 'Estado del corte actualizado.');
    }

    /**
     * Remove the specified cutting from storage.
     */
    public function destroy(Cutting $cutting)
    {
        $cutting->delete();

        return redirect()->back()->with('success', 'Corte eliminado correctamente.');
    }

    /**
     * Store a newly created cutting code in storage.
     */
    public function storeCode(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:2|unique:cutting_codes,code',
            'color' => 'required|string|regex:/^#[a-fA-F0-9]{6}$/',
        ]);

        CuttingCode::create($validated);

        return redirect()->back()->with('success', 'Código de casete creado correctamente.');
    }
}
