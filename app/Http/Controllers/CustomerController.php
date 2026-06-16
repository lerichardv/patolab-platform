<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

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
                    ->orWhere('email', 'like', "%{$search}%");
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
            'id_number' => 'required|string|unique:customers,id_number',
            'type' => 'required|in:cliente,empresa',
            'age' => 'required_if:type,cliente|nullable|integer',
            'phone' => 'required|string',
            'gender' => 'required|string',
            'state' => 'required|exists:departments,id',
            'city' => 'required|exists:municipalities,id',
            'secondary_phone' => 'nullable|string',
            'address' => 'nullable|string',
            'email' => 'nullable|email',
        ]);

        Customer::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, Customer $customer)
    {
        Gate::authorize('patients.edit');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'id_number' => 'required|string|unique:customers,id_number,'.$customer->id,
            'type' => 'required|in:cliente,empresa',
            'age' => 'required_if:type,cliente|nullable|integer',
            'phone' => 'required|string',
            'gender' => 'required|string',
            'state' => 'required|exists:departments,id',
            'city' => 'required|exists:municipalities,id',
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
                    ->orWhere('email', 'like', "%{$search}%");
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
}
