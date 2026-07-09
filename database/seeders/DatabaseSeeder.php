<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();
        $this->call([
            PermissionsSeeder::class,
            RolesSeeder::class,
            SettingsSeeder::class,
            DepartmentSeeder::class,
            MunicipalitySeeder::class,
            // SpecimenTypeSeeder::class,
            ReferrerSeeder::class,
            LocationSeeder::class,
            SequenceSeeder::class,
            StorageSeeder::class,
            ProductSeeder::class,
            CaiRangeSeeder::class,
            PrioritySeeder::class,
            SpecimenCategorySeeder::class,
            WorkOrderTypeSeeder::class,
            WorkOrderTaskSeeder::class,
            // CustomerSeeder::class,
            BanksSeeder::class,
            UsersSeeder::class,
            // SpecimenSeeder::class,
        ]);

    }
}
