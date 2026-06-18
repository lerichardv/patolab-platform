import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import {
    Edit2,
    Search,
    Trash2,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    ExternalLink,
    Eye,
    Copy,
    Check,
    Calculator,
    SquarePen,
    FileText,
    X,
} from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

import {
    index as userCommissionsIndex,
    update as updateCommission,
    destroy as destroyCommission,
} from '@/actions/App/Http/Controllers/UserCommissionController';
import { DateRangePicker } from '@/components/date-range-picker';
import HeadingSheet from '@/components/heading-sheet';
import { Pagination } from '@/components/pagination';
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import SpecimenViewSheet from '../specimens/specimen-view-sheet';

interface User {
    id: number;
    name: string;
    email: string;
}

interface SpecimenType {
    id: number;
    name: string;
    description?: string;
}

interface SpecimenTypeExamination {
    id: number;
    specimen_type: number;
    name: string;
    description?: string;
}

interface Specimen {
    id: number;
    sequence_code: string;
    type?: SpecimenType;
    examination?: SpecimenTypeExamination;
}

interface UserCommissionRule {
    id: number;
    user_id: number;
    specimen_type_id: number;
    specimen_type_examination_id: number;
    macroscopy_commission_enabled: boolean;
    macroscopy_calculation_type: 'fixed' | 'percentage';
    macroscopy_commission_value: string;
    microscopy_commission_enabled: boolean;
    microscopy_calculation_type: 'fixed' | 'percentage';
    microscopy_commission_value: string;
    specimen_type?: SpecimenType;
    specimen_type_examination?: SpecimenTypeExamination;
}

interface UserCommission {
    id: number;
    user_id: number;
    specimen_id: number;
    user_commission_rule_id: number;
    phase: 'macroscopy' | 'microscopy';
    specimen_base_amount: string;
    calculated_comission_amount: string;
    user_commission_rule_applied: Partial<UserCommissionRule> | null;
    status: 'pending' | 'paid' | 'cancelled';
    paid_at?: string;
    created_at?: string;
    user?: User;
    specimen?: Specimen;
    rule?: UserCommissionRule;
    created_by?: User | null;
    updated_by?: User | null;
    paid_by?: User | null;
}

interface Props {
    commissions: {
        data: UserCommission[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
        from: number;
        to: number;
    };
    users: User[];
    specimenTypes: SpecimenType[];
    filters: {
        search?: string;
        status?: string;
        user_id?: string;
        specimen_type_id?: string;
        date_from?: string;
        date_to?: string;
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
    };
}

function FilterCombobox({
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
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild className="w-full">
                <button
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm font-normal whitespace-nowrap text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50"
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="z-[120] w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
            >
                <Command>
                    <CommandInput placeholder="Buscar..." />
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

export default function UserCommissionsIndex({
    commissions,
    users,
    specimenTypes,
    filters,
}: Props) {
    const { auth } = usePage<any>().props;
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCommission, setSelectedCommission] =
        useState<UserCommission | null>(null);
    const [commissionToDelete, setCommissionToDelete] =
        useState<UserCommission | null>(null);
    const [search, setSearch] = useState(filters.search || '');
    const [editStatus, setEditStatus] = useState<
        'pending' | 'paid' | 'cancelled'
    >('pending');
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [detailsCommission, setDetailsCommission] =
        useState<UserCommission | null>(null);
    const [copied, setCopied] = useState(false);
    const [isSpecimenViewOpen, setIsSpecimenViewOpen] = useState(false);
    const [viewSpecimen, setViewSpecimen] = useState<any | null>(null);

    const handleDetailsClick = (commission: UserCommission) => {
        setDetailsCommission(commission);
        setIsDetailsOpen(true);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('JSON copiado al portapapeles');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const newFilters = { ...filters, [key]: value, page: 1 };

            if (value === 'all') {
                delete newFilters[key as keyof typeof newFilters];
            }

            router.get(userCommissionsIndex().url, newFilters, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                handleFilterChange('search', value);
            }, 300),
        [handleFilterChange],
    );

    useEffect(() => {
        if (search !== (filters.search || '')) {
            debouncedSearch(search);
        }
    }, [search, debouncedSearch, filters.search]);

    const handleStatusFilterChange = (value: string) => {
        handleFilterChange('status', value === 'all' ? '' : value);
    };

    const userOptions = useMemo(
        () => [
            { label: 'Todos los patólogos', value: 'all' },
            ...users.map((u) => ({
                label: u.name,
                value: u.id.toString(),
            })),
        ],
        [users],
    );

    const specimenTypeOptions = useMemo(
        () => [
            { label: 'Todos los tipos de muestra', value: 'all' },
            ...specimenTypes.map((st) => ({
                label: st.name,
                value: st.id.toString(),
            })),
        ],
        [specimenTypes],
    );

    const hasActiveFilters = useMemo(() => {
        return !!(
            filters.search ||
            filters.status ||
            filters.user_id ||
            filters.specimen_type_id ||
            filters.date_from ||
            filters.date_to
        );
    }, [filters]);

    const handleClearFilters = useCallback(() => {
        setSearch('');
        const newFilters: Record<string, any> = { ...filters };
        delete newFilters.search;
        delete newFilters.status;
        delete newFilters.user_id;
        delete newFilters.specimen_type_id;
        delete newFilters.date_from;
        delete newFilters.date_to;
        newFilters.page = 1;

        router.get(userCommissionsIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    const handleSort = (field: string) => {
        const isCurrentField = filters.sort_field === field;
        const direction =
            isCurrentField && filters.sort_direction === 'asc' ? 'desc' : 'asc';

        const newFilters = {
            ...filters,
            sort_field: field,
            sort_direction: direction,
            page: 1,
        };

        router.get(userCommissionsIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const renderSortHeader = (
        field: string,
        label: string,
        isRightAlign: boolean = false,
    ) => {
        const isSorted = filters.sort_field === field;
        const direction = isSorted ? filters.sort_direction || 'desc' : null;

        return (
            <button
                type="button"
                onClick={() => handleSort(field)}
                className={`group/btn inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-foreground ${
                    isRightAlign
                        ? 'ml-auto justify-end text-right'
                        : 'text-left'
                }`}
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

    const handleEditClick = (commission: UserCommission) => {
        setSelectedCommission(commission);
        setEditStatus(commission.status);
        setIsUpdateDialogOpen(true);
    };

    const confirmUpdateStatus = (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedCommission) {
            router.put(
                updateCommission(selectedCommission.id).url,
                { status: editStatus },
                {
                    onSuccess: () => {
                        toast.success(
                            'Estado de comisión actualizado correctamente',
                        );
                        setIsUpdateDialogOpen(false);
                    },
                    onError: (err) => {
                        console.error(err);
                        toast.error(
                            'Error al actualizar el estado de la comisión',
                        );
                    },
                },
            );
        }
    };

    const handleDeleteClick = (commission: UserCommission) => {
        setCommissionToDelete(commission);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (commissionToDelete) {
            router.delete(destroyCommission(commissionToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Comisión eliminada correctamente');
                    setIsDeleteDialogOpen(false);
                },
                onError: (err) => {
                    console.error(err);
                    toast.error('Error al eliminar la comisión');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    const getStatusBadge = (status: UserCommission['status']) => {
        switch (status) {
            case 'paid':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Pagado
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                        <XCircle className="h-3 w-3" /> Cancelado
                    </span>
                );
            case 'pending':
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                        <Clock className="h-3 w-3" /> Pendiente
                    </span>
                );
        }
    };

    const formatCurrency = (amount: string) => {
        const val = parseFloat(amount) || 0;

        return `L. ${val.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) {
            return '—';
        }

        return new Date(dateStr).toLocaleDateString('es-HN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <>
            <Head title="Comisiones Otorgadas" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Comisiones Otorgadas
                        </h1>
                        <p className="text-muted-foreground">
                            Visualice e instrumente los pagos de las comisiones
                            generadas por los análisis patológicos.
                        </p>
                    </div>
                </div>

                {/* Filters Area - Search on Row 1, other filters on Row 2 */}
                <div className="flex w-full flex-col gap-4">
                    {/* Row 1: Search & Date Range */}
                    <div className="flex flex-col justify-stretch gap-4 sm:flex-row sm:items-end">
                        <div className="relative w-full flex-1">
                            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por patólogo o muestra..."
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

                                    router.get(
                                        userCommissionsIndex().url,
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
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {/* Pathologist Filter */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Filtrar por Patólogo
                            </span>
                            <FilterCombobox
                                placeholder="Todos los patólogos"
                                value={filters.user_id || 'all'}
                                onChange={(val) =>
                                    handleFilterChange('user_id', val)
                                }
                                options={userOptions}
                            />
                        </div>

                        {/* Specimen Type Filter */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Tipo de Muestra
                            </span>
                            <FilterCombobox
                                placeholder="Todos los tipos"
                                value={filters.specimen_type_id || 'all'}
                                onChange={(val) =>
                                    handleFilterChange('specimen_type_id', val)
                                }
                                options={specimenTypeOptions}
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Estado
                            </span>
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={handleStatusFilterChange}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Filtrar por estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los estados
                                    </SelectItem>
                                    <SelectItem value="pending">
                                        Pendiente
                                    </SelectItem>
                                    <SelectItem value="paid">Pagado</SelectItem>
                                    <SelectItem value="cancelled">
                                        Cancelado
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Clear Filters Button */}
                        {hasActiveFilters && (
                            <div className="flex w-full">
                                <Button
                                    variant="outline"
                                    onClick={handleClearFilters}
                                    className="h-10 w-full gap-2 border-dashed text-muted-foreground hover:border-solid hover:bg-background hover:text-foreground"
                                >
                                    <X className="h-4 w-4" /> Limpiar Filtros
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[150px]">
                                    {renderSortHeader('name', 'Patólogo')}
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    {renderSortHeader('specimen', 'Muestra')}
                                </TableHead>
                                <TableHead>Reporte</TableHead>
                                <TableHead>Fase</TableHead>
                                <TableHead className="text-right">
                                    {renderSortHeader(
                                        'base_amount',
                                        'Base Factura',
                                        true,
                                    )}
                                </TableHead>
                                <TableHead className="text-right">
                                    {renderSortHeader(
                                        'amount',
                                        'Comisión',
                                        true,
                                    )}
                                </TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha de Pago</TableHead>
                                <TableHead className="text-right">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {commissions.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={9}
                                        className="h-24 text-center text-sm text-muted-foreground"
                                    >
                                        No se encontraron registros de
                                        comisiones.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                commissions.data.map((commission) => (
                                    <TableRow
                                        key={commission.id}
                                        className="transition-colors hover:bg-muted/10"
                                    >
                                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                                            {commission.user?.name ||
                                                'Usuario desconocido'}
                                        </TableCell>
                                        <TableCell>
                                            {commission.specimen ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-max rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary dark:bg-primary/10">
                                                            {
                                                                commission
                                                                    .specimen
                                                                    .sequence_code
                                                            }
                                                        </span>
                                                        <button
                                                            className="inline-flex size-9 h-5 w-5 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                                                            title="Ver Muestra"
                                                            onClick={() => {
                                                                setViewSpecimen(
                                                                    commission.specimen,
                                                                );
                                                                setIsSpecimenViewOpen(
                                                                    true,
                                                                );
                                                            }}
                                                        >
                                                            <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                        </button>
                                                        <button
                                                            className="inline-flex size-9 h-5 w-5 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                                                            title="Editar Muestra"
                                                            onClick={() =>
                                                                window.open(
                                                                    `/specimens?specimen=${commission.specimen?.sequence_code}&action=edit`,
                                                                    '_blank',
                                                                )
                                                            }
                                                        >
                                                            <SquarePen className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                        </button>
                                                    </div>
                                                    <span
                                                        className="text-[10px] text-muted-foreground"
                                                        title={
                                                            commission.specimen
                                                                .type?.name ||
                                                            'N/A'
                                                        }
                                                    >
                                                        {commission.specimen
                                                            .type?.name ||
                                                            'N/A'}{' '}
                                                        -{' '}
                                                        {commission.specimen
                                                            .examination
                                                            ?.name || 'N/A'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">
                                                    Muestra eliminada
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {commission.specimen ? (
                                                <a
                                                    href={`/specimens/${commission.specimen.sequence_code}/report-editor`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                                                >
                                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                    Ver Reporte
                                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                                </a>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {commission.phase ===
                                            'macroscopy' ? (
                                                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 ring-1 ring-purple-700/10 ring-inset dark:bg-purple-950/20 dark:text-purple-400">
                                                    Macroscopía
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-700/10 ring-inset dark:bg-blue-950/20 dark:text-blue-400">
                                                    Microscopía
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {formatCurrency(
                                                commission.specimen_base_amount,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(
                                                commission.calculated_comission_amount,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(commission.status)}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {formatDate(commission.paid_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleDetailsClick(
                                                            commission,
                                                        )
                                                    }
                                                    title="Ver Detalles"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {auth.permissions?.includes(
                                                    'user_commission_rules.edit',
                                                ) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleEditClick(
                                                                commission,
                                                            )
                                                        }
                                                        title="Editar Estado"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {auth.permissions?.includes(
                                                    'user_commission_rules.delete',
                                                ) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:bg-destructive/10"
                                                        onClick={() =>
                                                            handleDeleteClick(
                                                                commission,
                                                            )
                                                        }
                                                        title="Eliminar Comisión"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={commissions.links}
                    meta={{
                        from: commissions.from,
                        to: commissions.to,
                        total: commissions.total,
                    }}
                />
            </div>

            {/* Update Dialog */}
            <Dialog
                open={isUpdateDialogOpen}
                onOpenChange={setIsUpdateDialogOpen}
            >
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={confirmUpdateStatus}>
                        <DialogHeader>
                            <DialogTitle>Editar Estado de Comisión</DialogTitle>
                            <DialogDescription>
                                Actualice el estado de pago para la comisión de{' '}
                                <strong>
                                    {selectedCommission?.user?.name}
                                </strong>
                                .
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="commission-status"
                                    className="text-sm font-semibold"
                                >
                                    Estado del Pago
                                </Label>
                                <Select
                                    value={editStatus}
                                    onValueChange={(val: any) =>
                                        setEditStatus(val)
                                    }
                                >
                                    <SelectTrigger id="commission-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">
                                            Pendiente
                                        </SelectItem>
                                        <SelectItem value="paid">
                                            Pagado
                                        </SelectItem>
                                        <SelectItem value="cancelled">
                                            Cancelado
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsUpdateDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit">Guardar Cambios</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Está seguro de que desea eliminar este registro?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará de forma permanente la
                            comisión de{' '}
                            <strong>{commissionToDelete?.user?.name}</strong>{' '}
                            correspondiente al caso{' '}
                            <strong>
                                {commissionToDelete?.specimen?.sequence_code}
                            </strong>
                            . Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Eliminar Registro
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Details Sheet */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-[540px] md:max-w-[600px]">
                    {detailsCommission && (
                        <div className="flex h-full flex-col gap-6 pb-8">
                            <HeadingSheet
                                title={`Comisión #${detailsCommission.id}`}
                                description="Detalle completo de los cálculos, estado y regla aplicada."
                            />

                            <div className="space-y-6 px-5">
                                {/* General Information Card */}
                                <div className="space-y-3 rounded-lg border bg-card p-4 shadow-xs">
                                    <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                        Información General
                                    </h3>
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-2">
                                        <div>
                                            <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                Patólogo
                                            </span>
                                            <span className="font-semibold text-foreground">
                                                {detailsCommission.user?.name ||
                                                    'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                Muestra
                                            </span>
                                            {detailsCommission.specimen ? (
                                                <a
                                                    href={`/specimens/${detailsCommission.specimen.sequence_code}/report-editor`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                                                >
                                                    {
                                                        detailsCommission
                                                            .specimen
                                                            .sequence_code
                                                    }{' '}
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground italic">
                                                    Muestra eliminada
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                Fase de Trabajo
                                            </span>
                                            <div className="mt-1">
                                                {detailsCommission.phase ===
                                                'macroscopy' ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-purple-500/20 bg-purple-500/10 font-semibold text-purple-700 dark:text-purple-400"
                                                    >
                                                        Macroscopía
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-blue-500/20 bg-blue-500/10 font-semibold text-blue-700 dark:text-blue-400"
                                                    >
                                                        Microscopía
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                Fecha Generada
                                            </span>
                                            <span className="font-semibold text-foreground">
                                                {detailsCommission.created_at
                                                    ? formatDate(
                                                          detailsCommission.created_at,
                                                      )
                                                    : formatDate(
                                                          detailsCommission.paid_at,
                                                      )}
                                            </span>
                                        </div>
                                    </div>

                                    {(detailsCommission.specimen?.type ||
                                        detailsCommission.specimen
                                            ?.examination) && (
                                        <>
                                            <Separator className="my-2" />
                                            <div className="space-y-1.5 text-xs">
                                                {detailsCommission.specimen
                                                    ?.type && (
                                                    <div>
                                                        <span className="font-semibold text-muted-foreground">
                                                            Tipo de Muestra:
                                                        </span>{' '}
                                                        <span className="text-foreground">
                                                            {
                                                                detailsCommission
                                                                    .specimen
                                                                    .type.name
                                                            }
                                                        </span>
                                                    </div>
                                                )}
                                                {detailsCommission.specimen
                                                    ?.examination && (
                                                    <div>
                                                        <span className="font-semibold text-muted-foreground">
                                                            Examen:
                                                        </span>{' '}
                                                        <span className="text-foreground">
                                                            {
                                                                detailsCommission
                                                                    .specimen
                                                                    .examination
                                                                    .name
                                                            }
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Payment Status Card */}
                                <div className="space-y-3 rounded-lg border bg-card p-4 shadow-xs">
                                    <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                        Estado de Pago
                                    </h3>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                Estado Actual
                                            </span>
                                            <div className="mt-0.5">
                                                {detailsCommission.status ===
                                                'paid' ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                    >
                                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                                        Pagado
                                                    </Badge>
                                                ) : detailsCommission.status ===
                                                  'cancelled' ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                                    >
                                                        <XCircle className="mr-1 h-3 w-3" />
                                                        Cancelado
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                                    >
                                                        <Clock className="mr-1 h-3 w-3" />
                                                        Pendiente
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {detailsCommission.status === 'paid' &&
                                            detailsCommission.paid_at && (
                                                <div className="text-right text-xs">
                                                    <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                        Fecha de Pago
                                                    </span>
                                                    <span className="font-semibold text-foreground">
                                                        {formatDate(
                                                            detailsCommission.paid_at,
                                                        )}
                                                    </span>
                                                    {detailsCommission.paid_by && (
                                                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                                                            por{' '}
                                                            {
                                                                detailsCommission
                                                                    .paid_by
                                                                    .name
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                    </div>
                                </div>

                                {/* Calculation Breakdown Card */}
                                <div className="space-y-4 rounded-lg border bg-card p-4 shadow-xs">
                                    <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                        <Calculator className="h-4 w-4 text-primary" />
                                        Cálculo de la Comisión
                                    </h3>
                                    <Separator />
                                    <div className="space-y-3 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Base Factura de Muestra:
                                            </span>
                                            <span className="font-mono font-semibold">
                                                {formatCurrency(
                                                    detailsCommission.specimen_base_amount,
                                                )}
                                            </span>
                                        </div>

                                        {(() => {
                                            const ruleApplied =
                                                detailsCommission.user_commission_rule_applied ||
                                                {};
                                            const phase =
                                                detailsCommission.phase;
                                            const calcType =
                                                ruleApplied[
                                                    `${phase}_calculation_type`
                                                ] || 'N/A';
                                            const value =
                                                ruleApplied[
                                                    `${phase}_commission_value`
                                                ] || '0';

                                            return (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                            Tipo de Regla
                                                            Aplicada:
                                                        </span>
                                                        <span className="font-semibold capitalize">
                                                            {calcType ===
                                                            'fixed'
                                                                ? 'Monto Fijo'
                                                                : calcType ===
                                                                    'percentage'
                                                                  ? 'Porcentaje'
                                                                  : calcType}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                            Valor de la Regla:
                                                        </span>
                                                        <span className="font-semibold">
                                                            {calcType ===
                                                            'fixed'
                                                                ? formatCurrency(
                                                                      String(
                                                                          value,
                                                                      ),
                                                                  )
                                                                : `${value}%`}
                                                        </span>
                                                    </div>

                                                    <div className="mt-4 rounded-md border border-muted-foreground/10 bg-muted/50 p-3.5">
                                                        <span className="mb-1.5 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                            Fórmula de Cálculo
                                                        </span>
                                                        <div className="flex flex-col gap-1 font-mono text-xs text-foreground">
                                                            {calcType ===
                                                            'percentage' ? (
                                                                <>
                                                                    <div className="flex justify-between text-muted-foreground">
                                                                        <span>
                                                                            Base
                                                                            Muestra:
                                                                        </span>
                                                                        <span>
                                                                            {formatCurrency(
                                                                                detailsCommission.specimen_base_amount,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between text-muted-foreground">
                                                                        <span>
                                                                            Porcentaje:
                                                                        </span>
                                                                        <span>
                                                                            ×{' '}
                                                                            {
                                                                                value
                                                                            }
                                                                            %
                                                                        </span>
                                                                    </div>
                                                                    <Separator className="my-1" />
                                                                    <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                                                                        <span>
                                                                            Comisión
                                                                            Calculada:
                                                                        </span>
                                                                        <span>
                                                                            {formatCurrency(
                                                                                detailsCommission.calculated_comission_amount,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="flex justify-between text-muted-foreground">
                                                                        <span>
                                                                            Monto
                                                                            Fijo
                                                                            de
                                                                            Regla:
                                                                        </span>
                                                                        <span>
                                                                            {formatCurrency(
                                                                                String(
                                                                                    value,
                                                                                ),
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <Separator className="my-1" />
                                                                    <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                                                                        <span>
                                                                            Comisión
                                                                            Calculada:
                                                                        </span>
                                                                        <span>
                                                                            {formatCurrency(
                                                                                detailsCommission.calculated_comission_amount,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Rule applied details */}
                                {detailsCommission.user_commission_rule_applied && (
                                    <div className="space-y-3 rounded-lg border bg-card p-4 shadow-xs">
                                        <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                            Regla de Comisión Utilizada
                                            (Histórica)
                                        </h3>
                                        <Separator />
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                    ID de Regla
                                                </span>
                                                <span className="font-mono text-foreground">
                                                    #
                                                    {detailsCommission
                                                        .user_commission_rule_applied
                                                        .id ||
                                                        detailsCommission.user_commission_rule_id}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                    Estado de la Regla en BD
                                                </span>
                                                <span className="font-semibold text-foreground">
                                                    {detailsCommission.rule ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400">
                                                            Activa en el sistema
                                                        </span>
                                                    ) : (
                                                        <span className="font-semibold text-rose-500 italic">
                                                            Eliminada
                                                            (Histórica)
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="col-span-2 mt-1 space-y-2 rounded-md bg-muted/30 p-2.5">
                                                <div>
                                                    <span className="block text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                                                        Macroscopía
                                                    </span>
                                                    <span className="text-xs">
                                                        {detailsCommission
                                                            .user_commission_rule_applied
                                                            .macroscopy_commission_enabled ? (
                                                            <span>
                                                                Habilitado (
                                                                {detailsCommission
                                                                    .user_commission_rule_applied
                                                                    .macroscopy_calculation_type ===
                                                                'fixed'
                                                                    ? 'Fijo'
                                                                    : 'Porcentaje'}
                                                                :{' '}
                                                                <strong>
                                                                    {detailsCommission
                                                                        .user_commission_rule_applied
                                                                        .macroscopy_calculation_type ===
                                                                    'fixed'
                                                                        ? formatCurrency(
                                                                              String(
                                                                                  detailsCommission
                                                                                      .user_commission_rule_applied
                                                                                      .macroscopy_commission_value,
                                                                              ),
                                                                          )
                                                                        : `${detailsCommission.user_commission_rule_applied.macroscopy_commission_value}%`}
                                                                </strong>
                                                                )
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">
                                                                Deshabilitado
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                                                        Microscopía
                                                    </span>
                                                    <span className="text-xs">
                                                        {detailsCommission
                                                            .user_commission_rule_applied
                                                            .microscopy_commission_enabled ? (
                                                            <span>
                                                                Habilitado (
                                                                {detailsCommission
                                                                    .user_commission_rule_applied
                                                                    .microscopy_calculation_type ===
                                                                'fixed'
                                                                    ? 'Fijo'
                                                                    : 'Porcentaje'}
                                                                :{' '}
                                                                <strong>
                                                                    {detailsCommission
                                                                        .user_commission_rule_applied
                                                                        .microscopy_commission_value !==
                                                                    undefined
                                                                        ? detailsCommission
                                                                              .user_commission_rule_applied
                                                                              .microscopy_calculation_type ===
                                                                          'fixed'
                                                                            ? formatCurrency(
                                                                                  String(
                                                                                      detailsCommission
                                                                                          .user_commission_rule_applied
                                                                                          .microscopy_commission_value,
                                                                                  ),
                                                                              )
                                                                            : `${detailsCommission.user_commission_rule_applied.microscopy_commission_value}%`
                                                                        : '0'}
                                                                </strong>
                                                                )
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">
                                                                Deshabilitado
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Raw JSON Snapshot code-like view */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                            Registro de Snapshot JSON
                                            (Histórico)
                                        </h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 gap-1 px-2 text-[10px] hover:bg-muted"
                                            onClick={() =>
                                                copyToClipboard(
                                                    JSON.stringify(
                                                        detailsCommission.user_commission_rule_applied,
                                                        null,
                                                        4,
                                                    ),
                                                )
                                            }
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                    Copiado
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3 w-3" />
                                                    Copiar JSON
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <div className="relative rounded-md border bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-100 dark:border-slate-800 dark:bg-slate-900/60">
                                        <pre className="max-h-[200px] scrollbar-thin scrollbar-thumb-muted-foreground/20 overflow-auto">
                                            <code>
                                                {JSON.stringify(
                                                    detailsCommission.user_commission_rule_applied,
                                                    null,
                                                    4,
                                                )}
                                            </code>
                                        </pre>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">
                                        * Este JSON es de solo lectura y
                                        contiene los valores exactos aplicados
                                        en la regla de comisión en la fecha de
                                        finalización.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Specimen View Sheet */}
            <SpecimenViewSheet
                specimen={viewSpecimen}
                open={isSpecimenViewOpen}
                onOpenChange={setIsSpecimenViewOpen}
                onEditClick={() => {
                    setIsSpecimenViewOpen(false);

                    if (viewSpecimen) {
                        window.open(
                            `/specimens?specimen=${viewSpecimen.sequence_code}&action=edit`,
                            '_blank',
                        );
                    }
                }}
            />
        </>
    );
}
