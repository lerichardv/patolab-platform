<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class AdminRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->call([
            PermissionsSeeder::class,
        ]);

        // Create Admin Role
        $admin = Role::updateOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Administrador']
        );

        // Admin gets all permissions
        $allPermissions = Permission::all();
        $admin->permissions()->sync($allPermissions->pluck('id'));
    }
}
