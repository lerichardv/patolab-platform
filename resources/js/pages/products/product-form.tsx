import { useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';
import {
    update as updateProduct,
    store as storeProduct,
} from '@/actions/App/Http/Controllers/ProductController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface Price {
    id?: number;
    amount: number | string;
}

interface Product {
    id?: number;
    code: string;
    name: string;
    description: string;
    unit: 'percentage' | 'miligrams' | 'unit';
    unit_value: number;
    purchase_price: number;
    sale_price: number;
    isv: boolean;
    prices?: Price[];
}

interface Props {
    product?: Product;
    onSuccess: () => void;
}

export default function ProductForm({ product, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: product?.name || '',
        description: product?.description || '',
        unit: product?.unit || 'unit',
        unit_value: product?.unit_value || 0,
        purchase_price: product?.purchase_price || 0,
        isv: product?.isv || false,
        prices: product?.prices || ([] as Price[]),
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

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (product?.id) {
            put(updateProduct(product.id).url, {
                onSuccess: () => {
                    toast.success('Producto actualizado correctamente');
                    onSuccess();
                    reset();
                },
            });
        } else {
            post(storeProduct().url, {
                onSuccess: () => {
                    toast.success('Producto creado correctamente');
                    onSuccess();
                    reset();
                },
            });
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Alcohol Etílico"
                />
                <InputError message={errors.name} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Detalles sobre el producto..."
                    rows={3}
                />
                <InputError message={errors.description} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="unit">Unidad de Medida *</Label>
                    <Select
                        value={data.unit}
                        onValueChange={(value: any) => setData('unit', value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione unidad" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unit">Unidad</SelectItem>
                            <SelectItem value="percentage">
                                Porcentaje
                            </SelectItem>
                            <SelectItem value="miligrams">
                                Miligramos
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={errors.unit} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="unit_value">Valor de Unidad *</Label>
                    <Input
                        id="unit_value"
                        type="number"
                        value={data.unit_value}
                        onChange={(e) =>
                            setData('unit_value', Number(e.target.value))
                        }
                    />
                    <InputError message={errors.unit_value} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="purchase_price">
                        Precio de Compra (L.) *
                    </Label>
                    <Input
                        id="purchase_price"
                        type="number"
                        step="0.01"
                        value={data.purchase_price}
                        onChange={(e) =>
                            setData('purchase_price', Number(e.target.value))
                        }
                    />
                    <InputError message={errors.purchase_price} />
                </div>

                <div className="flex items-center space-x-2 py-8">
                    <Switch
                        id="isv"
                        checked={data.isv}
                        onCheckedChange={(checked) => setData('isv', checked)}
                    />
                    <Label htmlFor="isv">ISV</Label>
                    <InputError message={errors.isv} />
                </div>
            </div>

            <div className="grid gap-3 pt-2">
                <Label>Precios de Venta (L.)</Label>
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

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing}>
                    {product?.id ? 'Actualizar Producto' : 'Guardar Producto'}
                </Button>
            </div>
        </form>
    );
}
