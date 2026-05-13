import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FormEventHandler } from 'react';
import InputError from '@/components/input-error';
import { toast } from 'sonner';
import { update as updateProduct, store as storeProduct } from '@/actions/App/Http/Controllers/ProductController';

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
        sale_price: product?.sale_price || 0,
        isv: product?.isv || false,
    });

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
        <form onSubmit={submit} className="space-y-4 py-4 px-5">
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
                    <Select value={data.unit} onValueChange={(value: any) => setData('unit', value)}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione unidad" />
                        </SelectTrigger>
                        <SelectContent >
                            <SelectItem value="unit">Unidad</SelectItem>
                            <SelectItem value="percentage">Porcentaje</SelectItem>
                            <SelectItem value="miligrams">Miligramos</SelectItem>
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
                        onChange={(e) => setData('unit_value', Number(e.target.value))}
                    />
                    <InputError message={errors.unit_value} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="purchase_price">Precio de Compra (L.) *</Label>
                    <Input
                        id="purchase_price"
                        type="number"
                        step="0.01"
                        value={data.purchase_price}
                        onChange={(e) => setData('purchase_price', Number(e.target.value))}
                    />
                    <InputError message={errors.purchase_price} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sale_price">Precio de Venta (L.) *</Label>
                    <Input
                        id="sale_price"
                        type="number"
                        step="0.01"
                        value={data.sale_price}
                        onChange={(e) => setData('sale_price', Number(e.target.value))}
                    />
                    <InputError message={errors.sale_price} />
                </div>
            </div>

            <div className="flex items-center space-x-2 py-2">
                <Switch
                    id="isv"
                    checked={data.isv}
                    onCheckedChange={(checked) => setData('isv', checked)}
                />
                <Label htmlFor="isv">ISV</Label>
                <InputError message={errors.isv} />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing}>
                    {product?.id ? 'Actualizar Producto' : 'Guardar Producto'}
                </Button>
            </div>
        </form>
    );
}
