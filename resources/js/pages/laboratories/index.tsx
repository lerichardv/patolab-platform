import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import { Building2, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
    index as laboratoriesIndex,
    destroy as destroyLaboratory,
} from '@/actions/App/Http/Controllers/LaboratoryController';
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
import LaboratorySheet from './laboratory-sheet';
import type { Laboratory } from './laboratory-sheet';

interface Props {
    laboratories: {
        data: Laboratory[];
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
        is_active?: string;
        is_default?: string;
    };
}

export default function LaboratoriesIndex({ laboratories, filters }: Props) {
    const { auth } = usePage<any>().props;
    const canCreate = Boolean(
        auth?.permissions?.includes('laboratories.create') ||
        auth?.user?.role?.slug === 'admin',
    );
    const canEdit = Boolean(
        auth?.permissions?.includes('laboratories.edit') ||
        auth?.user?.role?.slug === 'admin',
    );
    const canDelete = Boolean(
        auth?.permissions?.includes('laboratories.delete') ||
        auth?.user?.role?.slug === 'admin',
    );

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedLaboratory, setSelectedLaboratory] =
        useState<Laboratory | null>(null);
    const [laboratoryToDelete, setLaboratoryToDelete] =
        useState<Laboratory | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const newFilters = { ...filters, [key]: value };

            if (value === 'all' || value === '') {
                delete newFilters[key as keyof typeof filters];
            }

            router.get(laboratoriesIndex().url, newFilters, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                handleFilterChange('search', value);
            }, 300),
        [handleFilterChange],
    );

    useEffect(() => {
        if (search !== (filters.search || '')) {
            debouncedSearch(search);
        }
    }, [search, debouncedSearch, filters.search]);

    const handleEdit = (lab: Laboratory) => {
        setSelectedLaboratory(lab);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedLaboratory(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (lab: Laboratory) => {
        setLaboratoryToDelete(lab);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (laboratoryToDelete) {
            router.delete(destroyLaboratory(laboratoryToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Laboratorio eliminado correctamente');
                    setIsDeleteDialogOpen(false);
                },
                onError: (errors: any) => {
                    toast.error(
                        errors?.general ||
                            'No se pudo eliminar el laboratorio.',
                    );
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Laboratorios" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Laboratorios
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Administre los laboratorios utilizados en la emisión
                            e impresión de stickers.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {canCreate && (
                            <Button
                                onClick={handleCreate}
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nuevo
                                Laboratorio
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por ID o nombre..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select
                        value={filters.is_active || 'all'}
                        onValueChange={(v) =>
                            handleFilterChange('is_active', v)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                Todos los estados
                            </SelectItem>
                            <SelectItem value="1">Solo activos</SelectItem>
                            <SelectItem value="0">Solo inactivos</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.is_default || 'all'}
                        onValueChange={(v) =>
                            handleFilterChange('is_default', v)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Predeterminado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                Todos los laboratorios
                            </SelectItem>
                            <SelectItem value="1">
                                Solo predeterminado
                            </SelectItem>
                            <SelectItem value="0">
                                No predeterminados
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Nombre del Laboratorio</TableHead>
                                <TableHead>Predeterminado</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha de Registro</TableHead>
                                <TableHead className="text-right">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {laboratories.data.length > 0 ? (
                                laboratories.data.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-xs font-bold text-primary">
                                            #{item.id}
                                        </TableCell>
                                        <TableCell className="font-medium text-foreground">
                                            {item.name}
                                        </TableCell>
                                        <TableCell>
                                            {item.is_default ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400">
                                                    Predeterminado
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {item.is_active ? (
                                                <Badge
                                                    variant="outline"
                                                    className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                                                >
                                                    Activo
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="border-muted bg-muted text-muted-foreground"
                                                >
                                                    Inactivo
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(
                                                item.created_at,
                                            ).toLocaleDateString('es-HN', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1.5">
                                                {canEdit && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleEdit(item)
                                                        }
                                                        title="Editar Laboratorio"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() =>
                                                            handleDeleteClick(
                                                                item,
                                                            )
                                                        }
                                                        disabled={
                                                            item.is_default
                                                        }
                                                        title={
                                                            item.is_default
                                                                ? 'No se puede eliminar el laboratorio predeterminado'
                                                                : 'Eliminar Laboratorio'
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No se encontraron laboratorios
                                        registrados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <Pagination
                    links={laboratories.links}
                    meta={{
                        from: laboratories.from,
                        to: laboratories.to,
                        total: laboratories.total,
                    }}
                />
            </div>

            {/* Create / Edit Sheet */}
            <LaboratorySheet
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                laboratory={selectedLaboratory}
            />

            {/* Delete Confirmation Alert Dialog */}
            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Está seguro de eliminar este laboratorio?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará
                            permanentemente el laboratorio{' '}
                            <strong className="text-foreground">
                                {laboratoryToDelete?.name}
                            </strong>
                            .
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
