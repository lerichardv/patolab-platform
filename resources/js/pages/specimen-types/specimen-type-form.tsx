import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    store as storeSpecimenType,
    update as updateSpecimenType,
} from '@/actions/App/Http/Controllers/SpecimenTypeController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '../../components/ui/textarea';

interface SpecimenType {
    id: number;
    name: string;
    description: string | null;
    requires_report?: boolean;
}

interface Props {
    specimenType: SpecimenType | null;
    onSuccess: () => void;
}

export default function SpecimenTypeForm({ specimenType, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: specimenType?.name || '',
        description: specimenType?.description || '',
        requires_report:
            specimenType && specimenType.requires_report !== undefined
                ? Boolean(specimenType.requires_report)
                : true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                toast.success(
                    specimenType
                        ? 'Tipo de muestra actualizado'
                        : 'Tipo de muestra creado',
                );
                onSuccess();
            },
        };

        if (specimenType) {
            put(updateSpecimenType(specimenType.id).url, options);
        } else {
            post(storeSpecimenType().url, options);
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
                    placeholder="Ej. Biopsia, Citología..."
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Descripción opcional del tipo de muestra..."
                    className="resize-none"
                    rows={3}
                />
                {errors.description && (
                    <p className="text-sm text-destructive">
                        {errors.description}
                    </p>
                )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3.5 shadow-xs">
                <div className="space-y-0.5 pr-4">
                    <Label
                        htmlFor="requires_report"
                        className="cursor-pointer text-sm font-medium"
                    >
                        Requiere Informe
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        Si está activo, las muestras de este tipo generarán
                        informe médico y se enviará por correo al finalizar.
                    </p>
                </div>
                <Switch
                    id="requires_report"
                    checked={data.requires_report}
                    onCheckedChange={(checked) =>
                        setData('requires_report', checked)
                    }
                />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full md:w-auto"
                >
                    {processing && <Spinner className="mr-2" />}
                    {specimenType ? 'Guardar Cambios' : 'Crear Tipo de Muestra'}
                </Button>
            </div>
        </form>
    );
}
