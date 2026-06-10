import { useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    store as storeSpecimenType,
    update as updateSpecimenType,
} from '@/actions/App/Http/Controllers/SpecimenTypeController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '../../components/ui/textarea';

interface Price {
    id?: number;
    amount: number | string;
}

interface SpecimenType {
    id: number;
    name: string;
    description: string | null;
    prices?: Price[];
}

interface Props {
    specimenType: SpecimenType | null;
    onSuccess: () => void;
}

export default function SpecimenTypeForm({ specimenType, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: specimenType?.name || '',
        description: specimenType?.description || '',
        prices: specimenType?.prices || ([] as Price[]),
    });

    const [newPrice, setNewPrice] = useState<string>('');

    const handleAddPrice = () => {
        if (!newPrice || isNaN(Number(newPrice)) || Number(newPrice) < 0) {
            toast.error('Por favor, ingrese un precio válido.');

            return;
        }

        const priceAmount = parseFloat(newPrice).toFixed(2);

        setData('prices', [...data.prices, { amount: priceAmount }]);
        setNewPrice('');
    };

    const handlePriceChange = (index: number, value: string) => {
        const updatedPrices = [...data.prices];
        updatedPrices[index] = {
            ...updatedPrices[index],
            amount: value,
        };
        setData('prices', updatedPrices);
    };

    const handleRemovePrice = (index: number) => {
        const updatedPrices = data.prices.filter((_, i) => i !== index);
        setData('prices', updatedPrices);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (newPrice.trim() !== '') {
            toast.error(
                'Tiene un precio ingresado sin agregar. Por favor, haga clic en el botón "Agregar" para incluirlo en la lista o limpie el campo antes de continuar.',
            );

            return;
        }

        const options = {
            onSuccess: () => {
                toast.success(
                    specimenType
                        ? 'Tipo de muestra actualizado'
                        : 'Tipo de muestra creado',
                );
                onSuccess();
            },
        };

        if (specimenType) {
            put(updateSpecimenType(specimenType.id).url, options);
        } else {
            post(storeSpecimenType().url, options);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-5 py-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Biopsia, Citología..."
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Descripción opcional del tipo de muestra..."
                    className="resize-none"
                    rows={3}
                />
                {errors.description && (
                    <p className="text-sm text-destructive">
                        {errors.description}
                    </p>
                )}
            </div>

            <div className="grid gap-3">
                <Label>Lista de Precios (L.)</Label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute top-2.5 left-3 text-sm text-muted-foreground">
                            L.
                        </span>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="pl-7"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddPrice();
                                }
                            }}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddPrice}
                    >
                        <Plus className="mr-1 h-4 w-4" /> Agregar
                    </Button>
                </div>

                <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-md border p-2">
                    {data.prices.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                            No se han agregado precios aún.
                        </p>
                    ) : (
                        data.prices.map((price, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between gap-3"
                            >
                                <div className="relative flex-1">
                                    <span className="absolute top-2 left-3 font-mono text-sm text-muted-foreground">
                                        L.
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={price.amount}
                                        onChange={(e) =>
                                            handlePriceChange(
                                                idx,
                                                e.target.value,
                                            )
                                        }
                                        className="h-8 pl-7 font-mono"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive/90"
                                    onClick={() => handleRemovePrice(idx)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
                {errors.prices && (
                    <p className="text-sm text-destructive">{errors.prices}</p>
                )}
                {Object.keys(errors).some((key) =>
                    key.startsWith('prices.'),
                ) && (
                    <p className="text-sm text-destructive">
                        Por favor, revise que todos los precios sean válidos.
                    </p>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full md:w-auto"
                >
                    {processing && <Spinner className="mr-2" />}
                    {specimenType ? 'Guardar Cambios' : 'Crear Tipo de Muestra'}
                </Button>
            </div>
        </form>
    );
}
