import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface Props {
    rowCount?: number;
}

export default function InvoiceTableSkeleton({ rowCount = 8 }: Props) {
    const rows = Array.from({ length: rowCount });

    return (
        <div className="space-y-4">
            {/* Table Container */}
            <div className="relative w-full overflow-auto rounded-lg border border-border bg-card shadow-xs">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="w-[150px] min-w-[150px] border-r border-border bg-card">
                                <span className="text-xs font-semibold">
                                    Nº Factura
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[300px] pl-5">
                                <span className="text-xs font-semibold">
                                    Fecha Factura / Creación
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[200px] pl-5">
                                <span className="text-xs font-semibold">
                                    Cliente
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[150px]">
                                <span className="text-xs font-semibold">
                                    Método de Pago
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[220px]">
                                <span className="text-xs font-semibold">
                                    Tipo de factura
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[220px]">
                                <span className="text-xs font-semibold">
                                    Detalle
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[120px]">
                                <span className="text-xs font-semibold">
                                    Crédito
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[120px] text-right">
                                <span className="text-xs font-semibold">
                                    Precio
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[100px] text-right">
                                <span className="text-xs font-semibold">
                                    Cantidad
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[120px] text-right">
                                <span className="text-xs font-semibold">
                                    Subtotal
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[150px] text-right">
                                <span className="text-xs font-semibold">
                                    Descuento
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[120px] text-right">
                                <span className="text-xs font-semibold">
                                    ISV 15%
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[120px] text-right">
                                <span className="text-xs font-semibold">
                                    Total Factura
                                </span>
                            </TableHead>
                            <TableHead className="min-w-[120px] text-right">
                                <span className="text-xs font-semibold">
                                    Total Pagado
                                </span>
                            </TableHead>
                            <TableHead className="w-[80px] min-w-[80px] bg-card text-right">
                                <span className="text-xs font-semibold">
                                    Acciones
                                </span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((_, index) => (
                            <TableRow
                                key={index}
                                className="hover:bg-transparent"
                            >
                                {/* Nº Factura */}
                                <TableCell className="w-[150px] min-w-[150px] border-r border-border bg-card py-3.5">
                                    <Skeleton className="h-5 w-28 rounded bg-muted" />
                                </TableCell>

                                {/* Fechas */}
                                <TableCell className="min-w-[300px] py-3.5 pl-5">
                                    <div className="flex flex-col gap-1.5">
                                        <Skeleton className="h-4 w-32 bg-muted" />
                                        <Skeleton className="h-3 w-24 bg-muted/60" />
                                    </div>
                                </TableCell>

                                {/* Cliente */}
                                <TableCell className="min-w-[200px] py-3.5 pl-5">
                                    <div className="flex flex-col gap-1.5">
                                        <Skeleton className="h-4 w-36 bg-muted" />
                                        <Skeleton className="h-3 w-20 bg-muted/60" />
                                    </div>
                                </TableCell>

                                {/* Método de Pago */}
                                <TableCell className="min-w-[150px] py-3.5">
                                    <Skeleton className="h-5 w-24 rounded-full bg-muted" />
                                </TableCell>

                                {/* Tipo de Factura */}
                                <TableCell className="min-w-[220px] py-3.5">
                                    <Skeleton className="h-5 w-28 rounded bg-muted" />
                                </TableCell>

                                {/* Detalle */}
                                <TableCell className="min-w-[220px] py-3.5">
                                    <div className="flex flex-col gap-1">
                                        <Skeleton className="h-4 w-28 bg-muted" />
                                        <Skeleton className="h-3 w-16 bg-muted/60" />
                                    </div>
                                </TableCell>

                                {/* Crédito */}
                                <TableCell className="min-w-[120px] py-3.5">
                                    <Skeleton className="h-5 w-16 rounded-full bg-muted" />
                                </TableCell>

                                {/* Precio */}
                                <TableCell className="min-w-[120px] py-3.5 text-right">
                                    <Skeleton className="ml-auto h-4 w-16 bg-muted" />
                                </TableCell>

                                {/* Cantidad */}
                                <TableCell className="min-w-[100px] py-3.5 text-right">
                                    <Skeleton className="ml-auto h-4 w-8 bg-muted" />
                                </TableCell>

                                {/* Subtotal */}
                                <TableCell className="min-w-[120px] py-3.5 text-right">
                                    <Skeleton className="ml-auto h-4 w-16 bg-muted" />
                                </TableCell>

                                {/* Descuento */}
                                <TableCell className="min-w-[150px] py-3.5 text-right">
                                    <Skeleton className="ml-auto h-4 w-14 bg-muted" />
                                </TableCell>

                                {/* ISV 15% */}
                                <TableCell className="min-w-[120px] py-3.5 text-right">
                                    <Skeleton className="ml-auto h-4 w-14 bg-muted" />
                                </TableCell>

                                {/* Total Factura */}
                                <TableCell className="min-w-[120px] py-3.5 text-right">
                                    <Skeleton className="ml-auto h-4 w-20 bg-muted" />
                                </TableCell>

                                {/* Total Pagado */}
                                <TableCell className="min-w-[120px] py-3.5 text-right">
                                    <Skeleton className="ml-auto h-4 w-20 bg-muted" />
                                </TableCell>

                                {/* Acciones */}
                                <TableCell className="w-[80px] min-w-[80px] py-3.5 text-right">
                                    <Skeleton className="ml-auto h-7 w-7 rounded-md bg-muted" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Overall Totals Summary Skeleton */}
            <div className="flex flex-col items-end gap-2 border-t border-border pt-4 pr-10">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-right text-sm">
                    <Skeleton className="h-4 w-28 bg-muted" />
                    <Skeleton className="ml-auto h-4 w-24 bg-muted" />

                    <Skeleton className="h-4 w-24 bg-muted" />
                    <Skeleton className="ml-auto h-4 w-20 bg-muted" />

                    <Skeleton className="h-4 w-32 bg-muted" />
                    <Skeleton className="ml-auto h-4 w-20 bg-muted" />

                    <Skeleton className="h-4 w-32 bg-muted" />
                    <Skeleton className="ml-auto h-4 w-24 bg-muted" />

                    <Skeleton className="h-5 w-28 bg-muted" />
                    <Skeleton className="ml-auto h-5 w-24 bg-muted" />
                </div>
            </div>

            {/* Pagination Skeleton */}
            <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-4 w-48 bg-muted" />
                <div className="flex items-center gap-1.5">
                    <Skeleton className="h-8 w-8 rounded-md bg-muted" />
                    <Skeleton className="h-8 w-8 rounded-md bg-muted" />
                    <Skeleton className="h-8 w-8 rounded-md bg-muted" />
                    <Skeleton className="h-8 w-8 rounded-md bg-muted" />
                </div>
            </div>
        </div>
    );
}
