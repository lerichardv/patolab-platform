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

        $storages = \App\Models\Storage::all();

        foreach ($products as $productData) {
            $product = Product::create([
                'name' => $productData['name'],
                'description' => $productData['description'],
                'unit' => $productData['unit'],
                'unit_value' => $productData['unit_value'],
                'purchase_price' => $productData['purchase_price'],
                'sale_price' => 0,
                'code' => Str::upper(Str::random(8)),
                'isv' => true,
                'active' => true,
            ]);

            // Seed 1 to 4 prices (first is biggest, subsequent are cheaper)
            $product->prices()->delete();
            $numPrices = rand(1, 4);
            $basePrice = $productData['sale_price'];
            $previousPrice = $basePrice;

            for ($i = 0; $i < $numPrices; $i++) {
                if ($i === 0) {
                    $amount = $basePrice;
                } else {
                    $discountPercent = rand(10, 25);
                    $amount = $previousPrice * (1 - $discountPercent / 100);
                }

                $amount = round($amount, 2);
                $product->prices()->create(['amount' => $amount]);
                $previousPrice = $amount;
            }

            // Seed inventory for this product in all storages
            foreach ($storages as $storage) {
                \App\Models\Inventory::updateOrCreate(
                    [
                        'storage' => $storage->id,
                        'product' => $product->id,
                    ],
                    [
                        'quantity' => rand(20, 150),
                        'active' => true,
                    ]
                );
            }
        }
    }
}
