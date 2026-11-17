<?php

namespace Database\Seeders;

use App\Models\Laboratory;
use Illuminate\Database\Seeder;

class LaboratorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Laboratory::firstOrCreate(
            ['name' => 'Laboratorio Patolab'],
            ['is_default' => true, 'is_active' => true]
        );
    }
}
