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
import { Edit2, Plus, Search, Trash2, Warehouse } from 'lucide-react';
import StorageSheet from './storage-sheet';
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
import debounce from 'lodash/debounce';
import { toast } from 'sonner';
import { 
    index as storagesIndex, 
    destroy as destroyStorage 
} from '@/actions/App/Http/Controllers/StorageController';

interface Storage {
    id: number;
    name: string;
    location: string;
    description: string;
    active: boolean;
}

interface Props {
    storages: {
        data: Storage[];
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

export default function StoragesIndex({ storages, filters }: Props) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedStorage, setSelectedStorage] = useState<Storage | null>(null);
    const [storageToDelete, setStorageToDelete] = useState<Storage | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        if (value === '') delete newFilters[key as keyof typeof filters];
        
        router.get(storagesIndex().url, newFilters, {
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

    const handleEdit = (storage: Storage) => {
        setSelectedStorage(storage);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedStorage(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (storage: Storage) => {
        setStorageToDelete(storage);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (storageToDelete) {
            router.delete(destroyStorage(storageToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Almacén desactivado correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Almacenes" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Almacenes</h1>
                        <p className="text-muted-foreground">Administre las bodegas y lugares de almacenamiento.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCreate} className="h-10 px-5 text-sm w-full md:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Almacén
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2 max-w-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar almacén..."
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
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {storages.data.length > 0 ? (
                                storages.data.map((storage) => (
                                    <TableRow key={storage.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-primary/10 p-2 rounded-lg">
                                                    <Warehouse className="h-4 w-4 text-primary" />
                                                </div>
                                                {storage.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{storage.location}</TableCell>
                                        <TableCell>
                                            <p className="max-w-[300px] truncate text-xs text-muted-foreground" title={storage.description}>
                                                {storage.description}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(storage)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(storage)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No se encontraron resultados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination 
                    links={storages.links} 
                    meta={{
                        from: storages.from,
                        to: storages.to,
                        total: storages.total
                    }} 
                />
            </div>

            <StorageSheet
                storage={selectedStorage}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está completamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactivará el almacén <strong>{storageToDelete?.name}</strong>. 
                            Ya no aparecerá en la lista activa, pero sus registros históricos se mantendrán.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
                            Desactivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
