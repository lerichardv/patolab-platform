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

export interface InsumoItem {
    id: number | string;
    name: string;
    code?: string;
    quantity: number | string;
}

export interface SpecimenInvoiceSummaryAlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerLabel: string;
    examinationLabel: string;
    paymentTypeLabel: string;
    agregarInsumos?: boolean;
    insumos?: InsumoItem[];
    regularPrice: number;
    customAmountEnabled?: boolean;
    customAmountVal?: number;
    customAmountReason?: string;
    discountVal?: number;
    totalVal: number;
    onConfirm: () => void;
}

export function SpecimenInvoiceSummaryAlertDialog({
    open,
    onOpenChange,
    customerLabel,
    examinationLabel,
    paymentTypeLabel,
    agregarInsumos = false,
    insumos = [],
    regularPrice,
    customAmountEnabled = false,
    customAmountVal = 0,
    customAmountReason,
    discountVal = 0,
    totalVal,
    onConfirm,
}: SpecimenInvoiceSummaryAlertDialogProps) {
    const hasInsumos = agregarInsumos && insumos && insumos.length > 0;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="z-[120] max-w-[500px]">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Resumen de Factura y Transacción
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Revise detalladamente los importes antes de emitir la
                        factura fiscal.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="grid gap-3 py-3 text-sm">
                    <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-muted-foreground">
                            Cliente / Paciente:
                        </span>
                        <span className="font-semibold text-foreground">
                            {customerLabel}
                        </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-muted-foreground">
                            Examen:
                        </span>
                        <span className="max-w-[250px] truncate font-semibold text-foreground">
                            {examinationLabel}
                        </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-muted-foreground">
                            Tipo de Pago:
                        </span>
                        <span className="font-semibold text-foreground">
                            {paymentTypeLabel}
                        </span>
                    </div>

                    {hasInsumos && (
                        <div className="flex flex-col gap-1.5 border-b pb-2">
                            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                                Insumos Seleccionados (Consumo Interno):
                            </span>
                            <div className="flex max-h-[120px] flex-col gap-1.5 overflow-y-auto pr-1">
                                {insumos.map((insumo) => (
                                    <div
                                        key={insumo.id}
                                        className="flex items-center justify-between rounded border border-border/50 bg-muted/30 p-1.5 text-xs"
                                    >
                                        <div className="flex min-w-0 flex-col">
                                            <span className="max-w-[220px] truncate font-semibold text-foreground">
                                                {insumo.name}
                                            </span>
                                            {insumo.code && (
                                                <span className="font-mono text-[9px] text-muted-foreground uppercase">
                                                    {insumo.code}
                                                </span>
                                            )}
                                        </div>
                                        <div className="shrink-0 text-right font-mono text-xs">
                                            <span className="mr-2 text-[10px] text-muted-foreground">
                                                {insumo.quantity}x
                                            </span>
                                            <span className="font-bold text-emerald-600">
                                                L. 0.00
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-muted-foreground">
                            Precio Regular Muestra:
                        </span>
                        <span className="font-semibold text-foreground">
                            L. {regularPrice.toFixed(2)}
                        </span>
                    </div>
                    {customAmountEnabled && (
                        <div className="flex flex-col gap-0.5 border-b pb-2">
                            <div className="flex justify-between">
                                <span className="font-medium text-muted-foreground">
                                    Importe Personalizado:
                                </span>
                                <span className="font-semibold text-foreground">
                                    L. {customAmountVal.toFixed(2)}
                                </span>
                            </div>
                            {customAmountReason && (
                                <span className="text-left text-[10px] text-muted-foreground italic">
                                    Razón: {customAmountReason}
                                </span>
                            )}
                        </div>
                    )}
                    {hasInsumos && (
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Insumos y Reactivos (Reg.):
                            </span>
                            <span className="font-semibold text-emerald-600">
                                L. 0.00 (Consumo Interno)
                            </span>
                        </div>
                    )}
                    {discountVal > 0 ? (
                        <div className="flex flex-col gap-1.5 rounded border border-b border-emerald-500/20 bg-emerald-500/5 p-2.5 pb-2 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                                Descuentos Aplicados
                            </span>
                            <div className="flex justify-between border-t border-emerald-500/20 pt-1 text-xs font-bold">
                                <span>Total Descuentos:</span>
                                <span>- L. {discountVal.toFixed(2)}</span>
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
                    <div className="flex justify-between border-b pb-2 text-xs">
                        <span className="font-medium text-muted-foreground">
                            Importe Exonerado:
                        </span>
                        <span className="font-semibold text-foreground">
                            L. {totalVal.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between border-b pb-2 text-xs">
                        <span className="font-medium text-muted-foreground">
                            Importe Exento:
                        </span>
                        <span className="font-semibold text-foreground">
                            L. 0.00
                        </span>
                    </div>
                    <div className="flex justify-between pt-1 text-base font-bold">
                        <span>TOTAL NETO A PAGAR:</span>
                        <span className="text-primary">
                            L. {totalVal.toFixed(2)}
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
                        Confirmar y Emitir Factura
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default SpecimenInvoiceSummaryAlertDialog;
