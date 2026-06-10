import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    store as storeReferrer,
    update as updateReferrer,
} from '@/actions/App/Http/Controllers/ReferrerController';
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
import { Textarea } from '../../components/ui/textarea';

interface ReferrerType {
    id: number;
    name: string;
}

interface Referrer {
    id: number;
    referrer_type: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
}

interface Props {
    referrer: Referrer | null;
    referrerTypes: ReferrerType[];
    onSuccess: () => void;
}

export default function ReferrerForm({
    referrer,
    referrerTypes,
    onSuccess,
}: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: referrer?.name || '',
        referrer_type: referrer?.referrer_type?.toString() || '',
        phone: referrer?.phone || '',
        email: referrer?.email || '',
        address: referrer?.address || '',
        notes: referrer?.notes || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                toast.success(
                    referrer ? 'Remitente actualizado' : 'Remitente creado',
                );
                onSuccess();
            },
        };

        if (referrer) {
            put(updateReferrer(referrer.id).url, options);
        } else {
            post(storeReferrer().url, options);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-5 py-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Dr. Armando Casas"
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="referrer_type">Tipo de Remitente *</Label>
                <Select
                    value={data.referrer_type}
                    onValueChange={(v) => setData('referrer_type', v)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        {referrerTypes.map((type) => (
                            <SelectItem
                                key={type.id}
                                value={type.id.toString()}
                            >
                                {type.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.referrer_type && (
                    <p className="text-sm text-destructive">
                        {errors.referrer_type}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                        id="phone"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        placeholder="Ej. 9988-7766"
                    />
                    {errors.phone && (
                        <p className="text-sm text-destructive">
                            {errors.phone}
                        </p>
                    )}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Correo</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="doctor@ejemplo.com"
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">
                            {errors.email}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                    id="address"
                    value={data.address}
                    onChange={(e) => setData('address', e.target.value)}
                    placeholder="Dirección del consultorio o clínica..."
                />
                {errors.address && (
                    <p className="text-sm text-destructive">{errors.address}</p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                    id="notes"
                    value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)}
                    placeholder="Observaciones adicionales..."
                    className="resize-none"
                    rows={3}
                />
                {errors.notes && (
                    <p className="text-sm text-destructive">{errors.notes}</p>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full md:w-auto"
                >
                    {processing && <Spinner className="mr-2" />}
                    {referrer ? 'Guardar Cambios' : 'Crear Remitente'}
                </Button>
            </div>
        </form>
    );
}
