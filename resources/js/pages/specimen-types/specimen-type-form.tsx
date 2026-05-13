import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { 
    store as storeSpecimenType, 
    update as updateSpecimenType 
} from '@/actions/App/Http/Controllers/SpecimenTypeController';

interface SpecimenType {
    id: number;
    name: string;
    description: string | null;
}

interface Props {
    specimenType: SpecimenType | null;
    onSuccess: () => void;
}

export default function SpecimenTypeForm({ specimenType, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: specimenType?.name || '',
        description: specimenType?.description || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                toast.success(specimenType ? 'Tipo de muestra actualizado' : 'Tipo de muestra creado');
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-4 px-5">
            <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Biopsia, Citología..."
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Descripción opcional del tipo de muestra..."
                    className="resize-none"
                    rows={4}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="submit" disabled={processing} className="w-full md:w-auto">
                    {processing && <Spinner className="mr-2" />}
                    {specimenType ? 'Guardar Cambios' : 'Crear Tipo de Muestra'}
                </Button>
            </div>
        </form>
    );
}
