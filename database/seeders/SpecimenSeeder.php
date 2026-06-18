<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Priority;
use App\Models\PrioritySpecimenOrder;
use App\Models\Referrer;
use App\Models\Sequence;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SpecimenSeeder extends Seeder
{
    public function run(): void
    {
        $customers = Customer::all();
        if ($customers->isEmpty()) {
            $customers = collect([
                Customer::create([
                    'name' => 'Cliente de Prueba',
                    'email' => 'cliente@test.com',
                    'phone' => '12345678',
                    'company' => 'Empresa Test',
                    'address' => 'Dirección 1',
                    'active' => true,
                ]),
            ]);
        }

        $specimenTypes = SpecimenType::all();
        if ($specimenTypes->isEmpty()) {
            $specimenTypes = collect([
                SpecimenType::create([
                    'name' => 'Biopsia',
                    'description' => 'Biopsia General',
                    'active' => true,
                ]),
            ]);
        }

        $categories = SpecimenCategory::all();
        if ($categories->isEmpty()) {
            $categories = collect([
                SpecimenCategory::create([
                    'name' => 'Urgentes',
                    'quantity' => 4,
                    'unit' => 'days',
                    'active' => true,
                ]),
            ]);
        }

        $referrers = Referrer::all();
        if ($referrers->isEmpty()) {
            $referrers = collect([
                Referrer::create([
                    'name' => 'Dr. Prueba',
                    'type' => 1,
                    'phone' => '12345678',
                    'email' => 'doc@test.com',
                    'active' => true,
                ]),
            ]);
        }

        $priorities = Priority::all();
        if ($priorities->isEmpty()) {
            return;
        }

        $statuses = ['received', 'processing', 'finalized', 'delivered'];

        for ($i = 1; $i <= 20; $i++) {
            $customer = $customers->random();
            $type = $specimenTypes->random();

            // Get an examination belonging to this specimen type or create one
            $examination = SpecimenTypeExamination::where('specimen_type', $type->id)->inRandomOrder()->first();
            if (! $examination) {
                $examination = SpecimenTypeExamination::create([
                    'specimen_type' => $type->id,
                    'name' => 'Examen General de '.$type->name,
                    'description' => 'Descripción del examen de prueba.',
                    'active' => true,
                ]);
            }

            $category = $categories->random();
            $referrer = $referrers->random();
            $priority = $priorities->random();

            // Sequence code generation
            $sequence = Sequence::where('specimen_type', $type->id)->where('active', true)->first();
            if ($sequence) {
                $paddedSeq = str_pad($sequence->current_sequence, $sequence->fill ?? 4, '0', STR_PAD_LEFT);
                $paddedMonth = str_pad($sequence->month, 2, '0', STR_PAD_LEFT);
                $sequenceCode = $sequence->prefix.$sequence->separator.$paddedSeq.$sequence->separator.$paddedMonth.$sequence->separator.$sequence->year;
                $sequence->increment('current_sequence');
            } else {
                $sequenceCode = 'MOCK-'.strtoupper(substr($type->name, 0, 3)).'-'.str_pad($i, 4, '0', STR_PAD_LEFT);
            }

            // Generate past date between 1 and 60 days ago
            $createdAt = now()->subDays(rand(1, 60))->subHours(rand(0, 23))->subMinutes(rand(0, 59));

            $specimen = Specimen::create([
                'sequence_code' => $sequenceCode,
                'customer' => $customer->id,
                'specimen_type' => $type->id,
                'specimen_type_examination' => $examination->id,
                'specimen_category' => $category->id,
                'referrer' => $referrer->id,
                'anatomic_site' => 'Sitio Anatómico '.$i,
                'diagnosis' => 'Diagnóstico de prueba '.$i,
                'clinical_notes' => 'Notas clínicas generadas para la muestra '.$i,
                'status' => $statuses[array_rand($statuses)],
                'priority_id' => $priority->id,
                'active' => true,
                'access_token' => Str::random(32),
                'delivery_token' => Str::random(32),
            ]);

            // Save the exact past timestamp
            $specimen->created_at = $createdAt;
            $specimen->updated_at = $createdAt;
            $specimen->save();

            $maxOrder = PrioritySpecimenOrder::where('priority_id', $priority->id)->max('order') ?? 0;
            PrioritySpecimenOrder::create([
                'priority_id' => $priority->id,
                'specimen_id' => $specimen->id,
                'order' => $maxOrder + 1,
            ]);
        }
    }
}
