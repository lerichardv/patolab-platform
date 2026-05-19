<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use App\Models\Specimen;
use App\Models\Customer;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\SpecimenCategory;
use App\Models\Referrer;
use App\Models\Priority;
use App\Models\PrioritySpecimenOrder;

class SpecimenSeeder extends Seeder
{
    public function run(): void
    {
        $customer = Customer::first() ?? Customer::create([
            'name' => 'Cliente de Prueba', 'email' => 'cliente@test.com', 'phone' => '12345678', 'company' => 'Empresa Test', 'address' => 'Dirección 1'
        ]);
        
        $type = SpecimenType::first() ?? SpecimenType::create(['name' => 'Tipo Prueba']);
        $examination = SpecimenTypeExamination::first() ?? SpecimenTypeExamination::create(['name' => 'Examen Prueba']);
        $category = SpecimenCategory::first() ?? SpecimenCategory::create(['name' => 'Categoría Prueba', 'quantity' => 1, 'unit' => 'days']);
        $referrer = Referrer::first() ?? Referrer::create(['name' => 'Dr. Prueba', 'type' => 1, 'phone' => '123', 'email' => 'doc@test.com']);
        $priorities = Priority::all();

        if ($priorities->isEmpty()) {
            return;
        }

        $statuses = ['received', 'processing', 'finalized', 'delivered'];

        for ($i = 1; $i <= 10; $i++) {
            $priority = $priorities->random();
            
            $specimen = Specimen::create([
                'customer' => $customer->id,
                'specimen_type' => $type->id,
                'specimen_type_examination' => $examination->id,
                'specimen_category' => $category->id,
                'referrer' => $referrer->id,
                'anatomic_site' => 'Sitio Anatómico ' . $i,
                'diagnosis' => 'Diagnóstico de prueba ' . $i,
                'clinical_notes' => 'Notas clínicas generadas para la muestra ' . $i,
                'status' => $statuses[array_rand($statuses)],
                'priority_id' => $priority->id,
            ]);

            $maxOrder = PrioritySpecimenOrder::where('priority_id', $priority->id)->max('order') ?? 0;
            PrioritySpecimenOrder::create([
                'priority_id' => $priority->id,
                'specimen_id' => $specimen->id,
                'order' => $maxOrder + 1,
            ]);
        }
    }
}
