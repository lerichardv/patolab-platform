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
            */
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
            ['name' => 'Ver Mis Asignaciones', 'slug' => 'my_assignments.view'],
            ['name' => 'Acceder al Editor de Reportes', 'slug' => 'report_editor.view'],
            ['name' => 'Gestionar Cortes de Muestras', 'slug' => 'cuttings.manage'],

            /*
            |--------------------------------------------------------------------------
            | Reports
            |--------------------------------------------------------------------------
            */
            ['name' => 'Ver Reportes', 'slug' => 'reports.view'],
            ['name' => 'Exportar Reportes', 'slug' => 'reports.export'],
            ['name' => 'Ver Resumen de Facturación', 'slug' => 'reports.billing_summary.view'],
            ['name' => 'Ver Agrupación de Créditos', 'slug' => 'reports.credit_group.view'],
            ['name' => 'Ver Relación de Biopsias (Cortes)', 'slug' => 'reports.cuttings.view'],
            ['name' => 'Ver Reporte de Entrega', 'slug' => 'reports.delivery.view'],

            /*
            |--------------------------------------------------------------------------
            | Settings
            |--------------------------------------------------------------------------
            */
            ['name' => 'Administrar Configuración', 'slug' => 'settings.manage'],
            ['name' => 'Editar Configuración del Sistema', 'slug' => 'settings.edit'],
            ['name' => 'Ver Configuración', 'slug' => 'settings.view'],

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
            ['name' => 'Ver Productos', 'slug' => 'products.view'],
            ['name' => 'Ver Productos en el Inventario', 'slug' => 'inventory.view'],
            ['name' => 'Ver Almacenes', 'slug' => 'storages.view'],

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
            ['name' => 'Ver Tipos de Muestra', 'slug' => 'specimen_types.view'],
            ['name' => 'Ver Exámenes de Tipo de Muestra', 'slug' => 'specimen_type_examinations.view'],
            ['name' => 'Ver Categorías de Muestra', 'slug' => 'specimen_categories.view'],
            ['name' => 'Ver Secuencias', 'slug' => 'sequences.view'],
            ['name' => 'Ver Códigos de Casete', 'slug' => 'cutting_codes.view'],
            ['name' => 'Crear Códigos de Casete', 'slug' => 'cutting_codes.create'],
            ['name' => 'Editar Códigos de Casete', 'slug' => 'cutting_codes.edit'],
            ['name' => 'Eliminar Códigos de Casete', 'slug' => 'cutting_codes.delete'],
            ['name' => 'Ver Prefijos de Cortes', 'slug' => 'cutting_prefixes.view'],
            ['name' => 'Crear Prefijos de Cortes', 'slug' => 'cutting_prefixes.create'],
            ['name' => 'Editar Prefijos de Cortes', 'slug' => 'cutting_prefixes.edit'],
            ['name' => 'Eliminar Prefijos de Cortes', 'slug' => 'cutting_prefixes.delete'],

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
            ['name' => 'Ver Remitentes', 'slug' => 'referrers.view'],
            ['name' => 'Ver Tipos de Remitente', 'slug' => 'referrer_types.view'],

            /*
            |--------------------------------------------------------------------------
            | Locations
            |--------------------------------------------------------------------------
            */
            ['name' => 'Crear Sucursales', 'slug' => 'locations.create'],
            ['name' => 'Editar Sucursales', 'slug' => 'locations.edit'],
            ['name' => 'Eliminar Sucursales', 'slug' => 'locations.delete'],
            ['name' => 'Ver Sucursales', 'slug' => 'locations.view'],

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
            ['name' => 'Ver Rangos de Facturas', 'slug' => 'cai_ranges.view'],
            ['name' => 'Administrar Facturas', 'slug' => 'invoices.manage'],

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
            | Work Orders Administration
            |--------------------------------------------------------------------------
            */
            ['name' => 'Ver Tipos de Órdenes de trabajo', 'slug' => 'work_orders.view'],
            ['name' => 'Crear Tipo de Orden de trabajo', 'slug' => 'work_orders.create'],
            ['name' => 'Editar Tipo de Orden de trabajo', 'slug' => 'work_orders.edit'],
            ['name' => 'Eliminar Tipo de Orden de trabajo', 'slug' => 'work_orders.delete'],
            ['name' => 'Ver Tareas de Órdenes de trabajo', 'slug' => 'work_order_tasks.view'],
            ['name' => 'Crear Tarea de Orden de trabajo', 'slug' => 'work_order_tasks.create'],
            ['name' => 'Editar Tarea de Orden de trabajo', 'slug' => 'work_order_tasks.edit'],
            ['name' => 'Eliminar Tarea de Orden de trabajo', 'slug' => 'work_order_tasks.delete'],
            ['name' => 'Ver Todas las Órdenes de Trabajo', 'slug' => 'work_orders.admin_view'],
            ['name' => 'Ver Mis Órdenes de Trabajo', 'slug' => 'my_work_orders.view'],

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

            /*
            |--------------------------------------------------------------------------
            | AI Assistant
            |--------------------------------------------------------------------------
            */
            ['name' => 'Ver Asistente de IA', 'slug' => 'ai_assistant.view'],

            /*
            |--------------------------------------------------------------------------
            | Dashboard
            |--------------------------------------------------------------------------
            */
            ['name' => 'Ver Tarjetas de Resumen de Dashboard', 'slug' => 'dashboard.resume_cards.view'],
        ];

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(
                ['slug' => $permission['slug']],
                ['name' => $permission['name']]
            );
        }
    }
}
