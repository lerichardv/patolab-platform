import { Head, router, usePage } from '@inertiajs/react';
import {
    format,
    add,
    startOfWeek,
    endOfWeek,
    formatDistanceToNow,
    isPast,
} from 'date-fns';
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
    RefreshCw,
    EllipsisVertical,
    Plus,
    Layers,
    UserPlus,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { Scissors } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
    DateRangePicker,
    getCookie,
    setCookie,
    getLast2WeeksRange,
} from '@/components/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn, addWithoutWeekends } from '@/lib/utils';
import WorkOrderSheet from '../my-work-orders/work-order-sheet';
import ManageCuttingsSheet from '../specimens/report-editor/cuttings/manage-cuttings-sheet';
import SpecimenBulkCollaboratorSheet from '../specimens/specimen-bulk-collaborator-sheet';
import SpecimenCollaboratorSheet from '../specimens/specimen-collaborator-sheet';
import SpecimenViewSheet from '../specimens/specimen-view-sheet';
import SpecimenWorkOrdersSheet from './specimen-work-orders-sheet';

interface Specimen {
    id: number;
    priority_id: number;
    specimen_type?: number;
    specimen_type_examination?: number;
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
        intern_unit: string;
        intern_quantity: number;
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
    group?: any;
    users?: any[];
    work_orders?: any[];
    collaborators?: any[];
    cuttings?: any[];
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
    specimenTypes: any[];
    examinations: any[];
    workOrderTypes: any[];
    workOrderTasks: any[];
    usersList: any[];
    cuttingCodes: any[];
    cuttingPrefixes: any[];
    cuttingSlideTypes: any[];
    filters: {
        status?: string[];
        specimen_type_id?: string;
        examination_id?: string;
        date_from?: string;
        date_to?: string;
    };
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

const getDueDate = (specimen: Specimen): Date => {
    const createdAt = new Date(specimen.created_at);

    const unit = specimen.category?.intern_unit || specimen.category?.unit;
    const quantity =
        specimen.category?.intern_quantity || specimen.category?.quantity;

    if (!unit || !quantity) {
        return createdAt;
    }

    return addWithoutWeekends(createdAt, quantity, unit);
};

const getDueDateInfo = (specimen: Specimen) => {
    if (!specimen.category) {
        return null;
    }

    const unit = specimen.category.intern_unit || specimen.category.unit;
    const quantity =
        specimen.category.intern_quantity || specimen.category.quantity;

    if (!unit || !quantity) {
        return null;
    }

    const dueDate = getDueDate(specimen);
    const isCompleted = ['finalized', 'delivered', 'cancelled'].includes(
        specimen.status,
    );

    const dueDateFormatted = formatDistanceToNow(dueDate, {
        addSuffix: true,
        locale: es,
    });
    const fullDueDate = format(dueDate, 'dd/MM/yyyy h:mm a');

    const isExpired = isPast(dueDate);
    const isWithinOneDay =
        !isExpired && dueDate.getTime() - Date.now() <= 24 * 60 * 60 * 1000;

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

const getCuttingsSummary = (cuttings?: any[]) => {
    if (!cuttings || cuttings.length === 0) {
        return null;
    }

    const totalCassettes = cuttings.length;
    const totalSlides = cuttings.reduce(
        (sum, c) => sum + (c.number_of_slides ?? 0),
        0,
    );

    const codes = cuttings
        .map((c) => c.code?.code)
        .filter((code): code is string => !!code)
        .sort((a, b) =>
            a.localeCompare(b, undefined, {
                numeric: true,
                sensitivity: 'base',
            }),
        );

    let range = 'N/A';

    if (codes.length > 0) {
        const start = codes[0];
        const end = codes[codes.length - 1];
        range = start === end ? start : `${start}-${end}`;
    }

    return {
        range,
        totalCassettes,
        totalSlides,
    };
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

export default function MyAssignmentsIndex({
    specimens,
    priorities,
    specimenTypes,
    examinations,
    workOrderTypes,
    workOrderTasks,
    usersList,
    cuttingCodes,
    cuttingPrefixes,
    cuttingSlideTypes,
    filters,
}: Props) {
    const { props } = usePage() as any;
    const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(
        null,
    );
    const [
        selectedSpecimenForWorkOrdersList,
        setSelectedSpecimenForWorkOrdersList,
    ] = useState<Specimen | null>(null);
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [selectedSpecimenForWorkOrder, setSelectedSpecimenForWorkOrder] =
        useState<number | null>(null);
    const [isWorkOrderSheetOpen, setIsWorkOrderSheetOpen] = useState(false);
    const [
        selectedSpecimenForCollaborator,
        setSelectedSpecimenForCollaborator,
    ] = useState<Specimen | null>(null);
    const [isCollaboratorSheetOpen, setIsCollaboratorSheetOpen] =
        useState(false);
    const [isBulkCollaboratorSheetOpen, setIsBulkCollaboratorSheetOpen] =
        useState(false);

    const [specimenForCuttings, setSpecimenForCuttings] = useState<any | null>(
        null,
    );
    const [isManageCuttingsOpen, setIsManageCuttingsOpen] = useState(false);

    const hasReportEditorPermission =
        props.auth?.user?.role?.slug === 'admin' ||
        props.auth?.permissions?.includes('report_editor.view');
    const hasCuttingsPermission =
        props.auth?.user?.role?.slug === 'admin' ||
        props.auth?.permissions?.includes('cuttings.manage');

    useEffect(() => {
        if (selectedSpecimenForWorkOrdersList) {
            const updated = specimens.find(
                (s) => s.id === selectedSpecimenForWorkOrdersList.id,
            );

            if (updated) {
                setSelectedSpecimenForWorkOrdersList(updated);
            }
        }

        if (specimenForCuttings) {
            const updated = specimens.find(
                (s) => s.id === specimenForCuttings.id,
            );

            if (updated) {
                setSpecimenForCuttings(updated);
            }
        }
    }, [specimens]);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const selectedSpecimens = useMemo(() => {
        return specimens.filter((s) => selectedIds.includes(s.id));
    }, [specimens, selectedIds]);

    const toggleSelectSpecimen = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const handleReload = () => {
        setIsReloading(true);
        router.reload({
            onSuccess: () => {
                toast.success('Asignaciones actualizadas desde el servidor');
            },
            onFinish: () => {
                setIsReloading(false);
            },
        });
    };

    // Filters State: Initialize from props
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
        () =>
            filters.status || [
                'received',
                'macroscopic_review',
                'processing',
                'microscopic_review',
            ],
    );

    const [dateRange, setDateRange] = useState<{ from: string; to: string }>(
        () => ({
            from: filters.date_from || '',
            to: filters.date_to || '',
        }),
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [showCuttingsOnly, setShowCuttingsOnly] = useState(false);
    const [cuttingsDateRange, setCuttingsDateRange] = useState<{
        from: string;
        to: string;
    }>({
        from: '',
        to: '',
    });
    const [showExpiredOnly, setShowExpiredOnly] = useState(false);
    const [dueDateSortOrder, setDueDateSortOrder] = useState<'asc' | 'desc'>(
        'desc',
    );
    const parseInitialIds = (rawFilter: any, allItems: any[]): string[] => {
        if (
            rawFilter === 'none' ||
            (Array.isArray(rawFilter) && rawFilter.length === 0)
        ) {
            return [];
        }
        if (
            rawFilter === undefined ||
            rawFilter === null ||
            rawFilter === 'all'
        ) {
            return allItems.map((item) => item.id.toString());
        }
        if (Array.isArray(rawFilter)) {
            return rawFilter.map((id) => id.toString());
        }
        return [rawFilter.toString()];
    };

    const [selectedSpecimenTypeIds, setSelectedSpecimenTypeIds] = useState<
        string[]
    >(() => parseInitialIds(filters.specimen_type_id, specimenTypes));

    const [selectedExaminationIds, setSelectedExaminationIds] = useState<
        string[]
    >(() => parseInitialIds(filters.examination_id, examinations));

    const getSpecimenTypeId = (exam: any): string | null => {
        const typeId =
            exam.specimen_type || exam.specimen_type_id || exam.type?.id;
        return typeId ? typeId.toString() : null;
    };

    const filteredExaminationsForDropdown = useMemo(() => {
        if (selectedSpecimenTypeIds.length === specimenTypes.length) {
            return examinations;
        }

        return examinations.filter((exam) => {
            const typeId = getSpecimenTypeId(exam);
            return typeId && selectedSpecimenTypeIds.includes(typeId);
        });
    }, [examinations, selectedSpecimenTypeIds, specimenTypes.length]);

    const handleSpecimenTypeSelectionChange = (nextTypeIds: string[]) => {
        setSelectedSpecimenTypeIds(nextTypeIds);

        let nextExamIds: string[];

        if (nextTypeIds.length === specimenTypes.length) {
            nextExamIds = examinations.map((e) => e.id.toString());
        } else if (nextTypeIds.length === 0) {
            nextExamIds = [];
        } else {
            const addedTypeIds = nextTypeIds.filter(
                (id) => !selectedSpecimenTypeIds.includes(id),
            );

            const validExamsForNextTypes = examinations.filter((exam) => {
                const typeId = getSpecimenTypeId(exam);
                return typeId && nextTypeIds.includes(typeId);
            });
            const validExamIdsForNextTypes = validExamsForNextTypes.map((e) =>
                e.id.toString(),
            );

            let updatedExamIds = selectedExaminationIds.filter((id) =>
                validExamIdsForNextTypes.includes(id),
            );

            if (addedTypeIds.length > 0) {
                const addedExamIds = examinations
                    .filter((exam) => {
                        const typeId = getSpecimenTypeId(exam);
                        return typeId && addedTypeIds.includes(typeId);
                    })
                    .map((e) => e.id.toString());

                updatedExamIds = Array.from(
                    new Set([...updatedExamIds, ...addedExamIds]),
                );
            }

            nextExamIds = updatedExamIds;
        }

        setSelectedExaminationIds(nextExamIds);

        const typeParam =
            nextTypeIds.length === specimenTypes.length
                ? 'all'
                : nextTypeIds.length === 0
                  ? 'none'
                  : nextTypeIds;

        const examParam =
            nextExamIds.length === examinations.length
                ? 'all'
                : nextExamIds.length === 0
                  ? 'none'
                  : nextExamIds;

        router.get(
            '/my-assignments',
            {
                ...filters,
                specimen_type_id: typeParam,
                examination_id: examParam,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const handleExaminationSelectionChange = (nextExamIds: string[]) => {
        setSelectedExaminationIds(nextExamIds);

        const typeParam =
            selectedSpecimenTypeIds.length === specimenTypes.length
                ? 'all'
                : selectedSpecimenTypeIds.length === 0
                  ? 'none'
                  : selectedSpecimenTypeIds;

        const examParam =
            nextExamIds.length === examinations.length
                ? 'all'
                : nextExamIds.length === 0
                  ? 'none'
                  : nextExamIds;

        router.get(
            '/my-assignments',
            {
                ...filters,
                specimen_type_id: typeParam,
                examination_id: examParam,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

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

            const invoice = specimen.group?.invoice
                ? specimen.group.invoice
                : specimen.invoice_relation;

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
                        .includes(searchLower)) ||
                (invoice?.full_invoice_number &&
                    invoice.full_invoice_number
                        .toLowerCase()
                        .includes(searchLower)) ||
                (invoice?.invoice_number &&
                    invoice.invoice_number.toLowerCase().includes(searchLower));

            const specimenTypeId = specimen.specimen_type || specimen.type?.id;
            const matchesSpecimenType =
                selectedSpecimenTypeIds.length === specimenTypes.length ||
                (specimenTypeId &&
                    selectedSpecimenTypeIds.includes(
                        specimenTypeId.toString(),
                    ));

            const examId =
                specimen.specimen_type_examination || specimen.examination?.id;
            const matchesExamination =
                selectedExaminationIds.length === examinations.length ||
                (examId && selectedExaminationIds.includes(examId.toString()));

            const matchesCuttings =
                !showCuttingsOnly ||
                (!!specimen.cuttings &&
                    specimen.cuttings.length > 0 &&
                    ((!cuttingsDateRange.from && !cuttingsDateRange.to) ||
                        specimen.cuttings.some((cutting) => {
                            if (!cutting.created_at) {
                                return false;
                            }

                            const cuttingDateStr = format(
                                new Date(cutting.created_at),
                                'yyyy-MM-dd',
                            );

                            return (
                                (!cuttingsDateRange.from ||
                                    cuttingDateStr >= cuttingsDateRange.from) &&
                                (!cuttingsDateRange.to ||
                                    cuttingDateStr <= cuttingsDateRange.to)
                            );
                        })));

            const dueInfo = getDueDateInfo(specimen);
            const isExpired = !!(
                dueInfo &&
                dueInfo.isExpired &&
                !['finalized', 'delivered', 'cancelled'].includes(
                    specimen.status,
                )
            );
            const matchesExpired = !showExpiredOnly || isExpired;

            return (
                matchesStatus &&
                matchesDate &&
                matchesSearch &&
                matchesSpecimenType &&
                matchesExamination &&
                matchesCuttings &&
                matchesExpired
            );
        });
    }, [
        specimens,
        selectedStatuses,
        dateRange,
        searchQuery,
        selectedSpecimenTypeIds,
        selectedExaminationIds,
        specimenTypes.length,
        examinations.length,
        showCuttingsOnly,
        cuttingsDateRange,
        showExpiredOnly,
    ]);

    const visibleSpecimenIds = useMemo(() => {
        return filteredSpecimens.map((s) => s.id);
    }, [filteredSpecimens]);

    const isAllVisibleSelected = useMemo(() => {
        if (visibleSpecimenIds.length === 0) {
            return false;
        }

        return visibleSpecimenIds.every((id) => selectedIds.includes(id));
    }, [visibleSpecimenIds, selectedIds]);

    const handleSelectAllVisible = () => {
        if (isAllVisibleSelected) {
            setSelectedIds((prev) =>
                prev.filter((id) => !visibleSpecimenIds.includes(id)),
            );
        } else {
            setSelectedIds((prev) =>
                Array.from(new Set([...prev, ...visibleSpecimenIds])),
            );
        }
    };

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

        // Sort specimens within each priority by due date
        Object.keys(groups).forEach((key) => {
            const numericKey = parseInt(key);
            groups[numericKey].sort((a, b) => {
                const dateA = getDueDate(a).getTime();
                const dateB = getDueDate(b).getTime();

                return dueDateSortOrder === 'asc'
                    ? dateA - dateB
                    : dateB - dateA;
            });
        });

        return groups;
    }, [filteredSpecimens, priorities, dueDateSortOrder]);

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

        if (filters.specimen_type_id !== undefined) {
            setSelectedSpecimenTypeIds(
                parseInitialIds(filters.specimen_type_id, specimenTypes),
            );
        }

        if (filters.examination_id !== undefined) {
            setSelectedExaminationIds(
                parseInitialIds(filters.examination_id, examinations),
            );
        }
    }, [filters, specimenTypes, examinations]);

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
                                                        `status_filter_my_assignments_user_${userId}`,
                                                        JSON.stringify(
                                                            nextStatuses,
                                                        ),
                                                    );
                                                }

                                                router.get(
                                                    '/my-assignments',
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
                                                                `status_filter_my_assignments_user_${userId}`,
                                                                JSON.stringify(
                                                                    nextStatuses,
                                                                ),
                                                            );
                                                        }

                                                        router.get(
                                                            '/my-assignments',
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
                            cookieKey="date_filter_my_assignments"
                            value={dateRange}
                            onChange={(range) => {
                                setDateRange(range);
                                router.get(
                                    '/my-assignments',
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
                                        `status_filter_my_assignments_user_${userId}`,
                                        JSON.stringify([
                                            'received',
                                            'macroscopic_review',
                                            'processing',
                                            'microscopic_review',
                                        ]),
                                    );
                                    setCookie(
                                        `date_filter_my_assignments_user_${userId}`,
                                        JSON.stringify({
                                            range: '14_days',
                                            from: defaultRange.from,
                                            to: defaultRange.to,
                                        }),
                                    );
                                }

                                router.get(
                                    '/my-assignments',
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
                            title="Recargar asignaciones"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${isReloading ? 'animate-spin' : ''}`}
                            />
                        </Button>
                    </div>
                </div>

                {/* Second Row: Buscador + Specimen Type Filter + Examination Filter */}
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                    {/* Buscador */}
                    <div className="relative w-full shrink-0 sm:w-72">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Buscar por código, cliente o RTN..."
                            className="h-10 w-full bg-card pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filtro de Tipo de Muestra (Popover Múltiple) */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-10 gap-2 border bg-card transition-colors hover:bg-accent/50"
                            >
                                <Microscope className="h-4 w-4 text-muted-foreground" />
                                <span>
                                    Tipos ({selectedSpecimenTypeIds.length})
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between border-b px-2 py-1 pb-1.5 text-xs text-muted-foreground">
                                    <span>Filtrar por tipo</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const areAllTypesSelected =
                                                specimenTypes.length > 0 &&
                                                specimenTypes.every((t) =>
                                                    selectedSpecimenTypeIds.includes(
                                                        t.id.toString(),
                                                    ),
                                                );
                                            const nextTypes =
                                                areAllTypesSelected
                                                    ? []
                                                    : specimenTypes.map((t) =>
                                                          t.id.toString(),
                                                      );

                                            handleSpecimenTypeSelectionChange(
                                                nextTypes,
                                            );
                                        }}
                                        className="cursor-pointer font-medium transition-colors hover:text-primary"
                                    >
                                        {specimenTypes.length > 0 &&
                                        specimenTypes.every((t) =>
                                            selectedSpecimenTypeIds.includes(
                                                t.id.toString(),
                                            ),
                                        )
                                            ? 'Ninguno'
                                            : 'Todos'}
                                    </button>
                                </div>
                                <div className="max-h-60 space-y-1 overflow-y-auto pt-1">
                                    {specimenTypes.map((type) => {
                                        const isChecked =
                                            selectedSpecimenTypeIds.includes(
                                                type.id.toString(),
                                            );

                                        return (
                                            <div
                                                key={type.id}
                                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none hover:bg-accent hover:text-accent-foreground"
                                                onClick={() => {
                                                    const typeIdStr =
                                                        type.id.toString();
                                                    const nextTypes = isChecked
                                                        ? selectedSpecimenTypeIds.filter(
                                                              (id) =>
                                                                  id !==
                                                                  typeIdStr,
                                                          )
                                                        : [
                                                              ...selectedSpecimenTypeIds,
                                                              typeIdStr,
                                                          ];

                                                    handleSpecimenTypeSelectionChange(
                                                        nextTypes,
                                                    );
                                                }}
                                            >
                                                <Checkbox
                                                    checked={isChecked}
                                                    className="pointer-events-none"
                                                    onCheckedChange={() => {}}
                                                />
                                                <span className="truncate">
                                                    {type.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Filtro de Análisis/Examen (Popover Múltiple) */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-10 gap-2 border bg-card transition-colors hover:bg-accent/50"
                            >
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span>
                                    Análisis ({selectedExaminationIds.length})
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between border-b px-2 py-1 pb-1.5 text-xs text-muted-foreground">
                                    <span>Filtrar por análisis</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const areAllExamsSelected =
                                                filteredExaminationsForDropdown.length >
                                                    0 &&
                                                filteredExaminationsForDropdown.every(
                                                    (e) =>
                                                        selectedExaminationIds.includes(
                                                            e.id.toString(),
                                                        ),
                                                );
                                            const nextExams =
                                                areAllExamsSelected
                                                    ? []
                                                    : filteredExaminationsForDropdown.map(
                                                          (e) =>
                                                              e.id.toString(),
                                                      );

                                            handleExaminationSelectionChange(
                                                nextExams,
                                            );
                                        }}
                                        className="cursor-pointer font-medium transition-colors hover:text-primary"
                                    >
                                        {filteredExaminationsForDropdown.length >
                                            0 &&
                                        filteredExaminationsForDropdown.every(
                                            (e) =>
                                                selectedExaminationIds.includes(
                                                    e.id.toString(),
                                                ),
                                        )
                                            ? 'Ninguno'
                                            : 'Todos'}
                                    </button>
                                </div>
                                <div className="max-h-60 space-y-1 overflow-y-auto pt-1">
                                    {filteredExaminationsForDropdown.map(
                                        (exam) => {
                                            const isChecked =
                                                selectedExaminationIds.includes(
                                                    exam.id.toString(),
                                                );

                                            return (
                                                <div
                                                    key={exam.id}
                                                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none hover:bg-accent hover:text-accent-foreground"
                                                    onClick={() => {
                                                        const examIdStr =
                                                            exam.id.toString();
                                                        const nextExams =
                                                            isChecked
                                                                ? selectedExaminationIds.filter(
                                                                      (id) =>
                                                                          id !==
                                                                          examIdStr,
                                                                  )
                                                                : [
                                                                      ...selectedExaminationIds,
                                                                      examIdStr,
                                                                  ];

                                                        handleExaminationSelectionChange(
                                                            nextExams,
                                                        );
                                                    }}
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        className="pointer-events-none"
                                                        onCheckedChange={() => {}}
                                                    />
                                                    <span className="truncate">
                                                        {exam.name}
                                                    </span>
                                                </div>
                                            );
                                        },
                                    )}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Switch Mostrar solo con cortes */}
                    <div
                        className="flex h-10 cursor-pointer items-center gap-2 rounded-md border bg-card px-3 shadow-xs transition-colors select-none hover:bg-accent/45"
                        onClick={() => {
                            setShowCuttingsOnly((prev) => !prev);
                        }}
                    >
                        <span className="min-w-[100px] text-sm font-medium">
                            Solo con cortes
                        </span>
                        <Switch
                            checked={showCuttingsOnly}
                            onCheckedChange={(checked) => {
                                setShowCuttingsOnly(checked);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* DateRangePicker para especímenes con cortes */}
                    {showCuttingsOnly && (
                        <DateRangePicker
                            placeholder="Fecha de cortes"
                            value={cuttingsDateRange}
                            onChange={(range) => {
                                setCuttingsDateRange(range);
                            }}
                        />
                    )}
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                    {/* Switch Mostrar solo vencidos */}
                    <div
                        className="flex h-10 w-fit shrink-0 cursor-pointer items-center gap-2 rounded-md border bg-card px-3 shadow-xs transition-colors select-none hover:bg-accent/45"
                        onClick={() => {
                            setShowExpiredOnly((prev) => !prev);
                        }}
                    >
                        <span className="text-sm font-medium">
                            Solo vencidos
                        </span>
                        <Switch
                            checked={showExpiredOnly}
                            onCheckedChange={(checked) => {
                                setShowExpiredOnly(checked);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* Botón Ordenar por Vencimiento */}
                    <div
                        className="flex h-10 w-fit shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border bg-card px-3 shadow-xs transition-colors select-none hover:bg-accent/45"
                        onClick={() => {
                            setDueDateSortOrder((prev) =>
                                prev === 'asc' ? 'desc' : 'asc',
                            );
                        }}
                    >
                        <span className="text-sm font-medium">
                            Orden vencimiento
                        </span>
                        {dueDateSortOrder === 'asc' ? (
                            <ArrowUp className="h-4 w-4 animate-in text-muted-foreground fade-in" />
                        ) : (
                            <ArrowDown className="h-4 w-4 animate-in text-muted-foreground fade-in" />
                        )}
                    </div>

                    <div
                        className="flex h-10 w-fit shrink-0 cursor-pointer items-center gap-2 rounded-md border bg-card px-3 shadow-xs transition-colors select-none hover:bg-accent/45"
                        onClick={() => {
                            setIsSelectionMode((prev) => {
                                const next = !prev;

                                if (!next) {
                                    setSelectedIds([]);
                                }

                                return next;
                            });
                        }}
                    >
                        <span className="text-sm font-medium">Seleccionar</span>
                        <Switch
                            checked={isSelectionMode}
                            onCheckedChange={(checked) => {
                                setIsSelectionMode(checked);

                                if (!checked) {
                                    setSelectedIds([]);
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    {isSelectionMode && (
                        <div className="flex w-full flex-1 animate-in flex-col justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2 px-3 duration-200 select-none fade-in slide-in-from-top-2 sm:flex-row sm:items-center sm:p-0 sm:py-2 sm:pr-2 sm:pl-3 dark:border-border/60 dark:bg-muted/10">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:flex-nowrap sm:text-sm">
                                <span>
                                    <span className="font-semibold text-primary">
                                        {selectedIds.length}
                                    </span>{' '}
                                    <span>
                                        {selectedIds.length === 1
                                            ? 'muestra seleccionada'
                                            : 'muestras seleccionadas'}
                                    </span>
                                </span>
                                {visibleSpecimenIds.length > 0 && (
                                    <>
                                        <span className="text-muted-foreground/30">
                                            |
                                        </span>
                                        <Button
                                            type="button"
                                            variant="link"
                                            onClick={handleSelectAllVisible}
                                            className="h-auto p-0 text-xs font-semibold text-primary transition-colors hover:text-primary/80 sm:text-sm"
                                        >
                                            <span className="sm:hidden">
                                                {isAllVisibleSelected
                                                    ? 'Deseleccionar'
                                                    : 'Seleccionar todas'}
                                            </span>
                                            <span className="hidden sm:inline">
                                                {isAllVisibleSelected
                                                    ? 'Deseleccionar todas'
                                                    : 'Seleccionar todas'}
                                            </span>
                                        </Button>
                                    </>
                                )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            disabled={selectedIds.length === 0}
                                            className="flex h-8 w-full items-center gap-2 px-3 text-xs sm:w-auto sm:px-4"
                                        >
                                            <Layers className="h-4 w-4" />{' '}
                                            Acciones en Bulk{' '}
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        className="w-56"
                                    >
                                        <DropdownMenuLabel>
                                            Acciones en Lote
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem
                                            onClick={() => {
                                                setSelectedSpecimenForWorkOrder(
                                                    null,
                                                );
                                                setIsWorkOrderSheetOpen(true);
                                            }}
                                            className="cursor-pointer"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            <span>Crear Orden en Lote</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            onClick={() => {
                                                setIsBulkCollaboratorSheetOpen(
                                                    true,
                                                );
                                            }}
                                            className="cursor-pointer"
                                        >
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            <span>Asignar Colaboradores</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    )}
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
                                                    {isSelectionMode && (
                                                        <TableHead className="w-[50px] text-center">
                                                            <Checkbox
                                                                checked={
                                                                    list.length >
                                                                        0 &&
                                                                    list.every(
                                                                        (s) =>
                                                                            selectedIds.includes(
                                                                                s.id,
                                                                            ),
                                                                    )
                                                                }
                                                                onCheckedChange={(
                                                                    checked,
                                                                ) => {
                                                                    const listIds =
                                                                        list.map(
                                                                            (
                                                                                s,
                                                                            ) =>
                                                                                s.id,
                                                                        );

                                                                    if (
                                                                        checked
                                                                    ) {
                                                                        setSelectedIds(
                                                                            (
                                                                                prev,
                                                                            ) => [
                                                                                ...prev,
                                                                                ...listIds.filter(
                                                                                    (
                                                                                        id,
                                                                                    ) =>
                                                                                        !prev.includes(
                                                                                            id,
                                                                                        ),
                                                                                ),
                                                                            ],
                                                                        );
                                                                    } else {
                                                                        setSelectedIds(
                                                                            (
                                                                                prev,
                                                                            ) =>
                                                                                prev.filter(
                                                                                    (
                                                                                        id,
                                                                                    ) =>
                                                                                        !listIds.includes(
                                                                                            id,
                                                                                        ),
                                                                                ),
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                        </TableHead>
                                                    )}
                                                    <TableHead className="w-[170px] min-w-[170px] font-semibold">
                                                        Muestra
                                                    </TableHead>
                                                    <TableHead className="w-[95px] min-w-[75px] text-center font-semibold">
                                                        Entrega
                                                    </TableHead>
                                                    <TableHead className="min-w-[180px] font-semibold">
                                                        Paciente
                                                    </TableHead>
                                                    <TableHead className="min-w-[180px] font-semibold">
                                                        Muestra / Análisis
                                                    </TableHead>
                                                    <TableHead className="min-w-[120px] font-semibold">
                                                        Estado
                                                    </TableHead>
                                                    <TableHead className="min-w-[160px] font-semibold">
                                                        Cortes
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
                                                                className={cn(
                                                                    'group cursor-pointer border-border/40 transition-colors hover:bg-muted/30',
                                                                    selectedIds.includes(
                                                                        specimen.id,
                                                                    ) &&
                                                                        'border-primary/20 bg-primary/[0.04] hover:bg-primary/[0.06]',
                                                                )}
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    if (
                                                                        isSelectionMode
                                                                    ) {
                                                                        e.stopPropagation();
                                                                        toggleSelectSpecimen(
                                                                            specimen.id,
                                                                        );
                                                                    } else if (
                                                                        hasReportEditorPermission
                                                                    ) {
                                                                        router.get(
                                                                            `/specimens/${specimen.sequence_code || specimen.id}/report-editor`,
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                {isSelectionMode && (
                                                                    <TableCell
                                                                        className="w-[50px] py-2.5 text-center"
                                                                        onClick={(
                                                                            e,
                                                                        ) =>
                                                                            e.stopPropagation()
                                                                        }
                                                                    >
                                                                        <Checkbox
                                                                            checked={selectedIds.includes(
                                                                                specimen.id,
                                                                            )}
                                                                            onCheckedChange={() =>
                                                                                toggleSelectSpecimen(
                                                                                    specimen.id,
                                                                                )
                                                                            }
                                                                        />
                                                                    </TableCell>
                                                                )}
                                                                <TableCell className="font-mono text-xs font-semibold text-primary">
                                                                    <div className="flex flex-col gap-1 py-1">
                                                                        {(() => {
                                                                            const isPathologist =
                                                                                specimen.users?.some(
                                                                                    (
                                                                                        u: any,
                                                                                    ) =>
                                                                                        u.id ===
                                                                                        props
                                                                                            .auth
                                                                                            ?.user
                                                                                            ?.id,
                                                                                );
                                                                            const isCollaborator =
                                                                                specimen.collaborators?.some(
                                                                                    (
                                                                                        c: any,
                                                                                    ) =>
                                                                                        c.id ===
                                                                                        props
                                                                                            .auth
                                                                                            ?.user
                                                                                            ?.id,
                                                                                );

                                                                            if (
                                                                                !isPathologist &&
                                                                                !isCollaborator
                                                                            ) {
                                                                                return null;
                                                                            }

                                                                            return (
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {isPathologist && (
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className="border-blue-500/20 bg-blue-500/10 px-1 py-0 text-[8px] font-semibold text-blue-500 uppercase"
                                                                                        >
                                                                                            Patólogo
                                                                                        </Badge>
                                                                                    )}
                                                                                    {isCollaborator && (
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className="border-emerald-500/20 bg-emerald-500/10 px-1 py-0 text-[8px] font-semibold text-emerald-500 uppercase"
                                                                                        >
                                                                                            Colaborador
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                        <div className="flex min-h-[24px] flex-wrap items-center gap-1">
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
                                                                            {specimen.work_orders &&
                                                                                specimen
                                                                                    .work_orders
                                                                                    .length >
                                                                                    0 && (
                                                                                    <Badge
                                                                                        variant="secondary"
                                                                                        className="animate-in cursor-pointer rounded-full border bg-primary/5 px-1.5 py-0.5 text-[10px] font-bold text-primary select-none fade-in hover:bg-primary/10"
                                                                                        onClick={(
                                                                                            e,
                                                                                        ) => {
                                                                                            e.stopPropagation();
                                                                                            setSelectedSpecimenForWorkOrdersList(
                                                                                                specimen,
                                                                                            );
                                                                                        }}
                                                                                        title={`${specimen.work_orders.length} órdenes de trabajo creadas. Haga clic para ver detalles.`}
                                                                                    >
                                                                                        <Layers className="mr-0.5 h-3 w-3 text-primary" />
                                                                                        {
                                                                                            specimen
                                                                                                .work_orders
                                                                                                .length
                                                                                        }
                                                                                    </Badge>
                                                                                )}
                                                                            {specimen.cuttings &&
                                                                                specimen
                                                                                    .cuttings
                                                                                    .length >
                                                                                    0 && (
                                                                                    <Badge
                                                                                        variant="secondary"
                                                                                        className="animate-in cursor-pointer rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 select-none fade-in hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-400"
                                                                                        onClick={(
                                                                                            e,
                                                                                        ) => {
                                                                                            e.stopPropagation();
                                                                                            setSpecimenForCuttings(
                                                                                                specimen,
                                                                                            );
                                                                                            setIsManageCuttingsOpen(
                                                                                                true,
                                                                                            );
                                                                                        }}
                                                                                        title={`${specimen.cuttings.length} cortes registrados. Haga clic para administrar.`}
                                                                                    >
                                                                                        <Scissors className="mr-0.5 h-3.5 w-3.5 shrink-0 fill-violet-600/10 text-violet-600" />

                                                                                        x
                                                                                        {
                                                                                            specimen
                                                                                                .cuttings
                                                                                                .length
                                                                                        }
                                                                                    </Badge>
                                                                                )}
                                                                        </div>
                                                                        <div className="font-sans text-[10px] font-normal text-muted-foreground">
                                                                            {specimen.created_at
                                                                                ? format(
                                                                                      new Date(
                                                                                          specimen.created_at,
                                                                                      ),
                                                                                      'dd/MM/yyyy h:mm a',
                                                                                  )
                                                                                : 'N/A'}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                {/* Visual Day Calendar Tear-off Widget + Inline Status Badge */}
                                                                <TableCell className="py-2.5">
                                                                    <div className="flex items-center gap-2">
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
                                                                                <div className="flex max-w-[62px] min-w-[62px] flex-col items-center justify-center overflow-hidden rounded-md border border-muted-foreground/20 bg-background text-center shadow-xs">
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
                                                                                            'h:mm a',
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                        {(() => {
                                                                            const dueInfo =
                                                                                getDueDateInfo(
                                                                                    specimen,
                                                                                );

                                                                            if (
                                                                                !dueInfo ||
                                                                                [
                                                                                    'finalized',
                                                                                    'delivered',
                                                                                    'cancelled',
                                                                                ].includes(
                                                                                    specimen.status,
                                                                                )
                                                                            ) {
                                                                                return null;
                                                                            }

                                                                            return (
                                                                                <div
                                                                                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${dueInfo.colorClass}`}
                                                                                    title={`Vencimiento Interno: ${dueInfo.fullDueDate}`}
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
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="font-medium text-foreground">
                                                                    {specimen
                                                                        .customer_relation
                                                                        ?.name ||
                                                                        'N/A'}
                                                                </TableCell>
                                                                <TableCell className="text-sm text-muted-foreground">
                                                                    <div className="font-medium text-foreground">
                                                                        {specimen
                                                                            .type
                                                                            ?.name ||
                                                                            'N/A'}
                                                                    </div>
                                                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                                                        {specimen
                                                                            .examination
                                                                            ?.name ||
                                                                            'N/A'}
                                                                    </div>
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
                                                                <TableCell>
                                                                    {(() => {
                                                                        const summary =
                                                                            getCuttingsSummary(
                                                                                specimen.cuttings,
                                                                            );

                                                                        if (
                                                                            !summary
                                                                        ) {
                                                                            return (
                                                                                <span className="text-xs text-muted-foreground italic">
                                                                                    N/A
                                                                                </span>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <div className="flex flex-wrap gap-1">
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                                                                                >
                                                                                    {
                                                                                        summary.range
                                                                                    }
                                                                                </Badge>
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="border-blue-200 bg-blue-50 text-[10px] font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
                                                                                >
                                                                                    {
                                                                                        summary.totalCassettes
                                                                                    }{' '}
                                                                                    {summary.totalCassettes ===
                                                                                    1
                                                                                        ? 'casete'
                                                                                        : 'casetes'}
                                                                                </Badge>
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="border-purple-200 bg-purple-50 text-[10px] font-semibold text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-400"
                                                                                >
                                                                                    {
                                                                                        summary.totalSlides
                                                                                    }{' '}
                                                                                    {summary.totalSlides ===
                                                                                    1
                                                                                        ? 'lámina'
                                                                                        : 'láminas'}
                                                                                </Badge>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </TableCell>

                                                                <TableCell
                                                                    className="flex items-center justify-end gap-1 text-right"
                                                                    onClick={(
                                                                        e,
                                                                    ) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleViewSpecimen(
                                                                                specimen,
                                                                            );
                                                                        }}
                                                                        title="Ver detalles"
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger
                                                                            asChild
                                                                        >
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
                                                                                title="Acciones"
                                                                            >
                                                                                <EllipsisVertical className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent
                                                                            align="end"
                                                                            className="w-52"
                                                                        >
                                                                            {hasReportEditorPermission && (
                                                                                <DropdownMenuItem
                                                                                    onClick={() => {
                                                                                        router.get(
                                                                                            `/specimens/${specimen.sequence_code || specimen.id}/report-editor`,
                                                                                        );
                                                                                    }}
                                                                                    className="group cursor-pointer"
                                                                                >
                                                                                    <FileText className="mr-2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-white group-focus:text-white" />
                                                                                    <span>
                                                                                        Editor
                                                                                        de
                                                                                        Reporte
                                                                                    </span>
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            {hasCuttingsPermission && (
                                                                                <DropdownMenuItem
                                                                                    onClick={() => {
                                                                                        setSpecimenForCuttings(
                                                                                            specimen,
                                                                                        );
                                                                                        setIsManageCuttingsOpen(
                                                                                            true,
                                                                                        );
                                                                                    }}
                                                                                    className="group cursor-pointer"
                                                                                >
                                                                                    <Scissors className="mr-2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-white group-focus:text-white" />
                                                                                    <span>
                                                                                        Gestionar
                                                                                        Cortes
                                                                                    </span>
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            <DropdownMenuItem
                                                                                onClick={() => {
                                                                                    setSelectedSpecimenForWorkOrder(
                                                                                        specimen.id,
                                                                                    );
                                                                                    setIsWorkOrderSheetOpen(
                                                                                        true,
                                                                                    );
                                                                                }}
                                                                                className="group cursor-pointer"
                                                                            >
                                                                                <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-white group-focus:text-white" />
                                                                                <span>
                                                                                    Crear
                                                                                    Orden
                                                                                    de
                                                                                    Trabajo
                                                                                </span>
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={() => {
                                                                                    setSelectedSpecimenForCollaborator(
                                                                                        specimen,
                                                                                    );
                                                                                    setIsCollaboratorSheetOpen(
                                                                                        true,
                                                                                    );
                                                                                }}
                                                                                className="group cursor-pointer"
                                                                            >
                                                                                <UserPlus className="mr-2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-white group-focus:text-white" />
                                                                                <span>
                                                                                    Asignar
                                                                                    Colaboradores
                                                                                </span>
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
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

            <WorkOrderSheet
                specimenId={selectedSpecimenForWorkOrder}
                specimenIds={selectedSpecimenForWorkOrder ? null : selectedIds}
                workOrderTypes={workOrderTypes}
                workOrderTasks={workOrderTasks}
                usersList={usersList}
                open={isWorkOrderSheetOpen}
                onOpenChange={(open) => {
                    setIsWorkOrderSheetOpen(open);

                    if (!open) {
                        setSelectedIds([]);
                        setIsSelectionMode(false);
                    }
                }}
            />

            <SpecimenCollaboratorSheet
                specimen={
                    selectedSpecimenForCollaborator
                        ? specimens.find(
                              (s) =>
                                  s.id === selectedSpecimenForCollaborator.id,
                          ) || selectedSpecimenForCollaborator
                        : null
                }
                open={isCollaboratorSheetOpen}
                onOpenChange={setIsCollaboratorSheetOpen}
                pathologists={usersList}
            />

            <SpecimenBulkCollaboratorSheet
                selectedSpecimens={selectedSpecimens}
                open={isBulkCollaboratorSheetOpen}
                onOpenChange={setIsBulkCollaboratorSheetOpen}
                usersList={usersList}
            />

            <SpecimenWorkOrdersSheet
                specimen={selectedSpecimenForWorkOrdersList}
                open={selectedSpecimenForWorkOrdersList !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedSpecimenForWorkOrdersList(null);
                    }
                }}
                workOrderTypes={workOrderTypes}
                workOrderTasks={workOrderTasks}
                usersList={usersList}
            />

            <ManageCuttingsSheet
                specimen={
                    specimenForCuttings || {
                        id: 0,
                        sequence_code: '',
                        cuttings: [],
                    }
                }
                cuttingCodes={cuttingCodes}
                cuttingPrefixes={cuttingPrefixes}
                cuttingSlideTypes={cuttingSlideTypes}
                users={usersList}
                open={isManageCuttingsOpen}
                onOpenChange={(open) => {
                    setIsManageCuttingsOpen(open);

                    if (!open) {
                        setSpecimenForCuttings(null);
                    }
                }}
            />
        </>
    );
}
