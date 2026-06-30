<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class UsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminRole = Role::where('slug', 'admin')->first();
        $pathologistRole = Role::where('slug', 'pathologist')->first();
        $technicianRole = Role::where('slug', 'technician_pathologist')->first();

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
            [
                'name' => 'Tecnico Patologo 1',
                'email' => 'tecnico1@email.com',
                'role_id' => $technicianRole?->id,
                'active' => true,
            ],
            [
                'name' => 'Tecnico Patologo 2',
                'email' => 'tecnico2@email.com',
                'role_id' => $technicianRole?->id,
                'active' => true,
            ],
            [
                'name' => 'Tecnico Patologo 3',
                'email' => 'tecnico3@email.com',
                'role_id' => $technicianRole?->id,
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
