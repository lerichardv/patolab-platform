import { Head } from '@inertiajs/react';
import React from 'react';

import EditorLayout from '@/layouts/editor-layout';

export interface LoadingReportScreenProps {
    specimen: {
        sequence_code: string;
        [key: string]: any;
    };
}

export function LoadingReportScreen({ specimen }: LoadingReportScreenProps) {
    return (
        <EditorLayout
            breadcrumbs={[
                { title: 'Mis Asignaciones', href: '/my-assignments' },
                {
                    title: specimen.sequence_code,
                    href: `/specimens?specimen=${specimen.sequence_code}&action=view`,
                },
                { title: 'Editor de Informe', href: '#' },
            ]}
        >
            <Head title={`Cargando Editor - ${specimen.sequence_code}`} />
            <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
                <div className="relative flex items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                    <div className="absolute h-6 w-6 rounded-full bg-primary/10" />
                </div>
                <p className="animate-pulse text-sm font-semibold text-muted-foreground">
                    Cargando editor de informe...
                </p>
            </div>
        </EditorLayout>
    );
}

export default LoadingReportScreen;
