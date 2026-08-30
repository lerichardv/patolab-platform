import { Head, router, useForm, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import debounce from 'lodash/debounce';
import {
    FileText,
    Search,
    ExternalLink,
    Edit2,
    History,
    Eye,
    ChevronsUpDown,
    Check,
    Download,
    ChevronDown,
    Layers,
    Edit,
    Coins,
    MoreVertical,
    FolderMinus,
    CheckCircle2,
    Wallet,
    Landmark,
    CreditCard,
    Receipt,
    Upload,
    X,
    UserCheck,
} from 'lucide-react';
import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { index as creditsIndex } from '@/actions/App/Http/Controllers/CreditController';
import AsyncCustomerCombobox from '@/components/async-customer-combobox';
import { DateRangePicker } from '@/components/date-range-picker';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
} from '@/components/ui/alert-dialog';
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
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import SpecimenGroupViewSheet from '../specimens/specimen-group-view-sheet';
import SpecimenGroupCustomerSheet from '../specimens/specimen-group-customer-sheet';
import SpecimenViewSheet from '../specimens/specimen-view-sheet';
import CreditEditSheet from './credit-edit-sheet';
import CreditExtractSpecimenSheet from './credit-extract-specimen-sheet';
import CreditFinalPaymentSheet from './credit-final-payment-sheet';
import CreditViewSheet from './credit-view-sheet';

interface Customer {
    id: number;
    name: string;
    id_number: string;
    phone?: string;
    email?: string;
}

interface Specimen {
    id: number;
    sequence_code?: string;
    type?: {
        id: number;
        name: string;
    };
    examination?: {
        id: number;
        name: string;
    };
}

interface Invoice {
    id: number;
    full_invoice_number: string;
    payment_type: string;
    total: string | number;
    invoice_file: string;
    created_at: string;
    specimen?: Specimen;
    invoice_type?: string | null;
    credit_payment_id?: number | null;
}

interface Credit {
    id: number;
    customer_id: number;
    credit_amount: string | number;
    amount_paid: string | number;
    amount_remaining: string | number;
    status?: string;
    created_at: string;
    customer?: Customer;
    invoices?: Invoice[];
    specimen_id?: number | null;
    is_group?: boolean;
    group_id?: number | null;
    specimen?: Specimen;
    group?: any;
    last_payment_date?: string | null;
    reminder_interval_in_seconds?: number;
    invoice_specimens?: any[];
    credit_invoice_specimens?: any[];
}

interface Props {
    credits: {
        data: Credit[];
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
        status?: string;
        customer_id?: string;
        specimen_type_id?: string;
        date_from?: string;
        date_to?: string;
        has_pending_balance?: string;
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
    groups?: {
        id: number;
        name: string;
    }[];
    banks?: {
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

const formatCardExpiration = (value: string): string => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);

    if (!cleaned) {
        return '';
    }

    let month = cleaned.slice(0, 2);
    const year = cleaned.slice(2, 6);

    if (month.length === 1 && month !== '0' && month !== '1') {
        month = '0' + month;
    } else if (month.length === 2) {
        const mVal = parseInt(month);

        if (mVal < 1) {
            month = '01';
        }

        if (mVal > 12) {
            month = '12';
        }
    }

    if (cleaned.length > 2) {
        return `${month}/${year}`;
    }

    return month;
};

export default function CreditsIndex({
    credits,
    filters,
    selectedCustomer,
    specimenTypes,
    groups,
    banks = [],
}: Props) {
    const { auth, flash } = usePage<any>().props;
    const canManage = auth.permissions?.includes('credits.manage');

    const [isFinalPaymentSheetOpen, setIsFinalPaymentSheetOpen] =
        useState(false);
    const [selectedCreditForFinalPayment, setSelectedCreditForFinalPayment] =
        useState<Credit | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [selectedCreditForEdit, setSelectedCreditForEdit] =
        useState<Credit | null>(null);
    const [isExtractSpecimenSheetOpen, setIsExtractSpecimenSheetOpen] =
        useState(false);
    const [
        selectedCreditForExtractSpecimen,
        setSelectedCreditForExtractSpecimen,
    ] = useState<Credit | null>(null);
    const [isGroupCustomerSheetOpen, setIsGroupCustomerSheetOpen] =
        useState(false);
    const [
        selectedGroupIdForCustomerChange,
        setSelectedGroupIdForCustomerChange,
    ] = useState<number | null>(null);
    const [search, setSearch] = useState(filters.search || '');
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
    const [isGroupViewSheetOpen, setIsGroupViewSheetOpen] = useState(false);
    const [selectedGroupForView, setSelectedGroupForView] = useState<
        any | null
    >(null);
    const [isSpecimenViewSheetOpen, setIsSpecimenViewSheetOpen] =
        useState(false);
    const [selectedSpecimenForView, setSelectedSpecimenForView] = useState<
        any | null
    >(null);
    const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
    const [isCreditViewSheetOpen, setIsCreditViewSheetOpen] = useState(false);
    const [selectedCreditForView, setSelectedCreditForView] =
        useState<Credit | null>(null);
    const [creditToMarkAsPaid, setCreditToMarkAsPaid] = useState<Credit | null>(
        null,
    );
    const [isMarkAsPaidDialogOpen, setIsMarkAsPaidDialogOpen] = useState(false);

    const {
        data: markAsPaidData,
        setData: setMarkAsPaidData,
        post: postMarkAsPaid,
        processing: isMarkingAsPaid,
        errors: markAsPaidErrors,
        reset: resetMarkAsPaid,
        clearErrors: clearMarkAsPaidErrors,
    } = useForm({
        payment_type: 'cash',
        payment_method_date: new Date().toISOString().split('T')[0],
        cash_value: '',
        check_number: '',
        check_value: '',
        card_last_4: '',
        card_value_charged: '',
        card_expiration: '',
        card_authorization_code: '',
        transfer_bank_id: '',
        transfer_value: '',
        transfer_authorization_code: '',
        proof_of_payment: null as File | null,
    });

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
    }, [credits.data]);

    // Watch flash for new invoice generation
    useEffect(() => {
        if (flash.new_invoice_url) {
            setInvoiceUrl(flash.new_invoice_url);
            setShowInvoiceModal(true);
        }
    }, [flash.new_invoice_url]);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === 'all' || value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        router.get(creditsIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
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

    const handlePayFinalClick = (credit: Credit) => {
        setSelectedCreditForFinalPayment(credit);
        setIsFinalPaymentSheetOpen(true);
    };

    const handleEditClick = (credit: Credit) => {
        setSelectedCreditForEdit(credit);
        setIsEditSheetOpen(true);
    };

    const handleExtractSpecimenClick = (credit: Credit) => {
        setSelectedCreditForExtractSpecimen(credit);
        setIsExtractSpecimenSheetOpen(true);
    };

    const handleExport = (format: 'csv' | 'xlsx') => {
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, String(value));
            }
        });
        queryParams.set('format', format);
        window.location.href = `/credits/export?${queryParams.toString()}`;
    };

    const handleMarkAsPaidClick = (credit: Credit) => {
        const totalAmount = parseFloat(
            String(credit.credit_amount || 0),
        ).toFixed(2);
        setMarkAsPaidData({
            payment_type: 'cash',
            payment_method_date: new Date().toISOString().split('T')[0],
            cash_value: totalAmount,
            check_number: '',
            check_value: '',
            card_last_4: '',
            card_value_charged: '',
            card_expiration: '',
            card_authorization_code: '',
            transfer_bank_id: '',
            transfer_value: '',
            transfer_authorization_code: '',
            proof_of_payment: null,
        });
        clearMarkAsPaidErrors();
        setCreditToMarkAsPaid(credit);
        setIsMarkAsPaidDialogOpen(true);
    };

    const handlePaymentTypeChange = (type: string) => {
        const totalAmount = creditToMarkAsPaid
            ? parseFloat(String(creditToMarkAsPaid.credit_amount || 0)).toFixed(
                  2,
              )
            : '';

        setMarkAsPaidData((prev) => ({
            ...prev,
            payment_type: type,
            cash_value: type === 'cash' ? totalAmount : '',
            check_value: type === 'check' ? totalAmount : '',
            check_number: '',
            card_value_charged: type === 'credit card' ? totalAmount : '',
            card_last_4: '',
            card_expiration: '',
            card_authorization_code: '',
            transfer_value: type === 'bank transfer' ? totalAmount : '',
            transfer_bank_id: '',
            transfer_authorization_code: '',
            proof_of_payment: type === 'cash' ? null : prev.proof_of_payment,
        }));
    };

    const confirmMarkAsPaid = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!creditToMarkAsPaid) {
            return;
        }

        if (
            markAsPaidData.payment_type !== 'cash' &&
            !markAsPaidData.proof_of_payment
        ) {
            toast.error('El comprobante de pago es requerido.');

            return;
        }

        postMarkAsPaid(`/credits/${creditToMarkAsPaid.id}/mark-as-paid`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsMarkAsPaidDialogOpen(false);
                setCreditToMarkAsPaid(null);
                resetMarkAsPaid();
                toast.success('Crédito marcado como pagado con éxito');
            },
            onError: () => {
                toast.error(
                    'Por favor complete todos los campos obligatorios del pago.',
                );
            },
        });
    };

    const getStatusBadge = (credit: Credit) => {
        const status = credit.status;

        if (status === 'paid') {
            return (
                <Badge
                    variant="outline"
                    className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                >
                    Pagado
                </Badge>
            );
        }

        if (status === 'invoice generated') {
            return (
                <Badge
                    variant="outline"
                    className="border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                >
                    Factura Generada
                </Badge>
            );
        }

        if (status === 'partial') {
            return (
                <Badge
                    variant="outline"
                    className="border-amber-500/20 bg-amber-500/10 text-amber-600"
                >
                    Pago Parcial
                </Badge>
            );
        }

        if (status === 'cancelled') {
            return (
                <Badge
                    variant="outline"
                    className="border-slate-500/20 bg-slate-500/10 text-slate-600"
                >
                    Cancelado
                </Badge>
            );
        }

        if (status === 'pending') {
            return (
                <Badge
                    variant="outline"
                    className="border-destructive/20 bg-destructive/10 text-destructive"
                >
                    Pendiente
                </Badge>
            );
        }

        const remaining = parseFloat(String(credit.amount_remaining));
        const paid = parseFloat(String(credit.amount_paid));

        if (remaining === 0) {
            return (
                <Badge
                    variant="outline"
                    className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                >
                    Pagado
                </Badge>
            );
        }

        if (paid > 0) {
            return (
                <Badge
                    variant="outline"
                    className="border-amber-500/20 bg-amber-500/10 text-amber-600"
                >
                    Pago Parcial
                </Badge>
            );
        }

        return (
            <Badge
                variant="outline"
                className="border-destructive/20 bg-destructive/10 text-destructive"
            >
                Pendiente
            </Badge>
        );
    };

    return (
        <>
            <Head title="Créditos de Clientes" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Créditos de Clientes
                        </h1>
                        <p className="text-muted-foreground">
                            Registre pagos y controle los saldos pendientes de
                            los clientes.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                    </div>
                </div>

                {/* Filters Area - Search on Row 1, other filters on Row 2 */}
                <div className="flex w-full flex-col gap-4">
                    {/* Row 1: Search and Date Range */}
                    <div className="flex flex-row items-end justify-stretch gap-3">
                        <div className="relative w-full">
                            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por cliente, muestra o RTN..."
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
                                cookieKey="date_filter_credits"
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

                                    router.get(creditsIndex().url, newFilters, {
                                        preserveState: true,
                                        replace: true,
                                    });
                                }}
                            />
                        </div>
                    </div>

                    {/* Row 2: Advanced filters */}
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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
                                Estado
                            </span>
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('status', v)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Estado de Crédito" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los estados
                                    </SelectItem>
                                    <SelectItem value="pending">
                                        Pendientes
                                    </SelectItem>
                                    <SelectItem value="partial">
                                        Pagos Parciales
                                    </SelectItem>
                                    <SelectItem value="invoice generated">
                                        Factura Generada
                                    </SelectItem>
                                    <SelectItem value="paid">
                                        Pagados
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
                        <div
                            className="mb-0.5 flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border bg-card px-3 transition-colors select-none hover:bg-accent/50"
                            onClick={() => {
                                const nextVal =
                                    filters.has_pending_balance === 'yes'
                                        ? 'all'
                                        : 'yes';
                                handleFilterChange(
                                    'has_pending_balance',
                                    nextVal,
                                );
                            }}
                        >
                            <span className="flex-1 text-sm font-medium">
                                Solo saldos pendientes
                            </span>
                            <Switch
                                checked={filters.has_pending_balance === 'yes'}
                                onCheckedChange={(checked) => {
                                    handleFilterChange(
                                        'has_pending_balance',
                                        checked ? 'yes' : 'all',
                                    );
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                </div>

                <div ref={containerRef} className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead
                                    className={`pointer-events-none z-10 w-[100px] min-w-[100px] border-r border-border bg-card after:top-0 after:right-[-8px] after:bottom-0 after:hidden after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent after:transition-opacity after:duration-200 md:sticky md:left-0 md:after:absolute dark:after:from-black/[0.2] ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}
                                >
                                    ID
                                </TableHead>
                                <TableHead className="min-w-[180px] pl-5">
                                    Cliente
                                </TableHead>
                                <TableHead className="min-w-[140px]">
                                    Muestra
                                </TableHead>
                                <TableHead className="min-w-[140px]">
                                    Monto Crédito
                                </TableHead>
                                <TableHead className="min-w-[140px]">
                                    Monto Pagado
                                </TableHead>
                                <TableHead className="min-w-[140px]">
                                    Saldo Pendiente
                                </TableHead>
                                <TableHead className="min-w-[180px]">
                                    Progreso de Pago
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    Fecha Creación
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    Último Pago
                                </TableHead>
                                <TableHead className="min-w-[130px]">
                                    Estado
                                </TableHead>
                                <TableHead className="min-w-[180px]">
                                    Facturas Asoc.
                                </TableHead>
                                {canManage && (
                                    <TableHead
                                        className={`z-10 w-[130px] min-w-[130px] border-l border-border bg-card text-right before:top-0 before:bottom-0 before:left-[-8px] before:hidden before:w-[8px] before:bg-gradient-to-r before:from-transparent before:to-black/[0.06] before:transition-opacity before:duration-200 md:sticky md:right-0 md:before:absolute dark:before:to-black/[0.2] ${showRightShadow ? 'before:opacity-100' : 'before:opacity-0'}`}
                                    >
                                        Acciones
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {credits.data.length > 0 ? (
                                credits.data.map((credit) => {
                                    const originalInvoice =
                                        credit.invoices?.find(
                                            (inv) =>
                                                inv.payment_type === 'credit',
                                        );
                                    const paymentInvoices =
                                        credit.invoices?.filter(
                                            (inv) =>
                                                inv.payment_type !== 'credit',
                                        ) || [];
                                    const remainingVal = parseFloat(
                                        String(credit.amount_remaining),
                                    );
                                    const isInvoiceGenerated =
                                        credit.status === 'invoice generated';
                                    const isPaid =
                                        credit.status === 'paid' ||
                                        (credit.status === undefined &&
                                            remainingVal === 0);
                                    const rowBgClass = isInvoiceGenerated
                                        ? 'bg-sky-500/10 dark:bg-sky-500/10 hover:bg-sky-500/15 dark:hover:bg-sky-500/15'
                                        : isPaid
                                          ? 'bg-emerald-500/5 dark:bg-emerald-500/5 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10'
                                          : '';
                                    const stickyBgClass = isInvoiceGenerated
                                        ? 'md:bg-[#f0f9ff] dark:md:bg-[#082f49] group-hover:bg-[#e0f2fe] dark:group-hover:bg-[#0c4a6e]'
                                        : isPaid
                                          ? 'md:bg-[#f6fdf9] dark:md:bg-[#07180e] group-hover:bg-[#ebf8f0] dark:group-hover:bg-[#0b2416]'
                                          : 'md:bg-card group-hover:bg-muted';

                                    return (
                                        <TableRow
                                            key={credit.id}
                                            className={`group ${rowBgClass}`}
                                        >
                                            <TableCell
                                                className={`z-10 min-w-[100px] md:sticky md:left-0 ${stickyBgClass} pointer-events-none w-[100px] border-r border-border transition-colors after:top-0 after:right-[-8px] after:bottom-0 after:hidden after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent after:transition-opacity after:duration-200 md:after:absolute dark:after:from-black/[0.2] ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}
                                            >
                                                <span className="font-mono text-xs font-semibold">
                                                    #{credit.id}
                                                </span>
                                            </TableCell>
                                            <TableCell className="min-w-[180px] pl-5">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground">
                                                        {credit.customer?.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {
                                                            credit.customer
                                                                ?.id_number
                                                        }
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[140px]">
                                                {credit.is_group &&
                                                credit.group ? (
                                                    <div className="flex max-w-[220px] flex-col gap-1 text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className="w-max max-w-[150px] truncate rounded border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:bg-purple-500/20 dark:text-purple-300"
                                                                title={
                                                                    credit.group
                                                                        .name
                                                                }
                                                            >
                                                                {
                                                                    credit.group
                                                                        .name
                                                                }
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 shrink-0 hover:bg-muted"
                                                                onClick={() => {
                                                                    setSelectedGroupForView(
                                                                        {
                                                                            ...credit.group,
                                                                            credit: credit,
                                                                        },
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
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Muestra Agrupada (
                                                            {credit.group
                                                                .specimens
                                                                ?.length ||
                                                                0}{' '}
                                                            muestras)
                                                        </span>
                                                    </div>
                                                ) : credit.specimen ? (
                                                    <div className="flex max-w-[220px] flex-col gap-1 text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-max rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary dark:bg-primary/10">
                                                                {credit.specimen
                                                                    .sequence_code ||
                                                                    `#${credit.specimen.id}`}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 hover:bg-muted"
                                                                onClick={() => {
                                                                    setSelectedSpecimenForView(
                                                                        credit.specimen,
                                                                    );
                                                                    setIsSpecimenViewSheetOpen(
                                                                        true,
                                                                    );
                                                                }}
                                                                title="Ver Muestra"
                                                            >
                                                                <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                            </Button>
                                                        </div>
                                                        <span
                                                            className="text-[10px] text-muted-foreground"
                                                            title={
                                                                credit.specimen
                                                                    .type?.name
                                                            }
                                                        >
                                                            {
                                                                credit.specimen
                                                                    .type?.name
                                                            }{' '}
                                                            -{' '}
                                                            {
                                                                credit.specimen
                                                                    .examination
                                                                    ?.name
                                                            }
                                                        </span>
                                                    </div>
                                                ) : originalInvoice?.specimen ? (
                                                    <div className="flex max-w-[220px] flex-col gap-1 text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-max rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary dark:bg-primary/10">
                                                                {originalInvoice
                                                                    .specimen
                                                                    .sequence_code ||
                                                                    `#${originalInvoice.specimen.id}`}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 hover:bg-muted"
                                                                onClick={() => {
                                                                    setSelectedSpecimenForView(
                                                                        originalInvoice.specimen,
                                                                    );
                                                                    setIsSpecimenViewSheetOpen(
                                                                        true,
                                                                    );
                                                                }}
                                                                title="Ver Muestra"
                                                            >
                                                                <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                            </Button>
                                                        </div>
                                                        <span
                                                            className="text-[10px] text-muted-foreground"
                                                            title={
                                                                originalInvoice
                                                                    .specimen
                                                                    .type?.name
                                                            }
                                                        >
                                                            {
                                                                originalInvoice
                                                                    .specimen
                                                                    .type?.name
                                                            }{' '}
                                                            -{' '}
                                                            {
                                                                originalInvoice
                                                                    .specimen
                                                                    .examination
                                                                    ?.name
                                                            }
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">
                                                        N/A
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="min-w-[140px] font-mono font-semibold">
                                                L.{' '}
                                                {parseFloat(
                                                    String(
                                                        credit.credit_amount,
                                                    ),
                                                ).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="min-w-[140px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                                L.{' '}
                                                {parseFloat(
                                                    String(credit.amount_paid),
                                                ).toFixed(2)}
                                            </TableCell>
                                            <TableCell
                                                className={`min-w-[140px] font-mono font-semibold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
                                            >
                                                L. {remainingVal.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="min-w-[180px]">
                                                {(() => {
                                                    const paidVal = parseFloat(
                                                        String(
                                                            credit.amount_paid ||
                                                                0,
                                                        ),
                                                    );
                                                    const creditAmountVal =
                                                        parseFloat(
                                                            String(
                                                                credit.credit_amount ||
                                                                    0,
                                                            ),
                                                        );
                                                    const pctVal =
                                                        creditAmountVal > 0
                                                            ? (
                                                                  (paidVal /
                                                                      creditAmountVal) *
                                                                  100
                                                              ).toFixed(0)
                                                            : '0';

                                                    return (
                                                        <div className="flex min-w-[140px] flex-col gap-1 text-xs">
                                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                                                <span>
                                                                    Abonado:{' '}
                                                                    <strong className="font-mono text-foreground">
                                                                        L.{' '}
                                                                        {paidVal.toFixed(
                                                                            2,
                                                                        )}
                                                                    </strong>
                                                                </span>
                                                                <span className="font-mono font-bold text-primary">
                                                                    {pctVal}%
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 w-full overflow-hidden rounded-full border bg-muted">
                                                                <div
                                                                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                                                    style={{
                                                                        width: `${Math.min(100, Math.max(0, parseFloat(pctVal)))}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between font-mono text-[10px]">
                                                                <span
                                                                    className={`${remainingVal === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} font-semibold`}
                                                                >
                                                                    Resta: L.{' '}
                                                                    {remainingVal.toFixed(
                                                                        2,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="min-w-[150px] text-xs text-muted-foreground">
                                                {format(
                                                    new Date(credit.created_at),
                                                    'dd/MM/yyyy h:mm a',
                                                )}
                                            </TableCell>
                                            <TableCell className="min-w-[150px] text-xs">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-foreground">
                                                        {credit.last_payment_date
                                                            ? format(
                                                                  new Date(
                                                                      credit.last_payment_date,
                                                                  ),
                                                                  'dd/MM/yyyy h:mm a',
                                                              )
                                                            : 'N/A'}
                                                    </span>
                                                    {credit.reminder_interval_in_seconds && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Recordatorio: Cada{' '}
                                                            {Math.round(
                                                                credit.reminder_interval_in_seconds /
                                                                    86400,
                                                            )}{' '}
                                                            días
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[130px]">
                                                {getStatusBadge(credit)}
                                            </TableCell>
                                            <TableCell className="min-w-[180px]">
                                                <div className="flex flex-col gap-1 text-[11px]">
                                                    {originalInvoice ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            {originalInvoice.invoice_file ? (
                                                                <a
                                                                    href={`/storage/${originalInvoice.invoice_file}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1 font-semibold text-primary hover:underline"
                                                                >
                                                                    <FileText className="h-3 w-3" />{' '}
                                                                    {originalInvoice.full_invoice_number ? (
                                                                        <span>
                                                                            Original:{' '}
                                                                            {
                                                                                originalInvoice.full_invoice_number
                                                                            }
                                                                        </span>
                                                                    ) : (
                                                                        <span>
                                                                            Crédito
                                                                            #
                                                                            {
                                                                                credit.id
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </a>
                                                            ) : (
                                                                <span className="flex items-center gap-1 font-semibold text-foreground">
                                                                    <FileText className="h-3 w-3 text-muted-foreground" />{' '}
                                                                    {originalInvoice.full_invoice_number ? (
                                                                        <span>
                                                                            Original:{' '}
                                                                            {
                                                                                originalInvoice.full_invoice_number
                                                                            }
                                                                        </span>
                                                                    ) : (
                                                                        <span>
                                                                            Crédito
                                                                            #
                                                                            {
                                                                                credit.id
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            )}
                                                            <span className="pl-4 text-[10px] text-muted-foreground">
                                                                {format(
                                                                    new Date(
                                                                        originalInvoice.created_at ||
                                                                            credit.created_at,
                                                                    ),
                                                                    'dd/MM/yyyy h:mm a',
                                                                )}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-semibold text-foreground">
                                                                Crédito #
                                                                {credit.id}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {format(
                                                                    new Date(
                                                                        credit.created_at,
                                                                    ),
                                                                    'dd/MM/yyyy h:mm a',
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {paymentInvoices.length >
                                                        0 && (
                                                        <div className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
                                                            <span className="flex items-center gap-1 text-[10px] font-medium">
                                                                <History className="h-3 w-3 text-muted-foreground" />{' '}
                                                                Abonos (
                                                                {
                                                                    paymentInvoices.length
                                                                }
                                                                ):
                                                            </span>
                                                            {paymentInvoices.map(
                                                                (p) => (
                                                                    <a
                                                                        key={
                                                                            p.id
                                                                        }
                                                                        href={
                                                                            p.invoice_file
                                                                                ? `/storage/${p.invoice_file}`
                                                                                : '#'
                                                                        }
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="ml-3 flex items-center gap-0.5 hover:text-primary hover:underline"
                                                                    >
                                                                        {p.full_invoice_number ||
                                                                            `Abono (${format(new Date(p.created_at), 'dd/MM/yyyy')})`}{' '}
                                                                        (L.{' '}
                                                                        {parseFloat(
                                                                            String(
                                                                                p.total,
                                                                            ),
                                                                        ).toFixed(
                                                                            0,
                                                                        )}
                                                                        )
                                                                    </a>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            {canManage && (
                                                <TableCell
                                                    className={`z-10 text-right md:sticky md:right-0 ${stickyBgClass} w-[130px] min-w-[130px] border-l border-border transition-colors before:top-0 before:bottom-0 before:left-[-8px] before:hidden before:w-[8px] before:bg-gradient-to-r before:from-transparent before:to-black/[0.06] before:transition-opacity before:duration-200 md:before:absolute dark:before:to-black/[0.2] ${showRightShadow ? 'before:opacity-100' : 'before:opacity-0'}`}
                                                >
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedCreditForView(
                                                                    credit,
                                                                );
                                                                setIsCreditViewSheetOpen(
                                                                    true,
                                                                );
                                                            }}
                                                            className="h-8 w-8"
                                                            title="Ver Crédito"
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
                                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                    title="Acciones"
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent
                                                                align="end"
                                                                className="w-52"
                                                            >
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        if (
                                                                            remainingVal >
                                                                            0
                                                                        ) {
                                                                            handlePayFinalClick(
                                                                                credit,
                                                                            );
                                                                        }
                                                                    }}
                                                                    disabled={
                                                                        remainingVal <=
                                                                        0
                                                                    }
                                                                    className={
                                                                        remainingVal <=
                                                                        0
                                                                            ? 'opacity-50'
                                                                            : ''
                                                                    }
                                                                >
                                                                    <Coins className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                    <span>
                                                                        Generar
                                                                        Factura
                                                                        Final
                                                                    </span>
                                                                </DropdownMenuItem>
                                                                {credit.status ===
                                                                    'invoice generated' && (
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            handleMarkAsPaidClick(
                                                                                credit,
                                                                            )
                                                                        }
                                                                    >
                                                                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                                                                        <span>
                                                                            Marcar
                                                                            como
                                                                            pagado
                                                                        </span>
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {(() => {
                                                                    const rawSpecimens =
                                                                        credit.invoice_specimens ||
                                                                        credit.credit_invoice_specimens ||
                                                                        [];
                                                                    const uniqueSpecimenIds =
                                                                        new Set(
                                                                            rawSpecimens
                                                                                .map(
                                                                                    (
                                                                                        s: any,
                                                                                    ) =>
                                                                                        s.specimen_id ||
                                                                                        s.id,
                                                                                )
                                                                                .filter(
                                                                                    Boolean,
                                                                                ),
                                                                        );
                                                                    const specimensCount =
                                                                        uniqueSpecimenIds.size >
                                                                        0
                                                                            ? uniqueSpecimenIds.size
                                                                            : (credit
                                                                                  .group
                                                                                  ?.specimens
                                                                                  ?.length ??
                                                                              (credit.is_group
                                                                                  ? 2
                                                                                  : 1));
                                                                    const isSingleOrPaid =
                                                                        !credit.is_group ||
                                                                        specimensCount <=
                                                                            1 ||
                                                                        remainingVal <=
                                                                            0;

                                                                    return (
                                                                        <DropdownMenuItem
                                                                            onClick={() => {
                                                                                if (
                                                                                    !isSingleOrPaid
                                                                                ) {
                                                                                    handleExtractSpecimenClick(
                                                                                        credit,
                                                                                    );
                                                                                }
                                                                            }}
                                                                            disabled={
                                                                                isSingleOrPaid
                                                                            }
                                                                            className={
                                                                                isSingleOrPaid
                                                                                    ? 'opacity-50'
                                                                                    : ''
                                                                            }
                                                                        >
                                                                            <FolderMinus className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                            <span>
                                                                                Sacar
                                                                                muestra
                                                                            </span>
                                                                        </DropdownMenuItem>
                                                                    );
                                                                })()}
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        handleEditClick(
                                                                            credit,
                                                                        )
                                                                    }
                                                                >
                                                                    <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                    <span>
                                                                        Editar
                                                                        configuración
                                                                    </span>
                                                                </DropdownMenuItem>
                                                                {canManage &&
                                                                    Boolean(
                                                                        credit.is_group ||
                                                                        credit.group_id ||
                                                                        credit
                                                                            .group
                                                                            ?.id,
                                                                    ) && (
                                                                        <DropdownMenuItem
                                                                            onClick={() => {
                                                                                const grpId =
                                                                                    credit.group_id ||
                                                                                    credit
                                                                                        .group
                                                                                        ?.id;
                                                                                if (
                                                                                    grpId
                                                                                ) {
                                                                                    setSelectedGroupIdForCustomerChange(
                                                                                        grpId,
                                                                                    );
                                                                                    setIsGroupCustomerSheetOpen(
                                                                                        true,
                                                                                    );
                                                                                }
                                                                            }}
                                                                        >
                                                                            <UserCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                            <span>
                                                                                Cambiar
                                                                                cliente
                                                                                del
                                                                                grupo
                                                                            </span>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={canManage ? 12 : 11}
                                        className="h-24 text-center"
                                    >
                                        No se encontraron créditos de clientes.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={credits.links}
                    meta={{
                        from: credits.from,
                        to: credits.to,
                        total: credits.total,
                    }}
                    className="mt-2"
                />
            </div>

            <CreditFinalPaymentSheet
                credit={selectedCreditForFinalPayment}
                banks={banks}
                open={isFinalPaymentSheetOpen}
                onOpenChange={setIsFinalPaymentSheetOpen}
            />

            <CreditExtractSpecimenSheet
                credit={selectedCreditForExtractSpecimen}
                open={isExtractSpecimenSheetOpen}
                onOpenChange={setIsExtractSpecimenSheetOpen}
            />

            <CreditEditSheet
                credit={selectedCreditForEdit}
                open={isEditSheetOpen}
                onOpenChange={setIsEditSheetOpen}
            />

            <CreditViewSheet
                credit={selectedCreditForView as any}
                open={isCreditViewSheetOpen}
                onOpenChange={setIsCreditViewSheetOpen}
            />

            <SpecimenGroupCustomerSheet
                groupId={selectedGroupIdForCustomerChange}
                open={isGroupCustomerSheetOpen}
                onOpenChange={(open) => {
                    setIsGroupCustomerSheetOpen(open);
                    if (!open) {
                        setSelectedGroupIdForCustomerChange(null);
                    }
                }}
            />

            <SpecimenGroupViewSheet
                group={selectedGroupForView}
                open={isGroupViewSheetOpen}
                onOpenChange={setIsGroupViewSheetOpen}
                onViewSpecimenClick={(specimen) => {
                    const specimenWithInvoice = {
                        ...specimen,
                        customerRelation:
                            specimen.customerRelation ||
                            selectedGroupForView?.customer,
                        invoiceRelation: selectedGroupForView?.invoice,
                        invoice_relation: selectedGroupForView?.invoice,
                    };
                    setIsGroupViewSheetOpen(false);
                    setSelectedSpecimenForView(specimenWithInvoice);
                    setIsSpecimenViewSheetOpen(true);
                }}
            />

            <SpecimenViewSheet
                specimenId={selectedSpecimenForView?.id}
                specimen={selectedSpecimenForView}
                open={isSpecimenViewSheetOpen}
                onOpenChange={setIsSpecimenViewSheetOpen}
                onEditClick={() => {
                    if (selectedSpecimenForView) {
                        router.get('/specimens', {
                            specimen:
                                selectedSpecimenForView.sequence_code ||
                                String(selectedSpecimenForView.id),
                            action: 'edit',
                        });
                    }
                }}
            />

            {/* DIÁLOGO DE IMPRESIÓN/VISTA PREVIA DE FACTURA DE ABONO */}
            <AlertDialog
                open={showInvoiceModal}
                onOpenChange={setShowInvoiceModal}
            >
                <AlertDialogContent
                    className="z-[100] w-full max-w-[700px]"
                    overlayClassName="z-[100]"
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />{' '}
                            Factura de Abono Generada con Éxito
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            El pago de crédito ha sido registrado y la factura
                            se generó en formato PDF. Puede descargarla,
                            imprimirla o visualizarla a continuación.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {invoiceUrl && (
                        <div className="my-4 overflow-hidden rounded-lg border bg-muted">
                            <iframe
                                src={invoiceUrl}
                                className="h-[400px] w-full border-none"
                                title="Factura de Abono PDF"
                            />
                        </div>
                    )}

                    <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowInvoiceModal(false);
                                setInvoiceUrl(null);
                            }}
                            className="sm:order-1"
                        >
                            Cerrar
                        </Button>
                        <Button
                            onClick={() => {
                                if (invoiceUrl) {
                                    window.open(invoiceUrl, '_blank');
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
            {/* DIÁLOGO PARA MARCAR COMO PAGADO */}
            <AlertDialog
                open={isMarkAsPaidDialogOpen}
                onOpenChange={(open) => {
                    if (!isMarkingAsPaid) {
                        setIsMarkAsPaidDialogOpen(open);

                        if (!open) {
                            setCreditToMarkAsPaid(null);
                            resetMarkAsPaid();
                        }
                    }
                }}
            >
                <AlertDialogContent className="max-h-[90vh] w-full max-w-[580px] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            Marcar Crédito como Pagado
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Ingrese el método de pago y comprobante para marcar
                            el crédito #{creditToMarkAsPaid?.id} (Cliente:{' '}
                            <strong>
                                {creditToMarkAsPaid?.customer?.name}
                            </strong>
                            ) como <strong>Pagado</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <form
                        onSubmit={confirmMarkAsPaid}
                        className="mt-2 flex flex-col gap-4"
                    >
                        {/* Monto del crédito */}
                        <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3 text-sm">
                            <span className="text-muted-foreground">
                                Monto Total a Liquidar:
                            </span>
                            <span className="font-mono text-base font-bold text-foreground">
                                L.{' '}
                                {creditToMarkAsPaid
                                    ? parseFloat(
                                          String(
                                              creditToMarkAsPaid.credit_amount,
                                          ),
                                      ).toFixed(2)
                                    : '0.00'}
                            </span>
                        </div>

                        {/* Tipo de Pago selector */}
                        <div className="grid gap-2">
                            <Label htmlFor="mark_payment_type">
                                Tipo de Pago{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={markAsPaidData.payment_type}
                                onValueChange={handlePaymentTypeChange}
                            >
                                <SelectTrigger
                                    id="mark_payment_type"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Seleccione el tipo de pago" />
                                </SelectTrigger>
                                <SelectContent className="z-[150]">
                                    <SelectItem value="cash">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="h-4 w-4 text-primary" />
                                            <span>Efectivo</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="credit card">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-4 w-4 text-primary" />
                                            <span>Tarjeta de Crédito</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="bank transfer">
                                        <div className="flex items-center gap-2">
                                            <Landmark className="h-4 w-4 text-primary" />
                                            <span>Transferencia Bancaria</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="check">
                                        <div className="flex items-center gap-2">
                                            <Receipt className="h-4 w-4 text-primary" />
                                            <span>Cheque</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {markAsPaidErrors.payment_type && (
                                <p className="text-xs text-destructive">
                                    {markAsPaidErrors.payment_type}
                                </p>
                            )}
                        </div>

                        {/* Payment Method Date */}
                        {markAsPaidData.payment_type !== '' && (
                            <div className="grid gap-2">
                                <Label htmlFor="mark_payment_date">
                                    Fecha de Pago{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="mark_payment_date"
                                    type="date"
                                    value={markAsPaidData.payment_method_date}
                                    onChange={(e) =>
                                        setMarkAsPaidData(
                                            'payment_method_date',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                {markAsPaidErrors.payment_method_date && (
                                    <p className="text-xs text-destructive">
                                        {markAsPaidErrors.payment_method_date}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Cash Fields */}
                        {markAsPaidData.payment_type === 'cash' && (
                            <div className="grid gap-2 rounded-lg border bg-muted/40 p-4">
                                <Label htmlFor="mark_cash_value">
                                    Valor Recibido (L.){' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="mark_cash_value"
                                    type="number"
                                    step="0.01"
                                    value={markAsPaidData.cash_value}
                                    onChange={(e) =>
                                        setMarkAsPaidData(
                                            'cash_value',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="0.00"
                                    className="font-mono"
                                    required
                                />
                                {markAsPaidErrors.cash_value && (
                                    <p className="text-xs text-destructive">
                                        {markAsPaidErrors.cash_value}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Check Fields */}
                        {markAsPaidData.payment_type === 'check' && (
                            <div className="grid gap-4 rounded-lg border bg-muted/40 p-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="mark_check_number">
                                        Número de Cheque{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="mark_check_number"
                                        type="text"
                                        value={markAsPaidData.check_number}
                                        onChange={(e) =>
                                            setMarkAsPaidData(
                                                'check_number',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ej. 123456"
                                        required
                                    />
                                    {markAsPaidErrors.check_number && (
                                        <p className="text-xs text-destructive">
                                            {markAsPaidErrors.check_number}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mark_check_value">
                                        Valor del Cheque (L.){' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="mark_check_value"
                                        type="number"
                                        step="0.01"
                                        value={markAsPaidData.check_value}
                                        onChange={(e) =>
                                            setMarkAsPaidData(
                                                'check_value',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="0.00"
                                        className="font-mono"
                                        required
                                    />
                                    {markAsPaidErrors.check_value && (
                                        <p className="text-xs text-destructive">
                                            {markAsPaidErrors.check_value}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Credit Card Fields */}
                        {markAsPaidData.payment_type === 'credit card' && (
                            <div className="grid gap-4 rounded-lg border bg-muted/40 p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="mark_card_last_4">
                                            Últimos 4 Dígitos
                                        </Label>
                                        <Input
                                            id="mark_card_last_4"
                                            type="text"
                                            maxLength={4}
                                            value={markAsPaidData.card_last_4}
                                            onChange={(e) =>
                                                setMarkAsPaidData(
                                                    'card_last_4',
                                                    e.target.value
                                                        .replace(/\D/g, '')
                                                        .slice(0, 4),
                                                )
                                            }
                                            placeholder="1234"
                                        />
                                        {markAsPaidErrors.card_last_4 && (
                                            <p className="text-xs text-destructive">
                                                {markAsPaidErrors.card_last_4}
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="mark_card_expiration">
                                            Vencimiento
                                        </Label>
                                        <Input
                                            id="mark_card_expiration"
                                            type="text"
                                            placeholder="MM/AA"
                                            maxLength={7}
                                            value={
                                                markAsPaidData.card_expiration
                                            }
                                            onChange={(e) =>
                                                setMarkAsPaidData(
                                                    'card_expiration',
                                                    formatCardExpiration(
                                                        e.target.value,
                                                    ),
                                                )
                                            }
                                        />
                                        {markAsPaidErrors.card_expiration && (
                                            <p className="text-xs text-destructive">
                                                {
                                                    markAsPaidErrors.card_expiration
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mark_card_authorization_code">
                                        Código de Autorización
                                    </Label>
                                    <Input
                                        id="mark_card_authorization_code"
                                        type="text"
                                        value={
                                            markAsPaidData.card_authorization_code
                                        }
                                        onChange={(e) =>
                                            setMarkAsPaidData(
                                                'card_authorization_code',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ej. 987654"
                                    />
                                    {markAsPaidErrors.card_authorization_code && (
                                        <p className="text-xs text-destructive">
                                            {
                                                markAsPaidErrors.card_authorization_code
                                            }
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mark_card_value_charged">
                                        Monto Cargado (L.){' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="mark_card_value_charged"
                                        type="number"
                                        step="0.01"
                                        value={
                                            markAsPaidData.card_value_charged
                                        }
                                        onChange={(e) =>
                                            setMarkAsPaidData(
                                                'card_value_charged',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="0.00"
                                        className="font-mono"
                                        required
                                    />
                                    {markAsPaidErrors.card_value_charged && (
                                        <p className="text-xs text-destructive">
                                            {
                                                markAsPaidErrors.card_value_charged
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Bank Transfer Fields */}
                        {markAsPaidData.payment_type === 'bank transfer' && (
                            <div className="grid gap-4 rounded-lg border bg-muted/40 p-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="mark_transfer_bank_id">
                                        Banco{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Select
                                        value={markAsPaidData.transfer_bank_id}
                                        onValueChange={(val) =>
                                            setMarkAsPaidData(
                                                'transfer_bank_id',
                                                val,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="mark_transfer_bank_id"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Seleccione un Banco" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[150]">
                                            {banks && banks.length > 0 ? (
                                                banks.map((bank) => (
                                                    <SelectItem
                                                        key={bank.id}
                                                        value={bank.id.toString()}
                                                    >
                                                        {bank.name}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem
                                                    value="none"
                                                    disabled
                                                >
                                                    No hay bancos registrados
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {markAsPaidErrors.transfer_bank_id && (
                                        <p className="text-xs text-destructive">
                                            {markAsPaidErrors.transfer_bank_id}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mark_transfer_authorization_code">
                                        Código de Autorización / Referencia{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="mark_transfer_authorization_code"
                                        type="text"
                                        value={
                                            markAsPaidData.transfer_authorization_code
                                        }
                                        onChange={(e) =>
                                            setMarkAsPaidData(
                                                'transfer_authorization_code',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ej. 11223344"
                                        required
                                    />
                                    {markAsPaidErrors.transfer_authorization_code && (
                                        <p className="text-xs text-destructive">
                                            {
                                                markAsPaidErrors.transfer_authorization_code
                                            }
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mark_transfer_value">
                                        Monto Transferido (L.){' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="mark_transfer_value"
                                        type="number"
                                        step="0.01"
                                        value={markAsPaidData.transfer_value}
                                        onChange={(e) =>
                                            setMarkAsPaidData(
                                                'transfer_value',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="0.00"
                                        className="font-mono"
                                        required
                                    />
                                    {markAsPaidErrors.transfer_value && (
                                        <p className="text-xs text-destructive">
                                            {markAsPaidErrors.transfer_value}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Comprobante de Pago */}
                        <div className="space-y-2">
                            <Label htmlFor="mark_proof_of_payment">
                                Comprobante de Pago (PDF o Imagen){' '}
                                {markAsPaidData.payment_type !== 'cash' && (
                                    <span className="text-destructive">*</span>
                                )}
                            </Label>

                            {markAsPaidData.proof_of_payment ? (
                                <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-500">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="max-w-[200px] truncate text-xs font-semibold text-foreground sm:max-w-xs">
                                                {
                                                    markAsPaidData
                                                        .proof_of_payment.name
                                                }
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {(
                                                    markAsPaidData
                                                        .proof_of_payment.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(2)}{' '}
                                                MB
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            setMarkAsPaidData(
                                                'proof_of_payment',
                                                null,
                                            )
                                        }
                                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="group relative">
                                    <input
                                        type="file"
                                        id="mark_proof_of_payment"
                                        className="hidden"
                                        accept=".pdf,image/*"
                                        onChange={(e) => {
                                            const file =
                                                e.target.files?.[0] || null;
                                            setMarkAsPaidData(
                                                'proof_of_payment',
                                                file,
                                            );
                                        }}
                                    />
                                    <label
                                        htmlFor="mark_proof_of_payment"
                                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:bg-accent/10"
                                    >
                                        <div className="mb-1.5 rounded-full bg-secondary p-2 text-secondary-foreground transition-transform duration-200 group-hover:scale-110">
                                            <Upload className="h-4 w-4" />
                                        </div>
                                        <span className="text-xs font-semibold text-foreground">
                                            Subir Comprobante
                                        </span>
                                        <span className="mt-0.5 text-[10px] text-muted-foreground">
                                            PDF hasta 30MB, imágenes hasta 10MB
                                        </span>
                                    </label>
                                </div>
                            )}
                            {markAsPaidErrors.proof_of_payment && (
                                <p className="text-xs text-destructive">
                                    {markAsPaidErrors.proof_of_payment}
                                </p>
                            )}
                        </div>

                        <AlertDialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsMarkAsPaidDialogOpen(false);
                                    setCreditToMarkAsPaid(null);
                                    resetMarkAsPaid();
                                }}
                                disabled={isMarkingAsPaid}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isMarkingAsPaid}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {isMarkingAsPaid && (
                                    <Spinner className="mr-2" />
                                )}
                                {isMarkingAsPaid
                                    ? 'Guardando...'
                                    : 'Confirmar y Marcar como Pagado'}
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
