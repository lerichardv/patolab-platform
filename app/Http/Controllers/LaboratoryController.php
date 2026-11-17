<?php

namespace App\Http\Controllers;

use App\Models\Laboratory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LaboratoryController extends Controller
{
    /**
     * Display a listing of active laboratories.
     */
    public function index(): JsonResponse
    {
        $laboratories = Laboratory::query()
            ->active()
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get(['id', 'name', 'is_default', 'is_active']);

        return response()->json([
            'data' => $laboratories,
        ]);
    }

    /**
     * Store a newly created laboratory in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:laboratories,name'],
        ], [
            'name.required' => 'El nombre del laboratorio es obligatorio.',
            'name.unique' => 'Ya existe un laboratorio con ese nombre.',
            'name.max' => 'El nombre del laboratorio no debe exceder los 255 caracteres.',
        ]);

        $laboratory = Laboratory::create([
            'name' => trim($validated['name']),
            'is_default' => false,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Laboratorio registrado exitosamente.',
            'data' => $laboratory,
        ], 201);
    }
}
