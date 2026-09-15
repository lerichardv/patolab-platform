<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use App\Models\SpecimenTypeState;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\IOFactory;

class SpecimenTypeController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('specimen_types.view');
        $query = SpecimenType::query()->where('active', true);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Apply sorting
        $sortField = $request->get('sort_field');
        $sortDirection = $request->get('sort_direction', 'desc');
        if (! in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        if (in_array($sortField, ['name', 'description'])) {
            $query->orderBy($sortField, $sortDirection);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $specimenTypes = $query->paginate(10)->withQueryString();

        return Inertia::render('specimen-types/index', [
            'specimenTypes' => $specimenTypes,
            'filters' => $request->only(['search', 'sort_field', 'sort_direction']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('specimen_types.create');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'requires_report' => 'sometimes|boolean',
        ]);

        $specimenType = SpecimenType::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'requires_report' => $request->boolean('requires_report', true),
        ]);

        // Automatically initialize default states
        $defaultStates = [
            1 => 'received',
            2 => 'macroscopic_review',
            3 => 'processing',
            4 => 'microscopic_review',
            5 => 'finalized',
            6 => 'delivered',
            7 => 'cancelled',
        ];

        foreach ($defaultStates as $order => $status) {
            $specimenType->states()->create([
                'status' => $status,
                'step_order' => $order,
                'active' => true,
            ]);
        }

        return redirect()->back();
    }

    public function update(Request $request, SpecimenType $specimenType)
    {
        Gate::authorize('specimen_types.edit');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'requires_report' => 'sometimes|boolean',
        ]);

        $specimenType->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'requires_report' => $request->boolean('requires_report', true),
        ]);

        return redirect()->back();
    }

    public function destroy(SpecimenType $specimenType)
    {
        Gate::authorize('specimen_types.delete');
        $specimenType->update(['active' => false]);

        return redirect()->back();
    }

    /**
     * Get configured states for a specific specimen type.
     */
    public function getStates(SpecimenType $specimenType)
    {
        Gate::authorize('specimen_types.view');

        $states = $specimenType->states()->orderBy('step_order')->get();

        // If for any reason no states exist, provide defaults
        if ($states->isEmpty()) {
            $defaultStates = [
                1 => 'received',
                2 => 'macroscopic_review',
                3 => 'processing',
                4 => 'microscopic_review',
                5 => 'finalized',
                6 => 'delivered',
                7 => 'cancelled',
            ];
            foreach ($defaultStates as $order => $status) {
                $states->push($specimenType->states()->create([
                    'status' => $status,
                    'step_order' => $order,
                    'active' => true,
                ]));
            }
        }

        // Attach metadata to each state
        $statesWithMeta = $states->map(function ($state) {
            $meta = SpecimenTypeState::ALL_STATUSES[$state->status] ?? [
                'label' => ucfirst(str_replace('_', ' ', $state->status)),
                'color' => '#cbd5e1',
                'description' => '',
            ];

            return [
                'id' => $state->id,
                'status' => $state->status,
                'step_order' => (int) $state->step_order,
                'active' => (bool) $state->active,
                'label' => $meta['label'],
                'color' => $meta['color'],
                'description' => $meta['description'],
            ];
        });

        return response()->json([
            'specimen_type' => [
                'id' => $specimenType->id,
                'name' => $specimenType->name,
            ],
            'states' => $statesWithMeta,
        ]);
    }

    /**
     * Update configured states and orders for a specimen type.
     */
    public function updateStates(Request $request, SpecimenType $specimenType)
    {
        Gate::authorize('specimen_types.edit');

        $validated = $request->validate([
            'states' => 'required|array|min:1',
            'states.*.status' => 'required|string|in:received,macroscopic_review,processing,microscopic_review,finalized,delivered,cancelled',
            'states.*.step_order' => 'required|integer|min:1',
            'states.*.active' => 'required|boolean',
        ]);

        $activeStates = collect($validated['states'])->where('active', true);
        if ($activeStates->isEmpty()) {
            throw ValidationException::withMessages([
                'states' => ['Debe haber al menos un estado activo en el flujo.'],
            ]);
        }

        DB::transaction(function () use ($specimenType, $validated) {
            foreach ($validated['states'] as $stateData) {
                $specimenType->states()->updateOrCreate(
                    ['status' => $stateData['status']],
                    [
                        'step_order' => $stateData['step_order'],
                        'active' => $stateData['active'],
                    ]
                );
            }
        });

        return redirect()->back()->with('success', 'Flujo de estados actualizado con éxito.');
    }

    public function importPage()
    {
        Gate::authorize('specimen_types.create');

        return Inertia::render('specimen-types/import');
    }

    public function parseImport(Request $request)
    {
        Gate::authorize('specimen_types.create');
        $request->validate([
            'file' => 'required|file|mimes:csv,xlsx,xls,ods|max:10240',
        ]);

        try {
            $file = $request->file('file');
            $spreadsheet = IOFactory::load($file->getRealPath());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = [];
            foreach ($worksheet->getRowIterator() as $row) {
                $cellIterator = $row->getCellIterator();
                $cellIterator->setIterateOnlyExistingCells(false);
                $rowData = [];
                foreach ($cellIterator as $cell) {
                    $rowData[] = $cell->getValue();
                }
                $rows[] = $rowData;
            }

            // Filter out empty rows (where all cells are null or empty string)
            $rows = array_filter($rows, function ($row) {
                return ! empty(array_filter($row, function ($cell) {
                    return $cell !== null && $cell !== '';
                }));
            });
            $rows = array_values($rows);

            if (empty($rows)) {
                return response()->json([
                    'error' => 'El archivo está vacío o no contiene filas válidas.',
                ], 422);
            }

            $headers = array_shift($rows);
            // Trim and sanitize headers
            $headers = array_map(function ($header) {
                return trim((string) $header);
            }, $headers);

            return response()->json([
                'headers' => $headers,
                'rows' => $rows,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error al procesar el archivo: '.$e->getMessage(),
            ], 500);
        }
    }

    public function importRow(Request $request)
    {
        Gate::authorize('specimen_types.create');

        $data = $request->all();

        try {
            $validated = validator($data, [
                'name' => 'required|string|max:255|unique:specimen_type,name',
                'description' => 'nullable|string',
                'requires_report' => 'sometimes|boolean',
            ])->validate();

            $validated['requires_report'] = $request->has('requires_report') ? $request->boolean('requires_report') : true;
            $validated['active'] = true;

            $specimenType = SpecimenType::create($validated);

            $defaultStates = [
                1 => 'received',
                2 => 'macroscopic_review',
                3 => 'processing',
                4 => 'microscopic_review',
                5 => 'finalized',
                6 => 'delivered',
                7 => 'cancelled',
            ];

            foreach ($defaultStates as $order => $status) {
                $specimenType->states()->create([
                    'status' => $status,
                    'step_order' => $order,
                    'active' => true,
                ]);
            }

            return response()->json([
                'success' => true,
                'specimen_type' => $specimenType,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al guardar la fila: '.$e->getMessage(),
            ], 500);
        }
    }
}
