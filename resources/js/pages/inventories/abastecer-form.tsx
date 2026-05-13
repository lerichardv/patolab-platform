import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormEventHandler } from 'react';
import InputError from '@/components/input-error';
import { toast } from 'sonner';
import { abastecer as abastecerAction } from '@/actions/App/Http/Controllers/InventoryController';

interface Inventory {
    id: number;
    storage_relation: { name: string };
    product_relation: { name: string; code: string };
    quantity: number;
}

interface Props {
    inventories: Inventory[];
    onSuccess: () => void;
}

export default function AbastecerForm({ inventories, onSuccess }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        inventory_id: '',
        quantity: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!data.inventory_id) return;

        post(abastecerAction(Number(data.inventory_id)).url, {
            onSuccess: () => {
                toast.success('Inventario abastecido correctamente');
                onSuccess();
                reset();
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-6 py-6 px-5">
            <div className="space-y-2">
                <Label htmlFor="inventory_id">Registro de Inventario *</Label>
                <Select 
                    value={data.inventory_id} 
                    onValueChange={(value) => setData('inventory_id', value)}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccione producto y almacén" />
                    </SelectTrigger>
                    <SelectContent>
                        {inventories.map(item => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                                {item.product_relation.name} ({item.product_relation.code}) - {item.storage_relation.name} (Actual: {item.quantity})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={errors.inventory_id} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad a Sumar *</Label>
                <Input
                    id="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={data.quantity}
                    onChange={(e) => setData('quantity', e.target.value)}
                    placeholder="Ej. 100"
                />
                <InputError message={errors.quantity} />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing || !data.inventory_id} className="w-full md:w-auto">
                    Sumar al Inventario
                </Button>
            </div>
        </form>
    );
}
