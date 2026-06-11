<?php

namespace Database\Seeders;

use App\Models\Role;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use App\Models\User;
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
            SpecimenTypeSeeder::class,
            ReferrerSeeder::class,
            LocationSeeder::class,
            SequenceSeeder::class,
            StorageSeeder::class,
            ProductSeeder::class,
            CaiRangeSeeder::class,
            PrioritySeeder::class,
            SpecimenCategorySeeder::class,
            CustomerSeeder::class,
            BanksSeeder::class,
            // SpecimenSeeder::class,
        ]);

        $adminRole = Role::where('slug', 'admin')->first();
        $pathologistRole = Role::where('slug', 'pathologist')->first();

        $users = [
            [
                'name' => 'Dr. Lagos',
                'email' => 'dr.lagos@patolab.org',
                'role_id' => $pathologistRole?->id,
                'active' => true,
            ],
            [
                'name' => 'Patologo 3',
                'email' => 'patologo3@email.com',
                'role_id' => $pathologistRole?->id,
                'active' => true,
            ],
            [
                'name' => 'Patologo 2',
                'email' => 'patologo2@email.com',
                'role_id' => $pathologistRole?->id,
                'active' => true,
            ],
            [
                'name' => 'Patologo 1',
                'email' => 'patologo1@email.com',
                'role_id' => $pathologistRole?->id,
                'active' => true,
            ],
            [
                'name' => 'Lilly Marcelle Rios',
                'email' => 'lilly.marcelle@patolab.org',
                'role_id' => $adminRole?->id,
                'active' => true,
            ],
            [
                'name' => 'Pedro Castro',
                'email' => 'pedro.castro@patolab.org',
                'role_id' => $adminRole?->id,
                'active' => true,
            ],
            [
                'name' => 'Ana Urbina',
                'email' => 'ana.urbina@patolab.org',
                'role_id' => $adminRole?->id,
                'active' => true,
            ],
            [
                'name' => 'Rolando Urbina',
                'email' => 'davidursal23@gmail.com',
                'role_id' => $adminRole?->id,
                'active' => true,
            ],
            [
                'name' => 'Ricardo Valladares',
                'email' => 'ricardo.valladares.triminio@gmail.com',
                'role_id' => $adminRole?->id,
                'active' => true,
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => bcrypt('12345678'),
                    'role_id' => $userData['role_id'],
                    'active' => $userData['active'],
                ]
            );
        }
    }
}
