import { useForm } from '@inertiajs/react';
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { share as shareAction } from '@/actions/App/Http/Controllers/MySpecimenTypeTemplateController';
import HeadingSheet from '@/components/heading-sheet';
import InputError from '@/components/input-error';
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
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface User {
    id: number;
    name: string;
    email: string;
}

interface SpecimenTypeExamination {
    id: number;
    specimen_type: number;
    name: string;
}

interface SpecimenType {
    id: number;
    name: string;
}

interface ShareTemplatesSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    users: User[];
    specimenTypes: SpecimenType[];
    examinations: SpecimenTypeExamination[];
}

function FormCombobox({
    options,
    value,
    onChange,
    placeholder,
    emptyMessage = 'No se encontraron resultados.',
    disabled = false,
    multiple = false,
}: {
    options: { label: string; value: string }[];
    value: string | string[];
    onChange: (value: any) => void;
    placeholder: string;
    emptyMessage?: string;
    disabled?: boolean;
    multiple?: boolean;
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
                    <div className="flex max-h-24 max-w-[90%] flex-wrap items-center gap-1 overflow-y-auto pr-1">
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

export default function ShareTemplatesSheet({
    open,
    onOpenChange,
    users,
    specimenTypes,
    examinations,
}: ShareTemplatesSheetProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        user_ids: [] as string[],
        specimen_type_ids: [] as string[],
        specimen_type_examination_ids: [] as string[],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(shareAction().url, {
            onSuccess: () => {
                toast.success('Plantillas compartidas correctamente');
                reset();
                onOpenChange(false);
            },
        });
    };

    const userOptions = users.map((u) => ({
        label: `${u.name} (${u.email})`,
        value: u.id.toString(),
    }));

    const specimenTypeOptions = specimenTypes.map((st) => ({
        label: `[${st.id}] ${st.name}`,
        value: st.id.toString(),
    }));

    const filteredExaminations = examinations.filter((e) =>
        data.specimen_type_ids.includes(e.specimen_type.toString()),
    );

    const examinationOptions = filteredExaminations.map((e) => ({
        label: `[${e.id}] ${e.name}`,
        value: e.id.toString(),
    }));

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex h-full flex-col overflow-hidden p-0 sm:max-w-[600px]">
                <HeadingSheet
                    title="Compartir Plantillas"
                    description="Seleccione los tipos de muestra, exámenes y usuarios con los que desea compartir sus plantillas."
                />
                <form
                    onSubmit={submit}
                    className="flex flex-1 flex-col overflow-hidden"
                >
                    <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                        {/* Users Dropdown */}
                        <div className="space-y-2">
                            <Label>Usuarios con quienes compartir *</Label>
                            <FormCombobox
                                options={userOptions}
                                value={data.user_ids}
                                multiple={true}
                                onChange={(val) => setData('user_ids', val)}
                                placeholder="Seleccione uno o más usuarios"
                                emptyMessage="No se encontraron usuarios."
                            />
                            <InputError message={errors.user_ids} />
                        </div>

                        {/* Specimen Type Dropdown */}
                        <div className="space-y-2">
                            <Label>Tipos de Muestra *</Label>
                            <FormCombobox
                                options={specimenTypeOptions}
                                value={data.specimen_type_ids}
                                multiple={true}
                                onChange={(val) => {
                                    const newSpecimenTypeIds = val as string[];
                                    const validExaminations =
                                        examinations.filter((e) =>
                                            newSpecimenTypeIds.includes(
                                                e.specimen_type.toString(),
                                            ),
                                        );
                                    const newExamIds =
                                        data.specimen_type_examination_ids.filter(
                                            (id) =>
                                                validExaminations.some(
                                                    (e) =>
                                                        e.id.toString() === id,
                                                ),
                                        );

                                    setData((prev) => ({
                                        ...prev,
                                        specimen_type_ids: newSpecimenTypeIds,
                                        specimen_type_examination_ids:
                                            newExamIds,
                                    }));
                                }}
                                placeholder="Seleccione tipos de muestra"
                                emptyMessage="No se encontraron tipos de muestra."
                            />
                            <InputError message={errors.specimen_type_ids} />
                        </div>

                        {/* Specimen Type Examination Dropdown */}
                        <div className="space-y-2">
                            <Label>Exámenes *</Label>
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
                                disabled={data.specimen_type_ids.length === 0}
                                emptyMessage="No se encontraron exámenes."
                            />
                            <InputError
                                message={errors.specimen_type_examination_ids}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end border-t border-border/60 bg-muted/20 px-5 py-4">
                        <Button
                            type="submit"
                            disabled={processing}
                            className="cursor-pointer"
                        >
                            {processing && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Compartir
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
