import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import debounce from 'lodash/debounce';
import {
    Eye,
    Search,
    Download,
    FileSpreadsheet,
    Coins,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Microscope,
    FileText,
    ChevronDown,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as React from 'react';
import { index as billingSummaryReportIndex } from '@/actions/App/Http/Controllers/Reports/BillingSummaryReportController';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import InvoiceViewSheet from '../../invoices/invoice-view-sheet';

interface BillingReportRow {
    id: string;
    invoice_id: number;
    invoice: any;
    date: string | null;
    invoice_date: string | null;
    created_at: string | null;
    customer_id_number: string;
    customer_name: string;
    invoice_number: string;
    gross_amount: number;
    isv_15: number;
    discount: number;
    net_amount: number;
    service: string;
    specimen_code: string;
    username: string;
    payment_type: string;
    is_cancelled: boolean;
    quantity: number;
}

interface PaginatedData {
    data: BillingReportRow[];
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

interface Props {
    activeInvoices: PaginatedData;
    cancelledInvoices: PaginatedData;
    paymentDetails: {
        cash: number;
        card: number;
        check: number;
        transfer: number;
        credit: number;
        total: number;
    };
    totals: {
        gross: number;
        isv: number;
        discount: number;
        net: number;
    };
    cancelledTotals: {
        gross: number;
        isv: number;
        discount: number;
        net: number;
    };
    filters: {
        search?: string;
        payment_type?: string;
        customer_id?: string;
        specimen_type_id?: string;
        examination_id?: string;
        date_from?: string;
        date_to?: string;
        sort_order?: string;
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

export default function BillingSummaryReportIndex({
    activeInvoices,
    cancelledInvoices,
    paymentDetails,
    totals,
    cancelledTotals,
    filters,
    selectedCustomer,
    specimenTypes,
    examinations,
}: Props) {
    const { props } = usePage() as any;
    const { auth } = props;

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const containerRef1 = useRef<HTMLDivElement>(null);
    const containerRef2 = useRef<HTMLDivElement>(null);

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

        const newFilters: any = {
            ...filters,
            specimen_type_id: typeParam,
            examination_id: examParam,
        };

        router.get(billingSummaryReportIndex().url, newFilters, {
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

        router.get(billingSummaryReportIndex().url, newFilters, {
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

            router.get(billingSummaryReportIndex().url, newFilters, {
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
        window.location.href = `/reports/billing-summary/export?${queryParams.toString()}`;
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

    const handleViewDetails = (invoice: any) => {
        setSelectedInvoice(invoice);
        setIsSheetOpen(true);
    };

    const getPaymentBadge = (type?: string | null) => {
        if (!type) {
            return <span className="text-muted-foreground">N/A</span>;
        }

        switch (type) {
            case 'cash':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                    >
                        Efectivo
                    </Badge>
                );
            case 'card':
            case 'credit card':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
                    >
                        Tarjeta
                    </Badge>
                );
            case 'transfer':
            case 'bank transfer':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-purple-200 bg-purple-50 px-2.5 py-0.5 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-400"
                    >
                        Transferencia
                    </Badge>
                );
            case 'check':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                    >
                        Cheque
                    </Badge>
                );
            case 'credit':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-rose-200 bg-rose-50 px-2.5 py-0.5 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
                    >
                        Al Crédito
                    </Badge>
                );
            default:
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full px-2.5 py-0.5"
                    >
                        {type}
                    </Badge>
                );
        }
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

    return (
        <>
            <Head title="Reporte: Resumen de Facturación" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Reporte: Resumen de Facturación
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Consulte y exporte el resumen de facturas emitidas y
                            anuladas con su respectivo desglose impositivo y de
                            pago.
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
                                        `date_filter_report_billing_summary_user_${userId}`,
                                        JSON.stringify({
                                            range: '14_days',
                                            from: defaultRange.from,
                                            to: defaultRange.to,
                                        }),
                                    );
                                }

                                router.get(
                                    billingSummaryReportIndex().url,
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
                    {/* Row 1: Search and Date Range */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-end">
                        <div className="relative w-full">
                            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por no. factura, cliente, ID/RTN o código muestra..."
                                className="w-full pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex w-full max-w-xs flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Rango de Fechas
                            </span>
                            <DateRangePicker
                                cookieKey="date_filter_report_billing_summary"
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
                                        billingSummaryReportIndex().url,
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                        {/* Payment method */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Método de Pago
                            </span>
                            <Select
                                value={filters.payment_type || 'all'}
                                onValueChange={(val) =>
                                    handleFilterChange('payment_type', val)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Método de Pago" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los métodos
                                    </SelectItem>
                                    <SelectItem value="cash">
                                        Efectivo
                                    </SelectItem>
                                    <SelectItem value="card">
                                        Tarjeta
                                    </SelectItem>
                                    <SelectItem value="transfer">
                                        Transferencia
                                    </SelectItem>
                                    <SelectItem value="check">
                                        Cheque
                                    </SelectItem>
                                    <SelectItem value="credit">
                                        Al Crédito
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

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

                {/* Tabs Layout */}
                <Tabs defaultValue="emitidas" className="mb-24 w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-3">
                        <TabsTrigger value="emitidas">
                            Facturas Emitidas
                        </TabsTrigger>
                        <TabsTrigger value="anuladas">
                            Facturas Anuladas
                        </TabsTrigger>
                        <TabsTrigger value="resumen">
                            Detalles del Pago
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Active Invoices */}
                    <TabsContent value="emitidas" className="space-y-4 pt-4">
                        <div
                            ref={containerRef1}
                            className="rounded-md border bg-card"
                        >
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[145px] text-center whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextOrder =
                                                        (filters.sort_order ||
                                                            'desc') === 'desc'
                                                            ? 'asc'
                                                            : 'desc';
                                                    handleFilterChange(
                                                        'sort_order',
                                                        nextOrder,
                                                    );
                                                }}
                                                className="inline-flex w-full items-center justify-center gap-1 hover:text-foreground focus:outline-none"
                                            >
                                                <span>Fecha Factura</span>
                                                {filters.sort_order ===
                                                'asc' ? (
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                ) : filters.sort_order ===
                                                  'desc' ? (
                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                ) : (
                                                    <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                                                )}
                                            </button>
                                        </TableHead>
                                        <TableHead className="min-w-[145px] text-center whitespace-nowrap">
                                            Fecha Creación
                                        </TableHead>
                                        <TableHead className="min-w-[120px]">
                                            ID/RTN
                                        </TableHead>
                                        <TableHead className="min-w-[200px]">
                                            Cliente/Empresa
                                        </TableHead>
                                        <TableHead className="min-w-[160px] font-mono text-xs">
                                            # Factura
                                        </TableHead>
                                        <TableHead className="min-w-[180px]">
                                            Servicio
                                        </TableHead>
                                        <TableHead className="min-w-[130px] text-center font-mono text-xs">
                                            # Muestra
                                        </TableHead>
                                        <TableHead className="min-w-[140px]">
                                            Usuario
                                        </TableHead>
                                        <TableHead className="min-w-[120px] text-center">
                                            Tipo Pago
                                        </TableHead>
                                        <TableHead className="min-w-[90px] text-right">
                                            ISV 15%
                                        </TableHead>
                                        <TableHead className="min-w-[100px] text-right">
                                            Descuento
                                        </TableHead>
                                        <TableHead className="min-w-[110px] text-right">
                                            Total
                                        </TableHead>
                                        <TableHead className="min-w-[110px] text-right">
                                            Total Pagado
                                        </TableHead>
                                        <TableHead className="w-[60px] text-center">
                                            Ver
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activeInvoices.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={14}
                                                className="h-24 text-center text-muted-foreground"
                                            >
                                                No se encontraron facturas
                                                emitidas.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        activeInvoices.data.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="text-center whitespace-nowrap">
                                                    {row.invoice_date
                                                        ? format(
                                                              new Date(
                                                                  row.invoice_date,
                                                              ),
                                                              'd/M/yy h:mm a',
                                                          )
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-center whitespace-nowrap">
                                                    {row.created_at
                                                        ? format(
                                                              new Date(
                                                                  row.created_at,
                                                              ),
                                                              'd/M/yy h:mm a',
                                                          )
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    {row.customer_id_number}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {row.customer_name}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {row.invoice_number}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant="secondary"
                                                            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                                                        >
                                                            {row.quantity ?? 1}
                                                        </Badge>
                                                        <span>
                                                            {row.service}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-xs">
                                                    {row.specimen_code}
                                                </TableCell>
                                                <TableCell>
                                                    {row.username}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {getPaymentBadge(
                                                        row.payment_type,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    L.{' '}
                                                    {row.isv_15.toLocaleString(
                                                        'es-HN',
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                                    L.{' '}
                                                    {row.discount.toLocaleString(
                                                        'es-HN',
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-primary">
                                                    L.{' '}
                                                    {row.gross_amount.toLocaleString(
                                                        'es-HN',
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    L.{' '}
                                                    {row.net_amount.toLocaleString(
                                                        'es-HN',
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() =>
                                                            handleViewDetails(
                                                                row.invoice,
                                                            )
                                                        }
                                                        title="Ver Factura"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Overall totals summary at bottom of Active list */}
                        {activeInvoices.data.length > 0 && (
                            <div className="flex flex-col items-end gap-2 border-t pt-4 pr-10">
                                <div className="grid grid-cols-2 gap-x-8 text-right text-sm">
                                    <span className="text-muted-foreground">
                                        Total Facturado:
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        L.{' '}
                                        {totals.gross.toLocaleString('es-HN', {
                                            minimumFractionDigits: 2,
                                        })}
                                    </span>
                                    <span className="text-muted-foreground">
                                        Total ISV 15%:
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        L.{' '}
                                        {totals.isv.toLocaleString('es-HN', {
                                            minimumFractionDigits: 2,
                                        })}
                                    </span>
                                    <span className="text-muted-foreground">
                                        Total Descuentos:
                                    </span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                        L.{' '}
                                        {totals.discount.toLocaleString(
                                            'es-HN',
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </span>
                                    <span className="text-muted-foreground">
                                        Pendiente de Pago:
                                    </span>
                                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                                        L.{' '}
                                        {(
                                            totals.gross - totals.net
                                        ).toLocaleString('es-HN', {
                                            minimumFractionDigits: 2,
                                        })}
                                    </span>
                                    <span className="border-t pt-1 font-bold text-primary">
                                        Total Pagado:
                                    </span>
                                    <span className="border-t pt-1 font-bold text-primary">
                                        L.{' '}
                                        {totals.net.toLocaleString('es-HN', {
                                            minimumFractionDigits: 2,
                                        })}
                                    </span>
                                </div>
                            </div>
                        )}

                        <Pagination
                            links={activeInvoices.links}
                            meta={{
                                from: activeInvoices.from,
                                to: activeInvoices.to,
                                total: activeInvoices.total,
                            }}
                        />
                    </TabsContent>

                    {/* Tab 2: Cancelled Invoices */}
                    <TabsContent value="anuladas" className="space-y-4 pt-4">
                        <div
                            ref={containerRef2}
                            className="rounded-md border bg-card"
                        >
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-yellow-500/5 hover:bg-yellow-500/5">
                                        <TableHead className="min-w-[145px] text-center whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextOrder =
                                                        (filters.sort_order ||
                                                            'desc') === 'desc'
                                                            ? 'asc'
                                                            : 'desc';
                                                    handleFilterChange(
                                                        'sort_order',
                                                        nextOrder,
                                                    );
                                                }}
                                                className="inline-flex w-full items-center justify-center gap-1 hover:text-foreground focus:outline-none"
                                            >
                                                <span>Fecha Factura</span>
                                                {filters.sort_order ===
                                                'asc' ? (
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                ) : filters.sort_order ===
                                                  'desc' ? (
                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                ) : (
                                                    <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                                                )}
                                            </button>
                                        </TableHead>
                                        <TableHead className="min-w-[145px] text-center whitespace-nowrap">
                                            Fecha Creación
                                        </TableHead>
                                        <TableHead className="min-w-[120px]">
                                            ID/RTN
                                        </TableHead>
                                        <TableHead className="min-w-[200px]">
                                            Cliente/Empresa
                                        </TableHead>
                                        <TableHead className="min-w-[160px] font-mono text-xs">
                                            # Factura
                                        </TableHead>
                                        <TableHead className="min-w-[180px]">
                                            Servicio
                                        </TableHead>
                                        <TableHead className="min-w-[130px] text-center font-mono text-xs">
                                            # Muestra
                                        </TableHead>
                                        <TableHead className="min-w-[140px]">
                                            Usuario
                                        </TableHead>
                                        <TableHead className="min-w-[120px] text-center">
                                            Tipo Pago
                                        </TableHead>
                                        <TableHead className="min-w-[110px] text-right">
                                            Total Pagado
                                        </TableHead>
                                        <TableHead className="min-w-[90px] text-right">
                                            ISV 15%
                                        </TableHead>
                                        <TableHead className="min-w-[100px] text-right">
                                            Descuento
                                        </TableHead>
                                        <TableHead className="min-w-[110px] text-right">
                                            Total Neto
                                        </TableHead>
                                        <TableHead className="w-[60px] text-center">
                                            Ver
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cancelledInvoices.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={14}
                                                className="h-20 text-center text-muted-foreground"
                                            >
                                                No hay facturas anuladas en este
                                                período.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        cancelledInvoices.data.map((row) => (
                                            <TableRow
                                                key={row.id}
                                                className="bg-yellow-500/[0.01] hover:bg-yellow-500/[0.04]"
                                            >
                                                <TableCell className="text-center whitespace-nowrap">
                                                    {row.invoice_date
                                                        ? format(
                                                              new Date(
                                                                  row.invoice_date,
                                                              ),
                                                              'd/M/yy h:mm a',
                                                          )
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-center whitespace-nowrap">
                                                    {row.created_at
                                                        ? format(
                                                              new Date(
                                                                  row.created_at,
                                                              ),
                                                              'd/M/yy h:mm a',
                                                          )
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    {row.customer_id_number}
                                                </TableCell>
                                                <TableCell className="font-medium text-destructive">
                                                    {row.customer_name}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground line-through">
                                                    {row.invoice_number}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant="secondary"
                                                            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                                                        >
                                                            {row.quantity ?? 1}
                                                        </Badge>
                                                        <span>
                                                            {row.service}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-xs">
                                                    {row.specimen_code}
                                                </TableCell>
                                                <TableCell>
                                                    {row.username}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className="border-yellow-300 bg-yellow-50 px-2 py-0.5 text-yellow-800"
                                                    >
                                                        Anulada
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    L.{' '}
                                                    {row.net_amount.toLocaleString(
                                                        'es-HN',
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    L.{' '}
                                                    {row.isv_15.toLocaleString(
                                                        'es-HN',
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    L.{' '}
                                                    {row.discount.toLocaleString(
                                                        'es-HN',
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-destructive">
                                                    L.{' '}
                                                    {row.gross_amount.toLocaleString(
                                                        'es-HN',
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() =>
                                                            handleViewDetails(
                                                                row.invoice,
                                                            )
                                                        }
                                                        title="Ver Factura Anulada"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Cancelled overall totals */}
                        {cancelledInvoices.data.length > 0 && (
                            <div className="flex flex-col items-end gap-2 border-t pt-4 pr-10">
                                <div className="grid grid-cols-2 gap-x-8 text-right text-sm">
                                    <span className="text-muted-foreground">
                                        Total Facturado Anulado:
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        L.{' '}
                                        {cancelledTotals.gross.toLocaleString(
                                            'es-HN',
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </span>
                                    <span className="text-muted-foreground">
                                        Total ISV Anulado:
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        L.{' '}
                                        {cancelledTotals.isv.toLocaleString(
                                            'es-HN',
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </span>
                                    <span className="text-muted-foreground">
                                        Total Descuentos Anulado:
                                    </span>
                                    <span className="font-semibold text-muted-foreground">
                                        L.{' '}
                                        {cancelledTotals.discount.toLocaleString(
                                            'es-HN',
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </span>
                                    <span className="border-t pt-1 font-bold text-destructive">
                                        Total Pagado Anulado:
                                    </span>
                                    <span className="border-t pt-1 font-bold text-destructive">
                                        L.{' '}
                                        {cancelledTotals.net.toLocaleString(
                                            'es-HN',
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}

                        <Pagination
                            links={cancelledInvoices.links}
                            meta={{
                                from: cancelledInvoices.from,
                                to: cancelledInvoices.to,
                                total: cancelledInvoices.total,
                            }}
                        />
                    </TabsContent>

                    {/* Tab 3: Payment Details Summary */}
                    <TabsContent value="resumen" className="pt-4">
                        <div className="max-w-md rounded-lg border bg-card p-6 shadow-sm">
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
                                <Coins className="h-5 w-5" />
                                Resumen por Método de Pago
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-muted-foreground">
                                        Efectivo
                                    </span>
                                    <span className="font-bold text-foreground">
                                        L.{' '}
                                        {paymentDetails.cash.toLocaleString(
                                            'es-HN',
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-muted-foreground">
                                        Tarjeta
                                    </span>
                                    <span className="font-bold text-foreground">
                                        L.{' '}
                                        {paymentDetails.card.toLocaleString(
                                            'es-HN',
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-muted-foreground">
                                        Cheque
                                    </span>
                                    <span className="font-bold text-foreground">
                                        L.{' '}
                                        {paymentDetails.check.toLocaleString(
                                            'es-HN',
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-muted-foreground">
                                        Transferencia
                                    </span>
                                    <span className="font-bold text-foreground">
                                        L.{' '}
                                        {paymentDetails.transfer.toLocaleString(
                                            'es-HN',
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-muted-foreground">
                                        Al Crédito
                                    </span>
                                    <span className="font-bold text-foreground">
                                        L.{' '}
                                        {paymentDetails.credit.toLocaleString(
                                            'es-HN',
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t-2 pt-2 text-base font-extrabold text-primary">
                                    <span>Total Facturado</span>
                                    <span>
                                        L.{' '}
                                        {paymentDetails.total.toLocaleString(
                                            'es-HN',
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Invoice Detail Sheet Overlay */}
            {selectedInvoice && (
                <InvoiceViewSheet
                    invoice={selectedInvoice}
                    open={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                />
            )}
        </>
    );
}
