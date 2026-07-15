import { useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
    store as storePurchaseOrder,
    update as updatePurchaseOrder,
} from '@/actions/App/Http/Controllers/InventoryPurchaseOrderController';
import InputError from '@/components/input-error';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberPicker } from '@/components/ui/number-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import InventoryProviderSheet from '@/pages/inventory-providers/inventory-provider-sheet';
import ProductSheet from '@/pages/products/product-sheet';

interface Provider {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    code: string;
}

interface PurchaseOrderProduct {
    id?: number;
    product_id: string | number;
    specification: string;
    quantity: number;
    unit_price: number;
    product?: Product;
}

interface PurchaseOrder {
    id?: number;
    provider_id: string | number;
    date_requested: string;
    date_delivered?: string | null;
    status: 'pending' | 'received';
    products: PurchaseOrderProduct[];
}

interface Props {
    purchaseOrder?: PurchaseOrder;
    providers?: Provider[];
    products: Product[];
    onSuccess: () => void;
}

export default function PurchaseOrderForm({
    purchaseOrder,
    providers = [],
    products,
    onSuccess,
}: Props) {
    const [fetchedProviders, setFetchedProviders] = useState<Provider[]>([]);
    const [isProviderSheetOpen, setIsProviderSheetOpen] = useState(false);
    const [fetchedProducts, setFetchedProducts] = useState<Product[]>(
        products || [],
    );
    const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
    const [activeProductRowIndex, setActiveProductRowIndex] = useState<
        number | null
    >(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const formattedProducts = purchaseOrder?.products?.map((p) => ({
        product_id: String(p.product_id),
        specification: p.specification || '',
        quantity: p.quantity || 1,
        unit_price: p.unit_price || 0,
    })) || [
        {
            product_id: '',
            specification: '',
            quantity: 1,
            unit_price: 0,
        },
    ];

    const { data, setData, post, put, processing, errors, reset } = useForm({
        provider_id: purchaseOrder?.provider_id
            ? String(purchaseOrder.provider_id)
            : '',
        date_requested: purchaseOrder?.date_requested
            ? new Date(purchaseOrder.date_requested).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        date_delivered: purchaseOrder?.date_delivered
            ? new Date(purchaseOrder.date_delivered).toISOString().split('T')[0]
            : '',
        status: purchaseOrder?.status || 'pending',
        products: formattedProducts,
    });

    const displayProviders =
        fetchedProviders.length > 0 ? fetchedProviders : providers;

    const fetchProviders = (selectNewOne = false) => {
        fetch('/inventory-providers?all=true')
            .then((res) => res.json())
            .then((data: Provider[]) => {
                if (selectNewOne) {
                    const existingIds = new Set(
                        displayProviders.map((p) => p.id),
                    );

                    const newProvider = data.find(
                        (p) => !existingIds.has(p.id),
                    );

                    if (newProvider) {
                        setData('provider_id', String(newProvider.id));
                    }
                }

                setFetchedProviders(data);
            })
            .catch((err) => console.error('Error loading providers:', err));
    };

    const fetchProducts = (selectNewOneForIndex?: number) => {
        fetch('/products?all=true')
            .then((res) => res.json())
            .then((data: Product[]) => {
                if (
                    selectNewOneForIndex !== undefined &&
                    selectNewOneForIndex !== null
                ) {
                    const existingIds = new Set(
                        fetchedProducts.map((p) => String(p.id)),
                    );
                    const newProduct = data.find(
                        (p) => !existingIds.has(String(p.id)),
                    );

                    if (newProduct) {
                        handleProductChange(
                            selectNewOneForIndex,
                            'product_id',
                            String(newProduct.id),
                        );
                    }
                }

                setFetchedProducts(data);
            })
            .catch((err) => console.error('Error loading products:', err));
    };

    useEffect(() => {
        let active = true;

        if (!providers || providers.length === 0) {
            fetch('/inventory-providers?all=true')
                .then((res) => res.json())
                .then((data) => {
                    if (active) {
                        setFetchedProviders(data);
                    }
                })
                .catch((err) => console.error('Error loading providers:', err));
        }

        return () => {
            active = false;
        };
    }, [providers]);

    useEffect(() => {
        if (products && products.length > 0) {
            setFetchedProducts(products);
        }
    }, [products]);

    const addProductRow = () => {
        setData('products', [
            ...data.products,
            { product_id: '', specification: '', quantity: 1, unit_price: 0 },
        ]);
    };

    const removeProductRow = (index: number) => {
        const updated = [...data.products];
        updated.splice(index, 1);
        setData('products', updated);
    };

    const handleProductChange = (index: number, key: string, value: any) => {
        const updated = [...data.products];
        updated[index] = { ...updated[index], [key]: value };
        setData('products', updated);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowConfirm(true);
    };

    const submitForm = () => {
        setShowConfirm(false);
        setIsSaving(true);

        const options = {
            onSuccess: () => {
                toast.success(
                    purchaseOrder?.id
                        ? 'Orden de compra actualizada correctamente'
                        : 'Orden de compra creada correctamente',
                );
                setIsSaving(false);
                onSuccess();
                reset();
            },
            onError: (err: any) => {
                setIsSaving(false);
                console.error('Error al guardar la orden de compra:', err);

                if (err && Object.keys(err).length > 0) {
                    const firstError = Object.values(err)[0] as string;
                    toast.error(`Error: ${firstError}`);
                } else {
                    toast.error('Hubo un error al procesar la solicitud.');
                }
            },
        };

        if (purchaseOrder?.id) {
            put(updatePurchaseOrder(purchaseOrder.id).url, options);
        } else {
            post(storePurchaseOrder().url, options);
        }
    };

    return (
        <>
            <form onSubmit={submit} className="space-y-6 px-5 py-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="provider_id">Proveedor</Label>
                            <button
                                type="button"
                                onClick={() => setIsProviderSheetOpen(true)}
                                className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                                <Plus className="h-3 w-3" /> Nuevo
                            </button>
                        </div>
                        <Select
                            value={data.provider_id}
                            onValueChange={(value) =>
                                setData('provider_id', value)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccione el proveedor" />
                            </SelectTrigger>
                            <SelectContent>
                                {displayProviders.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.provider_id} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Estado</Label>
                        <Select
                            value={data.status}
                            onValueChange={(value: 'pending' | 'received') =>
                                setData('status', value)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccione el estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">
                                    Pendiente
                                </SelectItem>
                                <SelectItem value="received">
                                    Recibida
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <InputError message={errors.status} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="date_requested">Fecha Solicitada</Label>
                        <Input
                            id="date_requested"
                            type="date"
                            value={data.date_requested}
                            onChange={(e) =>
                                setData('date_requested', e.target.value)
                            }
                        />
                        <InputError message={errors.date_requested} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date_delivered">
                            Fecha de Entrega (optional)
                        </Label>
                        <Input
                            id="date_delivered"
                            type="date"
                            value={data.date_delivered}
                            onChange={(e) =>
                                setData('date_delivered', e.target.value)
                            }
                        />
                        <InputError message={errors.date_delivered} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="text-lg font-semibold">Productos</h3>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addProductRow}
                            className="h-8 px-3"
                        >
                            <Plus className="mr-1 h-4 w-4" /> Agregar Producto
                        </Button>
                    </div>
                    <InputError message={errors.products} />

                    <div className="space-y-4">
                        {data.products.map((row, index) => (
                            <div
                                key={index}
                                className="relative flex flex-col gap-3 rounded-lg border p-4 shadow-xs md:flex-row md:items-end"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-center justify-between">
                                        <Label className="mb-0">Producto</Label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveProductRowIndex(index);
                                                setIsProductSheetOpen(true);
                                            }}
                                            className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                                        >
                                            <Plus className="h-3 w-3" /> Nuevo
                                        </button>
                                    </div>
                                    <Select
                                        value={row.product_id}
                                        onValueChange={(val) =>
                                            handleProductChange(
                                                index,
                                                'product_id',
                                                val,
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleccione producto" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fetchedProducts.map((p) => (
                                                <SelectItem
                                                    key={p.id}
                                                    value={String(p.id)}
                                                >
                                                    {p.name} ({p.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={
                                            errors[
                                                `products.${index}.product_id`
                                            ]
                                        }
                                    />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <Label>Especificación / Presentación</Label>
                                    <Input
                                        value={row.specification}
                                        onChange={(e) =>
                                            handleProductChange(
                                                index,
                                                'specification',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ej. Caja 50ml"
                                    />
                                    <InputError
                                        message={
                                            errors[
                                                `products.${index}.specification`
                                            ]
                                        }
                                    />
                                </div>

                                <div className="w-36 shrink-0">
                                    <Label>Cantidad</Label>
                                    <NumberPicker
                                        min={1}
                                        value={row.quantity}
                                        onChange={(val) =>
                                            handleProductChange(
                                                index,
                                                'quantity',
                                                val,
                                            )
                                        }
                                        className="w-full [&_input]:w-18"
                                    />
                                    <InputError
                                        message={
                                            errors[`products.${index}.quantity`]
                                        }
                                    />
                                </div>

                                <div className="flex shrink-0 justify-end md:pb-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeProductRow(index)}
                                        disabled={data.products.length <= 1}
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        disabled={processing}
                        className="px-6"
                    >
                        {purchaseOrder?.id
                            ? 'Actualizar Orden'
                            : 'Guardar Orden'}
                    </Button>
                </div>
            </form>

            <InventoryProviderSheet
                open={isProviderSheetOpen}
                onOpenChange={setIsProviderSheetOpen}
                onSuccess={() => fetchProviders(true)}
            />

            <ProductSheet
                open={isProductSheetOpen}
                onOpenChange={setIsProductSheetOpen}
                onSuccess={() => {
                    if (activeProductRowIndex !== null) {
                        fetchProducts(activeProductRowIndex);
                    }
                }}
            />

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="max-w-[500px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Resumen de Orden de Compra
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Revise detalladamente los insumos y el proveedor
                            antes de guardar la orden.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="grid gap-3 py-3 text-sm">
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Proveedor:
                            </span>
                            <span className="font-semibold text-foreground">
                                {displayProviders.find(
                                    (p) =>
                                        String(p.id) ===
                                        String(data.provider_id),
                                )?.name || 'No seleccionado'}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Fecha Solicitada:
                            </span>
                            <span className="font-semibold text-foreground">
                                {data.date_requested}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Estado:
                            </span>
                            <span className="font-semibold text-foreground">
                                {data.status === 'received'
                                    ? 'Recibida'
                                    : 'Pendiente'}
                            </span>
                        </div>

                        <div className="flex flex-col gap-1.5 border-b pb-2">
                            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                                Productos Solicitados:
                            </span>
                            <div className="flex max-h-[150px] flex-col gap-1.5 overflow-y-auto pr-1">
                                {data.products.map((row, idx) => {
                                    const prod = fetchedProducts.find(
                                        (p) =>
                                            String(p.id) ===
                                            String(row.product_id),
                                    );

                                    return (
                                        <div
                                            key={idx}
                                            className="flex justify-between rounded border border-border/50 bg-muted/30 p-1.5 text-xs"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-semibold">
                                                    {prod?.name ||
                                                        'Desconocido'}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground italic">
                                                    {row.specification ||
                                                        'Sin especificación'}
                                                </span>
                                            </div>
                                            <div className="text-right font-mono text-xs">
                                                <span className="font-bold text-foreground">
                                                    Cantidad: {row.quantity}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-between pt-2 text-base font-bold text-foreground">
                            <span>Total de Ítems:</span>
                            <span>
                                {data.products.reduce(
                                    (acc, row) =>
                                        acc + Number(row.quantity || 0),
                                    0,
                                )}
                            </span>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={submitForm}
                            className="bg-primary text-white hover:bg-primary/90"
                        >
                            Confirmar y Guardar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {isSaving &&
                typeof window !== 'undefined' &&
                createPortal(
                    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
                        <Spinner className="h-12 w-12 text-primary" />
                        <div className="flex flex-col items-center text-center">
                            <h3 className="text-lg font-bold text-foreground">
                                Procesando Orden de Compra
                            </h3>
                            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                                Estamos guardando la orden de compra y generando
                                el archivo PDF. Por favor, espere.
                            </p>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
