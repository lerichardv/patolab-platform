import {
    DragDropContext,
    Droppable,
    Draggable
    
} from '@hello-pangea/dnd';
import type {DropResult} from '@hello-pangea/dnd';
import { Check, ChevronsUpDown, FileText, GripVertical, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

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

export interface Template {
    id: number | string;
    name?: string;
    specimen_type?: {
        name: string;
    };
    specimen_type_examination?: {
        name: string;
    };
    examination?: {
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
    onApplyTemplate: (templateIds: string[] | string) => Promise<void> | void;
}

export default function TemplateSelector({
    templates,
    isFinished,
    hasMacroAccess,
    hasMicroAccess,
    onApplyTemplate,
}: TemplateSelectorProps) {
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
        [],
    );
    const [isComboboxOpen, setIsComboboxOpen] = useState<boolean>(false);
    const [isApplyTemplateOpen, setIsApplyTemplateOpen] =
        useState<boolean>(false);

    const orderedTemplates = useMemo(() => {
        if (!templates || templates.length === 0) {
return [];
}

        const templateMap = new Map(templates.map((t) => [String(t.id), t]));

        return selectedTemplateIds
            .map((id) => templateMap.get(id))
            .filter(Boolean) as Template[];
    }, [templates, selectedTemplateIds]);

    if (!templates || templates.length === 0) {
        return null;
    }

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
        if (!result.destination) {
return;
}

        const items = Array.from(selectedTemplateIds);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setSelectedTemplateIds(items);
    };

    const handleConfirmApply = async () => {
        if (selectedTemplateIds.length === 0) {
            return;
        }

        await onApplyTemplate(selectedTemplateIds);
        setIsApplyTemplateOpen(false);
        setSelectedTemplateIds([]);
    };

    const isDisabled = isFinished || (!hasMacroAccess && !hasMicroAccess);

    return (
        <div className="w-full space-y-3">
            {/* Top Selector Bar */}
            <div className="flex w-full flex-row flex-wrap items-end gap-2.5">
                <div className="flex min-w-[240px] flex-1 flex-col items-start gap-1.5">
                    <span className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-foreground">
                        <FileText className="h-4 w-4 text-muted-foreground" />{' '}
                        Plantillas
                    </span>
                    <div className="w-full">
                        <Popover
                            open={isComboboxOpen}
                            onOpenChange={setIsComboboxOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isComboboxOpen}
                                    disabled={isDisabled}
                                    className="group h-10 w-full justify-between bg-card px-3 text-left text-sm font-normal text-foreground"
                                >
                                    <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                                        {selectedTemplateIds.length === 0 ? (
                                            <span className="text-mutted-foreground group-hover:text-white">
                                                Seleccione plantilla(s)...
                                            </span>
                                        ) : (
                                            <span className="font-medium text-foreground">
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
                                    <CommandInput placeholder="Buscar plantilla..." />
                                    <CommandList className="max-h-[280px]">
                                        <CommandEmpty>
                                            No se encontraron plantillas.
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {templates.map((temp) => {
                                                const tempIdStr = String(
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
                                                    temp.examination?.name ||
                                                    '';
                                                const typeName =
                                                    temp.specimen_type?.name ||
                                                    '';
                                                const authorName =
                                                    temp.user?.name || '';

                                                return (
                                                    <CommandItem
                                                        key={temp.id}
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
                                                        <div className="flex items-center gap-2.5 overflow-hidden">
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
                                                                        'text-xs font-semibold',
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
                                                                        'text-[10px]',
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
                                                                {examName}
                                                            </Badge>
                                                        )}
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {selectedTemplateIds.length > 0 && !isFinished && (
                    <Button
                        variant="default"
                        onClick={() => setIsApplyTemplateOpen(true)}
                        className="flex h-10 items-center gap-2 bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/95"
                    >
                        <Check className="h-4 w-4" />
                        Aplicar ({selectedTemplateIds.length})
                    </Button>
                )}
            </div>

            {/* Drag & Drop Reordering Area for Selected Templates */}
            {orderedTemplates.length > 0 && !isFinished && (
                <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="text-[11px] font-semibold tracking-wider uppercase">
                            Orden de Concatenación ({orderedTemplates.length})
                        </span>
                        <span className="text-[10px]">
                            Arrastre para ordenar
                        </span>
                    </div>

                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="editor-templates-reorder">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-1.5"
                                >
                                    {orderedTemplates.map((temp, index) => {
                                        const tempIdStr = String(temp.id);
                                        const examName =
                                            temp.specimen_type_examination
                                                ?.name ||
                                            temp.examination?.name ||
                                            '';
                                        const typeName =
                                            temp.specimen_type?.name || '';

                                        return (
                                            <Draggable
                                                key={tempIdStr}
                                                draggableId={tempIdStr}
                                                index={index}
                                            >
                                                {(dragProvided, snapshot) => {
                                                    const child = (
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
                                                            className={`flex items-center justify-between gap-2 rounded-md border bg-card p-2 text-xs shadow-2xs transition-all ${
                                                                snapshot.isDragging
                                                                    ? 'z-[9999] border-primary bg-card shadow-2xl ring-2 ring-primary/30'
                                                                    : 'hover:border-border/80'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <div
                                                                    {...dragProvided.dragHandleProps}
                                                                    className="cursor-grab p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                                                                    title="Arrastrar para ordenar"
                                                                >
                                                                    <GripVertical className="h-3.5 w-3.5" />
                                                                </div>
                                                                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                                                    {index + 1}
                                                                </span>
                                                                <div className="flex flex-col text-left">
                                                                    <span className="font-semibold text-foreground">
                                                                        {temp.name ||
                                                                            'Plantilla sin nombre'}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground">
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

                                                            <div className="flex items-center gap-1.5">
                                                                {examName && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="hidden text-[9px] font-normal sm:inline-flex"
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
                                                                    className="h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                                    title="Quitar plantilla"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
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
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            )}

            {/* Confirmation dialog for applying templates */}
            <AlertDialog
                open={isApplyTemplateOpen}
                onOpenChange={setIsApplyTemplateOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Está seguro de que desea aplicar{' '}
                            {selectedTemplateIds.length === 1
                                ? 'la plantilla'
                                : 'las plantillas'}
                            ?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3 text-left">
                            <span>
                                Esto concatenará el contenido de las plantillas
                                seleccionadas en el orden especificado y lo
                                colocará al inicio de cada editor, manteniendo
                                el contenido actual del reporte a continuación.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmApply}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Aplicar{' '}
                            {selectedTemplateIds.length === 1
                                ? 'plantilla'
                                : `${selectedTemplateIds.length} plantillas`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
