import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import debounce from 'lodash/debounce';
import {
    FileText,
    Search,
    CreditCard,
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
} from 'lucide-react';
import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { index as creditsIndex } from '@/actions/App/Http/Controllers/CreditController';
import { DateRangePicker } from '@/components/date-range-picker';
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
import SpecimenViewSheet from '../specimens/specimen-view-sheet';
import CreditEditSheet from './credit-edit-sheet';
import CreditSheet from './credit-sheet';
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
    customers: {
        id: number;
        name: string;
        id_number: string;
    }[];
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

export default function CreditsIndex({
    credits,
    filters,
    customers,
    specimenTypes,
    groups,
    banks = [],
}: Props) {
    const { auth, flash } = usePage<any>().props;
    const canManage = auth.permissions?.includes('credits.manage');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [selectedCreditForEdit, setSelectedCreditForEdit] =
        useState<Credit | null>(null);
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

    const handlePayClick = (credit: Credit) => {
        setSelectedCredit(credit);
        setIsSheetOpen(true);
    };

    const handleEditClick = (credit: Credit) => {
        setSelectedCreditForEdit(credit);
        setIsEditSheetOpen(true);
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

    const getStatusBadge = (credit: Credit) => {
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
                                    const isPaid = remainingVal === 0;
                                    const rowBgClass = isPaid
                                        ? 'bg-emerald-500/5 dark:bg-emerald-500/5 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10'
                                        : '';
                                    const stickyBgClass = isPaid
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
                                                    {originalInvoice && (
                                                        <a
                                                            href={`/storage/${originalInvoice.invoice_file}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 font-semibold text-primary hover:underline"
                                                        >
                                                            <FileText className="h-3 w-3" />{' '}
                                                            Original:{' '}
                                                            {
                                                                originalInvoice.full_invoice_number
                                                            }
                                                        </a>
                                                    )}
                                                    {paymentInvoices.length >
                                                        0 && (
                                                        <div className="flex flex-col gap-0.5 text-muted-foreground">
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
                                                                        href={`/storage/${p.invoice_file}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="ml-3 flex items-center gap-0.5 hover:text-primary hover:underline"
                                                                    >
                                                                        {
                                                                            p.full_invoice_number
                                                                        }{' '}
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
                                                        {remainingVal > 0 && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handlePayClick(
                                                                        credit,
                                                                    )
                                                                }
                                                                className="h-8 gap-1.5 bg-accent text-white hover:bg-accent/50"
                                                            >
                                                                <CreditCard className="h-3.5 w-3.5" />{' '}
                                                                Pagar
                                                            </Button>
                                                        )}
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
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleEditClick(
                                                                    credit,
                                                                )
                                                            }
                                                            className="h-8 w-8"
                                                            title="Editar Crédito"
                                                        >
                                                            <Edit2 className="h-4 w-4 hover:fill-white" />
                                                        </Button>
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

            <CreditSheet
                credit={selectedCredit}
                banks={banks}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
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

            <SpecimenGroupViewSheet
                group={selectedGroupForView}
                open={isGroupViewSheetOpen}
                onOpenChange={setIsGroupViewSheetOpen}
            />

            <SpecimenViewSheet
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
        </>
    );
}
