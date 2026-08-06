<?php

namespace Database\Seeders;

use App\Models\WorkOrderType;
use Illuminate\Database\Seeder;

class WorkOrderTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            [
                'name' => 'Recortes',
                'duration_unit' => 'days',
                'duration_value' => 5,
                'same_day_rule_enabled' => false,
                'same_day_cutoff_start' => null,
                'same_day_cutoff_end' => null,
            ],
            [
                'name' => 'Niveles',
                'duration_unit' => 'days',
                'duration_value' => 2,
                'same_day_rule_enabled' => false,
                'same_day_cutoff_start' => null,
                'same_day_cutoff_end' => null,
            ],
            [
                'name' => 'Reorientaciones',
                'duration_unit' => 'days',
                'duration_value' => 3,
                'same_day_rule_enabled' => false,
                'same_day_cutoff_start' => null,
                'same_day_cutoff_end' => null,
            ],
            [
                'name' => 'Giemsa',
                'duration_unit' => 'days',
                'duration_value' => 7,
                'same_day_rule_enabled' => false,
                'same_day_cutoff_start' => null,
                'same_day_cutoff_end' => null,
            ],
            [
                'name' => 'Ziehl Neelsen',
                'duration_unit' => 'hours',
                'duration_value' => 8,
                'same_day_rule_enabled' => true,
                'same_day_cutoff_start' => '00:00:00',
                'same_day_cutoff_end' => '12:00:00',
            ],
        ];

        foreach ($types as $type) {
            WorkOrderType::updateOrCreate(
                ['name' => $type['name']],
                $type
            );
        }
    }
}
