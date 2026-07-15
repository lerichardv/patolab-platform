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

            // Cutting codes management
            'cutting_codes.view',
            'cutting_codes.create',
            'cutting_codes.edit',
            'cutting_codes.delete',

            // My templates management
            'my_specimen_type_templates.view',
            'my_specimen_type_templates.manage',
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

        // 4. Create Asistente Patólogo Role
        $assistantPathologist = Role::updateOrCreate(
            ['slug' => 'assistant_pathologist'],
            ['name' => 'Asistente Patólogo']
        );

        $assistantPermissions = [
            'specimens.view',
            'specimens.create',
            'specimens.edit',
            'specimens.delete',
            'specimens.manage',
            'my_assignments.view',
            'my_specimen_type_templates.view',
            'my_specimen_type_templates.manage',
            'patients.view',
            'patients.create',
            'patients.edit',
        ];

        $assistantPermissionIds = Permission::whereIn('slug', $assistantPermissions)->pluck('id');
        $assistantPathologist->permissions()->sync($assistantPermissionIds);

        // 5. Create Histotecnólogo Role
        $histotechnologist = Role::updateOrCreate(
            ['slug' => 'histotechnologist'],
            ['name' => 'Histotecnólogo']
        );

        $histotechnologistPermissions = [
            // Full work order management (admin view + CRUD)
            'work_orders.view',
            'work_orders.create',
            'work_orders.edit',
            'work_orders.delete',
            'work_orders.admin_view',
            'work_order_tasks.view',
            'work_order_tasks.create',
            'work_order_tasks.edit',
            'work_order_tasks.delete',
            'my_work_orders.view',

            // View users to assign técnicos patólogos to work orders
            'users.view',

            // View specimens to associate them with work orders
            'specimens.view',
        ];

        $histotechnologistPermissionIds = Permission::whereIn('slug', $histotechnologistPermissions)->pluck('id');
        $histotechnologist->permissions()->sync($histotechnologistPermissionIds);
    }
}
