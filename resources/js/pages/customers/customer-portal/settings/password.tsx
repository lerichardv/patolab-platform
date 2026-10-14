import { Head, useForm } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { update as updatePassword } from '@/routes/customer-portal/settings/password';

export default function CustomerPortalPassword() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, put, processing, errors, reset, wasSuccessful } =
        useForm({
            current_password: '',
            password: '',
            password_confirmation: '',
        });

    useEffect(() => {
        if (wasSuccessful) {
            toast.success('Contraseña actualizada correctamente');
        }
    }, [wasSuccessful]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        put(updatePassword().url, {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errs) => {
                if (errs.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errs.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <div className="flex max-w-2xl flex-col gap-6">
            <Head title="Cambiar Contraseña — Portal de Clientes" />

            <div className="flex flex-col gap-1">
                <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                    <KeyRound className="h-5 w-5 text-primary" />
                    Seguridad y Contraseña
                </h1>
                <p className="text-xs text-muted-foreground">
                    Asegúrese de utilizar una contraseña segura para proteger el
                    acceso a sus reportes clínicos.
                </p>
            </div>

            <Card className="border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-semibold">
                        Actualizar Contraseña
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Ingrese su contraseña actual y defina una nueva
                        contraseña de al menos 8 caracteres.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <div className="grid gap-2">
                            <Label
                                htmlFor="current_password"
                                className="text-xs font-medium"
                            >
                                Contraseña Actual
                            </Label>
                            <PasswordInput
                                id="current_password"
                                ref={currentPasswordInput}
                                name="current_password"
                                value={data.current_password}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                onChange={(e) =>
                                    setData('current_password', e.target.value)
                                }
                            />
                            <InputError message={errors.current_password} />
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="password"
                                className="text-xs font-medium"
                            >
                                Nueva Contraseña
                            </Label>
                            <PasswordInput
                                id="password"
                                ref={passwordInput}
                                name="password"
                                value={data.password}
                                autoComplete="new-password"
                                placeholder="••••••••"
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="password_confirmation"
                                className="text-xs font-medium"
                            >
                                Confirmar Nueva Contraseña
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                autoComplete="new-password"
                                placeholder="••••••••"
                                onChange={(e) =>
                                    setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                            />
                            <InputError
                                message={errors.password_confirmation}
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="text-xs font-medium"
                            >
                                {processing
                                    ? 'Guardando...'
                                    : 'Actualizar Contraseña'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
