import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Briefcase,
    Play,
    CheckCircle,
    Search,
    MessageSquare,
    Clock,
    AlertCircle,
    Filter,
    ChevronDown,
    RefreshCw,
    Eye,
} from 'lucide-react';
import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { updateStatus as updateWorkOrderStatus } from '@/actions/App/Http/Controllers/MyWorkOrderController';
import {
    DateRangePicker,
    setCookie,
    getLast2WeeksRange,
} from '@/components/date-range-picker';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import WorkOrderViewSheet from './work-order-view-sheet';
import SpecimenViewSheet from '../specimens/specimen-view-sheet';

interface Specimen {
    id: number;
    sequence_code?: string;
    customer_relation?: {
        name: string;
    };
    type?: {
        name: string;
    };
    examination?: {
        name: string;
    };
}

interface WorkOrderType {
    id: number;
    name: string;
    duration_unit?: 'hours' | 'days';
    duration_value?: number;
    same_day_rule_enabled?: boolean;
    same_day_cutoff_start?: string | null;
    same_day_cutoff_end?: string | null;
}

interface WorkOrder {
    id: number;
    specimen_id: number;
    work_order_type_id: number[];
    work_order_task_id: number | null;
    quantity: number;
    user_id: number;
    completed_by_id: number | null;
    status: 'Enviada' | 'En Proceso' | 'Finalizada';
    priority: number; // 1 = Alta, 2 = Media, 3 = Baja
    comments: string | null;
    due_date: string | null;
    completed_at: string | null;
    created_at: string;
    specimen?: Specimen;
    type?: WorkOrderType;
    types?: WorkOrderType[];
    task?: {
        name: string;
        description: string;
        duration_unit?: 'hours' | 'days';
        duration_value?: number;
        same_day_rule_enabled?: boolean;
        same_day_cutoff_start?: string | null;
        same_day_cutoff_end?: string | null;
    } | null;
    completed_by?: {
        name: string;
    };
}

interface Props {
    workOrders: WorkOrder[];
    filters: {
        status?: string[];
        date_from?: string;
        date_to?: string;
    };
}

const PRIORITY_METADATA: Record<number, { label: string; color: string }> = {
    1: { label: 'Alta', color: '#ef4444' }, // red-500
    2: { label: 'Media', color: '#f59e0b' }, // amber-500
    3: { label: 'Baja', color: '#10b981' }, // emerald-500
};

const STATUS_METADATA: Record<
    string,
    { label: string; bg: string; text: string; border: string }
> = {
    Enviada: {
        label: 'Enviada',
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500/20',
    },
    'En Proceso': {
        label: 'En Proceso',
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/20',
    },
    Finalizada: {
        label: 'Finalizada',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/20',
    },
};

export default function MyWorkOrdersIndex({ workOrders, filters }: Props) {
    const { props } = usePage() as any;
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
        () => filters.status || ['Enviada', 'En Proceso', 'Finalizada'],
    );
    const [dateRange, setDateRange] = useState<{ from: string; to: string }>(
        () => ({
            from: filters.date_from || '',
            to: filters.date_to || '',
        }),
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [isReloading, setIsReloading] = useState(false);
    const [selectedWorkOrder, setSelectedWorkOrder] =
        useState<WorkOrder | null>(null);
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
    const [selectedSpecimenForView, setSelectedSpecimenForView] =
        useState<any>(null);
    const [isSpecimenViewSheetOpen, setIsSpecimenViewSheetOpen] =
        useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        workOrderId: number;
        nextStatus: 'En Proceso' | 'Finalizada';
    } | null>(null);

    const ALL_STATUSES = [
        { value: 'Enviada', label: 'Enviada' },
        { value: 'En Proceso', label: 'En Proceso' },
        { value: 'Finalizada', label: 'Finalizada' },
    ];

    const handleReload = () => {
        setIsReloading(true);
        router.reload({
            onSuccess: () => {
                toast.success(
                    'Órdenes de trabajo actualizadas desde el servidor',
                );
            },
            onFinish: () => {
                setIsReloading(false);
            },
        });
    };

    useEffect(() => {
        if (filters.status) {
            setSelectedStatuses(filters.status);
        }

        if (filters.date_from !== undefined || filters.date_to !== undefined) {
            setDateRange({
                from: filters.date_from || '',
                to: filters.date_to || '',
            });
        }
    }, [filters]);

    // Filter work orders client-side
    const filteredWorkOrders = useMemo(() => {
        const searchLower = searchQuery.trim().toLowerCase();

        return workOrders.filter((wo) => {
            const matchesStatus = selectedStatuses.includes(wo.status);

            const woDateStr = format(new Date(wo.created_at), 'yyyy-MM-dd');
            const matchesDate =
                (!dateRange.from || woDateStr >= dateRange.from) &&
                (!dateRange.to || woDateStr <= dateRange.to);

            const matchesSearch =
                !searchLower ||
                wo.id.toString().includes(searchLower) ||
                (wo.specimen?.sequence_code &&
                    wo.specimen.sequence_code
                        .toLowerCase()
                        .includes(searchLower)) ||
                (wo.specimen?.customer_relation?.name &&
                    wo.specimen.customer_relation.name
                        .toLowerCase()
                        .includes(searchLower)) ||
                (wo.types &&
                    wo.types.some((t) =>
                        t.name.toLowerCase().includes(searchLower),
                    )) ||
                (wo.type?.name &&
                    wo.type.name.toLowerCase().includes(searchLower)) ||
                (wo.comments &&
                    wo.comments.toLowerCase().includes(searchLower));

            return matchesStatus && matchesDate && matchesSearch;
        });
    }, [workOrders, selectedStatuses, dateRange, searchQuery]);

    const handleUpdateStatus = (
        workOrderId: number,
        nextStatus: 'En Proceso' | 'Finalizada',
    ) => {
        router.put(
            updateWorkOrderStatus(workOrderId).url,
            { status: nextStatus },
            {
                onSuccess: () => {
                    toast.success(
                        nextStatus === 'En Proceso'
                            ? 'Orden de trabajo iniciada correctamente'
                            : 'Orden de trabajo finalizada correctamente',
                    );
                },
            },
        );
    };

    return (
        <TooltipProvider>
            <Head title="Mis Órdenes de Trabajo" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold tracking-tight">
                            Mis Órdenes de Trabajo
                        </h1>
                    </div>

                    <div className="flex w-full flex-col items-center justify-end gap-2 md:w-auto md:flex-row">
                        {/* Estado Filter (Combobox Múltiple) */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-10 gap-2 border bg-card transition-colors hover:bg-accent/50"
                                >
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        Estados ({selectedStatuses.length})
                                    </span>
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2" align="end">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between border-b px-2 py-1 pb-1.5 text-xs text-muted-foreground">
                                        <span>Filtrar por estado</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const userId =
                                                    props.auth?.user?.id;
                                                let nextStatuses: string[] = [];

                                                if (
                                                    selectedStatuses.length !==
                                                    ALL_STATUSES.length
                                                ) {
                                                    nextStatuses =
                                                        ALL_STATUSES.map(
                                                            (s) => s.value,
                                                        );
                                                }

                                                setSelectedStatuses(
                                                    nextStatuses,
                                                );

                                                if (userId) {
                                                    setCookie(
                                                        `status_filter_my_work_orders_user_${userId}`,
                                                        JSON.stringify(
                                                            nextStatuses,
                                                        ),
                                                    );
                                                }

                                                router.get(
                                                    '/my-work-orders',
                                                    {
                                                        ...filters,
                                                        status: nextStatuses,
                                                    },
                                                    {
                                                        preserveState: true,
                                                        replace: true,
                                                    },
                                                );
                                            }}
                                            className="cursor-pointer font-medium transition-colors hover:text-primary"
                                        >
                                            {selectedStatuses.length ===
                                            ALL_STATUSES.length
                                                ? 'Ninguno'
                                                : 'Todos'}
                                        </button>
                                    </div>
                                    <div className="max-h-60 space-y-1 overflow-y-auto pt-1">
                                        {ALL_STATUSES.map((status) => {
                                            const isChecked =
                                                selectedStatuses.includes(
                                                    status.value,
                                                );

                                            return (
                                                <div
                                                    key={status.value}
                                                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none hover:bg-accent hover:text-accent-foreground"
                                                    onClick={() => {
                                                        const userId =
                                                            props.auth?.user
                                                                ?.id;
                                                        const nextStatuses =
                                                            selectedStatuses.includes(
                                                                status.value,
                                                            )
                                                                ? selectedStatuses.filter(
                                                                      (s) =>
                                                                          s !==
                                                                          status.value,
                                                                  )
                                                                : [
                                                                      ...selectedStatuses,
                                                                      status.value,
                                                                  ];
                                                        setSelectedStatuses(
                                                            nextStatuses,
                                                        );

                                                        if (userId) {
                                                            setCookie(
                                                                `status_filter_my_work_orders_user_${userId}`,
                                                                JSON.stringify(
                                                                    nextStatuses,
                                                                ),
                                                            );
                                                        }

                                                        router.get(
                                                            '/my-work-orders',
                                                            {
                                                                ...filters,
                                                                status: nextStatuses,
                                                            },
                                                            {
                                                                preserveState: true,
                                                                replace: true,
                                                            },
                                                        );
                                                    }}
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        className="pointer-events-none"
                                                        onCheckedChange={() => {}}
                                                    />
                                                    <span>{status.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Rango de Fechas Filter */}
                        <DateRangePicker
                            cookieKey="date_filter_my_work_orders"
                            value={dateRange}
                            onChange={(range) => {
                                setDateRange(range);
                                router.get(
                                    '/my-work-orders',
                                    {
                                        ...filters,
                                        date_from: range.from,
                                        date_to: range.to,
                                    },
                                    {
                                        preserveState: true,
                                        replace: true,
                                    },
                                );
                            }}
                        />

                        <Button
                            variant="outline"
                            className="h-10 w-full gap-2 px-5 text-sm md:w-auto"
                            onClick={() => {
                                const userId = props.auth?.user?.id;

                                if (userId) {
                                    const defaultRange = getLast2WeeksRange();
                                    setCookie(
                                        `status_filter_my_work_orders_user_${userId}`,
                                        JSON.stringify([
                                            'Enviada',
                                            'En Proceso',
                                            'Finalizada',
                                        ]),
                                    );
                                    setCookie(
                                        `date_filter_my_work_orders_user_${userId}`,
                                        JSON.stringify(defaultRange),
                                    );
                                }

                                router.get(
                                    '/my-work-orders',
                                    {},
                                    {
                                        preserveState: false,
                                    },
                                );
                            }}
                        >
                            Limpiar filtros
                        </Button>

                        {/* Botón de recarga */}
                        <Button
                            variant="default"
                            size="icon"
                            disabled={isReloading}
                            onClick={handleReload}
                            className="h-10 w-10 shrink-0 bg-emerald-600 text-white transition-transform hover:bg-emerald-700 active:scale-95 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                            title="Recargar órdenes"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${isReloading ? 'animate-spin' : ''}`}
                            />
                        </Button>
                    </div>
                </div>

                {/* Second Row: Buscador */}
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative w-full shrink-0 sm:w-72">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Buscar orden, código o paciente..."
                            className="h-10 w-full bg-card pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-hidden rounded-md border bg-card shadow-xs">
                    <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px] font-semibold">
                                        N° Orden
                                    </TableHead>
                                    <TableHead className="w-[110px] text-center font-semibold">
                                        Estado
                                    </TableHead>
                                    <TableHead className="w-[100px] text-center font-semibold">
                                        Prioridad
                                    </TableHead>
                                    <TableHead className="w-[95px] text-center font-semibold">
                                        Vencimiento
                                    </TableHead>
                                    <TableHead className="w-[100px] font-semibold">
                                        Muestra
                                    </TableHead>
                                    <TableHead className="min-w-[120px] font-semibold">
                                        Tarea
                                    </TableHead>
                                    <TableHead className="min-w-[120px] font-semibold">
                                        Tipo de Orden
                                    </TableHead>
                                    <TableHead className="w-[80px] text-center font-semibold">
                                        Cantidad
                                    </TableHead>
                                    <TableHead className="w-[100px] text-center font-semibold">
                                        Comentarios
                                    </TableHead>
                                    <TableHead className="sticky right-0 z-10 w-[150px] min-w-[150px] border-l border-border bg-card text-right font-semibold">
                                        Acción
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredWorkOrders.length > 0 ? (
                                    filteredWorkOrders.map((wo) => {
                                        const pMeta =
                                            PRIORITY_METADATA[wo.priority] ||
                                            PRIORITY_METADATA[3];
                                        const sMeta =
                                            STATUS_METADATA[wo.status] ||
                                            STATUS_METADATA.Enviada;
                                        const hasComments = !!wo.comments;
                                        const isOverdue = !!(
                                            wo.due_date &&
                                            wo.status !== 'Finalizada' &&
                                            new Date(wo.due_date) <= new Date()
                                        );

                                        return (
                                            <TableRow
                                                key={wo.id}
                                                className={`border-border/40 transition-colors ${
                                                    isOverdue
                                                        ? 'bg-red-50/50 hover:bg-red-100/50 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                                                        : 'hover:bg-muted/30'
                                                }`}
                                            >
                                                <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                                                    #{wo.id}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sMeta.bg} ${sMeta.text} ${sMeta.border}`}
                                                    >
                                                        {sMeta.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <div
                                                            className="h-2 w-2 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    pMeta.color,
                                                            }}
                                                        />
                                                        <span className="text-xs text-muted-foreground">
                                                            {pMeta.label}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                {/* Visual Day Calendar Tear-off Widget */}
                                                <TableCell className="py-2.5">
                                                    {wo.due_date ? (
                                                        (() => {
                                                            const dueDate =
                                                                new Date(
                                                                    wo.due_date,
                                                                );

                                                            return (
                                                                <div className="mx-auto flex max-w-[62px] min-w-[62px] flex-col items-center justify-center overflow-hidden rounded-md border border-muted-foreground/20 bg-background text-center shadow-xs">
                                                                    <div
                                                                        className="w-full py-0.5 text-[8.5px] leading-none font-bold tracking-wider text-white uppercase"
                                                                        style={{
                                                                            backgroundColor:
                                                                                pMeta.color,
                                                                        }}
                                                                    >
                                                                        {format(
                                                                            dueDate,
                                                                            'MMM',
                                                                            {
                                                                                locale: es,
                                                                            },
                                                                        )}
                                                                    </div>
                                                                    <div className="mt-0.5 px-1.5 py-0.5 text-base leading-none font-black text-foreground">
                                                                        {format(
                                                                            dueDate,
                                                                            'dd',
                                                                        )}
                                                                    </div>
                                                                    <div className="mt-0.5 pb-1 text-[8.5px] leading-none text-muted-foreground">
                                                                        {format(
                                                                            dueDate,
                                                                            'HH:mm',
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (
                                                        <span className="block text-center text-xs text-muted-foreground">
                                                            N/A
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-max rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary dark:bg-primary/10">
                                                            {wo.specimen
                                                                ?.sequence_code ||
                                                                `#${wo.specimen_id}`}
                                                        </span>
                                                        {wo.specimen && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 hover:bg-muted"
                                                                onClick={() => {
                                                                    setSelectedSpecimenForView(
                                                                        wo.specimen,
                                                                    );
                                                                    setIsSpecimenViewSheetOpen(
                                                                        true,
                                                                    );
                                                                }}
                                                                title="Ver Muestra"
                                                            >
                                                                <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm font-medium text-foreground">
                                                    {wo.task?.name || 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-sm font-medium text-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>
                                                            {wo.types &&
                                                            wo.types.length > 0
                                                                ? wo.types
                                                                      .map(
                                                                          (t) =>
                                                                              t.name,
                                                                      )
                                                                      .join(
                                                                          ', ',
                                                                      )
                                                                : wo.type
                                                                      ?.name ||
                                                                  'N/A'}
                                                        </span>
                                                        {isOverdue && (
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <AlertCircle className="h-4 w-4 shrink-0 cursor-help text-red-500" />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="text-xs">
                                                                        La orden
                                                                        de
                                                                        trabajo
                                                                        está
                                                                        vencida
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-semibold text-foreground">
                                                    {wo.quantity}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {hasComments ? (
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-primary"
                                                                >
                                                                    <MessageSquare className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="max-w-xs">
                                                                <p className="text-xs text-foreground">
                                                                    {
                                                                        wo.comments
                                                                    }
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground/45">
                                                            -
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="sticky right-0 z-10 w-[150px] min-w-[150px] border-l border-border bg-card text-right transition-colors group-hover:bg-muted">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-primary"
                                                            onClick={() => {
                                                                setSelectedWorkOrder(
                                                                    wo,
                                                                );
                                                                setIsViewSheetOpen(
                                                                    true,
                                                                );
                                                            }}
                                                            title="Ver detalles de la orden"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>

                                                        {wo.status ===
                                                            'Enviada' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                                                                onClick={() =>
                                                                    setConfirmAction(
                                                                        {
                                                                            workOrderId:
                                                                                wo.id,
                                                                            nextStatus:
                                                                                'En Proceso',
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <Play className="h-3 w-3" />
                                                                <span>
                                                                    Iniciar
                                                                </span>
                                                            </Button>
                                                        )}
                                                        {wo.status ===
                                                            'En Proceso' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/10"
                                                                onClick={() =>
                                                                    setConfirmAction(
                                                                        {
                                                                            workOrderId:
                                                                                wo.id,
                                                                            nextStatus:
                                                                                'Finalizada',
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <CheckCircle className="h-3 w-3" />
                                                                <span>
                                                                    Finalizar
                                                                </span>
                                                            </Button>
                                                        )}
                                                        {wo.status ===
                                                            'Finalizada' && (
                                                            <div className="flex flex-col items-end gap-0.5 text-right">
                                                                <span className="text-[10px] leading-none font-medium text-muted-foreground">
                                                                    Por:{' '}
                                                                    {wo
                                                                        .completed_by
                                                                        ?.name ||
                                                                        'N/A'}
                                                                </span>
                                                                <span className="text-[9px] leading-none text-muted-foreground/60">
                                                                    {wo.completed_at
                                                                        ? format(
                                                                              new Date(
                                                                                  wo.completed_at,
                                                                              ),
                                                                              'dd/MM/yyyy h:mm a',
                                                                          )
                                                                        : ''}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={9}
                                            className="h-24 text-center text-sm text-muted-foreground/60"
                                        >
                                            No tiene órdenes de trabajo
                                            asignadas.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            <AlertDialog
                open={confirmAction !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfirmAction(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmAction?.nextStatus === 'En Proceso'
                                ? '¿Iniciar orden de trabajo?'
                                : '¿Finalizar orden de trabajo?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction?.nextStatus === 'En Proceso'
                                ? 'La orden de trabajo cambiará su estado a "En Proceso" y comenzará el tiempo de ejecución.'
                                : 'La orden de trabajo cambiará su estado a "Finalizada" y se registrará como completada por usted.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (confirmAction) {
                                    handleUpdateStatus(
                                        confirmAction.workOrderId,
                                        confirmAction.nextStatus,
                                    );
                                    setConfirmAction(null);
                                }
                            }}
                            className={
                                confirmAction?.nextStatus === 'En Proceso'
                                    ? 'border-none bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'border-none bg-blue-600 text-white hover:bg-blue-700'
                            }
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <WorkOrderViewSheet
                workOrder={selectedWorkOrder}
                open={isViewSheetOpen}
                onOpenChange={setIsViewSheetOpen}
            />

            <SpecimenViewSheet
                open={isSpecimenViewSheetOpen}
                onOpenChange={setIsSpecimenViewSheetOpen}
                specimen={selectedSpecimenForView}
                onEditClick={() => {}}
            />
        </TooltipProvider>
    );
}
