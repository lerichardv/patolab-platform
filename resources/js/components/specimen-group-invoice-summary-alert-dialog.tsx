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

export interface SpecimenGroupItem {
    client_id: string | number;
    specimen_type: string | number;
    specimen_type_examination: string | number;
    selected_price?: string;
    custom_specimen_price?: string;
    age_discount_amount?: string;
    additional_discount_enabled?: boolean;
    additional_discount?: string;
    quantity?: number;
}

export interface SpecimenGroupInvoiceSummaryAlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerName?: string;
    specimens: SpecimenGroupItem[];
    specimenTypes: any[];
    examinations: any[];
    paymentTypeLabel: string;
    specimensBaseTotal: number;
    customAmountEnabled?: boolean;
    customAmountVal?: number;
    customAmountReason?: string;
    globalDiscountTotal?: number;
    specimensAutoDiscount?: number;
    specimensAdditionalDiscount?: number;
    finalSubtotalVal: number;
    onConfirm: () => void;
}

export function SpecimenGroupInvoiceSummaryAlertDialog({
    open,
    onOpenChange,
    customerName,
    specimens,
    specimenTypes,
    examinations,
    paymentTypeLabel,
    specimensBaseTotal,
    customAmountEnabled = false,
    customAmountVal = 0,
    customAmountReason,
    globalDiscountTotal = 0,
    specimensAutoDiscount = 0,
    specimensAdditionalDiscount = 0,
    finalSubtotalVal,
    onConfirm,
}: SpecimenGroupInvoiceSummaryAlertDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="z-[120] max-w-[500px]">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Resumen de Factura y Transacción
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Revise detalladamente los importes antes de emitir la
                        factura fiscal del grupo.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="grid gap-3 py-3 text-sm">
                    <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-muted-foreground">
                            Cliente / Paciente (Facturación):
                        </span>
                        <span className="font-semibold text-foreground">
                            {customerName || 'Sin seleccionar'}
                        </span>
                    </div>

                    {/* RESUMEN DE MUESTRAS EN UNA FILA */}
                    <div className="flex flex-col gap-1.5 border-b pb-2">
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                            Muestras del Grupo ({specimens.length}):
                        </span>
                        <div className="flex max-h-[160px] flex-col gap-1.5 overflow-y-auto pr-1">
                            {specimens.map((spec) => {
                                const specTypeName =
                                    specimenTypes.find(
                                        (t) =>
                                            t.id.toString() ===
                                            spec.specimen_type.toString(),
                                    )?.name || '';
                                const examName =
                                    examinations.find(
                                        (e) =>
                                            e.id.toString() ===
                                            spec.specimen_type_examination.toString(),
                                    )?.name || '';

                                const prices =
                                    examinations.find(
                                        (e) =>
                                            e.id ===
                                            spec.specimen_type_examination,
                                    )?.prices || [];
                                const maxVal =
                                    prices.length > 0
                                        ? Math.max(
                                              ...prices.map(
                                                  (p: any) =>
                                                      parseFloat(p.amount) || 0,
                                              ),
                                          )
                                        : 0;
                                const chosen =
                                    spec.selected_price === 'custom'
                                        ? parseFloat(
                                              spec.custom_specimen_price || '0',
                                          ) || 0
                                        : parseFloat(
                                              spec.selected_price || '0',
                                          ) || 0;
                                const diffDiscount = Math.max(
                                    0,
                                    maxVal - chosen,
                                );
                                const ageDiscVal =
                                    parseFloat(
                                        spec.age_discount_amount || '0',
                                    ) || 0;
                                const addDiscVal =
                                    spec.additional_discount_enabled
                                        ? parseFloat(
                                              spec.additional_discount || '0',
                                          ) || 0
                                        : 0;
                                const qty = spec.quantity ?? 1;
                                const netPrice = Math.max(
                                    0,
                                    (maxVal -
                                        (diffDiscount +
                                            ageDiscVal +
                                            addDiscVal)) *
                                        qty,
                                );

                                return (
                                    <div
                                        key={spec.client_id}
                                        className="flex items-center justify-between border-b border-muted/50 py-0.5 text-xs last:border-0"
                                    >
                                        <span className="max-w-[320px] truncate font-medium text-foreground">
                                            {specTypeName} - {examName}{' '}
                                            {qty > 1 && `(x${qty})`}
                                        </span>
                                        <span className="font-semibold whitespace-nowrap text-foreground">
                                            L. {netPrice.toFixed(2)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-muted-foreground">
                            Tipo de Pago:
                        </span>
                        <span className="font-semibold text-foreground">
                            {paymentTypeLabel}
                        </span>
                    </div>

                    <div className="flex justify-between border-b pb-2">
                        <span className="font-medium text-muted-foreground">
                            Total Muestras (Base):
                        </span>
                        <span className="font-semibold text-foreground">
                            L. {specimensBaseTotal.toFixed(2)}
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

                    {globalDiscountTotal > 0 ? (
                        <div className="flex flex-col gap-1.5 rounded border border-b border-emerald-500/20 bg-emerald-500/5 p-2.5 pb-2 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                                Descuentos Aplicados
                            </span>
                            {specimensAutoDiscount > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span>Descuentos Automáticos / Edad:</span>
                                    <span className="font-semibold">
                                        - L. {specimensAutoDiscount.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            {specimensAdditionalDiscount > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span>Descuentos Adicionales:</span>
                                    <span className="font-semibold">
                                        - L.{' '}
                                        {specimensAdditionalDiscount.toFixed(2)}
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
                        <span>TOTAL NETO A PAGAR:</span>
                        <span className="text-primary">
                            L. {finalSubtotalVal.toFixed(2)}
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

export default SpecimenGroupInvoiceSummaryAlertDialog;
