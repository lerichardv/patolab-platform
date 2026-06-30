<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->call([
            PermissionsSeeder::class,
            MorePermissionsSeeder::class,
        ]);

        // 1. Create Admin Role
        $admin = Role::updateOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Administrador']
        );

        // Admin gets all permissions
        $allPermissions = Permission::all();
        $admin->permissions()->sync($allPermissions->pluck('id'));

        // 2. Create Patólogo Role
        $pathologist = Role::updateOrCreate(
            ['slug' => 'pathologist'],
            ['name' => 'Patólogo']
        );

        // Pathologist permissions
        $pathologistPermissions = [
            // Specimens (add, edit, delete) and view
            'specimens.view',
            'specimens.create',
            'specimens.edit',
            'specimens.delete',
            'my_assignments.view',

            // Patients (view, create, edit)
            'patients.view',
            'patients.create',
            'patients.edit',

            // Users (view only)
            'users.view',

            // All inventory permissions
            'products.create',
            'products.edit',
            'products.delete',
            'inventory.add',
            'inventory.manage',
            'storages.create',
            'storages.edit',
            'storages.delete',
            'inventory.movements.view',

            // All specimen administration except sequences
            'specimen_types.create',
            'specimen_types.edit',
            'specimen_types.delete',
            'specimen_type_examinations.create',
            'specimen_type_examinations.edit',
            'specimen_type_examinations.delete',
            'specimen_categories.create',
            'specimen_categories.edit',
            'specimen_categories.delete',
        ];

        $permissionIds = Permission::whereIn('slug', $pathologistPermissions)->pluck('id');
        $pathologist->permissions()->sync($permissionIds);

        // 3. Create Técnico Patólogo Role
        $techPathologist = Role::updateOrCreate(
            ['slug' => 'technician_pathologist'],
            ['name' => 'Técnico Patólogo']
        );

        $techPermissions = [
            'my_work_orders.view',
            'work_orders.view',
            'work_orders.create',
            'work_orders.edit',
            'work_orders.delete',
        ];

        $techPermissionIds = Permission::whereIn('slug', $techPermissions)->pluck('id');
        $techPathologist->permissions()->sync($techPermissionIds);
    }
}
