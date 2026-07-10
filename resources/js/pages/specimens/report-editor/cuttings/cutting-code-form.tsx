import { useForm } from '@inertiajs/react';
import { Palette } from 'lucide-react';
import React from 'react';
import SwatchesPicker from 'react-color/lib/components/swatches/Swatches';
import { toast } from 'sonner';
import { storeCode } from '@/actions/App/Http/Controllers/Editor/CuttingController';
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

interface Props {
    onSuccess: () => void;
}

export default function CuttingCodeForm({ onSuccess }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
        color: '#4f46e5',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(storeCode().url, {
            onSuccess: () => {
                toast.success('Código de casete creado');
                onSuccess();
                reset();
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4 px-5">
            <div className="space-y-2">
                <Label htmlFor="new-code">Código (Letra/Identificador)</Label>
                <Input
                    id="new-code"
                    value={data.code}
                    onChange={(e) => setData('code', e.target.value)}
                    placeholder="Ej. A, B, 1A..."
                    maxLength={2}
                    required
                />
                <InputError message={errors.code} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="new-color">Color Asociado</Label>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div
                            className="h-10 w-12 shrink-0 rounded-md border border-input shadow-sm transition-all"
                            style={{ backgroundColor: data.color }}
                        />
                        <Input
                            type="text"
                            value={data.color}
                            onChange={(e) => setData('color', e.target.value)}
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
                            >
                                <div className="flex justify-center">
                                    <SwatchesPicker
                                        color={data.color}
                                        onChangeComplete={(color) =>
                                            setData('color', color.hex)
                                        }
                                        width={320}
                                        styles={{
                                            default: {
                                                picker: {
                                                    boxShadow: 'none',
                                                    border: 'none',
                                                    background: 'transparent',
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

            <div className="flex justify-end gap-2 pt-3">
                <Button type="submit" disabled={processing}>
                    Guardar
                </Button>
            </div>
        </form>
    );
}
