import { Check, FileText } from 'lucide-react';
import React, { useState } from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface Template {
    id: number | string;
    name?: string;
    specimen_type?: {
        name: string;
    };
    specimen_type_examination?: {
        name: string;
    };
    user?: {
        name: string;
    };
    [key: string]: any;
}

export interface TemplateSelectorProps {
    templates?: Template[];
    isFinished: boolean;
    hasMacroAccess: boolean;
    hasMicroAccess: boolean;
    onApplyTemplate: (templateId: string) => Promise<void> | void;
}

export default function TemplateSelector({
    templates,
    isFinished,
    hasMacroAccess,
    hasMicroAccess,
    onApplyTemplate,
}: TemplateSelectorProps) {
    const [editorTemplateId, setEditorTemplateId] = useState<string>('');
    const [isApplyTemplateOpen, setIsApplyTemplateOpen] =
        useState<boolean>(false);

    if (!templates || templates.length === 0) {
        return null;
    }

    const handleConfirmApply = async () => {
        if (!editorTemplateId) {
            return;
        }

        await onApplyTemplate(editorTemplateId);
        setIsApplyTemplateOpen(false);
        setEditorTemplateId('');
    };

    return (
        <>
            {/* Template Selector */}
            <div className="flex w-full flex-row flex-nowrap items-end gap-2.5">
                {/* Seleccionar Plantilla de Reporte on the same line */}
                <div className="flex max-w-[calc(100%-110px)] flex-col items-start gap-1.5">
                    <span className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-foreground">
                        <FileText className="h-4 w-4 text-muted-foreground" />{' '}
                        Plantilla
                    </span>
                    <div className="w-full">
                        <Select
                            value={editorTemplateId}
                            onValueChange={setEditorTemplateId}
                            disabled={
                                isFinished ||
                                (!hasMacroAccess && !hasMicroAccess)
                            }
                        >
                            <SelectTrigger className="h-10 w-full bg-card px-3 text-sm text-foreground">
                                <SelectValue placeholder="Seleccione plantilla..." />
                            </SelectTrigger>
                            <SelectContent
                                className="max-h-[300px]"
                                align="start"
                            >
                                {templates.map((temp) => (
                                    <SelectItem
                                        key={temp.id}
                                        value={String(temp.id)}
                                        className="group"
                                    >
                                        <div className="flex flex-row flex-nowrap gap-3 py-1 text-left">
                                            <span className="text-xs font-semibold text-foreground group-focus:text-white group-data-[highlighted]:text-white">
                                                {temp.name ||
                                                    'Plantilla sin nombre'}
                                            </span>
                                            <span className="mt-0.5 text-[10px] text-muted-foreground group-focus:text-white/80 group-data-[highlighted]:text-white/80">
                                                {temp.specimen_type?.name} -{' '}
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
                </div>

                {editorTemplateId && !isFinished && (
                    <Button
                        variant="default"
                        onClick={() => setIsApplyTemplateOpen(true)}
                        className="flex h-9 w-[110px] items-center gap-2 bg-primary px-5 text-sm text-primary-foreground hover:bg-primary/95"
                    >
                        <Check className="h-4 w-4" />
                        Aplicar
                    </Button>
                )}
            </div>

            {/* Confirmation dialog for applying a new template */}
            <AlertDialog
                open={isApplyTemplateOpen}
                onOpenChange={setIsApplyTemplateOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Está seguro de que desea aplicar la plantilla?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3 text-left">
                            <span>
                                Esto colocará el contenido de la plantilla al
                                inicio de cada editor y mantendrá el contenido
                                actual del reporte a continuación.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmApply}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Aplicar plantilla
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
