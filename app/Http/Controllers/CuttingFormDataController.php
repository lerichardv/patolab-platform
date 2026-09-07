<?php

namespace App\Http\Controllers;

use App\Models\Cutting;
use App\Models\CuttingCode;
use App\Models\CuttingPrefix;
use App\Models\Specimen;
use App\Models\User;
use App\Models\WorkOrderType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CuttingFormDataController extends Controller
{
    /**
     * Return all reference catalogs and cuttings data needed by ManageCuttingsSheet.
     *
     * Accepts an optional `specimen_id` query param to return fresh cuttings
     * with relationships for that specimen.
     */
    public function __invoke(Request $request): JsonResponse
    {
        if (! Gate::check('cuttings.manage') && ! Gate::check('my_assignments.view') && ! Gate::check('specimens.view')) {
            Gate::authorize('cuttings.manage');
        }

        $cuttingCodes = CuttingCode::orderByRaw('LENGTH(code) asc')->orderBy('code', 'asc')->get();
        $cuttingPrefixes = CuttingPrefix::orderByRaw('LENGTH(prefix) asc')->orderBy('prefix', 'asc')->get();
        $cuttingSlideTypes = WorkOrderType::orderBy('name')->get();
        $users = User::where('active', true)->select('id', 'name')->orderBy('name')->get();

        $cuttings = null;
        $specimen = null;

        if ($request->filled('specimen_id')) {
            $specimenId = $request->query('specimen_id');
            $specimenModel = Specimen::find($specimenId);

            if ($specimenModel) {
                $specimen = [
                    'id' => $specimenModel->id,
                    'sequence_code' => $specimenModel->sequence_code,
                ];

                $cuttings = Cutting::where('specimen_id', $specimenId)
                    ->with(['code', 'prefix', 'responsible'])
                    ->get();
            } else {
                $cuttings = [];
            }
        }

        return response()->json([
            'cuttingCodes' => $cuttingCodes,
            'cuttingPrefixes' => $cuttingPrefixes,
            'cuttingSlideTypes' => $cuttingSlideTypes,
            'users' => $users,
            'cuttings' => $cuttings,
            'specimen' => $specimen,
        ]);
    }
}
