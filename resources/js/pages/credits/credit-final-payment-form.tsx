import { useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { payFinal as payFinalCredit } from '@/actions/App/Http/Controllers/CreditController';
import InputError from '@/components/input-error';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

interface Customer {
    id: number;
    name: string;
    id_number: string;
}

interface Invoice {
    id: number;
    invoice_number?: string | null;
    full_invoice_number?: string | null;
    cai_range_id?: number | null;
    payment_type?: string;
}

interface CreditInvoiceSpecimen {
    id: number;
    credit_id: number;
    invoice_id: number;
    specimen_id: number;
    is_paid: boolean;
    amount: string | number;
    discount: string | number;
    subtotal: string | number;
    total: string | number;
    quantity: number;
    quantity_paid?: number;
    specimen?: {
        id: number;
        sequence_code: string;
        customer_relation?: {
            name: string;
        };
        type?: {
            name: string;
        };
        examination?: {
            name: string;
        };
    };
}

interface Credit {
    id: number;
    customer_id: number;
    credit_amount: string | number;
    amount_paid: string | number;
    amount_remaining: string | number;
    status?: string;
    is_group?: boolean;
    group_id?: number | null;
    customer?: Customer;
    last_payment_date?: string | null;
    reminder_interval_in_seconds?: number;
    credit_invoice_specimens?: CreditInvoiceSpecimen[];
    invoices?: Invoice[];
    invoice?: Invoice;
    group?: {
        id: number;
        invoice?: Invoice;
    };
    specimen?: any;
}

interface Bank {
    id: number;
    name: string;
}

interface Props {
    credit: Credit;
    banks?: Bank[];
    onSuccess: () => void;
}

export default function CreditFinalPaymentForm({
    credit,
    onSuccess,
}: Props) {
    const remainingVal = parseFloat(String(credit.amount_remaining));

    const originalInvoice =
        credit.invoices?.find((inv) => inv.payment_type === 'credit') ||
        credit.invoices?.[0] ||
        credit.group?.invoice ||
        credit.invoice;

    const hasExistingInvoiceNumber = Boolean(
        originalInvoice?.invoice_number &&
        originalInvoice?.full_invoice_number &&
        originalInvoice?.cai_range_id,
    );

    const unpaidSpecimens =
        credit.credit_invoice_specimens?.filter((item) => !item.is_paid) || [];
    const initialSpecimens = unpaidSpecimens.map((item) => ({
        id: item.specimen_id,
        quantity: item.quantity - (item.quantity_paid ?? 0),
    }));

    const [showConfirm, setShowConfirm] = useState(false);

    const { data, post, processing, errors, reset } = useForm({
        amount_paid: remainingVal.toFixed(2),
        specimens: credit.is_group ? initialSpecimens : [],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (credit.is_group && data.specimens.length === 0) {
            toast.error('Debe seleccionar al menos una muestra para facturar');

            return;
        }

        if (parseFloat(data.amount_paid) <= 0) {
            toast.error('El monto debe ser mayor que cero');

            return;
        }

        setShowConfirm(true);
    };

    const confirmSubmit = () => {
        setShowConfirm(false);
        post(payFinalCredit(credit.id).url, {
            onSuccess: () => {
                toast.success('Factura final de crédito generada con éxito');
                onSuccess();
                reset();
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-5 px-5 py-4">
            <div>
                <h3 className="mb-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    Detalles del Crédito
                </h3>
                <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-semibold text-foreground">
                            {credit.customer?.name}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">ID / RTN:</span>
                        <span className="font-semibold text-foreground">
                            {credit.customer?.id_number}
                        </span>
                    </div>
                    {hasExistingInvoiceNumber && (
                        <div className="flex justify-between border-t border-border/50 pt-2">
                            <span className="text-muted-foreground">
                                Factura Fiscal Asignada:
                            </span>
                            <span className="font-mono font-semibold text-primary">
                                {originalInvoice?.full_invoice_number ||
                                    originalInvoice?.invoice_number}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between border-t border-border/50 pt-2">
                        <span className="text-muted-foreground">
                            Monto Total de Crédito:
                        </span>
                        <span className="font-semibold text-foreground">
                            L.{' '}
                            {parseFloat(String(credit.credit_amount)).toFixed(
                                2,
                            )}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Monto Pagado:
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            L.{' '}
                            {parseFloat(String(credit.amount_paid)).toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between border-t border-border/50 pt-2 text-base font-bold">
                        <span className="text-primary">Saldo a Facturar:</span>
                        <span className="text-destructive">
                            L. {remainingVal.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Resumen de Muestras a Liquidar */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    Resumen de Muestras a Liquidar
                </h3>

                {credit.is_group ? (
                    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between border-b pb-2 text-xs text-muted-foreground">
                            <span>Muestras pendientes en el grupo:</span>
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">
                                {unpaidSpecimens.length}{' '}
                                {unpaidSpecimens.length === 1
                                    ? 'muestra'
                                    : 'muestras'}
                            </span>
                        </div>

                        <div className="max-h-[220px] space-y-2.5 overflow-y-auto pr-1">
                            {unpaidSpecimens.map((item) => {
                                const spec = item.specimen;
                                const maxQty =
                                    item.quantity - (item.quantity_paid ?? 0);

                                return (
                                    <div
                                        key={item.specimen_id}
                                        className="flex items-start justify-between rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs"
                                    >
                                        <div className="flex flex-col space-y-1">
                                            <span className="font-mono font-bold text-foreground">
                                                {spec?.sequence_code || 'N/A'}
                                            </span>
                                            <span className="font-semibold text-muted-foreground">
                                                Paciente:{' '}
                                                {spec?.customer_relation
                                                    ?.name || 'N/A'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/80">
                                                {spec?.type?.name || 'N/A'}
                                                {spec?.examination?.name &&
                                                    ` - ${spec.examination.name}`}
                                            </span>
                                            <span className="text-[10px] font-semibold text-primary">
                                                Cantidad a liquidar: {maxQty}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-foreground">
                                                L.{' '}
                                                {(
                                                    (parseFloat(
                                                        String(item.amount),
                                                    ) -
                                                        parseFloat(
                                                            String(
                                                                item.discount,
                                                            ),
                                                        )) *
                                                    maxQty
                                                ).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    credit.specimen && (
                        <div className="flex items-start justify-between rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs shadow-sm">
                            <div className="flex flex-col space-y-1">
                                <span className="font-mono text-sm font-bold text-foreground">
                                    {credit.specimen.sequence_code || 'N/A'}
                                </span>
                                <span className="font-semibold text-muted-foreground">
                                    Paciente:{' '}
                                    {credit.specimen.customer_relation?.name ||
                                        'N/A'}
                                </span>
                                <span className="text-[10px] text-muted-foreground/85">
                                    {credit.specimen.type?.name || 'N/A'}
                                    {credit.specimen.examination?.name &&
                                        ` - ${credit.specimen.examination.name}`}
                                </span>
                                <span className="mt-1 inline-flex w-fit items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                    Muestra única del crédito
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold text-foreground">
                                    L. {remainingVal.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )
                )}
            </div>

            <div className="space-y-4 pt-2">
                {/* Amount to invoice */}
                <div className="space-y-2">
                    <Label htmlFor="amount_paid">Monto Total a Facturar (L.) *</Label>
                    <Input
                        id="amount_paid"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={data.amount_paid}
                        placeholder="0.00"
                        required
                        disabled={true}
                        className="cursor-not-allowed bg-muted"
                    />
                    <p className="text-[10px] text-muted-foreground">
                        El monto corresponde al saldo restante total del crédito a liquidar fiscalmente.
                    </p>
                    <InputError message={errors.amount_paid} />
                </div>
            </div>

            <div className="flex justify-end border-t pt-4">
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full sm:w-auto"
                >
                    {processing && <Spinner className="mr-2" />}
                    {processing ? 'Generando...' : 'Generar Factura Final'}
                </Button>
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Generar Factura Final de Crédito?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {hasExistingInvoiceNumber ? (
                                <>
                                    Se finalizará la factura fiscal oficial{' '}
                                    <strong>
                                        {originalInvoice?.full_invoice_number ||
                                            originalInvoice?.invoice_number}
                                    </strong>{' '}
                                    para el crédito #{credit.id} por un monto de{' '}
                                    <strong>L. {remainingVal.toFixed(2)}</strong>. Se conservará el mismo número de factura y el estado del crédito pasará a <strong>Factura Generada</strong>.
                                </>
                            ) : (
                                <>
                                    Se emitirá la factura fiscal oficial para el crédito #{credit.id} por un monto de{' '}
                                    <strong>L. {remainingVal.toFixed(2)}</strong>. El estado del crédito pasará a <strong>Factura Generada</strong>.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmSubmit}
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <Spinner className="mr-2" />
                                    Generando...
                                </>
                            ) : (
                                'Confirmar y Generar'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </form>
    );
}
