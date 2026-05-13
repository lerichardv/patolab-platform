import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { toast } from 'sonner';
import { store as storeLocation, update as updateLocation } from '@/actions/App/Http/Controllers/LocationController';

interface Location {
    id?: number;
    name: string;
    rtn: string;
    address: string;
    phone: string;
    email: string;
}

interface Props {
    location?: Location;
    onSuccess: () => void;
}

export default function LocationForm({ location, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: location?.name || '',
        rtn: location?.rtn || '',
        address: location?.address || '',
        phone: location?.phone || '',
        email: location?.email || '',
    });

    useEffect(() => {
        if (location) {
            setData({
                name: location.name || '',
                rtn: location.rtn || '',
                address: location.address || '',
                phone: location.phone || '',
                email: location.email || '',
            });
        }
    }, [location]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        
        if (location?.id) {
            put(updateLocation(location.id).url, {
                onSuccess: () => {
                    toast.success('Sucursal actualizada correctamente');
                    onSuccess();
                },
            });
        } else {
            post(storeLocation().url, {
                onSuccess: () => {
                    toast.success('Sucursal registrada correctamente');
                    onSuccess();
                    reset();
                },
            });
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 py-4 px-5">
            <div className="grid gap-2">
                <Label htmlFor="name">Nombre de la Sucursal *</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Sucursal Central"
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="rtn">RTN (Opcional)</Label>
                <Input
                    id="rtn"
                    value={data.rtn}
                    onChange={(e) => setData('rtn', e.target.value)}
                    placeholder="Ej. 08011990123456"
                />
                <InputError message={errors.rtn} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                    id="phone"
                    value={data.phone}
                    onChange={(e) => setData('phone', e.target.value)}
                    placeholder="Ej. +504 2233-4455"
                />
                <InputError message={errors.phone} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    placeholder="sucursal@patolab.com"
                />
                <InputError message={errors.email} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="address">Dirección</Label>
                <Textarea
                    id="address"
                    value={data.address}
                    onChange={(e) => setData('address', e.target.value)}
                    placeholder="Dirección completa de la sucursal..."
                    rows={3}
                />
                <InputError message={errors.address} />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing}>
                    {location?.id ? 'Guardar Cambios' : 'Registrar Sucursal'}
                </Button>
            </div>
        </form>
    );
}
