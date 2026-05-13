import { Head, router } from '@inertiajs/react';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { ClipboardList, Edit2, Package, PackageSearch, Plus, Search, Trash2, Warehouse } from 'lucide-react';
import { Label } from '@/components/ui/label';
import InventorySheet from '@/pages/inventories/inventory-sheet';
import AbastecerSheet from '@/pages/inventories/abastecer-sheet';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import debounce from 'lodash/debounce';
import { toast } from 'sonner';
import { 
    index as inventoriesIndex, 
    destroy as destroyInventory 
} from '@/actions/App/Http/Controllers/InventoryController';
import { Badge } from '@/components/ui/badge';

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
    id: number;
    storage: number;
    product: number;
    quantity: number;
    active: boolean;
    storage_relation: Storage;
    product_relation: Product;
}

interface Props {
    inventories: {
        data: Inventory[];
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
    storages: Storage[];
    products: Product[];
    filters: {
        search?: string;
        storage?: string;
    };
}

export default function InventoriesIndex({ inventories, storages, products, filters }: Props) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isAbastecerOpen, setIsAbastecerOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
    const [inventoryToDelete, setInventoryToDelete] = useState<Inventory | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        if (value === '' || value === 'all') delete newFilters[key as keyof typeof filters];
        
        router.get(inventoriesIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            handleFilterChange('search', value);
        }, 300),
        [filters]
    );

    useEffect(() => {
        if (search !== filters.search) {
            debouncedSearch(search);
        }
    }, [search]);

    const handleEdit = (inventory: Inventory) => {
        setSelectedInventory(inventory);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedInventory(null);
        setIsSheetOpen(true);
    };

    const handleAbastecer = () => {
        setIsAbastecerOpen(true);
    };

    const handleDeleteClick = (inventory: Inventory) => {
        setInventoryToDelete(inventory);
        setDeleteConfirmation('');
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (inventoryToDelete) {
            router.delete(destroyInventory(inventoryToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Registro de inventario desactivado');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestionar Inventario" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
                        <p className="text-muted-foreground">Monitoreo y ajuste de existencias por bodega.</p>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row">
                        <Button variant="secondary" onClick={handleCreate} className="h-10 px-5 text-sm w-full md:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Agregar producto al inventario
                        </Button>
                        <Button onClick={handleAbastecer} className="h-10 px-5 text-sm w-full md:w-auto">
                            <PackageSearch className="mr-2 h-4 w-4" /> Abastecer existente
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar producto..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select 
                        value={filters.storage || 'all'} 
                        onValueChange={(value) => handleFilterChange('storage', value)}
                    >
                        <SelectTrigger className="w-full md:w-56">
                            <SelectValue placeholder="Todas las bodegas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las bodegas</SelectItem>
                            {storages.map(storage => (
                                <SelectItem key={storage.id} value={storage.id.toString()}>
                                    {storage.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>Almacén</TableHead>
                                <TableHead className="text-center">Existencia</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inventories.data.length > 0 ? (
                                inventories.data.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-primary/10 p-2 rounded-lg">
                                                    <Package className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span>{item.product_relation.name}</span>
                                                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                                        {item.product_relation.code}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Warehouse className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm">{item.storage_relation.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={item.quantity > 0 ? "secondary" : "destructive"}>
                                                {item.quantity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(item)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No hay registros de inventario.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination 
                    links={inventories.links} 
                    meta={{
                        from: inventories.from,
                        to: inventories.to,
                        total: inventories.total
                    }} 
                />
            </div>

            <InventorySheet
                inventory={selectedInventory}
                storages={storages}
                products={products}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            <AbastecerSheet
                inventories={inventories.data}
                open={isAbastecerOpen}
                onOpenChange={setIsAbastecerOpen}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está completamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactivará el registro de inventario para <strong>{inventoryToDelete?.product_relation.name}</strong> en <strong>{inventoryToDelete?.storage_relation.name}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2 py-2">
                        <Label htmlFor="confirmation" className="text-sm font-medium">
                            Para confirmar, escriba <span className="font-bold select-none text-destructive">inventario</span> a continuación:
                        </Label>
                        <Input 
                            id="confirmation"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder="Escriba 'inventario'"
                            className="h-9"
                            autoComplete="off"
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmDelete} 
                            disabled={deleteConfirmation !== 'inventario'}
                            className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
                        >
                            Desactivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
