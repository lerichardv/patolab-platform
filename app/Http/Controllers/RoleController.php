<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

use Illuminate\Support\Facades\Gate;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('roles.view');
        $roles = Role::orderBy('name')->get();
        $permissions = Permission::all();

        $selectedRoleId = $request->input('role_id', $roles->first()?->id);
        $selectedRole = $selectedRoleId ? Role::with('permissions')->find($selectedRoleId) : null;

        return Inertia::render('roles/index', [
            'roles' => $roles,
            'selectedRoleId' => $selectedRoleId ? (int) $selectedRoleId : null,
            'selectedRole' => $selectedRole,
            'permissions' => $permissions,
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('roles.create');
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
        ]);

        return redirect()->route('roles.index', ['role_id' => $role->id]);
    }

    public function update(Request $request, Role $role)
    {
        Gate::authorize('roles.edit');
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,'.$role->id,
            'permission_ids' => 'nullable|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        $updateData = [
            'name' => $validated['name'],
        ];

        // Do not update the slug for protected roles (ID 1 and 2) to prevent breaking system logic
        if (! in_array($role->id, [1, 2])) {
            $updateData['slug'] = Str::slug($validated['name']);
        }

        $role->update($updateData);

        if ($request->has('permission_ids')) {
            $role->permissions()->sync($validated['permission_ids']);
        }

        return redirect()->route('roles.index', ['role_id' => $role->id]);
    }

    public function destroy(Role $role)
    {
        Gate::authorize('roles.delete');
        if (in_array($role->id, [1, 2])) {
            return redirect()->back()->withErrors(['error' => 'No se pueden eliminar los roles principales del sistema.']);
        }

        if ($role->users()->count() > 0) {
            return redirect()->back()->withErrors(['error' => 'No se puede eliminar este rol porque tiene usuarios asignados.']);
        }

        $role->delete();

        return redirect()->route('roles.index');
    }
}
