<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $departments = [
            ['name' => 'Atlántida', 'code' => '01'],
            ['name' => 'Colón', 'code' => '02'],
            ['name' => 'Comayagua', 'code' => '03'],
            ['name' => 'Copán', 'code' => '04'],
            ['name' => 'Cortés', 'code' => '05'],
            ['name' => 'Choluteca', 'code' => '06'],
            ['name' => 'El Paraíso', 'code' => '07'],
            ['name' => 'Francisco Morazán', 'code' => '08'],
            ['name' => 'Gracias a Dios', 'code' => '09'],
            ['name' => 'Intibucá', 'code' => '10'],
            ['name' => 'Islas de la Bahía', 'code' => '11'],
            ['name' => 'La Paz', 'code' => '12'],
            ['name' => 'Lempira', 'code' => '13'],
            ['name' => 'Ocotepeque', 'code' => '14'],
            ['name' => 'Olancho', 'code' => '15'],
            ['name' => 'Santa Bárbara', 'code' => '16'],
            ['name' => 'Valle', 'code' => '17'],
            ['name' => 'Yoro', 'code' => '18'],
        ];

        foreach ($departments as $dept) {
            Department::updateOrCreate(
                ['code' => $dept['code']],
                ['name' => $dept['name']]
            );
        }
    }
}
