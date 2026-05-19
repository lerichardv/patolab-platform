<?php

namespace Database\Seeders;

use App\Models\CaiRange;
use App\Models\Location;
use Illuminate\Database\Seeder;

class CaiRangeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CaiRange::truncate();
        
        $locations = Location::all();
        
        if ($locations->isEmpty()) {
            return;
        }

        $central = $locations->first();
        $sps = $locations->skip(1)->first() ?? $central;
        $ceiba = $locations->skip(2)->first() ?? $central;

        // 1. Rango Activo normal (sin alertas)
        CaiRange::create([
            'location_id' => $central->id,
            'cai' => '3B82F6-8B5CF6-F59E0B-D946EF-10B981-5E',
            'full_prefix' => '000-001-01-',
            'emission' => '000',
            'establishment' => '001',
            'document_type' => '01',
            'start_number' => 1,
            'end_number' => 1000,
            'last_used_number' => 120,
            'deadline' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
            'limit_percentage_warning' => 10,
            'limit_days_warning' => 15,
            'warning_notifications_amount' => 3,
            'warning_notifications_sent' => 0,
        ]);

        // 2. Rango Activo con alerta por fecha de vencimiento próxima (menos de 15 días)
        CaiRange::create([
            'location_id' => $sps->id,
            'cai' => '7C91E5-4A3DF2-B82C10-D946EF-20C872-6F',
            'full_prefix' => '000-002-01-',
            'emission' => '000',
            'establishment' => '002',
            'document_type' => '01',
            'start_number' => 1,
            'end_number' => 500,
            'last_used_number' => 455,
            'deadline' => now()->addDays(5)->toDateString(), // Próximo a vencer
            'status' => 'active',
            'limit_percentage_warning' => 10, // Alerta al 10% (50 facturas restantes o menos)
            'limit_days_warning' => 15, // Alerta a los 15 días
            'warning_notifications_amount' => 3,
            'warning_notifications_sent' => 1,
        ]);

        // 3. Rango Expirado (Fecha límite en el pasado)
        CaiRange::create([
            'location_id' => $ceiba->id,
            'cai' => '1A23B4-5C67D8-9E01F2-A345B6-78CD90-12',
            'full_prefix' => '000-003-01-',
            'emission' => '000',
            'establishment' => '003',
            'document_type' => '01',
            'start_number' => 1,
            'end_number' => 100,
            'last_used_number' => 99,
            'deadline' => now()->subDays(10)->toDateString(), // Vencido hace 10 días
            'status' => 'expired',
            'limit_percentage_warning' => 10,
            'limit_days_warning' => 15,
            'warning_notifications_amount' => 3,
            'warning_notifications_sent' => 3,
        ]);

        // 4. Rango Agotado
        CaiRange::create([
            'location_id' => $central->id,
            'cai' => 'F23456-E78901-D23456-C78901-B23456-A7',
            'full_prefix' => '000-001-01-',
            'emission' => '000',
            'establishment' => '001',
            'document_type' => '01',
            'start_number' => 1001,
            'end_number' => 2000,
            'last_used_number' => 2000, // Agotado
            'deadline' => now()->addMonths(2)->toDateString(),
            'status' => 'exhausted',
            'limit_percentage_warning' => 10,
            'limit_days_warning' => 15,
            'warning_notifications_amount' => 3,
            'warning_notifications_sent' => 0,
        ]);
    }
}
