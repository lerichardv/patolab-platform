<?php

namespace Database\Seeders;

use App\Models\Storage;
use Illuminate\Database\Seeder;

class StorageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Storage::updateOrCreate(
            ['name' => 'Almacen Principal'],
            [
                'location' => 'Edificio Central, Planta 1',
                'description' => 'Bodega principal de insumos y reactivos.',
                'active' => true,
            ]
        );
    }
}
