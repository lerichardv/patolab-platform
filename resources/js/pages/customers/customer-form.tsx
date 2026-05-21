import { useForm } from '@inertiajs/react';
import type { FormEventHandler} from 'react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { update as updateCustomer, store as storeCustomer } from '@/actions/App/Http/Controllers/CustomerController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Customer {
    id?: number;
    name: string;
    id_number: string;
    type: 'cliente' | 'empresa';
    age: number | string;
    phone: string;
    secondary_phone: string;
    gender: string;
    state: string;
    city: string;
    address: string;
    email: string;
}

interface Props {
    customer?: Customer;
    onSuccess: () => void;
}

export default function CustomerForm({ customer, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: customer?.name || '',
        id_number: customer?.id_number || '',
        type: customer?.type || 'cliente',
        age: customer?.age || '',
        phone: customer?.phone || '',
        secondary_phone: customer?.secondary_phone || '',
        gender: customer?.gender || '',
        state: customer?.state || '',
        city: customer?.city || '',
        address: customer?.address || '',
        email: customer?.email || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (customer?.id) {
            put(updateCustomer(customer.id).url, {
                onSuccess: () => {
                    toast.success('Cliente actualizado correctamente');
                    onSuccess();
                    reset();
                },
            });
        } else {
            post(storeCustomer().url, {
                onSuccess: () => {
                    toast.success('Cliente creado correctamente');
                    onSuccess();
                    reset();
                },
            });
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 py-4 px-5">
			<div className="space-y-2">
				<Label htmlFor="type">Tipo Cliente *</Label>
				<Select value={data.type} onValueChange={(value: 'cliente' | 'empresa') => setData('type', value)}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Seleccione el tipo" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="cliente">Cliente</SelectItem>
						<SelectItem value="empresa">Empresa</SelectItem>
					</SelectContent>
				</Select>
				<InputError message={errors.type} />
			</div>

			<h2 className="border-b-1 border-muted font-bold pb-2 pt-3">Datos Personales</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo / Empresa *</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Ej. Juan Pérez"
                    />
                    <InputError message={errors.name} />
                </div>

				<div className="space-y-2">
					<Label htmlFor="age">Edad {data.type === 'cliente' && '*'}</Label>
					<Input
						id="age"
						type="number"
						value={data.age}
						onChange={(e) => setData('age', e.target.value)}
						placeholder="Ej. 25"
					/>
					<InputError message={errors.age} />
				</div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="gender">Género *</Label>
                    <Select value={data.gender} onValueChange={(value) => setData('gender', value)}>
                        <SelectTrigger className='w-full'>
                            <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Mujer">Mujer</SelectItem>
                            <SelectItem value="Hombre">Hombre</SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={errors.gender} />
                </div>
				<div className="space-y-2">
					<Label htmlFor="id_number">{data.type === 'cliente' ? 'Identidad' : 'RTN'} *</Label>
					<Input
						id="id_number"
						value={data.id_number}
						onChange={(e) => setData('id_number', e.target.value)}
						placeholder={data.type === 'cliente' ? 'Ej. 0801-1990-12345' : 'Ej. 0801-1990-12345'}
					/>
					<InputError message={errors.id_number} />
				</div>
            </div>


			<h2 className="border-b-1 border-muted font-bold pb-2 pt-3">Contacto</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono 1 *</Label>
                    <Input
                        id="phone"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        placeholder="Ej. 9970-7668"
                    />
                    <InputError message={errors.phone} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="secondary_phone">Teléfono 2</Label>
                    <Input
                        id="secondary_phone"
                        value={data.secondary_phone}
                        onChange={(e) => setData('secondary_phone', e.target.value)}
                        placeholder="Opcional"
                    />
                    <InputError message={errors.secondary_phone} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="state">Departamento *</Label>
                    <Input
                        id="state"
                        value={data.state}
                        onChange={(e) => setData('state', e.target.value)}
                        placeholder="Ej. Cortés"
                    />
                    <InputError message={errors.state} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="city">Municipio *</Label>
                    <Input
                        id="city"
                        value={data.city}
                        onChange={(e) => setData('city', e.target.value)}
                        placeholder="Ej. San Pedro Sula"
                    />
                    <InputError message={errors.city} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                    id="address"
                    value={data.address}
                    onChange={(e) => setData('address', e.target.value)}
                    placeholder="Ej. Calle 123, Colonia..."
                />
                <InputError message={errors.address} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    placeholder="alguien@ejemplo.com"
                />
                <InputError message={errors.email} />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing}>
                    {customer?.id ? 'Actualizar Cliente' : 'Guardar Cliente'}
                </Button>
            </div>
        </form>
    );
}
