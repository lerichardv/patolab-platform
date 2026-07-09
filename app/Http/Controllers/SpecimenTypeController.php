<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use Illuminate\Http\Request;
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
        ]);

        SpecimenType::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        return redirect()->back();
    }

    public function update(Request $request, SpecimenType $specimenType)
    {
        Gate::authorize('specimen_types.edit');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $specimenType->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        return redirect()->back();
    }

    public function destroy(SpecimenType $specimenType)
    {
        Gate::authorize('specimen_types.delete');
        $specimenType->update(['active' => false]);

        return redirect()->back();
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
            ])->validate();

            $validated['active'] = true;

            $specimenType = SpecimenType::create($validated);

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
