import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { 
    store as storeType, 
    update as updateType 
} from '@/actions/App/Http/Controllers/ReferrerTypeController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

interface ReferrerType {
    id: number;
    name: string;
}

interface Props {
    referrerType: ReferrerType | null;
    onSuccess: () => void;
}

export default function ReferrerTypeForm({ referrerType, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: referrerType?.name || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                toast.success(referrerType ? 'Tipo de remitente actualizado' : 'Tipo de remitente creado');
                onSuccess();
            },
        };

        if (referrerType) {
            put(updateType(referrerType.id).url, options);
        } else {
            post(storeType().url, options);
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
                    placeholder="Ej. Médico, Clínica, Hospital..."
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="submit" disabled={processing} className="w-full md:w-auto">
                    {processing && <Spinner className="mr-2" />}
                    {referrerType ? 'Guardar Cambios' : 'Crear Tipo'}
                </Button>
            </div>
        </form>
    );
}
