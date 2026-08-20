import { Head, router } from '@inertiajs/react';
import { FileText, Info } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import EditorLayout from '@/layouts/editor-layout';

export interface BlankReportScreenProps {
    specimen: {
        sequence_code: string;
        [key: string]: any;
    };
    templates?: any[];
    isAssigned: boolean;
    onCreateReport?: (templateId: string | null) => void;
}

export function BlankReportScreen({
    specimen,
    templates,
    isAssigned,
    onCreateReport,
}: BlankReportScreenProps) {
    const [userSelectedTemplateId, setUserSelectedTemplateId] = useState<
        string | null
    >(null);

    const selectedTemplateId =
        userSelectedTemplateId !== null
            ? userSelectedTemplateId
            : templates && templates.length === 1
              ? String(templates[0].id)
              : '';

    const handleCreateReport = () => {
        if (onCreateReport) {
            onCreateReport(selectedTemplateId || null);

            return;
        }

        if (templates && templates.length > 0 && !selectedTemplateId) {
            toast.error('Debe seleccionar una plantilla para continuar.');

            return;
        }

        router.post(
            `/specimens/${specimen.sequence_code}/report-editor`,
            { template_id: selectedTemplateId || null },
            {
                onSuccess: () => {
                    toast.success(
                        'Reporte creado y estado actualizado a revisión macroscópica',
                    );
                },
                onError: (errors) => {
                    toast.error('Error al crear el reporte');
                    console.error(errors);
                },
            },
        );
    };

    return (
        <EditorLayout
            breadcrumbs={[
                { title: 'Mis Asignaciones', href: '/my-assignments' },
                { title: 'Editor de Informe', href: '#' },
            ]}
        >
            <Head title={`Crear Reporte - ${specimen.sequence_code}`} />
            <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
                <div className="relative max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-card p-8 shadow-xl backdrop-blur-md">
                    <div className="absolute top-0 right-0 left-0 h-1.5 bg-primary" />
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <FileText className="h-8 w-8" />
                    </div>
                    <h2 className="mb-3 text-2xl font-bold tracking-tight">
                        Reporte no iniciado
                    </h2>
                    <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                        Esta muestra aún no posee un registro de reporte. Al
                        iniciar el reporte se creará la plantilla del documento
                        y el estado cambiará de{' '}
                        <span className="font-semibold text-primary">
                            Recibido
                        </span>{' '}
                        a{' '}
                        <span className="font-semibold text-violet-500">
                            Revisión Macroscópica
                        </span>
                        .
                    </p>
                    {!isAssigned ? (
                        <div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-left text-xs text-destructive">
                            <Info className="h-5 w-5 shrink-0 text-destructive" />
                            <div>
                                <span className="mb-0.5 block font-semibold text-destructive">
                                    Acceso no autorizado
                                </span>
                                No estás asignado a esta muestra, por lo que no
                                tienes permisos para iniciar o crear el reporte.
                            </div>
                        </div>
                    ) : (
                        <>
                            {templates && templates.length > 0 ? (
                                <div className="mb-6 text-left">
                                    <label className="mb-2 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Seleccionar Plantilla de Reporte
                                    </label>
                                    <Select
                                        value={selectedTemplateId}
                                        onValueChange={
                                            setUserSelectedTemplateId
                                        }
                                    >
                                        <SelectTrigger className="h-12 w-full text-foreground">
                                            <SelectValue placeholder="Seleccione una plantilla..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            {templates.map((temp) => (
                                                <SelectItem
                                                    key={temp.id}
                                                    value={String(temp.id)}
                                                    className="group"
                                                >
                                                    <div className="flex flex-row flex-nowrap gap-3 py-1 text-left">
                                                        <span className="text-sm font-semibold text-foreground group-focus:text-white group-data-[highlighted]:text-white">
                                                            {temp.name ||
                                                                'Plantilla sin nombre'}
                                                        </span>
                                                        <span className="mt-0.5 text-xs text-muted-foreground group-focus:text-white/80 group-data-[highlighted]:text-white/80">
                                                            {
                                                                temp
                                                                    .specimen_type
                                                                    ?.name
                                                            }{' '}
                                                            -{' '}
                                                            {
                                                                temp
                                                                    .specimen_type_examination
                                                                    ?.name
                                                            }{' '}
                                                            (
                                                            {temp.user?.name ||
                                                                'Sin propietario'}
                                                            )
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-left text-xs text-muted-foreground">
                                    <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    <div>
                                        <span className="mb-0.5 block font-semibold text-foreground">
                                            Sin plantillas disponibles
                                        </span>
                                        No se encontraron plantillas para este
                                        tipo de muestra y examen. Se creará un
                                        reporte en blanco.
                                    </div>
                                </div>
                            )}
                            <Button
                                size="lg"
                                onClick={handleCreateReport}
                                disabled={
                                    templates &&
                                    templates.length > 0 &&
                                    !selectedTemplateId
                                }
                                className="w-full cursor-pointer font-semibold shadow-md shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.99]"
                            >
                                Crear Reporte
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </EditorLayout>
    );
}

export default BlankReportScreen;
