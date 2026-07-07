import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    store as storeWorkOrderType,
    update as updateWorkOrderType,
} from '@/actions/App/Http/Controllers/WorkOrderTypeController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

interface WorkOrderType {
    id: number;
    name: string;
    duration_unit?: 'hours' | 'days';
    duration_value?: number;
    same_day_rule_enabled?: boolean;
    same_day_cutoff_start?: string | null;
    same_day_cutoff_end?: string | null;
}

interface Props {
    workOrderType: WorkOrderType | null;
    onSuccess: () => void;
}

export default function WorkOrderTypeForm({ workOrderType, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: workOrderType?.name || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

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
