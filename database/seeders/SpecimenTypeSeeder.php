<?php

namespace Database\Seeders;

use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Illuminate\Database\Seeder;

class SpecimenTypeSeeder extends Seeder
{
    public function run(): void
    {
        // Truncate only the examinations to avoid re-creating specimen types if they exist, 
        // or just use updateOrCreate for everything.
        SpecimenTypeExamination::query()->delete();

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
                    'description' => 'Descripción para ' . $typeName,
                    'active' => true,
                ]
            );

            $exams = $types[$typeName] ?? [];
            
            if (empty($exams)) {
                // Default generic exams if none specified
                for ($i = 1; $i <= 3; $i++) {
                    SpecimenTypeExamination::create([
                        'specimen_type' => $type->id,
                        'name' => "Análisis General $i de $typeName",
                        'description' => "Descripción automática para $typeName.",
                        'active' => true,
                    ]);
                }
            } else {
                foreach ($exams as $examName) {
                    SpecimenTypeExamination::create([
                        'specimen_type' => $type->id,
                        'name' => $examName,
                        'description' => "Análisis especializado de $examName para $typeName.",
                        'active' => true,
                    ]);
                }
            }
        }
    }
}
