<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        Setting::updateOrCreate(
            ['setting_key' => 'third_age_discount'],
            [
                'setting_value' => '30',
                'description' => 'Descuento para la tercera edad (30%)',
            ]
        );

        Setting::updateOrCreate(
            ['setting_key' => 'fourth_age_discount'],
            [
                'setting_value' => '40',
                'description' => 'Descuento para la cuarta edad (40%)',
            ]
        );

        Setting::updateOrCreate(
            ['setting_key' => 'pathologist_role_id'],
            [
                'setting_value' => '2',
                'description' => 'Rol que corresponde al patólogo (para gestión interna)',
            ]
        );

        Setting::updateOrCreate(
            ['setting_key' => 'pathologist_technician_role_id'],
            [
                'has_multiple_values' => '1',
                'setting_value_multiple' => '[1,2,3,4,5,6,7,8,9,10]',
                'description' => 'Rol que corresponde al técnico de patología (para gestión interna)',
            ]
        );
    }
}
