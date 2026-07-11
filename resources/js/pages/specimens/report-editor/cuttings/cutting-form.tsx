import { useForm } from '@inertiajs/react';
import { Check, ChevronsUpDown, X, Plus, Info } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';
import {
    store as storeCutting,
    update as updateCutting,
} from '@/actions/App/Http/Controllers/Editor/CuttingController';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberPicker } from '@/components/ui/number-picker';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import WorkOrderTypeSheet from '@/pages/work-orders/work-order-type-sheet';
import CuttingCodeSheet from './cutting-code-sheet';

interface Cutting {
    id?: number;
    code_id: number;
    specimen_id: number;
    description: string;
    number_of_cuttings: number;
    cuttings_description: string;
    number_of_slides: number | null;
    cutting_slide_types: number[] | null;
    status: 'processing' | 'macroscopy' | 'delivered';
    comments: string | null;
    responsible_id: number;
}

interface CuttingCode {
    id: number;
    code: string;
    color: string;
}

interface CuttingSlideType {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
}

interface Props {
    cutting?: Cutting | null;
    specimen: {
        id: number;
        sequence_code: string;
    };
    cuttingCodes: CuttingCode[];
    cuttingSlideTypes: CuttingSlideType[];
    users: User[];
    isDuplicate?: boolean;
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
                    <CommandInput placeholder={`Buscar...`} />
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
export default function CuttingForm({
    cutting,
    specimen,
    cuttingCodes,
    cuttingSlideTypes,
    users,
    isDuplicate = false,
    onSuccess,
}: Props) {
    const isEditMode = !!cutting?.id && !isDuplicate;

    const { data, setData, post, put, processing, errors, reset, transform } =
        useForm({
            code_id: cutting?.code_id ? String(cutting.code_id) : '',
            description: cutting?.description || '',
            number_of_cuttings: cutting?.number_of_cuttings ?? 1,
            cuttings_description: cutting?.cuttings_description || '',
            number_of_slides: cutting?.number_of_slides ?? 1,
            cutting_slide_types: cutting?.cutting_slide_types
                ? cutting.cutting_slide_types.map(String)
                : [],
            comments: cutting?.comments || '',
            responsible_id: cutting?.responsible_id
                ? String(cutting.responsible_id)
                : '',
            status: isEditMode ? cutting?.status || 'macroscopy' : 'macroscopy',
        });

    const [isCreateCodeSheetOpen, setIsCreateCodeSheetOpen] = useState(false);
    const [isCreateWorkOrderTypeOpen, setIsCreateWorkOrderTypeOpen] =
        useState(false);
    const prevCodesRef = useRef<any[]>(cuttingCodes);
    const prevSlideTypesRef = useRef<any[]>(cuttingSlideTypes);

    useEffect(() => {
        if (cuttingCodes.length > prevCodesRef.current.length) {
            const newCodes = cuttingCodes.filter(
                (c) => !prevCodesRef.current.some((prev) => prev.id === c.id),
            );

            if (newCodes.length > 0) {
                setData('code_id', String(newCodes[0].id));
                toast.success(
                    `Código de casete "${newCodes[0].code}" seleccionado automáticamente`,
                );
            }
        }

        prevCodesRef.current = cuttingCodes;
    }, [cuttingCodes]);

    useEffect(() => {
        if (cuttingSlideTypes.length > prevSlideTypesRef.current.length) {
            const newTypes = cuttingSlideTypes.filter(
                (st) =>
                    !prevSlideTypesRef.current.some(
                        (prev) => prev.id === st.id,
                    ),
            );

            if (newTypes.length > 0) {
                setData('cutting_slide_types', [
                    ...data.cutting_slide_types,
                    String(newTypes[0].id),
                ]);
                toast.success(
                    `Tipo de lámina "${newTypes[0].name}" seleccionado automáticamente`,
                );
            }
        }

        prevSlideTypesRef.current = cuttingSlideTypes;
    }, [cuttingSlideTypes]);

    useEffect(() => {
        transform((data) => ({
            ...data,
            code_id: Number(data.code_id) || 0,
            responsible_id: Number(data.responsible_id) || 0,
            number_of_cuttings: Number(data.number_of_cuttings),
            number_of_slides: data.number_of_slides
                ? Number(data.number_of_slides)
                : null,
            cutting_slide_types: data.cutting_slide_types.map(Number),
        }));
    }, [
        data.code_id,
        data.responsible_id,
        data.number_of_cuttings,
        data.number_of_slides,
        data.cutting_slide_types,
    ]);

    useEffect(() => {
        if (cutting) {
            setData({
                code_id: String(cutting.code_id),
                description: cutting.description,
                number_of_cuttings: cutting.number_of_cuttings,
                cuttings_description: cutting.cuttings_description || '',
                number_of_slides: cutting.number_of_slides ?? 1,
                cutting_slide_types: (cutting.cutting_slide_types || []).map(
                    String,
                ),
                comments: cutting.comments || '',
                responsible_id: String(cutting.responsible_id),
                status: isEditMode ? cutting.status : 'macroscopy',
            });
        } else {
            reset();
        }
    }, [cutting, isEditMode]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (data.cutting_slide_types.length === 0) {
            toast.error('Debe seleccionar al menos un tipo de lámina especial');

            return;
        }

        if (isEditMode) {
            // Note: We use put since update maps to PUT route
            put(updateCutting(cutting!.id!).url, {
                onSuccess: () => {
                    toast.success('Corte actualizado correctamente');
                    onSuccess();
                },
            });
        } else {
            post(storeCutting(specimen.sequence_code).url, {
                onSuccess: () => {
                    toast.success(
                        isDuplicate
                            ? 'Corte duplicado correctamente'
                            : 'Corte registrado correctamente',
                    );
                    onSuccess();
                    reset();
                },
            });
        }
    };

    const selectedCode = cuttingCodes.find(
        (c) => String(c.id) === data.code_id,
    );

    const specialStainOptions = cuttingSlideTypes.map((st) => ({
        label: st.name,
        value: String(st.id),
    }));

    return (
        <>
            <form onSubmit={submit} className="space-y-5 px-5 py-4">
                {isDuplicate && (
                    <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
                        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue-600 dark:text-blue-400" />
                        <div>
                            <span className="font-semibold">
                                Modo Duplicación:
                            </span>{' '}
                            Se ha copiado la información del corte original.
                            Realice las modificaciones necesarias para registrar
                            este nuevo corte.
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Cassette Code */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="code_id">Código de Casete</Label>
                            <button
                                type="button"
                                onClick={() => setIsCreateCodeSheetOpen(true)}
                                className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            >
                                <Plus className="h-3 w-3" /> Nuevo
                            </button>
                        </div>
                        <Select
                            value={data.code_id}
                            onValueChange={(val) => setData('code_id', val)}
                        >
                            <SelectTrigger id="code_id" className="w-full">
                                <SelectValue placeholder="Seleccione código">
                                    {selectedCode ? (
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300 shadow-sm"
                                                style={{
                                                    backgroundColor:
                                                        selectedCode.color,
                                                }}
                                            />
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                {selectedCode.code}
                                            </span>
                                        </div>
                                    ) : (
                                        'Seleccione código'
                                    )}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {cuttingCodes.map((code) => (
                                    <SelectItem
                                        key={code.id}
                                        value={String(code.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300 shadow-sm"
                                                style={{
                                                    backgroundColor: code.color,
                                                }}
                                            />
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                {code.code}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.code_id} />
                    </div>

                    {/* Responsible */}
                    <div className="space-y-2">
                        <Label htmlFor="responsible_id">
                            Responsable del Corte
                        </Label>
                        <Select
                            value={data.responsible_id}
                            onValueChange={(val) =>
                                setData('responsible_id', val)
                            }
                        >
                            <SelectTrigger
                                id="responsible_id"
                                className="w-full"
                            >
                                <SelectValue placeholder="Seleccione responsable" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map((user) => (
                                    <SelectItem
                                        key={user.id}
                                        value={String(user.id)}
                                    >
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.responsible_id} />
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="description">Descripción del Corte</Label>
                    <Input
                        id="description"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        placeholder="Ej. Lesión 1 - Borde proximal"
                        required
                    />
                    <InputError message={errors.description} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Number of Cuttings */}
                    <div className="space-y-2">
                        <Label htmlFor="number_of_cuttings">
                            # de Cortes/Casete
                        </Label>
                        <NumberPicker
                            id="number_of_cuttings"
                            value={data.number_of_cuttings}
                            onChange={(val) =>
                                setData('number_of_cuttings', val)
                            }
                            min={0}
                        />
                        <InputError message={errors.number_of_cuttings} />
                    </div>

                    {/* Routine Slides */}
                    <div className="space-y-2">
                        <Label htmlFor="number_of_slides">
                            # de Láminas de Rutina (Opcional)
                        </Label>
                        <NumberPicker
                            id="number_of_slides"
                            value={data.number_of_slides ?? 0}
                            onChange={(val) => setData('number_of_slides', val)}
                            min={0}
                        />
                        <InputError message={errors.number_of_slides} />
                    </div>
                </div>

                {/* Special Stain Slide Types */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="cutting_slide_types">
                            Tipo Láminas T. Especial{' '}
                            <small>(Tipo Orden de Trabajo)</small>
                        </Label>
                        <button
                            type="button"
                            onClick={() => setIsCreateWorkOrderTypeOpen(true)}
                            className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                            <Plus className="h-3 w-3" /> Nuevo
                        </button>
                    </div>
                    <FormCombobox
                        options={specialStainOptions}
                        value={data.cutting_slide_types}
                        multiple={true}
                        onChange={(val) => setData('cutting_slide_types', val)}
                        placeholder="Seleccione tipos de láminas especiales"
                        emptyMessage="No se encontraron tipos de láminas."
                    />
                    <InputError message={errors.cutting_slide_types} />
                </div>

                {/* Cuts Description (Cuttings Description) */}
                <div className="space-y-2">
                    <Label htmlFor="cuttings_description">
                        Descripción Cortes/Casete (Opcional)
                    </Label>
                    <Input
                        id="cuttings_description"
                        value={data.cuttings_description}
                        onChange={(e) =>
                            setData('cuttings_description', e.target.value)
                        }
                        placeholder="Ej. CR (Cortes Representativos)"
                    />
                    <InputError message={errors.cuttings_description} />
                </div>

                {/* Comments */}
                <div className="space-y-2">
                    <Label htmlFor="comments">
                        Comentarios / Notas (Opcional)
                    </Label>
                    <Textarea
                        id="comments"
                        value={data.comments}
                        onChange={(e) => setData('comments', e.target.value)}
                        placeholder="Ej. Se dejó más tiempo en alcohol..."
                        className="min-h-[80px]"
                    />
                    <InputError message={errors.comments} />
                </div>

                {/* Edit mode Status Selection */}
                {isEditMode && (
                    <div className="space-y-2">
                        <Label htmlFor="status">Estado del Corte</Label>
                        <Select
                            value={data.status}
                            onValueChange={(val: any) => setData('status', val)}
                        >
                            <SelectTrigger id="status" className="w-full">
                                <SelectValue placeholder="Seleccione estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="processing">
                                    Procesamiento
                                </SelectItem>
                                <SelectItem value="macroscopy">
                                    Macroscopía
                                </SelectItem>
                                <SelectItem value="delivered">
                                    Entregado
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <InputError message={errors.status} />
                    </div>
                )}

                {/* Form actions */}
                <div className="flex justify-end pt-3">
                    <Button
                        type="submit"
                        disabled={processing}
                        className="w-full px-6 sm:w-auto"
                    >
                        {isEditMode
                            ? 'Actualizar Corte'
                            : isDuplicate
                              ? 'Duplicar Corte'
                              : 'Registrar Corte'}
                    </Button>
                </div>
            </form>

            {/* Create Cassette Code Sheet */}
            <CuttingCodeSheet
                open={isCreateCodeSheetOpen}
                onOpenChange={setIsCreateCodeSheetOpen}
            />

            {/* Create Work Order Type Sheet */}
            <WorkOrderTypeSheet
                workOrderType={null}
                open={isCreateWorkOrderTypeOpen}
                onOpenChange={setIsCreateWorkOrderTypeOpen}
            />
        </>
    );
}
