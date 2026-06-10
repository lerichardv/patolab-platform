import { Head, router } from '@inertiajs/react';
import { differenceInDays, parseISO, format } from 'date-fns';
import debounce from 'lodash/debounce';
import {
    Edit2,
    Plus,
    Search,
    Trash2,
    Receipt,
    AlertTriangle,
    CheckCircle,
    Clock,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
    index as caiRangesIndex,
    destroy as destroyCaiRange,
} from '@/actions/App/Http/Controllers/CaiRangeController';
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
import { Input } from '@/components/ui/input';
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
import CaiRangeSheet from './cai-range-sheet';

interface Location {
    id: number;
    name: string;
}

interface CaiRange {
    id: number;
    location_id: number;
    location: Location;
    cai: string;
    full_prefix: string;
    emission: string;
    establishment: string;
    document_type: string;
    start_number: number;
    end_number: number;
    last_used_number: number;
    deadline: string;
    status: 'active' | 'exhausted' | 'expired';
    limit_percentage_warning: number;
    limit_days_warning: number;
    warning_notifications_amount: number;
    warning_notifications_sent: number;
}

interface Props {
    caiRanges: {
        data: CaiRange[];
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
    locations: Location[];
    filters: {
        search?: string;
        status?: string;
    };
}

export default function CaiRangesIndex({
    caiRanges,
    locations,
    filters,
}: Props) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCaiRange, setSelectedCaiRange] = useState<CaiRange | null>(
        null,
    );
    const [caiRangeToDelete, setCaiRangeToDelete] = useState<CaiRange | null>(
        null,
    );
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === 'all' || value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        router.get(caiRangesIndex().url, newFilters, {
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

    const handleEdit = (caiRange: CaiRange) => {
        setSelectedCaiRange(caiRange);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedCaiRange(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (caiRange: CaiRange) => {
        setCaiRangeToDelete(caiRange);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (caiRangeToDelete) {
            router.delete(destroyCaiRange(caiRangeToDelete.id).url, {
                onSuccess: () => {
                    toast.success(
                        'Rango de facturación eliminado correctamente',
                    );
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    const padDocNumber = (num: number) => {
        return String(num).padStart(8, '0');
    };

    const getDeadlineInfo = (caiRange: CaiRange) => {
        const deadline = parseISO(caiRange.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        deadline.setHours(0, 0, 0, 0);

        const daysRemaining = differenceInDays(deadline, today);
        const isWarning = daysRemaining <= caiRange.limit_days_warning;

        return {
            daysRemaining,
            isWarning,
            formattedDate: format(deadline, 'dd/MM/yyyy'),
        };
    };

    const getStatusBadge = (status: 'active' | 'exhausted' | 'expired') => {
        switch (status) {
            case 'active':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1 rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                    >
                        <CheckCircle className="size-3" /> Activo
                    </Badge>
                );
            case 'exhausted':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1 rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                    >
                        <Clock className="size-3" /> Agotado
                    </Badge>
                );
            case 'expired':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1 rounded-full border-rose-200 bg-rose-50 px-2.5 py-0.5 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
                    >
                        <AlertTriangle className="size-3" /> Expirado
                    </Badge>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Head title="Rangos de Facturación" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Rangos de Facturación
                        </h1>
                        <p className="text-muted-foreground">
                            Administre y supervise los rangos autorizados del
                            CAI para facturación.
                        </p>
                    </div>
                    <div>
                        <Button
                            onClick={handleCreate}
                            className="h-10 w-full px-5 text-sm md:w-auto"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Rango
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="relative md:col-span-2">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por CAI o prefijo..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select
                        value={filters.status || 'all'}
                        onValueChange={(v) => handleFilterChange('status', v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                Todos los estados
                            </SelectItem>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="exhausted">Agotado</SelectItem>
                            <SelectItem value="expired">Expirado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sucursal</TableHead>
                                <TableHead>Prefijo & CAI</TableHead>
                                <TableHead>Rango Numérico</TableHead>
                                <TableHead>Último Usado</TableHead>
                                <TableHead>Fecha Límite</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {caiRanges.data.length > 0 ? (
                                caiRanges.data.map((caiRange) => {
                                    const {
                                        daysRemaining,
                                        isWarning,
                                        formattedDate,
                                    } = getDeadlineInfo(caiRange);
                                    const isExhaustedOrExpired =
                                        caiRange.status !== 'active';

                                    return (
                                        <TableRow
                                            key={caiRange.id}
                                            className={
                                                caiRange.status === 'expired' ||
                                                caiRange.status === 'exhausted'
                                                    ? 'bg-muted/40 text-muted-foreground opacity-60'
                                                    : ''
                                            }
                                        >
                                            <TableCell className="font-medium">
                                                {caiRange.location?.name ||
                                                    'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-sm font-semibold">
                                                        {caiRange.full_prefix}
                                                    </span>
                                                    <span
                                                        className="max-w-[200px] truncate text-xs text-muted-foreground"
                                                        title={caiRange.cai}
                                                    >
                                                        {caiRange.cai}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs">
                                                    {padDocNumber(
                                                        caiRange.start_number,
                                                    )}{' '}
                                                    -{' '}
                                                    {padDocNumber(
                                                        caiRange.end_number,
                                                    )}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const total =
                                                        caiRange.end_number -
                                                        caiRange.start_number +
                                                        1;
                                                    const remaining = Math.max(
                                                        0,
                                                        caiRange.end_number -
                                                            caiRange.last_used_number,
                                                    );
                                                    const remainingPercentage =
                                                        total > 0
                                                            ? (remaining /
                                                                  total) *
                                                              100
                                                            : 0;
                                                    const isPercentageWarning =
                                                        remainingPercentage <=
                                                        caiRange.limit_percentage_warning;
                                                    const isExhaustedOrExpired =
                                                        caiRange.status !==
                                                        'active';

                                                    return (
                                                        <div className="flex flex-col">
                                                            <span
                                                                className={`font-mono text-xs font-semibold ${
                                                                    isPercentageWarning &&
                                                                    !isExhaustedOrExpired &&
                                                                    remaining >
                                                                        0
                                                                        ? 'text-orange-500'
                                                                        : ''
                                                                }`}
                                                            >
                                                                {padDocNumber(
                                                                    caiRange.last_used_number,
                                                                )}
                                                            </span>
                                                            <span
                                                                className={`text-[10px] ${
                                                                    isPercentageWarning &&
                                                                    !isExhaustedOrExpired &&
                                                                    remaining >
                                                                        0
                                                                        ? 'font-semibold text-orange-500'
                                                                        : 'text-muted-foreground'
                                                                }`}
                                                            >
                                                                {remaining}{' '}
                                                                disponibles
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span
                                                        className={`text-sm font-semibold ${isWarning && !isExhaustedOrExpired ? 'text-orange-500' : ''}`}
                                                    >
                                                        {formattedDate}
                                                    </span>
                                                    {!isExhaustedOrExpired && (
                                                        <span
                                                            className={`text-[10px] ${isWarning ? 'font-semibold text-orange-500' : 'text-muted-foreground'}`}
                                                        >
                                                            {daysRemaining < 0
                                                                ? 'Vencido'
                                                                : `${daysRemaining} días restantes`}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(
                                                    caiRange.status,
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleEdit(caiRange)
                                                        }
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() =>
                                                            handleDeleteClick(
                                                                caiRange,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No se encontraron rangos de facturación.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={caiRanges.links}
                    meta={{
                        from: caiRanges.from,
                        to: caiRanges.to,
                        total: caiRanges.total,
                    }}
                />
            </div>

            <CaiRangeSheet
                caiRange={selectedCaiRange}
                locations={locations}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

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
                            Esta acción eliminará permanentemente el rango de
                            facturación con prefijo{' '}
                            <strong>{caiRangeToDelete?.full_prefix}</strong>.
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
