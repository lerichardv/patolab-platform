import { useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';
import {
    update as updateStorage,
    store as storeStorage,
} from '@/actions/App/Http/Controllers/StorageController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Storage {
    id?: number;
    name: string;
    location: string;
    description: string;
}

interface Props {
    storage?: Storage;
    onSuccess: () => void;
}

export default function StorageForm({ storage, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: storage?.name || '',
        location: storage?.location || '',
        description: storage?.description || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (storage?.id) {
            put(updateStorage(storage.id).url, {
                onSuccess: () => {
                    toast.success('Almacén actualizado correctamente');
                    onSuccess();
                    reset();
                },
            });
        } else {
            post(storeStorage().url, {
                onSuccess: () => {
                    toast.success('Almacén creado correctamente');
                    onSuccess();
                    reset();
                },
            });
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nombre del Almacén *</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Bodega Central"
                />
                <InputError message={errors.name} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="location">Ubicación *</Label>
                <Input
                    id="location"
                    value={data.location}
                    onChange={(e) => setData('location', e.target.value)}
                    placeholder="Ej. Planta 1, Pasillo A"
                />
                <InputError message={errors.location} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Detalles adicionales sobre el almacén..."
                    rows={4}
                />
                <InputError message={errors.description} />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing}>
                    {storage?.id ? 'Actualizar Almacén' : 'Guardar Almacén'}
                </Button>
            </div>
        </form>
    );
}
