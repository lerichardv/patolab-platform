import { useForm } from '@inertiajs/react';
import { Palette, Plus, Trash2 } from 'lucide-react';
import React, { useEffect } from 'react';
import { SwatchesPicker } from 'react-color';
import type { ColorResult } from 'react-color';
import { toast } from 'sonner';
import {
    store as storeCuttingCode,
    update as updateCuttingCode,
} from '@/actions/App/Http/Controllers/CuttingCodeController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

const PRESET_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#64748b', // Slate
];

interface CuttingCode {
    id: number;
    code: string;
    color: string;
}

interface Props {
    cuttingCode?: CuttingCode | null;
    onSuccess: () => void;
}

export default function CuttingCodeForm({ cuttingCode, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors, reset } = useForm<{
        code: string;
        color: string;
        codes?: { code: string; color: string }[];
    }>({
        code: cuttingCode?.code || '',
        color: cuttingCode?.color || '#4f46e5',
        codes: cuttingCode ? undefined : [{ code: '', color: '#4f46e5' }],
    });

    useEffect(() => {
        if (cuttingCode) {
            setData({
                code: cuttingCode.code,
                color: cuttingCode.color,
                codes: undefined,
            });
        } else {
            setData({
                code: '',
                color: '#4f46e5',
                codes: [{ code: '', color: '#4f46e5' }],
            });
        }
    }, [cuttingCode, setData]);

    const updateRow = (
        index: number,
        field: 'code' | 'color',
        value: string,
    ) => {
        if (!data.codes) {
            return;
        }

        const newCodes = [...data.codes];
        newCodes[index] = { ...newCodes[index], [field]: value };
        setData('codes', newCodes);
    };

    const addRow = () => {
        if (!data.codes) {
            return;
        }

        setData('codes', [...data.codes, { code: '', color: '#4f46e5' }]);
    };

    const removeRow = (index: number) => {
        if (!data.codes || data.codes.length <= 1) {
            return;
        }

        const newCodes = data.codes.filter((_, i) => i !== index);
        setData('codes', newCodes);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (cuttingCode?.id) {
            put(updateCuttingCode(cuttingCode.id).url, {
                onSuccess: () => {
                    toast.success('Código de casete actualizado correctamente');
                    onSuccess();
                    reset();
                },
            });
        } else {
            post(storeCuttingCode().url, {
                onSuccess: () => {
                    toast.success('Códigos de casete creados correctamente');
                    onSuccess();
                    reset();
                },
            });
        }
    };

    // If editing a single cutting code, display standard single-row layout
    if (cuttingCode) {
        return (
            <form onSubmit={submit} className="space-y-4 px-5">
                <div className="space-y-2">
                    <Label htmlFor="edit-code">
                        Código (Letra/Identificador)
                    </Label>
                    <Input
                        id="edit-code"
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value)}
                        placeholder="Ej. A, B, 1A..."
                        maxLength={2}
                        className="uppercase"
                        required
                    />
                    <InputError message={errors.code} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="edit-color">Color Asociado</Label>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div
                                className="h-10 w-12 shrink-0 rounded-md border border-input shadow-sm transition-all"
                                style={{ backgroundColor: data.color }}
                            />
                            <Input
                                type="text"
                                id="edit-color"
                                value={data.color}
                                onChange={(e) =>
                                    setData('color', e.target.value)
                                }
                                placeholder="#ffffff"
                                className="h-10 flex-1 font-mono uppercase"
                                maxLength={7}
                                required
                            />
                        </div>

                        {/* Quick preset color selectors */}
                        <div className="flex flex-wrap items-center justify-center gap-2 py-2">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setData('color', color)}
                                    className="h-7 w-7 cursor-pointer rounded-full border border-slate-300 shadow-sm transition-all duration-150 hover:scale-110 active:scale-95 dark:border-slate-700"
                                    style={{
                                        backgroundColor: color,
                                        boxShadow:
                                            data.color.toLowerCase() ===
                                            color.toLowerCase()
                                                ? '0 0 0 2px var(--background), 0 0 0 4px #4f46e5'
                                                : 'none',
                                    }}
                                    title={color}
                                />
                            ))}

                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-muted-foreground/60 text-muted-foreground transition-all duration-150 hover:scale-110 hover:border-primary hover:text-primary active:scale-95"
                                        title="Más colores..."
                                    >
                                        <Palette className="h-4 w-4" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="z-[150] w-[340px] p-3"
                                    align="center"
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                >
                                    <div className="flex max-h-[220px] justify-center overflow-x-hidden overflow-y-auto rounded-md border bg-muted/20 p-1">
                                        <SwatchesPicker
                                            color={data.color}
                                            onChangeComplete={(color: ColorResult) =>
                                                setData('color', color.hex)
                                            }
                                            width={320}
                                            styles={{
                                                default: {
                                                    picker: {
                                                        boxShadow: 'none',
                                                        border: 'none',
                                                        background:
                                                            'transparent',
                                                    },
                                                },
                                            }}
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <InputError message={errors.color} />
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
            {errors.codes && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                    {errors.codes}
                </div>
            )}

            <div className="space-y-2">
                {data.codes?.map((item, index) => (
                    <div
                        key={index}
                        className="relative flex items-end gap-3 rounded-lg border bg-muted/40 px-2 pt-1 pb-2 shadow-sm"
                    >
                        <div className="flex-1 space-y-2">
                            <Label htmlFor={`code-${index}`}>
                                Código #{index + 1}
                            </Label>
                            <Input
                                id={`code-${index}`}
                                value={item.code}
                                onChange={(e) =>
                                    updateRow(index, 'code', e.target.value)
                                }
                                placeholder="Ej. A, B"
                                maxLength={2}
                                className="font-semibold tracking-wider uppercase"
                                required
                            />
                            <InputError
                                message={
                                    errors[
                                        `codes.${index}.code` as keyof typeof errors
                                    ]
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Color</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex h-10 w-16 cursor-pointer items-center justify-center rounded-md border border-input shadow-sm transition-all duration-150 hover:scale-105 active:scale-95"
                                        style={{ backgroundColor: item.color }}
                                        title="Seleccionar color"
                                    >
                                        <Palette className="h-4 w-4 text-white mix-blend-difference" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="z-[150] w-[340px] p-3"
                                    align="center"
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                >
                                    <div className="space-y-3">
                                        <Label className="text-xs font-semibold">
                                            Predefinidos
                                        </Label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {PRESET_COLORS.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() =>
                                                        updateRow(
                                                            index,
                                                            'color',
                                                            c,
                                                        )
                                                    }
                                                    className="h-8 w-8 cursor-pointer rounded-full border border-slate-300 shadow-sm transition-all duration-150 hover:scale-110 active:scale-95 dark:border-slate-700"
                                                    style={{
                                                        backgroundColor: c,
                                                        boxShadow:
                                                            item.color.toLowerCase() ===
                                                            c.toLowerCase()
                                                                ? '0 0 0 2px var(--background), 0 0 0 3px #4f46e5'
                                                                : 'none',
                                                    }}
                                                    title={c}
                                                />
                                            ))}
                                        </div>

                                        <div className="border-t pt-2">
                                            <Label className="text-xs font-semibold">
                                                Personalizado
                                            </Label>
                                            <div className="mt-1 flex max-h-[220px] justify-center overflow-x-hidden overflow-y-auto rounded-md border bg-muted/20 p-1">
                                                <SwatchesPicker
                                                    color={item.color}
                                                    onChangeComplete={(color: ColorResult) =>
                                                        updateRow(
                                                            index,
                                                            'color',
                                                            color.hex,
                                                            )
                                                        }
                                                    width={320}
                                                    styles={{
                                                        default: {
                                                            picker: {
                                                                boxShadow:
                                                                    'none',
                                                                border: 'none',
                                                                background:
                                                                    'transparent',
                                                            },
                                                        },
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <InputError
                                message={
                                    errors[
                                        `codes.${index}.color` as keyof typeof errors
                                    ]
                                }
                            />
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={!data.codes || data.codes.length <= 1}
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
                    <Plus className="mr-2 h-4 w-4" /> Agregar otro código
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
