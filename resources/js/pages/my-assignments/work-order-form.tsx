import * as React from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { store as storeWorkOrder } from '@/actions/App/Http/Controllers/WorkOrderController';
import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import WorkOrderTypeForm from '../work-orders/work-order-type-form';

import { Badge } from '@/components/ui/badge';

interface WorkOrderType {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
}

interface Props {
    specimenId?: number | null;
    specimenIds?: number[] | null;
    workOrderTypes: WorkOrderType[];
    usersList: User[];
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
    options: {
        label: string;
        value: string;
        color?: string;
        disabled?: boolean;
    }[];
    value: string | string[];
    onChange: (value: any) => void;
    placeholder: string;
    emptyMessage?: string;
    disabled?: boolean;
    multiple?: boolean;
}) {
    const [open, setOpen] = React.useState(false);

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
                                    {opt.color && (
                                        <div
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: opt.color,
                                            }}
                                        />
                                    )}
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
                            <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-2 text-xs select-none">
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
                                        disabled={option.disabled}
                                        onSelect={() => {
                                            if (option.disabled) {
                                                return;
                                            }
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
                                        {option.color && (
                                            <div
                                                className="mr-2 h-3 w-3 shrink-0 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        option.color,
                                                }}
                                            />
                                        )}
                                        <span
                                            className={cn(
                                                'truncate',
                                                option.disabled &&
                                                    'text-muted-foreground opacity-50',
                                            )}
                                        >
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

export default function WorkOrderForm({
    specimenId,
    specimenIds,
    workOrderTypes,
    usersList,
    onSuccess,
}: Props) {
    const { auth } = usePage<any>().props;
    const canCreateType = auth.permissions?.includes('work_orders.create');

    const { data, setData, post, processing, errors } = useForm({
        specimen_id: specimenId || null,
        specimen_ids: specimenIds || [],
        work_order_type_id: '',
        user_ids: [] as string[],
        status: 'Enviada',
        priority: '3', // 3 = Baja (default)
        comments: '',
    });

    const [isTypeSheetOpen, setIsTypeSheetOpen] = React.useState(false);

    const PRIORITY_OPTIONS = [
        { label: 'Alta', value: '1', color: 'orange' },
        { label: 'Media', value: '2', color: 'yellow' },
        { label: 'Baja', value: '3', color: 'green' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!data.work_order_type_id) {
            toast.error('Debe seleccionar un tipo de orden de trabajo.');
            return;
        }

        if (data.user_ids.length === 0) {
            toast.error('Debe seleccionar al menos un técnico asignado.');
            return;
        }

        post(storeWorkOrder().url, {
            onSuccess: () => {
                if (data.specimen_ids && data.specimen_ids.length > 0) {
                    toast.success(
                        `Se crearon ${data.specimen_ids.length} órdenes de trabajo correctamente.`,
                    );
                } else {
                    toast.success('Orden de trabajo creada correctamente.');
                }
                onSuccess();
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-5 py-4">
            {/* Tipo de Orden de Trabajo */}
            <div className="grid gap-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="work_order_type_id">Tipo de Orden</Label>
                    <button
                        type="button"
                        onClick={() => {
                            if (canCreateType) {
                                setIsTypeSheetOpen(true);
                            }
                        }}
                        disabled={!canCreateType}
                        className={cn(
                            'text-xs font-medium transition-colors select-none',
                            canCreateType
                                ? 'cursor-pointer text-primary hover:underline'
                                : 'cursor-not-allowed text-muted-foreground opacity-50',
                        )}
                        title={
                            canCreateType
                                ? 'Crear nuevo tipo de orden'
                                : 'No tiene permisos para crear tipos de orden'
                        }
                    >
                        Nuevo
                    </button>
                </div>
                <FormCombobox
                    placeholder="Seleccionar tipo de orden"
                    value={data.work_order_type_id}
                    onChange={(val) => setData('work_order_type_id', val)}
                    options={workOrderTypes.map((t) => ({
                        label: t.name,
                        value: t.id.toString(),
                    }))}
                />
                {errors.work_order_type_id && (
                    <p className="text-sm text-destructive">
                        {errors.work_order_type_id}
                    </p>
                )}
            </div>

            {/* Técnico Asignado */}
            <div className="grid gap-2">
                <Label htmlFor="user_ids">Técnicos Asignados</Label>
                <FormCombobox
                    placeholder="Seleccionar técnico(s)..."
                    value={data.user_ids}
                    multiple={true}
                    onChange={(val) => setData('user_ids', val)}
                    options={usersList.map((u) => ({
                        label: u.name,
                        value: u.id.toString(),
                    }))}
                />
                {errors.user_ids && (
                    <p className="text-sm text-destructive">
                        {errors.user_ids}
                    </p>
                )}
            </div>

            {/* Estado y Prioridad en la misma fila */}
            <div className="grid grid-cols-2 gap-4">
                {/* Estado */}
                <div className="grid gap-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select
                        value={data.status}
                        onValueChange={(val) => setData('status', val)}
                    >
                        <SelectTrigger id="status">
                            <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Enviada">Enviada</SelectItem>
                            <SelectItem value="En Proceso" disabled>
                                En Proceso
                            </SelectItem>
                            <SelectItem value="Finalizada" disabled>
                                Finalizada
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.status && (
                        <p className="text-sm text-destructive">
                            {errors.status}
                        </p>
                    )}
                </div>

                {/* Prioridad */}
                <div className="grid gap-2">
                    <Label htmlFor="priority">Prioridad</Label>
                    <FormCombobox
                        placeholder="Seleccionar prioridad"
                        value={data.priority}
                        onChange={(val) => setData('priority', val)}
                        options={PRIORITY_OPTIONS}
                    />
                    {errors.priority && (
                        <p className="text-sm text-destructive">
                            {errors.priority}
                        </p>
                    )}
                </div>
            </div>

            {/* Comentarios */}
            <div className="grid gap-2">
                <Label htmlFor="comments">Comentarios (Opcional)</Label>
                <Textarea
                    id="comments"
                    value={data.comments}
                    onChange={(e) => setData('comments', e.target.value)}
                    placeholder="Escriba comentarios u observaciones..."
                    rows={4}
                />
                {errors.comments && (
                    <p className="text-sm text-destructive">
                        {errors.comments}
                    </p>
                )}
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-4">
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full sm:w-auto"
                >
                    {processing && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {data.specimen_ids.length > 1
                        ? 'Crear Órdenes'
                        : 'Crear Orden'}
                </Button>
            </div>

            {/* Stacked Sheet to create a new Work Order Type */}
            <Sheet open={isTypeSheetOpen} onOpenChange={setIsTypeSheetOpen}>
                <SheetContent className="sm:max-w-[540px]">
                    <HeadingSheet
                        title="Nuevo Tipo de Orden de Trabajo"
                        description="Complete el formulario para definir un nuevo tipo de orden de trabajo."
                    />
                    {isTypeSheetOpen && (
                        <WorkOrderTypeForm
                            workOrderType={null}
                            onSuccess={() => setIsTypeSheetOpen(false)}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </form>
    );
}
