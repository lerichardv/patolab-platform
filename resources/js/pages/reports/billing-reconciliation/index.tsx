import { Head, router, usePage, Deferred } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import {
    FileSpreadsheet,
    Download,
    Search,
    TableProperties,
    Layers,
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import * as React from 'react';
import { index as billingReconciliationReportIndex } from '@/actions/App/Http/Controllers/Reports/BillingReconciliationReportController';
import AsyncCustomerCombobox from '@/components/async-customer-combobox';
import {
    DateRangePicker,
    setCookie,
    getThisMonthRange,
} from '@/components/date-range-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InvoiceViewSheet from '../../invoices/invoice-view-sheet';
import DailySettlementTable from './daily-settlement-table';
import type { DailyTableData } from './daily-settlement-table';
import GeneralSettlementTable from './general-settlement-table';
import type { GeneralInvoiceItem } from './general-settlement-table';
import PeriodSummaryTable from './period-summary-table';
import type {
    ResumenRowData,
    PeriodTotalsData,
    ResumenTotalsData,
} from './period-summary-table';
import ShadowTableSkeleton from './shadow-table-skeleton';

interface ReportData {
    dailyTables: DailyTableData[];
    generalInvoices: GeneralInvoiceItem[];
    resumenRows: ResumenRowData[];
    resumenTotals?: ResumenTotalsData;
    periodTotals: PeriodTotalsData;
    dateRange: {
        from: string;
        to: string;
        from_formatted: string;
        to_formatted: string;
    };
}

interface Props {
    filters: {
        date_from: string;
        date_to: string;
        customer_id?: string | null;
        search?: string | null;
    };
    selectedCustomer?: {
        id: number;
        name: string;
        id_number?: string;
    } | null;
    reportData?: ReportData;
}

const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('es-HN', {
        style: 'currency',
        currency: 'HNL',
        minimumFractionDigits: 2,
    })
        .format(val)
        .replace('HNL', 'L.');
};

export default function BillingReconciliationReport({
    filters,
    selectedCustomer,
    reportData,
}: Props) {
    const page = usePage();
    const userId = (page.props.auth as any)?.user?.id;

    const [search, setSearch] = useState(filters.search || '');
    const [customerId, setCustomerId] = useState(filters.customer_id || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from);
    const [dateTo, setDateTo] = useState(filters.date_to);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'daily' | 'general' | 'resumen'>(
        'daily',
    );

    // State for viewing invoice details sheet
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Track loading / navigation transitions
    const [isPending, setIsPending] = useState(false);

    const handleSelectInvoice = (invoice: any) => {
        setSelectedInvoice(invoice);
        setIsSheetOpen(true);
    };

    // Apply filters asynchronously without blocking UI
    const applyFilters = useCallback(
        (newParams: Record<string, string | null>) => {
            const queryParams = new URLSearchParams();

            const current = {
                date_from: dateFrom,
                date_to: dateTo,
                customer_id: customerId !== 'all' ? customerId : null,
                search: search ? search : null,
                ...newParams,
            };

            if (current.date_from) {
                queryParams.set('date_from', current.date_from);
            }

            if (current.date_to) {
                queryParams.set('date_to', current.date_to);
            }

            if (current.customer_id && current.customer_id !== 'all') {
                queryParams.set('customer_id', current.customer_id);
            }

            if (current.search) {
                queryParams.set('search', current.search);
            }

            setIsPending(true);

            router.get(
                billingReconciliationReportIndex.url(),
                Object.fromEntries(queryParams.entries()),
                {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['reportData', 'filters', 'selectedCustomer'],
                    onFinish: () => {
                        setIsPending(false);
                    },
                },
            );
        },
        [dateFrom, dateTo, customerId, search],
    );

    // Debounced search handler without useMemo
    const debouncedSearchRef = useRef(
        debounce((val: string) => {
            applyFilters({ search: val || null });
        }, 400),
    );

    useEffect(() => {
        debouncedSearchRef.current = debounce((val: string) => {
            applyFilters({ search: val || null });
        }, 400);
    }, [applyFilters]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        debouncedSearchRef.current(val);
    };

    // Clear filters handler
    const handleClearFilters = () => {
        setSearch('');
        setCustomerId('all');
        const defaultRange = getThisMonthRange();
        setDateFrom(defaultRange.from);
        setDateTo(defaultRange.to);

        if (userId) {
            setCookie(
                `date_filter_report_billing_reconciliation_user_${userId}`,
                JSON.stringify({
                    range: 'this_month',
                    from: defaultRange.from,
                    to: 'today',
                }),
            );
        }

        router.get(
            billingReconciliationReportIndex.url(),
            {},
            { preserveState: false },
        );
    };

    // Customer filter change
    const handleCustomerChange = (val: string) => {
        setCustomerId(val);
        applyFilters({ customer_id: val });
    };

    // Date range picker handler
    const handleDateRangeChange = (from: string, to: string) => {
        setDateFrom(from);
        setDateTo(to);

        if (userId) {
            setCookie(
                `date_filter_report_billing_reconciliation_user_${userId}`,
                JSON.stringify({ from, to, range: 'custom' }),
                30,
            );
        }

        applyFilters({ date_from: from, date_to: to });
    };

    // Export Excel handler
    const handleExportExcel = () => {
        setIsExporting(true);
        const queryParams = new URLSearchParams();

        if (dateFrom) {
            queryParams.set('date_from', dateFrom);
        }

        if (dateTo) {
            queryParams.set('date_to', dateTo);
        }

        if (customerId && customerId !== 'all') {
            queryParams.set('customer_id', customerId);
        }

        if (search) {
            queryParams.set('search', search);
        }

        window.location.href = `/reports/billing-reconciliation/export?${queryParams.toString()}`;

        setTimeout(() => {
            setIsExporting(false);
        }, 2000);
    };

    // Jump to specific day table
    const handleJumpToDay = (dateStr: string) => {
        const el = document.getElementById(`day-${dateStr}`);

        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="flex min-h-screen flex-col">
            <Head title="Cuadre de Facturación" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Page Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Cuadre de Facturación
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Liquidación diaria de ventas correlativas y arqueo
                            contable por forma de pago (excluye domingos).
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="h-10 gap-2"
                            onClick={handleClearFilters}
                        >
                            Limpiar filtros
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleExportExcel}
                            disabled={isExporting}
                            className="h-10 gap-2"
                        >
                            <Download className="h-4 w-4" />
                            <span>
                                {isExporting
                                    ? 'Generando...'
                                    : 'Exportar a Excel'}
                            </span>
                        </Button>
                    </div>
                </div>

                {/* Filters Area */}
                <div className="flex w-full flex-col gap-4">
                    {/* Row 1: Search and Date Range */}
                    <div className="flex flex-row items-end justify-stretch gap-3">
                        <div className="relative w-full">
                            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por Nº Factura, paciente, cliente o RTN..."
                                className="w-full pl-8"
                                value={search}
                                onChange={handleSearchChange}
                            />
                        </div>
                        <div className="flex w-full max-w-[320px] flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Rango de Fechas
                            </span>
                            <DateRangePicker
                                cookieKey="date_filter_report_billing_reconciliation"
                                value={{
                                    from: dateFrom || '',
                                    to: dateTo || '',
                                }}
                                onChange={(range) => {
                                    handleDateRangeChange(
                                        range.from || '',
                                        range.to || '',
                                    );
                                }}
                            />
                        </div>
                    </div>

                    {/* Row 2: Customer / Empresa and other filters */}
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Cliente / Empresa
                            </span>
                            <AsyncCustomerCombobox
                                value={customerId !== 'all' ? customerId : ''}
                                onChange={handleCustomerChange}
                                placeholder="Todos los clientes"
                                initialCustomer={selectedCustomer || undefined}
                                allowClear
                            />
                        </div>
                    </div>
                </div>

                {/* Deferred Content Section with High-Fidelity Shadow Loader */}
                <Deferred
                    data="reportData"
                    fallback={<ShadowTableSkeleton count={3} />}
                >
                    {reportData ? (
                        <div
                            className={`space-y-6 transition-opacity duration-200 ${isPending ? 'pointer-events-none opacity-60' : ''}`}
                        >
                            {/* Period Top Stats Overview */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                <Card className="border border-border/80 bg-card p-3.5 shadow-xs">
                                    <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                        Total Facturado
                                    </p>
                                    <p className="mt-1 font-mono text-lg font-bold text-foreground">
                                        {formatCurrency(
                                            reportData.periodTotals.total_sales,
                                        )}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        {reportData.periodTotals.invoice_count}{' '}
                                        facturas emitidas
                                    </p>
                                </Card>

                                <Card className="border border-border/80 bg-card p-3.5 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            1. Efectivo
                                        </p>
                                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    </div>
                                    <p className="mt-1 font-mono text-lg font-bold text-foreground">
                                        {formatCurrency(
                                            reportData.periodTotals.cash,
                                        )}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                                        Arqueo en caja
                                    </p>
                                </Card>

                                <Card className="border border-border/80 bg-card p-3.5 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            2. Cheques
                                        </p>
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    </div>
                                    <p className="mt-1 font-mono text-lg font-bold text-foreground">
                                        {formatCurrency(
                                            reportData.periodTotals.check,
                                        )}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-blue-600 dark:text-blue-400">
                                        Recibido en cheques
                                    </p>
                                </Card>

                                <Card className="border border-border/80 bg-card p-3.5 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            3. T/C POS
                                        </p>
                                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                                    </div>
                                    <p className="mt-1 font-mono text-lg font-bold text-foreground">
                                        {formatCurrency(
                                            reportData.periodTotals.card,
                                        )}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-purple-600 dark:text-purple-400">
                                        Tarjetas crédito/débito
                                    </p>
                                </Card>

                                <Card className="border border-border/80 bg-card p-3.5 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            4. Transferencias
                                        </p>
                                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                                    </div>
                                    <p className="mt-1 font-mono text-lg font-bold text-foreground">
                                        {formatCurrency(
                                            reportData.periodTotals.transfer,
                                        )}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                                        Bancos en línea
                                    </p>
                                </Card>
                            </div>

                            {/* View Mode & Quick Day Navigator */}
                            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                                <Tabs
                                    value={activeTab}
                                    onValueChange={(v) =>
                                        setActiveTab(
                                            v as
                                                | 'daily'
                                                | 'general'
                                                | 'resumen',
                                        )
                                    }
                                    className="w-auto"
                                >
                                    <TabsList className="h-9">
                                        <TabsTrigger
                                            value="daily"
                                            className="gap-1.5 px-3 text-xs"
                                        >
                                            <TableProperties className="h-3.5 w-3.5" />
                                            <span>
                                                Tablas Diarias (
                                                {reportData.dailyTables.length}{' '}
                                                días)
                                            </span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="general"
                                            className="gap-1.5 px-3 text-xs"
                                        >
                                            <FileSpreadsheet className="h-3.5 w-3.5" />
                                            <span>Liquidación General</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="resumen"
                                            className="gap-1.5 px-3 text-xs"
                                        >
                                            <Layers className="h-3.5 w-3.5" />
                                            <span>Resumen del Período</span>
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>

                                {activeTab === 'daily' &&
                                    reportData.dailyTables.length > 1 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs whitespace-nowrap text-muted-foreground">
                                                Ir al día:
                                            </span>
                                            <Select
                                                onValueChange={handleJumpToDay}
                                            >
                                                <SelectTrigger className="h-8 w-[220px] text-xs">
                                                    <SelectValue placeholder="Seleccionar fecha..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {reportData.dailyTables.map(
                                                        (d) => (
                                                            <SelectItem
                                                                key={d.date}
                                                                value={d.date}
                                                                className="text-xs"
                                                            >
                                                                {d.day_name}{' '}
                                                                {
                                                                    d.formatted_date
                                                                }{' '}
                                                                (
                                                                {
                                                                    d.invoice_count
                                                                }{' '}
                                                                fact.)
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                            </div>

                            {/* View Content: Daily Tables, General Continuous Settlement (Hoja14), or Resumen */}
                            {activeTab === 'daily' ? (
                                <div className="space-y-8">
                                    {reportData.dailyTables.length === 0 ? (
                                        <Card className="border-dashed p-8 text-center">
                                            <p className="text-sm text-muted-foreground">
                                                No hay días hábiles dentro del
                                                rango seleccionado.
                                            </p>
                                        </Card>
                                    ) : (
                                        reportData.dailyTables.map(
                                            (dayTable) => (
                                                <DailySettlementTable
                                                    key={dayTable.date}
                                                    dayData={dayTable}
                                                    onSelectInvoice={
                                                        handleSelectInvoice
                                                    }
                                                />
                                            ),
                                        )
                                    )}
                                </div>
                            ) : activeTab === 'general' ? (
                                <GeneralSettlementTable
                                    invoices={reportData.generalInvoices || []}
                                    periodTotals={reportData.periodTotals}
                                    dateRange={reportData.dateRange}
                                    onSelectInvoice={handleSelectInvoice}
                                />
                            ) : (
                                <PeriodSummaryTable
                                    resumenRows={reportData.resumenRows}
                                    resumenTotals={reportData.resumenTotals}
                                    dateRange={reportData.dateRange}
                                />
                            )}
                        </div>
                    ) : (
                        <ShadowTableSkeleton count={3} />
                    )}
                </Deferred>
            </div>

            {/* Invoice Detail Sheet Overlay */}
            {selectedInvoice && (
                <InvoiceViewSheet
                    invoice={selectedInvoice}
                    open={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                />
            )}
        </div>
    );
}
