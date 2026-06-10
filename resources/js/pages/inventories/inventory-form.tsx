import { useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';
import {
    update as updateInventory,
    store as storeInventory,
} from '@/actions/App/Http/Controllers/InventoryController';
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
    existingInventories: { storage: number; product: number }[];
    onSuccess: () => void;
}

export default function InventoryForm({
    inventory,
    storages,
    products,
    existingInventories,
    onSuccess,
}: Props) {
    const { data, setData, post, put, processing, errors, reset } = useForm<{
        storage: string;
        product: string;
        quantity: number;
        items: { product: number; quantity: number }[];
    }>({
        storage:
            inventory?.storage?.toString() ||
            (storages.length === 1 ? storages[0].id.toString() : ''),
        product: inventory?.product?.toString() || '',
        quantity: inventory?.quantity || 0,
        items: [],
    });

    const isProductDisabled = (productId: number) => {
        if (!data.storage) {
            return false;
        }

        const selectedStorageId = Number(data.storage);

        const existsInBackend = existingInventories.some(
            (inv) =>
                inv.storage === selectedStorageId && inv.product === productId,
        );

        if (existsInBackend) {
            return true;
        }

        if (!inventory?.id) {
            const existsInTable = data.items.some(
                (item) => item.product === productId,
            );

            if (existsInTable) {
                return true;
            }
        }

        return false;
    };

    const getProductDisabledReason = (productId: number) => {
        if (!data.storage) {
            return null;
        }

        const selectedStorageId = Number(data.storage);

        const existsInBackend = existingInventories.some(
            (inv) =>
                inv.storage === selectedStorageId && inv.product === productId,
        );

        if (existsInBackend) {
            return '(Ya en bodega)';
        }

        if (!inventory?.id) {
            const existsInTable = data.items.some(
                (item) => item.product === productId,
            );

            if (existsInTable) {
                return '(Agregado)';
            }
        }

        return null;
    };

    const handleStorageChange = (storageIdStr: string) => {
        const newStorageId = Number(storageIdStr);
        const filteredItems = data.items.filter((item) => {
            const exists = existingInventories.some(
                (inv) =>
                    inv.storage === newStorageId &&
                    inv.product === item.product,
            );

            return !exists;
        });

        setData((prev) => ({
            ...prev,
            storage: storageIdStr,
            items: filteredItems,
        }));
    };

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
            if (data.items.length === 0) {
                toast.error('Debe agregar al menos un producto');

                return;
            }

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
        <form onSubmit={submit} className="space-y-6 px-5 py-6">
            <div className="space-y-2">
                <Label htmlFor="storage">Almacén / Bodega *</Label>
                <Select
                    value={data.storage}
                    onValueChange={handleStorageChange}
                    disabled={!!inventory?.id}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccione un almacén" />
                    </SelectTrigger>
                    <SelectContent>
                        {storages.map((storage) => (
                            <SelectItem
                                key={storage.id}
                                value={storage.id.toString()}
                            >
                                {storage.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={errors.storage} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="product">Producto *</Label>
                <Select
                    value={inventory?.id ? data.product : ''}
                    onValueChange={(value) => {
                        if (inventory?.id) {
                            setData('product', value);
                        } else {
                            const productId = Number(value);
                            const prod = products.find(
                                (p) => p.id === productId,
                            );

                            if (
                                prod &&
                                !data.items.some(
                                    (item) => item.product === productId,
                                )
                            ) {
                                setData('items', [
                                    ...data.items,
                                    { product: productId, quantity: 1 },
                                ]);
                            }
                        }
                    }}
                    disabled={!!inventory?.id || !data.storage}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue
                            placeholder={
                                !data.storage
                                    ? 'Seleccione primero un almacén'
                                    : 'Seleccione un producto'
                            }
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {products.map((product) => {
                            const reason = getProductDisabledReason(product.id);

                            return (
                                <SelectItem
                                    key={product.id}
                                    value={product.id.toString()}
                                    disabled={!!reason}
                                >
                                    {product.name} ({product.code}){' '}
                                    {reason && ` ${reason}`}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
                <InputError message={errors.product} />
            </div>

            {inventory?.id && (
                <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad en Stock *</Label>
                    <Input
                        id="quantity"
                        type="number"
                        min="0"
                        value={data.quantity}
                        onChange={(e) =>
                            setData('quantity', Number(e.target.value))
                        }
                        placeholder="Ej. 50"
                    />
                    <InputError message={errors.quantity} />
                </div>
            )}

            {!inventory?.id && (
                <div className="space-y-2">
                    <Label>Productos a agregar</Label>
                    <div className="overflow-hidden rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="w-[150px]">
                                        Cantidad *
                                    </TableHead>
                                    <TableHead className="w-[80px] text-right"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.length > 0 ? (
                                    data.items.map((item, index) => {
                                        const prod = products.find(
                                            (p) => p.id === item.product,
                                        );

                                        return (
                                            <TableRow key={item.product}>
                                                <TableCell className="py-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">
                                                            {prod?.name}
                                                        </span>
                                                        <span className="font-mono text-[10px] text-muted-foreground uppercase">
                                                            {prod?.code}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const newQty =
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                );
                                                            const updatedItems =
                                                                [...data.items];
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
                                                                        i !==
                                                                        index,
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
                                            No hay productos agregados.
                                            Seleccione uno arriba.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <InputError message={errors.items as string} />
                </div>
            )}

            <div className="flex justify-end pt-4">
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full md:w-auto"
                >
                    {inventory?.id ? 'Actualizar Existencia' : 'Agregar'}
                </Button>
            </div>
        </form>
    );
}
