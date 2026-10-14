import { Head, Link, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import { Clock, Download, Eye, FileText, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Pagination } from '@/components/pagination';
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { dashboard } from '@/routes/customer-portal';
import { report, show } from '@/routes/customer-portal/specimens';

interface CustomerSummary {
    id: number;
    name: string;
    id_number: string;
    formatted_age?: string;
    age?: number | string;
    age_unit?: string;
}

interface Specimen {
    id: number;
    sequence_code: string;
    status: string;
    status_label?: string;
    status_color?: string;
    received_at: string | null;
    finalized_at: string | null;
    report_id: number | null;
    customer_relation?: CustomerSummary;
    customerRelation?: CustomerSummary;
    type?: {
        id: number;
        name: string;
    };
    examination?: {
        id: number;
        name: string;
    };
    category?: {
        id: number;
        name: string;
    };
}

interface Props {
    specimens: {
        data: Specimen[];
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
        date_from?: string;
        date_to?: string;
    };
    stats?: {
        total: number;
        in_progress: number;
        finalized: number;
    };
}

const STATUS_LABELS: Record<string, string> = {
    received: 'Recibido',
    macroscopic_review: 'Rev. Macroscópica',
    processing: 'Procesamiento',
    microscopic_review: 'Rev. Microscópica',
    finalized: 'Finalizado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
};

const STATUS_VARIANTS: Record<string, string> = {
    received:
        'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    macroscopic_review:
        'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    processing:
        'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    microscopic_review:
        'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800',
    finalized:
        'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    delivered:
        'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    cancelled:
        'bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
};

export default function CustomerPortalIndex({ specimens, filters }: Props) {
    const { props } = usePage<any>();
    const customer = props.auth?.customer;

    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === 'all' || value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        router.get(dashboard().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                handleFilterChange('search', value);
            }, 300),
        [filters],
    );

    useEffect(() => {
        if (search !== (filters.search || '')) {
            debouncedSearch(search);
        }
    }, [search]);

    const clearFilters = () => {
        setSearch('');
        router.get(dashboard().url, {}, { preserveState: true, replace: true });
    };

    const hasActiveFilters = Boolean(
        filters.search ||
        (filters.status && filters.status !== 'all') ||
        filters.date_from ||
        filters.date_to,
    );

    return (
        <div className="flex flex-col gap-4">
            <Head title="Mis Estudios y Reportes — Portal de Clientes" />

            {/* Header */}
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Mis Estudios y Reportes
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Bienvenido(a), {customer?.name}. Monitoree el estado de
                        sus muestras en tiempo real y descargue reportes
                        médicos.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className="px-3 py-1 text-xs font-medium"
                    >
                        {customer?.type === 'empresa'
                            ? 'Cuenta Empresa / Institucional'
                            : 'Cuenta Paciente'}
                    </Badge>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                    <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código o paciente..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <Select
                    value={filters.status || 'all'}
                    onValueChange={(val) => handleFilterChange('status', val)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Estado del estudio" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="received">Recibido</SelectItem>
                        <SelectItem value="macroscopic_review">
                            Revisión Macroscópica
                        </SelectItem>
                        <SelectItem value="processing">
                            Procesamiento
                        </SelectItem>
                        <SelectItem value="microscopic_review">
                            Revisión Microscópica
                        </SelectItem>
                        <SelectItem value="finalized">Finalizado</SelectItem>
                        <SelectItem value="delivered">Entregado</SelectItem>
                    </SelectContent>
                </Select>

                <Input
                    type="date"
                    value={filters.date_from || ''}
                    onChange={(e) =>
                        handleFilterChange('date_from', e.target.value)
                    }
                    title="Desde fecha de recepción"
                />

                <Input
                    type="date"
                    value={filters.date_to || ''}
                    onChange={(e) =>
                        handleFilterChange('date_to', e.target.value)
                    }
                    title="Hasta fecha de recepción"
                />
            </div>

            {/* Specimens List / Table */}
            <div className="rounded-md border bg-card">
                {specimens.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[170px]">
                                        Código
                                    </TableHead>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>Estudio / Examen</TableHead>
                                    <TableHead>Fecha Recepción</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">
                                        Acciones
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {specimens.data.map((specimen) => {
                                    const isFinalized = [
                                        'finalized',
                                        'delivered',
                                    ].includes(specimen.status);
                                    const canDownload =
                                        isFinalized &&
                                        Boolean(specimen.report_id);
                                    const patient =
                                        specimen.customer_relation ||
                                        specimen.customerRelation;
                                    const patientAge =
                                        patient?.formatted_age ||
                                        (patient?.age != null
                                            ? `${patient.age} ${
                                                  patient.age_unit === 'months'
                                                      ? 'meses'
                                                      : patient.age_unit ===
                                                          'days'
                                                        ? 'días'
                                                        : 'años'
                                              }`
                                            : null);

                                    return (
                                        <TableRow
                                            key={specimen.id}
                                            className="transition-colors hover:bg-muted/40"
                                        >
                                            {/* Sequence Code */}
                                            <TableCell className="font-mono text-xs font-semibold text-primary">
                                                {specimen.sequence_code}
                                            </TableCell>

                                            {/* Patient info */}
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {patient?.name || 'N/A'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {patient?.id_number
                                                            ? `ID: ${patient.id_number}`
                                                            : ''}
                                                        {patientAge
                                                            ? ` • ${patientAge}`
                                                            : ''}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Study / Exam */}
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium text-foreground">
                                                        {specimen.examination
                                                            ?.name ||
                                                            specimen.type
                                                                ?.name ||
                                                            'Estudio Patológico'}
                                                    </span>
                                                    {specimen.category
                                                        ?.name && (
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {
                                                                specimen
                                                                    .category
                                                                    .name
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Received date */}
                                            <TableCell className="text-xs text-muted-foreground">
                                                {specimen.received_at
                                                    ? new Date(
                                                          specimen.received_at,
                                                      ).toLocaleDateString(
                                                          'es-HN',
                                                          {
                                                              day: '2-digit',
                                                              month: 'short',
                                                              year: 'numeric',
                                                          },
                                                      )
                                                    : 'N/A'}
                                            </TableCell>

                                            {/* Status Badge */}
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={`border text-xs font-medium ${
                                                        STATUS_VARIANTS[
                                                            specimen.status
                                                        ] ||
                                                        'bg-muted text-foreground'
                                                    }`}
                                                >
                                                    {specimen.status_label ||
                                                        STATUS_LABELS[
                                                            specimen.status
                                                        ] ||
                                                        specimen.status}
                                                </Badge>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* View Detail Button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Link
                                                            href={
                                                                show(
                                                                    specimen.sequence_code,
                                                                ).url
                                                            }
                                                        >
                                                            <Eye className="mr-1 h-3.5 w-3.5" />
                                                            Detalles
                                                        </Link>
                                                    </Button>

                                                    {/* Download PDF Button */}
                                                    {canDownload ? (
                                                        <Button
                                                            size="sm"
                                                            asChild
                                                            className="h-8 bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
                                                        >
                                                            <a
                                                                href={
                                                                    report(
                                                                        specimen.sequence_code,
                                                                    ).url
                                                                }
                                                                download
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <Download className="mr-1 h-3.5 w-3.5" />
                                                                Reporte
                                                            </a>
                                                        </Button>
                                                    ) : (
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <span>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        disabled
                                                                        className="h-8 text-xs text-muted-foreground opacity-60"
                                                                    >
                                                                        <Clock className="mr-1 h-3.5 w-3.5" />
                                                                        En
                                                                        Proceso
                                                                    </Button>
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="text-xs">
                                                                    El informe
                                                                    diagnóstico
                                                                    estará
                                                                    disponible
                                                                    una vez que
                                                                    el patólogo
                                                                    finalice el
                                                                    análisis.
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
                            <FileText className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground">
                            No se encontraron muestras
                        </h3>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {hasActiveFilters
                                ? 'No hay estudios que coincidan con los filtros aplicados. Intente limpiarlos para ver todos los resultados.'
                                : 'Actualmente no tiene muestras o estudios registrados en su cuenta.'}
                        </p>
                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                className="mt-4 text-xs"
                            >
                                Limpiar filtros
                            </Button>
                        )}
                    </div>
                )}
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
    );
}
