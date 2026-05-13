<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = [
            [
                'name' => 'Alcohol Etílico 70%',
                'description' => 'Desinfectante de superficies y manos.',
                'unit' => 'unit',
                'unit_value' => 1,
                'purchase_price' => 150,
                'sale_price' => 200,
            ],
            [
                'name' => 'Formol al 10% Tamponado',
                'description' => 'Fijador para muestras histológicas.',
                'unit' => 'unit',
                'unit_value' => 1,
                'purchase_price' => 450,
                'sale_price' => 600,
            ],
            [
                'name' => 'Xilol Grado Analítico',
                'description' => 'Agente aclarante para procesamiento de tejidos.',
                'unit' => 'unit',
                'unit_value' => 1,
                'purchase_price' => 800,
                'sale_price' => 1100,
            ],
            [
                'name' => 'Parafina para Inclusión',
                'description' => 'Punto de fusión 56-58°C.',
                'unit' => 'miligrams',
                'unit_value' => 1000,
                'purchase_price' => 300,
                'sale_price' => 450,
            ],
            [
                'name' => 'Portaobjetos Esmerilados',
                'description' => 'Caja de 72 unidades.',
                'unit' => 'unit',
                'unit_value' => 72,
                'purchase_price' => 120,
                'sale_price' => 180,
            ],
            [
                'name' => 'Cubreobjetos 22x22mm',
                'description' => 'Caja de 100 unidades.',
                'unit' => 'unit',
                'unit_value' => 100,
                'purchase_price' => 80,
                'sale_price' => 130,
            ],
            [
                'name' => 'Hematoxilina de Harris',
                'description' => 'Colorante nuclear.',
                'unit' => 'unit',
                'unit_value' => 1,
                'purchase_price' => 1200,
                'sale_price' => 1600,
            ],
            [
                'name' => 'Eosina Y Solución Acuosa',
                'description' => 'Colorante de contraste citoplasmático.',
                'unit' => 'unit',
                'unit_value' => 1,
                'purchase_price' => 950,
                'sale_price' => 1300,
            ],
            [
                'name' => 'Guantes de Nitrilo Azules',
                'description' => 'Talla M, caja de 100.',
                'unit' => 'unit',
                'unit_value' => 100,
                'purchase_price' => 250,
                'sale_price' => 350,
            ],
            [
                'name' => 'Bisturí Desechable #11',
                'description' => 'Para macroscopía, caja de 10.',
                'unit' => 'unit',
                'unit_value' => 10,
                'purchase_price' => 180,
                'sale_price' => 260,
            ],
        ];

        foreach ($products as $productData) {
            Product::create(array_merge($productData, [
                'code' => Str::upper(Str::random(8)),
                'isv' => true,
                'active' => true,
            ]));
        }
    }
}
