import { Head, Link, usePage } from '@inertiajs/react';
import {
    Microscope,
    Users,
    Receipt,
    ArrowRight,
    Coins,
    Package,
    Calendar,
    Eye,
} from 'lucide-react';
import { useState } from 'react';
import { index as customersIndex } from '@/actions/App/Http/Controllers/CustomerController';
import { index as inventoriesIndex } from '@/actions/App/Http/Controllers/InventoryController';
import { index as invoicesIndex } from '@/actions/App/Http/Controllers/InvoiceController';
import { index as specimensIndex } from '@/actions/App/Http/Controllers/SpecimenController';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { dashboard } from '@/routes';

interface TodaySpecimen {
    id: number;
    sequence_code?: string;
    customer_relation?: {
        id: number;
        name: string;
        id_number: string;
    };
    type?: {
        id: number;
        name: string;
    };
    examination?: {
        id: number;
        name: string;
    };
    priority?: {
        id: number;
        name: string;
        color: string;
    };
    status: string;
    status_color?: string;
    invoice_relation?: {
        id: number;
        amount: string | number;
        total: string | number;
        payment_type: string;
    };
    created_at: string;
}

interface DashboardProps {
    specimensCount: number;
    specimensThisWeekCount: number;
    moneyMadeToday: number;
    customersCount: number;
    specimensWeeklyData: Array<{
        day: string;
        date: string;
        count: number;
        earnings: number;
    }>;
    todaySpecimens: TodaySpecimen[];
}

export default function Dashboard({
    specimensCount,
    specimensThisWeekCount,
    moneyMadeToday,
    customersCount,
    specimensWeeklyData,
    todaySpecimens,
}: DashboardProps) {
    const { auth } = usePage<any>().props;

    // Get current date formatted in Spanish
    const currentDate = new Date().toLocaleDateString('es-HN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Capitalize first letter of the weekday
    const formattedDate =
        currentDate.charAt(0).toUpperCase() + currentDate.slice(1);

    return (
        <>
            <Head title="Resumen" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Greeting Banner */}
                <div className="relative overflow-hidden rounded-2xl border border-sidebar-border/60 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-transparent p-6 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-transparent">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                ¡Hola, {auth.user.name}!
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Este es el estado general del laboratorio para
                                el día de hoy.
                            </p>
                        </div>
                        <div className="mt-2 flex items-center gap-2 self-start rounded-xl border bg-background/80 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-md md:mt-0 md:self-auto">
                            <Calendar className="size-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-muted-foreground">
                                {formattedDate}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Metric Cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Specimens Card */}
                    <Card className="group relative overflow-hidden border-sidebar-border/60 transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Muestras de la Semana
                                </span>
                                <div className="text-3xl font-bold tracking-tight text-foreground">
                                    {specimensThisWeekCount}
                                </div>
                            </div>
                            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 transition-colors duration-300 group-hover:scale-110 group-hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400">
                                <Microscope className="size-6" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Total histórico:{' '}
                                <span className="font-semibold text-foreground">
                                    {specimensCount}
                                </span>
                            </p>
                            <div className="mt-4 flex justify-end border-t pt-4">
                                <Link
                                    href={specimensIndex().url}
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-all hover:gap-2 hover:underline dark:text-blue-400"
                                >
                                    Muestras <ArrowRight className="size-4" />
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Earnings Card */}
                    <Card className="group relative overflow-hidden border-sidebar-border/60 transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Ingresos de Hoy
                                </span>
                                <div className="text-3xl font-bold tracking-tight text-foreground">
                                    L.{' '}
                                    {moneyMadeToday.toLocaleString('es-HN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </div>
                            </div>
                            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors duration-300 group-hover:scale-110 group-hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400">
                                <Coins className="size-6" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Total recaudado el día de hoy por concepto de
                                facturas.
                            </p>
                            <div className="mt-4 flex justify-end border-t pt-4">
                                <Link
                                    href={invoicesIndex()}
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 transition-all hover:gap-2 hover:underline dark:text-emerald-400"
                                >
                                    Ver facturas{' '}
                                    <ArrowRight className="size-4" />
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customers Card */}
                    <Card className="group relative overflow-hidden border-sidebar-border/60 transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Clientes Registrados
                                </span>
                                <div className="text-3xl font-bold tracking-tight text-foreground">
                                    {customersCount}
                                </div>
                            </div>
                            <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 transition-colors duration-300 group-hover:scale-110 group-hover:bg-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400">
                                <Users className="size-6" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Total de clientes y pacientes activos en el
                                sistema.
                            </p>
                            <div className="mt-4 flex justify-end border-t pt-4">
                                <Link
                                    href={customersIndex()}
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition-all hover:gap-2 hover:underline dark:text-indigo-400"
                                >
                                    Ver clientes{' '}
                                    <ArrowRight className="size-4" />
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions Row */}
                <div className="flex flex-col gap-4">
                    <h2 className="px-1 text-lg font-semibold tracking-tight text-foreground">
                        Acciones Rápidas
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Link
                            href={specimensIndex()}
                            className="group flex items-start gap-4 rounded-xl border border-sidebar-border/60 bg-card p-4 transition-all hover:border-blue-500/30 hover:shadow-sm"
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-transform group-hover:scale-105 dark:bg-blue-950 dark:text-blue-400">
                                <Microscope className="size-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                    Registrar Muestra
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Crea una nueva muestra de paciente y
                                    genera su orden de facturación.
                                </p>
                            </div>
                        </Link>

                        <Link
                            href={customersIndex()}
                            className="group flex items-start gap-4 rounded-xl border border-sidebar-border/60 bg-card p-4 transition-all hover:border-indigo-500/30 hover:shadow-sm"
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-105 dark:bg-indigo-950 dark:text-indigo-400">
                                <Users className="size-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                    Pacientes y Clientes
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Administra y registra nuevos clientes y
                                    sus expedientes en el sistema.
                                </p>
                            </div>
                        </Link>

                        <Link
                            href={invoicesIndex()}
                            className="group flex items-start gap-4 rounded-xl border border-sidebar-border/60 bg-card p-4 transition-all hover:border-emerald-500/30 hover:shadow-sm"
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105 dark:bg-emerald-950 dark:text-emerald-400">
                                <Receipt className="size-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                    Facturación y Cobros
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Consulta las facturas emitidas, los
                                    comprobantes de pago y cuentas por
                                    cobrar.
                                </p>
                            </div>
                        </Link>

                        <Link
                            href={inventoriesIndex()}
                            className="group flex items-start gap-4 rounded-xl border border-sidebar-border/60 bg-card p-4 transition-all hover:border-amber-500/30 hover:shadow-sm"
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition-transform group-hover:scale-105 dark:bg-amber-950 dark:text-amber-400">
                                <Package className="size-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                                    Control de Inventario
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Monitorea el stock disponible,
                                    reabastece productos y revisa
                                    movimientos.
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Weekly Specimens Chart */}
                <div className="grid gap-6">
                    <WeeklySpecimensChart data={specimensWeeklyData} />
                </div>

                {/* Today's Specimens List */}
                <div className="grid gap-6">
                    <TodaySpecimensList specimens={todaySpecimens} />
                </div>
            </div>
        </>
    );
}

interface ChartDataPoint {
    day: string;
    date: string;
    count: number;
    earnings: number;
}

function WeeklySpecimensChart({ data = [] }: { data: ChartDataPoint[] }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 24;
    const paddingBottom = 26;
    const width = 800;
    const height = 200;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Calculate total weekly earnings
    const totalWeeklyEarnings = data.reduce((sum, d) => sum + (d.earnings || 0), 0);

    // Find the maximum count, minimum of 5 to keep the scale nice
    const maxVal = Math.max(...data.map((d) => d.count), 0);
    const roundedMax = maxVal === 0 ? 5 : Math.ceil(maxVal / 5) * 5;

    const points = data.map((d, i) => {
        const x = paddingLeft + (i * chartWidth) / 6;
        const y =
            paddingTop + chartHeight - (d.count / roundedMax) * chartHeight;

        return { x, y, ...d, index: i };
    });

    const areaPath =
        points.length > 0
            ? `${points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
            : '';

    const linePath =
        points.length > 0
            ? points
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                .join(' ')
            : '';

    // Generate Y-axis grid ticks (e.g. 4 ticks)
    const ticksCount = 4;
    const ticks = Array.from({ length: ticksCount }).map((_, i) => {
        const val = (roundedMax / (ticksCount - 1)) * i;
        const y = paddingTop + chartHeight - (val / roundedMax) * chartHeight;

        return { val: Math.round(val), y };
    });

    return (
        <Card className="overflow-hidden border-sidebar-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold text-foreground">
                        Actividad Semanal
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                        Muestras creadas por día durante la semana actual.
                    </p>
                </div>
                <div className="flex items-center gap-4 text-right">
                    {activeIndex !== null && points[activeIndex] && (
                        <div className="hidden sm:block animate-in fade-in slide-in-from-right-1 duration-200">
                            <span className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 block font-semibold">
                                {points[activeIndex].day}
                            </span>
                            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                L. {points[activeIndex].earnings.toLocaleString('es-HN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                    )}
                    <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-semibold">
                            Total Facturado
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            L. {totalWeeklyEarnings.toLocaleString('es-HN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative aspect-[4/1] min-h-[160px] w-full">
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="h-full w-full overflow-visible select-none"
                    >
                        <defs>
                            <linearGradient
                                id="chartAreaGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="rgb(59, 130, 246)"
                                    stopOpacity="0.2"
                                />
                                <stop
                                    offset="100%"
                                    stopColor="rgb(59, 130, 246)"
                                    stopOpacity="0.0"
                                />
                            </linearGradient>
                            <linearGradient
                                id="chartLineGradient"
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="0"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="rgb(59, 130, 246)"
                                />
                                <stop
                                    offset="100%"
                                    stopColor="rgb(99, 102, 241)"
                                />
                            </linearGradient>
                        </defs>

                        {/* Y-axis Ticks & Horizontal Grid lines */}
                        {ticks.map((tick, i) => (
                            <g key={i} className="opacity-70">
                                <line
                                    x1={paddingLeft}
                                    y1={tick.y}
                                    x2={width - paddingRight}
                                    y2={tick.y}
                                    stroke="currentColor"
                                    className="text-border/40"
                                    strokeDasharray="4 4"
                                    strokeWidth="1"
                                />
                                <text
                                    x={paddingLeft - 10}
                                    y={tick.y + 4}
                                    textAnchor="end"
                                    className="fill-muted-foreground text-[10px] font-medium"
                                >
                                    {tick.val}
                                </text>
                            </g>
                        ))}

                        {/* X-axis Labels */}
                        {points.map((p, i) => (
                            <text
                                key={i}
                                x={p.x}
                                y={height - paddingBottom + 20}
                                textAnchor="middle"
                                className={`text-[10px] font-medium transition-colors duration-150 ${activeIndex === i
                                        ? 'fill-blue-600 font-bold dark:fill-blue-400'
                                        : 'fill-muted-foreground'
                                    }`}
                            >
                                {p.day}
                            </text>
                        ))}

                        {/* Area Path */}
                        {areaPath && (
                            <path
                                d={areaPath}
                                fill="url(#chartAreaGradient)"
                                className="transition-all duration-300"
                            />
                        )}

                        {/* Line Path */}
                        {linePath && (
                            <path
                                d={linePath}
                                fill="none"
                                stroke="url(#chartLineGradient)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="transition-all duration-300"
                            />
                        )}

                        {/* Active Day Hover Indicator Line */}
                        {activeIndex !== null && points[activeIndex] && (
                            <line
                                x1={points[activeIndex].x}
                                y1={paddingTop}
                                x2={points[activeIndex].x}
                                y2={paddingTop + chartHeight}
                                stroke="currentColor"
                                className="text-blue-500/30 dark:text-blue-400/20"
                                strokeDasharray="3 3"
                                strokeWidth="1.5"
                            />
                        )}

                        {/* Data Points Markers */}
                        {points.map((p, i) => {
                            const isHovered = activeIndex === i;

                            return (
                                <g
                                    key={i}
                                    className="transition-all duration-200"
                                >
                                    <circle
                                        cx={p.x}
                                        cy={p.y}
                                        r={isHovered ? '7' : '4'}
                                        className={`transition-all duration-150 ${isHovered
                                                ? 'fill-blue-500 stroke-background stroke-2 shadow-sm'
                                                : 'fill-background stroke-blue-500 stroke-2 dark:stroke-blue-400'
                                            }`}
                                    />
                                    {isHovered && (
                                        <circle
                                            cx={p.x}
                                            cy={p.y}
                                            r="12"
                                            className="pointer-events-none animate-ping fill-blue-500/15"
                                        />
                                    )}
                                </g>
                            );
                        })}

                        {/* Earnings text on the graph above points */}
                        {points.map((p, i) => (
                            <text
                                key={`earnings-${i}`}
                                x={p.x}
                                y={p.y - 10}
                                textAnchor="middle"
                                className={`text-[9px] font-semibold transition-all duration-150 ${activeIndex === i
                                        ? 'fill-emerald-600 font-bold dark:fill-emerald-400 scale-105'
                                        : 'fill-muted-foreground/75'
                                    }`}
                            >
                                {p.count} {p.count === 1 ? 'muestra' : 'muestras'} • L. {p.earnings.toLocaleString('es-HN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </text>
                        ))}

                        {/* Interactive Invisible Overlay Bars */}
                        {points.map((p, i) => {
                            const stepX = chartWidth / 6;
                            const rectX = p.x - stepX / 2;

                            return (
                                <rect
                                    key={i}
                                    x={rectX}
                                    y={paddingTop}
                                    width={stepX}
                                    height={chartHeight}
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onMouseEnter={() => setActiveIndex(i)}
                                    onMouseLeave={() => setActiveIndex(null)}
                                />
                            );
                        })}
                    </svg>

                    {/* Absolutely Positioned HTML Tooltip inside relative container */}
                    {activeIndex !== null && points[activeIndex] && (
                        <div
                            className="pointer-events-none absolute rounded-xl border border-sidebar-border/80 bg-popover/90 px-3 py-2 text-xs shadow-md backdrop-blur-md transition-all duration-150"
                            style={{
                                left: `${(points[activeIndex].x / width) * 100}%`,
                                top: `${(points[activeIndex].y / height) * 100 - 8}%`,
                                transform: 'translate(-50%, -100%)',
                            }}
                        >
                            <div className="font-semibold text-foreground">
                                {points[activeIndex].day}
                            </div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                                {points[activeIndex].date}
                            </div>
                            <div className="mt-2 flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
                                    <span className="size-2 rounded-full bg-blue-500" />
                                    {points[activeIndex].count}{' '}
                                    {points[activeIndex].count === 1
                                        ? 'muestra'
                                        : 'muestras'}
                                </div>
                                <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                                    <span className="size-2 rounded-full bg-emerald-500" />
                                    L. {points[activeIndex].earnings.toLocaleString('es-HN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function TodaySpecimensList({
    specimens = [],
}: {
    specimens: TodaySpecimen[];
}) {
    const totalAmount = specimens.reduce(
        (sum, spec) =>
            sum + parseFloat(String(spec.invoice_relation?.amount || 0)),
        0,
    );
    const totalInvoiced = specimens.reduce(
        (sum, spec) =>
            sum + parseFloat(String(spec.invoice_relation?.total || 0)),
        0,
    );

    const getPaymentTypeLabel = (type: string) => {
        switch (type) {
            case 'cash':
                return 'Efectivo';
            case 'credit card':
                return 'Tarjeta';
            case 'bank transfer':
                return 'Transferencia';
            case 'check':
                return 'Cheque';
            case 'credit':
                return 'Crédito';
            default:
                return type;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'received':
                return 'Recibida';
            case 'macroscopic_review':
                return 'Rev. Macroscópica';
            case 'processing':
                return 'En Proceso';
            case 'microscopic_review':
                return 'Rev. Microscópica';
            case 'finalized':
                return 'Finalizada';
            case 'delivered':
                return 'Entregada';
            case 'cancelled':
                return 'Cancelada';
            default:
                return status;
        }
    };

    return (
        <Card className="overflow-hidden border-sidebar-border/60">
            <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold text-foreground">
                        Muestras de Hoy
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                        Listado detallado y estado de facturación de muestras
                        creadas hoy.
                    </p>
                </div>
                {specimens.length > 0 && (
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        <div className="rounded-xl border bg-background/50 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md">
                            <span className="text-muted-foreground">
                                Cantidad:{' '}
                            </span>
                            <span className="font-bold text-foreground">
                                {specimens.length}
                            </span>
                        </div>
                        <div className="rounded-xl border bg-background/50 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md">
                            <span className="text-muted-foreground">
                                Monto Base:{' '}
                            </span>
                            <span className="font-mono font-bold text-foreground">
                                L.{' '}
                                {totalAmount.toLocaleString('es-HN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md">
                            <span className="text-emerald-600 dark:text-emerald-400">
                                Total Facturado:{' '}
                            </span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                L.{' '}
                                {totalInvoiced.toLocaleString('es-HN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-0">
                {specimens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                            <Microscope className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                            No hay muestras registradas hoy
                        </h3>
                        <p className="mt-1 max-w-[320px] text-xs text-muted-foreground">
                            Aún no se han creado muestras en este día. Puede
                            comenzar registrando una nueva muestra.
                        </p>
                        <Link
                            href={specimensIndex()}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                        >
                            Ir a Muestras <ArrowRight className="size-3.5" />
                        </Link>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[180px] pl-6">
                                        Código / Muestra
                                    </TableHead>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>Estudio / Tipo</TableHead>
                                    <TableHead>Prioridad</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right font-semibold">
                                        Monto Base
                                    </TableHead>
                                    <TableHead className="text-right font-semibold">
                                        Total / Pago
                                    </TableHead>
                                    <TableHead className="pr-6 text-center w-[90px] font-semibold">
                                        Acción
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {specimens.map((specimen) => {
                                    const amountVal = parseFloat(
                                        String(
                                            specimen.invoice_relation?.amount ||
                                            0,
                                        ),
                                    );
                                    const totalVal = parseFloat(
                                        String(
                                            specimen.invoice_relation?.total ||
                                            0,
                                        ),
                                    );
                                    const hasDiscount = amountVal > totalVal;

                                    return (
                                        <TableRow
                                            key={specimen.id}
                                            className="group hover:bg-muted/50"
                                        >
                                            <TableCell className="pl-6 font-mono text-xs font-bold text-primary">
                                                {specimen.sequence_code ? (
                                                    <span className="rounded bg-blue-500/10 px-2 py-1 text-[11px] text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                                        {specimen.sequence_code}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-normal text-muted-foreground italic">
                                                        Sin código
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {specimen
                                                            .customer_relation
                                                            ?.name ||
                                                            'Cliente general'}
                                                    </span>
                                                    {specimen.customer_relation
                                                        ?.id_number && (
                                                            <span className="mt-0.5 text-[10px] text-muted-foreground">
                                                                RTN/ID:{' '}
                                                                {
                                                                    specimen
                                                                        .customer_relation
                                                                        .id_number
                                                                }
                                                            </span>
                                                        )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {specimen.type?.name ||
                                                            'Estudio clínico'}
                                                    </span>
                                                    {specimen.examination
                                                        ?.name && (
                                                            <span className="mt-0.5 text-xs text-muted-foreground">
                                                                {
                                                                    specimen
                                                                        .examination
                                                                        .name
                                                                }
                                                            </span>
                                                        )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <span
                                                        className="size-2 rounded-full ring-1 ring-black/5 dark:ring-white/5"
                                                        style={{
                                                            backgroundColor:
                                                                specimen
                                                                    .priority
                                                                    ?.color ||
                                                                '#94a3b8',
                                                        }}
                                                    />
                                                    <span className="text-xs font-medium text-foreground">
                                                        {specimen.priority
                                                            ?.name || 'Normal'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="border-transparent px-2 py-0.5 text-[10px] font-bold text-white transition-colors"
                                                    style={{
                                                        backgroundColor:
                                                            specimen.status_color ||
                                                            '#94a3b8',
                                                    }}
                                                >
                                                    {getStatusLabel(
                                                        specimen.status,
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm font-medium text-muted-foreground">
                                                L. {amountVal.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <div className="flex items-center gap-1.5">
                                                        {hasDiscount && (
                                                            <span className="font-mono text-[10px] text-muted-foreground line-through">
                                                                L.{' '}
                                                                {amountVal.toFixed(
                                                                    2,
                                                                )}
                                                            </span>
                                                        )}
                                                        <span className="font-mono text-sm font-bold text-foreground">
                                                            L.{' '}
                                                            {totalVal.toFixed(
                                                                2,
                                                            )}
                                                        </span>
                                                    </div>
                                                    {specimen.invoice_relation
                                                        ?.payment_type && (
                                                            <span className="mt-0.5 text-[10px] text-muted-foreground">
                                                                (
                                                                {getPaymentTypeLabel(
                                                                    specimen
                                                                        .invoice_relation
                                                                        .payment_type,
                                                                )}
                                                                )
                                                            </span>
                                                        )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-6 text-center">
                                                <Link
                                                    href={
                                                        specimen.sequence_code
                                                            ? `${specimensIndex().url}?action=view&specimen=${specimen.sequence_code}`
                                                            : `${specimensIndex().url}?action=view&specimen=${specimen.id}`
                                                    }
                                                    className="inline-flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-background text-muted-foreground transition-all hover:border-blue-500/30 hover:bg-blue-50/50 hover:text-blue-600 dark:hover:bg-blue-950/20 dark:hover:text-blue-400"
                                                    title="Ver muestra"
                                                >
                                                    <Eye className="size-4" />
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Resumen',
            href: dashboard(),
        },
    ],
};
