import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import {
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    Edit2,
    FlaskConical,
    Plus,
    Search,
    Trash2,
    Upload,
} from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
    index as examinationsIndex,
    destroy as destroyExamination,
    importPage as importExaminationsPage,
} from '@/actions/App/Http/Controllers/SpecimenTypeExaminationController';
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
import SpecimenTypeExaminationSheet from './specimen-type-examination-sheet';

interface SpecimenType {
    id: number;
    name: string;
}

interface Price {
    id?: number;
    amount: number | string;
}

interface Examination {
    id: number;
    specimen_type: number;
    name: string;
    description: string;
    type?: SpecimenType;
    created_at: string;
    prices?: Price[];
}

interface Props {
    examinations: {
        data: Examination[];
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
    specimenTypes: SpecimenType[];
    filters: {
        search?: string;
        specimen_type?: string;
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
    };
}

export default function SpecimenTypeExaminationsIndex({
    examinations,
    specimenTypes,
    filters,
}: Props) {
    const { auth } = usePage<any>().props;
    const canCreate = auth.permissions?.includes(
        'specimen_type_examinations.create',
    );
    const canEdit = auth.permissions?.includes(
        'specimen_type_examinations.edit',
    );
    const canDelete = auth.permissions?.includes(
        'specimen_type_examinations.delete',
    );

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedExamination, setSelectedExamination] =
        useState<Examination | null>(null);
    const [examinationToDelete, setExaminationToDelete] =
        useState<Examination | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const newFilters = { ...filters, [key]: value };

            if (value === 'all' || value === '') {
                delete newFilters[key as keyof typeof filters];
            }

            router.get(examinationsIndex().url, newFilters, {
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

            router.get(examinationsIndex().url, newFilters, {
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

    const handleEdit = (examination: Examination) => {
        setSelectedExamination(examination);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedExamination(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (examination: Examination) => {
        setExaminationToDelete(examination);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (examinationToDelete) {
            router.delete(destroyExamination(examinationToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Tipo de análisis eliminado correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Tipos de Análisis" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FlaskConical className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Tipos de Análisis
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Administre los diferentes análisis disponibles por
                            tipo de muestra.
                        </p>
                    </div>
                    {canCreate && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    window.open(
                                        importExaminationsPage().url,
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
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Análisis
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select
                        value={filters.specimen_type || 'all'}
                        onValueChange={(v) =>
                            handleFilterChange('specimen_type', v)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Tipo de Muestra" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                Todos los tipos de muestra
                            </SelectItem>
                            {specimenTypes.map((type) => (
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
                                <TableHead>{renderSortHeader('specimen_type', 'Tipo de Muestra')}</TableHead>
                                <TableHead>{renderSortHeader('name', 'Análisis')}</TableHead>
                                <TableHead>{renderSortHeader('description', 'Descripción')}</TableHead>
                                <TableHead>Precios</TableHead>
                                <TableHead>Fecha Creación</TableHead>
                                <TableHead className="text-right">
                                    {(canEdit || canDelete) && 'Acciones'}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {examinations.data.length > 0 ? (
                                examinations.data.map((exam) => (
                                    <TableRow key={exam.id}>
                                        <TableCell>
                                            <span className="font-semibold text-primary">
                                                {exam.type?.name ||
                                                    'Cargando...'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {exam.name}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-muted-foreground">
                                            {exam.description}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex max-w-xs flex-wrap gap-1">
                                                {exam.prices &&
                                                exam.prices.length > 0 ? (
                                                    exam.prices.map((price) => (
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
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        Sin precio
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(
                                                exam.created_at,
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
                                                                handleEdit(exam)
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
                                                                    exam,
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
                    links={examinations.links}
                    meta={{
                        from: examinations.from,
                        to: examinations.to,
                        total: examinations.total,
                    }}
                />
            </div>

            <SpecimenTypeExaminationSheet
                examination={selectedExamination}
                specimenTypes={specimenTypes}
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
                            Esta acción desactivará el tipo de análisis{' '}
                            <strong>{examinationToDelete?.name}</strong>. Ya no
                            aparecerá en la lista activa.
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
