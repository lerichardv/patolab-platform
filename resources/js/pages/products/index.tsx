import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import { Edit2, Package, Plus, Search, Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
    index as productsIndex,
    destroy as destroyProduct,
} from '@/actions/App/Http/Controllers/ProductController';
import { Pagination } from '@/components/pagination';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import ProductSheet from '@/pages/products/product-sheet';

interface Price {
    id?: number;
    amount: number | string;
}

interface Product {
    id: number;
    code: string;
    name: string;
    description: string;
    unit: 'percentage' | 'miligrams' | 'unit';
    unit_value: number;
    purchase_price: number;
    sale_price: number;
    isv: boolean;
    active: boolean;
    prices?: Price[];
}

interface Props {
    products: {
        data: Product[];
        links: {
            url: string | null;
            label: string;
            active: boolean;
        }[];
        current_page: number;
        last_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters: {
        search?: string;
        unit?: string;
    };
}

export default function ProductsIndex({ products, filters }: Props) {
    const { auth } = usePage<any>().props;
    const canCreate = auth.permissions?.includes('products.create');
    const canEdit = auth.permissions?.includes('products.edit');
    const canDelete = auth.permissions?.includes('products.delete');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        null,
    );
    const [productToDelete, setProductToDelete] = useState<Product | null>(
        null,
    );
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === '' || value === 'all') {
            delete newFilters[key as keyof typeof filters];
        }

        router.get(productsIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            handleFilterChange('search', value);
        }, 300),
        [filters],
    );

    useEffect(() => {
        if (search !== filters.search) {
            debouncedSearch(search);
        }
    }, [search]);

    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedProduct(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (productToDelete) {
            router.delete(destroyProduct(productToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Producto desactivado correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    const getUnitLabel = (unit: string) => {
        switch (unit) {
            case 'percentage':
                return 'Porcentaje';
            case 'miligrams':
                return 'Miligramos';
            case 'unit':
                return 'Unidad';
            default:
                return unit;
        }
    };

    return (
        <TooltipProvider>
            <Head title="Gestión de Productos" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Productos
                        </h1>
                        <p className="text-muted-foreground">
                            Administre los insumos y productos del laboratorio.
                        </p>
                    </div>
                    {canCreate && (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleCreate}
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex max-w-sm items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o código..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-hidden rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Unidad</TableHead>
                                <TableHead>Precio Compra</TableHead>
                                <TableHead>Precios de Venta</TableHead>
                                <TableHead className="text-right">
                                    {(canEdit || canDelete) && 'Acciones'}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.data.length > 0 ? (
                                products.data.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs uppercase"
                                            >
                                                {product.code}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="rounded-lg bg-primary/10 p-2">
                                                    <Package className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span>{product.name}</span>
                                                    {product.isv && (
                                                        <Badge className="mt-1 h-4 w-fit border-none bg-green-500 px-1.5 text-[10px] text-white hover:bg-green-600">
                                                            ISV
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[250px] text-sm text-muted-foreground">
                                            {product.description ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="block cursor-help truncate">
                                                            {
                                                                product.description
                                                            }
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[300px] break-words">
                                                        {product.description}
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs">
                                                {getUnitLabel(product.unit)} (
                                                {product.unit_value})
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            L.{' '}
                                            {Number(
                                                product.purchase_price,
                                            ).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex max-w-[200px] flex-wrap gap-1">
                                                {product.prices &&
                                                product.prices.length > 0 ? (
                                                    product.prices.map(
                                                        (price) => (
                                                            <Badge
                                                                key={price.id}
                                                                variant="secondary"
                                                                className="font-mono"
                                                            >
                                                                L.{' '}
                                                                {parseFloat(
                                                                    String(
                                                                        price.amount,
                                                                    ),
                                                                ).toFixed(2)}
                                                            </Badge>
                                                        ),
                                                    )
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        Sin precio
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(canEdit || canDelete) && (
                                                <div className="flex justify-end gap-2">
                                                    {canEdit && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleEdit(
                                                                    product,
                                                                )
                                                            }
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {canDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive"
                                                            onClick={() =>
                                                                handleDeleteClick(
                                                                    product,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="h-24 text-center"
                                    >
                                        No se encontraron productos.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={products.links}
                    meta={{
                        from: products.from,
                        to: products.to,
                        total: products.total,
                    }}
                />
            </div>

            <ProductSheet
                product={selectedProduct}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Está completamente seguro?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactivará el producto{' '}
                            <strong>{productToDelete?.name}</strong>. Ya no
                            aparecerá en la lista activa ni podrá ser utilizado
                            en nuevos registros.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Desactivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </TooltipProvider>
    );
}
