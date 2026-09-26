import { Eye, Search } from 'lucide-react';
import { useState } from 'react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { PeriodTotalsData } from './period-summary-table';

export interface GeneralInvoiceItem {
    item: number;
    date: string;
    invoice_number: string;
    customer_name: string;
    quantity: number;
    payment_type_code: number;
    payment_type_label: string;
    gross_amount: number;
    discount: number;
    net_amount: number;
    taxable_15: number;
    exempt: number;
    isv_15: number;
    comment: string;
    is_cancelled: boolean;
    invoice_id: number;
    invoice?: any;
}

interface Props {
    invoices: GeneralInvoiceItem[];
    periodTotals: PeriodTotalsData;
    dateRange: {
        from: string;
        to: string;
        from_formatted: string;
        to_formatted: string;
    };
    onSelectInvoice: (invoice: any) => void;
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

export default function GeneralSettlementTable({
    invoices,
    periodTotals,
    dateRange,
    onSelectInvoice,
}: Props) {
    const [filterQuery, setFilterQuery] = useState('');

    const filteredInvoices = invoices.filter((inv) => {
        if (!filterQuery) {
            return true;
        }

        const q = filterQuery.toLowerCase();

        return (
            inv.invoice_number.toLowerCase().includes(q) ||
            inv.customer_name.toLowerCase().includes(q) ||
            inv.date.includes(q) ||
            inv.comment.toLowerCase().includes(q)
        );
    });

    return (
        <Card className="overflow-hidden border border-border shadow-xs">
            <CardHeader className="border-b border-border bg-muted/40 px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold text-foreground">
                                Liquidación General de Facturas
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">
                                {invoices.length} facturas
                            </Badge>
                        </div>
                        <CardDescription className="mt-1 text-xs">
                            Listado continuo y cronológico de todas las facturas
                            emitidas en el período (del{' '}
                            {dateRange.from_formatted} al{' '}
                            {dateRange.to_formatted}).
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Filtrar en la tabla..."
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                className="h-8 pl-8 text-xs"
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="max-h-[650px] overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs">
                            <TableRow className="border-b border-border text-xs">
                                <TableHead className="w-12 text-center font-bold">
                                    #
                                </TableHead>
                                <TableHead className="w-24 text-center font-bold">
                                    Fecha
                                </TableHead>
                                <TableHead className="w-44 text-center font-bold">
                                    No. de Factura
                                </TableHead>
                                <TableHead className="min-w-[200px] font-bold">
                                    Nombre Paciente / Cliente
                                </TableHead>
                                <TableHead className="w-28 text-right font-bold">
                                    Gravadas
                                </TableHead>
                                <TableHead className="w-28 text-right font-bold">
                                    Exentas
                                </TableHead>
                                <TableHead className="w-28 text-right font-bold">
                                    Descuento
                                </TableHead>
                                <TableHead className="w-28 text-right font-bold">
                                    IVA (15%)
                                </TableHead>
                                <TableHead className="w-32 text-right font-bold">
                                    Pago Recibido
                                </TableHead>
                                <TableHead className="min-w-[140px] font-bold">
                                    Comentario
                                </TableHead>
                                <TableHead className="w-14 text-center font-bold">
                                    Ver
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvoices.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={11}
                                        className="h-28 text-center text-xs text-muted-foreground"
                                    >
                                        No se encontraron facturas para los
                                        criterios seleccionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredInvoices.map((inv, idx) => (
                                    <TableRow
                                        key={`${inv.invoice_id}-${idx}`}
                                        className={`cursor-pointer text-xs transition-colors ${
                                            inv.is_cancelled
                                                ? 'bg-rose-50/40 text-rose-900/80 hover:bg-rose-50/70 dark:bg-rose-950/20 dark:text-rose-200'
                                                : 'hover:bg-muted/50'
                                        }`}
                                        onClick={() =>
                                            inv.invoice &&
                                            onSelectInvoice(inv.invoice)
                                        }
                                    >
                                        <TableCell className="text-center font-mono text-muted-foreground">
                                            {inv.item}
                                        </TableCell>
                                        <TableCell className="text-center whitespace-nowrap">
                                            {inv.date}
                                        </TableCell>
                                        <TableCell className="text-center font-mono font-medium">
                                            {inv.invoice_number}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <span>{inv.customer_name}</span>
                                                {inv.is_cancelled && (
                                                    <Badge
                                                        variant="destructive"
                                                        className="px-1.5 py-0 text-[10px]"
                                                    >
                                                        Anulada
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {inv.taxable_15 > 0
                                                ? formatCurrency(inv.taxable_15)
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {inv.exempt > 0
                                                ? formatCurrency(inv.exempt)
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {inv.discount > 0 ? (
                                                <span className="text-amber-600 dark:text-amber-400">
                                                    {formatCurrency(
                                                        inv.discount,
                                                    )}
                                                </span>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {inv.isv_15 > 0
                                                ? formatCurrency(inv.isv_15)
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">
                                            {inv.is_cancelled ? (
                                                <span className="text-muted-foreground">
                                                    -
                                                </span>
                                            ) : (
                                                formatCurrency(inv.net_amount)
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {inv.comment || '-'}
                                        </TableCell>
                                        <TableCell
                                            className="text-center"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {inv.invoice && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() =>
                                                        onSelectInvoice(
                                                            inv.invoice,
                                                        )
                                                    }
                                                    title="Ver detalle de factura"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Bottom Totals and Summary Block (Matching Excel Detalle/Ventas) */}
                <div className="border-t border-border bg-muted/20 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        {/* Summary Card (Detalle / Ventas) */}
                        <div className="w-full lg:max-w-2xl">
                            <h4 className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Resumen de Totales del Período
                            </h4>
                            <div className="overflow-hidden rounded-md border border-border bg-card">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow className="border-b border-border text-[11px]">
                                            <TableHead className="font-bold">
                                                Detalle
                                            </TableHead>
                                            <TableHead className="text-right font-bold">
                                                Gravadas
                                            </TableHead>
                                            <TableHead className="text-right font-bold">
                                                Exentas
                                            </TableHead>
                                            <TableHead className="text-right font-bold">
                                                Descuentos
                                            </TableHead>
                                            <TableHead className="text-right font-bold">
                                                IVA (15%)
                                            </TableHead>
                                            <TableHead className="text-right font-bold">
                                                Total Ventas
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="text-xs font-semibold">
                                            <TableCell className="font-bold">
                                                Ventas
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(
                                                    periodTotals.taxable_15,
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(
                                                    periodTotals.exempt,
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-amber-600 dark:text-amber-400">
                                                {formatCurrency(
                                                    periodTotals.discount,
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(
                                                    periodTotals.isv_15,
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(
                                                    periodTotals.total_sales,
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Audit summary */}
                        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                                Desglose de emisión:
                            </span>
                            <span>
                                • Facturas activas:{' '}
                                <strong className="text-foreground">
                                    {periodTotals.active_count}
                                </strong>
                            </span>
                            <span>
                                • Facturas anuladas:{' '}
                                <strong className="text-foreground">
                                    {periodTotals.cancelled_count}
                                </strong>
                            </span>
                            <span>
                                • Total emitidas:{' '}
                                <strong className="text-foreground">
                                    {periodTotals.invoice_count}
                                </strong>
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
