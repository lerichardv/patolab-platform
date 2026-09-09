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

export interface PriceQuoteSummaryItem {
    client_id?: string | number;
    specimen?: string;
    temp_specimen_code?: string;
    specimen_type: string | number;
    examination_id: string | number;
    quantity: number;
    amount?: number;
    discount?: number;
    subtotal?: number;
    selected_price?: string;
    custom_specimen_price?: string;
    additional_discount_enabled?: boolean;
    additional_discount?: string | number;
    age_discount_amount?: string | number;
    total?: number;
}

export interface PriceQuoteSummaryAlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerName?: string;
    items: PriceQuoteSummaryItem[];
    specimenTypes: any[];
    examinations: any[];
    baseTotal: number;
    autoDiscountTotal: number;
    additionalDiscountTotal: number;
    globalDiscountTotal: number;
    finalTotal: number;
    onConfirm: () => void;
}

export function PriceQuoteSummaryAlertDialog({
    open,
    onOpenChange,
    customerName,
    items,
    specimenTypes,
    examinations,
    baseTotal,
    autoDiscountTotal,
    additionalDiscountTotal,
    globalDiscountTotal,
    finalTotal,
    onConfirm,
}: PriceQuoteSummaryAlertDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="z-[120] max-w-[500px]">
                <AlertDialogHeader>
                    <AlertDialogTitle>Resumen de Cotización</AlertDialogTitle>
                    <AlertDialogDescription>
                        Revise detalladamente los importes antes de generar el
                        documento de cotización.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="grid gap-3 py-3 text-sm">
                    <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-muted-foreground">
                            Cliente / Paciente:
                        </span>
                        <span className="font-semibold text-foreground">
                            {customerName || 'Público General'}
                        </span>
                    </div>

                    {/* RESUMEN DE MUESTRAS / EXÁMENES */}
                    <div className="flex flex-col gap-1.5 border-b pb-2">
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                            Exámenes a Cotizar ({items.length}):
                        </span>
                        <div className="flex max-h-[160px] flex-col gap-1.5 overflow-y-auto pr-1">
                            {items.map((item, idx) => {
                                const specTypeName =
                                    specimenTypes.find(
                                        (t) =>
                                            t.id.toString() ===
                                            item.specimen_type.toString(),
                                    )?.name || '';
                                const examName =
                                    examinations.find(
                                        (e) =>
                                            e.id.toString() ===
                                            item.examination_id.toString(),
                                    )?.name || '';

                                const qty = item.quantity || 1;
                                const itemTotal = Number(item.total ?? 0);

                                return (
                                    <div
                                        key={item.client_id || idx}
                                        className="flex items-center justify-between border-b border-muted/50 py-0.5 text-xs last:border-0"
                                    >
                                        <div className="flex max-w-[320px] flex-col truncate">
                                            <span className="truncate font-medium text-foreground">
                                                {specTypeName &&
                                                    `${specTypeName} - `}
                                                {examName}{' '}
                                                {qty > 1 && `(x${qty})`}
                                            </span>
                                            {item.temp_specimen_code && (
                                                <span className="font-mono text-[10px] text-muted-foreground">
                                                    Muestra{' '}
                                                    {item.temp_specimen_code}
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-semibold whitespace-nowrap text-foreground">
                                            L. {itemTotal.toFixed(2)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-muted-foreground">
                            Total Exámenes (Base):
                        </span>
                        <span className="font-semibold text-foreground">
                            L. {baseTotal.toFixed(2)}
                        </span>
                    </div>

                    {globalDiscountTotal > 0 ? (
                        <div className="flex flex-col gap-1.5 rounded border border-b border-emerald-500/20 bg-emerald-500/5 p-2.5 pb-2 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                                Descuentos Aplicados
                            </span>
                            {autoDiscountTotal > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span>Descuentos por Examen / Edad:</span>
                                    <span className="font-semibold">
                                        - L. {autoDiscountTotal.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            {additionalDiscountTotal > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span>Descuentos Adicionales:</span>
                                    <span className="font-semibold">
                                        - L.{' '}
                                        {additionalDiscountTotal.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-emerald-500/20 pt-1 text-xs font-bold">
                                <span>Total Descuentos:</span>
                                <span>
                                    - L. {globalDiscountTotal.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between border-b pb-2 text-emerald-600 dark:text-emerald-400">
                            <span className="font-medium">
                                Descuentos Aplicados:
                            </span>
                            <span className="font-semibold">- L. 0.00</span>
                        </div>
                    )}

                    <div className="flex justify-between pt-1 text-base font-bold">
                        <span>TOTAL COTIZADO:</span>
                        <span className="text-primary">
                            L. {finalTotal.toFixed(2)}
                        </span>
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            onOpenChange(false);
                            onConfirm();
                        }}
                    >
                        Confirmar y Guardar Cotización
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default PriceQuoteSummaryAlertDialog;
