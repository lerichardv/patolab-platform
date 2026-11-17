import { useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
    store as storeLaboratory,
    update as updateLaboratory,
} from '@/actions/App/Http/Controllers/LaboratoryController';
import HeadingSheet from '@/components/heading-sheet';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface Laboratory {
    id: number;
    name: string;
    is_default: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface Props {
    laboratory?: Laboratory | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    className?: string;
    overlayClassName?: string;
    onSuccess?: () => void;
}

export default function LaboratorySheet({
    laboratory,
    open,
    onOpenChange,
    className,
    overlayClassName,
    onSuccess,
}: Props) {
    const { data, setData, post, put, processing, errors, clearErrors } =
        useForm({
            name: laboratory?.name || '',
            is_default: laboratory?.is_default ?? false,
            is_active: laboratory?.is_active ?? true,
        });

    useEffect(() => {
        if (open) {
            clearErrors();
            setData({
                name: laboratory?.name || '',
                is_default: laboratory?.is_default ?? false,
                is_active: laboratory?.is_active ?? true,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, laboratory]);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (laboratory?.id) {
            put(updateLaboratory(laboratory.id).url, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Laboratorio actualizado exitosamente');
                    onSuccess?.();
                    onOpenChange(false);
                },
            });
        } else {
            post(storeLaboratory().url, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Laboratorio creado exitosamente');
                    onSuccess?.();
                    onOpenChange(false);
                },
            });
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className={cn(
                    'w-full overflow-y-auto sm:max-w-[500px]',
                    className,
                )}
                overlayClassName={overlayClassName}
            >
                <HeadingSheet
                    title={
                        laboratory?.id
                            ? 'Editar Laboratorio'
                            : 'Nuevo Laboratorio'
                    }
                    description={
                        laboratory?.id
                            ? 'Actualice la información y configuración del laboratorio.'
                            : 'Complete los campos para registrar un nuevo laboratorio en el sistema.'
                    }
                />

                <form onSubmit={handleSubmit} className="mt-6 space-y-5 px-5">
                    {/* Nombre */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="lab_name"
                            className="text-xs font-semibold"
                        >
                            Nombre del Laboratorio{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="lab_name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="ej. Laboratorio Patolab"
                            autoFocus
                            className="h-10 text-sm"
                            required
                        />
                        <InputError message={errors.name} />
                    </div>

                    {/* Predeterminado Switch */}
                    <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/20 p-3.5">
                        <div className="space-y-0.5 pr-3">
                            <Label
                                htmlFor="lab_is_default"
                                className="cursor-pointer text-xs font-semibold text-foreground select-none"
                            >
                                Laboratorio Predeterminado
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                                Se seleccionará automáticamente por defecto en
                                las plantillas de stickers térmicos.
                            </p>
                        </div>
                        <Switch
                            id="lab_is_default"
                            checked={data.is_default}
                            onCheckedChange={(checked) =>
                                setData('is_default', checked)
                            }
                        />
                    </div>

                    {/* Activo Switch */}
                    <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/20 p-3.5">
                        <div className="space-y-0.5 pr-3">
                            <Label
                                htmlFor="lab_is_active"
                                className="cursor-pointer text-xs font-semibold text-foreground select-none"
                            >
                                Laboratorio Activo
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                                Permite que este laboratorio esté visible y
                                disponible para selección en el sistema.
                            </p>
                        </div>
                        <Switch
                            id="lab_is_active"
                            checked={data.is_active}
                            onCheckedChange={(checked) =>
                                setData('is_active', checked)
                            }
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {laboratory?.id
                                ? 'Actualizar Laboratorio'
                                : 'Guardar Laboratorio'}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
