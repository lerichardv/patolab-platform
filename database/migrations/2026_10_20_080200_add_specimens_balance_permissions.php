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
        $permissions = [
            [
                'name' => 'Ver Balance de Muestras',
                'slug' => 'specimens_balance.view',
            ],
            [
                'name' => 'Gestionar Balance de Muestras',
                'slug' => 'specimens_balance.manage',
            ],
        ];

        $createdPermissions = [];
        foreach ($permissions as $perm) {
            $createdPermissions[] = Permission::updateOrCreate(
                ['slug' => $perm['slug']],
                ['name' => $perm['name']]
            );
        }

        $permIds = collect($createdPermissions)->pluck('id')->toArray();

        // Assign to Admin role
        $admin = Role::where('slug', 'admin')->first();
        if ($admin) {
            $admin->permissions()->syncWithoutDetaching($permIds);
        }

        // Assign to Pathologist role
        $pathologist = Role::where('slug', 'pathologist')->first();
        if ($pathologist) {
            $pathologist->permissions()->syncWithoutDetaching($permIds);
        }

        // Assign to Assistant Pathologist role
        $assistant = Role::where('slug', 'assistant_pathologist')->first();
        if ($assistant) {
            $assistant->permissions()->syncWithoutDetaching($permIds);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Permission::whereIn('slug', [
            'specimens_balance.view',
            'specimens_balance.manage',
        ])->delete();
    }
};
