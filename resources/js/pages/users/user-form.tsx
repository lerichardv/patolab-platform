import { useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
    update as updateUser,
    store as storeUser,
} from '@/actions/App/Http/Controllers/UserController';
import InputError from '@/components/input-error';
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

interface User {
    id?: number;
    name: string;
    email: string;
    role_id?: number;
    password?: string;
    password_confirmation?: string;
}

interface UserFormProps {
    user?: User;
    roles: Array<{ id: number; name: string; slug: string }>;
    onSuccess: () => void;
}

export default function UserForm({ user, roles, onSuccess }: UserFormProps) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: user?.name || '',
        email: user?.email || '',
        role_id: user?.role_id?.toString() || '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        if (user) {
            setData({
                name: user.name,
                email: user.email,
                role_id: user.role_id?.toString() || '',
                password: '',
                password_confirmation: '',
            });
        } else {
            reset();
        }
    }, [user]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (user?.id) {
            put(updateUser(user.id).url, {
                onSuccess: () => {
                    toast.success('Usuario actualizado correctamente');
                    onSuccess();
                    reset('password', 'password_confirmation');
                },
            });
        } else {
            post(storeUser().url, {
                onSuccess: () => {
                    toast.success('Usuario creado correctamente');
                    onSuccess();
                    reset();
                },
            });
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Juan Pérez"
                />
                <InputError message={errors.name} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico *</Label>
                <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    placeholder="juan.perez@ejemplo.com"
                />
                <InputError message={errors.email} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="role_id">Rol del Usuario</Label>
                <Select
                    value={data.role_id}
                    onValueChange={(value) => setData('role_id', value)}
                >
                    <SelectTrigger id="role_id">
                        <SelectValue placeholder="Seleccione un rol" />
                    </SelectTrigger>
                    <SelectContent>
                        {roles.map((role) => (
                            <SelectItem
                                key={role.id}
                                value={role.id.toString()}
                            >
                                {role.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={errors.role_id} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="password">
                        Contraseña {user ? '(Opcional)' : '*'}
                    </Label>
                    <Input
                        id="password"
                        type="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="••••••••"
                    />
                    <InputError message={errors.password} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password_confirmation">
                        Confirmar Contraseña {user ? '(Opcional)' : '*'}
                    </Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        placeholder="••••••••"
                    />
                    <InputError message={errors.password_confirmation} />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing}>
                    {user ? 'Guardar Cambios' : 'Crear Usuario'}
                </Button>
            </div>
        </form>
    );
}
