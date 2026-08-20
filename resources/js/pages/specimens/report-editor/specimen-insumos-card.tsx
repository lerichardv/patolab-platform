import { Microscope, Plus, Tag } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';

import SpecimenProductsSheet from '../specimen-products-sheet';
import type { Specimen } from './types';

export function calculateInsumoTotal(
    quantity?: number | string,
    price?: number | string,
): number {
    const qty = parseInt(String(quantity ?? 0)) || 0;
    const prc = parseFloat(String(price ?? 0)) || 0;

    return qty * prc;
}

export function calculateInsumosGrandTotal(products: any[] = []): number {
    return products.reduce((acc, prod) => {
        return (
            acc + calculateInsumoTotal(prod.pivot?.quantity, prod.pivot?.price)
        );
    }, 0);
}

export interface SpecimenInsumosCardProps {
    specimen: Specimen;
    products?: any[];
    isFinished: boolean;
    sessionEditingEnabled: boolean;
    hasMacroAccess: boolean;
    hasMicroAccess: boolean;
}

export default function SpecimenInsumosCard({
    specimen,
    products = [],
    isFinished,
    sessionEditingEnabled,
    hasMacroAccess,
    hasMicroAccess,
}: SpecimenInsumosCardProps) {
    const [isProductsSheetOpen, setIsProductsSheetOpen] = useState(false);

    const canEdit =
        (!isFinished || sessionEditingEnabled) &&
        (hasMacroAccess || hasMicroAccess);

    return (
        <>
            {/* Specimen Insumos (Products) Card */}
            <div className="relative rounded-xl border border-border/80 bg-card p-5 shadow-xs">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-md flex items-center gap-2 font-semibold text-primary">
                        <Tag className="h-4 w-4" /> Insumos / Reactivos
                        Utilizados
                    </h3>
                    {canEdit && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsProductsSheetOpen(true)}
                            className="h-8 cursor-pointer gap-1.5 font-medium hover:bg-primary/5 hover:text-primary"
                        >
                            <Plus className="h-3.5 w-3.5" /> Administrar Insumos
                        </Button>
                    )}
                </div>

                {specimen.products && specimen.products.length > 0 ? (
                    <div className="space-y-3">
                        <div className="overflow-x-auto rounded-lg border bg-muted/5">
                            <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                        <th className="p-3">Código</th>
                                        <th className="p-3">Insumo</th>
                                        <th className="p-3 text-right">
                                            Cantidad
                                        </th>
                                        <th className="p-3 text-right">
                                            Precio Unitario
                                        </th>
                                        <th className="p-3 text-right">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {specimen.products.map((prod: any) => {
                                        const qty =
                                            parseInt(prod.pivot?.quantity) || 0;
                                        const price =
                                            parseFloat(prod.pivot?.price) || 0;
                                        const total = qty * price;

                                        return (
                                            <tr
                                                key={prod.id}
                                                className="transition-colors hover:bg-muted/10"
                                            >
                                                <td className="p-3 font-mono text-muted-foreground uppercase">
                                                    {prod.code}
                                                </td>
                                                <td className="p-3 font-medium text-foreground">
                                                    {prod.name}
                                                </td>
                                                <td className="p-3 text-right font-semibold">
                                                    {qty} u.
                                                </td>
                                                <td className="p-3 text-right font-mono">
                                                    L. {price.toFixed(2)}
                                                </td>
                                                <td className="p-3 text-right font-mono font-bold text-foreground">
                                                    L. {total.toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end pr-2 text-xs font-semibold text-muted-foreground">
                            Total General Insumos:
                            <span className="ml-1.5 font-mono text-sm font-bold text-foreground">
                                L.{' '}
                                {calculateInsumosGrandTotal(
                                    specimen.products,
                                ).toFixed(2)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                        <Microscope className="h-6 w-6 text-muted-foreground/40" />
                        <span className="font-medium">
                            No se han registrado insumos o reactivos para esta
                            muestra.
                        </span>
                        {canEdit && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsProductsSheetOpen(true)}
                                className="mt-1 h-7 font-semibold text-primary hover:bg-primary/5"
                            >
                                + Agregar insumos ahora
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <SpecimenProductsSheet
                key={
                    isProductsSheetOpen
                        ? `open_${specimen.id}`
                        : `closed_${specimen.id}`
                }
                specimen={specimen}
                open={isProductsSheetOpen}
                onOpenChange={setIsProductsSheetOpen}
                products={products}
            />
        </>
    );
}
