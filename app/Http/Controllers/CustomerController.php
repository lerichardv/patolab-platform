<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Department;
use App\Models\Municipality;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\IOFactory;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('patients.view');
        $query = Customer::with(['department', 'municipality'])->where('active', true);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('id_number', 'like', "%{$search}%");
                if (is_numeric($search)) {
                    $q->orWhere('id', $search);
                }
            });
        }

        if ($request->has('type') && $request->get('type') !== 'all') {
            $query->where('type', $request->get('type'));
        }

        if ($request->has('gender') && $request->get('gender') !== 'all') {
            $query->where('gender', $request->get('gender'));
        }

        if ($request->has('state') && $request->get('state') !== '') {
            $state = $request->get('state');
            $query->where(function ($q) use ($state) {
                $q->where('state', $state)
                    ->orWhereHas('department', function ($q) use ($state) {
                        $q->where('name', 'like', "%{$state}%");
                    });
            });
        }

        if ($request->has('city') && $request->get('city') !== '') {
            $city = $request->get('city');
            $query->where(function ($q) use ($city) {
                $q->where('city', $city)
                    ->orWhereHas('municipality', function ($q) use ($city) {
                        $q->where('name', 'like', "%{$city}%");
                    });
            });
        }

        $customers = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('customers/index', [
            'customers' => $customers,
            'filters' => $request->only(['search', 'type', 'gender', 'state', 'city']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('patients.create');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'id_number' => 'required|string',
            'type' => 'required|in:cliente,empresa',
            'age' => 'nullable|integer',
            'phone' => 'required|string',
            'gender' => 'nullable|string',
            'state' => 'nullable|exists:departments,id',
            'city' => 'nullable|exists:municipalities,id',
            'secondary_phone' => 'nullable|string',
            'address' => 'nullable|string',
            'email' => 'nullable|email',
        ]);

        $customer = Customer::create($validated);

        return redirect()->back()->with('created_customer', [
            'id' => $customer->id,
            'name' => $customer->name,
            'id_number' => $customer->id_number,
            'phone' => $customer->phone,
            'gender' => $customer->gender,
            'type' => $customer->type,
            'age' => $customer->age,
        ]);
    }

    public function update(Request $request, Customer $customer)
    {
        Gate::authorize('patients.edit');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'id_number' => 'required|string',
            'type' => 'required|in:cliente,empresa',
            'age' => 'nullable|integer',
            'phone' => 'required|string',
            'gender' => 'nullable|string',
            'state' => 'nullable|exists:departments,id',
            'city' => 'nullable|exists:municipalities,id',
            'secondary_phone' => 'nullable|string',
            'address' => 'nullable|string',
            'email' => 'nullable|email',
        ]);

        $customer->update($validated);

        return redirect()->back();
    }

    public function destroy(Customer $customer)
    {
        Gate::authorize('patients.delete');
        $customer->update(['active' => false]);

        return redirect()->back();
    }

    public function export(Request $request)
    {
        Gate::authorize('patients.view');
        $query = Customer::with(['department', 'municipality'])->where('active', true);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('id_number', 'like', "%{$search}%");
                if (is_numeric($search)) {
                    $q->orWhere('id', $search);
                }
            });
        }

        if ($request->has('type') && $request->get('type') !== 'all') {
            $query->where('type', $request->get('type'));
        }

        if ($request->has('gender') && $request->get('gender') !== 'all') {
            $query->where('gender', $request->get('gender'));
        }

        if ($request->has('state') && $request->get('state') !== '') {
            $state = $request->get('state');
            $query->where(function ($q) use ($state) {
                $q->where('state', $state)
                    ->orWhereHas('department', function ($q) use ($state) {
                        $q->where('name', 'like', "%{$state}%");
                    });
            });
        }

        if ($request->has('city') && $request->get('city') !== '') {
            $city = $request->get('city');
            $query->where(function ($q) use ($city) {
                $q->where('city', $city)
                    ->orWhereHas('municipality', function ($q) use ($city) {
                        $q->where('name', 'like', "%{$city}%");
                    });
            });
        }

        $customers = $query->latest()->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="clientes_patolab.csv"',
        ];

        $callback = function () use ($customers) {
            $file = fopen('php://output', 'w');
            // UTF-8 BOM for Excel
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($file, ['Nombre', 'Identidad/RTN', 'Tipo', 'Edad', 'Género', 'Teléfono', 'Estado/Departamento', 'Ciudad', 'Correo']);

            foreach ($customers as $customer) {
                fputcsv($file, [
                    $customer->name,
                    $customer->id_number,
                    ucfirst($customer->type),
                    $customer->age,
                    $customer->gender,
                    $customer->phone,
                    $customer->department?->name ?? $customer->state,
                    $customer->municipality?->name ?? $customer->city,
                    $customer->email,
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function importPage()
    {
        Gate::authorize('patients.create');

        return Inertia::render('customers/import');
    }

    public function parseImport(Request $request)
    {
        Gate::authorize('patients.create');
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
        Gate::authorize('patients.create');

        $data = $request->all();

        // 1. Resolve state (department) and city (municipality) case-and-accent insensitively if names are provided
        if (isset($data['state']) && $data['state'] !== null && $data['state'] !== '') {
            if (! is_numeric($data['state'])) {
                $deptId = $this->findDepartment($data['state']);
                if ($deptId !== null) {
                    $data['state'] = $deptId;
                }
            }
        }

        if (isset($data['city']) && $data['city'] !== null && $data['city'] !== '') {
            if (! is_numeric($data['city']) && isset($data['state']) && is_numeric($data['state'])) {
                $muniId = $this->findMunicipality((int) $data['state'], $data['city']);
                if ($muniId !== null) {
                    $data['city'] = $muniId;
                }
            }
        }

        // 2. Resolve gender case-insensitively
        if (isset($data['gender']) && $data['gender'] !== null && $data['gender'] !== '') {
            $normalizedGender = trim(mb_strtolower($data['gender'], 'UTF-8'));
            if (in_array($normalizedGender, ['hombre', 'masculino', 'm', 'h', 'male'])) {
                $data['gender'] = 'Hombre';
            } elseif (in_array($normalizedGender, ['mujer', 'femenino', 'f', 'female'])) {
                $data['gender'] = 'Mujer';
            } else {
                $data['gender'] = 'Otro';
            }
        }

        // 3. Resolve customer type.
        if (isset($data['type']) && $data['type'] !== null && $data['type'] !== '') {
            $normalizedType = trim(mb_strtolower($data['type'], 'UTF-8'));
            if ($normalizedType === 'empresa' || $normalizedType === 'company') {
                $data['type'] = 'empresa';
            } else {
                $data['type'] = 'cliente';
            }
        } else {
            $data['type'] = 'cliente';
        }

        // 4. Validate and save
        try {
            $validated = validator($data, [
                'name' => 'required|string|max:255',
                'id_number' => 'required|string',
                'type' => 'required|in:cliente,empresa',
                'age' => 'nullable|integer',
                'phone' => 'required|string',
                'gender' => 'nullable|string',
                'state' => 'nullable|exists:departments,id',
                'city' => 'nullable|exists:municipalities,id',
                'secondary_phone' => 'nullable|string',
                'address' => 'nullable|string',
                'email' => 'nullable|email',
            ])->validate();

            $validated['active'] = true;

            $customer = Customer::create($validated);

            return response()->json([
                'success' => true,
                'customer' => $customer,
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

    private function findDepartment(string $name): ?int
    {
        $normalized = $this->normalizeName($name);

        $departments = Department::all();
        foreach ($departments as $dept) {
            if ($this->normalizeName($dept->name) === $normalized) {
                return $dept->id;
            }
        }

        return null;
    }

    private function findMunicipality(int $departmentId, string $name): ?int
    {
        $normalized = $this->normalizeName($name);

        $municipalities = Municipality::where('department_id', $departmentId)->get();
        foreach ($municipalities as $muni) {
            if ($this->normalizeName($muni->name) === $normalized) {
                return $muni->id;
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
