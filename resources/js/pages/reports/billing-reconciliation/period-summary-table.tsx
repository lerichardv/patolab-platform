import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface ResumenRowData {
    date: string;
    formatted_date: string;
    start_invoice: string;
    end_invoice: string;
    customer: string;
    taxable_15: number;
    exempt: number;
    discount: number;
    isv_15: number;
    total: number;
    has_invoices: boolean;
}

export interface ResumenTotalsData {
    taxable_15: number;
    exempt: number;
    discount: number;
    isv_15: number;
    total: number;
}

export interface PeriodTotalsData {
    gross: number;
    discount: number;
    net: number;
    cash: number;
    check: number;
    card: number;
    transfer: number;
    credit: number;
    taxable_15: number;
    exempt: number;
    isv_15: number;
    total_sales: number;
    invoice_count: number;
    active_count: number;
    cancelled_count: number;
}

interface Props {
    resumenRows: ResumenRowData[];
    resumenTotals?: ResumenTotalsData;
    dateRange: {
        from: string;
        to: string;
        from_formatted: string;
        to_formatted: string;
    };
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

export default function PeriodSummaryTable({
    resumenRows,
    resumenTotals,
    dateRange,
}: Props) {
    const totals: ResumenTotalsData = resumenTotals ?? {
        taxable_15: resumenRows.reduce(
            (acc, r) => acc + (r.taxable_15 || 0),
            0,
        ),
        exempt: resumenRows.reduce((acc, r) => acc + (r.exempt || 0), 0),
        discount: resumenRows.reduce((acc, r) => acc + (r.discount || 0), 0),
        isv_15: resumenRows.reduce((acc, r) => acc + (r.isv_15 || 0), 0),
        total: resumenRows.reduce((acc, r) => acc + (r.total || 0), 0),
    };

    return (
        <Card className="overflow-hidden border border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/40 px-6 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-base font-bold text-foreground">
                            Resumen de Ventas del Período
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Consolidado diario de ventas gravadas, exentas,
                            descuentos y facturación neta (del{' '}
                            {dateRange.from_formatted} al{' '}
                            {dateRange.to_formatted}).
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="border-b border-border text-xs">
                                <TableHead className="w-28 text-center font-bold">
                                    Fecha
                                </TableHead>
                                <TableHead className="w-44 text-center font-bold">
                                    No. Fact (Inicial)
                                </TableHead>
                                <TableHead className="w-44 text-center font-bold">
                                    No. Fact (Final)
                                </TableHead>
                                <TableHead className="min-w-[150px] font-bold">
                                    Cliente
                                </TableHead>
                                <TableHead className="w-32 text-right font-bold">
                                    Gravadas
                                </TableHead>
                                <TableHead className="w-32 text-right font-bold">
                                    Exentas
                                </TableHead>
                                <TableHead className="w-32 text-right font-bold">
                                    Descuentos
                                </TableHead>
                                <TableHead className="w-32 text-right font-bold">
                                    IVA (15%)
                                </TableHead>
                                <TableHead className="w-36 text-right font-bold">
                                    Total
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="text-sm">
                            {resumenRows.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={9}
                                        className="py-8 text-center text-xs text-muted-foreground"
                                    >
                                        No se encontraron datos en el rango
                                        seleccionado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                resumenRows.map((row) => (
                                    <TableRow
                                        key={row.date}
                                        className={`transition-colors hover:bg-muted/30 ${
                                            !row.has_invoices
                                                ? 'text-muted-foreground/60'
                                                : ''
                                        }`}
                                    >
                                        <TableCell className="text-center text-xs font-medium whitespace-nowrap">
                                            {row.formatted_date}
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-xs">
                                            {row.start_invoice}
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-xs">
                                            {row.end_invoice}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {row.customer}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {row.taxable_15 > 0
                                                ? formatCurrency(row.taxable_15)
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {row.exempt > 0
                                                ? formatCurrency(row.exempt)
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {row.discount > 0
                                                ? formatCurrency(row.discount)
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {row.isv_15 > 0
                                                ? formatCurrency(row.isv_15)
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                                            {row.total > 0
                                                ? formatCurrency(row.total)
                                                : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        {resumenRows.length > 0 && (
                            <tfoot>
                                <TableRow className="border-t-2 border-border bg-muted/40 text-xs font-bold">
                                    <TableCell
                                        colSpan={4}
                                        className="pr-4 text-right tracking-wider uppercase"
                                    >
                                        Ventas del período
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {formatCurrency(totals.taxable_15)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {formatCurrency(totals.exempt)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {formatCurrency(totals.discount)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {formatCurrency(totals.isv_15)}
                                    </TableCell>
                                    <TableCell className="border-b-2 border-b-primary text-right font-mono text-sm font-bold text-primary">
                                        {formatCurrency(totals.total)}
                                    </TableCell>
                                </TableRow>
                            </tfoot>
                        )}
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
