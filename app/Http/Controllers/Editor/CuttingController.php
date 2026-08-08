<?php

namespace App\Http\Controllers\Editor;

use App\Http\Controllers\Controller;
use App\Models\Cutting;
use App\Models\CuttingCode;
use App\Models\Specimen;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CuttingController extends Controller
{
    /**
     * Store a newly created cutting in storage.
     */
    public function store(Request $request, Specimen $specimen)
    {
        $codeIds = $request->input('code_ids');

        if (is_array($codeIds) && count($codeIds) > 0) {
            $validated = $request->validate([
                'code_ids' => 'required|array',
                'code_ids.*' => [
                    'required',
                    'exists:cutting_codes,id',
                    Rule::unique('cuttings', 'code_id')->where('specimen_id', $specimen->id),
                ],
                'description' => 'required|string|max:255',
                'number_of_cuttings' => 'required|integer|min:0',
                'cuttings_description' => 'nullable|string|max:255',
                'number_of_slides' => 'nullable|integer|min:0',
                'cutting_slide_types' => 'required|array|min:1',
                'cutting_slide_types.*' => 'integer|exists:work_order_types,id',
                'comments' => 'nullable|string|max:255',
                'responsible_id' => 'required|exists:users,id',
                'status' => 'nullable|string|in:processing,macroscopy,delivered',
                'is_new_cut' => 'nullable|boolean',
                'prefix_id' => 'nullable|integer|exists:cutting_prefixes,id',
            ], [
                'code_ids.*.unique' => 'Uno de los códigos de casete seleccionados ya está registrado en esta muestra.',
            ]);

            foreach ($codeIds as $codeId) {
                $status = $validated['status'] ?? 'macroscopy';
                Cutting::create([
                    'specimen_id' => $specimen->id,
                    'code_id' => $codeId,
                    'description' => $validated['description'],
                    'number_of_cuttings' => $validated['number_of_cuttings'],
                    'cuttings_description' => $validated['cuttings_description'] ?? '',
                    'number_of_slides' => $validated['number_of_slides'],
                    'cutting_slide_types' => $validated['cutting_slide_types'],
                    'comments' => $validated['comments'] ?? null,
                    'responsible_id' => $validated['responsible_id'],
                    'status' => $status,
                    'is_new_cut' => $validated['is_new_cut'] ?? false,
                    'prefix_id' => $validated['prefix_id'] ?? null,
                    'macroscopy_date' => now(),
                    'processing_date' => $status === 'processing' ? now() : null,
                    'delivery_date' => $status === 'delivered' ? now() : null,
                ]);
            }

            return redirect()->back()->with('success', 'Cortes registrados correctamente.');
        }

        $validated = $request->validate([
            'code_id' => [
                'required',
                'exists:cutting_codes,id',
                Rule::unique('cuttings')->where('specimen_id', $specimen->id),
            ],
            'description' => 'required|string|max:255',
            'number_of_cuttings' => 'required|integer|min:0',
            'cuttings_description' => 'nullable|string|max:255',
            'number_of_slides' => 'nullable|integer|min:0',
            'cutting_slide_types' => 'required|array|min:1',
            'cutting_slide_types.*' => 'integer|exists:work_order_types,id',
            'comments' => 'nullable|string|max:255',
            'responsible_id' => 'required|exists:users,id',
            'status' => 'nullable|string|in:processing,macroscopy,delivered',
            'is_new_cut' => 'nullable|boolean',
            'prefix_id' => 'nullable|integer|exists:cutting_prefixes,id',
        ], [
            'code_id.unique' => 'Este código de casete ya está registrado en otro corte de esta muestra.',
        ]);

        $validated['specimen_id'] = $specimen->id;
        $validated['cuttings_description'] = $validated['cuttings_description'] ?? '';
        $validated['status'] = $status = $validated['status'] ?? 'macroscopy';
        $validated['is_new_cut'] = $validated['is_new_cut'] ?? false;

        $validated['macroscopy_date'] = now();
        if ($status === 'processing') {
            $validated['processing_date'] = now();
        } elseif ($status === 'delivered') {
            $validated['delivery_date'] = now();
        }

        Cutting::create($validated);

        return redirect()->back()->with('success', 'Corte registrado correctamente.');
    }

    /**
     * Update the specified cutting in storage.
     */
    public function update(Request $request, Cutting $cutting)
    {
        $validated = $request->validate([
            'code_id' => [
                'required',
                'exists:cutting_codes,id',
                Rule::unique('cuttings')->where('specimen_id', $cutting->specimen_id)->ignore($cutting->id),
            ],
            'description' => 'required|string|max:255',
            'number_of_cuttings' => 'required|integer|min:0',
            'cuttings_description' => 'nullable|string|max:255',
            'number_of_slides' => 'nullable|integer|min:0',
            'cutting_slide_types' => 'required|array|min:1',
            'cutting_slide_types.*' => 'integer|exists:work_order_types,id',
            'comments' => 'nullable|string|max:255',
            'responsible_id' => 'required|exists:users,id',
            'status' => 'nullable|string|in:processing,macroscopy,delivered',
            'is_new_cut' => 'nullable|boolean',
            'prefix_id' => 'nullable|integer|exists:cutting_prefixes,id',
        ], [
            'code_id.unique' => 'Este código de casete ya está registrado en otro corte de esta muestra.',
        ]);

        $validated['cuttings_description'] = $validated['cuttings_description'] ?? '';

        if (isset($validated['status']) && $validated['status'] !== $cutting->status) {
            if ($validated['status'] === 'macroscopy') {
                $validated['macroscopy_date'] = now();
            } elseif ($validated['status'] === 'processing') {
                $validated['processing_date'] = now();
            } elseif ($validated['status'] === 'delivered') {
                $validated['delivery_date'] = now();
            }
        }

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

        $updateData = [
            'status' => $validated['status'],
        ];

        if ($validated['status'] !== $cutting->status) {
            if ($validated['status'] === 'macroscopy') {
                $updateData['macroscopy_date'] = now();
            } elseif ($validated['status'] === 'processing') {
                $updateData['processing_date'] = now();
            } elseif ($validated['status'] === 'delivered') {
                $updateData['delivery_date'] = now();
            }
        }

        $cutting->update($updateData);

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

    /**
     * Bulk update cuttings.
     */
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:cuttings,id',
            'status' => 'nullable|string|in:processing,macroscopy,delivered',
            'responsible_id' => 'nullable|integer|exists:users,id',
            'prefix_id' => 'nullable|integer|exists:cutting_prefixes,id',
        ]);

        $updateData = [];

        if ($request->has('status')) {
            $updateData['status'] = $validated['status'];
            if ($validated['status'] === 'macroscopy') {
                $updateData['macroscopy_date'] = now();
            } elseif ($validated['status'] === 'processing') {
                $updateData['processing_date'] = now();
            } elseif ($validated['status'] === 'delivered') {
                $updateData['delivery_date'] = now();
            }
        }

        if ($request->has('responsible_id')) {
            $updateData['responsible_id'] = $validated['responsible_id'];
        }

        if ($request->has('prefix_id')) {
            $updateData['prefix_id'] = $validated['prefix_id'];
        }

        if (! empty($updateData)) {
            Cutting::whereIn('id', $validated['ids'])->update($updateData);

            return redirect()->back()->with('success', 'Cortes actualizados en bloque correctamente.');
        }

        return redirect()->back()->with('error', 'No se proporcionaron datos para actualizar.');
    }

    /**
     * Bulk destroy cuttings.
     */
    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:cuttings,id',
        ]);

        Cutting::whereIn('id', $validated['ids'])->delete();

        return redirect()->back()->with('success', 'Cortes seleccionados eliminados correctamente.');
    }
}
