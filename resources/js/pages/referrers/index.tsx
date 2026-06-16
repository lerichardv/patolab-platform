import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import { Edit2, Plus, Search, UserRound, Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
    index as referrersIndex,
    destroy as destroyReferrer,
} from '@/actions/App/Http/Controllers/ReferrerController';
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
import ReferrerSheet from './referrer-sheet';

interface ReferrerType {
    id: number;
    name: string;
}

interface Referrer {
    id: number;
    referrer_type: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    type?: ReferrerType;
    created_at: string;
}

interface Props {
    referrers: {
        data: Referrer[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
        from: number;
        to: number;
    };
    referrerTypes: ReferrerType[];
    filters: {
        search?: string;
        referrer_type?: string;
    };
}

export default function ReferrersIndex({
    referrers,
    referrerTypes,
    filters,
}: Props) {
    const { auth } = usePage<any>().props;
    const canCreate = auth.permissions?.includes('referrers.create');
    const canEdit = auth.permissions?.includes('referrers.edit');
    const canDelete = auth.permissions?.includes('referrers.delete');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedReferrer, setSelectedReferrer] = useState<Referrer | null>(
        null,
    );
    const [referrerToDelete, setReferrerToDelete] = useState<Referrer | null>(
        null,
    );
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === 'all' || value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        router.get(referrersIndex().url, newFilters, {
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

    const handleEdit = (referrer: Referrer) => {
        setSelectedReferrer(referrer);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedReferrer(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (referrer: Referrer) => {
        setReferrerToDelete(referrer);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (referrerToDelete) {
            router.delete(destroyReferrer(referrerToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Remitente eliminado correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Remitentes" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <UserRound className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Remitentes
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Administre los médicos y clínicas que remiten
                            muestras.
                        </p>
                    </div>
                    {canCreate && (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleCreate}
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nuevo
                                Remitente
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, correo..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select
                        value={filters.referrer_type || 'all'}
                        onValueChange={(v) =>
                            handleFilterChange('referrer_type', v)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Tipo de Remitente" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los tipos</SelectItem>
                            {referrerTypes.map((type) => (
                                <SelectItem
                                    key={type.id}
                                    value={type.id.toString()}
                                >
                                    {type.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Fecha Creación</TableHead>
                                <TableHead className="text-right">
                                    {(canEdit || canDelete) && 'Acciones'}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {referrers.data.length > 0 ? (
                                referrers.data.map((referrer) => (
                                    <TableRow key={referrer.id}>
                                        <TableCell className="font-medium">
                                            {referrer.name}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                                {referrer.type?.name || 'N/A'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span>
                                                    {referrer.phone ||
                                                        'Sin teléfono'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {referrer.email ||
                                                        'Sin correo'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(
                                                referrer.created_at,
                                            ).toLocaleDateString('es-ES')}
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
                                                                    referrer,
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
                                                                    referrer,
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
                    links={referrers.links}
                    meta={{
                        from: referrers.from,
                        to: referrers.to,
                        total: referrers.total,
                    }}
                />
            </div>

            <ReferrerSheet
                referrer={selectedReferrer}
                referrerTypes={referrerTypes}
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
                            ¿Eliminar remitente?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactivará al remitente{' '}
                            <strong>{referrerToDelete?.name}</strong>.
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
