import { router } from '@inertiajs/react';
import { Check, Plus, X, Tag, Microscope, Loader2 } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import HeadingSheet from '@/components/heading-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface Props {
    specimen: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    products: any[];
}

export default function SpecimenProductsSheet({
    specimen,
    open,
    onOpenChange,
    products = [],
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Initialize local insumos state using lazy state initializer
    const [insumos, setInsumos] = useState<any[]>(() => {
        if (!specimen) {
            return [];
        }

        return (specimen.products || []).map((prod: any) => {
            const libraryProduct = products.find((p: any) => p.id === prod.id);
            const currentDbStock = libraryProduct
                ? parseInt(libraryProduct.total_stock) || 0
                : 0;
            const pivotQty = parseInt(prod.pivot?.quantity) || 0;
            const totalStockAvailable = currentDbStock + pivotQty;

            return {
                id: prod.id,
                name: prod.name,
                code: prod.code,
                quantity: pivotQty,
                total_stock: totalStockAvailable,
                price: parseFloat(prod.pivot?.price) || 0,
                prices: prod.prices || [],
                sale_price: parseFloat(prod.sale_price) || 0,
            };
        });
    });

    // Reset search query when open changes
    const handleOpenChange = (val: boolean) => {
        if (!val) {
            setSearchQuery('');
        }

        onOpenChange(val);
    };

    const filteredProducts = useMemo(() => {
        return products.filter(
            (product) =>
                product.name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                product.code.toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [products, searchQuery]);

    if (!specimen) {
        return null;
    }

    const handleAddInsumo = (product: any) => {
        if (insumos.some((i: any) => i.id === product.id)) {
            toast.info(`El producto "${product.name}" ya ha sido agregado.`);

            return;
        }

        const sortedPrices = [...(product.prices || [])].sort(
            (a, b) => parseFloat(b.amount) - parseFloat(a.amount),
        );
        const defaultPrice =
            sortedPrices.length > 0
                ? parseFloat(sortedPrices[0].amount)
                : parseFloat(product.sale_price) || 0;

        const newInsumo = {
            id: product.id,
            name: product.name,
            code: product.code,
            quantity: 1,
            total_stock: parseInt(product.total_stock) || 0,
            price: defaultPrice,
            prices: sortedPrices,
            sale_price: parseFloat(product.sale_price) || 0,
        };

        setInsumos([...insumos, newInsumo]);
        toast.success(`"${product.name}" agregado a insumos.`);
    };

    const handleUpdateInsumoQty = (id: number, qty: number) => {
        const updated = insumos.map((i: any) => {
            if (i.id === id) {
                const cappedQty = Math.max(1, Math.min(i.total_stock, qty));

                return { ...i, quantity: cappedQty };
            }

            return i;
        });
        setInsumos(updated);
    };

    const handleUpdateInsumoPrice = (id: number, price: number) => {
        const updated = insumos.map((i: any) => {
            if (i.id === id) {
                return { ...i, price: price };
            }

            return i;
        });
        setInsumos(updated);
    };

    const handleRemoveInsumo = (id: number) => {
        const updated = insumos.filter((i: any) => i.id !== id);
        setInsumos(updated);
    };

    const handleSave = () => {
        setIsSaving(true);
        router.post(
            `/specimens/${specimen.sequence_code}/report-editor/update-products`,
            {
                insumos: insumos.map((i) => ({
                    id: i.id,
                    quantity: i.quantity,
                    price: i.price,
                })),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Insumos actualizados correctamente');
                    onOpenChange(false);
                    setIsSaving(false);
                },
                onError: (errors) => {
                    const message =
                        Object.values(errors)[0] ||
                        'Error al actualizar insumos';
                    toast.error(message);
                    setIsSaving(false);
                },
            },
        );
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw]">
                {/* Header */}
                <div className="border-b pr-12 pb-4">
                    <HeadingSheet
                        title="Selección de Insumos / Reactivos"
                        description="Busque y administre los insumos químicos o reactivos utilizados para el análisis de esta muestra."
                    />
                </div>

                <div className="mt-6 flex h-[calc(100vh-180px)] flex-col gap-6 px-5 pb-8">
                    <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-6 lg:grid-cols-12">
                        {/* Columna Izquierda: Buscador e Insumos Disponibles */}
                        <div className="flex h-full flex-col gap-4 lg:col-span-7">
                            <div className="relative">
                                <Input
                                    type="text"
                                    placeholder="Buscar insumo por nombre o código..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="w-full pr-8"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
                                <div className="flex justify-between border-b bg-muted/40 p-3 text-xs font-semibold text-muted-foreground">
                                    <span>Insumo / Descripción</span>
                                    <span>Stock Disponible</span>
                                </div>
                                <div className="flex-1 divide-y divide-border overflow-y-auto">
                                    {filteredProducts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
                                            <Microscope className="h-8 w-8 text-muted-foreground/40" />
                                            <span>
                                                No se encontraron insumos
                                                disponibles.
                                            </span>
                                        </div>
                                    ) : (
                                        filteredProducts.map((product) => {
                                            const matchingInsumo = insumos.find(
                                                (i) => i.id === product.id,
                                            );
                                            // The total stock available for adding/increment is the library total stock
                                            // plus whatever this specimen already has, if it was already added.
                                            const totalStock =
                                                (parseInt(
                                                    product.total_stock,
                                                ) || 0) +
                                                (matchingInsumo ? 0 : 0);
                                            // Wait! If matchingInsumo is already added to the local insumos, we can only add up to the total stock.
                                            // Since product.total_stock from backend is the remaining stock in db,
                                            // the total stock limit is correct.
                                            const isOutOfStock =
                                                totalStock <= 0;
                                            const isAlreadyAdded = insumos.some(
                                                (i: any) => i.id === product.id,
                                            );

                                            return (
                                                <div
                                                    key={product.id}
                                                    className={cn(
                                                        'flex items-center justify-between p-3 transition-colors',
                                                        isOutOfStock
                                                            ? 'bg-muted/10 opacity-70'
                                                            : 'hover:bg-accent/10',
                                                    )}
                                                >
                                                    <div className="flex max-w-[70%] flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="truncate text-sm font-semibold text-foreground">
                                                                {product.name}
                                                            </span>
                                                            <span className="shrink-0 rounded border bg-muted px-1 font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                                {product.code}
                                                            </span>
                                                        </div>
                                                        <span className="truncate text-xs text-muted-foreground">
                                                            {product.description ||
                                                                'Sin descripción'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {isOutOfStock ? (
                                                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-destructive/20 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">
                                                                Agotado
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                {totalStock} u.
                                                            </span>
                                                        )}

                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant={
                                                                isAlreadyAdded
                                                                    ? 'secondary'
                                                                    : 'outline'
                                                            }
                                                            onClick={() =>
                                                                handleAddInsumo(
                                                                    product,
                                                                )
                                                            }
                                                            disabled={
                                                                isOutOfStock
                                                            }
                                                            className="h-8 shrink-0 font-semibold"
                                                        >
                                                            {isAlreadyAdded ? (
                                                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                                    <Check className="h-3.5 w-3.5" />{' '}
                                                                    Agregado
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1">
                                                                    <Plus className="h-3.5 w-3.5" />{' '}
                                                                    Agregar
                                                                </span>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Insumos Seleccionados */}
                        <div className="flex h-full flex-col gap-4 lg:col-span-5">
                            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
                                <div className="flex items-center justify-between border-b bg-muted/40 p-3 text-xs font-bold text-muted-foreground">
                                    <span>Insumos Seleccionados</span>
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                                        {insumos.length}
                                    </span>
                                </div>

                                <div className="min-h-[250px] flex-1 divide-y divide-border overflow-y-auto">
                                    {insumos.length === 0 ? (
                                        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
                                            <div className="rounded-full bg-secondary p-3 text-muted-foreground/50">
                                                <Tag className="h-6 w-6" />
                                            </div>
                                            <div className="flex max-w-[200px] flex-col gap-1">
                                                <span className="font-bold text-foreground">
                                                    Lista vacía
                                                </span>
                                                <span className="text-xs leading-normal text-muted-foreground">
                                                    Presione "Agregar" en la
                                                    lista de insumos
                                                    disponibles.
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        insumos.map((insumo: any) => (
                                            <div
                                                key={insumo.id}
                                                className="flex flex-col gap-3 p-3.5 transition-colors hover:bg-accent/5"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex min-w-0 flex-col gap-0.5">
                                                        <span className="truncate text-sm font-semibold text-foreground">
                                                            {insumo.name}
                                                        </span>
                                                        <span className="font-mono text-[10px] text-muted-foreground uppercase">
                                                            {insumo.code}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleRemoveInsumo(
                                                                insumo.id,
                                                            )
                                                        }
                                                        className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex w-[55%] flex-col gap-1">
                                                        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                            Precio
                                                        </span>
                                                        <Select
                                                            value={parseFloat(
                                                                insumo.price ||
                                                                    0,
                                                            ).toString()}
                                                            onValueChange={(
                                                                val,
                                                            ) => {
                                                                const parsed =
                                                                    parseFloat(
                                                                        val,
                                                                    );

                                                                if (
                                                                    !isNaN(
                                                                        parsed,
                                                                    )
                                                                ) {
                                                                    handleUpdateInsumoPrice(
                                                                        insumo.id,
                                                                        parsed,
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8 w-full font-mono text-xs font-medium">
                                                                <SelectValue placeholder="Seleccionar precio" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {insumo.prices &&
                                                                insumo.prices
                                                                    .length >
                                                                    0 ? (
                                                                    insumo.prices.map(
                                                                        (
                                                                            p: any,
                                                                            idx: number,
                                                                        ) => {
                                                                            const priceStr =
                                                                                parseFloat(
                                                                                    p.amount ||
                                                                                        0,
                                                                                ).toString();

                                                                            return (
                                                                                <SelectItem
                                                                                    key={
                                                                                        idx
                                                                                    }
                                                                                    value={
                                                                                        priceStr
                                                                                    }
                                                                                    className="font-mono text-xs"
                                                                                >
                                                                                    L.{' '}
                                                                                    {parseFloat(
                                                                                        p.amount ||
                                                                                            0,
                                                                                    ).toFixed(
                                                                                        2,
                                                                                    )}
                                                                                </SelectItem>
                                                                            );
                                                                        },
                                                                    )
                                                                ) : (
                                                                    <SelectItem
                                                                        value={parseFloat(
                                                                            insumo.price ||
                                                                                0,
                                                                        ).toString()}
                                                                        className="font-mono text-xs"
                                                                    >
                                                                        L.{' '}
                                                                        {parseFloat(
                                                                            insumo.price ||
                                                                                0,
                                                                        ).toFixed(
                                                                            2,
                                                                        )}
                                                                    </SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="flex w-[45%] flex-col items-end gap-1">
                                                        <span className="w-full text-right text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                            Cantidad
                                                        </span>
                                                        <div className="flex h-8 w-full shrink-0 items-center justify-between rounded-lg border bg-background p-1 shadow-sm">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    handleUpdateInsumoQty(
                                                                        insumo.id,
                                                                        insumo.quantity -
                                                                            1,
                                                                    )
                                                                }
                                                                disabled={
                                                                    insumo.quantity <=
                                                                    1
                                                                }
                                                                className="h-6 w-6 rounded-md"
                                                            >
                                                                <span className="text-sm leading-none font-bold">
                                                                    -
                                                                </span>
                                                            </Button>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={
                                                                    insumo.total_stock
                                                                }
                                                                value={
                                                                    insumo.quantity
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const val =
                                                                        parseInt(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        ) || 1;
                                                                    handleUpdateInsumoQty(
                                                                        insumo.id,
                                                                        val,
                                                                    );
                                                                }}
                                                                className="w-8 shrink-0 border-none p-0 text-center font-mono text-xs font-bold select-all focus:ring-0 focus:outline-none"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    handleUpdateInsumoQty(
                                                                        insumo.id,
                                                                        insumo.quantity +
                                                                            1,
                                                                    )
                                                                }
                                                                disabled={
                                                                    insumo.quantity >=
                                                                    insumo.total_stock
                                                                }
                                                                className="h-6 w-6 rounded-md"
                                                            >
                                                                <span className="text-sm leading-none font-bold">
                                                                    +
                                                                </span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-1 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                                                    <span>
                                                        Límite:{' '}
                                                        <strong className="text-foreground">
                                                            {insumo.total_stock}{' '}
                                                            u.
                                                        </strong>
                                                    </span>
                                                    <span className="font-mono">
                                                        Total:{' '}
                                                        <strong className="text-xs text-foreground">
                                                            L.{' '}
                                                            {(
                                                                insumo.price *
                                                                insumo.quantity
                                                            ).toFixed(2)}
                                                        </strong>
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => onOpenChange(false)}
                            className="h-10 px-5 font-medium"
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            className="h-10 px-6 font-semibold"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                                    Guardando...
                                </>
                            ) : (
                                'Guardar Cambios'
                            )}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
