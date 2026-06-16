import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import { Edit2, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
    index as locationsIndex,
    destroy as destroyLocation,
} from '@/actions/App/Http/Controllers/LocationController';
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
import LocationSheet from './location-sheet';

interface Location {
    id: number;
    name: string;
    rtn: string;
    address: string;
    phone: string;
    email: string;
}

interface Props {
    locations: {
        data: Location[];
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

export default function LocationsIndex({ locations, filters }: Props) {
    const { auth } = usePage<any>().props;
    const canCreate = auth.permissions?.includes('locations.create');
    const canEdit = auth.permissions?.includes('locations.edit');
    const canDelete = auth.permissions?.includes('locations.delete');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(
        null,
    );
    const [locationToDelete, setLocationToDelete] = useState<Location | null>(
        null,
    );
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        router.get(locationsIndex().url, newFilters, {
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

    const handleEdit = (location: Location) => {
        setSelectedLocation(location);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedLocation(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (location: Location) => {
        setLocationToDelete(location);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (locationToDelete) {
            router.delete(destroyLocation(locationToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Sucursal desactivada correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Sucursales" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Sucursales
                        </h1>
                        <p className="text-muted-foreground">
                            Administre las ubicaciones físicas de los
                            laboratorios.
                        </p>
                    </div>
                    {canCreate && (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleCreate}
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nueva Sucursal
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex max-w-sm items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar sucursal..."
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
                                <TableHead>Sucursal</TableHead>
                                <TableHead>RTN</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Dirección</TableHead>
                                <TableHead className="text-right">
                                    {(canEdit || canDelete) && 'Acciones'}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {locations.data.length > 0 ? (
                                locations.data.map((location) => (
                                    <TableRow key={location.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="rounded-lg bg-primary/10 p-2">
                                                    <MapPin className="h-4 w-4 text-primary" />
                                                </div>
                                                {location.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {location.rtn || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs">
                                                <span>{location.phone}</span>
                                                <span className="text-muted-foreground">
                                                    {location.email}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p
                                                className="max-w-[200px] truncate text-xs text-muted-foreground"
                                                title={location.address}
                                            >
                                                {location.address}
                                            </p>
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
                                                                    location,
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
                                                                    location,
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
                                        colSpan={5}
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
                    links={locations.links}
                    meta={{
                        from: locations.from,
                        to: locations.to,
                        total: locations.total,
                    }}
                />
            </div>

            <LocationSheet
                location={selectedLocation}
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
                            Esta acción desactivará la sucursal{' '}
                            <strong>{locationToDelete?.name}</strong>. Ya no
                            aparecerá en la lista activa, pero sus registros
                            históricos se mantendrán.
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
        </>
    );
}
