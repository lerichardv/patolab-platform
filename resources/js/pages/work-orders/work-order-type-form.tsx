import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    store as storeWorkOrderType,
    update as updateWorkOrderType,
} from '@/actions/App/Http/Controllers/WorkOrderTypeController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';

interface WorkOrderType {
    id: number;
    name: string;
    duration_unit: 'hours' | 'days';
    duration_value: number;
    same_day_rule_enabled: boolean;
    same_day_cutoff_start: string | null;
    same_day_cutoff_end: string | null;
}

interface Props {
    workOrderType: WorkOrderType | null;
    onSuccess: () => void;
}

const formatTime = (time: string | null | undefined): string => {
    if (!time) {
        return '';
    }

    if (time.length > 5) {
        return time.substring(0, 5);
    }

    return time;
};

export default function WorkOrderTypeForm({ workOrderType, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: workOrderType?.name || '',
        duration_unit: workOrderType?.duration_unit || 'days',
        duration_value: workOrderType?.duration_value || 1,
        same_day_rule_enabled: workOrderType?.same_day_rule_enabled || false,
        same_day_cutoff_start:
            formatTime(workOrderType?.same_day_cutoff_start) || '',
        same_day_cutoff_end:
            formatTime(workOrderType?.same_day_cutoff_end) || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (data.same_day_rule_enabled) {
            if (data.same_day_cutoff_start && data.same_day_cutoff_end) {
                if (data.same_day_cutoff_start >= data.same_day_cutoff_end) {
                    toast.error(
                        'La hora de rango de inicio (entrada) debe ser antes de la hora de rango final (límite).',
                    );

                    return;
                }
            }
        }

        const options = {
            onSuccess: () => {
                toast.success(
                    workOrderType
                        ? 'Tipo de orden actualizado correctamente'
                        : 'Tipo de orden creado correctamente',
                );
                onSuccess();
            },
        };

        if (workOrderType) {
            put(updateWorkOrderType(workOrderType.id).url, options);
        } else {
            post(storeWorkOrderType().url, options);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-5 py-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Biopsia Regular, Citología Urgente..."
                    required
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="duration_value">Valor de Duración</Label>
                    <Input
                        id="duration_value"
                        type="number"
                        min="1"
                        step="1"
                        value={data.duration_value}
                        onChange={(e) =>
                            setData(
                                'duration_value',
                                parseInt(e.target.value) || 0,
                            )
                        }
                        required
                    />
                    {errors.duration_value && (
                        <p className="text-sm text-destructive">
                            {errors.duration_value}
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="duration_unit">Unidad de Duración</Label>
                    <Select
                        value={data.duration_unit}
                        onValueChange={(v) =>
                            setData('duration_unit', v as 'hours' | 'days')
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione unidad" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hours">Horas</SelectItem>
                            <SelectItem value="days">Días</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.duration_unit && (
                        <p className="text-sm text-destructive">
                            {errors.duration_unit}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-4 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">
                            Regla de Entrega el Mismo Día
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Habilite para forzar la entrega hoy si ingresa antes
                            del límite.
                        </p>
                    </div>
                    <Switch
                        checked={data.same_day_rule_enabled}
                        onCheckedChange={(checked) => {
                            setData((d) => ({
                                ...d,
                                same_day_rule_enabled: checked,
                                same_day_cutoff_start: checked
                                    ? d.same_day_cutoff_start
                                    : '',
                                same_day_cutoff_end: checked
                                    ? d.same_day_cutoff_end
                                    : '',
                            }));
                        }}
                    />
                </div>

                {data.same_day_rule_enabled && (
                    <div className="grid grid-cols-2 gap-4 border-t border-dashed pt-2">
                        <div className="grid gap-2">
                            <Label htmlFor="same_day_cutoff_start">
                                Rango Inicio (Entrada)
                            </Label>
                            <Input
                                id="same_day_cutoff_start"
                                type="time"
                                value={data.same_day_cutoff_start}
                                onChange={(e) =>
                                    setData(
                                        'same_day_cutoff_start',
                                        e.target.value,
                                    )
                                }
                                required={data.same_day_rule_enabled}
                            />
                            {errors.same_day_cutoff_start && (
                                <p className="text-sm text-destructive">
                                    {errors.same_day_cutoff_start}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="same_day_cutoff_end">
                                Rango Fin (Límite)
                            </Label>
                            <Input
                                id="same_day_cutoff_end"
                                type="time"
                                value={data.same_day_cutoff_end}
                                onChange={(e) =>
                                    setData(
                                        'same_day_cutoff_end',
                                        e.target.value,
                                    )
                                }
                                required={data.same_day_rule_enabled}
                            />
                            {errors.same_day_cutoff_end && (
                                <p className="text-sm text-destructive">
                                    {errors.same_day_cutoff_end}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full md:w-auto"
                >
                    {processing && <Spinner className="mr-2" />}
                    {workOrderType ? 'Guardar Cambios' : 'Crear Tipo de Orden'}
                </Button>
            </div>
        </form>
    );
}
