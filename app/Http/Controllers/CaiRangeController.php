<?php

namespace App\Http\Controllers;

use App\Models\CaiRange;
use Illuminate\Http\Request;

class CaiRangeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Check and update active CAI ranges that have expired or been exhausted
        $activeRanges = CaiRange::where('status', 'active')->get();
        foreach ($activeRanges as $range) {
            $updated = false;
            $newStatus = 'active';

            // Check if expired: deadline is past (strictly before today)
            if ($range->deadline && $range->deadline->lt(today())) {
                $newStatus = 'expired';
                $updated = true;
            }
            // Check if exhausted: last_used_number >= end_number
            elseif ($range->last_used_number >= $range->end_number) {
                $newStatus = 'exhausted';
                $updated = true;
            }

            if ($updated) {
                $range->update(['status' => $newStatus]);
            }
        }

        $query = CaiRange::with('location');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('cai', 'like', "%{$search}%")
                    ->orWhere('full_prefix', 'like', "%{$search}%");
            });
        }

        if ($request->has('status') && $request->get('status') !== 'all') {
            $query->where('status', $request->get('status'));
        }

        $caiRanges = $query->latest()->paginate(10)->withQueryString();
        $locations = \App\Models\Location::where('active', true)->get();

        return \Inertia\Inertia::render('cai-ranges/index', [
            'caiRanges' => $caiRanges,
            'locations' => $locations,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'location_id' => 'required|exists:locations,id',
            'cai' => 'required|string|max:100',
            'full_prefix' => 'required|string|max:20',
            'emission' => 'required|string|max:3',
            'establishment' => 'required|string|max:3',
            'document_type' => 'required|string|max:2',
            'start_number' => 'required|integer|min:0',
            'end_number' => 'required|integer|gt:start_number',
            'last_used_number' => 'required|integer|min:0',
            'deadline' => 'required|date',
            'status' => 'required|in:active,exhausted,expired',
            'limit_percentage_warning' => 'required|integer|min:0|max:100',
            'limit_days_warning' => 'required|integer|min:0',
            'warning_notifications_amount' => 'required|integer|min:0',
            'warning_notifications_sent' => 'required|integer|min:0',
        ]);

        CaiRange::create($validated);

        return redirect()->back();
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, CaiRange $caiRange)
    {
        $validated = $request->validate([
            'location_id' => 'required|exists:locations,id',
            'cai' => 'required|string|max:100',
            'full_prefix' => 'required|string|max:20',
            'emission' => 'required|string|max:3',
            'establishment' => 'required|string|max:3',
            'document_type' => 'required|string|max:2',
            'start_number' => 'required|integer|min:0',
            'end_number' => 'required|integer|gt:start_number',
            'last_used_number' => 'required|integer|min:0',
            'deadline' => 'required|date',
            'status' => 'required|in:active,exhausted,expired',
            'limit_percentage_warning' => 'required|integer|min:0|max:100',
            'limit_days_warning' => 'required|integer|min:0',
            'warning_notifications_amount' => 'required|integer|min:0',
            'warning_notifications_sent' => 'required|integer|min:0',
        ]);

        $caiRange->update($validated);

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(CaiRange $caiRange)
    {
        $caiRange->delete();

        return redirect()->back();
    }
}
