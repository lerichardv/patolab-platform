<?php

namespace Database\Seeders;

use App\Models\Bank;
use Illuminate\Database\Seeder;

class BanksSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $banks = [
            'Banpaís',
            'Banrural',
            'BAC Credomatic',
            'Banco Ficohsa',
            'Banco Atlántida',
            'Banco Cuscatlán',
            'Banco de Occidente',
            'Banco Azteca',
            'Banco Promerica',
            'Banco Davivienda',
            'Banco Ficensa',
            'Banco Lafise',
        ];

        foreach ($banks as $bank) {
            Bank::create(['name' => $bank]);
        }
    }
}
