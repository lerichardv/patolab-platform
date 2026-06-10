import { Head, router } from '@inertiajs/react';
import { format, add, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ClipboardList,
    Eye,
    Microscope,
    Calendar,
    Clock,
    AlertCircle,
    Filter,
    CalendarClock,
    ChevronDown,
    FileText,
    Copy,
    Check,
    Search,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { DateRangePicker } from '@/components/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import SpecimenViewSheet from '../specimens/specimen-view-sheet';

interface Specimen {
    id: number;
    priority_id: number;
    sequence_code?: string;
    customer_relation?: {
        id: number;
        name: string;
        id_number: string;
    };
    type?: {
        id: number;
        name: string;
    };
    examination?: {
        id: number;
        name: string;
    };
    category?: {
        id: number;
        name: string;
        unit: string;
        quantity: number;
    };
    priority?: {
        id: number;
        name: string;
        color: string;
        order: number;
    };
    status: string;
    status_color?: string;
    created_at: string;
    invoice_relation?: any;
    users?: any[];
}

interface Priority {
    id: number;
    name: string;
    color: string;
    order: number;
}

interface Props {
    specimens: Specimen[];
    priorities: Priority[];
}

const ALL_STATUSES = [
    { value: 'received', label: 'Recibida' },
    { value: 'macroscopic_review', label: 'Rev. Macroscópica' },
    { value: 'processing', label: 'En Proceso' },
    { value: 'microscopic_review', label: 'Rev. Microscópica' },
    { value: 'finalized', label: 'Finalizada' },
    { value: 'delivered', label: 'Entregada' },
    { value: 'cancelled', label: 'Cancelada' },
];

const STATUS_LABELS: Record<string, string> = {
    received: 'Recibida',
    macroscopic_review: 'Rev. Macroscópica',
    processing: 'En Proceso',
    microscopic_review: 'Rev. Microscópica',
    finalized: 'Finalizada',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
};

// Calculate the due date based on specimen category configuration
const getDueDate = (specimen: Specimen): Date => {
    const createdAt = new Date(specimen.created_at);

    if (
        !specimen.category ||
        !specimen.category.unit ||
        !specimen.category.quantity
    ) {
        return createdAt;
    }

    const unitMap: Record<string, string> = {
        minutes: 'minutes',
        hours: 'hours',
        days: 'days',
        weeks: 'weeks',
    };

    const duration = {
        [unitMap[specimen.category.unit] || 'days']: specimen.category.quantity,
    };

    return add(createdAt, duration);
};

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-muted hover:text-foreground focus:opacity-100"
            onClick={handleCopy}
            title="Copiar código"
        >
            {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
            ) : (
                <Copy className="h-3.5 w-3.5" />
            )}
        </Button>
    );
}

export default function MyAssignmentsIndex({ specimens, priorities }: Props) {
    const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(
        null,
    );
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);

    // Filters State: Defaults matching specimens board
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
        'received',
        'macroscopic_review',
        'processing',
        'microscopic_review',
    ]);

    const [dateRange, setDateRange] = useState<{ from: string; to: string }>(
        () => {
            const today = new Date();
            const from = format(
                startOfWeek(today, { weekStartsOn: 1 }),
                'yyyy-MM-dd',
            );
            const to = format(
                endOfWeek(today, { weekStartsOn: 1 }),
                'yyyy-MM-dd',
            );

            return { from, to };
        },
    );
    const [searchQuery, setSearchQuery] = useState('');

    // Filter specimens client-side
    const filteredSpecimens = useMemo(() => {
        const searchLower = searchQuery.trim().toLowerCase();

        return specimens.filter((specimen) => {
            const matchesStatus = selectedStatuses.includes(specimen.status);

            const specDateStr = format(
                new Date(specimen.created_at),
                'yyyy-MM-dd',
            );
            const matchesDate =
                (!dateRange.from || specDateStr >= dateRange.from) &&
                (!dateRange.to || specDateStr <= dateRange.to);

            const matchesSearch =
                !searchLower ||
                (specimen.sequence_code &&
                    specimen.sequence_code
                        .toLowerCase()
                        .includes(searchLower)) ||
                specimen.id.toString().includes(searchLower) ||
                (specimen.customer_relation?.name &&
                    specimen.customer_relation.name
                        .toLowerCase()
                        .includes(searchLower)) ||
                (specimen.customer_relation?.id_number &&
                    specimen.customer_relation.id_number
                        .toLowerCase()
                        .includes(searchLower));

            return matchesStatus && matchesDate && matchesSearch;
        });
    }, [specimens, selectedStatuses, dateRange, searchQuery]);

    // Group and sort filtered specimens by priority and due date desc
    const groupedSpecimens = useMemo(() => {
        const groups: Record<number, Specimen[]> = {};

        // Initialize groups
        priorities.forEach((p) => {
            groups[p.id] = [];
        });

        // Distribute filtered specimens
        filteredSpecimens.forEach((specimen) => {
            if (groups[specimen.priority_id]) {
                groups[specimen.priority_id].push(specimen);
            }
        });

        // Sort specimens within each priority by due date descending
        Object.keys(groups).forEach((key) => {
            const numericKey = parseInt(key);
            groups[numericKey].sort((a, b) => {
                const dateA = getDueDate(a).getTime();
                const dateB = getDueDate(b).getTime();

                return dateB - dateA; // Descending
            });
        });

        return groups;
    }, [filteredSpecimens, priorities]);

    const handleViewSpecimen = (specimen: Specimen) => {
        setSelectedSpecimen(specimen);
        setIsViewSheetOpen(true);
    };

    return (
        <>
            <Head title="Mis Asignaciones" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <ClipboardList className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Mis Asignaciones
                            </h1>
                        </div>
                    </div>

                    <div className="flex w-full flex-col items-center justify-end gap-2 md:w-auto md:flex-row">
                        {/* Buscador */}
                        <div className="relative w-full shrink-0 md:w-72">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Buscar por código, cliente o RTN..."
                                className="h-10 w-full bg-card pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

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
                                                if (
                                                    selectedStatuses.length ===
                                                    ALL_STATUSES.length
                                                ) {
                                                    setSelectedStatuses([]);
                                                } else {
                                                    setSelectedStatuses(
                                                        ALL_STATUSES.map(
                                                            (s) => s.value,
                                                        ),
                                                    );
                                                }
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
                                                        setSelectedStatuses(
                                                            (prev) =>
                                                                prev.includes(
                                                                    status.value,
                                                                )
                                                                    ? prev.filter(
                                                                          (s) =>
                                                                              s !==
                                                                              status.value,
                                                                      )
                                                                    : [
                                                                          ...prev,
                                                                          status.value,
                                                                      ],
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
                            value={dateRange}
                            onChange={setDateRange}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    {priorities.map((priority) => {
                        const list = groupedSpecimens[priority.id] || [];
                        const priorityColor = priority.color || '#cbd5e1';
                        const tableBg = `${priorityColor}05`; // subtle ~2% opacity
                        const tableBorder = `${priorityColor}15`; // subtle border

                        return (
                            <div
                                key={priority.id}
                                className="flex flex-col gap-3"
                            >
                                {/* Priority Section Header */}
                                <div className="flex items-center gap-2 px-1">
                                    <div
                                        className="h-3 w-3 rounded-full shadow-sm"
                                        style={{
                                            backgroundColor: priorityColor,
                                        }}
                                    />
                                    <h2 className="text-md font-bold tracking-tight">
                                        {priority.name}
                                    </h2>
                                    <Badge
                                        variant="secondary"
                                        className="ml-2 rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold"
                                    >
                                        {list.length}{' '}
                                        {list.length === 1
                                            ? 'muestra'
                                            : 'muestras'}
                                    </Badge>
                                </div>

                                {/* Table Wrapper with standard styling */}
                                <div className="overflow-hidden rounded-md border bg-card">
                                    <div className="w-full overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[100px] font-semibold">
                                                        Código
                                                    </TableHead>
                                                    <TableHead className="w-[95px] min-w-[75px] text-center font-semibold">
                                                        Entrega
                                                    </TableHead>
                                                    <TableHead className="min-w-[180px] font-semibold">
                                                        Paciente
                                                    </TableHead>
                                                    <TableHead className="min-w-[140px] font-semibold">
                                                        Tipo de Muestra
                                                    </TableHead>
                                                    <TableHead className="min-w-[160px] font-semibold">
                                                        Análisis
                                                    </TableHead>
                                                    <TableHead className="min-w-[120px] font-semibold">
                                                        Estado
                                                    </TableHead>
                                                    <TableHead className="min-w-[140px] font-semibold">
                                                        Fecha Registro
                                                    </TableHead>
                                                    <TableHead className="w-[100px] text-right font-semibold">
                                                        Acciones
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {list.length > 0 ? (
                                                    list.map((specimen) => {
                                                        const dueDate =
                                                            getDueDate(
                                                                specimen,
                                                            );
                                                        const statusName =
                                                            STATUS_LABELS[
                                                                specimen.status
                                                            ] ||
                                                            specimen.status;

                                                        return (
                                                            <TableRow
                                                                key={
                                                                    specimen.id
                                                                }
                                                                className="group cursor-pointer border-border/40 transition-colors hover:bg-muted/30"
                                                                onClick={() =>
                                                                    router.get(
                                                                        `/specimens/${specimen.sequence_code || specimen.id}/report-editor`,
                                                                    )
                                                                }
                                                            >
                                                                <TableCell className="font-mono text-xs font-semibold text-primary">
                                                                    <div className="flex min-h-[24px] items-center gap-1.5">
                                                                        <span>
                                                                            {specimen.sequence_code ||
                                                                                `#${specimen.id}`}
                                                                        </span>
                                                                        <CopyButton
                                                                            text={
                                                                                specimen.sequence_code ||
                                                                                `#${specimen.id}`
                                                                            }
                                                                        />
                                                                    </div>
                                                                </TableCell>
                                                                {/* Visual Day Calendar Tear-off Widget */}
                                                                <TableCell className="py-2.5">
                                                                    {(() => {
                                                                        const isLight =
                                                                            [
                                                                                'yellow',
                                                                                '#ffff00',
                                                                                '#facc15',
                                                                                '#eab308',
                                                                                '#ffeb3b',
                                                                            ].includes(
                                                                                priorityColor
                                                                                    .toLowerCase()
                                                                                    .trim(),
                                                                            );

                                                                        return (
                                                                            <div className="mx-auto flex max-w-[62px] min-w-[62px] flex-col items-center justify-center overflow-hidden rounded-md border border-muted-foreground/20 bg-background text-center shadow-xs">
                                                                                <div
                                                                                    className={`w-full py-0.5 text-[8.5px] leading-none font-bold tracking-wider uppercase ${isLight ? 'text-neutral-900' : 'text-white'}`}
                                                                                    style={{
                                                                                        backgroundColor:
                                                                                            priorityColor,
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
                                                                    })()}
                                                                </TableCell>
                                                                <TableCell className="font-medium text-foreground">
                                                                    {specimen
                                                                        .customer_relation
                                                                        ?.name ||
                                                                        'N/A'}
                                                                </TableCell>
                                                                <TableCell className="text-sm text-muted-foreground">
                                                                    {specimen
                                                                        .type
                                                                        ?.name ||
                                                                        'N/A'}
                                                                </TableCell>
                                                                <TableCell className="text-sm text-muted-foreground">
                                                                    {specimen
                                                                        .examination
                                                                        ?.name ||
                                                                        'N/A'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {(() => {
                                                                        const color =
                                                                            specimen.status_color ||
                                                                            '#cbd5e1';

                                                                        return (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="font-regular rounded-full px-2.5 py-0.5 text-xs"
                                                                                style={{
                                                                                    backgroundColor: `${color}15`,
                                                                                    color: color,
                                                                                    borderColor: `${color}30`,
                                                                                }}
                                                                            >
                                                                                {
                                                                                    statusName
                                                                                }
                                                                            </Badge>
                                                                        );
                                                                    })()}
                                                                </TableCell>
                                                                <TableCell className="text-xs text-muted-foreground">
                                                                    {specimen.created_at
                                                                        ? format(
                                                                              new Date(
                                                                                  specimen.created_at,
                                                                              ),
                                                                              'dd/MM/yyyy h:mm a',
                                                                          )
                                                                        : 'N/A'}
                                                                </TableCell>
                                                                <TableCell className="flex items-center justify-end gap-1 text-right">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            handleViewSpecimen(
                                                                                specimen,
                                                                            );
                                                                        }}
                                                                        title="Ver detalles"
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-primary/80 hover:bg-accent hover:text-accent-foreground hover:text-primary"
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            router.get(
                                                                                `/specimens/${specimen.sequence_code || specimen.id}/report-editor`,
                                                                            );
                                                                        }}
                                                                        title="Editor de reporte"
                                                                    >
                                                                        <FileText className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                                ) : (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={8}
                                                            className="h-20 text-center text-sm text-muted-foreground/60"
                                                        >
                                                            No hay muestras
                                                            asignadas que
                                                            coincidan con los
                                                            filtros.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

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
