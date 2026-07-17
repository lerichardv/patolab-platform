import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Head, router, usePage } from '@inertiajs/react';
import {
    formatDistanceToNow,
    add,
    isPast,
    isToday,
    format,
    startOfWeek,
    endOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Plus,
    Microscope,
    Edit2,
    Trash2,
    Tag,
    CalendarClock,
    FileText,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    UserPlus,
    ChevronDown,
    Layers,
    Check,
    Filter,
    Search,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import {
    updateOrder as updateSpecimenOrder,
    destroy as destroySpecimen,
} from '@/actions/App/Http/Controllers/SpecimenController';
import {
    DateRangePicker,
    getCookie,
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import InvoiceSheet from '../invoices/invoice-sheet';
import SpecimenBulkPathologistSheet from './specimen-bulk-pathologist-sheet';
import SpecimenGroupSheet from './specimen-group-sheet';
import SpecimenPathologistSheet from './specimen-pathologist-sheet';
import SpecimenSheet from './specimen-sheet';
import SpecimenViewSheet from './specimen-view-sheet';

interface Specimen {
    id: number;
    priority_id: number;
    specimen_type?: number;
    specimen_type_examination?: number;
    customer_relation: any;
    type: any;
    examination: any;
    category: any;
    referrer_relation: any;
    anatomic_site: string;
    diagnosis: string | null;
    clinical_notes: string | null;
    status: string;
    status_color?: string;
    sequence_code?: string;
    created_at: string;
    invoice_relation?: any;
    users?: any[];
    group?: any;
    group_id?: any;
}

interface Priority {
    id: number;
    name: string;
    color: string;
    specimens: Specimen[];
}

interface Props {
    priorities: Priority[];
    specimenTypes: any[];
    examinations: any[];
    categories: any[];
    referrers: any[];
    referrerTypes: any[];
    locations: any[];
    sequences: any[];
    activeLocationId: number | null;
    products: any[];
    pathologists: any[];
    banks: any[];
    filters: {
        status?: string[];
        specimen_type_id?: string;
        examination_id?: string;
        date_from?: string;
        date_to?: string;
    };
}

const getDueDateInfo = (specimen: Specimen) => {
    if (
        !specimen.category ||
        !specimen.category.unit ||
        !specimen.category.quantity
    ) {
        return null;
    }

    const createdAt = new Date(specimen.created_at);
    const unitMap: Record<string, string> = {
        minutes: 'minutes',
        hours: 'hours',
        days: 'days',
        weeks: 'weeks',
    };

    const duration = {
        [unitMap[specimen.category.unit] || 'days']: specimen.category.quantity,
    };
    const dueDate = add(createdAt, duration);

    const isCompleted = ['finalized', 'delivered', 'cancelled'].includes(
        specimen.status,
    );

    let colorClass =
        'bg-secondary text-secondary-foreground border-transparent';

    if (!isCompleted) {
        if (isToday(dueDate)) {
            colorClass =
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50';
        } else if (isPast(dueDate)) {
            colorClass =
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50';
        } else {
            colorClass =
                'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
        }
    }

    const timeDefined = `${specimen.category.quantity} ${
        specimen.category.unit === 'minutes'
            ? 'minutos'
            : specimen.category.unit === 'hours'
              ? 'horas'
              : specimen.category.unit === 'days'
                ? 'días'
                : specimen.category.unit === 'weeks'
                  ? 'semanas'
                  : specimen.category.unit
    }`;

    const dueDateFormatted = formatDistanceToNow(dueDate, {
        addSuffix: true,
        locale: es,
    });
    const fullDueDate = format(dueDate, 'dd/MM/yyyy HH:mm');

    return {
        timeDefined,
        dueDateFormatted,
        fullDueDate,
        colorClass,
    };
};

const ALL_STATUSES = [
    { value: 'received', label: 'Recibida' },
    { value: 'macroscopic_review', label: 'Rev. Macroscópica' },
    { value: 'processing', label: 'En Proceso' },
    { value: 'microscopic_review', label: 'Rev. Microscópica' },
    { value: 'finalized', label: 'Finalizada' },
    { value: 'delivered', label: 'Entregada' },
    { value: 'cancelled', label: 'Cancelada' },
];

const deduplicateSpecimens = (prioritiesList: Priority[]): Priority[] => {
    const seenIds = new Set<number>();

    return prioritiesList.map((priority) => {
        const uniqueSpecimens = (priority.specimens || []).filter(
            (specimen) => {
                if (seenIds.has(specimen.id)) {
                    return false;
                }

                seenIds.add(specimen.id);

                return true;
            },
        );

        return {
            ...priority,
            specimens: uniqueSpecimens,
        };
    });
};

export default function SpecimensIndex({
    priorities: initialPriorities,
    specimenTypes,
    examinations,
    categories,
    referrers,
    referrerTypes,
    locations,
    sequences,
    activeLocationId,
    products,
    pathologists,
    banks,
    filters,
}: Props) {
    const { props } = usePage() as any;
    const auth = props.auth || {};
    const flash = props.flash || {};
    const isMobile = useIsMobile();

    const [priorities, setPriorities] = useState<Priority[]>(() =>
        deduplicateSpecimens(initialPriorities),
    );
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isGroupSheetOpen, setIsGroupSheetOpen] = useState(false);
    const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(
        null,
    );
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [specimenToDelete, setSpecimenToDelete] = useState<Specimen | null>(
        null,
    );

    const [isAssignSheetOpen, setIsAssignSheetOpen] = useState(false);
    const [selectedSpecimenForAssign, setSelectedSpecimenForAssign] =
        useState<Specimen | null>(null);

    const [selectedSpecimenForView, setSelectedSpecimenForView] =
        useState<Specimen | null>(null);
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);

    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
    const [paymentInvoiceUrl, setPaymentInvoiceUrl] = useState<string | null>(
        null,
    );
    const [activePdf, setActivePdf] = useState<'invoice' | 'payment_invoice'>(
        'invoice',
    );
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkAssignSheetOpen, setIsBulkAssignSheetOpen] = useState(false);

    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [isInvoiceSheetOpen, setIsInvoiceSheetOpen] = useState(false);

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

    const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
    const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedSpecimenTypeId, setSelectedSpecimenTypeId] =
        useState<string>(() => filters.specimen_type_id || 'all');
    const [selectedExaminationId, setSelectedExaminationId] = useState<string>(
        () => filters.examination_id || 'all',
    );
    const [isSpecimenTypeFilterOpen, setIsSpecimenTypeFilterOpen] =
        useState(false);
    const [isExaminationFilterOpen, setIsExaminationFilterOpen] =
        useState(false);

    const filteredExaminationsForDropdown = useMemo(() => {
        if (selectedSpecimenTypeId === 'all') {
            return examinations;
        }

        return examinations.filter(
            (exam) => exam.specimen_type?.toString() === selectedSpecimenTypeId,
        );
    }, [examinations, selectedSpecimenTypeId]);

    const handleSpecimenTypeChange = (typeId: string) => {
        setSelectedSpecimenTypeId(typeId);

        let nextExamId = selectedExaminationId;

        if (typeId !== 'all') {
            const hasValidExam = examinations.some(
                (exam) =>
                    exam.id.toString() === selectedExaminationId &&
                    exam.specimen_type?.toString() === typeId,
            );

            if (!hasValidExam) {
                nextExamId = 'all';
                setSelectedExaminationId('all');
            }
        } else {
            nextExamId = 'all';
            setSelectedExaminationId('all');
        }

        const userId = props.auth?.user?.id;

        if (userId) {
            setCookie(`specimen_type_filter_specimens_user_${userId}`, typeId);
            setCookie(
                `examination_filter_specimens_user_${userId}`,
                nextExamId,
            );
        }

        router.get(
            '/specimens',
            {
                ...filters,
                specimen_type_id: typeId,
                examination_id: nextExamId,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const availableGroups = useMemo(() => {
        const groupsMap = new Map<string, { id: string; name: string }>();
        priorities.forEach((priority) => {
            priority.specimens.forEach((specimen) => {
                const matchesStatus = selectedStatuses.includes(
                    specimen.status,
                );
                const specDateStr = format(
                    new Date(specimen.created_at),
                    'yyyy-MM-dd',
                );
                const matchesDate =
                    (!dateRange.from || specDateStr >= dateRange.from) &&
                    (!dateRange.to || specDateStr <= dateRange.to);

                if (matchesStatus && matchesDate && specimen.group) {
                    groupsMap.set(specimen.group.id.toString(), {
                        id: specimen.group.id.toString(),
                        name: specimen.group.name,
                    });
                }
            });
        });

        return Array.from(groupsMap.values());
    }, [priorities, selectedStatuses, dateRange]);

    useEffect(() => {
        if (
            selectedGroupId !== 'all' &&
            !availableGroups.some((g) => g.id === selectedGroupId)
        ) {
            setSelectedGroupId('all');
        }
    }, [availableGroups, selectedGroupId]);

    const filteredPriorities = useMemo(() => {
        const searchLower = searchQuery.trim().toLowerCase();

        return priorities.map((priority) => {
            const filteredSpecimens = priority.specimens.filter((specimen) => {
                const matchesStatus = selectedStatuses.includes(
                    specimen.status,
                );

                const specDateStr = format(
                    new Date(specimen.created_at),
                    'yyyy-MM-dd',
                );
                const matchesDate =
                    (!dateRange.from || specDateStr >= dateRange.from) &&
                    (!dateRange.to || specDateStr <= dateRange.to);

                const matchesGroup =
                    selectedGroupId === 'all' ||
                    specimen.group_id?.toString() === selectedGroupId;

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

                const specimenTypeId =
                    specimen.specimen_type || specimen.type?.id;
                const matchesSpecimenType =
                    selectedSpecimenTypeId === 'all' ||
                    specimenTypeId?.toString() === selectedSpecimenTypeId;

                const examId =
                    specimen.specimen_type_examination ||
                    specimen.examination?.id;
                const matchesExamination =
                    selectedExaminationId === 'all' ||
                    examId?.toString() === selectedExaminationId;

                return (
                    matchesStatus &&
                    matchesDate &&
                    matchesGroup &&
                    matchesSearch &&
                    matchesSpecimenType &&
                    matchesExamination
                );
            });

            return {
                ...priority,
                specimens: filteredSpecimens,
            };
        });
    }, [
        priorities,
        selectedStatuses,
        dateRange,
        selectedGroupId,
        searchQuery,
        selectedSpecimenTypeId,
        selectedExaminationId,
    ]);

    const visibleSpecimenIds = useMemo(() => {
        return filteredPriorities.flatMap((p) => p.specimens.map((s) => s.id));
    }, [filteredPriorities]);

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

    useEffect(() => {
        setPriorities(deduplicateSpecimens(initialPriorities));
    }, [initialPriorities]);

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
            setSelectedSpecimenTypeId(filters.specimen_type_id || 'all');
        }

        if (filters.examination_id !== undefined) {
            setSelectedExaminationId(filters.examination_id || 'all');
        }
    }, [filters]);

    const findSpecimenById = (id: number): Specimen | null => {
        for (const p of priorities) {
            const found = p.specimens.find((s) => s.id === id);

            if (found) {
                return found;
            }
        }

        return null;
    };

    const toggleSelectSpecimen = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const selectedSpecimens = useMemo(() => {
        const list: Specimen[] = [];

        for (const p of priorities) {
            for (const s of p.specimens) {
                if (selectedIds.includes(s.id)) {
                    list.push(s);
                }
            }
        }

        return list;
    }, [priorities, selectedIds]);

    const handleBulkChangeStatus = (status: string) => {
        router.post(
            '/specimens/bulk-action',
            {
                ids: selectedIds,
                action: 'change_status',
                value: status,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Estados de muestras actualizados');
                    setSelectedIds([]);
                    setIsSelectionMode(false);
                },
                onError: () => {
                    toast.error('Error al actualizar los estados');
                },
            },
        );
    };

    const handleBulkChangePriority = (priorityId: number) => {
        router.post(
            '/specimens/bulk-action',
            {
                ids: selectedIds,
                action: 'change_priority',
                value: priorityId,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Prioridades de muestras actualizadas');
                    setSelectedIds([]);
                    setIsSelectionMode(false);
                },
                onError: () => {
                    toast.error('Error al actualizar las prioridades');
                },
            },
        );
    };

    const confirmBulkDelete = () => {
        router.post(
            '/specimens/bulk-action',
            {
                ids: selectedIds,
                action: 'delete',
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Muestras desactivadas con éxito');
                    setSelectedIds([]);
                    setIsSelectionMode(false);
                    setIsBulkDeleteDialogOpen(false);
                },
                onError: () => {
                    toast.error('Error al desactivar las muestras');
                },
            },
        );
    };

    const handleAssignClick = (specimen: Specimen) => {
        setSelectedSpecimenForAssign(specimen);
        setIsAssignSheetOpen(true);
    };

    const activeAssignSpecimen = selectedSpecimenForAssign
        ? findSpecimenById(selectedSpecimenForAssign.id)
        : null;

    useEffect(() => {
        if (flash.new_invoice_url) {
            setInvoiceUrl(flash.new_invoice_url);

            if (flash.new_payment_invoice_url) {
                setPaymentInvoiceUrl(flash.new_payment_invoice_url);
            } else {
                setPaymentInvoiceUrl(null);
            }

            setActivePdf('invoice');
            setShowInvoiceModal(true);
        }
    }, [flash.new_invoice_url, flash.new_payment_invoice_url]);

    useEffect(() => {
        if (flash.new_specimen_id) {
            const specId = parseInt(flash.new_specimen_id);
            const found = findSpecimenById(specId);

            if (found) {
                setIsSheetOpen(false);
                setSelectedSpecimen(null);

                setSelectedSpecimenForView(found);
                setIsViewSheetOpen(true);
            }
        }
    }, [flash.new_specimen_id, priorities]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const specimenParam = urlParams.get('specimen');
        const action = urlParams.get('action');

        if (
            specimenParam &&
            (action === 'view' || action === 'edit') &&
            priorities.length > 0
        ) {
            let found: Specimen | null = null;

            for (const p of priorities) {
                const spec = p.specimens.find((s) => {
                    // Match by sequence_code (case insensitive)
                    if (
                        s.sequence_code?.toLowerCase() ===
                        specimenParam.toLowerCase()
                    ) {
                        return true;
                    }

                    // Fallback to match by numeric id
                    const parsedId = parseInt(specimenParam);

                    if (!isNaN(parsedId) && s.id === parsedId) {
                        return true;
                    }

                    return false;
                });

                if (spec) {
                    found = spec;
                    break;
                }
            }

            if (found) {
                if (action === 'view') {
                    setIsSheetOpen(false);
                    setSelectedSpecimen(null);
                    setSelectedSpecimenForView(found);
                    setIsViewSheetOpen(true);
                } else if (action === 'edit') {
                    setIsViewSheetOpen(false);
                    setSelectedSpecimenForView(null);
                    setSelectedSpecimen(found);
                    setIsSheetOpen(true);
                }

                // Clean the query parameters from URL to avoid re-triggering on fresh re-renders/navs
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [priorities]);

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) {
            return;
        }

        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        const movedSpecimenId = parseInt(draggableId);
        const sourcePriorityId = parseInt(source.droppableId);
        const destPriorityId = parseInt(destination.droppableId);

        const sourcePriorityIndex = priorities.findIndex(
            (p) => p.id === sourcePriorityId,
        );
        const destPriorityIndex = priorities.findIndex(
            (p) => p.id === destPriorityId,
        );

        const sourcePriority = priorities[sourcePriorityIndex];
        const destPriority = priorities[destPriorityIndex];

        const sourceSpecimens = [...sourcePriority.specimens];
        const destSpecimens =
            sourcePriorityId === destPriorityId
                ? sourceSpecimens
                : [...destPriority.specimens];

        // Find the index of the moved specimen in the unfiltered source specimens list
        const unfilteredSourceIndex = sourceSpecimens.findIndex(
            (s) => s.id === movedSpecimenId,
        );

        if (unfilteredSourceIndex === -1) {
            return;
        }

        const [movedSpecimen] = sourceSpecimens.splice(
            unfilteredSourceIndex,
            1,
        );
        movedSpecimen.priority_id = destPriorityId;

        // Calculate the filtered list of specimens in destination priority to find the target position
        const destFilteredSpecimens = destPriority.specimens.filter(
            (specimen) => {
                const matchesStatus = selectedStatuses.includes(
                    specimen.status,
                );
                const specDateStr = format(
                    new Date(specimen.created_at),
                    'yyyy-MM-dd',
                );
                const matchesDate =
                    (!dateRange.from || specDateStr >= dateRange.from) &&
                    (!dateRange.to || specDateStr <= dateRange.to);

                return matchesStatus && matchesDate;
            },
        );

        const destFilteredSpecimensWithoutMoved =
            sourcePriorityId === destPriorityId
                ? destFilteredSpecimens.filter((s) => s.id !== movedSpecimenId)
                : destFilteredSpecimens;

        const targetSpecimen =
            destFilteredSpecimensWithoutMoved[destination.index];
        let unfilteredDestIndex = -1;

        if (targetSpecimen) {
            unfilteredDestIndex = destSpecimens.findIndex(
                (s) => s.id === targetSpecimen.id,
            );
        }

        if (unfilteredDestIndex !== -1) {
            destSpecimens.splice(unfilteredDestIndex, 0, movedSpecimen);
        } else {
            destSpecimens.push(movedSpecimen);
        }

        const newPriorities = [...priorities];
        newPriorities[sourcePriorityIndex] = {
            ...sourcePriority,
            specimens: sourceSpecimens,
        };

        if (sourcePriorityId !== destPriorityId) {
            newPriorities[destPriorityIndex] = {
                ...destPriority,
                specimens: destSpecimens,
            };

            const specimenIdentifier = movedSpecimen.sequence_code
                ? `${movedSpecimen.sequence_code} - ${movedSpecimen.customer_relation?.name || ''}`
                : movedSpecimen.customer_relation?.name ||
                  `Muestra #${movedSpecimen.id}`;

            toast.success('Prioridad de muestra actualizada', {
                description: `La muestra "${specimenIdentifier}" ha sido trasladada a la prioridad "${destPriority.name}".`,
            });
        }

        setPriorities(newPriorities);

        // Prepare the payload for updateOrder
        const itemsToUpdate = destSpecimens.map((specimen, index) => ({
            id: specimen.id,
            priority_id: destPriorityId,
            order: index + 1,
        }));

        router.post(
            updateSpecimenOrder().url,
            { items: itemsToUpdate },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    toast.error('Error al actualizar el orden');
                    setPriorities(deduplicateSpecimens(initialPriorities)); // Revert on error
                },
            },
        );
    };

    const handleCreate = () => {
        setSelectedSpecimen(null);
        setIsSheetOpen(true);
    };

    const handleEdit = (specimen: Specimen) => {
        setSelectedSpecimen(specimen);
        setIsSheetOpen(true);
    };

    const handleView = (specimen: Specimen) => {
        setSelectedSpecimenForView(specimen);
        setIsViewSheetOpen(true);
    };

    const handleEditFromView = () => {
        if (selectedSpecimenForView) {
            setSelectedSpecimen(selectedSpecimenForView);
            setIsViewSheetOpen(false);
            setIsSheetOpen(true);
        }
    };

    const handleDeleteClick = (specimen: Specimen) => {
        setSpecimenToDelete(specimen);
        setIsDeleteDialogOpen(true);
    };

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [mouseY, setMouseY] = useState(0);
    const [isNearLeft, setIsNearLeft] = useState(false);
    const [isNearRight, setIsNearRight] = useState(false);

    const updateScrollState = () => {
        const el = scrollContainerRef.current;

        if (el) {
            setCanScrollLeft(el.scrollLeft > 5);
            setCanScrollRight(
                el.scrollLeft + el.clientWidth < el.scrollWidth - 5,
            );
        }
    };

    useEffect(() => {
        updateScrollState();
        window.addEventListener('resize', updateScrollState);

        return () => window.removeEventListener('resize', updateScrollState);
    }, [priorities]);

    const handleScroll = () => {
        updateScrollState();
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = scrollContainerRef.current;

        if (!el) {
            return;
        }

        const rect = el.getBoundingClientRect();

        const relativeY = e.clientY - rect.top;
        setMouseY(relativeY);

        const relativeX = e.clientX - rect.left;
        const threshold = 80; // Distance in pixels to activate
        setIsNearLeft(relativeX >= 0 && relativeX < threshold);
        setIsNearRight(
            relativeX > rect.width - threshold && relativeX <= rect.width,
        );
    };

    const handleMouseLeave = () => {
        setIsNearLeft(false);
        setIsNearRight(false);
    };

    const scrollLeftFn = (e: React.MouseEvent) => {
        e.stopPropagation();
        const el = scrollContainerRef.current;

        if (el) {
            el.scrollBy({ left: -350, behavior: 'smooth' });
        }
    };

    const scrollRightFn = (e: React.MouseEvent) => {
        e.stopPropagation();
        const el = scrollContainerRef.current;

        if (el) {
            el.scrollBy({ left: 350, behavior: 'smooth' });
        }
    };

    const confirmDelete = () => {
        if (specimenToDelete) {
            router.delete(destroySpecimen(specimenToDelete.id).url, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Muestra eliminada correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Muestras" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Microscope className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Muestras
                            </h1>
                        </div>
                    </div>
                    <div className="flex w-full flex-col items-center justify-end gap-2 md:w-auto md:flex-row">
                        {/* Filtro de Estado (Combobox Múltiple) */}
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
                                                        `status_filter_specimens_user_${userId}`,
                                                        JSON.stringify(
                                                            nextStatuses,
                                                        ),
                                                    );
                                                }

                                                router.get(
                                                    '/specimens',
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
                                                                `status_filter_specimens_user_${userId}`,
                                                                JSON.stringify(
                                                                    nextStatuses,
                                                                ),
                                                            );
                                                        }

                                                        router.get(
                                                            '/specimens',
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

                        {/* Filtro de Grupo (Combobox con Búsqueda) */}
                        <Popover
                            open={isGroupFilterOpen}
                            onOpenChange={setIsGroupFilterOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isGroupFilterOpen}
                                    className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50 md:w-[200px]"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="truncate">
                                            {selectedGroupId === 'all'
                                                ? 'Todos los grupos'
                                                : (() => {
                                                      const g =
                                                          availableGroups.find(
                                                              (g) =>
                                                                  g.id ===
                                                                  selectedGroupId,
                                                          );

                                                      return g
                                                          ? `${g.name} (#${g.id})`
                                                          : 'Grupo seleccionado';
                                                  })()}
                                        </span>
                                    </div>
                                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-[200px] p-0"
                                align="end"
                            >
                                <Command>
                                    <CommandInput placeholder="Buscar grupo..." />
                                    <CommandList>
                                        <CommandEmpty>
                                            No se encontraron grupos.
                                        </CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="todos"
                                                onSelect={() => {
                                                    setSelectedGroupId('all');
                                                    setIsGroupFilterOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        'mr-2 h-4 w-4',
                                                        selectedGroupId ===
                                                            'all'
                                                            ? 'opacity-100'
                                                            : 'opacity-0',
                                                    )}
                                                />
                                                Todos los grupos
                                            </CommandItem>
                                            {availableGroups.map((group) => (
                                                <CommandItem
                                                    key={group.id}
                                                    value={`${group.name} - ${group.id}`}
                                                    onSelect={() => {
                                                        setSelectedGroupId(
                                                            group.id,
                                                        );
                                                        setIsGroupFilterOpen(
                                                            false,
                                                        );
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            selectedGroupId ===
                                                                group.id
                                                                ? 'opacity-100'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                    {group.name} (#{group.id})
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {/* Filtro de Rango de Fechas */}
                        <DateRangePicker
                            cookieKey="date_filter_specimens"
                            value={dateRange}
                            onChange={(range) => {
                                setDateRange(range);
                                router.get(
                                    '/specimens',
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
                                        `status_filter_specimens_user_${userId}`,
                                        JSON.stringify([
                                            'received',
                                            'macroscopic_review',
                                            'processing',
                                            'microscopic_review',
                                        ]),
                                    );
                                    setCookie(
                                        `specimen_type_filter_specimens_user_${userId}`,
                                        'all',
                                    );
                                    setCookie(
                                        `examination_filter_specimens_user_${userId}`,
                                        'all',
                                    );
                                    setCookie(
                                        `date_filter_specimens_user_${userId}`,
                                        JSON.stringify(defaultRange),
                                    );
                                }

                                router.get(
                                    '/specimens',
                                    {},
                                    {
                                        preserveState: false,
                                    },
                                );
                            }}
                        >
                            Limpiar filtros
                        </Button>

                        {auth.permissions?.includes('specimens.create') && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="h-10 w-full gap-2 px-5 text-sm md:w-auto">
                                        <Plus className="h-4 w-4" />
                                        <span>Nueva Muestra</span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-56"
                                >
                                    <DropdownMenuItem
                                        onClick={handleCreate}
                                        className="group cursor-pointer"
                                    >
                                        <Microscope className="mr-2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-white group-focus:text-white" />
                                        <span>Muestra Individual</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setIsGroupSheetOpen(true)
                                        }
                                        className="group cursor-pointer"
                                    >
                                        <Layers className="mr-2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-white group-focus:text-white" />
                                        <span>Grupo de Muestras</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>{' '}
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

                    {/* Filtro de Tipo de Muestra (Combobox con Búsqueda) */}
                    <Popover
                        open={isSpecimenTypeFilterOpen}
                        onOpenChange={setIsSpecimenTypeFilterOpen}
                    >
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isSpecimenTypeFilterOpen}
                                className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50 sm:w-[200px]"
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Microscope className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate">
                                        {selectedSpecimenTypeId === 'all'
                                            ? 'Todos los tipos'
                                            : (() => {
                                                  const t = specimenTypes.find(
                                                      (t) =>
                                                          t.id.toString() ===
                                                          selectedSpecimenTypeId,
                                                  );

                                                  return t
                                                      ? t.name
                                                      : 'Tipo seleccionado';
                                              })()}
                                    </span>
                                </div>
                                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Buscar tipo..." />
                                <CommandList>
                                    <CommandEmpty>
                                        No se encontraron tipos.
                                    </CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="todos"
                                            onSelect={() => {
                                                handleSpecimenTypeChange('all');
                                                setIsSpecimenTypeFilterOpen(
                                                    false,
                                                );
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    'mr-2 h-4 w-4',
                                                    selectedSpecimenTypeId ===
                                                        'all'
                                                        ? 'opacity-100'
                                                        : 'opacity-0',
                                                )}
                                            />
                                            Todos los tipos
                                        </CommandItem>
                                        {specimenTypes.map((type) => (
                                            <CommandItem
                                                key={type.id}
                                                value={type.name}
                                                onSelect={() => {
                                                    handleSpecimenTypeChange(
                                                        type.id.toString(),
                                                    );
                                                    setIsSpecimenTypeFilterOpen(
                                                        false,
                                                    );
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        'mr-2 h-4 w-4',
                                                        selectedSpecimenTypeId ===
                                                            type.id.toString()
                                                            ? 'opacity-100'
                                                            : 'opacity-0',
                                                    )}
                                                />
                                                {type.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    {/* Filtro de Análisis/Examen (Combobox con Búsqueda) */}
                    <Popover
                        open={isExaminationFilterOpen}
                        onOpenChange={setIsExaminationFilterOpen}
                    >
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isExaminationFilterOpen}
                                className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50 sm:w-[200px]"
                                disabled={selectedSpecimenTypeId === 'all'}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate">
                                        {selectedSpecimenTypeId === 'all'
                                            ? 'Seleccione tipo primero'
                                            : selectedExaminationId === 'all'
                                              ? 'Todos los análisis'
                                              : (() => {
                                                    const e = examinations.find(
                                                        (e) =>
                                                            e.id.toString() ===
                                                            selectedExaminationId,
                                                    );

                                                    return e
                                                        ? e.name
                                                        : 'Análisis seleccionado';
                                                })()}
                                    </span>
                                </div>
                                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Buscar análisis..." />
                                <CommandList>
                                    <CommandEmpty>
                                        No se encontraron análisis.
                                    </CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="todos"
                                            onSelect={() => {
                                                setSelectedExaminationId('all');
                                                setIsExaminationFilterOpen(
                                                    false,
                                                );
                                                const userId =
                                                    props.auth?.user?.id;

                                                if (userId) {
                                                    setCookie(
                                                        `examination_filter_specimens_user_${userId}`,
                                                        'all',
                                                    );
                                                }

                                                router.get(
                                                    '/specimens',
                                                    {
                                                        ...filters,
                                                        examination_id: 'all',
                                                    },
                                                    {
                                                        preserveState: true,
                                                        replace: true,
                                                    },
                                                );
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    'mr-2 h-4 w-4',
                                                    selectedExaminationId ===
                                                        'all'
                                                        ? 'opacity-100'
                                                        : 'opacity-0',
                                                )}
                                            />
                                            Todos los análisis
                                        </CommandItem>
                                        {filteredExaminationsForDropdown.map(
                                            (exam) => (
                                                <CommandItem
                                                    key={exam.id}
                                                    value={exam.name}
                                                    onSelect={() => {
                                                        const examId =
                                                            exam.id.toString();
                                                        setSelectedExaminationId(
                                                            examId,
                                                        );
                                                        setIsExaminationFilterOpen(
                                                            false,
                                                        );
                                                        const userId =
                                                            props.auth?.user
                                                                ?.id;

                                                        if (userId) {
                                                            setCookie(
                                                                `examination_filter_specimens_user_${userId}`,
                                                                examId,
                                                            );
                                                        }

                                                        router.get(
                                                            '/specimens',
                                                            {
                                                                ...filters,
                                                                examination_id:
                                                                    examId,
                                                            },
                                                            {
                                                                preserveState: true,
                                                                replace: true,
                                                            },
                                                        );
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            selectedExaminationId ===
                                                                exam.id.toString()
                                                                ? 'opacity-100'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                    {exam.name}
                                                </CommandItem>
                                            ),
                                        )}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    {/* Seleccionar control */}
                    <div
                        className="flex h-10 w-full shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border bg-card px-3 transition-colors select-none hover:bg-accent/50 sm:w-auto sm:justify-start"
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
                </div>
                {isSelectionMode && (
                    <div className="flex w-full flex-col justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2 px-3 select-none sm:flex-row sm:items-center sm:p-0 sm:py-1 sm:pr-1 sm:pl-3 dark:border-border/60 dark:bg-muted/10">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:flex-nowrap sm:text-sm">
                            <span>
                                <span className="font-semibold text-primary">
                                    {selectedIds.length}
                                </span>{' '}
                                <span className="sm:hidden">
                                    {selectedIds.length === 1
                                        ? 'seleccionada'
                                        : 'seleccionadas'}
                                </span>
                                <span className="hidden sm:inline">
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
                            {(auth.permissions?.includes('specimens.edit') ||
                                auth.permissions?.includes(
                                    'specimens.manage',
                                ) ||
                                auth.permissions?.includes(
                                    'specimens.delete',
                                )) && (
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

                                        {/* Cambiar Estado Submenu */}
                                        {auth.permissions?.includes(
                                            'specimens.edit',
                                        ) && (
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <Tag className="mr-2 h-4 w-4" />
                                                    <span>Cambiar Estado</span>
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleBulkChangeStatus(
                                                                'received',
                                                            )
                                                        }
                                                    >
                                                        Recibida
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleBulkChangeStatus(
                                                                'macroscopic_review',
                                                            )
                                                        }
                                                    >
                                                        Rev. Macroscópica
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleBulkChangeStatus(
                                                                'processing',
                                                            )
                                                        }
                                                    >
                                                        En Proceso
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleBulkChangeStatus(
                                                                'microscopic_review',
                                                            )
                                                        }
                                                    >
                                                        Rev. Microscópica
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleBulkChangeStatus(
                                                                'finalized',
                                                            )
                                                        }
                                                    >
                                                        Finalizada
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleBulkChangeStatus(
                                                                'delivered',
                                                            )
                                                        }
                                                    >
                                                        Entregada
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleBulkChangeStatus(
                                                                'cancelled',
                                                            )
                                                        }
                                                    >
                                                        Cancelada
                                                    </DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                        )}

                                        {/* Cambiar Prioridad Submenu */}
                                        {auth.permissions?.includes(
                                            'specimens.edit',
                                        ) && (
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <CalendarClock className="mr-2 h-4 w-4" />
                                                    <span>
                                                        Cambiar Prioridad
                                                    </span>
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    {priorities.map((p) => (
                                                        <DropdownMenuItem
                                                            key={p.id}
                                                            onClick={() =>
                                                                handleBulkChangePriority(
                                                                    p.id,
                                                                )
                                                            }
                                                        >
                                                            {p.name}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                        )}

                                        {/* Asignar Patólogo in Bulk */}
                                        {auth.permissions?.includes(
                                            'specimens.manage',
                                        ) && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setIsBulkAssignSheetOpen(
                                                        true,
                                                    )
                                                }
                                            >
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                <span>Asignar Patólogo</span>
                                            </DropdownMenuItem>
                                        )}

                                        {auth.permissions?.includes(
                                            'specimens.delete',
                                        ) && (
                                            <>
                                                {(auth.permissions?.includes(
                                                    'specimens.edit',
                                                ) ||
                                                    auth.permissions?.includes(
                                                        'specimens.manage',
                                                    )) && (
                                                    <DropdownMenuSeparator />
                                                )}
                                                <DropdownMenuItem
                                                    variant="destructive"
                                                    onClick={() =>
                                                        setIsBulkDeleteDialogOpen(
                                                            true,
                                                        )
                                                    }
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>
                                                        Desactivar Muestras
                                                    </span>
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                )}
                <div
                    className="group/kanban relative flex-1 overflow-hidden"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Left Scroll Button */}
                    {!isMobile && canScrollLeft && isNearLeft && (
                        <button
                            type="button"
                            onClick={scrollLeftFn}
                            className="absolute left-2 z-[60] flex items-center justify-center rounded-full border border-primary/20 bg-background/80 p-3 text-foreground shadow-lg backdrop-blur-md transition-[transform,background-color,border-color,box-shadow] duration-150 hover:scale-110 hover:border-primary/50 hover:bg-background active:scale-95"
                            style={{
                                top: `${mouseY}px`,
                                transform: 'translateY(-50%)',
                            }}
                        >
                            <ChevronLeft className="h-5 w-5 text-primary" />
                        </button>
                    )}

                    {/* Right Scroll Button */}
                    {!isMobile && canScrollRight && isNearRight && (
                        <button
                            type="button"
                            onClick={scrollRightFn}
                            className="absolute right-2 z-[60] flex items-center justify-center rounded-full border border-primary/20 bg-background/80 p-3 text-foreground shadow-lg backdrop-blur-md transition-[transform,background-color,border-color,box-shadow] duration-150 hover:scale-110 hover:border-primary/50 hover:bg-background active:scale-95"
                            style={{
                                top: `${mouseY}px`,
                                transform: 'translateY(-50%)',
                            }}
                        >
                            <ChevronRight className="h-5 w-5 text-primary" />
                        </button>
                    )}

                    <div
                        ref={scrollContainerRef}
                        className="h-full w-full overflow-x-auto pb-4"
                        onScroll={handleScroll}
                    >
                        <DragDropContext onDragEnd={onDragEnd}>
                            <div className="flex min-h-[calc(100vh-200px)] gap-4">
                                {filteredPriorities.map((priority) => (
                                    <div
                                        key={priority.id}
                                        className="relative flex w-80 min-w-80 flex-col overflow-hidden rounded-lg p-3"
                                    >
                                        {/* Dynamic Background Layer */}
                                        <div
                                            className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
                                            style={{
                                                backgroundColor: priority.color,
                                            }}
                                        />

                                        {/* Content Container */}
                                        <div className="relative z-10 flex h-full flex-col">
                                            <div className="mb-4 flex items-center gap-2 px-1 text-sm font-semibold">
                                                <div
                                                    className="h-3 w-3 rounded-full shadow-sm"
                                                    style={{
                                                        backgroundColor:
                                                            priority.color,
                                                    }}
                                                />
                                                <span>{priority.name}</span>
                                                <span className="ml-auto rounded-full bg-background/60 px-2 py-0.5 text-xs text-muted-foreground">
                                                    {priority.specimens.length}
                                                </span>
                                            </div>
                                            <Droppable
                                                droppableId={priority.id.toString()}
                                            >
                                                {(provided) => (
                                                    <div
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        className="flex min-h-[150px] flex-1 flex-col gap-3"
                                                    >
                                                        {priority.specimens.map(
                                                            (
                                                                specimen,
                                                                index,
                                                            ) => (
                                                                <Draggable
                                                                    key={
                                                                        specimen.id
                                                                    }
                                                                    draggableId={specimen.id.toString()}
                                                                    index={
                                                                        index
                                                                    }
                                                                    isDragDisabled={
                                                                        !auth.permissions?.includes(
                                                                            'specimens.edit',
                                                                        )
                                                                    }
                                                                >
                                                                    {(
                                                                        provided,
                                                                        snapshot,
                                                                    ) => (
                                                                        <div
                                                                            ref={
                                                                                provided.innerRef
                                                                            }
                                                                            {...provided.draggableProps}
                                                                            {...provided.dragHandleProps}
                                                                            onClick={() => {
                                                                                if (
                                                                                    isSelectionMode
                                                                                ) {
                                                                                    toggleSelectSpecimen(
                                                                                        specimen.id,
                                                                                    );
                                                                                } else {
                                                                                    handleView(
                                                                                        specimen,
                                                                                    );
                                                                                }
                                                                            }}
                                                                            className={`flex cursor-pointer flex-col gap-2 rounded-md border p-3 shadow-sm transition-all duration-200 hover:border-primary/50 ${
                                                                                snapshot.isDragging
                                                                                    ? 'z-50 scale-[1.02] rotate-2 opacity-90 shadow-xl ring-2 ring-primary/20'
                                                                                    : ''
                                                                            } ${
                                                                                selectedIds.includes(
                                                                                    specimen.id,
                                                                                )
                                                                                    ? 'border-primary bg-primary/[0.02] ring-1 ring-primary/30'
                                                                                    : specimen.users &&
                                                                                        specimen
                                                                                            .users
                                                                                            .length >
                                                                                            0
                                                                                      ? 'dark:border-sky-850 border-sky-300/80 bg-sky-50/50 dark:bg-sky-950/20'
                                                                                      : 'bg-card'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-start gap-3">
                                                                                {isSelectionMode && (
                                                                                    <div
                                                                                        className="flex-shrink-0 pt-1"
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
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex min-w-0 flex-1 flex-col gap-2">
                                                                                    <div className="flex items-start justify-between">
                                                                                        <div>
                                                                                            {specimen
                                                                                                .group
                                                                                                ?.name && (
                                                                                                <div className="mb-1">
                                                                                                    <Badge
                                                                                                        variant="secondary"
                                                                                                        className="h-4 border-none bg-purple-500/10 px-1.5 py-0 text-[9px] font-semibold text-purple-600 hover:bg-purple-500/10 dark:bg-purple-500/20 dark:text-purple-300"
                                                                                                    >
                                                                                                        {
                                                                                                            specimen
                                                                                                                .group
                                                                                                                .name
                                                                                                        }
                                                                                                    </Badge>
                                                                                                </div>
                                                                                            )}
                                                                                            <div className="text-sm font-medium">
                                                                                                {
                                                                                                    specimen
                                                                                                        .customer_relation
                                                                                                        ?.name
                                                                                                }
                                                                                            </div>
                                                                                            {specimen.sequence_code && (
                                                                                                <div className="mt-0.5 w-fit rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                                                                                                    {
                                                                                                        specimen.sequence_code
                                                                                                    }
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        <div
                                                                                            className="ml-1 flex"
                                                                                            onClick={(
                                                                                                e,
                                                                                            ) =>
                                                                                                e.stopPropagation()
                                                                                            }
                                                                                        >
                                                                                            {auth.permissions?.includes(
                                                                                                'specimens.manage',
                                                                                            ) && (
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="icon"
                                                                                                    className="relative h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                                                    onClick={() =>
                                                                                                        handleAssignClick(
                                                                                                            specimen,
                                                                                                        )
                                                                                                    }
                                                                                                    title="Asignar Patólogo"
                                                                                                >
                                                                                                    <UserPlus className="h-4 w-4" />
                                                                                                    <span
                                                                                                        className={`absolute right-0 bottom-0 flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-extrabold ring-1 ring-background ${
                                                                                                            (specimen
                                                                                                                .users
                                                                                                                ?.length ||
                                                                                                                0) >
                                                                                                            0
                                                                                                                ? 'bg-sky-500 text-white'
                                                                                                                : 'bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                                                                        }`}
                                                                                                    >
                                                                                                        {specimen
                                                                                                            .users
                                                                                                            ?.length ||
                                                                                                            0}
                                                                                                    </span>
                                                                                                </Button>
                                                                                            )}
                                                                                            {(auth.permissions?.includes(
                                                                                                'specimens.edit',
                                                                                            ) ||
                                                                                                auth.permissions?.includes(
                                                                                                    'specimens.delete',
                                                                                                )) && (
                                                                                                <DropdownMenu>
                                                                                                    <DropdownMenuTrigger
                                                                                                        asChild
                                                                                                    >
                                                                                                        <button
                                                                                                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                                                                            title="Acciones"
                                                                                                        >
                                                                                                            <MoreVertical className="h-4 w-4" />
                                                                                                        </button>
                                                                                                    </DropdownMenuTrigger>
                                                                                                    <DropdownMenuContent
                                                                                                        align="end"
                                                                                                        onClick={(
                                                                                                            e,
                                                                                                        ) =>
                                                                                                            e.stopPropagation()
                                                                                                        }
                                                                                                    >
                                                                                                        {auth.permissions?.includes(
                                                                                                            'specimens.edit',
                                                                                                        ) && (
                                                                                                            <DropdownMenuItem
                                                                                                                onClick={(
                                                                                                                    e,
                                                                                                                ) => {
                                                                                                                    e.stopPropagation();
                                                                                                                    handleEdit(
                                                                                                                        specimen,
                                                                                                                    );
                                                                                                                }}
                                                                                                            >
                                                                                                                <Edit2 className="mr-2 h-4 w-4" />
                                                                                                                <span>
                                                                                                                    Editar
                                                                                                                </span>
                                                                                                            </DropdownMenuItem>
                                                                                                        )}
                                                                                                        <DropdownMenuItem
                                                                                                            onClick={(
                                                                                                                e,
                                                                                                            ) => {
                                                                                                                e.stopPropagation();
                                                                                                                window.open(
                                                                                                                    `/specimens/${specimen.sequence_code || specimen.id}/report-editor`,
                                                                                                                    '_blank',
                                                                                                                );
                                                                                                            }}
                                                                                                        >
                                                                                                            <FileText className="mr-2 h-4 w-4" />
                                                                                                            <span>
                                                                                                                Abrir
                                                                                                                Reporte
                                                                                                            </span>
                                                                                                        </DropdownMenuItem>
                                                                                                        {auth.permissions?.includes(
                                                                                                            'specimens.delete',
                                                                                                        ) && (
                                                                                                            <DropdownMenuItem
                                                                                                                variant="destructive"
                                                                                                                onClick={(
                                                                                                                    e,
                                                                                                                ) => {
                                                                                                                    e.stopPropagation();
                                                                                                                    handleDeleteClick(
                                                                                                                        specimen,
                                                                                                                    );
                                                                                                                }}
                                                                                                            >
                                                                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                                                                <span>
                                                                                                                    Eliminar
                                                                                                                </span>
                                                                                                            </DropdownMenuItem>
                                                                                                        )}
                                                                                                    </DropdownMenuContent>
                                                                                                </DropdownMenu>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        {
                                                                                            specimen
                                                                                                .type
                                                                                                ?.name
                                                                                        }{' '}
                                                                                        -{' '}
                                                                                        {
                                                                                            specimen
                                                                                                .examination
                                                                                                ?.name
                                                                                        }
                                                                                    </div>
                                                                                    {(() => {
                                                                                        const dueInfo =
                                                                                            getDueDateInfo(
                                                                                                specimen,
                                                                                            );

                                                                                        if (
                                                                                            !dueInfo
                                                                                        ) {
                                                                                            return null;
                                                                                        }

                                                                                        return (
                                                                                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                                                                                <div className="inline-flex w-fit items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                                                                                    <Tag className="h-3 w-3" />{' '}
                                                                                                    {
                                                                                                        specimen
                                                                                                            .category
                                                                                                            .name
                                                                                                    }
                                                                                                </div>
                                                                                                {![
                                                                                                    'finalized',
                                                                                                    'delivered',
                                                                                                    'cancelled',
                                                                                                ].includes(
                                                                                                    specimen.status,
                                                                                                ) && (
                                                                                                    <div
                                                                                                        className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${dueInfo.colorClass}`}
                                                                                                        title={`Fecha Estimada: ${dueInfo.fullDueDate}`}
                                                                                                    >
                                                                                                        <CalendarClock className="h-3 w-3" />{' '}
                                                                                                        Est:{' '}
                                                                                                        {
                                                                                                            dueInfo.dueDateFormatted
                                                                                                        }
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })()}
                                                                                    <div className="mt-1 flex items-center justify-between text-xs">
                                                                                        <span
                                                                                            className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                                                                                            style={{
                                                                                                backgroundColor:
                                                                                                    specimen.status_color ||
                                                                                                    '#cbd5e1',
                                                                                            }}
                                                                                        >
                                                                                            {specimen.status ===
                                                                                            'received'
                                                                                                ? 'Recibida'
                                                                                                : specimen.status ===
                                                                                                    'macroscopic_review'
                                                                                                  ? 'Rev. Macroscópica'
                                                                                                  : specimen.status ===
                                                                                                      'processing'
                                                                                                    ? 'En Proceso'
                                                                                                    : specimen.status ===
                                                                                                        'microscopic_review'
                                                                                                      ? 'Rev. Microscópica'
                                                                                                      : specimen.status ===
                                                                                                          'finalized'
                                                                                                        ? 'Finalizada'
                                                                                                        : specimen.status ===
                                                                                                            'delivered'
                                                                                                          ? 'Entregada'
                                                                                                          : specimen.status ===
                                                                                                              'cancelled'
                                                                                                            ? 'Cancelada'
                                                                                                            : specimen.status}
                                                                                        </span>
                                                                                        <span
                                                                                            className="text-muted-foreground capitalize"
                                                                                            title={new Date(
                                                                                                specimen.created_at,
                                                                                            ).toLocaleString(
                                                                                                'es-ES',
                                                                                            )}
                                                                                        >
                                                                                            {formatDistanceToNow(
                                                                                                new Date(
                                                                                                    specimen.created_at,
                                                                                                ),
                                                                                                {
                                                                                                    addSuffix: true,
                                                                                                    locale: es,
                                                                                                },
                                                                                            )}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ),
                                                        )}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DragDropContext>
                    </div>
                </div>
            </div>

            <SpecimenSheet
                specimen={selectedSpecimen}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                specimenTypes={specimenTypes}
                examinations={examinations}
                categories={categories}
                referrers={referrers}
                referrerTypes={referrerTypes}
                priorities={initialPriorities}
                locations={locations}
                sequences={sequences}
                activeLocationId={activeLocationId}
                products={products}
                banks={banks}
            />

            <SpecimenGroupSheet
                open={isGroupSheetOpen}
                onOpenChange={setIsGroupSheetOpen}
                specimenTypes={specimenTypes}
                examinations={examinations}
                categories={categories}
                referrers={referrers}
                referrerTypes={referrerTypes}
                priorities={initialPriorities}
                locations={locations}
                sequences={sequences}
                activeLocationId={activeLocationId}
                products={products}
                banks={banks}
            />

            <SpecimenViewSheet
                specimen={selectedSpecimenForView}
                open={isViewSheetOpen}
                onOpenChange={setIsViewSheetOpen}
                onEditClick={handleEditFromView}
                preventCloseOnOutsideClick={showInvoiceModal}
                onEditInvoiceClick={(invoice) => {
                    setSelectedInvoice(invoice);
                    setIsInvoiceSheetOpen(true);
                }}
                onAssignPathologistClick={() => {
                    if (selectedSpecimenForView) {
                        handleAssignClick(selectedSpecimenForView);
                    }
                }}
            />

            <InvoiceSheet
                invoice={selectedInvoice}
                open={isInvoiceSheetOpen}
                onOpenChange={setIsInvoiceSheetOpen}
                banks={banks}
            />

            <SpecimenPathologistSheet
                specimen={activeAssignSpecimen}
                open={isAssignSheetOpen}
                onOpenChange={setIsAssignSheetOpen}
                pathologists={pathologists}
            />

            <SpecimenBulkPathologistSheet
                selectedSpecimens={selectedSpecimens}
                open={isBulkAssignSheetOpen}
                onOpenChange={setIsBulkAssignSheetOpen}
                pathologists={pathologists}
            />

            <AlertDialog
                open={isBulkDeleteDialogOpen}
                onOpenChange={setIsBulkDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Está completamente seguro?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactivará las {selectedIds.length}{' '}
                            muestras seleccionadas. Ya no aparecerán en el
                            tablero Kanban.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmBulkDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Desactivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
                            Esta acción desactivará la muestra. Ya no aparecerá
                            en el tablero Kanban.
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

            {/* DIÁLOGO DE IMPRESIÓN/VISTA PREVIA DE FACTURA */}
            <AlertDialog
                open={showInvoiceModal}
                onOpenChange={(open) => {
                    setShowInvoiceModal(open);

                    if (!open) {
                        setInvoiceUrl(null);
                        setPaymentInvoiceUrl(null);
                        setActivePdf('invoice');
                    }
                }}
            >
                <AlertDialogContent
                    className="z-[100] w-full max-w-[700px]"
                    overlayClassName="z-[100]"
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />{' '}
                            Factura Generada con Éxito
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            La muestra ha sido registrada y la factura se generó
                            en formato PDF. Puede descargarla, imprimirla o
                            visualizarla a continuación.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {paymentInvoiceUrl && (
                        <div className="mt-2 flex gap-2">
                            <Button
                                type="button"
                                variant={
                                    activePdf === 'invoice'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                onClick={() => setActivePdf('invoice')}
                                className="flex-1"
                            >
                                Factura de Crédito
                            </Button>
                            <Button
                                type="button"
                                variant={
                                    activePdf === 'payment_invoice'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                onClick={() => setActivePdf('payment_invoice')}
                                className="flex-1"
                            >
                                Recibo de Pago Inicial
                            </Button>
                        </div>
                    )}

                    {(activePdf === 'invoice'
                        ? invoiceUrl
                        : paymentInvoiceUrl) && (
                        <div className="my-4 overflow-hidden rounded-lg border bg-muted">
                            <iframe
                                src={
                                    activePdf === 'invoice'
                                        ? invoiceUrl!
                                        : paymentInvoiceUrl!
                                }
                                className="h-[400px] w-full border-none"
                                title="Factura PDF"
                            />
                        </div>
                    )}

                    <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowInvoiceModal(false);
                                setInvoiceUrl(null);
                                setPaymentInvoiceUrl(null);
                                setActivePdf('invoice');
                            }}
                            className="sm:order-1"
                        >
                            Cerrar
                        </Button>
                        <Button
                            onClick={() => {
                                const url =
                                    activePdf === 'invoice'
                                        ? invoiceUrl
                                        : paymentInvoiceUrl;

                                if (url) {
                                    window.open(url, '_blank');
                                }
                            }}
                            className="sm:order-2"
                        >
                            <ExternalLink className="mr-2 h-4 w-4" /> Abrir en
                            pestaña nueva
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
