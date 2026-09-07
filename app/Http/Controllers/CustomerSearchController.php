<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

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
                ->get(['id', 'name', 'id_number', 'phone', 'gender', 'type', 'age', 'email', 'secondary_phone', 'state', 'city', 'address']);
        }

        // Only run a text search when the query is at least 4 characters
        $searchResults = collect();
        $asciiQ = Str::ascii($q);
        $alphanumeric = preg_replace('/[^a-zA-Z0-9]/', '', $q);
        $words = array_values(array_filter(preg_split('/\s+/', preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $q))));
        $wordsAscii = array_values(array_filter(preg_split('/\s+/', preg_replace('/[^a-zA-Z0-9\s]/', ' ', $asciiQ))));

        if (mb_strlen($q) >= 4 || mb_strlen($alphanumeric) >= 4) {
            $searchResults = Customer::where('active', true)
                ->where(function ($query) use ($q, $asciiQ, $alphanumeric, $words, $wordsAscii) {
                    $query->where('name', 'like', "%{$q}%");
                    if ($asciiQ !== $q) {
                        $query->orWhere('name', 'like', "%{$asciiQ}%");
                    }

                    if (count($words) > 1) {
                        $query->orWhere(function ($wq) use ($words) {
                            foreach ($words as $w) {
                                $wq->where('name', 'like', "%{$w}%");
                            }
                        });
                    }

                    if (count($wordsAscii) > 1 && $wordsAscii !== $words) {
                        $query->orWhere(function ($wq) use ($wordsAscii) {
                            foreach ($wordsAscii as $w) {
                                $wq->where('name', 'like', "%{$w}%");
                            }
                        });
                    }

                    $query->orWhere('id_number', 'like', "%{$q}%");
                    if ($alphanumeric !== '') {
                        $query->orWhereRaw("REPLACE(REPLACE(REPLACE(id_number, '-', ''), ' ', ''), '.', '') LIKE ?", ["%{$alphanumeric}%"]);
                    }
                })
                ->when(! empty($selectedIds), fn ($query) => $query->whereNotIn('id', $selectedIds))
                ->orderBy('name')
                ->limit(15)
                ->get(['id', 'name', 'id_number', 'phone', 'gender', 'type', 'age', 'email', 'secondary_phone', 'state', 'city', 'address']);
        }

        return response()->json([
            'data' => $selectedCustomers->merge($searchResults)->values(),
        ]);
    }
}
