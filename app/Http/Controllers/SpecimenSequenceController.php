<?php

namespace App\Http\Controllers;

use App\Services\SpecimenSequenceService;
use Illuminate\Http\Request;

class SpecimenSequenceController extends Controller
{
    /**
     * Reserve a specimen sequence code.
     */
    public function reserve(Request $request)
    {
        $validated = $request->validate([
            'specimen_type_id' => 'required|integer|exists:specimen_type,id',
            'location_id' => 'nullable|integer|exists:locations,id',
        ]);

        try {
            $code = SpecimenSequenceService::reserveNextCode(
                $validated['specimen_type_id'],
                $validated['location_id'] ?? null
            );

            return response()->json([
                'code' => $code,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
