<?php

namespace App\Http\Controllers;

use App\Models\Laboratory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class LaboratoryController extends Controller
{
    /**
     * Display a listing of laboratories (Inertia page or JSON API for sticker selectors).
     */
    public function index(Request $request): JsonResponse|InertiaResponse
    {
        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            $laboratories = Laboratory::query()
                ->active()
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get(['id', 'name', 'is_default', 'is_active']);

            return response()->json([
                'data' => $laboratories,
            ]);
        }

        Gate::authorize('laboratories.view');

        $query = Laboratory::query();

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
                if (is_numeric($search)) {
                    $q->orWhere('id', (int) $search);
                }
            });
        }

        if ($request->filled('is_active') && $request->input('is_active') !== 'all') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('is_default') && $request->input('is_default') !== 'all') {
            $query->where('is_default', $request->boolean('is_default'));
        }

        $laboratories = $query
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('laboratories/index', [
            'laboratories' => $laboratories,
            'filters' => $request->only(['search', 'is_active', 'is_default']),
        ]);
    }

    /**
     * Store a newly created laboratory in storage.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        if (! $request->wantsJson() || $request->header('X-Inertia')) {
            Gate::authorize('laboratories.create');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:laboratories,name'],
            'is_default' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'El nombre del laboratorio es obligatorio.',
            'name.unique' => 'Ya existe un laboratorio con ese nombre.',
            'name.max' => 'El nombre del laboratorio no debe exceder los 255 caracteres.',
        ]);

        $isDefault = $request->boolean('is_default');
        $isActive = $request->has('is_active') ? $request->boolean('is_active') : true;

        if ($isDefault) {
            Laboratory::query()->where('is_default', true)->update(['is_default' => false]);
        }

        $laboratory = Laboratory::create([
            'name' => trim($validated['name']),
            'is_default' => $isDefault,
            'is_active' => $isActive,
        ]);

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Laboratorio registrado exitosamente.',
                'data' => $laboratory,
            ], 201);
        }

        return redirect()->back()->with('success', 'Laboratorio registrado exitosamente.');
    }

    /**
     * Update the specified laboratory in storage.
     */
    public function update(Request $request, Laboratory $laboratory): JsonResponse|RedirectResponse
    {
        Gate::authorize('laboratories.edit');

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('laboratories', 'name')->ignore($laboratory->id),
            ],
            'is_default' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'El nombre del laboratorio es obligatorio.',
            'name.unique' => 'Ya existe un laboratorio con ese nombre.',
            'name.max' => 'El nombre del laboratorio no debe exceder los 255 caracteres.',
        ]);

        $isDefault = $request->boolean('is_default');
        $isActive = $request->has('is_active') ? $request->boolean('is_active') : $laboratory->is_active;

        if ($isDefault && ! $laboratory->is_default) {
            Laboratory::query()->where('id', '!=', $laboratory->id)->update(['is_default' => false]);
        }

        $laboratory->update([
            'name' => trim($validated['name']),
            'is_default' => $isDefault,
            'is_active' => $isActive,
        ]);

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Laboratorio actualizado exitosamente.',
                'data' => $laboratory,
            ]);
        }

        return redirect()->back()->with('success', 'Laboratorio actualizado exitosamente.');
    }

    /**
     * Remove the specified laboratory from storage.
     */
    public function destroy(Request $request, Laboratory $laboratory): JsonResponse|RedirectResponse
    {
        Gate::authorize('laboratories.delete');

        if ($laboratory->is_default) {
            $errorMsg = 'No se puede eliminar el laboratorio predeterminado. Establezca otro laboratorio como predeterminado primero.';

            if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                return response()->json(['message' => $errorMsg], 422);
            }

            throw ValidationException::withMessages([
                'general' => $errorMsg,
            ]);
        }

        $laboratory->delete();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Laboratorio eliminado correctamente.',
            ]);
        }

        return redirect()->back()->with('success', 'Laboratorio eliminado correctamente.');
    }
}
