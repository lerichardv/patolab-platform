import { Head, router, usePage } from '@inertiajs/react';
import { format, add, formatDistanceToNow, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Briefcase,
    Play,
    CheckCircle,
    Search,
    Clock,
    AlertCircle,
    Filter,
    ChevronDown,
    RefreshCw,
    Eye,
    Maximize2,
    Minimize2,
    Plus,
    X,
    UserPlus,
    CalendarClock,
} from 'lucide-react';
import * as React from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
    assignTechnician,
    unassignTechnician,
    updateStatus,
} from '@/actions/App/Http/Controllers/HistotechnologistWorkOrderController';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SpecimenViewSheet from '../specimens/specimen-view-sheet';
import WorkOrderViewSheet from '../my-work-orders/work-order-view-sheet';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';

interface User {
    id: number;
    name: string;
    email: string;
}

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
    user_id: number | null;
    completed_by_id: number | null;
    created_by_id: number | null;
    status: 'Enviada' | 'En Proceso' | 'Finalizada';
    priority: number; // 1 = Alta, 2 = Media, 3 = Baja
    comments: string | null;
    due_date: string | null;
    completed_at: string | null;
    created_at: string;
    specimen?: Specimen;
    type?: WorkOrderType;
    types?: WorkOrderType[];
    users?: User[];
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
    } | null;
    created_by?: {
        name: string;
    } | null;
}

interface Props {
    workOrders: WorkOrder[];
    technicians: User[];
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

const getDueDateInfo = (wo: WorkOrder) => {
    let dueDate: Date | null = null;

    if (wo.due_date) {
        dueDate = new Date(wo.due_date);
    } else {
        const targetConfig =
            wo.task ||
            wo.type ||
            (wo.types && wo.types.length > 0 ? wo.types[0] : null);

        if (targetConfig) {
            const createdAt = new Date(wo.created_at);
            const {
                duration_unit,
                duration_value,
                same_day_rule_enabled,
                same_day_cutoff_start,
                same_day_cutoff_end,
            } = targetConfig;

            if (
                same_day_rule_enabled &&
                same_day_cutoff_start &&
                same_day_cutoff_end
            ) {
                const createdTime = format(createdAt, 'HH:mm:ss');
                if (
                    createdTime >= same_day_cutoff_start &&
                    createdTime <= same_day_cutoff_end
                ) {
                    dueDate = new Date(
                        createdAt.getFullYear(),
                        createdAt.getMonth(),
                        createdAt.getDate(),
                        23,
                        59,
                        59,
                    );
                }
            }

            if (!dueDate && duration_unit && duration_value) {
                const unitMap: Record<string, string> = {
                    minutes: 'minutes',
                    hours: 'hours',
                    days: 'days',
                    weeks: 'weeks',
                };
                const duration = {
                    [unitMap[duration_unit] || 'days']: duration_value,
                };
                dueDate = add(createdAt, duration);
            }
        }
    }

    if (!dueDate) {
        return null;
    }

    const isCompleted = wo.status === 'Finalizada';

    const dueDateFormatted = formatDistanceToNow(dueDate, {
        addSuffix: true,
        locale: es,
    });
    const fullDueDate = format(dueDate, 'dd/MM/yyyy HH:mm');

    const isExpired = isPast(dueDate);
    const isWithinOneDay =
        dueDateFormatted.includes('1 día') ||
        dueDateFormatted.includes('hora') ||
        dueDateFormatted.includes('minuto');

    let colorClass =
        'bg-secondary text-secondary-foreground border-transparent';

    if (!isCompleted) {
        if (isExpired) {
            colorClass =
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50';
        } else if (isWithinOneDay) {
            colorClass =
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50';
        } else {
            colorClass =
                'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
        }
    }

    return {
        dueDateFormatted,
        fullDueDate,
        colorClass,
        isExpired,
        dueDate,
    };
};

export default function HistotechnologistWorkOrdersControl({
    workOrders,
    technicians,
    filters,
}: Props) {
    const { props } = usePage() as any;
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDark, setIsDark] = useState(false);

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
    const [openAssignWorkOrderId, setOpenAssignWorkOrderId] = useState<
        number | null
    >(null);
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
                    'Tablero de control actualizado desde el servidor',
                );
            },
            onFinish: () => {
                setIsReloading(false);
            },
        });
    };

    // Fullscreen event listener to sync state with native ESC button exits
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange,
            );
        };
    }, []);

    // Sync dark mode state client-side and react to mutations (theme changes)
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const updateDark = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };

        updateDark();

        const observer = new MutationObserver(updateDark);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    const toggleFullscreen = () => {
        if (!containerRef.current) {
            return;
        }

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch((err) => {
                toast.error('Error al intentar activar pantalla completa');
                console.error(err);
            });
        } else {
            document.exitFullscreen();
        }
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
                (wo.users &&
                    wo.users.some((u) =>
                        u.name.toLowerCase().includes(searchLower),
                    )) ||
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
            updateStatus(workOrderId).url,
            { status: nextStatus },
            {
                onSuccess: () => {
                    toast.success(
                        'Estado de la orden actualizado correctamente',
                    );
                },
            },
        );
    };

    const handleAssign = (workOrderId: number, techId: number) => {
        router.post(
            assignTechnician(workOrderId).url,
            { user_id: techId },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Técnico asignado correctamente');
                },
            },
        );
    };

    const handleUnassign = (workOrderId: number, techId: number) => {
        router.delete(
            unassignTechnician({ work_order: workOrderId, user: techId }).url,
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Técnico desasignado correctamente');
                },
            },
        );
    };

    return (
        <TooltipProvider>
            <Head title="Control de Órdenes (Histotecnólogo)" />
            <div
                ref={containerRef}
                className={`flex flex-col gap-4 bg-background transition-all ${
                    isFullscreen
                        ? 'h-screen w-screen overflow-y-auto p-6'
                        : 'h-full flex-1 p-4'
                } ${isDark ? 'dark' : ''}`}
            >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold tracking-tight">
                            Control de Órdenes de Trabajo
                        </h1>
                    </div>

                    <div className="flex w-full flex-col items-center justify-end gap-2 md:w-auto md:flex-row">
                        {/* Fullscreen Button */}
                        <Button
                            variant="outline"
                            className="h-10 w-full gap-2 border bg-card transition-colors hover:bg-accent/50 md:w-auto"
                            onClick={toggleFullscreen}
                            title={
                                isFullscreen
                                    ? 'Salir de pantalla completa'
                                    : 'Pantalla completa'
                            }
                        >
                            {isFullscreen ? (
                                <>
                                    <Minimize2 className="h-4 w-4 text-muted-foreground" />
                                    <span>Salir Fullscreen</span>
                                </>
                            ) : (
                                <>
                                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                                    <span>Fullscreen</span>
                                </>
                            )}
                        </Button>

                        {/* Estado Filter */}
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
                                                        `status_filter_histotechnologist_work_orders_user_${userId}`,
                                                        JSON.stringify(
                                                            nextStatuses,
                                                        ),
                                                    );
                                                }

                                                router.get(
                                                    '/histotechnologist-work-orders',
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
                                                                `status_filter_histotechnologist_work_orders_user_${userId}`,
                                                                JSON.stringify(
                                                                    nextStatuses,
                                                                ),
                                                            );
                                                        }

                                                        router.get(
                                                            '/histotechnologist-work-orders',
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

                        {/* Date Range Picker */}
                        <DateRangePicker
                            cookieKey="date_filter_histotechnologist_work_orders"
                            value={dateRange}
                            onChange={(range) => {
                                setDateRange(range);
                                router.get(
                                    '/histotechnologist-work-orders',
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
                                        `status_filter_histotechnologist_work_orders_user_${userId}`,
                                        JSON.stringify([
                                            'Enviada',
                                            'En Proceso',
                                            'Finalizada',
                                        ]),
                                    );
                                    setCookie(
                                        `date_filter_histotechnologist_work_orders_user_${userId}`,
                                        JSON.stringify(defaultRange),
                                    );
                                }

                                router.get(
                                    '/histotechnologist-work-orders',
                                    {},
                                    {
                                        preserveState: false,
                                    },
                                );
                            }}
                        >
                            Limpiar filtros
                        </Button>

                        {/* Reload button */}
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
                            placeholder="Buscar orden, código, paciente o técnico..."
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
                                    <TableHead className="min-w-[180px] font-semibold">
                                        Técnicos Asignados
                                    </TableHead>
                                    <TableHead className="w-[110px] text-center font-semibold">
                                        Estado
                                    </TableHead>
                                    <TableHead className="w-[100px] text-center font-semibold">
                                        Prioridad
                                    </TableHead>
                                    <TableHead className="min-w-[170px] text-center font-semibold">
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
                                    <TableHead className="w-[120px] text-left font-semibold">
                                        Creado por
                                    </TableHead>
                                    <TableHead className="w-[400px] max-w-[400px] text-left font-semibold">
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
                                        const dueInfo = getDueDateInfo(wo);
                                        const isOverdue = !!(
                                            dueInfo &&
                                            dueInfo.isExpired &&
                                            wo.status !== 'Finalizada'
                                        );

                                        // Filter technicians not yet assigned to this work order
                                        const unassignedTechs =
                                            technicians.filter(
                                                (t) =>
                                                    !wo.users?.some(
                                                        (assigned) =>
                                                            assigned.id ===
                                                            t.id,
                                                    ),
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

                                                {/* Technician Inline Management Column */}
                                                <TableCell className="py-2">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {wo.users &&
                                                            wo.users.map(
                                                                (user) => (
                                                                    <Badge
                                                                        key={
                                                                            user.id
                                                                        }
                                                                        variant="secondary"
                                                                        className="flex items-center gap-1 bg-muted/65 py-0.5 pr-1 text-[11px] font-medium"
                                                                    >
                                                                        <span>
                                                                            {
                                                                                user.name
                                                                            }
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            className="rounded-full p-0.5 hover:bg-accent hover:text-accent-foreground"
                                                                            onClick={() =>
                                                                                handleUnassign(
                                                                                    wo.id,
                                                                                    user.id,
                                                                                )
                                                                            }
                                                                            title={`Desasignar ${user.name}`}
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </Badge>
                                                                ),
                                                            )}

                                                        {/* Add Technician Dropdown (shadcn Combobox) */}
                                                        <Popover
                                                            open={
                                                                openAssignWorkOrderId ===
                                                                wo.id
                                                            }
                                                            onOpenChange={(
                                                                isOpen,
                                                            ) =>
                                                                setOpenAssignWorkOrderId(
                                                                    isOpen
                                                                        ? wo.id
                                                                        : null,
                                                                )
                                                            }
                                                            modal={true}
                                                        >
                                                            <PopoverTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/30 hover:border-foreground"
                                                                    title="Asignar técnico"
                                                                >
                                                                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent
                                                                className="w-56 p-0"
                                                                align="start"
                                                            >
                                                                <Command>
                                                                    <CommandInput placeholder="Buscar técnico..." />
                                                                    <CommandList className="max-h-56">
                                                                        <CommandEmpty>
                                                                            No
                                                                            se
                                                                            encontraron
                                                                            resultados.
                                                                        </CommandEmpty>
                                                                        <CommandGroup>
                                                                            {unassignedTechs.length >
                                                                            0 ? (
                                                                                unassignedTechs.map(
                                                                                    (
                                                                                        t,
                                                                                    ) => (
                                                                                        <CommandItem
                                                                                            key={
                                                                                                t.id
                                                                                            }
                                                                                            value={
                                                                                                t.name
                                                                                            }
                                                                                            onSelect={() => {
                                                                                                handleAssign(
                                                                                                    wo.id,
                                                                                                    t.id,
                                                                                                );
                                                                                                setOpenAssignWorkOrderId(
                                                                                                    null,
                                                                                                );
                                                                                            }}
                                                                                            className="cursor-pointer"
                                                                                        >
                                                                                            {
                                                                                                t.name
                                                                                            }
                                                                                        </CommandItem>
                                                                                    ),
                                                                                )
                                                                            ) : (
                                                                                <div className="p-2 text-center text-xs text-muted-foreground">
                                                                                    Todos
                                                                                    los
                                                                                    técnicos
                                                                                    asignados
                                                                                </div>
                                                                            )}
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
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
                                                {/* Visual Day Calendar Tear-off Widget + Inline Status Badge */}
                                                <TableCell className="py-2.5">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {(() => {
                                                            const dueDate =
                                                                dueInfo?.dueDate ||
                                                                (wo.due_date
                                                                    ? new Date(
                                                                          wo.due_date,
                                                                      )
                                                                    : null);

                                                            if (!dueDate) {
                                                                return (
                                                                    <span className="block text-center text-xs text-muted-foreground">
                                                                        N/A
                                                                    </span>
                                                                );
                                                            }

                                                            return (
                                                                <>
                                                                    <div className="flex max-w-[62px] min-w-[62px] flex-col items-center justify-center overflow-hidden rounded-md border border-muted-foreground/20 bg-background text-center shadow-xs">
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

                                                                    {dueInfo &&
                                                                        wo.status !==
                                                                            'Finalizada' && (
                                                                            <div
                                                                                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${dueInfo.colorClass}`}
                                                                                title={`Vencimiento Estimado: ${dueInfo.fullDueDate}`}
                                                                            >
                                                                                <CalendarClock className="h-3 w-3 shrink-0" />
                                                                                <span>
                                                                                    {dueInfo.isExpired
                                                                                        ? 'Vencida:'
                                                                                        : 'Est:'}{' '}
                                                                                    {
                                                                                        dueInfo.dueDateFormatted
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
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
                                                <TableCell className="text-left text-xs font-normal text-foreground">
                                                    {wo.created_by?.name || (
                                                        <span className="text-muted-foreground/45">
                                                            -
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-[400px] text-left text-xs font-normal break-words whitespace-normal">
                                                    {wo.comments || (
                                                        <span className="text-muted-foreground/45">
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
                                            colSpan={11}
                                            className="h-24 text-center text-sm text-muted-foreground/60"
                                        >
                                            No se encontraron órdenes de
                                            trabajo.
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
                workOrder={selectedWorkOrder as any}
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
