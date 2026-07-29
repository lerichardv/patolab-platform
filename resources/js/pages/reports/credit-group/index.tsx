import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import debounce from 'lodash/debounce';
import {
    Eye,
    Search,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    Check,
    Download,
    Layers,
    ChevronRight,
    FileSpreadsheet,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as React from 'react';
import { index as creditGroupReportIndex } from '@/actions/App/Http/Controllers/Reports/CreditGroupReportController';
import AsyncCustomerCombobox from '@/components/async-customer-combobox';
import {
    DateRangePicker,
    setCookie,
    getLast2WeeksRange,
} from '@/components/date-range-picker';
import InvoicePreviewDialog from '@/components/invoice-preview-dialog';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import InvoiceViewSheet from '../../invoices/invoice-view-sheet';
import SpecimenGroupViewSheet from '../../specimens/specimen-group-view-sheet';
import SpecimenViewSheet from '../../specimens/specimen-view-sheet';

interface SpecimenReportItem {
    id: number;
    sequence_code: string;
    customer: number;
    customer_relation?: any;
    type?: any;
    examination?: any;
    group_id?: number | null;
    group?: any;
    invoice_relation?: any;
    invoice_group_specimen?: any;
    created_at: string;
}

interface Props {
    specimens: {
        data: SpecimenReportItem[];
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
        payment_type?: string;
        customer_id?: string;
        specimen_type_id?: string;
        examination_id?: string;
        has_credit?: string;
        date_from?: string;
        date_to?: string;
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
        group_id?: string;
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
    groups?: {
        id: number;
        name: string;
    }[];
}

function FormCombobox({
    options,
    value,
    onChange,
    placeholder,
    emptyMessage = 'No se encontraron resultados.',
    disabled = false,
}: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    emptyMessage?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild className="w-full">
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between text-left font-normal"
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
            >
                <Command>
                    <CommandInput placeholder={`Buscar...`} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4 shrink-0',
                                            value === option.value
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate">
                                        {option.label}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default function CreditGroupReportIndex({
    specimens,
    filters,
    selectedCustomer,
    specimenTypes,
    examinations,
    groups = [],
}: Props) {
    const { props } = usePage() as any;
    const { auth } = props;

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const [selectedSpecimenForView, setSelectedSpecimenForView] = useState<
        any | null
    >(null);
    const [isSpecimenViewSheetOpen, setIsSpecimenViewSheetOpen] =
        useState(false);

    const [selectedGroupForView, setSelectedGroupForView] = useState<
        any | null
    >(null);
    const [isGroupViewSheetOpen, setIsGroupViewSheetOpen] = useState(false);

    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

    const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const [showLeftShadow, setShowLeftShadow] = useState(false);
    const [showRightShadow, setShowRightShadow] = useState(false);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const scrollContainer =
            container.querySelector('.relative.w-full.overflow-auto') ||
            container;

        const handleScroll = () => {
            const scrollLeft = scrollContainer.scrollLeft;
            const scrollWidth = scrollContainer.scrollWidth;
            const clientWidth = scrollContainer.clientWidth;

            setShowLeftShadow(scrollLeft > 2);
            setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 2);
        };

        handleScroll();

        scrollContainer.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);

        return () => {
            scrollContainer.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [specimens.data]);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === 'all' || value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        const userId = auth?.user?.id;

        if (userId) {
            if (key === 'specimen_type_id') {
                setCookie(
                    `specimen_type_filter_report_credit_group_user_${userId}`,
                    value,
                );

                const examId = filters.examination_id || 'all';

                if (value !== 'all' && examId !== 'all') {
                    const hasValidExam = examinations.some(
                        (exam) =>
                            exam.id.toString() === examId &&
                            exam.specimen_type?.toString() === value,
                    );

                    if (!hasValidExam) {
                        delete newFilters.examination_id;
                    }
                } else if (value === 'all') {
                    delete newFilters.examination_id;
                }
            }
        }

        router.get(creditGroupReportIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const handleExport = (format: 'csv' | 'xlsx') => {
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, String(value));
            }
        });
        queryParams.set('format', format);
        window.location.href = `/reports/credit-group/export?${queryParams.toString()}`;
    };

    const handleSort = (field: string) => {
        const isCurrentField =
            filters.sort_field === field ||
            (field === 'date' && !filters.sort_field);
        const direction =
            isCurrentField && filters.sort_direction === 'asc' ? 'desc' : 'asc';

        const newFilters = {
            ...filters,
            sort_field: field,
            sort_direction: direction,
        };

        router.get(creditGroupReportIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const renderSortHeader = (field: string, label: string) => {
        const isSorted =
            filters.sort_field === field ||
            (field === 'date' && !filters.sort_field);
        const direction = isSorted ? filters.sort_direction || 'desc' : null;

        return (
            <button
                onClick={() => handleSort(field)}
                className="group/btn flex items-center gap-1.5 text-left font-semibold transition-colors hover:text-foreground"
            >
                <span>{label}</span>
                {direction === 'asc' ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
                ) : direction === 'desc' ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover/btn:opacity-100" />
                )}
            </button>
        );
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            handleFilterChange('search', value);
        }, 300),
        [filters],
    );

    useEffect(() => {
        if (search !== filters.search) {
            debouncedSearch(search);
        }
    }, [search]);

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
                        Tarjeta de Crédito
                    </Badge>
                );
            case 'transfer':
            case 'bank transfer':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-purple-200 bg-purple-50 px-2.5 py-0.5 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-400"
                    >
                        Transferencia Bancaria
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
                        Crédito
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
            <Head title="Reporte: Agrupación de Créditos" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Reporte: Agrupación de Créditos
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Consulte y exporte cada muestra de forma individual
                            con su información fiscal, cliente, grupo, método de
                            pago y valores monetarios.
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
                                        `date_filter_report_credit_group_user_${userId}`,
                                        JSON.stringify({
                                            range: '14_days',
                                            from: defaultRange.from,
                                            to: defaultRange.to,
                                        }),
                                    );
                                }

                                router.get(
                                    creditGroupReportIndex().url,
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
                            onClick={() => handleExport('xlsx')}
                        >
                            <Download className="h-4 w-4" />
                            <span>Exportar a Excel</span>
                        </Button>
                    </div>
                </div>

                {/* Filters Area - Match invoices list filters structure */}
                <div className="flex w-full flex-col gap-4">
                    {/* Row 1: Search and Date Range */}
                    <div className="flex flex-row items-end justify-stretch gap-3">
                        <div className="relative w-full">
                            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por código muestra, no. factura, cliente o ID/RTN..."
                                className="w-full pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex w-full max-w-[320px] flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Rango de Fechas
                            </span>
                            <DateRangePicker
                                cookieKey={`date_filter_report_credit_group_user_${auth?.user?.id}`}
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
                                        creditGroupReportIndex().url,
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
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                        {/* Payment method */}
                        <div className="flex w-full flex-col gap-1.5">
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
                                        Crédito
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Customer */}
                        <div className="flex w-full flex-col gap-1.5">
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

                        {/* Credit Status */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                ¿Tiene Crédito?
                            </span>
                            <Select
                                value={filters.has_credit || 'all'}
                                onValueChange={(val) =>
                                    handleFilterChange('has_credit', val)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Crédito" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="yes">
                                        Con Crédito
                                    </SelectItem>
                                    <SelectItem value="no">
                                        Sin Crédito
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Specimen Type */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Tipo de Muestra
                            </span>
                            <Select
                                value={filters.specimen_type_id || 'all'}
                                onValueChange={(val) =>
                                    handleFilterChange('specimen_type_id', val)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Tipo de Muestra" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los tipos
                                    </SelectItem>
                                    {specimenTypes.map((type) => (
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

                        {/* Examination */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Examen / Análisis
                            </span>
                            <FormCombobox
                                options={examinationOptions}
                                value={filters.examination_id || 'all'}
                                onChange={(val) =>
                                    handleFilterChange('examination_id', val)
                                }
                                placeholder="Todos los exámenes"
                            />
                        </div>

                        {/* Group Filter */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Grupo
                            </span>
                            <Popover
                                open={isGroupFilterOpen}
                                onOpenChange={setIsGroupFilterOpen}
                            >
                                <PopoverTrigger asChild className="w-full">
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isGroupFilterOpen}
                                        className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="truncate">
                                                {(filters.group_id || 'all') ===
                                                'all'
                                                    ? 'Todos los grupos'
                                                    : (() => {
                                                          const g =
                                                              groups?.find(
                                                                  (g) =>
                                                                      g.id.toString() ===
                                                                      filters.group_id,
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
                                    className="w-[--radix-popover-trigger-width] p-0"
                                    align="start"
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
                                                        handleFilterChange(
                                                            'group_id',
                                                            'all',
                                                        );
                                                        setIsGroupFilterOpen(
                                                            false,
                                                        );
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            (filters.group_id ||
                                                                'all') === 'all'
                                                                ? 'opacity-100'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                    Todos los grupos
                                                </CommandItem>
                                                {groups?.map((group) => (
                                                    <CommandItem
                                                        key={group.id}
                                                        value={`${group.name} - ${group.id}`}
                                                        onSelect={() => {
                                                            handleFilterChange(
                                                                'group_id',
                                                                group.id.toString(),
                                                            );
                                                            setIsGroupFilterOpen(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-4 w-4',
                                                                filters.group_id ===
                                                                    group.id.toString()
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )}
                                                        />
                                                        {group.name} (#
                                                        {group.id})
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>

                {/* Table Container - Style consistency with invoices/index.tsx */}
                <div ref={containerRef} className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead
                                    className={`pointer-events-none z-10 w-[150px] min-w-[150px] border-r border-border bg-card after:top-0 after:right-[-8px] after:bottom-0 after:hidden after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent after:transition-opacity after:duration-200 md:sticky md:left-0 md:after:absolute dark:after:from-black/[0.2] ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}
                                >
                                    {renderSortHeader(
                                        'specimen_code',
                                        'Muestra / Fecha',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[200px] pl-5">
                                    {renderSortHeader('customer', 'Cliente')}
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    <span>No. Factura</span>
                                </TableHead>
                                <TableHead className="min-w-[220px]">
                                    <span>Detalle Muestra</span>
                                </TableHead>
                                <TableHead className="min-w-[180px]">
                                    <span>Grupo / Agrupación</span>
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    {renderSortHeader(
                                        'payment_method',
                                        'Método Pago',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex">Crédito</div>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        Total Muestra
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        Total Pagado
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        Saldo Pendiente
                                    </div>
                                </TableHead>
                                <TableHead className="z-10 w-[80px] min-w-[80px] bg-card text-right md:sticky md:right-0">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {specimens.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={11}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        No se encontraron registros que
                                        coincidan con los filtros.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                specimens.data.map((specimen) => {
                                    const invoice =
                                        specimen.invoice_relation ||
                                        specimen.invoice_group_specimen
                                            ?.invoice;
                                    const igs = specimen.invoice_group_specimen;

                                    const total = Number(
                                        igs
                                            ? igs.total
                                            : invoice
                                              ? invoice.total
                                              : 0,
                                    );
                                    const paid = Number(
                                        invoice ? invoice.total_paid : 0,
                                    );
                                    const remaining = Math.max(0, total - paid);

                                    const customerName =
                                        specimen.customer_relation?.name ||
                                        'Cliente general';
                                    const customerIdNum =
                                        specimen.customer_relation?.id_number;

                                    return (
                                        <TableRow
                                            key={specimen.id}
                                            className="group hover:bg-muted/50"
                                        >
                                            {/* Specimen Code and Date */}
                                            <TableCell
                                                className={`pointer-events-none z-10 w-[200px] min-w-[200px] border-r border-border bg-card transition-colors group-hover:bg-muted after:top-0 after:right-[-8px] after:bottom-0 after:hidden after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent after:transition-opacity after:duration-200 md:sticky md:left-0 md:after:absolute dark:after:from-black/[0.2] ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSpecimenForView(
                                                                specimen,
                                                            );
                                                            setIsSpecimenViewSheetOpen(
                                                                true,
                                                            );
                                                        }}
                                                        className="text-left font-mono text-sm font-semibold text-primary hover:underline"
                                                    >
                                                        {specimen.sequence_code ||
                                                            'N/A'}
                                                    </button>
                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                        <span>
                                                            {specimen.created_at
                                                                ? format(
                                                                      new Date(
                                                                          specimen.created_at,
                                                                      ),
                                                                      'dd/MM/yyyy',
                                                                      {
                                                                          locale: es,
                                                                      },
                                                                  )
                                                                : 'N/A'}
                                                        </span>
                                                        <span className="font-mono text-[9px] text-muted-foreground/80 before:mr-1 before:content-['•']">
                                                            {specimen.created_at
                                                                ? format(
                                                                      new Date(
                                                                          specimen.created_at,
                                                                      ),
                                                                      'h:mm a',
                                                                      {
                                                                          locale: es,
                                                                      },
                                                                  )
                                                                : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Customer name / ID */}
                                            <TableCell className="min-w-[200px] pl-5">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground">
                                                        {customerName}
                                                    </span>
                                                    {customerIdNum && (
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            {customerIdNum}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Invoice code */}
                                            <TableCell className="min-w-[200px] font-mono text-xs font-semibold">
                                                {invoice?.full_invoice_number ||
                                                    (invoice
                                                        ? `#${invoice.id}`
                                                        : 'N/A')}
                                            </TableCell>

                                            {/* Detail/Specimen properties */}
                                            <TableCell className="min-w-[220px]">
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-medium text-foreground">
                                                        {specimen.type?.name ||
                                                            'N/A'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {specimen.examination
                                                            ?.name || 'N/A'}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Group details */}
                                            <TableCell className="min-w-[180px]">
                                                {specimen.group_id ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-max rounded border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
                                                            {specimen.group
                                                                ?.name ||
                                                                `Grupo #${specimen.group_id}`}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 hover:bg-muted"
                                                            onClick={() => {
                                                                setSelectedGroupForView(
                                                                    specimen.group,
                                                                );
                                                                setIsGroupViewSheetOpen(
                                                                    true,
                                                                );
                                                            }}
                                                            title="Ver Grupo"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">
                                                        N/A
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Payment method badge */}
                                            <TableCell className="min-w-[150px]">
                                                {getPaymentBadge(
                                                    invoice?.payment_type,
                                                )}
                                            </TableCell>

                                            {/* Credit details */}
                                            <TableCell className="min-w-[120px]">
                                                {invoice?.credit_payment_id ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-max rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                            Sí (#
                                                            {
                                                                invoice.credit_payment_id
                                                            }
                                                            )
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 hover:bg-muted"
                                                            onClick={() =>
                                                                router.get(
                                                                    '/credits',
                                                                    {
                                                                        search: String(
                                                                            invoice.credit_payment_id ||
                                                                                '',
                                                                        ),
                                                                    },
                                                                )
                                                            }
                                                            title="Ver Crédito"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        No
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Specimen Total price */}
                                            <TableCell className="min-w-[120px] text-right font-medium text-muted-foreground">
                                                L.{' '}
                                                {total.toLocaleString('es-HN', {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </TableCell>

                                            {/* Paid total */}
                                            <TableCell className="min-w-[120px] text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                L.{' '}
                                                {paid.toLocaleString('es-HN', {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </TableCell>

                                            {/* Saldo pendiente */}
                                            <TableCell className="min-w-[120px] text-right font-semibold text-primary">
                                                <span
                                                    className={cn(
                                                        remaining > 0
                                                            ? 'text-amber-600'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    L.{' '}
                                                    {remaining.toLocaleString(
                                                        'es-HN',
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}
                                                </span>
                                            </TableCell>

                                            {/* Actions column */}
                                            <TableCell className="z-10 w-[80px] min-w-[80px] bg-card text-right transition-colors group-hover:bg-muted md:sticky md:right-0">
                                                <div className="flex justify-end gap-2">
                                                    {invoice ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleViewDetails(
                                                                    invoice,
                                                                )
                                                            }
                                                            title="Ver Detalle de Factura"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedSpecimenForView(
                                                                    specimen,
                                                                );
                                                                setIsSpecimenViewSheetOpen(
                                                                    true,
                                                                );
                                                            }}
                                                            title="Ver Detalle de Muestra"
                                                        >
                                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <Pagination
                    links={specimens.links}
                    meta={{
                        from: specimens.from,
                        to: specimens.to,
                        total: specimens.total,
                    }}
                />
            </div>

            {/* Invoice View Sheet */}
            {selectedInvoice && (
                <InvoiceViewSheet
                    invoice={selectedInvoice}
                    open={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                />
            )}

            {/* Specimen View Sheet */}
            {selectedSpecimenForView && (
                <SpecimenViewSheet
                    specimen={selectedSpecimenForView}
                    open={isSpecimenViewSheetOpen}
                    onOpenChange={setIsSpecimenViewSheetOpen}
                />
            )}

            {/* Group View Sheet */}
            {selectedGroupForView && (
                <SpecimenGroupViewSheet
                    group={selectedGroupForView}
                    open={isGroupViewSheetOpen}
                    onOpenChange={setIsGroupViewSheetOpen}
                />
            )}

            {/* Invoice PDF Preview Dialog */}
            {showInvoiceModal && invoiceUrl && (
                <InvoicePreviewDialog
                    open={showInvoiceModal}
                    onOpenChange={setShowInvoiceModal}
                    invoiceUrl={invoiceUrl}
                />
            )}
        </>
    );
}
