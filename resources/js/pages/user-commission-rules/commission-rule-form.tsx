import { useForm } from '@inertiajs/react';
import { Check, ChevronsUpDown, Info, X, Loader2 } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    store as storeRule,
    update as updateRule,
} from '@/actions/App/Http/Controllers/UserCommissionRuleController';
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface User {
    id: number;
    name: string;
    email: string;
}

interface SpecimenType {
    id: number;
    name: string;
}

interface SpecimenTypeExamination {
    id: number;
    specimen_type: number;
    name: string;
}

interface Rule {
    id?: number;
    user_id: number;
    specimen_type_id: number;
    specimen_type_examination_id: number;
    macroscopy_commission_enabled: boolean;
    macroscopy_calculation_type?: string | null;
    macroscopy_commission_value: string | number;
    microscopy_commission_enabled: boolean;
    microscopy_calculation_type?: string | null;
    microscopy_commission_value: string | number;
}

interface CommissionRuleFormProps {
    rule?: Rule | null;
    users: User[];
    specimenTypes: SpecimenType[];
    examinations: SpecimenTypeExamination[];
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

export default function CommissionRuleForm({
    rule,
    users,
    specimenTypes,
    examinations,
    isDuplicate = false,
    onSuccess,
}: CommissionRuleFormProps) {
    const isEditMode = !!rule?.id && !isDuplicate;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        user_id: rule?.user_id?.toString() || '',
        specimen_type_id: isEditMode
            ? rule?.specimen_type_id?.toString() || ''
            : '',
        specimen_type_examination_id: isEditMode
            ? rule?.specimen_type_examination_id?.toString() || ''
            : '',
        specimen_type_ids: isEditMode
            ? []
            : isDuplicate
              ? []
              : rule?.specimen_type_id
                ? [rule.specimen_type_id.toString()]
                : [],
        specimen_type_examination_ids: isEditMode
            ? []
            : isDuplicate
              ? []
              : rule?.specimen_type_examination_id
                ? [rule.specimen_type_examination_id.toString()]
                : [],
        macroscopy_commission_enabled:
            rule?.macroscopy_commission_enabled ?? false,
        macroscopy_calculation_type:
            rule?.macroscopy_calculation_type || 'fixed',
        macroscopy_commission_value:
            rule?.macroscopy_commission_value || '0.00',
        microscopy_commission_enabled:
            rule?.microscopy_commission_enabled ?? false,
        microscopy_calculation_type:
            rule?.microscopy_calculation_type || 'fixed',
        microscopy_commission_value:
            rule?.microscopy_commission_value || '0.00',
    });

    useEffect(() => {
        if (rule) {
            setData({
                user_id: rule.user_id.toString(),
                specimen_type_id: isEditMode
                    ? rule.specimen_type_id.toString()
                    : '',
                specimen_type_examination_id: isEditMode
                    ? rule.specimen_type_examination_id.toString()
                    : '',
                specimen_type_ids: isEditMode
                    ? []
                    : isDuplicate
                      ? []
                      : [rule.specimen_type_id.toString()],
                specimen_type_examination_ids: isEditMode
                    ? []
                    : isDuplicate
                      ? []
                      : [rule.specimen_type_examination_id.toString()],
                macroscopy_commission_enabled:
                    rule.macroscopy_commission_enabled,
                macroscopy_calculation_type:
                    rule.macroscopy_calculation_type || 'fixed',
                macroscopy_commission_value:
                    rule.macroscopy_commission_value.toString(),
                microscopy_commission_enabled:
                    rule.microscopy_commission_enabled,
                microscopy_calculation_type:
                    rule.microscopy_calculation_type || 'fixed',
                microscopy_commission_value:
                    rule.microscopy_commission_value.toString(),
            });
        } else {
            reset();
        }
    }, [rule, isDuplicate, isEditMode, setData, reset]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (isEditMode) {
            put(updateRule(rule.id!).url, {
                onSuccess: () => {
                    toast.success(
                        'Regla de comisión actualizada correctamente',
                    );
                    onSuccess();
                },
            });
        } else {
            post(storeRule().url, {
                onSuccess: () => {
                    toast.success(
                        isDuplicate
                            ? 'Regla de comisión duplicada correctamente'
                            : 'Regla de comisión creada correctamente',
                    );
                    onSuccess();
                },
            });
        }
    };

    // Prepare dropdown options
    const userOptions = users.map((u) => ({
        label: `${u.name} (${u.email})`,
        value: u.id.toString(),
    }));

    const specimenTypeOptions = specimenTypes.map((st) => ({
        label: st.name,
        value: st.id.toString(),
    }));

    // Filter examinations based on selected specimen type(s)
    const filteredExaminations = isEditMode
        ? examinations.filter(
              (e) => e.specimen_type.toString() === data.specimen_type_id,
          )
        : examinations.filter((e) =>
              data.specimen_type_ids.includes(e.specimen_type.toString()),
          );

    const examinationOptions = filteredExaminations.map((e) => ({
        label: e.name,
        value: e.id.toString(),
    }));

    return (
        <form onSubmit={submit} className="space-y-5 px-5 py-4">
            {isDuplicate && (
                <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
                    <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div>
                        <span className="font-semibold">Modo Duplicación:</span>{' '}
                        Se han copiado las configuraciones de comisión
                        (macroscopía/microscopía). Seleccione el nuevo usuario,
                        tipo de muestra y examen de destino para crear la nueva
                        regla.
                    </div>
                </div>
            )}

            {/* User Dropdown */}
            <div className="space-y-2">
                <Label htmlFor="user_id">Usuario *</Label>
                <FormCombobox
                    options={userOptions}
                    value={data.user_id}
                    onChange={(val) => setData('user_id', val)}
                    placeholder="Seleccione un usuario"
                    emptyMessage="No se encontraron usuarios."
                />
                <InputError message={errors.user_id} />
            </div>

            {/* Specimen Type Dropdown */}
            <div className="space-y-2">
                <Label htmlFor="specimen_type_id">Tipo de Muestra *</Label>
                {isEditMode ? (
                    <FormCombobox
                        options={specimenTypeOptions}
                        value={data.specimen_type_id}
                        onChange={(val) => {
                            setData((prev) => ({
                                ...prev,
                                specimen_type_id: val,
                                specimen_type_examination_id: '', // Reset examination on type change
                            }));
                        }}
                        placeholder="Seleccione un tipo de muestra"
                        emptyMessage="No se encontraron tipos de muestra."
                    />
                ) : (
                    <FormCombobox
                        options={specimenTypeOptions}
                        value={data.specimen_type_ids}
                        multiple={true}
                        onChange={(val) => {
                            setData((prev) => {
                                const newSpecimenTypeIds = val as string[];
                                const validExaminations = examinations.filter(
                                    (e) =>
                                        newSpecimenTypeIds.includes(
                                            e.specimen_type.toString(),
                                        ),
                                );
                                const newExamIds =
                                    prev.specimen_type_examination_ids.filter(
                                        (id) =>
                                            validExaminations.some(
                                                (e) => e.id.toString() === id,
                                            ),
                                    );

                                return {
                                    ...prev,
                                    specimen_type_ids: newSpecimenTypeIds,
                                    specimen_type_examination_ids: newExamIds,
                                };
                            });
                        }}
                        placeholder="Seleccione tipos de muestra"
                        emptyMessage="No se encontraron tipos de muestra."
                    />
                )}
                <InputError
                    message={
                        errors.specimen_type_id || errors.specimen_type_ids
                    }
                />
            </div>

            {/* Specimen Type Examination Dropdown */}
            <div className="space-y-2">
                <Label htmlFor="specimen_type_examination_id">Examen *</Label>
                {isEditMode ? (
                    <FormCombobox
                        options={examinationOptions}
                        value={data.specimen_type_examination_id}
                        onChange={(val) =>
                            setData('specimen_type_examination_id', val)
                        }
                        placeholder={
                            data.specimen_type_id
                                ? 'Seleccione un examen'
                                : 'Seleccione primero un tipo de muestra'
                        }
                        disabled={!data.specimen_type_id}
                        emptyMessage="No se encontraron exámenes."
                    />
                ) : (
                    <FormCombobox
                        options={examinationOptions}
                        value={data.specimen_type_examination_ids}
                        multiple={true}
                        onChange={(val) =>
                            setData('specimen_type_examination_ids', val)
                        }
                        placeholder={
                            data.specimen_type_ids.length > 0
                                ? 'Seleccione exámenes'
                                : 'Seleccione primero tipos de muestra'
                        }
                        disabled={data.specimen_type_ids.length === 0}
                        emptyMessage="No se encontraron exámenes."
                    />
                )}
                <InputError
                    message={
                        errors.specimen_type_examination_id ||
                        errors.specimen_type_examination_ids
                    }
                />
            </div>

            <hr className="my-2 border-border/50" />

            {/* Macroscopy Switch & Sub-form */}
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">
                            Comisión de Macroscopía
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Habilitar la comisión por análisis macroscópico.
                        </p>
                    </div>
                    <Switch
                        checked={data.macroscopy_commission_enabled}
                        onCheckedChange={(checked) =>
                            setData('macroscopy_commission_enabled', checked)
                        }
                    />
                </div>

                {data.macroscopy_commission_enabled && (
                    <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="macroscopy_calculation_type">
                                Tipo de Cálculo
                            </Label>
                            <Select
                                value={data.macroscopy_calculation_type}
                                onValueChange={(val) =>
                                    setData('macroscopy_calculation_type', val)
                                }
                            >
                                <SelectTrigger id="macroscopy_calculation_type">
                                    <SelectValue placeholder="Seleccione un tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixed">Fijo</SelectItem>
                                    <SelectItem value="percentage">
                                        Porcentaje
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError
                                message={errors.macroscopy_calculation_type}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="macroscopy_commission_value">
                                Valor de Comisión
                            </Label>
                            <div className="relative">
                                {data.macroscopy_calculation_type ===
                                    'fixed' && (
                                    <span className="absolute top-2.5 left-3 text-xs font-semibold text-muted-foreground">
                                        L.
                                    </span>
                                )}
                                <Input
                                    id="macroscopy_commission_value"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.macroscopy_commission_value}
                                    onChange={(e) =>
                                        setData(
                                            'macroscopy_commission_value',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="0.00"
                                    className={cn(
                                        data.macroscopy_calculation_type ===
                                            'fixed'
                                            ? 'pl-8'
                                            : 'pr-8',
                                    )}
                                />
                                {data.macroscopy_calculation_type ===
                                    'percentage' && (
                                    <span className="absolute top-2.5 right-3 text-xs font-semibold text-muted-foreground">
                                        %
                                    </span>
                                )}
                            </div>
                            <InputError
                                message={errors.macroscopy_commission_value}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Microscopy Switch & Sub-form */}
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">
                            Comisión de Microscopía
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Habilitar la comisión por análisis microscópico.
                        </p>
                    </div>
                    <Switch
                        checked={data.microscopy_commission_enabled}
                        onCheckedChange={(checked) =>
                            setData('microscopy_commission_enabled', checked)
                        }
                    />
                </div>

                {data.microscopy_commission_enabled && (
                    <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="microscopy_calculation_type">
                                Tipo de Cálculo
                            </Label>
                            <Select
                                value={data.microscopy_calculation_type}
                                onValueChange={(val) =>
                                    setData('microscopy_calculation_type', val)
                                }
                            >
                                <SelectTrigger id="microscopy_calculation_type">
                                    <SelectValue placeholder="Seleccione un tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixed">Fijo</SelectItem>
                                    <SelectItem value="percentage">
                                        Porcentaje
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError
                                message={errors.microscopy_calculation_type}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="microscopy_commission_value">
                                Valor de Comisión
                            </Label>
                            <div className="relative">
                                {data.microscopy_calculation_type ===
                                    'fixed' && (
                                    <span className="absolute top-2.5 left-3 text-xs font-semibold text-muted-foreground">
                                        L.
                                    </span>
                                )}
                                <Input
                                    id="microscopy_commission_value"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.microscopy_commission_value}
                                    onChange={(e) =>
                                        setData(
                                            'microscopy_commission_value',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="0.00"
                                    className={cn(
                                        data.microscopy_calculation_type ===
                                            'fixed'
                                            ? 'pl-8'
                                            : 'pr-8',
                                    )}
                                />
                                {data.microscopy_calculation_type ===
                                    'percentage' && (
                                    <span className="absolute top-2.5 right-3 text-xs font-semibold text-muted-foreground">
                                        %
                                    </span>
                                )}
                            </div>
                            <InputError
                                message={errors.microscopy_commission_value}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing}>
                    {processing && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {rule?.id && !isDuplicate
                        ? 'Guardar Cambios'
                        : 'Crear Regla'}
                </Button>
            </div>
        </form>
    );
}
