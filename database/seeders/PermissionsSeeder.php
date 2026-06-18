<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [

            /*
            |--------------------------------------------------------------------------
            | Users
            |--------------------------------------------------------------------------
            */

            ['name' => 'Ver Usuarios', 'slug' => 'users.view'],
            ['name' => 'Crear Usuarios', 'slug' => 'users.create'],
            ['name' => 'Editar Usuarios', 'slug' => 'users.edit'],
            ['name' => 'Eliminar Usuarios', 'slug' => 'users.delete'],

            /*
            |--------------------------------------------------------------------------
            | User Commission Rules
            |--------------------------------------------------------------------------
            |*/

            ['name' => 'Ver Comisiones de Usuarios', 'slug' => 'user_commission_rules.view'],
            ['name' => 'Crear Comisiones de Usuarios', 'slug' => 'user_commission_rules.create'],
            ['name' => 'Editar Comisiones de Usuarios', 'slug' => 'user_commission_rules.edit'],
            ['name' => 'Eliminar Comisiones de Usuarios', 'slug' => 'user_commission_rules.delete'],

            /*
            |--------------------------------------------------------------------------
            | Roles
            |--------------------------------------------------------------------------
            */

            ['name' => 'Ver Roles', 'slug' => 'roles.view'],
            ['name' => 'Crear Roles', 'slug' => 'roles.create'],
            ['name' => 'Editar Roles', 'slug' => 'roles.edit'],
            ['name' => 'Eliminar Roles', 'slug' => 'roles.delete'],

            /*
            |--------------------------------------------------------------------------
            | Patients
            |--------------------------------------------------------------------------
            */

            ['name' => 'Ver Pacientes', 'slug' => 'patients.view'],
            ['name' => 'Crear Pacientes', 'slug' => 'patients.create'],
            ['name' => 'Editar Pacientes', 'slug' => 'patients.edit'],
            ['name' => 'Eliminar Pacientes', 'slug' => 'patients.delete'],

            /*
            |--------------------------------------------------------------------------
            | Specimens
            |--------------------------------------------------------------------------
            */

            ['name' => 'Ver Muestras', 'slug' => 'specimens.view'],
            ['name' => 'Crear Muestras', 'slug' => 'specimens.create'],
            ['name' => 'Editar Muestras', 'slug' => 'specimens.edit'],
            ['name' => 'Eliminar Muestras', 'slug' => 'specimens.delete'],
            ['name' => 'Asignar Patólogos a Muestras', 'slug' => 'specimens.manage'],

            /*
            |--------------------------------------------------------------------------
            | Reports
            |--------------------------------------------------------------------------
            */

            ['name' => 'Ver Reportes', 'slug' => 'reports.view'],
            ['name' => 'Exportar Reportes', 'slug' => 'reports.export'],

            /*
            |--------------------------------------------------------------------------
            | Settings
            |--------------------------------------------------------------------------
            */

            ['name' => 'Administrar Configuración', 'slug' => 'settings.manage'],
            ['name' => 'Editar Configuración del Sistema', 'slug' => 'settings.edit'],

            /*
            |--------------------------------------------------------------------------
            | Inventory
            |--------------------------------------------------------------------------
            */

            ['name' => 'Crear Productos', 'slug' => 'products.create'],
            ['name' => 'Editar Productos', 'slug' => 'products.edit'],
            ['name' => 'Eliminar Productos', 'slug' => 'products.delete'],
            ['name' => 'Agregar Productos al Inventario', 'slug' => 'inventory.add'],
            ['name' => 'Abastecer Productos al Inventario', 'slug' => 'inventory.manage'],
            ['name' => 'Crear Almacenes', 'slug' => 'storages.create'],
            ['name' => 'Editar Almacenes', 'slug' => 'storages.edit'],
            ['name' => 'Eliminar Almacenes', 'slug' => 'storages.delete'],
            ['name' => 'Ver Historial de Movimientos de Inventario', 'slug' => 'inventory.movements.view'],

            /*
            |--------------------------------------------------------------------------
            | Specimens Administration
            |--------------------------------------------------------------------------
            */

            ['name' => 'Crear Tipos de Muestra', 'slug' => 'specimen_types.create'],
            ['name' => 'Editar Tipos de Muestra', 'slug' => 'specimen_types.edit'],
            ['name' => 'Eliminar Tipos de Muestra', 'slug' => 'specimen_types.delete'],
            ['name' => 'Crear Exámenes de Tipo de Muestra', 'slug' => 'specimen_type_examinations.create'],
            ['name' => 'Editar Exámenes de Tipo de Muestra', 'slug' => 'specimen_type_examinations.edit'],
            ['name' => 'Eliminar Exámenes de Tipo de Muestra', 'slug' => 'specimen_type_examinations.delete'],
            ['name' => 'Crear Categorías de Muestra', 'slug' => 'specimen_categories.create'],
            ['name' => 'Editar Categorías de Muestra', 'slug' => 'specimen_categories.edit'],
            ['name' => 'Eliminar Categorías de Muestra', 'slug' => 'specimen_categories.delete'],
            ['name' => 'Crear Secuencias', 'slug' => 'sequences.create'],
            ['name' => 'Editar Secuencias', 'slug' => 'sequences.edit'],
            ['name' => 'Eliminar Secuencias', 'slug' => 'sequences.delete'],

            /*
            |--------------------------------------------------------------------------
            | Remittances
            |--------------------------------------------------------------------------
            */

            ['name' => 'Crear Remitentes', 'slug' => 'referrers.create'],
            ['name' => 'Editar Remitentes', 'slug' => 'referrers.edit'],
            ['name' => 'Eliminar Remitentes', 'slug' => 'referrers.delete'],
            ['name' => 'Crear Tipos de Remitente', 'slug' => 'referrer_types.create'],
            ['name' => 'Editar Tipos de Remitente', 'slug' => 'referrer_types.edit'],
            ['name' => 'Eliminar Tipos de Remitente', 'slug' => 'referrer_types.delete'],

            /*
            |--------------------------------------------------------------------------
            | Locations
            |--------------------------------------------------------------------------
            */

            ['name' => 'Crear Sucursales', 'slug' => 'locations.create'],
            ['name' => 'Editar Sucursales', 'slug' => 'locations.edit'],
            ['name' => 'Eliminar Sucursales', 'slug' => 'locations.delete'],

            /*
            |--------------------------------------------------------------------------
            | Facturación
            |--------------------------------------------------------------------------
            */

            ['name' => 'Crear Rangos de Facturas', 'slug' => 'cai_ranges.create'],
            ['name' => 'Editar Rangos de Facturas', 'slug' => 'cai_ranges.edit'],
            ['name' => 'Eliminar Rangos de Facturas', 'slug' => 'cai_ranges.delete'],
            ['name' => 'Ver Facturas', 'slug' => 'invoices.view'],
            ['name' => 'Ver Créditos', 'slug' => 'credits.view'],
            ['name' => 'Procesar Pago de Crédito', 'slug' => 'credits.manage'],
        ];

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(
                ['slug' => $permission['slug']],
                ['name' => $permission['name']]
            );
        }
    }
}
