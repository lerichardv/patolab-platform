import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
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
    MoreVertical,
    UserPlus,
    ChevronDown,
    Layers,
    Check,
    Filter,
    Search,
    Ban,
    AlertCircle,
    RotateCcw,
    ArrowUp,
    ArrowDown,
    Loader2,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { destroy as destroySpecimen } from '@/actions/App/Http/Controllers/SpecimenController';
import CancelSpecimenDialog from '@/components/cancel-specimen-dialog';
import {
    DateRangePicker,
    getCookie,
    setCookie,
    getLast2WeeksRange,
} from '@/components/date-range-picker';
import InvoicePreviewDialog from '@/components/invoice-preview-dialog';
import SelectSpecimenGroupDialog from '@/components/select-specimen-group-dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn, addWithoutWeekends } from '@/lib/utils';
import InvoiceSheet from '../invoices/invoice-sheet';
import { KanbanBoard } from './kanban/kanban-board';
import SpecimenBulkCollaboratorSheet from './specimen-bulk-collaborator-sheet';
import SpecimenBulkPathologistSheet from './specimen-bulk-pathologist-sheet';
import SpecimenGroupSheet from './specimen-group-sheet';
import SpecimenPathologistSheet from './specimen-pathologist-sheet';
import SpecimenSheet from './specimen-sheet';
import SpecimenViewSheet from './specimen-view-sheet';

export interface Specimen {
    id: number;
    priority_id: number;
    sample_collection_date?: string;
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
    collaborators?: any[];
    group?: any;
    group_id?: any;
    is_group?: any;
}

export interface Priority {
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
    usersList?: any[];
    banks: any[];
    filters: {
        status?: string[];
        specimen_type_id?: string;
        examination_id?: string;
        date_from?: string;
        date_to?: string;
    };
}

export const getDueDate = (specimen: Specimen): Date => {
    const createdAt = new Date(specimen.created_at);

    const unit = specimen.category?.intern_unit || specimen.category?.unit;
    const quantity =
        specimen.category?.intern_quantity || specimen.category?.quantity;

    if (!unit || !quantity) {
        return createdAt;
    }

    return addWithoutWeekends(createdAt, quantity, unit);
};

export const getDueDateInfo = (specimen: Specimen) => {
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

    const timeDefined = `${quantity} ${
        unit === 'minutes'
            ? 'minutos'
            : unit === 'hours'
              ? 'horas'
              : unit === 'days'
                ? 'días'
                : unit === 'weeks'
                  ? 'semanas'
                  : unit
    }`;

    const dueDateFormatted = formatDistanceToNow(dueDate, {
        addSuffix: true,
        locale: es,
    });
    const fullDueDate = format(dueDate, 'dd/MM/yyyy HH:mm');

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
        timeDefined,
        dueDateFormatted,
        fullDueDate,
        colorClass,
        isExpired,
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

export const deduplicateSpecimens = (
    prioritiesList: Priority[],
): Priority[] => {
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
    usersList = [],
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
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
    const [isSelectGroupDialogOpen, setIsSelectGroupDialogOpen] =
        useState(false);
    const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(
        null,
    );
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [specimenToDelete, setSpecimenToDelete] = useState<Specimen | null>(
        null,
    );
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [specimenToCancel, setSpecimenToCancel] = useState<Specimen | null>(
        null,
    );

    const specimensInGroupToCancel = useMemo(() => {
        if (!specimenToCancel || !specimenToCancel.group_id) {
            return [];
        }

        const list: Specimen[] = [];
        const seenIds = new Set<number>();

        priorities.forEach((priority) => {
            priority.specimens.forEach((specimen) => {
                if (
                    specimen.group_id === specimenToCancel.group_id &&
                    !seenIds.has(specimen.id)
                ) {
                    list.push(specimen);
                    seenIds.add(specimen.id);
                }
            });
        });

        return list;
    }, [specimenToCancel, priorities]);

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
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkAssignSheetOpen, setIsBulkAssignSheetOpen] = useState(false);
    const [isBulkCollaboratorSheetOpen, setIsBulkCollaboratorSheetOpen] =
        useState(false);

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
    const [visibleCounts, setVisibleCounts] = useState<Record<number, number>>(
        {},
    );

    const handleLoadMore = (priorityId: number) => {
        setVisibleCounts((prev) => {
            const current = prev[priorityId] || 50;

            return {
                ...prev,
                [priorityId]: current + 50,
            };
        });
    };

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
            '/specimens',
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
            '/specimens',
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
                        invoice.invoice_number
                            .toLowerCase()
                            .includes(searchLower));

                const specimenTypeId =
                    specimen.specimen_type || specimen.type?.id;
                const matchesSpecimenType =
                    selectedSpecimenTypeIds.length === specimenTypes.length ||
                    (specimenTypeId &&
                        selectedSpecimenTypeIds.includes(
                            specimenTypeId.toString(),
                        ));

                const examId =
                    specimen.specimen_type_examination ||
                    specimen.examination?.id;
                const matchesExamination =
                    selectedExaminationIds.length === examinations.length ||
                    (examId &&
                        selectedExaminationIds.includes(examId.toString()));

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
                    matchesGroup &&
                    matchesSearch &&
                    matchesSpecimenType &&
                    matchesExamination &&
                    matchesExpired
                );
            });

            const sortedSpecimens = [...filteredSpecimens].sort((a, b) => {
                const dateA = getDueDate(a).getTime();
                const dateB = getDueDate(b).getTime();

                return dueDateSortOrder === 'asc'
                    ? dateA - dateB
                    : dateB - dateA;
            });

            return {
                ...priority,
                specimens: sortedSpecimens,
            };
        });
    }, [
        priorities,
        selectedStatuses,
        dateRange,
        selectedGroupId,
        searchQuery,
        selectedSpecimenTypeIds,
        selectedExaminationIds,
        specimenTypes.length,
        examinations.length,
        showExpiredOnly,
        dueDateSortOrder,
    ]);

    useEffect(() => {
        setVisibleCounts({});
    }, [
        searchQuery,
        selectedStatuses,
        dateRange,
        selectedGroupId,
        selectedSpecimenTypeIds,
        selectedExaminationIds,
        dueDateSortOrder,
        showExpiredOnly,
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
        if (isSheetOpen || isGroupSheetOpen || isViewSheetOpen) {
            router.reload({
                only: ['priorities'],
            });
        }
    }, [isSheetOpen, isGroupSheetOpen, isViewSheetOpen]);

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

    const handleCancelClick = (specimen: Specimen) => {
        setSpecimenToCancel(specimen);
        setIsCancelDialogOpen(true);
    };

    const handleCloseCancelDialog = () => {
        setIsCancelDialogOpen(false);
        setSpecimenToCancel(null);
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

            setShowInvoiceModal(true);
        }
    }, [
        flash.new_invoice_url,
        flash.new_payment_invoice_url,
        flash.new_specimen_id,
    ]);

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

    const handleLoadGroupAndOpenSheet = async (groupId: number) => {
        const toastId = toast.loading('Cargando detalles del grupo...');

        try {
            const response = await axios.get(
                `/specimen-groups/${groupId}/details`,
            );
            setSelectedGroup(response.data);
            setIsGroupSheetOpen(true);
            toast.dismiss(toastId);
        } catch (error) {
            console.error('Error loading group details:', error);
            toast.error('Error al cargar los detalles del grupo', {
                id: toastId,
            });
        }
    };

    const handleDeleteClick = (specimen: Specimen) => {
        setSpecimenToDelete(specimen);
        setIsDeleteDialogOpen(true);
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
                                        `date_filter_specimens_user_${userId}`,
                                        JSON.stringify({
                                            range: '14_days',
                                            from: defaultRange.from,
                                            to: defaultRange.to,
                                        }),
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
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setIsSelectGroupDialogOpen(true)
                                        }
                                        className="group cursor-pointer"
                                    >
                                        <Plus className="mr-2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-white group-focus:text-white" />
                                        <span>Agregar a Grupo Existente</span>
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

                    {/* Switch Mostrar solo vencidos */}
                    <div
                        className="flex h-10 w-full shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border bg-card px-3 transition-colors select-none hover:bg-accent/50 sm:w-auto sm:justify-start"
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
                        className="flex h-10 w-full shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border bg-card px-3 transition-colors select-none hover:bg-accent/50 sm:w-auto sm:justify-start"
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

                                        {/* Asignar Colaboradores in Bulk */}
                                        {auth.permissions?.includes(
                                            'specimens.manage',
                                        ) && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setIsBulkCollaboratorSheetOpen(
                                                        true,
                                                    )
                                                }
                                            >
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                <span>
                                                    Asignar Colaboradores
                                                </span>
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
                <KanbanBoard
                    priorities={priorities}
                    setPriorities={setPriorities}
                    filteredPriorities={filteredPriorities}
                    initialPriorities={initialPriorities}
                    deduplicateSpecimens={deduplicateSpecimens}
                    visibleCounts={visibleCounts}
                    auth={auth}
                    isSelectionMode={isSelectionMode}
                    selectedIds={selectedIds}
                    toggleSelectSpecimen={toggleSelectSpecimen}
                    handleView={handleView}
                    handleAssignClick={handleAssignClick}
                    handleEdit={handleEdit}
                    handleLoadGroupAndOpenSheet={handleLoadGroupAndOpenSheet}
                    handleCancelClick={handleCancelClick}
                    handleDeleteClick={handleDeleteClick}
                    handleLoadMore={handleLoadMore}
                />
            </div>

            <SpecimenSheet
                key={
                    isSheetOpen && selectedSpecimen
                        ? `edit_${selectedSpecimen.id}_${(findSpecimenById(selectedSpecimen.id) || selectedSpecimen).sample_collection_date || ''}`
                        : 'closed_edit'
                }
                specimen={
                    selectedSpecimen
                        ? findSpecimenById(selectedSpecimen.id) ||
                          selectedSpecimen
                        : null
                }
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
                onOpenChange={(open) => {
                    setIsGroupSheetOpen(open);

                    if (!open) {
                        setSelectedGroup(null);
                    }
                }}
                group={selectedGroup}
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

            <SelectSpecimenGroupDialog
                open={isSelectGroupDialogOpen}
                onOpenChange={setIsSelectGroupDialogOpen}
                onConfirm={(groupDetails) => {
                    setSelectedGroup(groupDetails);
                    setIsGroupSheetOpen(true);
                }}
            />

            <SpecimenViewSheet
                key={
                    isViewSheetOpen && selectedSpecimenForView
                        ? `view_${selectedSpecimenForView.id}_${(findSpecimenById(selectedSpecimenForView.id) || selectedSpecimenForView).sample_collection_date || ''}`
                        : 'closed_view'
                }
                specimen={
                    selectedSpecimenForView
                        ? findSpecimenById(selectedSpecimenForView.id) ||
                          selectedSpecimenForView
                        : null
                }
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
                usersList={usersList}
            />

            <SpecimenBulkPathologistSheet
                selectedSpecimens={selectedSpecimens}
                open={isBulkAssignSheetOpen}
                onOpenChange={setIsBulkAssignSheetOpen}
                pathologists={pathologists}
            />

            <SpecimenBulkCollaboratorSheet
                selectedSpecimens={selectedSpecimens}
                open={isBulkCollaboratorSheetOpen}
                onOpenChange={setIsBulkCollaboratorSheetOpen}
                usersList={usersList}
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

            <CancelSpecimenDialog
                isOpen={isCancelDialogOpen}
                onClose={handleCloseCancelDialog}
                specimenToCancel={specimenToCancel}
                specimensInGroupToCancel={specimensInGroupToCancel}
            />

            <InvoicePreviewDialog
                open={showInvoiceModal}
                onOpenChange={(open) => {
                    setShowInvoiceModal(open);

                    if (!open) {
                        setInvoiceUrl(null);
                        setPaymentInvoiceUrl(null);
                    }
                }}
                invoiceUrl={invoiceUrl}
                paymentInvoiceUrl={paymentInvoiceUrl}
            />
        </>
    );
}
