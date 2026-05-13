<?php

namespace Database\Seeders;

use App\Models\Location;
use App\Models\Sequence;
use App\Models\SpecimenType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SequenceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function up(): void
    {
        // Spanish: Limpiar secuencias anteriores antes de sembrar
        Sequence::truncate();

        $location = Location::first();
        $specimenTypes = SpecimenType::limit(3)->get();

        if ($location && $specimenTypes->count() > 0) {
            foreach ($specimenTypes as $type) {
                // Sanitize prefix: remove special characters and tildes
                // Slug helps but we want just the letters, so we use transliterate
                $cleanName = Str::ascii($type->name);
                $prefix = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $cleanName), 0, 3));
                
                Sequence::create([
                    'location_id' => $location->id,
                    'specimen_type' => $type->id,
                    'prefix' => $prefix,
                    'separator' => '-',
                    'fill' => 4,
                    'month' => (int) date('m'),
                    'year' => (int) date('Y'),
                    'current_sequence' => 1,
                    'active' => true,
                ]);
            }
        }
    }

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->up();
    }
}
