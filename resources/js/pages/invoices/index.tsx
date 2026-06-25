import { Head, router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import debounce from 'lodash/debounce';
import {
    Eye,
    Edit2,
    Search,
    Receipt,
    CreditCard,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    Check,
    Download,
    Plus,
    Layers,
    FileImage,
    FileText,
    ExternalLink,
    Clock,
    User,
    Tag,
    AlertCircle,
    Coins,
    Microscope,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as React from 'react';
import { index as invoicesIndex } from '@/actions/App/Http/Controllers/InvoiceController';
import { index as rentalsIndex } from '@/actions/App/Http/Controllers/RentalController';
import {
    DateRangePicker,
    setCookie,
    getLast2WeeksRange,
} from '@/components/date-range-picker';
import HeadingSheet from '@/components/heading-sheet';
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
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import SpecimenGroupSheet from '../specimens/specimen-group-sheet';
import SpecimenGroupViewSheet from '../specimens/specimen-group-view-sheet';
import SpecimenSheet from '../specimens/specimen-sheet';
import SpecimenViewSheet from '../specimens/specimen-view-sheet';
import InvoiceSheet from './invoice-sheet';
import InvoiceViewSheet from './invoice-view-sheet';

interface Invoice {
    id: number;
    full_invoice_number: string;
    invoice_number: number;
    cai_range_id: number;
    cai_range: any;
    customer_id: number;
    customer: any;
    specimen_id: number;
    specimen: any;
    invoice_type?: string | null;
    rental_id?: number | null;
    rental?: { id: number; name: string; description?: string } | null;
    payment_type:
        | 'cash'
        | 'card'
        | 'credit card'
        | 'transfer'
        | 'bank transfer'
        | 'credit'
        | 'check';
    credit_payment_id: number | null;
    credit_relation: any;
    amount: string | number;
    discount: string | number;
    subtotal: string | number;
    exempt_amount: string | number;
    total: string | number;
    total_paid: string | number;
    proof_of_payment: string | null;
    invoice_file: string | null;
    created_at: string;
    group?: any;
    quantity?: number;
    age_discount_type?: string | null;
    age_discount_amount?: string | number | null;
    isv_15?: string | number | null;
}

interface Props {
    invoices: {
        data: Invoice[];
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
        status?: string;
        examination_id?: string;
        has_credit?: string;
        date_from?: string;
        date_to?: string;
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
        group_id?: string;
        invoice_type?: string;
    };
    customers: {
        id: number;
        name: string;
        id_number: string;
    }[];
    specimenTypes: {
        id: number;
        name: string;
    }[];
    banks: {
        id: number;
        name: string;
    }[];
    examinations: any[];
    groups?: {
        id: number;
        name: string;
    }[];
    categories: any[];
    referrers: any[];
    referrerTypes: any[];
    priorities: any[];
    locations: any[];
    sequences: any[];
    activeLocationId: number | null;
    products: any[];
    settings?: Record<string, string>;
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

const ALL_STATUSES = [
    {
        value: 'active',
        label: 'Activas (Recibida, Rev. Macro, Proceso, Rev. Micro)',
    },
    { value: 'received', label: 'Recibida' },
    { value: 'macroscopic_review', label: 'Rev. Macroscópica' },
    { value: 'processing', label: 'En Proceso' },
    { value: 'microscopic_review', label: 'Rev. Microscópica' },
    { value: 'finalized', label: 'Finalizada' },
    { value: 'delivered', label: 'Entregada' },
    { value: 'cancelled', label: 'Cancelada' },
];

export default function InvoicesIndex({
    invoices,
    filters,
    customers,
    specimenTypes,
    banks,
    examinations,
    categories,
    referrers,
    referrerTypes,
    priorities,
    locations,
    sequences,
    activeLocationId,
    products,
    groups,
    settings,
}: Props) {
    const { props } = usePage() as any;
    const { auth } = props;
    const flash = props.flash || {};

    const filteredExaminationsForDropdown = useMemo(() => {
        const specTypeId = filters.specimen_type_id || 'all';
        if (specTypeId === 'all') {
            return examinations;
        }

        return examinations.filter(
            (exam) => exam.specimen_type?.toString() === specTypeId,
        );
    }, [examinations, filters.specimen_type_id]);
    const canCreateSpecimen = auth.permissions?.includes('specimens.create');
    const canViewSpecimen = auth.permissions?.includes('specimens.view');
    const canEditSpecimen = auth.permissions?.includes('specimens.edit');
    const canManageInvoices = auth.permissions?.includes('invoices.manage');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(
        null,
    );
    const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const [isSpecimenSheetOpen, setIsSpecimenSheetOpen] = useState(false);
    const [selectedSpecimen, setSelectedSpecimen] = useState<any | null>(null);
    const [selectedSpecimenForView, setSelectedSpecimenForView] = useState<
        any | null
    >(null);
    const [isSpecimenViewSheetOpen, setIsSpecimenViewSheetOpen] =
        useState(false);

    const [selectedGroupForView, setSelectedGroupForView] = useState<
        any | null
    >(null);
    const [isGroupViewSheetOpen, setIsGroupViewSheetOpen] = useState(false);
    const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
    const [isGroupSheetOpen, setIsGroupSheetOpen] = useState(false);

    useEffect(() => {
        if (flash.new_specimen_id) {
            const specId = parseInt(flash.new_specimen_id);
            const foundInvoice = invoices.data.find(
                (inv) => inv.specimen_id === specId,
            );

            if (foundInvoice && foundInvoice.specimen) {
                const specimenWithInvoice = {
                    ...foundInvoice.specimen,
                    invoice_relation: {
                        ...foundInvoice,
                        specimen: undefined,
                    },
                };
                setIsSpecimenSheetOpen(false);
                setSelectedSpecimen(null);
                setSelectedSpecimenForView(specimenWithInvoice);
                setIsSpecimenViewSheetOpen(true);
            }
        }
    }, [flash.new_specimen_id, invoices.data]);

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
    }, [invoices.data]);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === 'all' || value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        const userId = auth?.user?.id;
        if (userId) {
            if (key === 'status') {
                setCookie(`status_filter_invoices_user_${userId}`, value);
            } else if (key === 'specimen_type_id') {
                setCookie(
                    `specimen_type_filter_invoices_user_${userId}`,
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
                        setCookie(
                            `examination_filter_invoices_user_${userId}`,
                            'all',
                        );
                    }
                } else if (value === 'all') {
                    delete newFilters.examination_id;
                    setCookie(
                        `examination_filter_invoices_user_${userId}`,
                        'all',
                    );
                }
            } else if (key === 'examination_id') {
                setCookie(`examination_filter_invoices_user_${userId}`, value);
            }
        }

        router.get(invoicesIndex().url, newFilters, {
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
        window.location.href = `/invoices/export?${queryParams.toString()}`;
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

        router.get(invoicesIndex().url, newFilters, {
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

    const handleViewDetails = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setIsSheetOpen(true);
    };

    const handleEditDetails = (invoice: Invoice) => {
        setInvoiceToEdit(invoice);
        setIsEditSheetOpen(true);
    };

    const getPaymentTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            cash: 'Efectivo',
            card: 'Tarjeta de Crédito',
            'credit card': 'Tarjeta de Crédito',
            transfer: 'Transferencia Bancaria',
            'bank transfer': 'Transferencia Bancaria',
            check: 'Cheque',
            credit: 'Crédito',
        };

        return labels[type] || type;
    };

    const getPaymentBadge = (type: string) => {
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

    const getInvoiceTypeBadge = (type: string | null | undefined) => {
        if (type === 'specimen') {
            return (
                <Badge
                    variant="outline"
                    className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
                >
                    Muestra
                </Badge>
            );
        }

        if (type === 'rental') {
            return (
                <Badge
                    variant="outline"
                    className="rounded-full border-sky-200 bg-sky-50 px-2.5 py-0.5 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-400"
                >
                    Otro Cobro
                </Badge>
            );
        }

        return (
            <Badge
                variant="outline"
                className="rounded-full border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-400"
            >
                Pago de crédito
            </Badge>
        );
    };

    return (
        <>
            <Head title="Facturas de Muestras" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Receipt className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Facturación
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Administre y consulte las facturas fiscales y
                            transacciones emitidas en el laboratorio.
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
                                        `status_filter_invoices_user_${userId}`,
                                        'active',
                                    );
                                    setCookie(
                                        `specimen_type_filter_invoices_user_${userId}`,
                                        'all',
                                    );
                                    setCookie(
                                        `examination_filter_invoices_user_${userId}`,
                                        'all',
                                    );
                                    setCookie(
                                        `date_filter_invoices_user_${userId}`,
                                        JSON.stringify(defaultRange),
                                    );
                                }
                                router.get(
                                    invoicesIndex().url,
                                    {},
                                    {
                                        preserveState: false,
                                    },
                                );
                            }}
                        >
                            Limpiar filtros
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-10 gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Exportar</span>
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                    onClick={() => handleExport('csv')}
                                >
                                    Exportar a CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleExport('xlsx')}
                                >
                                    Exportar a Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {canCreateSpecimen && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="h-10 gap-2">
                                        <Plus className="h-4 w-4" />
                                        <span>Nueva Muestra</span>
                                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-56"
                                >
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedSpecimen(null);
                                            setIsSpecimenSheetOpen(true);
                                        }}
                                    >
                                        <Microscope className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <span>Muestra Individual</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setIsGroupSheetOpen(true)
                                        }
                                    >
                                        <Layers className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <span>Grupo de Muestras</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Filters Area - Search on Row 1, other filters on Row 2 */}
                <div className="flex w-full flex-col gap-4">
                    {/* Row 1: Search */}
                    <div className="flex flex-row items-end justify-stretch gap-3">
                        <div className="relative w-full">
                            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por Nº Factura, cliente, RTN o muestra..."
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
                                cookieKey="date_filter_invoices"
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
                                        invoicesIndex().url,
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
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Método de Pago
                            </span>
                            <Select
                                value={filters.payment_type || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('payment_type', v)
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
                                    <SelectItem value="credit card">
                                        Tarjeta
                                    </SelectItem>
                                    <SelectItem value="bank transfer">
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
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Cliente
                            </span>
                            <FormCombobox
                                placeholder="Todos los clientes"
                                value={filters.customer_id || 'all'}
                                onChange={(v) =>
                                    handleFilterChange('customer_id', v)
                                }
                                options={[
                                    {
                                        label: 'Todos los clientes',
                                        value: 'all',
                                    },
                                    ...customers.map((c) => ({
                                        label: c.name,
                                        value: c.id.toString(),
                                    })),
                                ]}
                            />
                        </div>
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Estado de Muestra
                            </span>
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('status', v)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Estado de Muestra" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los estados
                                    </SelectItem>
                                    {ALL_STATUSES.map((status) => (
                                        <SelectItem
                                            key={status.value}
                                            value={status.value}
                                        >
                                            {status.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Tipo de Muestra
                            </span>
                            <Select
                                value={filters.specimen_type_id || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('specimen_type_id', v)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Tipo de Muestra" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los tipos
                                    </SelectItem>
                                    {specimenTypes.map((st) => (
                                        <SelectItem
                                            key={st.id}
                                            value={st.id.toString()}
                                        >
                                            {st.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Examen
                            </span>
                            <Select
                                value={filters.examination_id || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('examination_id', v)
                                }
                                disabled={
                                    filters.specimen_type_id === 'all' ||
                                    !filters.specimen_type_id
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Examen" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los exámenes
                                    </SelectItem>
                                    {filteredExaminationsForDropdown.map(
                                        (exam) => (
                                            <SelectItem
                                                key={exam.id}
                                                value={exam.id.toString()}
                                            >
                                                {exam.name}
                                            </SelectItem>
                                        ),
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-medium font-semibold text-muted-foreground">
                                ¿Tiene Crédito?
                            </span>
                            <Select
                                value={filters.has_credit || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('has_credit', v)
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
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Tipo de Factura
                            </span>
                            <Select
                                value={filters.invoice_type || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('invoice_type', v)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Tipo de Factura" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los tipos
                                    </SelectItem>
                                    <SelectItem value="specimen">
                                        Muestra
                                    </SelectItem>
                                    <SelectItem value="rental">
                                        Otro Cobro
                                    </SelectItem>
                                    <SelectItem value="credit payment">
                                        Pago de Crédito
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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

                {/* Table - Consistent with customer layout */}
                <div ref={containerRef} className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead
                                    className={`pointer-events-none z-10 w-[150px] min-w-[150px] border-r border-border bg-card after:top-0 after:right-[-8px] after:bottom-0 after:hidden after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent after:transition-opacity after:duration-200 md:sticky md:left-0 md:after:absolute dark:after:from-black/[0.2] ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}
                                >
                                    {renderSortHeader('date', 'Número / Fecha')}
                                </TableHead>
                                <TableHead className="min-w-[200px] pl-5">
                                    {renderSortHeader('customer', 'Cliente')}
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    {renderSortHeader(
                                        'payment_method',
                                        'Método de Pago',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[220px]">
                                    {renderSortHeader(
                                        'specimen_code',
                                        'Tipo de factura',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[220px]">
                                    {renderSortHeader(
                                        'specimen_code',
                                        'Detalle',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex">Crédito</div>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        Precio
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[100px] text-right">
                                    <div className="flex justify-end">
                                        Cantidad
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        Subtotal
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[150px] text-right">
                                    <div className="flex justify-end">
                                        Descuento
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        ISV 15%
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        Total Factura
                                    </div>
                                </TableHead>

                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        Total Pagado
                                    </div>
                                </TableHead>
                                <TableHead className="z-10 w-[80px] min-w-[80px] bg-card text-right md:sticky md:right-0">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.data.length > 0 ? (
                                invoices.data.map((invoice) => (
                                    <TableRow
                                        key={invoice.id}
                                        className="group"
                                    >
                                        <TableCell
                                            className={`pointer-events-none z-10 w-[150px] min-w-[150px] border-r border-border bg-card transition-colors group-hover:bg-muted after:top-0 after:right-[-8px] after:bottom-0 after:hidden after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent after:transition-opacity after:duration-200 md:sticky md:left-0 md:after:absolute dark:after:from-black/[0.2] ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-mono text-sm font-semibold text-foreground">
                                                    {
                                                        invoice.full_invoice_number
                                                    }
                                                </span>
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <span>
                                                        {invoice.created_at
                                                            ? format(
                                                                  new Date(
                                                                      invoice.created_at,
                                                                  ),
                                                                  'dd/MM/yyyy',
                                                                  {
                                                                      locale: es,
                                                                  },
                                                              )
                                                            : 'N/A'}
                                                    </span>
                                                    <span className="font-mono text-[9px] text-muted-foreground/80 before:mr-1 before:content-['•']">
                                                        {invoice.created_at
                                                            ? format(
                                                                  new Date(
                                                                      invoice.created_at,
                                                                  ),
                                                                  'HH:mm a',
                                                                  {
                                                                      locale: es,
                                                                  },
                                                              )
                                                            : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-[200px] pl-5">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-medium text-foreground">
                                                        {invoice.customer
                                                            ?.name || 'N/A'}
                                                    </span>
                                                </div>
                                                {invoice.customer
                                                    ?.id_number && (
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {
                                                            invoice.customer
                                                                .id_number
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-[150px]">
                                            <div className="flex items-center gap-1.5">
                                                {getPaymentBadge(
                                                    invoice.payment_type,
                                                )}
                                                {/* {invoice.payment_type ===
													'credit' &&
													invoice.credit_payment_id && (
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
													)} */}
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-[200px] pl-5">
                                            <div className="flex items-center gap-1.5">
                                                {getInvoiceTypeBadge(
                                                    invoice.invoice_type,
                                                )}
                                                {/* {invoice.invoice_type ===
													'credit payment' &&
													invoice.credit_payment_id && (
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
													)} */}
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-[220px]">
                                            <div className="flex max-w-[220px] flex-col gap-1.5 text-xs">
                                                {/* Detalle principal (Grupo, Otro Cobro o Muestra) */}
                                                {invoice.group ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-max rounded border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
                                                                {
                                                                    invoice
                                                                        .group
                                                                        .name
                                                                }
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 hover:bg-muted"
                                                                onClick={() => {
                                                                    setSelectedGroupForView(
                                                                        {
                                                                            ...invoice.group,
                                                                            invoice:
                                                                                invoice,
                                                                        },
                                                                    );
                                                                    setIsGroupViewSheetOpen(
                                                                        true,
                                                                    );
                                                                }}
                                                                title="Ver Grupo de Muestras"
                                                            >
                                                                <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger
                                                                    asChild
                                                                >
                                                                    <button
                                                                        data-slot="button"
                                                                        className="inline-flex h-5 w-8 items-center justify-center gap-0.5 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                                                                        title="Editar Muestra"
                                                                    >
                                                                        <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                                        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent
                                                                    align="start"
                                                                    className="w-64"
                                                                >
                                                                    {invoice.group.specimens?.map(
                                                                        (
                                                                            specimen: any,
                                                                        ) => (
                                                                            <DropdownMenuItem
                                                                                key={
                                                                                    specimen.id
                                                                                }
                                                                                onClick={() => {
                                                                                    const specimenWithInvoice =
                                                                                        {
                                                                                            ...specimen,
                                                                                            invoice_relation:
                                                                                                {
                                                                                                    ...invoice,
                                                                                                    specimen:
                                                                                                        undefined,
                                                                                                },
                                                                                        };
                                                                                    setSelectedSpecimen(
                                                                                        specimenWithInvoice,
                                                                                    );
                                                                                    setIsSpecimenSheetOpen(
                                                                                        true,
                                                                                    );
                                                                                }}
                                                                                className="group cursor-pointer"
                                                                            >
                                                                                <div className="flex w-full flex-col gap-0.5">
                                                                                    <span className="font-mono text-xs font-semibold text-primary transition-colors group-hover:text-white group-focus:text-white">
                                                                                        {specimen.sequence_code ||
                                                                                            'Sin código'}
                                                                                    </span>
                                                                                    <span className="truncate text-[10px] text-muted-foreground transition-colors group-hover:text-white/90 group-focus:text-white/90">
                                                                                        {specimen
                                                                                            .customer_relation
                                                                                            ?.name ||
                                                                                            invoice
                                                                                                .customer
                                                                                                ?.name ||
                                                                                            'Sin cliente'}
                                                                                    </span>
                                                                                </div>
                                                                            </DropdownMenuItem>
                                                                        ),
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Grupo de Muestras (
                                                            {invoice.group
                                                                .specimens
                                                                ?.length ||
                                                                0}{' '}
                                                            muestras)
                                                        </span>
                                                    </div>
                                                ) : invoice.invoice_type ===
                                                      'rental' &&
                                                  invoice.rental ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-max rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                                                {
                                                                    invoice
                                                                        .rental
                                                                        .name
                                                                }
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 hover:bg-muted"
                                                                onClick={() =>
                                                                    router.visit(
                                                                        `${rentalsIndex().url}?search=${encodeURIComponent(invoice.rental!.name)}`,
                                                                    )
                                                                }
                                                                title="Ver en Otros Cobros"
                                                            >
                                                                <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                            </Button>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Otro Cobro
                                                        </span>
                                                    </div>
                                                ) : invoice.specimen ? (
                                                    <div className="flex flex-col gap-1">
                                                        {invoice.specimen
                                                            .sequence_code && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-max rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary dark:bg-primary/10">
                                                                    {
                                                                        invoice
                                                                            .specimen
                                                                            .sequence_code
                                                                    }
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-5 w-5 hover:bg-muted"
                                                                    onClick={() => {
                                                                        const specimenWithInvoice =
                                                                            {
                                                                                ...invoice.specimen,
                                                                                invoice_relation:
                                                                                    {
                                                                                        ...invoice,
                                                                                        specimen:
                                                                                            undefined,
                                                                                    },
                                                                            };
                                                                        setSelectedSpecimenForView(
                                                                            specimenWithInvoice,
                                                                        );
                                                                        setIsSpecimenViewSheetOpen(
                                                                            true,
                                                                        );
                                                                    }}
                                                                    title="Ver Muestra"
                                                                >
                                                                    <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-5 w-5 hover:bg-muted"
                                                                    onClick={() => {
                                                                        const specimenWithInvoice =
                                                                            {
                                                                                ...invoice.specimen,
                                                                                invoice_relation:
                                                                                    {
                                                                                        ...invoice,
                                                                                        specimen:
                                                                                            undefined,
                                                                                    },
                                                                            };
                                                                        setSelectedSpecimen(
                                                                            specimenWithInvoice,
                                                                        );
                                                                        setIsSpecimenSheetOpen(
                                                                            true,
                                                                        );
                                                                    }}
                                                                    title="Editar Muestra"
                                                                >
                                                                    <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                        <span
                                                            className="text-[10px] text-muted-foreground"
                                                            title={
                                                                invoice.specimen
                                                                    .type?.name
                                                            }
                                                        >
                                                            {
                                                                invoice.specimen
                                                                    .type?.name
                                                            }{' '}
                                                            -{' '}
                                                            {
                                                                invoice.specimen
                                                                    .examination
                                                                    ?.name
                                                            }
                                                        </span>
                                                    </div>
                                                ) : (
                                                    invoice.invoice_type !==
                                                        'credit payment' && (
                                                        <span className="text-xs text-muted-foreground italic">
                                                            N/A
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {/* Información del Crédito (si aplica) */}
                                            {(invoice.invoice_type ===
                                                'credit payment' ||
                                                invoice.payment_type ===
                                                    'credit') && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-max rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                        Crédito #
                                                        {
                                                            invoice.credit_payment_id
                                                        }
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
                                            )}
                                        </TableCell>
                                        <TableCell className="min-w-[120px] text-right font-medium text-muted-foreground">
                                            L.{' '}
                                            {parseFloat(
                                                String(invoice.amount || 0),
                                            ).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="min-w-[100px] text-right font-medium text-muted-foreground">
                                            {invoice.quantity ?? 1}
                                        </TableCell>
                                        <TableCell className="min-w-[120px] text-right font-medium text-muted-foreground">
                                            L.{' '}
                                            {parseFloat(
                                                String(invoice.subtotal || 0),
                                            ).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="min-w-[150px] text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-medium text-muted-foreground">
                                                    L.{' '}
                                                    {parseFloat(
                                                        String(
                                                            invoice.discount ||
                                                                0,
                                                        ),
                                                    ).toFixed(2)}
                                                </span>
                                                {invoice.age_discount_type && (
                                                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                                        {invoice.age_discount_type ===
                                                        'third'
                                                            ? 'Tercera Edad'
                                                            : 'Cuarta Edad'}
                                                        {parseFloat(
                                                            String(
                                                                invoice.age_discount_amount ||
                                                                    0,
                                                            ),
                                                        ) > 0 &&
                                                            ` (-L. ${parseFloat(String(invoice.age_discount_amount)).toFixed(2)})`}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-[120px] text-right font-medium text-muted-foreground">
                                            L.{' '}
                                            {parseFloat(
                                                String(invoice.isv_15 || 0),
                                            ).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="min-w-[120px] pr-6 text-right font-bold text-primary">
                                            L.{' '}
                                            {parseFloat(
                                                String(invoice.total),
                                            ).toFixed(2)}
                                        </TableCell>
                                        <TableCell
                                            className={`pointer-events-none z-10 w-[100px] min-w-[100px] border-l border-border bg-card text-right font-bold text-emerald-600 transition-colors group-hover:bg-muted before:top-0 before:bottom-0 before:left-[-8px] before:hidden before:w-[8px] before:bg-gradient-to-r before:from-transparent before:to-black/[0.06] before:transition-opacity before:duration-200 md:sticky md:right-[80px] md:before:absolute dark:text-emerald-400 dark:before:to-black/[0.2] ${showRightShadow ? 'before:opacity-100' : 'before:opacity-0'}`}
                                        >
                                            L.{' '}
                                            {parseFloat(
                                                String(invoice.total_paid || 0),
                                            ).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="z-10 w-[80px] min-w-[80px] bg-card text-right transition-colors group-hover:bg-muted md:sticky md:right-0">
                                            <div className="flex justify-end gap-2">
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
                                                {canManageInvoices && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleEditDetails(
                                                                invoice,
                                                            )
                                                        }
                                                        title="Editar Factura"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={10}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No se encontraron facturas fiscales
                                        registradas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <Pagination
                    links={invoices.links}
                    meta={{
                        from: invoices.from,
                        to: invoices.to,
                        total: invoices.total,
                    }}
                />
            </div>

            {/* Premium Wide Viewer Sheet */}
            <InvoiceViewSheet
                invoice={selectedInvoice}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            {/* Invoice Editor Sheet */}
            <InvoiceSheet
                invoice={invoiceToEdit}
                open={isEditSheetOpen}
                onOpenChange={setIsEditSheetOpen}
                customers={customers}
                banks={banks}
                specimenTypes={specimenTypes}
                settings={settings}
            />

            {/* Specimen Sheets */}
            <SpecimenSheet
                specimen={selectedSpecimen}
                open={isSpecimenSheetOpen}
                onOpenChange={(open) => {
                    setIsSpecimenSheetOpen(open);

                    if (!open) {
                        setSelectedSpecimen(null);
                    }
                }}
                customers={customers}
                specimenTypes={specimenTypes}
                examinations={examinations}
                categories={categories}
                referrers={referrers}
                referrerTypes={referrerTypes}
                priorities={priorities}
                locations={locations}
                sequences={sequences}
                activeLocationId={activeLocationId}
                products={products}
                banks={banks}
            />

            <SpecimenViewSheet
                specimen={selectedSpecimenForView}
                open={isSpecimenViewSheetOpen}
                onOpenChange={setIsSpecimenViewSheetOpen}
                onEditClick={() => {
                    setSelectedSpecimen(selectedSpecimenForView);
                    setIsSpecimenViewSheetOpen(false);
                    setIsSpecimenSheetOpen(true);
                }}
            />

            <SpecimenGroupViewSheet
                group={selectedGroupForView}
                open={isGroupViewSheetOpen}
                onOpenChange={setIsGroupViewSheetOpen}
            />

            <SpecimenGroupSheet
                open={isGroupSheetOpen}
                onOpenChange={setIsGroupSheetOpen}
                customers={customers}
                specimenTypes={specimenTypes}
                examinations={examinations}
                categories={categories}
                referrers={referrers}
                referrerTypes={referrerTypes}
                priorities={priorities}
                locations={locations}
                sequences={sequences}
                activeLocationId={activeLocationId}
                products={products}
                banks={banks}
            />
        </>
    );
}
// Removed local SpecimenGroupViewSheet definition to avoid duplication
