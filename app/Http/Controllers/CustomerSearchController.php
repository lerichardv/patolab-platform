<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerSearchController extends Controller
{
    /**
     * Search customers by name or id_number.
     *
     * Query parameters:
     *  - q            (string) — search term, must be ≥ 4 chars to return results
     *  - selected_ids (int[])  — IDs to always include (e.g. current value in a combobox)
     */
    public function search(Request $request)
    {
        $q = trim($request->get('q', ''));
        $selectedIds = array_filter(
            array_map('intval', (array) $request->get('selected_ids', [])),
        );

        // Start with always-included selected customers
        $selectedCustomers = collect();
        if (! empty($selectedIds)) {
            $selectedCustomers = Customer::where('active', true)
                ->whereIn('id', $selectedIds)
                ->orderBy('name')
                ->get(['id', 'name', 'id_number', 'phone', 'gender', 'type', 'age']);
        }

        // Only run a text search when the query is at least 4 characters
        $searchResults = collect();
        if (mb_strlen($q) >= 4) {
            $searchResults = Customer::where('active', true)
                ->where(function ($query) use ($q) {
                    $query->where('name', 'like', "%{$q}%")
                        ->orWhere('id_number', 'like', "%{$q}%");
                })
                ->when(! empty($selectedIds), fn ($query) => $query->whereNotIn('id', $selectedIds))
                ->orderBy('name')
                ->limit(15)
                ->get(['id', 'name', 'id_number', 'phone', 'gender', 'type', 'age']);
        }

        return response()->json([
            'data' => $selectedCustomers->merge($searchResults)->values(),
        ]);
    }
}
