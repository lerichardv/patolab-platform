import { useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';
import {
    store as storeProvider,
    update as updateProvider,
} from '@/actions/App/Http/Controllers/InventoryProviderController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Provider {
    id?: number;
    name: string;
    phone: string;
    phone2?: string | null;
    email: string;
    address: string;
}

interface Props {
    provider?: Provider;
    onSuccess: () => void;
}

export default function InventoryProviderForm({ provider, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: provider?.name || '',
        phone: provider?.phone || '',
        phone2: provider?.phone2 || '',
        email: provider?.email || '',
        address: provider?.address || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (provider?.id) {
            put(updateProvider(provider.id).url, {
                onSuccess: () => {
                    toast.success('Proveedor actualizado correctamente');
                    onSuccess();
                    reset();
                },
            });
        } else {
            post(storeProvider().url, {
                onSuccess: () => {
                    toast.success('Proveedor creado correctamente');
                    onSuccess();
                    reset();
                },
            });
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Distribuidora Médica S.A."
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                        id="phone"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        placeholder="Ej. 2234-5678"
                    />
                    <InputError message={errors.phone} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone2">Teléfono 2 (Opcional)</Label>
                    <Input
                        id="phone2"
                        value={data.phone2 || ''}
                        onChange={(e) => setData('phone2', e.target.value)}
                        placeholder="Ej. 9988-7766"
                    />
                    <InputError message={errors.phone2} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    placeholder="contacto@proveedor.com"
                />
                <InputError message={errors.email} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                    id="address"
                    value={data.address}
                    onChange={(e) => setData('address', e.target.value)}
                    placeholder="Ej. Barrio El Centro, Ave. Principal"
                />
                <InputError message={errors.address} />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing}>
                    {provider?.id
                        ? 'Actualizar Proveedor'
                        : 'Guardar Proveedor'}
                </Button>
            </div>
        </form>
    );
}
