import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import { Edit2, ClipboardList, Plus, Search, Trash2 } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    index as workOrdersIndex,
    destroy as destroyWorkOrderType,
} from '@/actions/App/Http/Controllers/WorkOrderTypeController';
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
import WorkOrderTypeSheet from './work-order-type-sheet';

interface WorkOrderType {
    id: number;
    name: string;
    duration_unit: 'hours' | 'days';
    duration_value: number;
    same_day_rule_enabled: boolean;
    same_day_cutoff_start: string | null;
    same_day_cutoff_end: string | null;
    created_at: string;
}

interface Props {
    workOrderTypes: {
        data: WorkOrderType[];
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

export default function WorkOrderTypesIndex({
    workOrderTypes,
    filters,
}: Props) {
    const { auth } = usePage<any>().props;
    const canCreate = auth.permissions?.includes('work_orders.create');
    const canEdit = auth.permissions?.includes('work_orders.edit');
    const canDelete = auth.permissions?.includes('work_orders.delete');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedWorkOrderType, setSelectedWorkOrderType] =
        useState<WorkOrderType | null>(null);
    const [workOrderTypeToDelete, setWorkOrderTypeToDelete] =
        useState<WorkOrderType | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const newFilters = { ...filters, [key]: value };

            if (value === '') {
                delete newFilters[key as keyof typeof filters];
            }

            router.get(workOrdersIndex().url, newFilters, {
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
        if (search !== filters.search) {
            debouncedSearch(search);
        }
    }, [search, filters.search, debouncedSearch]);

    const handleEdit = (type: WorkOrderType) => {
        setSelectedWorkOrderType(type);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedWorkOrderType(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (type: WorkOrderType) => {
        setWorkOrderTypeToDelete(type);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (workOrderTypeToDelete) {
            router.delete(destroyWorkOrderType(workOrderTypeToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Tipo de orden eliminado correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Tipos de Órdenes de Trabajo" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <ClipboardList className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Tipos de Órdenes de Trabajo
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Administre los tipos de órdenes de trabajo, sus
                            tiempos estimados y reglas de entrega.
                        </p>
                    </div>
                    {canCreate && (
                        <div className="flex gap-2">
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
                            placeholder="Buscar por nombre..."
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
                                <TableHead>Fecha Creación</TableHead>
                                <TableHead className="text-right">
                                    {(canEdit || canDelete) && 'Acciones'}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workOrderTypes.data.length > 0 ? (
                                workOrderTypes.data.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-medium">
                                            {type.name}
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
                                        colSpan={3}
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
                    links={workOrderTypes.links}
                    meta={{
                        from: workOrderTypes.from,
                        to: workOrderTypes.to,
                        total: workOrderTypes.total,
                    }}
                />
            </div>

            <WorkOrderTypeSheet
                workOrderType={selectedWorkOrderType}
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
                            Esta acción eliminará permanentemente el tipo de
                            orden de trabajo{' '}
                            <strong>{workOrderTypeToDelete?.name}</strong>.
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
