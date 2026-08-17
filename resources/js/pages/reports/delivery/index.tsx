import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import debounce from 'lodash/debounce';
import {
    Eye,
    Search,
    Download,
    FileSpreadsheet,
    Layers,
    Microscope,
    FileText,
    ChevronDown,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as React from 'react';
import { index as deliveryReportIndex } from '@/actions/App/Http/Controllers/Reports/DeliveryReportController';
import AsyncCustomerCombobox from '@/components/async-customer-combobox';
import {
    DateRangePicker,
    setCookie,
    getLast2WeeksRange,
} from '@/components/date-range-picker';
import { Pagination } from '@/components/pagination';
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
import { cn } from '@/lib/utils';
import SpecimenViewSheet from '../../specimens/specimen-view-sheet';

interface SpecimenReportRow {
    id: number;
    sequence_code: string;
    customer_relation?: {
        name: string;
        id_number: string;
    };
    type?: {
        name: string;
    };
    examination?: {
        name: string;
    };
    category?: {
        name: string;
    };
    created_at: string;
    expected_internal_finalization_date: string | null;
    expected_finalization_date: string | null;
    finalized_at: string | null;
    status: string;
    status_color?: string;
}

interface PaginatedData {
    data: SpecimenReportRow[];
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
}

interface SummaryItem {
    specimen_type_name: string;
    examination_name: string;
    total: number;
}

interface Props {
    specimens: PaginatedData;
    summary: SummaryItem[];
    filters: {
        search?: string;
        customer_id?: string;
        specimen_type_id?: string;
        examination_id?: string;
        date_from?: string;
        date_to?: string;
        internal_date_from?: string;
        internal_date_to?: string;
    };
    selectedCustomer?: {
        id: number;
        name: string;
    } | null;
    specimenTypes: {
        id: number;
        name: string;
    }[];
    examinations: any[];
}

const statusLabels: Record<string, string> = {
    received: 'Recibida',
    macroscopic_review: 'Rev. Macroscópica',
    processing: 'En Proceso',
    microscopic_review: 'Rev. Microscópica',
    finalized: 'Finalizada',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
};

const statusBadgeStyles: Record<string, string> = {
    received:
        'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400',
    macroscopic_review:
        'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-400',
    processing:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400',
    microscopic_review:
        'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/30 dark:text-fuchsia-400',
    finalized:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400',
    delivered:
        'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400',
    cancelled:
        'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400',
};

export default function DeliveryReportIndex({
    specimens,
    summary,
    filters,
    selectedCustomer,
    specimenTypes,
    examinations,
}: Props) {
    const { props } = usePage() as any;
    const { auth } = props;

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedSpecimenId, setSelectedSpecimenId] = useState<number | null>(
        null,
    );
    const [search, setSearch] = useState(filters.search || '');

    const containerRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
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
    }, [
        filters.specimen_type_id,
        filters.examination_id,
        specimenTypes,
        examinations,
    ]);

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

        const userId = auth?.user?.id;
        if (userId) {
            setCookie(
                `specimen_type_filter_report_delivery_user_${userId}`,
                JSON.stringify(typeParam),
            );
        }

        const newFilters: any = {
            ...filters,
            specimen_type_id: typeParam,
            examination_id: examParam,
        };

        router.get(deliveryReportIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
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

        const newFilters: any = {
            ...filters,
            specimen_type_id: typeParam,
            examination_id: examParam,
        };

        router.get(deliveryReportIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const newFilters = { ...filters, [key]: value };

            if (value === 'all' || value === '') {
                delete newFilters[key as keyof typeof filters];
            }

            router.get(deliveryReportIndex().url, newFilters, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    const handleExport = () => {
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach((v) =>
                        queryParams.append(`${key}[]`, String(v)),
                    );
                } else {
                    queryParams.append(key, String(value));
                }
            }
        });
        window.location.href = `/reports/delivery/export?${queryParams.toString()}`;
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

        return () => {
            debouncedSearch.cancel();
        };
    }, [search, filters.search, debouncedSearch]);

    const handleViewDetails = (id: number) => {
        setSelectedSpecimenId(id);
        setIsSheetOpen(true);
    };

    const examinationOptions = useMemo(() => {
        const selectedSpecimenType = filters.specimen_type_id || 'all';

        const filtered =
            selectedSpecimenType === 'all'
                ? examinations
                : examinations.filter(
                      (exam) =>
                          exam.specimen_type?.toString() ===
                          selectedSpecimenType,
                  );

        return [
            { label: 'Todos los exámenes', value: 'all' },
            ...filtered.map((exam) => ({
                label: exam.name,
                value: exam.id.toString(),
            })),
        ];
    }, [examinations, filters.specimen_type_id]);

    const activeSummary = useMemo(() => {
        return summary.filter((item) => item.total > 0);
    }, [summary]);

    const summaryGrandTotal = useMemo(() => {
        return summary.reduce((acc, curr) => acc + curr.total, 0);
    }, [summary]);

    return (
        <>
            <Head title="Reporte: Hojas de Entrega" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Reporte: Hoja de Entrega de Muestras
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Consulte y exporte las muestras cuya entrega está
                            programada dentro del rango de fechas seleccionado.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="h-10 gap-2"
                            onClick={() => {
                                const userId = auth?.user?.id;

                                if (userId) {
                                    const defaultRange = getLast2WeeksRange();
                                    setCookie(
                                        `date_filter_report_delivery_user_${userId}`,
                                        JSON.stringify({
                                            range: '14_days',
                                            from: defaultRange.from,
                                            to: defaultRange.to,
                                        }),
                                    );
                                    setCookie(
                                        `internal_date_filter_report_delivery_user_${userId}`,
                                        '',
                                        -1,
                                    );
                                }

                                router.get(
                                    deliveryReportIndex().url,
                                    {},
                                    { preserveState: false },
                                );
                            }}
                        >
                            Limpiar filtros
                        </Button>
                        <Button
                            variant="outline"
                            className="h-10 gap-2"
                            onClick={handleExport}
                        >
                            <Download className="h-4 w-4" />
                            <span>Exportar a Excel</span>
                        </Button>
                    </div>
                </div>

                {/* Filters Area */}
                <div className="flex w-full flex-col gap-4 rounded-lg border bg-card p-4">
                    {/* Row 1: Search and Date Ranges */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                        <div className="relative w-full">
                            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por código muestra, cliente, ID/RTN..."
                                className="w-full pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex w-full min-w-[220px] flex-col gap-1.5 lg:w-auto">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Fecha Estimada Interna
                            </span>
                            <DateRangePicker
                                cookieKey="internal_date_filter_report_delivery"
                                value={{
                                    from: filters.internal_date_from || '',
                                    to: filters.internal_date_to || '',
                                }}
                                onChange={(range) => {
                                    const newFilters = { ...filters };

                                    if (range.from) {
                                        newFilters.internal_date_from =
                                            range.from;
                                    } else {
                                        delete newFilters.internal_date_from;
                                    }

                                    if (range.to) {
                                        newFilters.internal_date_to = range.to;
                                    } else {
                                        delete newFilters.internal_date_to;
                                    }

                                    router.get(
                                        deliveryReportIndex().url,
                                        newFilters,
                                        {
                                            preserveState: true,
                                            replace: true,
                                        },
                                    );
                                }}
                            />
                        </div>
                        <div className="flex w-full min-w-[220px] flex-col gap-1.5 lg:w-auto">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Fecha Estimada de Entrega
                            </span>
                            <DateRangePicker
                                cookieKey="date_filter_report_delivery"
                                value={{
                                    from: filters.date_from || '',
                                    to: filters.date_to || '',
                                }}
                                onChange={(range) => {
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
                                        deliveryReportIndex().url,
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

                    {/* Row 2: Advanced filters */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {/* Customer */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Cliente
                            </span>
                            <AsyncCustomerCombobox
                                value={filters.customer_id || ''}
                                onChange={(id) =>
                                    handleFilterChange('customer_id', id || '')
                                }
                                placeholder="Filtrar por cliente"
                                initialCustomer={selectedCustomer || undefined}
                                allowClear
                            />
                        </div>

                        {/* Specimen Type */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Tipo de Muestra
                            </span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Microscope className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span>
                                                Tipos (
                                                {selectedSpecimenTypeIds.length}
                                                )
                                            </span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-64 p-2"
                                    align="start"
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between border-b px-2 py-1 pb-1.5 text-xs text-muted-foreground">
                                            <span>Filtrar por tipo</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const areAllTypesSelected =
                                                        specimenTypes.length >
                                                            0 &&
                                                        specimenTypes.every(
                                                            (t) =>
                                                                selectedSpecimenTypeIds.includes(
                                                                    t.id.toString(),
                                                                ),
                                                        );
                                                    const nextTypes =
                                                        areAllTypesSelected
                                                            ? []
                                                            : specimenTypes.map(
                                                                  (t) =>
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
                                                            const nextTypes =
                                                                isChecked
                                                                    ? selectedSpecimenTypeIds.filter(
                                                                          (
                                                                              id,
                                                                          ) =>
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
                        </div>

                        {/* Examination */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Examen / Análisis
                            </span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span>
                                                Análisis (
                                                {selectedExaminationIds.length})
                                            </span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-64 p-2"
                                    align="start"
                                >
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
                                                                              (
                                                                                  id,
                                                                              ) =>
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
                                                                checked={
                                                                    isChecked
                                                                }
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
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="space-y-4">
                    <div
                        ref={containerRef}
                        className="rounded-md border bg-card"
                    >
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[180px]">
                                        Cliente/Empresa
                                    </TableHead>
                                    <TableHead className="min-w-[120px]">
                                        ID/RTN
                                    </TableHead>
                                    <TableHead className="min-w-[200px]">
                                        Tipo de Muestra-Análisis
                                    </TableHead>
                                    <TableHead className="min-w-[120px]">
                                        Categoría
                                    </TableHead>
                                    <TableHead className="min-w-[140px] text-center font-mono text-xs">
                                        Código de la Muestra
                                    </TableHead>
                                    <TableHead className="min-w-[130px] text-center">
                                        Estado
                                    </TableHead>
                                    <TableHead className="min-w-[140px] text-center">
                                        Fecha de Finalización
                                    </TableHead>
                                    <TableHead className="min-w-[110px] text-center">
                                        Fecha de Ingreso
                                    </TableHead>
                                    <TableHead className="min-w-[140px] text-center">
                                        Fecha Estimada Interna
                                    </TableHead>
                                    <TableHead className="min-w-[160px] bg-yellow-500/10 text-center font-bold text-yellow-950 dark:bg-yellow-500/20 dark:text-yellow-100">
                                        Fecha Estimada de Entrega
                                    </TableHead>
                                    <TableHead className="min-w-[80px] text-right">
                                        Total
                                    </TableHead>
                                    <TableHead className="w-[60px] text-center">
                                        Ver
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {specimens.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={12}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            No se encontraron muestras.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    specimens.data.map((row) => {
                                        const service = `${row.type?.name || 'N/A'} - ${row.examination?.name || 'N/A'}`;
                                        const expectedInternal =
                                            row.expected_internal_finalization_date
                                                ? format(
                                                      new Date(
                                                          row.expected_internal_finalization_date,
                                                      ),
                                                      'd/M/yy',
                                                  )
                                                : 'N/A';
                                        const expectedDelivery =
                                            row.expected_finalization_date
                                                ? format(
                                                      new Date(
                                                          row.expected_finalization_date,
                                                      ),
                                                      'd/M/yy',
                                                  )
                                                : 'N/A';
                                        const finalizedAtFormatted =
                                            row.finalized_at
                                                ? format(
                                                      new Date(
                                                          row.finalized_at,
                                                      ),
                                                      'd/M/yy',
                                                  )
                                                : 'N/A';

                                        return (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-medium">
                                                    {row.customer_relation
                                                        ?.name ?? 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    {row.customer_relation
                                                        ?.id_number ?? 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {service}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {row.category?.name ??
                                                            'N/A'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-xs font-semibold">
                                                    {row.sequence_code}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors',
                                                            statusBadgeStyles[
                                                                row.status
                                                            ] ||
                                                                'border-slate-200 bg-slate-50 text-slate-700',
                                                        )}
                                                    >
                                                        {statusLabels[
                                                            row.status
                                                        ] || row.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center text-xs text-muted-foreground">
                                                    {finalizedAtFormatted}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {format(
                                                        new Date(
                                                            row.created_at,
                                                        ),
                                                        'd/M/yy',
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center text-xs text-muted-foreground">
                                                    {expectedInternal}
                                                </TableCell>
                                                <TableCell className="bg-yellow-500/[0.02] text-center font-bold">
                                                    {expectedDelivery}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    1
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() =>
                                                            handleViewDetails(
                                                                row.id,
                                                            )
                                                        }
                                                        title="Ver Detalle Muestra"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <Pagination
                        links={specimens.links}
                        meta={{
                            from: specimens.from,
                            to: specimens.to,
                            total: specimens.total,
                        }}
                    />
                </div>

                {/* Summary Breakdown table */}
                {activeSummary.length > 0 && (
                    <div className="mt-8 max-w-lg rounded-lg border bg-card p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
                            <Layers className="h-5 w-5" />
                            Resumen por tipo de Muestra y Análisis
                        </h3>
                        <div className="overflow-hidden rounded-md border bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tipo de Muestra</TableHead>
                                        <TableHead>Tipo de Análisis</TableHead>
                                        <TableHead className="w-[100px] text-right">
                                            Total
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activeSummary.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="text-xs font-medium">
                                                {item.specimen_type_name}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {item.examination_name}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {item.total}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-primary/5 font-bold text-primary hover:bg-primary/5">
                                        <TableCell
                                            colSpan={2}
                                            className="text-right"
                                        >
                                            Total
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {summaryGrandTotal}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>

            {/* Specimen View Drawer */}
            {selectedSpecimenId && (
                <SpecimenViewSheet
                    specimenId={selectedSpecimenId}
                    open={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                />
            )}
        </>
    );
}
