<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\SpecimenCategory;

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
