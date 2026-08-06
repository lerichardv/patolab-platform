import { useForm, usePage } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import React, { useEffect } from 'react';
import { toast } from 'sonner';
import {
    store as storeCuttingPrefix,
    update as updateCuttingPrefix,
} from '@/actions/App/Http/Controllers/CuttingPrefixController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CuttingPrefix {
    id: number;
    prefix: string;
}

interface Props {
    cuttingPrefix?: CuttingPrefix | null;
    onSuccess: () => void;
}

export default function CuttingPrefixForm({ cuttingPrefix, onSuccess }: Props) {
    const { props } = usePage() as any;
    const hasPrefixesPermission =
        props.auth?.user?.role?.slug === 'admin' ||
        props.auth?.permissions?.includes('cutting_prefixes.create') ||
        props.auth?.permissions?.includes('cutting_prefixes.edit');

    if (!hasPrefixesPermission) {
        return null;
    }

    const { data, setData, post, put, processing, errors, reset } = useForm<{
        prefix: string;
        prefixes?: { prefix: string }[];
    }>({
        prefix: cuttingPrefix?.prefix || '',
        prefixes: cuttingPrefix ? undefined : [{ prefix: '' }],
    });

    useEffect(() => {
        if (cuttingPrefix) {
            setData({
                prefix: cuttingPrefix.prefix,
                prefixes: undefined,
            });
        } else {
            setData({
                prefix: '',
                prefixes: [{ prefix: '' }],
            });
        }
    }, [cuttingPrefix, setData]);

    const updateRow = (index: number, value: string) => {
        if (!data.prefixes) {
            return;
        }

        const newPrefixes = [...data.prefixes];
        newPrefixes[index] = { prefix: value };
        setData('prefixes', newPrefixes);
    };

    const addRow = () => {
        if (!data.prefixes) {
            return;
        }

        setData('prefixes', [...data.prefixes, { prefix: '' }]);
    };

    const removeRow = (index: number) => {
        if (!data.prefixes || data.prefixes.length <= 1) {
            return;
        }

        const newPrefixes = data.prefixes.filter((_, i) => i !== index);
        setData('prefixes', newPrefixes);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (cuttingPrefix?.id) {
            put(updateCuttingPrefix(cuttingPrefix.id).url, {
                onSuccess: () => {
                    toast.success('Prefijo de corte actualizado correctamente');
                    onSuccess();
                    reset();
                },
            });
        } else {
            post(storeCuttingPrefix().url, {
                onSuccess: () => {
                    toast.success('Prefijos de cortes creados correctamente');
                    onSuccess();
                    reset();
                },
            });
        }
    };

    // If editing a single cutting prefix, display standard single-row layout
    if (cuttingPrefix) {
        return (
            <form onSubmit={submit} className="space-y-4 px-5">
                <div className="space-y-2">
                    <Label htmlFor="edit-prefix">Prefijo</Label>
                    <Input
                        id="edit-prefix"
                        value={data.prefix}
                        onChange={(e) => setData('prefix', e.target.value)}
                        placeholder="Ej. C, H, CH..."
                        maxLength={20}
                        className="uppercase"
                        required
                        autoFocus
                    />
                    <InputError message={errors.prefix} />
                </div>

                <div className="flex justify-end gap-2 border-t pt-3">
                    <Button type="submit" disabled={processing}>
                        Guardar
                    </Button>
                </div>
            </form>
        );
    }

    // Bulk creation layout
    return (
        <form onSubmit={submit} className="space-y-6 px-5 py-2">
            {errors.prefixes && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                    {errors.prefixes}
                </div>
            )}

            <div className="space-y-2">
                {data.prefixes?.map((item, index) => (
                    <div
                        key={index}
                        className="relative flex items-end gap-3 rounded-lg border bg-muted/40 px-2 pt-1 pb-2 shadow-sm"
                    >
                        <div className="flex-1 space-y-2">
                            <Label htmlFor={`prefix-${index}`}>
                                Prefijo #{index + 1}
                            </Label>
                            <Input
                                id={`prefix-${index}`}
                                value={item.prefix}
                                onChange={(e) =>
                                    updateRow(index, e.target.value)
                                }
                                placeholder="Ej. C, H"
                                maxLength={20}
                                className="font-semibold tracking-wider uppercase"
                                required
                                autoFocus={index === 0}
                            />
                            <InputError
                                message={
                                    errors[
                                        `prefixes.${index}.prefix` as keyof typeof errors
                                    ]
                                }
                            />
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={
                                !data.prefixes || data.prefixes.length <= 1
                            }
                            className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeRow(index)}
                            title="Eliminar fila"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="flex justify-start">
                <Button
                    type="button"
                    variant="outline"
                    onClick={addRow}
                    className="w-full border-dashed"
                >
                    <Plus className="mr-2 h-4 w-4" /> Agregar otro prefijo
                </Button>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
                <Button type="submit" disabled={processing} className="px-6">
                    Guardar todos
                </Button>
            </div>
        </form>
    );
}
