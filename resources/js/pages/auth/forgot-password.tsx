import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { email as forgotPasswordRoute } from '@/routes/password';
import InputError from '@/components/input-error';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(forgotPasswordRoute().url);
    };

    return (
        <>
            <Head title="¿Olvidó su contraseña?" />

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="nombre@ejemplo.com"
                    />
                    <InputError message={errors.email} />
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                    Enviar enlace de restablecimiento
                </Button>
            </form>
        </>
    );
}

ForgotPassword.layout = {
    title: '¿Olvidó su contraseña?',
    description: 'Ingrese su correo electrónico y le enviaremos un enlace para restablecerla',
};
