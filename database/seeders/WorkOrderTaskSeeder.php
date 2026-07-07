<?php

namespace Database\Seeders;

use App\Models\WorkOrderTask;
use Illuminate\Database\Seeder;

class WorkOrderTaskSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tasks = [
            [
                'name' => 'Recortes',
                'description' => 'Realizar recortes en las muestras.',
                'duration_unit' => 'hours',
                'duration_value' => 24,
            ],
            [
                'name' => 'Niveles',
                'description' => 'Realizar cortes en diferentes niveles.',
                'duration_unit' => 'hours',
                'duration_value' => 24,
            ],
            [
                'name' => 'Reorientaciones',
                'description' => 'Reorientar bloques de tejido.',
                'duration_unit' => 'hours',
                'duration_value' => 24,
            ],
            [
                'name' => 'Tinciones Especiales',
                'description' => 'Aplicar tinciones especiales.',
                'duration_unit' => 'hours',
                'duration_value' => 24,
            ],
            [
                'name' => 'Entrega de Material Bloques y Laminas',
                'description' => 'Entrega final de material en bloques y láminas.',
                'duration_unit' => 'hours',
                'duration_value' => 24,
            ],
        ];

        foreach ($tasks as $task) {
            WorkOrderTask::updateOrCreate(
                ['name' => $task['name']],
                $task
            );
        }
    }
}
