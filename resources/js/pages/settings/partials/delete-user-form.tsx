import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { destroy } from '@/routes/profile';
import InputError from '@/components/input-error';

export default function DeleteUserForm() {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        delete: destroyUser,
        processing,
        reset,
        errors,
    } = useForm({
        password: '',
    });

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroyUser(destroy().url, {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        reset();
    };

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-lg font-medium text-foreground">Eliminar cuenta</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Una vez que se elimine su cuenta, todos sus recursos y datos se eliminarán de forma permanente.
                </p>
            </header>

            <AlertDialog open={confirmingUserDeletion} onOpenChange={setConfirmingUserDeletion}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">Eliminar cuenta</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <form onSubmit={deleteUser}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Está seguro de que desea eliminar su cuenta?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Una vez que se elimine su cuenta, todos sus recursos y datos se eliminarán de forma permanente.
                                Por favor, ingrese su contraseña para confirmar que desea eliminar su cuenta de forma permanente.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="mt-6">
                            <Label htmlFor="password" title="Contraseña" className="sr-only" />
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Contraseña"
                                autoFocus
                            />
                            <InputError message={errors.password} className="mt-2" />
                        </div>

                        <AlertDialogFooter className="mt-6">
                            <AlertDialogCancel onClick={closeModal}>Cancelar</AlertDialogCancel>
                            <Button variant="destructive" disabled={processing} type="submit">
                                Eliminar cuenta
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
