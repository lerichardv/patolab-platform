import { useForm, usePage } from '@inertiajs/react';
import { ExternalLink, KeyRound, ShieldCheck } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    update as updateCustomer,
    store as storeCustomer,
    checkEmail as checkCustomerEmail,
} from '@/actions/App/Http/Controllers/CustomerController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { login as customerPortalLogin } from '@/routes/customer-portal';

interface Department {
    id: number;
    name: string;
    code: string | null;
}

interface Municipality {
    id: number;
    name: string;
    code: string | null;
    department_id: number;
}

interface Customer {
    id?: number;
    name: string;
    id_number: string;
    type: 'cliente' | 'empresa';
    age: number | string;
    age_unit?: 'years' | 'months' | 'days' | string;
    phone: string;
    secondary_phone: string;
    gender: string;
    state: string | number;
    city: string | number;
    address: string;
    email: string;
    portal_access?: boolean;
}

interface Props {
    customer?: Customer;
    onSuccess: (updatedCustomer?: any) => void;
}

export default function CustomerForm({ customer, onSuccess }: Props) {
    const { auth } = usePage<any>().props;
    const canManagePortal = Boolean(
        auth?.permissions?.includes('patients.portal_access'),
    );

    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
        setError,
        clearErrors,
        reset,
    } = useForm({
        name: customer?.name || '',
        id_number: customer?.id_number || '',
        type: customer?.type || 'cliente',
        age: customer?.age || '',
        age_unit: customer?.age_unit || 'years',
        phone: customer?.phone || '',
        secondary_phone: customer?.secondary_phone || '',
        gender: customer?.gender || '',
        state: customer?.state || '',
        city: customer?.city || '',
        address: customer?.address || '',
        email: customer?.email || '',
        portal_access: customer?.portal_access ?? false,
        password: '',
        send_portal_email: false,
    });

    const isEmailRequired =
        (canManagePortal && Boolean(data.portal_access)) ||
        !customer?.id ||
        (!!customer?.email && customer.email.trim() !== '');

    const [departments, setDepartments] = useState<Department[]>([]);
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);

    useEffect(() => {
        fetch('/departments')
            .then((res) => res.json())
            .then((data) => setDepartments(data))
            .catch((err) => console.error('Error fetching departments:', err));
    }, []);

    useEffect(() => {
        if (data.state) {
            fetch(`/departments/${data.state}/municipalities`)
                .then((res) => res.json())
                .then((munis) => {
                    setMunicipalities(munis);
                    const exists = munis.some(
                        (m: Municipality) => String(m.id) === String(data.city),
                    );

                    if (!exists && data.city && departments.length > 0) {
                        setData('city', '');
                    }
                })
                .catch((err) =>
                    console.error('Error fetching municipalities:', err),
                );
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMunicipalities([]);
            setData('city', '');
        }
    }, [data.state, departments.length]);

    const checkEmailUniqueness = async (
        emailToCheck: string,
        isPortalActive: boolean,
    ): Promise<boolean> => {
        if (!isPortalActive || !emailToCheck || emailToCheck.trim() === '') {
            return true;
        }

        try {
            const query: Record<string, string> = {
                email: emailToCheck.trim(),
            };

            if (customer?.id) {
                query.ignore_id = String(customer.id);
            }

            const response = await fetch(checkCustomerEmail({ query }).url);
            const result = await response.json();

            if (!result.unique) {
                setError(
                    'email',
                    result.message ||
                        'Este correo electrónico ya está siendo utilizado por otro cliente y no puede ser usado para este cliente porque causará conflicto con el acceso al portal.',
                );

                return false;
            }

            if (
                errors.email &&
                errors.email.includes('conflicto con el acceso al portal')
            ) {
                clearErrors('email');
            }

            return true;
        } catch (err) {
            console.error('Error verificando disponibilidad de correo:', err);

            return true;
        }
    };

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!data.phone || data.phone.trim() === '') {
            setError('phone', 'El campo teléfono es obligatorio.');

            return;
        }

        if (isEmailRequired && (!data.email || data.email.trim() === '')) {
            setError('email', 'El campo correo es obligatorio.');

            return;
        }

        if (data.portal_access) {
            const isUnique = await checkEmailUniqueness(data.email, true);

            if (!isUnique) {
                return;
            }
        }

        if (customer?.id) {
            put(updateCustomer(customer.id).url, {
                onSuccess: () => {
                    toast.success('Cliente actualizado correctamente');
                    onSuccess({ ...customer, ...data });
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
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
            <div className="space-y-2">
                <Label htmlFor="type">Tipo Cliente *</Label>
                <Select
                    value={data.type}
                    onValueChange={(value: 'cliente' | 'empresa') =>
                        setData('type', value)
                    }
                >
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

            <h2 className="border-b-1 border-muted pt-3 pb-2 font-bold">
                Datos Personales
            </h2>

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
                    <Label htmlFor="id_number">
                        {data.type === 'cliente' ? 'Identidad / RTN' : 'RTN'} *
                    </Label>
                    <Input
                        id="id_number"
                        value={data.id_number}
                        onChange={(e) => setData('id_number', e.target.value)}
                        placeholder={
                            data.type === 'cliente'
                                ? 'Ej. 0801-1990-12345'
                                : 'Ej. 0801-1990-12345'
                        }
                    />
                    <InputError message={errors.id_number} />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="gender">Género (Opcional)</Label>
                    <Select
                        value={data.gender}
                        onValueChange={(value) => setData('gender', value)}
                    >
                        <SelectTrigger className="w-full">
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
                    <Label htmlFor="age">Edad (Opcional)</Label>
                    <div className="flex gap-2">
                        <Input
                            id="age"
                            type="number"
                            min="0"
                            value={data.age}
                            onChange={(e) => setData('age', e.target.value)}
                            placeholder="Ej. 25"
                            className="w-3/5"
                        />
                        <Select
                            value={data.age_unit}
                            onValueChange={(value) =>
                                setData('age_unit', value)
                            }
                        >
                            <SelectTrigger className="w-2/5">
                                <SelectValue placeholder="Unidad" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="years">Años</SelectItem>
                                <SelectItem value="months">Meses</SelectItem>
                                <SelectItem value="days">Días</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <InputError message={errors.age} />
                    <InputError message={errors.age_unit} />
                </div>
            </div>

            <h2 className="border-b-1 border-muted pt-3 pb-2 font-bold">
                Contacto
            </h2>

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
                    <Label htmlFor="secondary_phone">
                        Teléfono 2 (Opcional)
                    </Label>
                    <Input
                        id="secondary_phone"
                        value={data.secondary_phone}
                        onChange={(e) =>
                            setData('secondary_phone', e.target.value)
                        }
                        placeholder="Ej. 9970-7668"
                    />
                    <InputError message={errors.secondary_phone} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="state">Departamento (Opcional)</Label>
                    <Select
                        value={data.state ? String(data.state) : ''}
                        onValueChange={(value) => setData('state', value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione Departamento" />
                        </SelectTrigger>
                        <SelectContent>
                            {departments.map((dept) => (
                                <SelectItem
                                    key={dept.id}
                                    value={String(dept.id)}
                                >
                                    {dept.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.state} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="city">Municipio (Opcional)</Label>
                    <Select
                        value={data.city ? String(data.city) : ''}
                        onValueChange={(value) => setData('city', value)}
                        disabled={!data.state}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione Municipio" />
                        </SelectTrigger>
                        <SelectContent>
                            {municipalities.map((muni) => (
                                <SelectItem
                                    key={muni.id}
                                    value={String(muni.id)}
                                >
                                    {muni.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.city} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="address">Dirección (Opcional)</Label>
                <Input
                    id="address"
                    value={data.address}
                    onChange={(e) => setData('address', e.target.value)}
                    placeholder="Ej. Calle 123, Colonia..."
                />
                <InputError message={errors.address} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">
                    Correo {isEmailRequired ? '*' : '(Opcional)'}
                </Label>
                <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => {
                        setData('email', e.target.value);

                        if (errors.email) {
                            clearErrors('email');
                        }
                    }}
                    onBlur={() => {
                        if (data.portal_access && data.email) {
                            void checkEmailUniqueness(data.email, true);
                        }
                    }}
                    placeholder="alguien@ejemplo.com"
                />
                <InputError message={errors.email} />
            </div>

            {canManagePortal ? (
                <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                                Portal de Clientes y Pacientes
                            </span>
                        </div>

                        {Boolean(
                            customer?.portal_access || data.portal_access,
                        ) && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 px-2.5 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                asChild
                            >
                                <a
                                    href={customerPortalLogin().url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Abrir Portal del Cliente"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span>Abrir Portal</span>
                                </a>
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="portal_access"
                            checked={data.portal_access}
                            onCheckedChange={(checked) => {
                                const isChecked = Boolean(checked);

                                setData('portal_access', isChecked);

                                if (!isChecked) {
                                    if (
                                        errors.email &&
                                        customer?.id &&
                                        (!customer?.email ||
                                            customer.email.trim() === '')
                                    ) {
                                        clearErrors('email');
                                    }

                                    if (
                                        errors.email &&
                                        errors.email.includes(
                                            'conflicto con el acceso al portal',
                                        )
                                    ) {
                                        clearErrors('email');
                                    }
                                } else if (
                                    data.email &&
                                    data.email.trim() !== ''
                                ) {
                                    void checkEmailUniqueness(data.email, true);
                                }
                            }}
                        />
                        <Label
                            htmlFor="portal_access"
                            className="cursor-pointer text-sm font-normal"
                        >
                            Habilitar acceso al portal para este cliente
                        </Label>
                    </div>

                    {data.portal_access && (
                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="portal_password">
                                    <span className="flex items-center gap-1.5">
                                        <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                                        {customer?.id
                                            ? 'Nueva Contraseña (Opcional)'
                                            : 'Contraseña (Opcional)'}
                                    </span>
                                </Label>
                                <Input
                                    id="portal_password"
                                    type="text"
                                    value={data.password}
                                    className="mt-2"
                                    onChange={(e) =>
                                        setData('password', e.target.value)
                                    }
                                    placeholder={
                                        customer?.id
                                            ? 'Dejar en blanco para conservar la actual'
                                            : 'Dejar en blanco para autogenerar'
                                    }
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="send_portal_email"
                                    checked={data.send_portal_email}
                                    onCheckedChange={(checked) =>
                                        setData(
                                            'send_portal_email',
                                            checked as boolean,
                                        )
                                    }
                                    disabled={
                                        !data.email || data.email.trim() === ''
                                    }
                                />
                                <Label
                                    htmlFor="send_portal_email"
                                    className="cursor-pointer text-sm font-normal text-muted-foreground"
                                >
                                    Enviar credenciales de acceso al correo al
                                    guardar
                                </Label>
                            </div>
                        </div>
                    )}
                </div>
            ) : customer?.portal_access ? (
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm text-muted-foreground">
                            Este cliente tiene acceso activo al portal.
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 px-2.5 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                        asChild
                    >
                        <a
                            href={customerPortalLogin().url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir Portal del Cliente"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Abrir Portal</span>
                        </a>
                    </Button>
                </div>
            ) : null}

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing}>
                    {customer?.id ? 'Actualizar Cliente' : 'Guardar Cliente'}
                </Button>
            </div>
        </form>
    );
}
