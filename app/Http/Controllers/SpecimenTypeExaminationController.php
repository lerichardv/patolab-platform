<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\IOFactory;

class SpecimenTypeExaminationController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('specimen_type_examinations.view');
        $query = SpecimenTypeExamination::query()->with(['type', 'prices'])->where('specimen_type_examination.active', true);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('specimen_type_examination.name', 'like', "%{$search}%")
                    ->orWhere('specimen_type_examination.description', 'like', "%{$search}%");
            });
        }

        if ($request->has('specimen_type') && $request->get('specimen_type') !== 'all') {
            $query->where('specimen_type_examination.specimen_type', $request->get('specimen_type'));
        }

        // Apply sorting
        $sortField = $request->get('sort_field');
        $sortDirection = $request->get('sort_direction', 'desc');
        if (! in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        if ($sortField === 'specimen_type') {
            $query->join('specimen_type', 'specimen_type_examination.specimen_type', '=', 'specimen_type.id')
                ->select('specimen_type_examination.*')
                ->orderBy('specimen_type.name', $sortDirection);
        } elseif (in_array($sortField, ['name', 'description'])) {
            $query->orderBy('specimen_type_examination.'.$sortField, $sortDirection);
        } else {
            $query->orderBy('specimen_type_examination.created_at', 'desc');
        }

        $examinations = $query->paginate(10)->withQueryString();

        return Inertia::render('specimen-type-examinations/index', [
            'examinations' => $examinations,
            'specimenTypes' => SpecimenType::where('active', true)->get(),
            'filters' => $request->only(['search', 'specimen_type', 'sort_field', 'sort_direction']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('specimen_type_examinations.create');
        $validated = $request->validate([
            'specimen_type' => 'required|exists:specimen_type,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'prices' => 'nullable|array',
            'prices.*.amount' => 'required|numeric|min:0',
        ]);

        $examination = SpecimenTypeExamination::create([
            'specimen_type' => $validated['specimen_type'],
            'name' => $validated['name'],
            'description' => $validated['description'],
        ]);

        if (! empty($validated['prices'])) {
            foreach ($validated['prices'] as $priceData) {
                $examination->prices()->create([
                    'amount' => $priceData['amount'],
                ]);
            }
        }

        return redirect()->back();
    }

    public function update(Request $request, SpecimenTypeExamination $specimenTypeExamination)
    {
        Gate::authorize('specimen_type_examinations.edit');
        $validated = $request->validate([
            'specimen_type' => 'required|exists:specimen_type,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'prices' => 'nullable|array',
            'prices.*.id' => 'nullable|integer',
            'prices.*.amount' => 'required|numeric|min:0',
        ]);

        $specimenTypeExamination->update([
            'specimen_type' => $validated['specimen_type'],
            'name' => $validated['name'],
            'description' => $validated['description'],
        ]);

        $priceIdsToKeep = [];

        if (isset($validated['prices'])) {
            foreach ($validated['prices'] as $priceData) {
                if (isset($priceData['id'])) {
                    $price = $specimenTypeExamination->prices()->find($priceData['id']);
                    if ($price) {
                        $price->update(['amount' => $priceData['amount']]);
                        $priceIdsToKeep[] = $price->id;
                    }
                } else {
                    $price = $specimenTypeExamination->prices()->create(['amount' => $priceData['amount']]);
                    $priceIdsToKeep[] = $price->id;
                }
            }
        }

        $specimenTypeExamination->prices()->whereNotIn('id', $priceIdsToKeep)->delete();

        return redirect()->back();
    }

    public function destroy(SpecimenTypeExamination $specimenTypeExamination)
    {
        Gate::authorize('specimen_type_examinations.delete');
        $specimenTypeExamination->update(['active' => false]);

        return redirect()->back();
    }

    public function importPage()
    {
        Gate::authorize('specimen_type_examinations.create');

        return Inertia::render('specimen-type-examinations/import');
    }

    public function parseImport(Request $request)
    {
        Gate::authorize('specimen_type_examinations.create');
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
        Gate::authorize('specimen_type_examinations.create');

        $data = $request->all();

        // Resolve specimen_type name to ID if provided as a string
        if (isset($data['specimen_type']) && $data['specimen_type'] !== null && $data['specimen_type'] !== '') {
            if (! is_numeric($data['specimen_type'])) {
                $typeId = $this->findSpecimenType($data['specimen_type']);
                if ($typeId !== null) {
                    $data['specimen_type'] = $typeId;
                }
            }
        }

        // Parse comma-separated prices into an array of numeric values
        $prices = [];
        if (isset($data['price']) && $data['price'] !== null && $data['price'] !== '') {
            $rawPrices = array_map('trim', explode(',', (string) $data['price']));
            foreach ($rawPrices as $raw) {
                if (is_numeric($raw) && (float) $raw >= 0) {
                    $prices[] = (float) $raw;
                }
            }
        }

        // Remove price from validation data since we handle it manually
        unset($data['price']);

        try {
            $validated = validator($data, [
                'specimen_type' => 'required|exists:specimen_type,id',
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
            ])->validate();

            $examination = SpecimenTypeExamination::create([
                'specimen_type' => $validated['specimen_type'],
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'active' => true,
            ]);

            // Create a price_list row for each parsed price value
            foreach ($prices as $amount) {
                $examination->prices()->create([
                    'amount' => $amount,
                ]);
            }

            return response()->json([
                'success' => true,
                'examination' => $examination,
                'prices_created' => count($prices),
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

    private function findSpecimenType(string $name): ?int
    {
        $normalized = $this->normalizeName($name);

        $types = SpecimenType::where('active', true)->get();
        foreach ($types as $type) {
            if ($this->normalizeName($type->name) === $normalized) {
                return $type->id;
            }
        }

        return null;
    }

    private function normalizeName(string $name): string
    {
        $name = trim(mb_strtolower($name, 'UTF-8'));
        $replacements = [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
            'ü' => 'u', 'ñ' => 'n',
        ];

        return strtr($name, $replacements);
    }
}
