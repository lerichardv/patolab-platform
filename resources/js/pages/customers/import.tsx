import { Head } from '@inertiajs/react';
import {
    parseImport,
    importRow,
    index as customersIndex,
} from '@/actions/App/Http/Controllers/CustomerController';
import { ImportWizard } from '@/components/import-wizard';
import type { FieldConfig } from '@/components/import-wizard';

export default function CustomerImport() {
    const fields: FieldConfig[] = [
        {
            name: 'name',
            label: 'Nombre / Empresa',
            required: true,
            type: 'string',
        },
        {
            name: 'id_number',
            label: 'Identidad / RTN',
            required: true,
            type: 'string',
        },
        {
            name: 'type',
            label: 'Tipo de Cliente',
            required: true,
            type: 'select',
            options: [
                { value: 'cliente', label: 'Cliente' },
                { value: 'empresa', label: 'Empresa' },
            ],
        },
        {
            name: 'age',
            label: 'Edad (Opcional)',
            required: false,
            type: 'number',
        },
        {
            name: 'phone',
            label: 'Teléfono 1 (Opcional)',
            required: false,
            type: 'string',
        },
        {
            name: 'secondary_phone',
            label: 'Teléfono 2 (Opcional)',
            required: false,
            type: 'string',
        },
        {
            name: 'gender',
            label: 'Género (Opcional)',
            required: false,
            type: 'select',
            options: [
                { value: 'Masculino', label: 'Masculino' },
                { value: 'Femenino', label: 'Femenino' },
                { value: 'Otro', label: 'Otro' },
            ],
        },
        {
            name: 'email',
            label: 'Correo (Opcional)',
            required: false,
            type: 'string',
        },
        {
            name: 'state',
            label: 'Departamento (Opcional)',
            required: false,
            type: 'string',
        },
        {
            name: 'city',
            label: 'Municipio (Opcional)',
            required: false,
            type: 'string',
        },
        {
            name: 'address',
            label: 'Dirección (Opcional)',
            required: false,
            type: 'string',
        },
    ];

    return (
        <>
            <Head title="Importar Clientes" />
            <ImportWizard
                title="Importar Clientes"
                description="Cargue un archivo de Excel (.xlsx, .xls) o CSV para importar clientes de forma masiva a la plataforma."
                fields={fields}
                parseUrl={parseImport().url}
                importRowUrl={importRow().url}
                redirectUrl={customersIndex().url}
            />
        </>
    );
}

CustomerImport.layout = {
    breadcrumbs: [
        {
            title: 'Clientes',
            href: '/customers',
        },
        {
            title: 'Importar Clientes',
            href: '/customers/import',
        },
    ],
};
