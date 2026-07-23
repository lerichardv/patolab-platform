import { Head, useForm, usePage } from '@inertiajs/react';
import {
    Settings,
    Percent,
    Save,
    Check,
    ChevronsUpDown,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';
import { update as updateSettings } from '@/actions/App/Http/Controllers/SettingController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

interface Role {
    id: number;
    name: string;
}

interface Props {
    settings: {
        third_age_discount: string;
        fourth_age_discount: string;
        pathologist_role_id?: string;
        pathologist_technician_role_id?: number[];
    };
    roles: Role[];
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

export default function SystemSettingsIndex({ settings, roles = [] }: Props) {
    const { auth } = usePage<any>().props;
    const canEdit = auth.permissions?.includes('settings.edit');

    const { data, setData, put, processing, errors } = useForm({
        third_age_discount: settings.third_age_discount || '30',
        fourth_age_discount: settings.fourth_age_discount || '40',
        pathologist_role_id: settings.pathologist_role_id
            ? parseInt(settings.pathologist_role_id, 10)
            : '',
        pathologist_technician_role_id: settings.pathologist_technician_role_id
            ? settings.pathologist_technician_role_id.map((id) =>
                  typeof id === 'string' ? parseInt(id, 10) : id,
              )
            : [],
    });

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!canEdit) {
            return;
        }

        put(updateSettings().url, {
            onSuccess: () => {
                toast.success('Ajustes del sistema actualizados correctamente');
            },
            onError: (errs) => {
                toast.error('Ocurrió un error al actualizar los ajustes');
            },
        });
    };

    const roleOptions = roles.map((role) => ({
        label: role.name,
        value: role.id.toString(),
    }));

    return (
        <>
            <Head title="Ajustes del Sistema" />

            <div className="mx-auto flex h-full max-w-4xl flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-2 border-b pb-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shadow-inner">
                            <Settings className="h-6 w-6 animate-[spin_8s_linear_infinite]" />
                        </div>
                        <div>
                            <h1 className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
                                Ajustes del Sistema
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Configure los parámetros generales de la
                                plataforma y valores por defecto.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Patients Discounts */}
                    <Card className="overflow-hidden border border-muted bg-card/60 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-primary/20 hover:shadow-xl">
                        <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-transparent to-transparent pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                <span className="flex h-2 w-2 rounded-full bg-primary" />
                                Descuentos de Pacientes
                            </CardTitle>
                            <CardDescription>
                                Establezca los porcentajes de descuento
                                automáticos aplicados en base a la edad de los
                                pacientes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="group space-y-2">
                                    <Label
                                        htmlFor="third_age_discount"
                                        className="text-sm font-semibold transition-colors group-focus-within:text-primary"
                                    >
                                        Descuento Tercera Edad
                                    </Label>
                                    <div className="relative rounded-md shadow-sm transition-all duration-200">
                                        <Input
                                            id="third_age_discount"
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="any"
                                            value={data.third_age_discount}
                                            disabled={!canEdit}
                                            onChange={(e) =>
                                                setData(
                                                    'third_age_discount',
                                                    e.target.value,
                                                )
                                            }
                                            className="border-muted-foreground/20 pr-10 focus-visible:border-primary focus-visible:ring-primary"
                                            placeholder="30"
                                        />
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                                            <Percent className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Se aplica automáticamente a los
                                        pacientes de la tercera edad.
                                    </p>
                                    <InputError
                                        message={errors.third_age_discount}
                                    />
                                </div>

                                <div className="group space-y-2">
                                    <Label
                                        htmlFor="fourth_age_discount"
                                        className="text-sm font-semibold transition-colors group-focus-within:text-primary"
                                    >
                                        Descuento Cuarta Edad
                                    </Label>
                                    <div className="relative rounded-md shadow-sm transition-all duration-200">
                                        <Input
                                            id="fourth_age_discount"
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="any"
                                            value={data.fourth_age_discount}
                                            disabled={!canEdit}
                                            onChange={(e) =>
                                                setData(
                                                    'fourth_age_discount',
                                                    e.target.value,
                                                )
                                            }
                                            className="border-muted-foreground/20 pr-10 focus-visible:border-primary focus-visible:ring-primary"
                                            placeholder="40"
                                        />
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                                            <Percent className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Se aplica automáticamente a los
                                        pacientes de la cuarta edad.
                                    </p>
                                    <InputError
                                        message={errors.fourth_age_discount}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Roles Configuration */}
                    <Card className="overflow-hidden border border-muted bg-card/60 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-primary/20 hover:shadow-xl">
                        <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-transparent to-transparent pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                <span className="flex h-2 w-2 rounded-full bg-primary" />
                                Roles del Sistema
                            </CardTitle>
                            <CardDescription>
                                Defina los roles asignados para los procesos y
                                comisiones de patólogos y técnicos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="group space-y-2">
                                    <Label className="text-sm font-semibold transition-colors group-focus-within:text-primary">
                                        Rol de Patólogo
                                    </Label>
                                    <FormCombobox
                                        options={roleOptions}
                                        value={
                                            data.pathologist_role_id
                                                ? data.pathologist_role_id.toString()
                                                : ''
                                        }
                                        onChange={(val) =>
                                            setData(
                                                'pathologist_role_id',
                                                val ? parseInt(val, 10) : '',
                                            )
                                        }
                                        placeholder="Seleccione el rol de patólogo"
                                        disabled={!canEdit}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Rol utilizado para identificar a los
                                        patólogos autorizados para firmar.
                                    </p>
                                    <InputError
                                        message={errors.pathologist_role_id}
                                    />
                                </div>

                                <div className="group space-y-2">
                                    <Label className="text-sm font-semibold transition-colors group-focus-within:text-primary">
                                        Roles de Técnicos de Patología
                                    </Label>
                                    <FormCombobox
                                        options={roleOptions}
                                        value={data.pathologist_technician_role_id.map(
                                            (id) => id.toString(),
                                        )}
                                        onChange={(vals: string[]) =>
                                            setData(
                                                'pathologist_technician_role_id',
                                                vals.map((v) =>
                                                    parseInt(v, 10),
                                                ),
                                            )
                                        }
                                        placeholder="Seleccione los roles de técnicos"
                                        disabled={!canEdit}
                                        multiple={true}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Roles que se consideran para la
                                        asignación técnica de las muestras.
                                    </p>
                                    <InputError
                                        message={
                                            errors.pathologist_technician_role_id
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {canEdit && (
                        <div className="flex justify-end pt-2">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="flex h-10 w-full items-center gap-2 px-5 text-sm md:w-auto"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {processing
                                    ? 'Guardando...'
                                    : 'Guardar Cambios'}
                            </Button>
                        </div>
                    )}
                </form>
            </div>
        </>
    );
}
