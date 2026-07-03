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
            ],
            [
                'name' => 'Niveles',
                'description' => 'Realizar cortes en diferentes niveles.',
            ],
            [
                'name' => 'Reorientaciones',
                'description' => 'Reorientar bloques de tejido.',
            ],
            [
                'name' => 'Tinciones Especiales',
                'description' => 'Aplicar tinciones especiales.',
            ],
            [
                'name' => 'Entrega de Material Bloques y Laminas',
                'description' => 'Entrega final de material en bloques y láminas.',
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
