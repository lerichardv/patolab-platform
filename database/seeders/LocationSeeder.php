<?php

namespace Database\Seeders;

use App\Models\Location;
use Illuminate\Database\Seeder;

class LocationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Location::create([
            'name' => 'Patolab - Sucursal Central',
            'rtn' => '08019012345678',
            'address' => 'Colonia Médica, Calle Principal, Edificio BioLab, Tegucigalpa',
            'phone' => '+504 2239-1234',
            'email' => 'central@patolab.hn',
            'active' => true,
        ]);

        Location::create([
            'name' => 'Patolab - San Pedro Sula',
            'rtn' => '05019012345678',
            'address' => 'Barrio Los Andes, 7 Calle, entre 10 y 11 Avenida, San Pedro Sula',
            'phone' => '+504 2550-5678',
            'email' => 'sps@patolab.hn',
            'active' => true,
        ]);

        Location::create([
            'name' => 'Patolab - La Ceiba',
            'rtn' => '01019012345678',
            'address' => 'Avenida San Isidro, Frente a Parque Central, La Ceiba',
            'phone' => '+504 2443-9012',
            'email' => 'laceiba@patolab.hn',
            'active' => true,
        ]);
    }
}
