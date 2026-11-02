<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $permission = Permission::updateOrCreate(
            ['slug' => 'specimens.manage_status'],
            ['name' => 'Gestionar Estado de Muestras']
        );

        // Assign to Admin role
        $admin = Role::where('slug', 'admin')->first();
        if ($admin) {
            $admin->permissions()->syncWithoutDetaching([$permission->id]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permission = Permission::where('slug', 'specimens.manage_status')->first();
        if ($permission) {
            $permission->roles()->detach();
            $permission->delete();
        }
    }
};
