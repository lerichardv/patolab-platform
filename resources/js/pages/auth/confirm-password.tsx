import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { store as confirmPasswordRoute } from '@/routes/password/confirm';
import InputError from '@/components/input-error';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(confirmPasswordRoute().url, {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Confirmar contraseña" />

            <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    <InputError message={errors.password} />
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                    Confirmar
                </Button>
            </form>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'Confirmar contraseña',
    description: 'Esta es una zona segura de la aplicación. Por favor, confirme su contraseña antes de continuar.',
};
