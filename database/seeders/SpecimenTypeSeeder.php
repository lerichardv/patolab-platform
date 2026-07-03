<?php

namespace Database\Seeders;

use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Illuminate\Database\Seeder;

class SpecimenTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            'Biopsia' => [
                'Apendicectomía',
                'Vesícula Biliar No Oncológica',
                'Vesícula Biliar Oncológica',
                'Mama (Nódulo Benigno)',
                'Mama Tumorectomía Oncológica',
                'Mama Postquimioterapia (Mastectomía Radical)',
                'Prostatectomía No Oncológica',
                'Rtup',
                'Biopsia De Hernia De Núcleo Pulposo',
                'Biopsia Ósea No Oncológica',
            ],
            'Citología' => [
                'Citología Cervico-Vaginal',
                'Citología de Líquido Ascítico',
                'Citología de Líquido Pleural',
                'Citología de Orina',
                'Citología de Esputo',
            ],
            'Líquidos' => [
                'Líquido Cefalorraquídeo',
                'Líquido Sinovial',
                'Líquido Pericárdico',
            ],
            'Inmunohistoquímica' => [
                'Marcadores de Mama (ER, PR, HER2, Ki67)',
                'Panel de Linfoma',
                'Panel de Próstata',
            ],
        ];

        // All other types from previous list
        $allTypes = [
            'Biopsia', 'Citología', 'Líquidos', 'Inter Consulta', 'Coloraciones Especiales',
            'Inmunohistoquímica', 'Biopsia Congelada', 'IHSS', 'Biopsia Rp', 'Patologia',
            'Citología Cliente', 'Lamina liquido', 'Inmunohistoquímica (Labopat)',
            'Traducción', 'LABOTECH', 'Alquiler', 'Revisión Bloques', 'Oncotype',
            'Alquiler Cena', 'Coloraciones Especiales (Labopat)', 'Hibridacion Insitu',
            'Citologia Liquida', 'Citologia Convencional',
        ];

        foreach ($allTypes as $typeName) {
            $type = SpecimenType::updateOrCreate(
                ['name' => $typeName],
                [
                    'description' => 'Descripción para '.$typeName,
                    'active' => true,
                ]
            );

            $exams = $types[$typeName] ?? [];

            if (empty($exams)) {
                // Default generic exams if none specified
                for ($i = 1; $i <= 3; $i++) {
                    $exam = SpecimenTypeExamination::updateOrCreate(
                        [
                            'specimen_type' => $type->id,
                            'name' => "Análisis General $i de $typeName",
                        ],
                        [
                            'description' => "Descripción automática para $typeName.",
                            'active' => true,
                        ]
                    );
                    $this->seedPrices($exam);
                }
            } else {
                foreach ($exams as $examName) {
                    $exam = SpecimenTypeExamination::updateOrCreate(
                        [
                            'specimen_type' => $type->id,
                            'name' => $examName,
                        ],
                        [
                            'description' => "Análisis especializado de $examName para $typeName.",
                            'active' => true,
                        ]
                    );
                    $this->seedPrices($exam);
                }
            }
        }
    }

    private function seedPrices(SpecimenTypeExamination $exam): void
    {
        $exam->prices()->delete();
        $numPrices = rand(2, 4);
        $basePrice = rand(5, 20) * 100;
        $previousPrice = $basePrice;

        for ($i = 0; $i < $numPrices; $i++) {
            if ($i === 0) {
                $amount = $basePrice;
            } else {
                $discountPercent = rand(10, 25);
                $amount = $previousPrice * (1 - $discountPercent / 100);
            }

            $amount = round($amount / 100) * 100;
            if ($amount < 100) {
                $amount = 100;
            }
            $exam->prices()->create(['amount' => $amount]);
            $previousPrice = $amount;
        }
    }
}
