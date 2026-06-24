import { useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';
import {
    store as storeRental,
    update as updateRental,
} from '@/actions/App/Http/Controllers/RentalController';
import HeadingSheet from '@/components/heading-sheet';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent } from '@/components/ui/sheet';

import { cn } from '@/lib/utils';

interface Rental {
    id: number;
    name: string;
    description?: string | null;
}

interface Props {
    rental?: Rental | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    className?: string;
    overlayClassName?: string;
}

function RentalForm({
    rental,
    onSuccess,
}: {
    rental?: Rental;
    onSuccess: () => void;
}) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: rental?.name || '',
        description: rental?.description || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (rental?.id) {
            put(updateRental(rental.id).url, {
                onSuccess: () => {
                    toast.success('Otro cobro actualizado correctamente');
                    onSuccess();
                    reset();
                },
            });
        } else {
            post(storeRental().url, {
                onSuccess: () => {
                    toast.success('Otro cobro creado correctamente');
                    onSuccess();
                    reset();
                },
            });
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nombre del Cobro *</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Cobro de Equipo de Laboratorio"
                    required
                />
                <InputError message={errors.name} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Input
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Ej. Cobro de microscopio marca Zeiss por 1 mes"
                />
                <InputError message={errors.description} />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing}>
                    {rental?.id ? 'Actualizar Cobro' : 'Guardar Cobro'}
                </Button>
            </div>
        </form>
    );
}

export default function RentalSheet({
    rental,
    open,
    onOpenChange,
    onSuccess,
    className,
    overlayClassName,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className={cn(
                    'w-full overflow-y-auto sm:max-w-[540px]',
                    className,
                )}
                overlayClassName={overlayClassName}
            >
                <HeadingSheet
                    title={rental ? 'Editar Otro Cobro' : 'Nuevo Otro Cobro'}
                    description={
                        rental
                            ? 'Actualice la información del registro de cobro aquí.'
                            : 'Complete los campos para registrar un nuevo elemento de cobro.'
                    }
                />
                <RentalForm
                    rental={rental || undefined}
                    onSuccess={() => {
                        onOpenChange(false);

                        if (onSuccess) {
                            onSuccess();
                        }
                    }}
                />
            </SheetContent>
        </Sheet>
    );
}
