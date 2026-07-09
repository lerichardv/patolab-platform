import { Head } from '@inertiajs/react';
import {
    parseImport,
    importRow,
    index as specimenTypesIndex,
} from '@/actions/App/Http/Controllers/SpecimenTypeController';
import { ImportWizard } from '@/components/import-wizard';
import type { FieldConfig } from '@/components/import-wizard';

export default function SpecimenTypeImport() {
    const fields: FieldConfig[] = [
        {
            name: 'name',
            label: 'Nombre',
            required: true,
            type: 'string',
        },
        {
            name: 'description',
            label: 'Descripción (Opcional)',
            required: false,
            type: 'string',
        },
    ];

    return (
        <>
            <Head title="Importar Tipos de Muestras" />
            <ImportWizard
                title="Importar Tipos de Muestras"
                description="Cargue un archivo de Excel (.xlsx, .xls) o CSV para importar tipos de muestras de forma masiva a la plataforma."
                fields={fields}
                parseUrl={parseImport().url}
                importRowUrl={importRow().url}
                redirectUrl={specimenTypesIndex().url}
            />
        </>
    );
}
