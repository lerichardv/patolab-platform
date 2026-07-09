import { Head } from '@inertiajs/react';
import {
    parseImport,
    importRow,
    index as examinationsIndex,
} from '@/actions/App/Http/Controllers/SpecimenTypeExaminationController';
import { ImportWizard } from '@/components/import-wizard';
import type { FieldConfig } from '@/components/import-wizard';

export default function SpecimenTypeExaminationImport() {
    const fields: FieldConfig[] = [
        {
            name: 'specimen_type',
            label: 'Tipo de Muestra',
            required: true,
            type: 'string',
        },
        {
            name: 'name',
            label: 'Nombre del Análisis',
            required: true,
            type: 'string',
        },
        {
            name: 'description',
            label: 'Descripción (Opcional)',
            required: false,
            type: 'string',
        },
        {
            name: 'price',
            label: 'Precio (Opcional)',
            required: false,
            type: 'number',
        },
    ];

    return (
        <>
            <Head title="Importar Tipos de Análisis" />
            <ImportWizard
                title="Importar Tipos de Análisis"
                description="Cargue un archivo de Excel (.xlsx, .xls) o CSV para importar tipos de análisis de forma masiva a la plataforma."
                fields={fields}
                parseUrl={parseImport().url}
                importRowUrl={importRow().url}
                redirectUrl={examinationsIndex().url}
            />
        </>
    );
}
