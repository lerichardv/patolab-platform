<?php

namespace Database\Seeders;

use App\Models\Referrer;
use App\Models\ReferrerType;
use Illuminate\Database\Seeder;

class ReferrerSeeder extends Seeder
{
    public function run(): void
    {
        Referrer::query()->delete();

        $types = [
            'Doctor' => [
                'Dr. Juan Carlos Villalobos',
                'Dra. Maria Fernanda Lopez',
                'Dr. Ricardo Antonio Suazo',
                'Dra. Claudia Marcela Castro',
                'Dr. Francisco Javier Ortiz',
            ],
            'Hospital' => [
                'Hospital Escuela Universitario',
                'Hospital Mario Catarino Rivas',
                'Hospital del Valle',
                'Hospital Cemesa',
            ],
            'Clinica Privada' => [
                'Clínica Médica Los Andes',
                'Centro Médico Hondureño',
                'Clínica de la Mujer',
                'Consultorios Médicos del Norte',
            ],
            'Empresa' => [
                'Seguros Atlántida',
                'Banco Occidente (Departamento Médico)',
                'Gildan Activewear',
                'Corporación Dinant',
            ],
            'Otro' => [
                'Laboratorio Externo Regional',
                'Clínica Periférica IHSS',
            ],
        ];

        foreach ($types as $typeName => $names) {
            $type = ReferrerType::updateOrCreate(
                ['name' => $typeName],
                ['active' => true]
            );

            foreach ($names as $name) {
                Referrer::create([
                    'name' => $name,
                    'referrer_type' => $type->id,
                    'phone' => '9'.rand(700, 999).'-'.rand(1000, 9999),
                    'email' => strtolower(str_replace([' ', '.'], ['', ''], $name)).'@ejemplo.com',
                    'address' => "Colonia El Prado, Edificio $typeName, Local ".rand(1, 50),
                    'active' => true,
                ]);
            }
        }
    }
}
