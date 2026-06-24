import { useForm } from '@inertiajs/react';
import type { Editor } from '@tiptap/react';
import {
    Check,
    ChevronsUpDown,
    Microscope,
    ChevronDown,
    FileText,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import {
    store as storeTemplate,
    update as updateTemplate,
} from '@/actions/App/Http/Controllers/SpecimenTypeTemplateController';
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

interface User {
    id: number;
    name: string;
    email: string;
}

interface SpecimenTypeExamination {
    id: number;
    name: string;
}

interface SpecimenType {
    id: number;
    name: string;
    examinations: SpecimenTypeExamination[];
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
}

interface Props {
    template: Template | null;
    specimenTypes: SpecimenType[];
    users: User[];
    onSuccess: () => void;
}

function FormCombobox({
    options,
    value,
    onChange,
    placeholder,
    emptyMessage = 'No se encontraron resultados.',
    disabled = false,
}: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    emptyMessage?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild className="w-full">
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="h-10 w-full justify-between px-3 text-left font-normal"
                    disabled={disabled}
                >
                    <span
                        className={cn(
                            'truncate',
                            !selectedOption && 'text-muted-foreground',
                        )}
                    >
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
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
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = option.value === value;

                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        onSelect={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4 shrink-0',
                                                isSelected
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
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
    users,
    onSuccess,
}: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        user_id: template?.user_id?.toString() || '',
        specimen_type_id: template?.specimen_type_id?.toString() || '',
        specimen_type_examination_id:
            template?.specimen_type_examination_id?.toString() || '',
        clinical_details_html: template?.clinical_details_html || '',
        diagnosis_html: template?.diagnosis_html || '',
        macroscopy_html: template?.macroscopy_html || '',
        microscopy_html: template?.microscopy_html || '',
        comments_notes_html: template?.comments_notes_html || '',
        protocols_html: template?.protocols_html || '',
        legend_html: template?.legend_html || '',
    });

    const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
    const [isSpecimenTypeOpen, setIsSpecimenTypeOpen] = useState(false);
    const [isExaminationOpen, setIsExaminationOpen] = useState(false);
    const [isLoadingExaminations, setIsLoadingExaminations] = useState(false);

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

    // Prepare users options for combobox
    const userOptions = users.map((u) => ({
        label: `${u.name} (${u.email})`,
        value: u.id.toString(),
    }));

    // Filter examinations based on selected specimen type
    const selectedType = specimenTypes.find(
        (type) => type.id.toString() === data.specimen_type_id,
    );
    const filteredExaminations = selectedType ? selectedType.examinations : [];

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: editorStyles }} />
            <form
                onSubmit={handleSubmit}
                className="flex h-full min-h-0 flex-1 flex-col"
            >
                {/* Header selection */}
                <div className="shrink-0 space-y-4 border-b border-border bg-card px-6 py-4">
                    {/* User Combobox */}
                    <div className="space-y-2">
                        <Label htmlFor="user_id">Usuario *</Label>
                        <FormCombobox
                            options={userOptions}
                            value={data.user_id}
                            onChange={(val) => setData('user_id', val)}
                            placeholder="Seleccione un usuario"
                            emptyMessage="No se encontraron usuarios."
                            disabled={!!template}
                        />
                        {errors.user_id && (
                            <p className="text-sm text-destructive">
                                {errors.user_id}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
                        {/* Specimen Type Select */}
                        <div className="space-y-2">
                            <Label htmlFor="specimen_type_id">
                                Tipo de Muestra *
                            </Label>
                            <Popover
                                open={isSpecimenTypeOpen}
                                onOpenChange={setIsSpecimenTypeOpen}
                            >
                                <PopoverTrigger asChild>
                                    <Button
                                        id="specimen_type_id"
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isSpecimenTypeOpen}
                                        className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
                                        disabled={!!template}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Microscope className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="truncate">
                                                {data.specimen_type_id
                                                    ? (() => {
                                                          const t =
                                                              specimenTypes.find(
                                                                  (t) =>
                                                                      t.id.toString() ===
                                                                      data.specimen_type_id,
                                                              );

                                                          return t
                                                              ? t.name
                                                              : 'Tipo seleccionado';
                                                      })()
                                                    : 'Seleccione tipo de muestra'}
                                            </span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[var(--radix-popover-trigger-width)] p-0"
                                    align="start"
                                >
                                    <Command>
                                        <CommandInput placeholder="Buscar tipo..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                No se encontraron tipos.
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {specimenTypes.map((type) => (
                                                    <CommandItem
                                                        key={type.id}
                                                        value={type.name}
                                                        onSelect={() => {
                                                            setIsLoadingExaminations(
                                                                true,
                                                            );
                                                            setData((prev) => ({
                                                                ...prev,
                                                                specimen_type_id:
                                                                    type.id.toString(),
                                                                specimen_type_examination_id:
                                                                    '',
                                                            }));
                                                            setTimeout(() => {
                                                                setIsLoadingExaminations(
                                                                    false,
                                                                );
                                                            }, 300);
                                                            setIsSpecimenTypeOpen(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-4 w-4',
                                                                data.specimen_type_id ===
                                                                    type.id.toString()
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )}
                                                        />
                                                        {type.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {errors.specimen_type_id && (
                                <p className="text-sm text-destructive">
                                    {errors.specimen_type_id}
                                </p>
                            )}
                        </div>

                        {/* Specimen Type Examination Select */}
                        <div className="space-y-2">
                            <Label htmlFor="specimen_type_examination_id">
                                Examen *
                            </Label>
                            <Popover
                                open={isExaminationOpen}
                                onOpenChange={setIsExaminationOpen}
                            >
                                <PopoverTrigger asChild>
                                    <Button
                                        id="specimen_type_examination_id"
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isExaminationOpen}
                                        className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
                                        disabled={
                                            !!template ||
                                            !data.specimen_type_id ||
                                            isLoadingExaminations
                                        }
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="truncate">
                                                {isLoadingExaminations ? (
                                                    <span className="flex items-center gap-2">
                                                        <Spinner className="h-3 w-3 animate-spin" />
                                                        Cargando exámenes...
                                                    </span>
                                                ) : !data.specimen_type_id ? (
                                                    'Seleccione tipo primero'
                                                ) : data.specimen_type_examination_id ? (
                                                    (() => {
                                                        const e =
                                                            filteredExaminations.find(
                                                                (e) =>
                                                                    e.id.toString() ===
                                                                    data.specimen_type_examination_id,
                                                            );

                                                        return e
                                                            ? e.name
                                                            : 'Examen seleccionado';
                                                    })()
                                                ) : (
                                                    'Seleccione un examen'
                                                )}
                                            </span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[var(--radix-popover-trigger-width)] p-0"
                                    align="start"
                                >
                                    <Command>
                                        <CommandInput placeholder="Buscar examen..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                No se encontraron exámenes.
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {filteredExaminations.map(
                                                    (exam) => (
                                                        <CommandItem
                                                            key={exam.id}
                                                            value={exam.name}
                                                            onSelect={() => {
                                                                setData(
                                                                    'specimen_type_examination_id',
                                                                    exam.id.toString(),
                                                                );
                                                                setIsExaminationOpen(
                                                                    false,
                                                                );
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    'mr-2 h-4 w-4',
                                                                    data.specimen_type_examination_id ===
                                                                        exam.id.toString()
                                                                        ? 'opacity-100'
                                                                        : 'opacity-0',
                                                                )}
                                                            />
                                                            {exam.name}
                                                        </CommandItem>
                                                    ),
                                                )}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {errors.specimen_type_examination_id && (
                                <p className="text-sm text-destructive">
                                    {errors.specimen_type_examination_id}
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
                <div className="min-h-0 flex-1 space-y-8 overflow-y-auto bg-muted/10 px-6 py-6">
                    <RichTextEditorArea
                        content={data.clinical_details_html}
                        onChange={(html) =>
                            setData('clinical_details_html', html)
                        }
                        onFocus={(editor) => setActiveEditor(editor)}
                        onBlur={() => {}}
                        field="clinical_details"
                        label="Plantilla de Datos Clínicos"
                    />

                    <RichTextEditorArea
                        content={data.diagnosis_html}
                        onChange={(html) => setData('diagnosis_html', html)}
                        onFocus={(editor) => setActiveEditor(editor)}
                        onBlur={() => {}}
                        field="diagnosis"
                        label="Plantilla de Diagnóstico"
                    />

                    <RichTextEditorArea
                        content={data.macroscopy_html}
                        onChange={(html) => setData('macroscopy_html', html)}
                        onFocus={(editor) => setActiveEditor(editor)}
                        onBlur={() => {}}
                        field="macroscopy"
                        label="Plantilla de Macroscopía"
                    />

                    <RichTextEditorArea
                        content={data.microscopy_html}
                        onChange={(html) => setData('microscopy_html', html)}
                        onFocus={(editor) => setActiveEditor(editor)}
                        onBlur={() => {}}
                        field="microscopy"
                        label="Plantilla de Microscopía"
                    />

                    <RichTextEditorArea
                        content={data.comments_notes_html}
                        onChange={(html) =>
                            setData('comments_notes_html', html)
                        }
                        onFocus={(editor) => setActiveEditor(editor)}
                        onBlur={() => {}}
                        field="comments_notes"
                        label="Plantilla de Comentarios / Notas"
                    />

                    <RichTextEditorArea
                        content={data.protocols_html}
                        onChange={(html) => setData('protocols_html', html)}
                        onFocus={(editor) => setActiveEditor(editor)}
                        onBlur={() => {}}
                        field="protocols"
                        label="Plantilla de Protocolos"
                    />

                    <RichTextEditorArea
                        content={data.legend_html}
                        onChange={(html) => setData('legend_html', html)}
                        onFocus={(editor) => setActiveEditor(editor)}
                        onBlur={() => {}}
                        field="legend"
                        label="Plantilla de Leyenda"
                    />
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
