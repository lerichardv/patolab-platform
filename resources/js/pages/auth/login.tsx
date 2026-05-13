import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { login as loginRoute, register } from '@/routes';
import { request as forgotPassword } from '@/routes/password';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';

export default function Login({ status, canResetPassword }: { status?: string; canResetPassword?: boolean }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(loginRoute().url, {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Iniciar sesión" />

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="mt-1 block w-full"
                            autoComplete="username"
                            autoFocus
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="nombre@ejemplo.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Contraseña</Label>
                            {canResetPassword && (
                                <Link
                                    href={forgotPassword()}
                                    className="text-sm text-muted-foreground hover:text-primary"
                                >
                                    ¿Olvidó su contraseña?
                                </Link>
                            )}
                        </div>
                        <PasswordInput
                            id="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full"
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="********"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="remember"
                            name="remember"
                            checked={data.remember}
                            onCheckedChange={(checked) => setData('remember', checked as boolean)}
                        />
                        <Label htmlFor="remember" className="text-sm font-normal">
                            Recordarme
                        </Label>
                    </div>

                    <Button type="submit" className="w-full" disabled={processing}>
                        Iniciar sesión
                    </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    ¿No tiene una cuenta?{' '}
                    <Link
                        href={register()}
                        className="underline underline-offset-4 hover:text-primary"
                    >
                        Regístrese
                    </Link>
                </div>
            </form>
        </>
    );
}

Login.layout = {
    title: 'Iniciar sesión',
    description: 'Ingrese sus credenciales para acceder a su cuenta',
};
