<?php

namespace Database\Seeders;

use App\Models\Priority;
use Illuminate\Database\Seeder;

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
