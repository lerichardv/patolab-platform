<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class MorePermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            /*
            |--------------------------------------------------------------------------
            | Rentals
            |--------------------------------------------------------------------------
            */

            ['name' => 'Ver Alquileres', 'slug' => 'rentals.view'],
            ['name' => 'Crear Alquiler', 'slug' => 'rentals.create'],
            ['name' => 'Editar Alquiler', 'slug' => 'rentals.edit'],
            ['name' => 'Eliminar Alquiler', 'slug' => 'rentals.delete'],

            /*
            |--------------------------------------------------------------------------
            | Settings
            |--------------------------------------------------------------------------
            */
            ['name' => 'Ver Configuración', 'slug' => 'settings.view'],

            /*
            |--------------------------------------------------------------------------
            | Inventory
            |--------------------------------------------------------------------------
            */
            ['name' => 'Ver Productos', 'slug' => 'products.view'],
            ['name' => 'Ver Productos en el Inventario', 'slug' => 'inventory.view'],
            ['name' => 'Ver Almacenes', 'slug' => 'storages.view'],

            /*
            |--------------------------------------------------------------------------
            | Specimens Administration
            |--------------------------------------------------------------------------
            */
            ['name' => 'Ver Tipos de Muestra', 'slug' => 'specimen_types.view'],
            ['name' => 'Ver Exámenes de Tipo de Muestra', 'slug' => 'specimen_type_examinations.view'],
            ['name' => 'Ver Categorías de Muestra', 'slug' => 'specimen_categories.view'],
            ['name' => 'Ver Secuencias', 'slug' => 'sequences.view'],

            /*
            |--------------------------------------------------------------------------
            | Remittances
            |--------------------------------------------------------------------------
            */
            ['name' => 'Ver Remitentes', 'slug' => 'referrers.view'],
            ['name' => 'Ver Tipos de Remitente', 'slug' => 'referrer_types.view'],

            /*
            |--------------------------------------------------------------------------
            | Locations
            |--------------------------------------------------------------------------
            */
            ['name' => 'Ver Sucursales', 'slug' => 'locations.view'],

            /*
            |--------------------------------------------------------------------------
            | Facturación
            |--------------------------------------------------------------------------
            */
            ['name' => 'Ver Rangos de Facturas', 'slug' => 'cai_ranges.view'],
            ['name' => 'Administrar Facturas', 'slug' => 'invoices.manage'],

            /*
            |--------------------------------------------------------------------------
            | Specimen Templates
            |--------------------------------------------------------------------------
            */
            ['name' => 'Ver Plantillas de Muestra', 'slug' => 'specimen_type_templates.view'],
            ['name' => 'Crear Plantilla de Muestra', 'slug' => 'specimen_type_templates.create'],
            ['name' => 'Editar Plantilla de Muestra', 'slug' => 'specimen_type_templates.edit'],
            ['name' => 'Eliminar Plantilla de Muestra', 'slug' => 'specimen_type_templates.delete'],
            ['name' => 'Ver Mis Plantillas de Muestra', 'slug' => 'my_specimen_type_templates.view'],
            ['name' => 'Gestionar Mis Plantillas de Muestra', 'slug' => 'my_specimen_type_templates.manage'],
        ];

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(
                ['slug' => $permission['slug']],
                ['name' => $permission['name']]
            );
        }
    }
}
