import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useForm } from '@inertiajs/react';
import type { Editor } from '@tiptap/react';
import {
    Check,
    ChevronsUpDown,
    Microscope,
    FileText,
    GripVertical,
    X,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
    store as storeTemplate,
    update as updateTemplate,
} from '@/actions/App/Http/Controllers/MySpecimenTypeTemplateController';
import {
    RichTextEditorArea,
    EditorToolbar,
    editorStyles,
} from '@/components/rich-text-editor';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface SpecimenTypeExamination {
    id: number;
    name: string;
}

interface SpecimenType {
    id: number;
    name: string;
    examinations: SpecimenTypeExamination[];
}

interface SectionsOrderElement {
    key: string;
    order: number;
    active: boolean;
}

interface Template {
    id: number;
    user_id: number;
    specimen_type_id: number;
    specimen_type_examination_id: number;
    clinical_details_html: string | null;
    diagnosis_html: string | null;
    macroscopy_html: string | null;
    microscopy_html: string | null;
    comments_notes_html: string | null;
    protocols_html: string | null;
    legend_html: string | null;
    sections_order?: SectionsOrderElement[] | null;
}

interface Props {
    template: Template | null;
    specimenTypes: SpecimenType[];
    onSuccess: () => void;
}

function FormCombobox({
    options,
    value,
    onChange,
    placeholder,
    emptyMessage = 'No se encontraron resultados.',
    disabled = false,
    multiple = false,
    icon,
}: {
    options: { label: string; value: string }[];
    value: string | string[];
    onChange: (value: any) => void;
    placeholder: string;
    emptyMessage?: string;
    disabled?: boolean;
    multiple?: boolean;
    icon?: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    const selectedOptions = options.filter((opt) =>
        selectedValues.includes(opt.value),
    );

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild className="w-full">
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="h-auto min-h-10 w-full justify-between px-3 py-1.5 text-left font-normal"
                    disabled={disabled}
                >
                    <div className="flex max-h-24 max-w-[90%] flex-wrap items-center gap-1.5 overflow-y-auto pr-1">
                        {icon && (
                            <span className="mr-1.5 shrink-0">{icon}</span>
                        )}
                        {selectedOptions.length > 0 ? (
                            selectedOptions.map((opt) => (
                                <span
                                    key={opt.value}
                                    className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                                >
                                    {opt.label}
                                    {multiple && (
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newValue =
                                                    selectedValues.filter(
                                                        (v) => v !== opt.value,
                                                    );
                                                onChange(newValue);
                                            }}
                                            className="ml-1 cursor-pointer rounded-full p-0.5 hover:bg-muted-foreground/20"
                                        >
                                            <X className="h-3 w-3" />
                                        </span>
                                    )}
                                </span>
                            ))
                        ) : (
                            <span className="text-muted-foreground">
                                {placeholder}
                            </span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="z-[120] w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
            >
                <Command>
                    <CommandInput placeholder="Buscar..." />
                    <CommandList>
                        {multiple && options.length > 0 && (
                            <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(options.map((o) => o.value));
                                    }}
                                    className="cursor-pointer font-medium text-primary transition-all hover:underline"
                                >
                                    Seleccionar todos
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange([]);
                                    }}
                                    className="cursor-pointer font-medium text-muted-foreground transition-all hover:text-destructive hover:underline"
                                >
                                    Deseleccionar todos
                                </button>
                            </div>
                        )}
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selectedValues.includes(
                                    option.value,
                                );

                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        onSelect={() => {
                                            if (multiple) {
                                                const newValue = isSelected
                                                    ? selectedValues.filter(
                                                          (v) =>
                                                              v !==
                                                              option.value,
                                                      )
                                                    : [
                                                          ...selectedValues,
                                                          option.value,
                                                      ];
                                                onChange(newValue);
                                            } else {
                                                onChange(option.value);
                                                setOpen(false);
                                            }
                                        }}
                                    >
                                        {multiple ? (
                                            <div
                                                className={cn(
                                                    'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-all',
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'opacity-50',
                                                )}
                                            >
                                                <Check className="h-3 w-3 stroke-[3]" />
                                            </div>
                                        ) : (
                                            <Check
                                                className={cn(
                                                    'mr-2 h-4 w-4 shrink-0',
                                                    isSelected
                                                        ? 'opacity-100'
                                                        : 'opacity-0',
                                                )}
                                            />
                                        )}
                                        <span className="truncate">
                                            {option.label}
                                        </span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default function TemplateForm({
    template,
    specimenTypes,
    onSuccess,
}: Props) {
    const defaultSectionsOrder = [
        { key: 'clinical_details_html', order: 1, active: true },
        { key: 'diagnosis_html', order: 2, active: true },
        { key: 'macroscopy_html', order: 3, active: true },
        { key: 'microscopy_html', order: 4, active: true },
        { key: 'comments_notes_html', order: 5, active: true },
        { key: 'protocols_html', order: 6, active: true },
        { key: 'legend_html', order: 7, active: true },
    ];

    const isEditMode = !!template;

    const { data, setData, post, put, processing, errors } = useForm({
        specimen_type_id: isEditMode
            ? template?.specimen_type_id?.toString() || ''
            : '',
        specimen_type_examination_id: isEditMode
            ? template?.specimen_type_examination_id?.toString() || ''
            : '',
        specimen_type_ids: [] as string[],
        specimen_type_examination_ids: [] as string[],
        clinical_details_html: template?.clinical_details_html || '',
        diagnosis_html: template?.diagnosis_html || '',
        macroscopy_html: template?.macroscopy_html || '',
        microscopy_html: template?.microscopy_html || '',
        comments_notes_html: template?.comments_notes_html || '',
        protocols_html: template?.protocols_html || '',
        legend_html: template?.legend_html || '',
        sections_order: template?.sections_order || defaultSectionsOrder,
    });

    const [sectionsOrder, setSectionsOrder] = useState<SectionsOrderElement[]>(
        () => {
            if (
                template?.sections_order &&
                Array.isArray(template.sections_order) &&
                template.sections_order.length > 0
            ) {
                return [...template.sections_order].sort(
                    (a, b) => a.order - b.order,
                );
            }

            return defaultSectionsOrder;
        },
    );

    useEffect(() => {
        setData({
            specimen_type_id: isEditMode
                ? template?.specimen_type_id?.toString() || ''
                : '',
            specimen_type_examination_id: isEditMode
                ? template?.specimen_type_examination_id?.toString() || ''
                : '',
            specimen_type_ids: [] as string[],
            specimen_type_examination_ids: [] as string[],
            clinical_details_html: template?.clinical_details_html || '',
            diagnosis_html: template?.diagnosis_html || '',
            macroscopy_html: template?.macroscopy_html || '',
            microscopy_html: template?.microscopy_html || '',
            comments_notes_html: template?.comments_notes_html || '',
            protocols_html: template?.protocols_html || '',
            legend_html: template?.legend_html || '',
            sections_order: template?.sections_order || defaultSectionsOrder,
        });

        if (
            template?.sections_order &&
            Array.isArray(template.sections_order) &&
            template.sections_order.length > 0
        ) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSectionsOrder(
                [...template.sections_order].sort((a, b) => a.order - b.order),
            );
        } else {
            setSectionsOrder(defaultSectionsOrder);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [template]);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return;
        }

        const items = Array.from(sectionsOrder);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx + 1,
        }));

        setSectionsOrder(updatedItems);
        setData('sections_order', updatedItems);
    };

    const [activeEditor, setActiveEditor] = useState<Editor | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                toast.success(
                    template ? 'Plantilla actualizada' : 'Plantilla creada',
                );
                onSuccess();
            },
            onError: (err: any) => {
                console.error(err);
                toast.error('Ocurrió un error al guardar la plantilla');
            },
        };

        if (template) {
            put(updateTemplate(template.id).url, options);
        } else {
            post(storeTemplate().url, options);
        }
    };

    // Prepare dropdown options
    const specimenTypeOptions = specimenTypes.map((st) => ({
        label: st.name,
        value: st.id.toString(),
    }));

    // Filter examinations based on selected specimen type(s)
    const filteredExaminations = isEditMode
        ? (() => {
              const selectedType = specimenTypes.find(
                  (type) => type.id.toString() === data.specimen_type_id,
              );

              return selectedType ? selectedType.examinations : [];
          })()
        : (() => {
              const selectedTypes = specimenTypes.filter((type) =>
                  data.specimen_type_ids.includes(type.id.toString()),
              );

              return selectedTypes.flatMap((type) => type.examinations);
          })();

    const examinationOptions = filteredExaminations.map((e) => ({
        label: e.name,
        value: e.id.toString(),
    }));

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: editorStyles }} />
            <form
                onSubmit={handleSubmit}
                className="flex h-full min-h-0 flex-1 flex-col"
            >
                {/* Header selection */}
                <div className="shrink-0 space-y-4 border-b border-border bg-card px-4 py-4">
                    <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-center">
                        {/* Specimen Type Select */}
                        <div className="w-full space-y-2 md:flex-1">
                            <Label htmlFor="specimen_type_id">
                                Tipo de Muestra *
                            </Label>
                            {isEditMode ? (
                                <FormCombobox
                                    options={specimenTypeOptions}
                                    value={data.specimen_type_id}
                                    onChange={(val) => {
                                        setData((prev) => ({
                                            ...prev,
                                            specimen_type_id: val,
                                            specimen_type_examination_id: '', // Reset on change
                                        }));
                                    }}
                                    placeholder="Seleccione un tipo de muestra"
                                    emptyMessage="No se encontraron tipos de muestra."
                                    icon={
                                        <Microscope className="h-4 w-4 text-muted-foreground" />
                                    }
                                />
                            ) : (
                                <FormCombobox
                                    options={specimenTypeOptions}
                                    value={data.specimen_type_ids}
                                    multiple={true}
                                    onChange={(val) => {
                                        setData((prev) => {
                                            const newSpecimenTypeIds =
                                                val as string[];
                                            const activeTypes =
                                                specimenTypes.filter((t) =>
                                                    newSpecimenTypeIds.includes(
                                                        t.id.toString(),
                                                    ),
                                                );
                                            const validExaminations =
                                                activeTypes.flatMap(
                                                    (t) => t.examinations,
                                                );
                                            const newExamIds =
                                                prev.specimen_type_examination_ids.filter(
                                                    (id) =>
                                                        validExaminations.some(
                                                            (e) =>
                                                                e.id.toString() ===
                                                                id,
                                                        ),
                                                );

                                            return {
                                                ...prev,
                                                specimen_type_ids:
                                                    newSpecimenTypeIds,
                                                specimen_type_examination_ids:
                                                    newExamIds,
                                            };
                                        });
                                    }}
                                    placeholder="Seleccione tipos de muestra"
                                    emptyMessage="No se encontraron tipos de muestra."
                                    icon={
                                        <Microscope className="h-4 w-4 text-muted-foreground" />
                                    }
                                />
                            )}
                            {(errors.specimen_type_id ||
                                errors.specimen_type_ids) && (
                                <p className="text-sm text-destructive">
                                    {errors.specimen_type_id ||
                                        errors.specimen_type_ids}
                                </p>
                            )}
                        </div>

                        {/* Specimen Type Examination Select */}
                        <div className="w-full space-y-2 md:flex-1">
                            <Label htmlFor="specimen_type_examination_id">
                                Examen *
                            </Label>
                            {isEditMode ? (
                                <FormCombobox
                                    options={examinationOptions}
                                    value={data.specimen_type_examination_id}
                                    onChange={(val) =>
                                        setData(
                                            'specimen_type_examination_id',
                                            val,
                                        )
                                    }
                                    placeholder={
                                        data.specimen_type_id
                                            ? 'Seleccione un examen'
                                            : 'Seleccione primero un tipo de muestra'
                                    }
                                    disabled={!data.specimen_type_id}
                                    emptyMessage="No se encontraron exámenes."
                                    icon={
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                    }
                                />
                            ) : (
                                <FormCombobox
                                    options={examinationOptions}
                                    value={data.specimen_type_examination_ids}
                                    multiple={true}
                                    onChange={(val) =>
                                        setData(
                                            'specimen_type_examination_ids',
                                            val,
                                        )
                                    }
                                    placeholder={
                                        data.specimen_type_ids.length > 0
                                            ? 'Seleccione exámenes'
                                            : 'Seleccione primero tipos de muestra'
                                    }
                                    disabled={
                                        data.specimen_type_ids.length === 0
                                    }
                                    emptyMessage="No se encontraron exámenes."
                                    icon={
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                    }
                                />
                            )}
                            {(errors.specimen_type_examination_id ||
                                errors.specimen_type_examination_ids) && (
                                <p className="text-sm text-destructive">
                                    {errors.specimen_type_examination_id ||
                                        errors.specimen_type_examination_ids}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Shared Toolbar */}
                <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-card">
                    <EditorToolbar editor={activeEditor} />
                </div>

                {/* Stacked Rich Text Editors */}
                <div className="min-h-0 flex-1 overflow-y-auto bg-muted/10 px-2 py-6">
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="template-editors">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-6"
                                >
                                    {sectionsOrder.map((section, index) => {
                                        const isClin =
                                            section.key ===
                                            'clinical_details_html';
                                        const isDiag =
                                            section.key === 'diagnosis_html';
                                        const isMacro =
                                            section.key === 'macroscopy_html';
                                        const isMicro =
                                            section.key === 'microscopy_html';
                                        const isComm =
                                            section.key ===
                                            'comments_notes_html';
                                        const isProt =
                                            section.key === 'protocols_html';
                                        const isLeg =
                                            section.key === 'legend_html';

                                        return (
                                            <Draggable
                                                key={section.key}
                                                draggableId={section.key}
                                                index={index}
                                            >
                                                {(provided, snapshot) => {
                                                    const child = (
                                                        <div
                                                            ref={
                                                                provided.innerRef
                                                            }
                                                            {...provided.draggableProps}
                                                            style={
                                                                provided
                                                                    .draggableProps
                                                                    .style
                                                            }
                                                            className={cn(
                                                                'space-y-2 rounded-xl border border-transparent bg-card p-4 shadow-xs transition-all duration-200',
                                                                snapshot.isDragging &&
                                                                    'w-[720px] max-w-[90vw] rotate-1 border-primary/20 bg-card/85 shadow-lg ring-1 ring-primary/10 backdrop-blur-xs',
                                                            )}
                                                        >
                                                            {/* Drag Handle Container (GripVertical + Label) */}
                                                            <div
                                                                {...provided.dragHandleProps}
                                                                className={cn(
                                                                    'mb-2 flex cursor-grab items-center gap-1.5 rounded-r-md border-l-4 py-0.5 pl-2 transition-colors select-none hover:bg-slate-100/50 active:cursor-grabbing dark:hover:bg-slate-800/30',
                                                                    isClin &&
                                                                        'border-emerald-500/85',
                                                                    isDiag &&
                                                                        'border-blue-500/80',
                                                                    isMacro &&
                                                                        'border-violet-500/80',
                                                                    isMicro &&
                                                                        'border-fuchsia-500/80',
                                                                    isComm &&
                                                                        'border-amber-500/85',
                                                                    isProt &&
                                                                        'border-blue-600/85',
                                                                    isLeg &&
                                                                        'border-slate-500/85',
                                                                )}
                                                            >
                                                                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                                                                <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">
                                                                    {isClin && (
                                                                        <>
                                                                            <FileText className="h-4 w-4 text-emerald-500" />
                                                                            Plantilla
                                                                            de
                                                                            Datos
                                                                            Clínicos
                                                                        </>
                                                                    )}
                                                                    {isDiag && (
                                                                        <>
                                                                            <FileText className="h-4 w-4 text-blue-500" />
                                                                            Plantilla
                                                                            de
                                                                            Diagnóstico
                                                                        </>
                                                                    )}
                                                                    {isMacro && (
                                                                        <>
                                                                            <Microscope className="h-4 w-4 text-violet-500" />
                                                                            Plantilla
                                                                            de
                                                                            Macroscopía
                                                                        </>
                                                                    )}
                                                                    {isMicro && (
                                                                        <>
                                                                            <Microscope className="h-4 w-4 text-fuchsia-500" />
                                                                            Plantilla
                                                                            de
                                                                            Microscopía
                                                                        </>
                                                                    )}
                                                                    {isComm && (
                                                                        <>
                                                                            <FileText className="h-4 w-4 text-amber-500" />
                                                                            Plantilla
                                                                            de
                                                                            Comentarios
                                                                            /
                                                                            Notas
                                                                        </>
                                                                    )}
                                                                    {isProt && (
                                                                        <>
                                                                            <FileText className="h-4 w-4 text-blue-600" />
                                                                            Plantilla
                                                                            de
                                                                            Protocolos
                                                                        </>
                                                                    )}
                                                                    {isLeg && (
                                                                        <>
                                                                            <FileText className="h-4 w-4 text-slate-500" />
                                                                            Plantilla
                                                                            de
                                                                            Leyenda
                                                                        </>
                                                                    )}
                                                                </h3>
                                                            </div>

                                                            {/* Rich Text Editor */}
                                                            {isClin && (
                                                                <RichTextEditorArea
                                                                    content={
                                                                        data.clinical_details_html
                                                                    }
                                                                    onChange={(
                                                                        html,
                                                                    ) =>
                                                                        setData(
                                                                            'clinical_details_html',
                                                                            html,
                                                                        )
                                                                    }
                                                                    onFocus={(
                                                                        editor,
                                                                    ) =>
                                                                        setActiveEditor(
                                                                            editor,
                                                                        )
                                                                    }
                                                                    onBlur={() => {}}
                                                                    field="clinical_details"
                                                                    label=""
                                                                />
                                                            )}
                                                            {isDiag && (
                                                                <RichTextEditorArea
                                                                    content={
                                                                        data.diagnosis_html
                                                                    }
                                                                    onChange={(
                                                                        html,
                                                                    ) =>
                                                                        setData(
                                                                            'diagnosis_html',
                                                                            html,
                                                                        )
                                                                    }
                                                                    onFocus={(
                                                                        editor,
                                                                    ) =>
                                                                        setActiveEditor(
                                                                            editor,
                                                                        )
                                                                    }
                                                                    onBlur={() => {}}
                                                                    field="diagnosis"
                                                                    label=""
                                                                />
                                                            )}
                                                            {isMacro && (
                                                                <RichTextEditorArea
                                                                    content={
                                                                        data.macroscopy_html
                                                                    }
                                                                    onChange={(
                                                                        html,
                                                                    ) =>
                                                                        setData(
                                                                            'macroscopy_html',
                                                                            html,
                                                                        )
                                                                    }
                                                                    onFocus={(
                                                                        editor,
                                                                    ) =>
                                                                        setActiveEditor(
                                                                            editor,
                                                                        )
                                                                    }
                                                                    onBlur={() => {}}
                                                                    field="macroscopy"
                                                                    label=""
                                                                />
                                                            )}
                                                            {isMicro && (
                                                                <RichTextEditorArea
                                                                    content={
                                                                        data.microscopy_html
                                                                    }
                                                                    onChange={(
                                                                        html,
                                                                    ) =>
                                                                        setData(
                                                                            'microscopy_html',
                                                                            html,
                                                                        )
                                                                    }
                                                                    onFocus={(
                                                                        editor,
                                                                    ) =>
                                                                        setActiveEditor(
                                                                            editor,
                                                                        )
                                                                    }
                                                                    onBlur={() => {}}
                                                                    field="microscopy"
                                                                    label=""
                                                                />
                                                            )}
                                                            {isComm && (
                                                                <RichTextEditorArea
                                                                    content={
                                                                        data.comments_notes_html
                                                                    }
                                                                    onChange={(
                                                                        html,
                                                                    ) =>
                                                                        setData(
                                                                            'comments_notes_html',
                                                                            html,
                                                                        )
                                                                    }
                                                                    onFocus={(
                                                                        editor,
                                                                    ) =>
                                                                        setActiveEditor(
                                                                            editor,
                                                                        )
                                                                    }
                                                                    onBlur={() => {}}
                                                                    field="comments_notes"
                                                                    label=""
                                                                />
                                                            )}
                                                            {isProt && (
                                                                <RichTextEditorArea
                                                                    content={
                                                                        data.protocols_html
                                                                    }
                                                                    onChange={(
                                                                        html,
                                                                    ) =>
                                                                        setData(
                                                                            'protocols_html',
                                                                            html,
                                                                        )
                                                                    }
                                                                    onFocus={(
                                                                        editor,
                                                                    ) =>
                                                                        setActiveEditor(
                                                                            editor,
                                                                        )
                                                                    }
                                                                    onBlur={() => {}}
                                                                    field="protocols"
                                                                    label=""
                                                                />
                                                            )}
                                                            {isLeg && (
                                                                <RichTextEditorArea
                                                                    content={
                                                                        data.legend_html
                                                                    }
                                                                    onChange={(
                                                                        html,
                                                                    ) =>
                                                                        setData(
                                                                            'legend_html',
                                                                            html,
                                                                        )
                                                                    }
                                                                    onFocus={(
                                                                        editor,
                                                                    ) =>
                                                                        setActiveEditor(
                                                                            editor,
                                                                        )
                                                                    }
                                                                    onBlur={() => {}}
                                                                    field="legend"
                                                                    label=""
                                                                />
                                                            )}
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

                {/* Footer submit action */}
                <div className="flex shrink-0 justify-end gap-3 border-t border-border bg-card px-6 py-4">
                    <Button
                        type="submit"
                        disabled={processing}
                        className="w-full cursor-pointer md:w-auto"
                    >
                        {processing && <Spinner className="mr-2" />}
                        {template ? 'Guardar Cambios' : 'Crear Plantilla'}
                    </Button>
                </div>
            </form>
        </>
    );
}
