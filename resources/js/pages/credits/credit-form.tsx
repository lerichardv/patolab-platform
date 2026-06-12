import { useForm } from '@inertiajs/react';
import { FileText, Upload, X } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { pay as payCredit } from '@/actions/App/Http/Controllers/CreditController';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

interface Customer {
    id: number;
    name: string;
    id_number: string;
}

interface Credit {
    id: number;
    customer_id: number;
    credit_amount: string | number;
    amount_paid: string | number;
    amount_remaining: string | number;
    customer?: Customer;
    last_payment_date?: string | null;
    reminder_interval_in_seconds?: number;
}

interface Props {
    credit: Credit;
    onSuccess: () => void;
}

export default function CreditForm({ credit, onSuccess }: Props) {
    const remainingVal = parseFloat(String(credit.amount_remaining));

    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        amount_paid: remainingVal.toFixed(2),
        payment_type: 'cash',
        proof_of_payment: null as File | null,
        invoice_type: 'credit payment',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (parseFloat(data.amount_paid) <= 0) {
            toast.error('El monto a pagar debe ser mayor que cero');

            return;
        }

        if (parseFloat(data.amount_paid) > remainingVal) {
            toast.error('El monto a pagar no puede superar el saldo pendiente');

            return;
        }

        if (data.payment_type !== 'cash' && !data.proof_of_payment) {
            toast.error('El comprobante de pago es requerido');

            return;
        }

        setShowConfirm(true);
    };

    const confirmSubmit = () => {
        setShowConfirm(false);
        post(payCredit(credit.id).url, {
            onSuccess: () => {
                toast.success('Pago de crédito registrado con éxito');
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
                        <span className="text-primary">Saldo Restante:</span>
                        <span className="text-destructive">
                            L. {remainingVal.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-2">
                <div className="space-y-2">
                    <Label htmlFor="amount_paid">Monto a Pagar (L.) *</Label>
                    <Input
                        id="amount_paid"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={remainingVal}
                        value={data.amount_paid}
                        onChange={(e) => setData('amount_paid', e.target.value)}
                        placeholder="0.00"
                        required
                    />
                    <InputError message={errors.amount_paid} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="payment_type">Tipo de Pago *</Label>
                    <Select
                        value={data.payment_type}
                        onValueChange={(value) =>
                            setData('payment_type', value)
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione el tipo de pago" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="credit card">
                                Tarjeta de Crédito
                            </SelectItem>
                            <SelectItem value="bank transfer">
                                Transferencia Bancaria
                            </SelectItem>
                            <SelectItem value="check">Cheque</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={errors.payment_type} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="proof_of_payment">
                        Comprobante de Pago (PDF o Imagen){' '}
                        {data.payment_type !== 'cash' && '*'}
                    </Label>

                    {data.proof_of_payment && (
                        <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
                            <div className="flex items-center gap-3">
                                <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-500">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="max-w-[180px] truncate text-xs font-semibold text-foreground sm:max-w-xs">
                                        {data.proof_of_payment.name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {(
                                            data.proof_of_payment.size /
                                            1024 /
                                            1024
                                        ).toFixed(2)}{' '}
                                        MB
                                    </span>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    setData('proof_of_payment', null)
                                }
                                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {!data.proof_of_payment && (
                        <div className="group relative">
                            <input
                                type="file"
                                id="proof_of_payment"
                                className="hidden"
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setData('proof_of_payment', file);
                                }}
                            />
                            <label
                                htmlFor="proof_of_payment"
                                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:bg-accent/10"
                            >
                                <div className="mb-2 rounded-full bg-secondary p-2.5 text-secondary-foreground transition-transform duration-200 group-hover:scale-110">
                                    <Upload className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-semibold text-foreground">
                                    Subir Comprobante
                                </span>
                                <span className="mt-1 text-[10px] text-muted-foreground">
                                    PDF hasta 30MB, imágenes hasta 10MB
                                </span>
                            </label>
                        </div>
                    )}
                    <InputError message={errors.proof_of_payment} />
                </div>
            </div>

            <div className="flex justify-end border-t pt-4">
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full sm:w-auto"
                >
                    {processing && <Spinner className="mr-2" />}
                    {processing ? 'Registrando...' : 'Registrar Pago'}
                </Button>
            </div>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="max-w-[450px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Confirmación de Abono
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Revise detalladamente los importes antes de
                            registrar este abono al crédito.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="grid gap-3 py-3 text-sm">
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Cliente:
                            </span>
                            <span className="font-semibold text-foreground">
                                {credit.customer?.name}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Tipo de Pago:
                            </span>
                            <span className="font-semibold text-foreground">
                                {data.payment_type === 'cash'
                                    ? 'Efectivo'
                                    : data.payment_type === 'credit card'
                                      ? 'Tarjeta de Crédito'
                                      : data.payment_type === 'bank transfer'
                                        ? 'Transferencia Bancaria'
                                        : data.payment_type === 'check'
                                          ? 'Cheque'
                                          : data.payment_type}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Monto de Abono:
                            </span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                L.{' '}
                                {parseFloat(data.amount_paid || '0').toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Saldo Pendiente Anterior:
                            </span>
                            <span className="font-semibold text-foreground">
                                L. {remainingVal.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2 text-base font-bold">
                            <span className="text-primary">
                                Nuevo Saldo Pendiente:
                            </span>
                            <span className="text-destructive">
                                L.{' '}
                                {Math.max(
                                    0,
                                    remainingVal -
                                        (parseFloat(data.amount_paid) || 0),
                                ).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmSubmit}
                            disabled={processing}
                        >
                            {processing && <Spinner className="mr-2" />}
                            {processing ? 'Registrando...' : 'Confirmar Pago'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </form>
    );
}
