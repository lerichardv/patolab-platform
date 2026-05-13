import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormEventHandler } from 'react';
import InputError from '@/components/input-error';
import { toast } from 'sonner';
import { update as updateInventory, store as storeInventory } from '@/actions/App/Http/Controllers/InventoryController';

interface Storage {
    id: number;
    name: string;
}

interface Product {
    id: number;
    code: string;
    name: string;
}

interface Inventory {
    id?: number;
    storage: number;
    product: number;
    quantity: number;
}

interface Props {
    inventory?: Inventory;
    storages: Storage[];
    products: Product[];
    onSuccess: () => void;
}

export default function InventoryForm({ inventory, storages, products, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        storage: inventory?.storage?.toString() || '',
        product: inventory?.product?.toString() || '',
        quantity: inventory?.quantity || 0,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (inventory?.id) {
            put(updateInventory(inventory.id).url, {
                onSuccess: () => {
                    toast.success('Inventario actualizado correctamente');
                    onSuccess();
                    reset();
                },
            });
        } else {
            post(storeInventory().url, {
                onSuccess: () => {
                    toast.success('Inventario registrado correctamente');
                    onSuccess();
                    reset();
                },
            });
        }
    };

    return (
        <form onSubmit={submit} className="space-y-6 py-6 px-5">
            <div className="space-y-2">
                <Label htmlFor="product">Producto *</Label>
                <Select 
                    value={data.product} 
                    onValueChange={(value) => setData('product', value)}
                    disabled={!!inventory?.id}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccione un producto" />
                    </SelectTrigger>
                    <SelectContent>
                        {products.map(product => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} ({product.code})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={errors.product} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="storage">Almacén / Bodega *</Label>
                <Select 
                    value={data.storage} 
                    onValueChange={(value) => setData('storage', value)}
                    disabled={!!inventory?.id}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccione un almacén" />
                    </SelectTrigger>
                    <SelectContent>
                        {storages.map(storage => (
                            <SelectItem key={storage.id} value={storage.id.toString()}>
                                {storage.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={errors.storage} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad en Stock *</Label>
                <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={data.quantity}
                    onChange={(e) => setData('quantity', Number(e.target.value))}
                    placeholder="Ej. 50"
                />
                <InputError message={errors.quantity} />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing} className="w-full md:w-auto">
                    {inventory?.id ? 'Actualizar Existencia' : 'Guardar Ajuste'}
                </Button>
            </div>
        </form>
    );
}
