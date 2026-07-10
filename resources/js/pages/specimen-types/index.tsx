import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import {
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    Edit2,
    Microscope,
    Plus,
    Search,
    Trash2,
    Upload,
} from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
    index as specimenTypesIndex,
    destroy as destroySpecimenType,
    importPage as importSpecimenTypesPage,
} from '@/actions/App/Http/Controllers/SpecimenTypeController';
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
import SpecimenTypeSheet from './specimen-type-sheet';

interface SpecimenType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
}

interface Props {
    specimenTypes: {
        data: SpecimenType[];
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
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
    };
}

export default function SpecimenTypesIndex({ specimenTypes, filters }: Props) {
    const { auth } = usePage<any>().props;
    const canCreate = auth.permissions?.includes('specimen_types.create');
    const canEdit = auth.permissions?.includes('specimen_types.edit');
    const canDelete = auth.permissions?.includes('specimen_types.delete');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedSpecimenType, setSelectedSpecimenType] =
        useState<SpecimenType | null>(null);
    const [specimenTypeToDelete, setSpecimenTypeToDelete] =
        useState<SpecimenType | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const newFilters = { ...filters, [key]: value };

            if (value === '') {
                delete newFilters[key as keyof typeof filters];
            }

            router.get(specimenTypesIndex().url, newFilters, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    const handleSort = useCallback(
        (field: string) => {
            const isCurrentField = filters.sort_field === field;
            const direction =
                isCurrentField && filters.sort_direction === 'asc'
                    ? 'desc'
                    : 'asc';

            const newFilters = {
                ...filters,
                sort_field: field,
                sort_direction: direction,
            };

            router.get(specimenTypesIndex().url, newFilters, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    const renderSortHeader = (field: string, label: string) => {
        const isSorted = filters.sort_field === field;
        const direction = isSorted ? filters.sort_direction || 'desc' : null;

        return (
            <button
                onClick={() => handleSort(field)}
                className="group/btn flex items-center gap-1.5 text-left font-semibold transition-colors hover:text-foreground"
            >
                <span>{label}</span>
                {direction === 'asc' ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
                ) : direction === 'desc' ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover/btn:opacity-100" />
                )}
            </button>
        );
    };

    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                handleFilterChange('search', value);
            }, 300),
        [handleFilterChange],
    );

    useEffect(() => {
        if (search !== filters.search) {
            debouncedSearch(search);
        }
    }, [search, debouncedSearch, filters.search]);

    const handleEdit = (specimenType: SpecimenType) => {
        setSelectedSpecimenType(specimenType);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedSpecimenType(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (specimenType: SpecimenType) => {
        setSpecimenTypeToDelete(specimenType);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (specimenTypeToDelete) {
            router.delete(destroySpecimenType(specimenTypeToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Tipo de muestra eliminado correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Tipos de Muestras" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Microscope className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Tipos de Muestras
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Administre los diferentes tipos de muestras para los
                            análisis.
                        </p>
                    </div>
                    {canCreate && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    window.open(
                                        importSpecimenTypesPage().url,
                                        '_blank',
                                    )
                                }
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Upload className="mr-2 h-4 w-4" /> Importar
                            </Button>
                            <Button
                                onClick={handleCreate}
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Tipo
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o descripción..."
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
                                <TableHead>
                                    {renderSortHeader('name', 'Nombre')}
                                </TableHead>
                                <TableHead>
                                    {renderSortHeader(
                                        'description',
                                        'Descripción',
                                    )}
                                </TableHead>
                                <TableHead>Fecha Creación</TableHead>
                                <TableHead className="text-right">
                                    {(canEdit || canDelete) && 'Acciones'}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {specimenTypes.data.length > 0 ? (
                                specimenTypes.data.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-medium">
                                            {type.name}
                                        </TableCell>
                                        <TableCell className="max-w-md truncate text-muted-foreground">
                                            {type.description ||
                                                'Sin descripción'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(
                                                type.created_at,
                                            ).toLocaleDateString('es-ES', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(canEdit || canDelete) && (
                                                <div className="flex justify-end gap-2">
                                                    {canEdit && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleEdit(type)
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
                                                                    type,
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
                                        colSpan={4}
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
                    links={specimenTypes.links}
                    meta={{
                        from: specimenTypes.from,
                        to: specimenTypes.to,
                        total: specimenTypes.total,
                    }}
                />
            </div>

            <SpecimenTypeSheet
                specimenType={selectedSpecimenType}
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
                            Esta acción desactivará el tipo de muestra{' '}
                            <strong>{specimenTypeToDelete?.name}</strong>. Ya no
                            aparecerá en la lista activa ni estará disponible
                            para nuevos análisis.
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
