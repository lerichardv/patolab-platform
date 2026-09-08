<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PathologistFormDataController extends Controller
{
    /**
     * Return pathologists, user catalogs, and optional specimen details needed by pathologist assignment sheets.
     */
    public function __invoke(Request $request): JsonResponse
    {
        if (! Gate::check('specimens.manage') && ! Gate::check('specimens.view') && ! Gate::check('my_assignments.view')) {
            Gate::authorize('specimens.manage');
        }

        $pathologistRoleId = Setting::where('setting_key', 'pathologist_role_id')->value('setting_value');
        $pathologists = [];
        if ($pathologistRoleId) {
            $assistantRole = Role::where('slug', 'assistant_pathologist')->first();
            $roleIds = array_filter([$pathologistRoleId, $assistantRole?->id]);
            $pathologists = User::where('active', true)
                ->whereIn('role_id', $roleIds)
                ->select('id', 'name', 'email', 'role_id')
                ->orderBy('name')
                ->get();
        }

        $usersList = User::where('active', true)
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        $specimen = null;
        if ($request->filled('specimen_id')) {
            $specimen = Specimen::with([
                'customerRelation',
                'type',
                'examination',
                'priority',
                'users',
                'collaborators',
            ])->find($request->query('specimen_id'));
        }

        return response()->json([
            'pathologists' => $pathologists,
            'usersList' => $usersList,
            'specimen' => $specimen,
        ]);
    }
}
