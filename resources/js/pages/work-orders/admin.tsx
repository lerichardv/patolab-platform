import { Head, router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import debounce from 'lodash/debounce';
import {
    Eye,
    Search,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    Clock,
    User,
    Tag,
    AlertCircle,
    ClipboardList,
    Layers,
    Calendar,
    Users,
} from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import * as React from 'react';
import { index as adminWorkOrdersIndex } from '@/actions/App/Http/Controllers/WorkOrderController';
import { DateRangePicker } from '@/components/date-range-picker';
import { Pagination } from '@/components/pagination';
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
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import SpecimenViewSheet from '../specimens/specimen-view-sheet';

interface WorkOrder {
    id: number;
    specimen_id: number;
    specimen: any;
    work_order_type_id: number;
    type: any;
    status: 'Enviada' | 'En Proceso' | 'Finalizada';
    priority: number;
    comments: string | null;
    due_date: string | null;
    created_at: string;
    users: any[];
}

interface Props {
    workOrders: {
        data: WorkOrder[];
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
    workOrderTypes: { id: number; name: string }[];
    filters: {
        search?: string;
        status?: string;
        priority?: string;
        work_order_type_id?: string;
        date_from?: string;
        date_to?: string;
        sort_field?: string;
        sort_direction?: string;
    };
}

export default function WorkOrdersAdminIndex({
    workOrders,
    workOrderTypes,
    filters,
}: Props) {
    const { auth } = usePage<any>().props;
    const [selectedSpecimen, setSelectedSpecimen] = useState<any | null>(null);
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const newFilters = { ...filters, [key]: value };

            if (value === 'all' || value === '') {
                delete newFilters[key as keyof typeof filters];
            }

            router.get(adminWorkOrdersIndex().url, newFilters, {
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

    const handleSort = (field: string) => {
        const isCurrentField = filters.sort_field === field;
        const direction =
            isCurrentField && filters.sort_direction === 'asc' ? 'desc' : 'asc';

        const newFilters = {
            ...filters,
            sort_field: field,
            sort_direction: direction,
        };

        router.get(adminWorkOrdersIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const renderSortHeader = (label: string, field: string) => {
        const isSorted = filters.sort_field === field;
        const direction = isSorted ? filters.sort_direction : null;

        return (
            <button
                type="button"
                onClick={() => handleSort(field)}
                className="group/btn inline-flex items-center gap-1 font-semibold uppercase hover:text-foreground"
            >
                {label}
                {isSorted ? (
                    direction === 'asc' ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                    )
                ) : (
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover/btn:opacity-100" />
                )}
            </button>
        );
    };

    const handleViewSpecimen = (specimen: any) => {
        setSelectedSpecimen(specimen);
        setIsViewSheetOpen(true);
    };

    return (
        <>
            <Head title="Órdenes de Trabajo - Administración" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <ClipboardList className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Control de Órdenes de Trabajo
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Historial completo de todas las órdenes de trabajo
                            emitidas, asignaciones y seguimiento de estados.
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
                    {/* Row 1: Search and Date Range */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative max-w-md flex-1">
                            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por código de muestra, paciente, técnico..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                Rango de Creación:
                            </span>
                            <DateRangePicker
                                cookieKey="date_filter_admin_work_orders"
                                value={{
                                    from: filters.date_from || '',
                                    to: filters.date_to || '',
                                }}
                                onChange={(range: {
                                    from: string;
                                    to: string;
                                }) => {
                                    const newFilters = { ...filters };

                                    if (range.from) {
                                        newFilters.date_from = range.from;
                                    } else {
                                        delete newFilters.date_from;
                                    }

                                    if (range.to) {
                                        newFilters.date_to = range.to;
                                    } else {
                                        delete newFilters.date_to;
                                    }

                                    router.get(
                                        adminWorkOrdersIndex().url,
                                        newFilters,
                                        {
                                            preserveState: true,
                                            replace: true,
                                        },
                                    );
                                }}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Row 2: Advanced filters */}
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Estado de Orden
                            </span>
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('status', v)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Filtrar por estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los estados
                                    </SelectItem>
                                    <SelectItem value="Enviada">
                                        Enviada
                                    </SelectItem>
                                    <SelectItem value="En Proceso">
                                        En Proceso
                                    </SelectItem>
                                    <SelectItem value="Finalizada">
                                        Finalizada
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Prioridad
                            </span>
                            <Select
                                value={filters.priority || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('priority', v)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Filtrar por prioridad" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todas las prioridades
                                    </SelectItem>
                                    <SelectItem value="1">Alta</SelectItem>
                                    <SelectItem value="2">Media</SelectItem>
                                    <SelectItem value="3">Baja</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Tipo de Orden
                            </span>
                            <Select
                                value={filters.work_order_type_id || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('work_order_type_id', v)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Filtrar por tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los tipos
                                    </SelectItem>
                                    {workOrderTypes.map((type) => (
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
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    {renderSortHeader('Creada', 'created_at')}
                                </TableHead>
                                <TableHead>Muestra</TableHead>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Tipo de Orden</TableHead>
                                <TableHead>
                                    {renderSortHeader('Prioridad', 'priority')}
                                </TableHead>
                                <TableHead>
                                    {renderSortHeader('Estado', 'status')}
                                </TableHead>
                                <TableHead>
                                    {renderSortHeader(
                                        'Vencimiento',
                                        'due_date',
                                    )}
                                </TableHead>
                                <TableHead>Técnicos Asignados</TableHead>
                                <TableHead className="text-right">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workOrders.data.length > 0 ? (
                                workOrders.data.map((order) => {
                                    const priorityLabel =
                                        order.priority === 1
                                            ? 'Alta'
                                            : order.priority === 2
                                              ? 'Media'
                                              : 'Baja';

                                    const priorityColor =
                                        order.priority === 1
                                            ? 'bg-orange-500 text-white animate-pulse'
                                            : order.priority === 2
                                              ? 'bg-yellow-500 text-black'
                                              : 'bg-green-500 text-white';

                                    return (
                                        <TableRow
                                            key={order.id}
                                            className="transition-colors hover:bg-muted/10"
                                        >
                                            <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                                                {format(
                                                    new Date(order.created_at),
                                                    'dd/MM/yyyy HH:mm',
                                                    { locale: es },
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-semibold text-primary">
                                                {order.specimen
                                                    ?.sequence_code ||
                                                    `#${order.specimen_id}`}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">
                                                {order.specimen
                                                    ?.customer_relation?.name ||
                                                    'N/A'}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {order.type?.name || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={cn(
                                                        'inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                                                        priorityColor,
                                                    )}
                                                >
                                                    {priorityLabel}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                                                    {order.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                                                {order.due_date
                                                    ? format(
                                                          new Date(
                                                              order.due_date,
                                                          ),
                                                          'dd/MM/yyyy HH:mm',
                                                          { locale: es },
                                                      )
                                                    : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex max-w-[200px] flex-wrap gap-1">
                                                    {order.users &&
                                                    order.users.length > 0 ? (
                                                        order.users.map((u) => (
                                                            <Badge
                                                                key={u.id}
                                                                variant="secondary"
                                                                className="px-1.5 py-0 text-[10px]"
                                                            >
                                                                {u.name}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            Sin asignar
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {order.specimen && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Ver detalles de la muestra"
                                                        onClick={() =>
                                                            handleViewSpecimen(
                                                                order.specimen,
                                                            )
                                                        }
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={9}
                                        className="h-24 text-center text-sm text-muted-foreground"
                                    >
                                        No se encontraron órdenes de trabajo.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <Pagination
                    links={workOrders.links}
                    meta={{
                        from: workOrders.from,
                        to: workOrders.to,
                        total: workOrders.total,
                    }}
                />
            </div>

            {/* Specimen Details Sheet */}
            <SpecimenViewSheet
                specimen={selectedSpecimen}
                open={isViewSheetOpen}
                onOpenChange={setIsViewSheetOpen}
                onEditClick={() => {
                    if (selectedSpecimen) {
                        router.get('/specimens', {
                            specimen:
                                selectedSpecimen.sequence_code ||
                                String(selectedSpecimen.id),
                            action: 'view',
                        });
                    }
                }}
            />
        </>
    );
}
