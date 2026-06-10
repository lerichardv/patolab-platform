import { useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';
import { abastecer as abastecerAction } from '@/actions/App/Http/Controllers/InventoryController';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

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
    const { data, setData, post, processing, errors, reset } = useForm<{
        items: { inventory_id: number; quantity: number }[];
    }>({
        items: [],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (data.items.length === 0) {
            toast.error('Debe agregar al menos un producto para abastecer');

            return;
        }

        post(abastecerAction().url, {
            onSuccess: () => {
                toast.success('Inventario abastecido correctamente');
                onSuccess();
                reset();
            },
        });
    };

    const isItemDisabled = (inventoryId: number) => {
        return data.items.some((item) => item.inventory_id === inventoryId);
    };

    return (
        <form onSubmit={submit} className="space-y-6 px-5 py-6">
            <div className="space-y-2">
                <Label htmlFor="inventory_id">Registro de Inventario *</Label>
                <Select
                    value=""
                    onValueChange={(value) => {
                        const inventoryId = Number(value);
                        const inv = inventories.find(
                            (i) => i.id === inventoryId,
                        );

                        if (
                            inv &&
                            !data.items.some(
                                (item) => item.inventory_id === inventoryId,
                            )
                        ) {
                            setData('items', [
                                ...data.items,
                                { inventory_id: inventoryId, quantity: 1 },
                            ]);
                        }
                    }}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccione producto y almacén" />
                    </SelectTrigger>
                    <SelectContent>
                        {inventories.map((item) => {
                            const disabled = isItemDisabled(item.id);

                            return (
                                <SelectItem
                                    key={item.id}
                                    value={item.id.toString()}
                                    disabled={disabled}
                                >
                                    {item.product_relation.name} (
                                    {item.product_relation.code}) -{' '}
                                    {item.storage_relation.name} (Actual:{' '}
                                    {item.quantity}) {disabled && '(Agregado)'}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
                <InputError message={errors.items as string} />
            </div>

            <div className="space-y-2">
                <Label>Productos a abastecer</Label>
                <div className="overflow-hidden rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto / Bodega</TableHead>
                                <TableHead className="w-[150px]">
                                    Cantidad *
                                </TableHead>
                                <TableHead className="w-[80px] text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.items.length > 0 ? (
                                data.items.map((item, index) => {
                                    const inv = inventories.find(
                                        (i) => i.id === item.inventory_id,
                                    );

                                    return (
                                        <TableRow key={item.inventory_id}>
                                            <TableCell className="py-2">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">
                                                        {
                                                            inv
                                                                ?.product_relation
                                                                .name
                                                        }
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Bodega:{' '}
                                                        {
                                                            inv
                                                                ?.storage_relation
                                                                .name
                                                        }{' '}
                                                        | Actual:{' '}
                                                        {inv?.quantity}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const newQty = Number(
                                                            e.target.value,
                                                        );
                                                        const updatedItems = [
                                                            ...data.items,
                                                        ];
                                                        updatedItems[
                                                            index
                                                        ].quantity = newQty;
                                                        setData(
                                                            'items',
                                                            updatedItems,
                                                        );
                                                    }}
                                                    className="h-9"
                                                />
                                                <InputError
                                                    message={
                                                        errors[
                                                            `items.${index}.quantity` as keyof typeof errors
                                                        ]
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="py-2 text-right">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        const updatedItems =
                                                            data.items.filter(
                                                                (_, i) =>
                                                                    i !== index,
                                                            );
                                                        setData(
                                                            'items',
                                                            updatedItems,
                                                        );
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No hay productos agregados para
                                        abastecer. Seleccione uno arriba.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full md:w-auto"
                >
                    Abastecer
                </Button>
            </div>
        </form>
    );
}
