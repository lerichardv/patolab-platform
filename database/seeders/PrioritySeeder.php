<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Priority;

class PrioritySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $priorities = [
            ['name' => 'Baja', 'color' => 'green', 'order' => '4'],
            ['name' => 'Media', 'color' => 'yellow', 'order' => '3'],
            ['name' => 'Alta', 'color' => 'orange', 'order' => '2'],
            ['name' => 'Urgente', 'color' => 'red', 'order' => '1'],
        ];

        foreach ($priorities as $priority) {
            Priority::create($priority);
        }
    }
}
