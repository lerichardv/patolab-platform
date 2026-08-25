import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
} from '@hello-pangea/dnd';
import { Head, router } from '@inertiajs/react';
import {
    Check,
    ChevronsUpDown,
    FileText,
    GripVertical,
    Info,
    X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import EditorLayout from '@/layouts/editor-layout';

export interface BlankReportScreenProps {
    specimen: {
        sequence_code: string;
        [key: string]: any;
    };
    templates?: any[];
    isAssigned: boolean;
    onCreateReport?: (templateIds: string[] | string | null) => void;
}

export function BlankReportScreen({
    specimen,
    templates = [],
    isAssigned,
    onCreateReport,
}: BlankReportScreenProps) {
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
        () => {
            if (templates && templates.length === 1) {
                return [String(templates[0].id)];
            }

            return [];
        },
    );

    const [isComboboxOpen, setIsComboboxOpen] = useState(false);

    // Map selected IDs to template objects in the user-specified order
    const orderedTemplates = useMemo(() => {
        if (!templates || templates.length === 0) return [];
        const templateMap = new Map(templates.map((t) => [String(t.id), t]));

        return selectedTemplateIds
            .map((id) => templateMap.get(id))
            .filter(Boolean) as any[];
    }, [templates, selectedTemplateIds]);

    const handleToggleTemplate = (templateIdStr: string) => {
        setSelectedTemplateIds((prev) => {
            if (prev.includes(templateIdStr)) {
                return prev.filter((id) => id !== templateIdStr);
            } else {
                return [...prev, templateIdStr];
            }
        });
    };

    const handleRemoveTemplate = (templateIdStr: string) => {
        setSelectedTemplateIds((prev) =>
            prev.filter((id) => id !== templateIdStr),
        );
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(selectedTemplateIds);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setSelectedTemplateIds(items);
    };

    const handleCreateReport = () => {
        if (onCreateReport) {
            onCreateReport(
                selectedTemplateIds.length > 0 ? selectedTemplateIds : null,
            );

            return;
        }

        if (
            templates &&
            templates.length > 0 &&
            selectedTemplateIds.length === 0
        ) {
            toast.error(
                'Debe seleccionar al menos una plantilla para continuar.',
            );

            return;
        }

        router.post(
            `/specimens/${specimen.sequence_code}/report-editor`,
            {
                template_id: selectedTemplateIds[0] || null,
                template_ids:
                    selectedTemplateIds.length > 0 ? selectedTemplateIds : null,
            },
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
                <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-card p-8 shadow-xl">
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
                                        Seleccionar Plantillas de Reporte
                                    </label>
                                    <Popover
                                        open={isComboboxOpen}
                                        onOpenChange={setIsComboboxOpen}
                                    >
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={isComboboxOpen}
                                                className="h-12 w-full justify-between bg-card text-left font-normal hover:bg-card"
                                            >
                                                <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                                                    {selectedTemplateIds.length ===
                                                    0 ? (
                                                        <span className="text-muted-foreground">
                                                            Seleccionar
                                                            plantillas de
                                                            reporte...
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm font-medium text-foreground">
                                                            {selectedTemplateIds.length ===
                                                            1
                                                                ? `${orderedTemplates[0]?.name || '1 plantilla seleccionada'}`
                                                                : `${selectedTemplateIds.length} plantillas seleccionadas`}
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="max-h-[350px] w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] p-0"
                                            style={{
                                                width: 'var(--radix-popover-trigger-width)',
                                            }}
                                            align="start"
                                        >
                                            <Command>
                                                <CommandInput placeholder="Buscar plantilla por nombre o examen..." />
                                                <CommandList className="max-h-[280px]">
                                                    <CommandEmpty>
                                                        No se encontraron
                                                        plantillas.
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        {templates.map(
                                                            (temp) => {
                                                                const tempIdStr =
                                                                    String(
                                                                        temp.id,
                                                                    );
                                                                const isSelected =
                                                                    selectedTemplateIds.includes(
                                                                        tempIdStr,
                                                                    );
                                                                const examName =
                                                                    temp
                                                                        .specimen_type_examination
                                                                        ?.name ||
                                                                    temp
                                                                        .examination
                                                                        ?.name ||
                                                                    '';
                                                                const typeName =
                                                                    temp
                                                                        .specimen_type
                                                                        ?.name ||
                                                                    '';
                                                                const authorName =
                                                                    temp.user
                                                                        ?.name ||
                                                                    '';

                                                                return (
                                                                    <CommandItem
                                                                        key={
                                                                            temp.id
                                                                        }
                                                                        value={`${temp.name || ''} ${typeName} ${examName} ${authorName}`}
                                                                        onSelect={() =>
                                                                            handleToggleTemplate(
                                                                                tempIdStr,
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            'flex cursor-pointer items-center justify-between gap-2 rounded-md p-2.5 transition-colors',
                                                                            isSelected
                                                                                ? '!bg-primary !text-primary-foreground hover:!bg-primary/95 aria-selected:!bg-primary aria-selected:!text-primary-foreground'
                                                                                : '!bg-white !text-foreground hover:!bg-muted/80 aria-selected:!bg-muted/80 aria-selected:!text-foreground dark:!bg-card',
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                                            <div
                                                                                className={cn(
                                                                                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                                                                                    isSelected
                                                                                        ? 'border-white bg-white text-primary shadow-xs'
                                                                                        : 'border-muted-foreground/50 bg-white text-transparent dark:bg-card',
                                                                                )}
                                                                            >
                                                                                {isSelected && (
                                                                                    <Check className="h-3 w-3 stroke-[3] text-primary" />
                                                                                )}
                                                                            </div>
                                                                            <div className="flex flex-col text-left">
                                                                                <span
                                                                                    className={cn(
                                                                                        'text-sm font-semibold',
                                                                                        isSelected
                                                                                            ? '!text-white'
                                                                                            : 'text-foreground',
                                                                                    )}
                                                                                >
                                                                                    {temp.name ||
                                                                                        'Plantilla sin nombre'}
                                                                                </span>
                                                                                <span
                                                                                    className={cn(
                                                                                        'text-xs',
                                                                                        isSelected
                                                                                            ? '!text-white/90'
                                                                                            : 'text-muted-foreground',
                                                                                    )}
                                                                                >
                                                                                    {typeName
                                                                                        ? `${typeName} - `
                                                                                        : ''}
                                                                                    {examName
                                                                                        ? `${examName}`
                                                                                        : ''}
                                                                                    {authorName
                                                                                        ? ` (${authorName})`
                                                                                        : ''}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        {examName && (
                                                                            <Badge
                                                                                variant={
                                                                                    isSelected
                                                                                        ? 'outline'
                                                                                        : 'secondary'
                                                                                }
                                                                                className={cn(
                                                                                    'shrink-0 text-[10px] font-normal',
                                                                                    isSelected
                                                                                        ? 'border-white/40 bg-white/20 text-white'
                                                                                        : 'bg-secondary text-secondary-foreground',
                                                                                )}
                                                                            >
                                                                                {
                                                                                    examName
                                                                                }
                                                                            </Badge>
                                                                        )}
                                                                    </CommandItem>
                                                                );
                                                            },
                                                        )}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>

                                    {/* Drag and Drop Area for selected templates */}
                                    {orderedTemplates.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                    Orden de Plantillas para el
                                                    Reporte (
                                                    {orderedTemplates.length})
                                                </label>
                                                <span className="text-[11px] text-muted-foreground">
                                                    Arrastre para definir el
                                                    orden
                                                </span>
                                            </div>

                                            <DragDropContext
                                                onDragEnd={handleDragEnd}
                                            >
                                                <Droppable droppableId="selected-templates-list">
                                                    {(provided) => (
                                                        <div
                                                            {...provided.droppableProps}
                                                            ref={
                                                                provided.innerRef
                                                            }
                                                            className="space-y-2"
                                                        >
                                                            {orderedTemplates.map(
                                                                (
                                                                    temp,
                                                                    index,
                                                                ) => {
                                                                    const tempIdStr =
                                                                        String(
                                                                            temp.id,
                                                                        );
                                                                    const examName =
                                                                        temp
                                                                            .specimen_type_examination
                                                                            ?.name ||
                                                                        temp
                                                                            .examination
                                                                            ?.name ||
                                                                        '';
                                                                    const typeName =
                                                                        temp
                                                                            .specimen_type
                                                                            ?.name ||
                                                                        '';

                                                                    return (
                                                                        <Draggable
                                                                            key={
                                                                                tempIdStr
                                                                            }
                                                                            draggableId={
                                                                                tempIdStr
                                                                            }
                                                                            index={
                                                                                index
                                                                            }
                                                                        >
                                                                            {(
                                                                                dragProvided,
                                                                                snapshot,
                                                                            ) => {
                                                                                const child =
                                                                                    (
                                                                                        <div
                                                                                            ref={
                                                                                                dragProvided.innerRef
                                                                                            }
                                                                                            {...dragProvided.draggableProps}
                                                                                            style={
                                                                                                dragProvided
                                                                                                    .draggableProps
                                                                                                    .style
                                                                                            }
                                                                                            className={`flex items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs transition-all ${
                                                                                                snapshot.isDragging
                                                                                                    ? 'z-[9999] border-primary bg-card shadow-2xl ring-2 ring-primary/30'
                                                                                                    : 'hover:border-border/80'
                                                                                            }`}
                                                                                        >
                                                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                                                <div
                                                                                                    {...dragProvided.dragHandleProps}
                                                                                                    className="cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                                                                                                    title="Arrastrar para reordenar"
                                                                                                >
                                                                                                    <GripVertical className="h-4 w-4" />
                                                                                                </div>

                                                                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                                                                    {index +
                                                                                                        1}
                                                                                                </span>

                                                                                                <div className="flex flex-col text-left">
                                                                                                    <span className="text-sm font-semibold text-foreground">
                                                                                                        {temp.name ||
                                                                                                            'Plantilla sin nombre'}
                                                                                                    </span>
                                                                                                    <span className="text-xs text-muted-foreground">
                                                                                                        {typeName
                                                                                                            ? `${typeName} - `
                                                                                                            : ''}
                                                                                                        {examName
                                                                                                            ? `${examName}`
                                                                                                            : ''}
                                                                                                        {temp
                                                                                                            .user
                                                                                                            ?.name
                                                                                                            ? ` (${temp.user.name})`
                                                                                                            : ''}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="flex items-center gap-2">
                                                                                                {examName && (
                                                                                                    <Badge
                                                                                                        variant="outline"
                                                                                                        className="hidden text-[10px] font-normal sm:inline-flex"
                                                                                                    >
                                                                                                        {
                                                                                                            examName
                                                                                                        }
                                                                                                    </Badge>
                                                                                                )}
                                                                                                <Button
                                                                                                    type="button"
                                                                                                    variant="ghost"
                                                                                                    size="icon"
                                                                                                    onClick={() =>
                                                                                                        handleRemoveTemplate(
                                                                                                            tempIdStr,
                                                                                                        )
                                                                                                    }
                                                                                                    className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                                                                    title="Quitar plantilla"
                                                                                                >
                                                                                                    <X className="h-4 w-4" />
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    );

                                                                                if (
                                                                                    snapshot.isDragging &&
                                                                                    typeof window !==
                                                                                        'undefined'
                                                                                ) {
                                                                                    return createPortal(
                                                                                        child,
                                                                                        document.body,
                                                                                    );
                                                                                }

                                                                                return child;
                                                                            }}
                                                                        </Draggable>
                                                                    );
                                                                },
                                                            )}
                                                            {
                                                                provided.placeholder
                                                            }
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </DragDropContext>
                                        </div>
                                    )}
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
                                    selectedTemplateIds.length === 0
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
