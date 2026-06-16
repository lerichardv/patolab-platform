import { useForm } from '@inertiajs/react';
import {
    Calendar,
    CreditCard,
    FileText,
    Landmark,
    Receipt,
    Upload,
    Wallet,
    X,
} from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { pay as payCredit } from '@/actions/App/Http/Controllers/CreditController';
import HeadingSheet from '@/components/heading-sheet';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface Customer {
    id: number;
    name: string;
    id_number: string;
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
    is_group?: boolean;
    group_id?: number | null;
    customer?: Customer;
    last_payment_date?: string | null;
    reminder_interval_in_seconds?: number;
    credit_invoice_specimens?: CreditInvoiceSpecimen[];
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

const formatCardExpiration = (value: string): string => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);

    if (!cleaned) {
        return '';
    }

    let month = cleaned.slice(0, 2);
    const year = cleaned.slice(2, 6);

    if (month.length === 1 && month !== '0' && month !== '1') {
        month = '0' + month;
    } else if (month.length === 2) {
        const mVal = parseInt(month);

        if (mVal < 1) {
            month = '01';
        }

        if (mVal > 12) {
            month = '12';
        }
    }

    if (cleaned.length > 2) {
        return `${month}/${year}`;
    }

    return month;
};

const getPaymentTypeLabel = (type: string) => {
    switch (type) {
        case 'cash':
            return 'Efectivo';
        case 'credit card':
            return 'Tarjeta de Crédito';
        case 'bank transfer':
            return 'Transferencia Bancaria';
        case 'check':
            return 'Cheque';
        default:
            return type;
    }
};

export default function CreditForm({ credit, banks = [], onSuccess }: Props) {
    const remainingVal = parseFloat(String(credit.amount_remaining));

    const [showConfirm, setShowConfirm] = useState(false);
    const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
    const [localPayment, setLocalPayment] = useState({
        payment_type: '',
        payment_method_date: new Date().toISOString().split('T')[0],
        cash_value: '',
        check_number: '',
        check_value: '',
        card_last_4: '',
        card_value_charged: '',
        card_expiration: '',
        card_authorization_code: '',
        transfer_bank_id: '',
        transfer_value: '',
        transfer_authorization_code: '',
    });
    const [localPaymentErrors, setLocalPaymentErrors] = useState<
        Record<string, string>
    >({});

    const { data, setData, post, processing, errors, reset } = useForm({
        amount_paid: credit.is_group ? '0.00' : remainingVal.toFixed(2),
        payment_type: '',
        payment_method_date: new Date().toISOString().split('T')[0],
        cash_value: '',
        check_number: '',
        check_value: '',
        card_last_4: '',
        card_value_charged: '',
        card_expiration: '',
        card_authorization_code: '',
        transfer_bank_id: '',
        transfer_value: '',
        transfer_authorization_code: '',
        proof_of_payment: null as File | null,
        invoice_type: 'credit payment',
        specimen_ids: [] as number[],
    });

    // Sync local payment sheet state when opened
    useEffect(() => {
        if (isPaymentSheetOpen) {
            setLocalPayment({
                payment_type: data.payment_type || '',
                payment_method_date:
                    data.payment_method_date ||
                    new Date().toISOString().split('T')[0],
                cash_value: data.cash_value || '',
                check_number: data.check_number || '',
                check_value: data.check_value || '',
                card_last_4: data.card_last_4 || '',
                card_value_charged: data.card_value_charged || '',
                card_expiration: data.card_expiration || '',
                card_authorization_code: data.card_authorization_code || '',
                transfer_bank_id: data.transfer_bank_id || '',
                transfer_value: data.transfer_value || '',
                transfer_authorization_code:
                    data.transfer_authorization_code || '',
            });
            setLocalPaymentErrors({});
        }
    }, [isPaymentSheetOpen]);

    // Auto-fill amount fields in the payment sheet when type changes
    useEffect(() => {
        if (!isPaymentSheetOpen) {
            return;
        }

        const amountStr = data.amount_paid || '0';
        const amount = parseFloat(amountStr) || 0;
        const type = localPayment.payment_type;

        if (type === 'cash') {
            setLocalPayment((prev) => ({
                ...prev,
                cash_value: amount.toString(),
                check_value: '',
                check_number: '',
                card_value_charged: '',
                card_last_4: '',
                card_expiration: '',
                card_authorization_code: '',
                transfer_value: '',
                transfer_bank_id: '',
                transfer_authorization_code: '',
            }));
        } else if (type === 'check') {
            setLocalPayment((prev) => ({
                ...prev,
                check_value: amount.toString(),
                cash_value: '',
                card_value_charged: '',
                card_last_4: '',
                card_expiration: '',
                card_authorization_code: '',
                transfer_value: '',
                transfer_bank_id: '',
                transfer_authorization_code: '',
            }));
        } else if (type === 'credit card') {
            setLocalPayment((prev) => ({
                ...prev,
                card_value_charged: amount.toString(),
                cash_value: '',
                check_value: '',
                check_number: '',
                transfer_value: '',
                transfer_bank_id: '',
                transfer_authorization_code: '',
            }));
        } else if (type === 'bank transfer') {
            setLocalPayment((prev) => ({
                ...prev,
                transfer_value: amount.toString(),
                cash_value: '',
                check_value: '',
                check_number: '',
                card_value_charged: '',
                card_last_4: '',
                card_expiration: '',
                card_authorization_code: '',
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localPayment.payment_type, isPaymentSheetOpen]);

    const handleSavePaymentDetails = () => {
        const errs: Record<string, string> = {};

        if (!localPayment.payment_type) {
            errs.payment_type = 'El tipo de pago es requerido.';
        }

        if (localPayment.payment_type && !localPayment.payment_method_date) {
            errs.payment_method_date = 'La fecha de pago es requerida.';
        }

        if (localPayment.payment_type === 'cash') {
            if (
                !localPayment.cash_value ||
                parseFloat(localPayment.cash_value) <= 0
            ) {
                errs.cash_value =
                    'El valor recibido es requerido y debe ser mayor que 0.';
            }
        }

        if (localPayment.payment_type === 'check') {
            if (!localPayment.check_number) {
                errs.check_number = 'El número de cheque es requerido.';
            }

            if (
                !localPayment.check_value ||
                parseFloat(localPayment.check_value) <= 0
            ) {
                errs.check_value =
                    'El valor del cheque es requerido y debe ser mayor que 0.';
            }
        }

        if (localPayment.payment_type === 'credit card') {
            if (
                !localPayment.card_last_4 ||
                localPayment.card_last_4.length !== 4
            ) {
                errs.card_last_4 = 'Se requieren los últimos 4 dígitos.';
            }

            if (!localPayment.card_expiration) {
                errs.card_expiration =
                    'El vencimiento de la tarjeta es requerido.';
            } else if (
                !/^(0[1-9]|1[0-2])\/\d{2}(\d{2})?$/.test(
                    localPayment.card_expiration,
                )
            ) {
                errs.card_expiration =
                    'El vencimiento debe tener un formato como 12/26 o 12/2026.';
            }

            if (!localPayment.card_authorization_code) {
                errs.card_authorization_code =
                    'El código de autorización es requerido.';
            }

            if (
                !localPayment.card_value_charged ||
                parseFloat(localPayment.card_value_charged) <= 0
            ) {
                errs.card_value_charged =
                    'El valor cobrado es requerido y debe ser mayor que 0.';
            }
        }

        if (localPayment.payment_type === 'bank transfer') {
            if (
                !localPayment.transfer_bank_id ||
                localPayment.transfer_bank_id === 'none'
            ) {
                errs.transfer_bank_id = 'El banco es requerido.';
            }

            if (!localPayment.transfer_authorization_code) {
                errs.transfer_authorization_code =
                    'El código de autorización/referencia es requerido.';
            }

            if (
                !localPayment.transfer_value ||
                parseFloat(localPayment.transfer_value) <= 0
            ) {
                errs.transfer_value =
                    'El valor transferido es requerido y debe ser mayor que 0.';
            }
        }

        if (Object.keys(errs).length > 0) {
            setLocalPaymentErrors(errs);
            toast.error(
                'Por favor complete los campos obligatorios del método de pago.',
            );

            return;
        }

        setData((d) => ({
            ...d,
            payment_type: localPayment.payment_type,
            payment_method_date: localPayment.payment_method_date,
            cash_value: localPayment.cash_value,
            check_number: localPayment.check_number,
            check_value: localPayment.check_value,
            card_last_4: localPayment.card_last_4,
            card_value_charged: localPayment.card_value_charged,
            card_expiration: localPayment.card_expiration,
            card_authorization_code: localPayment.card_authorization_code,
            transfer_bank_id: localPayment.transfer_bank_id,
            transfer_value: localPayment.transfer_value,
            transfer_authorization_code:
                localPayment.transfer_authorization_code,
        }));

        setIsPaymentSheetOpen(false);
    };

    const handleSpecimenToggle = (specimenId: number) => {
        let newSpecimenIds = [...data.specimen_ids];

        if (newSpecimenIds.includes(specimenId)) {
            newSpecimenIds = newSpecimenIds.filter((id) => id !== specimenId);
        } else {
            newSpecimenIds.push(specimenId);
        }

        // Calculate sum of selected specimen totals
        const specimensList = credit.credit_invoice_specimens || [];
        const selectedSum = specimensList.reduce((sum, item) => {
            if (newSpecimenIds.includes(item.specimen_id)) {
                return sum + parseFloat(String(item.total));
            }

            return sum;
        }, 0);

        // Cap at remainingVal
        const finalAmount = Math.min(selectedSum, remainingVal);

        setData((prev) => ({
            ...prev,
            specimen_ids: newSpecimenIds,
            amount_paid: finalAmount.toFixed(2),
        }));
    };

    const handleSelectAll = () => {
        const unpaidSpecimens =
            credit.credit_invoice_specimens?.filter((item) => !item.is_paid) ||
            [];
        const newSpecimenIds = unpaidSpecimens.map((item) => item.specimen_id);
        const selectedSum = unpaidSpecimens.reduce(
            (sum, item) => sum + parseFloat(String(item.total)),
            0,
        );
        const finalAmount = Math.min(selectedSum, remainingVal);

        setData((prev) => ({
            ...prev,
            specimen_ids: newSpecimenIds,
            amount_paid: finalAmount.toFixed(2),
        }));
    };

    const handleSelectNone = () => {
        setData((prev) => ({
            ...prev,
            specimen_ids: [],
            amount_paid: '0.00',
        }));
    };

    const isProofRequired =
        data.payment_type !== '' && data.payment_type !== 'cash';

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (credit.is_group && data.specimen_ids.length === 0) {
            toast.error('Debe seleccionar al menos una muestra para pagar');

            return;
        }

        if (parseFloat(data.amount_paid) <= 0) {
            toast.error('El monto a pagar debe ser mayor que cero');

            return;
        }

        if (parseFloat(data.amount_paid) > remainingVal) {
            toast.error('El monto a pagar no puede superar el saldo pendiente');

            return;
        }

        if (!data.payment_type) {
            toast.error('Debe configurar el método de pago antes de continuar');

            return;
        }

        if (isProofRequired && !data.proof_of_payment) {
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

    const renderPaymentResume = () => {
        if (!data.payment_type) {
            return null;
        }

        const label = getPaymentTypeLabel(data.payment_type);

        return (
            <div className="mt-2 flex flex-col gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                    <span>Método de Pago:</span>
                    <span className="flex items-center gap-1 font-bold text-foreground capitalize">
                        {data.payment_type === 'cash' && (
                            <Wallet className="h-3.5 w-3.5 text-primary" />
                        )}
                        {data.payment_type === 'credit card' && (
                            <CreditCard className="h-3.5 w-3.5 text-primary" />
                        )}
                        {data.payment_type === 'bank transfer' && (
                            <Landmark className="h-3.5 w-3.5 text-primary" />
                        )}
                        {data.payment_type === 'check' && (
                            <Receipt className="h-3.5 w-3.5 text-primary" />
                        )}
                        {label}
                    </span>
                </div>
                {data.payment_method_date && (
                    <div className="flex justify-between">
                        <span>Fecha:</span>
                        <span className="font-mono text-foreground">
                            {data.payment_method_date}
                        </span>
                    </div>
                )}
                {data.payment_type === 'cash' && data.cash_value && (
                    <div className="flex justify-between">
                        <span>Monto Efectivo:</span>
                        <span className="font-mono font-semibold text-foreground">
                            L. {parseFloat(data.cash_value).toFixed(2)}
                        </span>
                    </div>
                )}
                {data.payment_type === 'check' && (
                    <>
                        {data.check_number && (
                            <div className="flex justify-between">
                                <span>No. de Cheque:</span>
                                <span className="font-mono font-semibold text-foreground">
                                    {data.check_number}
                                </span>
                            </div>
                        )}
                        {data.check_value && (
                            <div className="flex justify-between">
                                <span>Monto Cheque:</span>
                                <span className="font-mono font-semibold text-foreground">
                                    L. {parseFloat(data.check_value).toFixed(2)}
                                </span>
                            </div>
                        )}
                    </>
                )}
                {data.payment_type === 'credit card' && (
                    <>
                        {data.card_last_4 && (
                            <div className="flex justify-between">
                                <span>Tarjeta (Últimos 4):</span>
                                <span className="font-mono font-semibold text-foreground">
                                    **** {data.card_last_4}
                                </span>
                            </div>
                        )}
                        {data.card_value_charged && (
                            <div className="flex justify-between">
                                <span>Monto Cargado:</span>
                                <span className="font-mono font-semibold text-foreground">
                                    L.{' '}
                                    {parseFloat(
                                        data.card_value_charged,
                                    ).toFixed(2)}
                                </span>
                            </div>
                        )}
                    </>
                )}
                {data.payment_type === 'bank transfer' && (
                    <>
                        {data.transfer_authorization_code && (
                            <div className="flex justify-between">
                                <span>Ref. Transferencia:</span>
                                <span className="font-mono font-semibold text-foreground">
                                    {data.transfer_authorization_code}
                                </span>
                            </div>
                        )}
                        {data.transfer_value && (
                            <div className="flex justify-between">
                                <span>Monto Transferido:</span>
                                <span className="font-mono font-semibold text-foreground">
                                    L.{' '}
                                    {parseFloat(data.transfer_value).toFixed(2)}
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
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

            {credit.is_group &&
                credit.credit_invoice_specimens &&
                credit.credit_invoice_specimens.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Seleccionar Muestras a Pagar
                            </h3>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    onClick={handleSelectAll}
                                    className="h-auto p-0 text-xs font-semibold text-primary hover:no-underline"
                                >
                                    Seleccionar todas
                                </Button>
                                <span className="text-xs text-muted-foreground/50">
                                    |
                                </span>
                                <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    onClick={handleSelectNone}
                                    className="h-auto p-0 text-xs font-semibold text-muted-foreground hover:text-foreground hover:no-underline"
                                >
                                    Ninguna
                                </Button>
                            </div>
                        </div>
                        <div className="max-h-[280px] space-y-2.5 overflow-y-auto rounded-xl border bg-card p-3 shadow-inner">
                            {credit.credit_invoice_specimens.map((item) => {
                                const spec = item.specimen;
                                const isPaid = item.is_paid;
                                const isChecked = data.specimen_ids.includes(
                                    item.specimen_id,
                                );

                                return (
                                    <div
                                        key={item.specimen_id}
                                        onClick={() =>
                                            !isPaid &&
                                            handleSpecimenToggle(
                                                item.specimen_id,
                                            )
                                        }
                                        className={cn(
                                            'flex items-start justify-between rounded-lg border p-3 transition-all duration-200',
                                            isPaid
                                                ? 'cursor-not-allowed border-emerald-500/10 bg-emerald-500/5 opacity-75 dark:bg-emerald-500/10'
                                                : isChecked
                                                  ? 'cursor-pointer border-primary/50 bg-primary/5 shadow-sm'
                                                  : 'cursor-pointer border-border bg-muted/30 hover:border-muted-foreground/30 hover:bg-muted/50',
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <div
                                                className="pt-0.5"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <Checkbox
                                                    id={`spec-${item.specimen_id}`}
                                                    checked={
                                                        isPaid || isChecked
                                                    }
                                                    disabled={isPaid}
                                                    onCheckedChange={() =>
                                                        handleSpecimenToggle(
                                                            item.specimen_id,
                                                        )
                                                    }
                                                    className="border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                                />
                                            </div>
                                            <div className="flex flex-col space-y-1">
                                                <span className="font-mono text-xs font-bold text-foreground">
                                                    {spec?.sequence_code ||
                                                        'N/A'}
                                                </span>
                                                <span className="text-xs font-semibold text-muted-foreground">
                                                    Paciente:{' '}
                                                    {spec?.customer_relation
                                                        ?.name || 'N/A'}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground/85">
                                                    {spec?.type?.name || 'N/A'}
                                                    {spec?.examination?.name &&
                                                        ` - ${spec.examination.name}`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-xs font-semibold text-foreground">
                                                L.{' '}
                                                {parseFloat(
                                                    String(item.total),
                                                ).toFixed(2)}
                                            </span>
                                            {isPaid ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                                    Pagado
                                                </span>
                                            ) : isChecked ? (
                                                <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-primary">
                                                    Seleccionado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-bold text-orange-600 dark:text-orange-400">
                                                    Pendiente
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <InputError message={errors.specimen_ids} />
                    </div>
                )}

            <div className="space-y-4 pt-2">
                {/* Amount to pay — read only for group credits */}
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
                        disabled={credit.is_group}
                        className={cn(
                            credit.is_group && 'cursor-not-allowed bg-muted',
                        )}
                    />
                    {credit.is_group && (
                        <p className="text-[10px] text-muted-foreground">
                            El monto se calcula automáticamente al seleccionar
                            las muestras de la lista.
                        </p>
                    )}
                    <InputError message={errors.amount_paid} />
                </div>

                {/* Payment method button — same pattern as specimen-form */}
                <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold">
                                    Método de pago:
                                </span>
                                <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary capitalize">
                                    {data.payment_type
                                        ? getPaymentTypeLabel(data.payment_type)
                                        : 'Sin Seleccionar'}
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsPaymentSheetOpen(true)}
                                className="h-8 font-semibold"
                            >
                                {data.payment_type
                                    ? 'Cambiar método de Pago'
                                    : 'Seleccionar método de pago'}
                            </Button>
                        </div>

                        {data.payment_type ? (
                            renderPaymentResume()
                        ) : (
                            <div className="mt-2 border-t pt-2.5 text-[11px] text-muted-foreground italic">
                                Por favor, configure los detalles del pago.
                            </div>
                        )}
                        {errors.payment_type && (
                            <p className="mt-1 text-sm text-destructive">
                                {errors.payment_type}
                            </p>
                        )}
                    </div>
                </div>

                {/* Proof of payment */}
                <div className="space-y-2">
                    <Label htmlFor="proof_of_payment">
                        Comprobante de Pago (PDF o Imagen){' '}
                        {isProofRequired && '*'}
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

            {/* Payment Method Sheet */}
            <Sheet
                open={isPaymentSheetOpen}
                onOpenChange={setIsPaymentSheetOpen}
            >
                <SheetContent
                    side="right"
                    className="w-full max-w-[450px] overflow-y-auto sm:max-w-[600px]"
                >
                    <HeadingSheet
                        title="Método de Pago"
                        description="Configure el método de pago e ingrese la información requerida para registrar el abono."
                    />
                    <div className="mt-6 flex flex-col gap-6 px-5">
                        {/* Payment type selector */}
                        <div className="grid gap-2">
                            <Label htmlFor="sheet_payment_type">
                                Tipo de Pago{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={localPayment.payment_type}
                                onValueChange={(value) => {
                                    setLocalPayment((prev) => ({
                                        ...prev,
                                        payment_type: value,
                                    }));
                                }}
                            >
                                <SelectTrigger
                                    id="sheet_payment_type"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Seleccione el tipo de pago" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">
                                        Efectivo
                                    </SelectItem>
                                    <SelectItem value="credit card">
                                        Tarjeta de Crédito
                                    </SelectItem>
                                    <SelectItem value="bank transfer">
                                        Transferencia Bancaria
                                    </SelectItem>
                                    <SelectItem value="check">
                                        Cheque
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {localPaymentErrors.payment_type && (
                                <p className="text-xs text-destructive">
                                    {localPaymentErrors.payment_type}
                                </p>
                            )}
                        </div>

                        {/* Payment date */}
                        {localPayment.payment_type !== '' && (
                            <div className="grid gap-2">
                                <Label htmlFor="payment_method_date">
                                    Fecha de Pago{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <Calendar className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="payment_method_date"
                                        type="date"
                                        value={localPayment.payment_method_date}
                                        onChange={(e) =>
                                            setLocalPayment((prev) => ({
                                                ...prev,
                                                payment_method_date:
                                                    e.target.value,
                                            }))
                                        }
                                        className="pl-9"
                                        required
                                    />
                                </div>
                                {localPaymentErrors.payment_method_date && (
                                    <p className="text-xs text-destructive">
                                        {localPaymentErrors.payment_method_date}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Cash Fields */}
                        {localPayment.payment_type === 'cash' && (
                            <div className="grid gap-2 rounded-lg border bg-muted/40 p-4">
                                <Label htmlFor="cash_value">
                                    Valor Recibido (L.){' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="cash_value"
                                    type="number"
                                    step="0.01"
                                    value={localPayment.cash_value}
                                    onChange={(e) =>
                                        setLocalPayment((prev) => ({
                                            ...prev,
                                            cash_value: e.target.value,
                                        }))
                                    }
                                    placeholder="0.00"
                                    className="font-mono"
                                    required
                                />
                                {localPaymentErrors.cash_value && (
                                    <p className="text-xs text-destructive">
                                        {localPaymentErrors.cash_value}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Check Fields */}
                        {localPayment.payment_type === 'check' && (
                            <div className="grid gap-4 rounded-lg border bg-muted/40 p-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="check_number">
                                        Número de Cheque{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="check_number"
                                        type="text"
                                        value={localPayment.check_number}
                                        onChange={(e) =>
                                            setLocalPayment((prev) => ({
                                                ...prev,
                                                check_number: e.target.value,
                                            }))
                                        }
                                        placeholder="Ej. 123456"
                                        required
                                    />
                                    {localPaymentErrors.check_number && (
                                        <p className="text-xs text-destructive">
                                            {localPaymentErrors.check_number}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="check_value">
                                        Valor del Cheque (L.){' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="check_value"
                                        type="number"
                                        step="0.01"
                                        value={localPayment.check_value}
                                        onChange={(e) =>
                                            setLocalPayment((prev) => ({
                                                ...prev,
                                                check_value: e.target.value,
                                            }))
                                        }
                                        placeholder="0.00"
                                        className="font-mono"
                                        required
                                    />
                                    {localPaymentErrors.check_value && (
                                        <p className="text-xs text-destructive">
                                            {localPaymentErrors.check_value}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Credit Card Fields */}
                        {localPayment.payment_type === 'credit card' && (
                            <div className="grid gap-4 rounded-lg border bg-muted/40 p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="card_last_4">
                                            Últimos 4 Dígitos{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="card_last_4"
                                            type="text"
                                            maxLength={4}
                                            value={localPayment.card_last_4}
                                            onChange={(e) =>
                                                setLocalPayment((prev) => ({
                                                    ...prev,
                                                    card_last_4:
                                                        e.target.value.replace(
                                                            /\D/g,
                                                            '',
                                                        ),
                                                }))
                                            }
                                            placeholder="1234"
                                            required
                                        />
                                        {localPaymentErrors.card_last_4 && (
                                            <p className="text-xs text-destructive">
                                                {localPaymentErrors.card_last_4}
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="card_expiration">
                                            Vencimiento{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="card_expiration"
                                            type="text"
                                            placeholder="MM/AA o MM/AAAA"
                                            maxLength={7}
                                            value={localPayment.card_expiration}
                                            onChange={(e) =>
                                                setLocalPayment((prev) => ({
                                                    ...prev,
                                                    card_expiration:
                                                        formatCardExpiration(
                                                            e.target.value,
                                                        ),
                                                }))
                                            }
                                            required
                                        />
                                        {localPaymentErrors.card_expiration && (
                                            <p className="text-xs text-destructive">
                                                {
                                                    localPaymentErrors.card_expiration
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="card_authorization_code">
                                        Código de Autorización{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="card_authorization_code"
                                        type="text"
                                        value={
                                            localPayment.card_authorization_code
                                        }
                                        onChange={(e) =>
                                            setLocalPayment((prev) => ({
                                                ...prev,
                                                card_authorization_code:
                                                    e.target.value,
                                            }))
                                        }
                                        placeholder="Ej. 987654"
                                        required
                                    />
                                    {localPaymentErrors.card_authorization_code && (
                                        <p className="text-xs text-destructive">
                                            {
                                                localPaymentErrors.card_authorization_code
                                            }
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="card_value_charged">
                                        Monto Cargado (L.){' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="card_value_charged"
                                        type="number"
                                        step="0.01"
                                        value={localPayment.card_value_charged}
                                        onChange={(e) =>
                                            setLocalPayment((prev) => ({
                                                ...prev,
                                                card_value_charged:
                                                    e.target.value,
                                            }))
                                        }
                                        placeholder="0.00"
                                        className="font-mono"
                                        required
                                    />
                                    {localPaymentErrors.card_value_charged && (
                                        <p className="text-xs text-destructive">
                                            {
                                                localPaymentErrors.card_value_charged
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Bank Transfer Fields */}
                        {localPayment.payment_type === 'bank transfer' && (
                            <div className="grid gap-4 rounded-lg border bg-muted/40 p-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="transfer_bank_id">
                                        Banco{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Select
                                        value={localPayment.transfer_bank_id}
                                        onValueChange={(val) =>
                                            setLocalPayment((prev) => ({
                                                ...prev,
                                                transfer_bank_id: val,
                                            }))
                                        }
                                    >
                                        <SelectTrigger
                                            id="transfer_bank_id"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Seleccione un Banco" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {banks && banks.length > 0 ? (
                                                banks.map((bank) => (
                                                    <SelectItem
                                                        key={bank.id}
                                                        value={bank.id.toString()}
                                                    >
                                                        {bank.name}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem
                                                    value="none"
                                                    disabled
                                                >
                                                    No hay bancos registrados
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {localPaymentErrors.transfer_bank_id && (
                                        <p className="text-xs text-destructive">
                                            {
                                                localPaymentErrors.transfer_bank_id
                                            }
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="transfer_authorization_code">
                                        Código de Autorización / Referencia{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="transfer_authorization_code"
                                        type="text"
                                        value={
                                            localPayment.transfer_authorization_code
                                        }
                                        onChange={(e) =>
                                            setLocalPayment((prev) => ({
                                                ...prev,
                                                transfer_authorization_code:
                                                    e.target.value,
                                            }))
                                        }
                                        placeholder="Ej. 11223344"
                                        required
                                    />
                                    {localPaymentErrors.transfer_authorization_code && (
                                        <p className="text-xs text-destructive">
                                            {
                                                localPaymentErrors.transfer_authorization_code
                                            }
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="transfer_value">
                                        Monto Transferido (L.){' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="transfer_value"
                                        type="number"
                                        step="0.01"
                                        value={localPayment.transfer_value}
                                        onChange={(e) =>
                                            setLocalPayment((prev) => ({
                                                ...prev,
                                                transfer_value: e.target.value,
                                            }))
                                        }
                                        placeholder="0.00"
                                        className="font-mono"
                                        required
                                    />
                                    {localPaymentErrors.transfer_value && (
                                        <p className="text-xs text-destructive">
                                            {localPaymentErrors.transfer_value}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPaymentSheetOpen(false)}
                                className="flex-1 font-semibold"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSavePaymentDetails}
                                className="flex-1 font-semibold"
                            >
                                Guardar Detalles
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

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
                                {getPaymentTypeLabel(data.payment_type)}
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
