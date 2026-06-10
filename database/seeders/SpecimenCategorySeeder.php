<?php

namespace Database\Seeders;

use App\Models\SpecimenCategory;
use Illuminate\Database\Seeder;

class SpecimenCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Oncológicas', 'quantity' => 10, 'unit' => 'days'],
            ['name' => 'No Oncológicas', 'quantity' => 7, 'unit' => 'days'],
            ['name' => 'Urgentes', 'quantity' => 4, 'unit' => 'days'],
            ['name' => 'Otros', 'quantity' => 12, 'unit' => 'days'],
            ['name' => 'labotech', 'quantity' => 10, 'unit' => 'days'],
        ];

        foreach ($categories as $category) {
            SpecimenCategory::create($category);
        }
    }
}
