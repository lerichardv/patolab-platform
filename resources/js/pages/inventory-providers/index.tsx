import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
    index as providersIndex,
    destroy as destroyProvider,
} from '@/actions/App/Http/Controllers/InventoryProviderController';
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
import InventoryProviderSheet from './inventory-provider-sheet';

interface Provider {
    id: number;
    name: string;
    phone: string;
    phone2?: string | null;
    email: string;
    address: string;
}

interface Props {
    providers: {
        data: Provider[];
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
    };
}

export default function InventoryProvidersIndex({ providers, filters }: Props) {
    const { auth } = usePage<any>().props;
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
        null,
    );
    const [providerToDelete, setProviderToDelete] = useState<Provider | null>(
        null,
    );
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        router.get(providersIndex().url, newFilters, {
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

    const handleEdit = (provider: Provider) => {
        setSelectedProvider(provider);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedProvider(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (provider: Provider) => {
        setProviderToDelete(provider);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (providerToDelete) {
            router.delete(destroyProvider(providerToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Proveedor eliminado correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    const canManage = auth.permissions?.includes('inventory.manage');

    return (
        <>
            <Head title="Gestión de Proveedores" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Proveedores de Inventario
                        </h1>
                        <p className="text-muted-foreground">
                            Administre los proveedores de insumos del
                            laboratorio.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {canManage && (
                            <Button
                                onClick={handleCreate}
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nuevo
                                Proveedor
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="relative col-span-2 md:col-span-1">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, teléfono, correo..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Dirección</TableHead>
                                {canManage && (
                                    <TableHead className="text-right">
                                        Acciones
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {providers.data.length > 0 ? (
                                providers.data.map((provider) => (
                                    <TableRow key={provider.id}>
                                        <TableCell className="font-medium">
                                            {provider.name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs">
                                                <span>{provider.phone}</span>
                                                {provider.phone2 && (
                                                    <span className="text-muted-foreground">
                                                        {provider.phone2} (Alt)
                                                    </span>
                                                )}
                                                <span className="text-muted-foreground">
                                                    {provider.email}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-xs">
                                            {provider.address}
                                        </TableCell>
                                        {canManage && (
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleEdit(provider)
                                                        }
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() =>
                                                            handleDeleteClick(
                                                                provider,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={canManage ? 4 : 3}
                                        className="h-24 text-center"
                                    >
                                        No se encontraron resultados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={providers.links}
                    meta={{
                        from: providers.from,
                        to: providers.to,
                        total: providers.total,
                    }}
                />
            </div>

            <InventoryProviderSheet
                provider={selectedProvider}
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
                            Esta acción eliminará de forma permanente al
                            proveedor <strong>{providerToDelete?.name}</strong>.
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
