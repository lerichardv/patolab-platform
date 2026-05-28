<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        Setting::create([
            'setting_key' => 'third_age_discount',
            'setting_value' => '30',
            'description' => 'Descuento para la tercera edad (30%)',
        ]);

        Setting::create([
            'setting_key' => 'fourth_age_discount',
            'setting_value' => '40',
            'description' => 'Descuento para la cuarta edad (40%)',
        ]);

        Setting::create([
            'setting_key' => 'pathologist_role_id',
            'setting_value' => '2',
            'description' => 'Rol que corresponde al patólogo (para gestión interna)',
        ]);
    }
}
