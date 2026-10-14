import {
    AlertDialog,
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
import { useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    CreditCard,
    FileText,
    Landmark,
    Receipt,
    Upload,
    Wallet,
    X,
} from 'lucide-react';
import React, { useEffect } from 'react';
import { toast } from 'sonner';

interface Customer {
    id: number;
    name: string;
    id_number?: string;
}

interface Credit {
    id: number;
    customer_id?: number;
    credit_amount?: string | number;
    amount_paid?: string | number;
    amount_remaining?: string | number;
    status?: string;
    customer?: Customer;
}

interface Bank {
    id: number;
    name: string;
}

interface Props {
    credit: Credit | null;
    banks?: Bank[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
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

    return year ? `${month}/${year}` : month;
};

export default function CreditMarkAsPaidDialog({
    credit,
    banks = [],
    open,
    onOpenChange,
    onSuccess,
}: Props) {
    const {
        data,
        setData,
        post,
        processing,
        errors,
        reset,
        clearErrors,
    } = useForm({
        payment_type: 'cash',
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
    });

    const amountVal = parseFloat(String(credit?.credit_amount || 0));
    const remainingVal = parseFloat(String(credit?.amount_remaining || 0));
    const totalAmount = (amountVal > 0 ? amountVal : remainingVal).toFixed(2);

    useEffect(() => {
        if (open && credit) {
            clearErrors();
            setData({
                payment_type: 'cash',
                payment_method_date: new Date().toISOString().split('T')[0],
                cash_value: totalAmount,
                check_number: '',
                check_value: '',
                card_last_4: '',
                card_value_charged: '',
                card_expiration: '',
                card_authorization_code: '',
                transfer_bank_id: '',
                transfer_value: '',
                transfer_authorization_code: '',
                proof_of_payment: null,
            });
        }
    }, [open, credit]);

    const handlePaymentTypeChange = (type: string) => {
        setData((prev) => ({
            ...prev,
            payment_type: type,
            cash_value: type === 'cash' ? totalAmount : '',
            check_value: type === 'check' ? totalAmount : '',
            check_number: '',
            card_value_charged: type === 'credit card' ? totalAmount : '',
            card_last_4: '',
            card_expiration: '',
            card_authorization_code: '',
            transfer_value: type === 'bank transfer' ? totalAmount : '',
            transfer_bank_id: '',
            transfer_authorization_code: '',
            proof_of_payment: type === 'cash' ? null : prev.proof_of_payment,
        }));
    };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!credit) {
            return;
        }

        if (data.payment_type !== 'cash' && !data.proof_of_payment) {
            toast.error('El comprobante de pago es requerido.');
            return;
        }

        post(`/credits/${credit.id}/mark-as-paid`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                reset();
                toast.success('Crédito marcado como pagado con éxito');
                onSuccess?.();
            },
            onError: (err: any) => {
                const firstMsg = Object.values(err)[0];
                if (typeof firstMsg === 'string') {
                    toast.error(firstMsg);
                } else {
                    toast.error(
                        'Por favor complete todos los campos obligatorios del pago.',
                    );
                }
            },
        });
    };

    return (
        <AlertDialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!processing) {
                    onOpenChange(nextOpen);
                    if (!nextOpen) {
                        reset();
                    }
                }
            }}
        >
            <AlertDialogContent className="max-h-[90vh] w-full max-w-[580px] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        Marcar Crédito como Pagado
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Ingrese el método de pago y comprobante para marcar el
                        crédito #{credit?.id} (Cliente:{' '}
                        <strong>{credit?.customer?.name ?? 'N/A'}</strong>) como{' '}
                        <strong>Pagado</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
                    {/* Monto del crédito */}
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3 text-sm">
                        <span className="text-muted-foreground">
                            Monto Total a Liquidar:
                        </span>
                        <span className="font-mono text-base font-bold text-foreground">
                            L. {totalAmount}
                        </span>
                    </div>

                    {/* Tipo de Pago selector */}
                    <div className="grid gap-2">
                        <Label htmlFor="mark_payment_type">
                            Tipo de Pago{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={data.payment_type}
                            onValueChange={handlePaymentTypeChange}
                        >
                            <SelectTrigger id="mark_payment_type" className="w-full">
                                <SelectValue placeholder="Seleccione el tipo de pago" />
                            </SelectTrigger>
                            <SelectContent className="z-[150]">
                                <SelectItem value="cash">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="h-4 w-4 text-primary" />
                                        <span>Efectivo</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="credit card">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-primary" />
                                        <span>Tarjeta de Crédito</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="bank transfer">
                                    <div className="flex items-center gap-2">
                                        <Landmark className="h-4 w-4 text-primary" />
                                        <span>Transferencia Bancaria</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="check">
                                    <div className="flex items-center gap-2">
                                        <Receipt className="h-4 w-4 text-primary" />
                                        <span>Cheque</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.payment_type && (
                            <p className="text-xs text-destructive">
                                {errors.payment_type}
                            </p>
                        )}
                    </div>

                    {/* Payment Method Date */}
                    {data.payment_type !== '' && (
                        <div className="grid gap-2">
                            <Label htmlFor="mark_payment_date">
                                Fecha de Pago{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="mark_payment_date"
                                type="date"
                                value={data.payment_method_date}
                                onChange={(e) =>
                                    setData('payment_method_date', e.target.value)
                                }
                                required
                            />
                            {errors.payment_method_date && (
                                <p className="text-xs text-destructive">
                                    {errors.payment_method_date}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Cash Fields */}
                    {data.payment_type === 'cash' && (
                        <div className="grid gap-2 rounded-lg border bg-muted/40 p-4">
                            <Label htmlFor="mark_cash_value">
                                Valor Recibido (L.){' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="mark_cash_value"
                                type="number"
                                step="0.01"
                                value={data.cash_value}
                                onChange={(e) =>
                                    setData('cash_value', e.target.value)
                                }
                                placeholder="0.00"
                                className="font-mono"
                                required
                            />
                            {errors.cash_value && (
                                <p className="text-xs text-destructive">
                                    {errors.cash_value}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Check Fields */}
                    {data.payment_type === 'check' && (
                        <div className="grid gap-4 rounded-lg border bg-muted/40 p-4">
                            <div className="grid gap-2">
                                <Label htmlFor="mark_check_number">
                                    Número de Cheque{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="mark_check_number"
                                    type="text"
                                    value={data.check_number}
                                    onChange={(e) =>
                                        setData('check_number', e.target.value)
                                    }
                                    placeholder="Ej. 123456"
                                    required
                                />
                                {errors.check_number && (
                                    <p className="text-xs text-destructive">
                                        {errors.check_number}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="mark_check_value">
                                    Valor del Cheque (L.){' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="mark_check_value"
                                    type="number"
                                    step="0.01"
                                    value={data.check_value}
                                    onChange={(e) =>
                                        setData('check_value', e.target.value)
                                    }
                                    placeholder="0.00"
                                    className="font-mono"
                                    required
                                />
                                {errors.check_value && (
                                    <p className="text-xs text-destructive">
                                        {errors.check_value}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Credit Card Fields */}
                    {data.payment_type === 'credit card' && (
                        <div className="grid gap-4 rounded-lg border bg-muted/40 p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="mark_card_last_4">
                                        Últimos 4 Dígitos
                                    </Label>
                                    <Input
                                        id="mark_card_last_4"
                                        type="text"
                                        maxLength={4}
                                        value={data.card_last_4}
                                        onChange={(e) =>
                                            setData(
                                                'card_last_4',
                                                e.target.value
                                                    .replace(/\D/g, '')
                                                    .slice(0, 4),
                                            )
                                        }
                                        placeholder="1234"
                                    />
                                    {errors.card_last_4 && (
                                        <p className="text-xs text-destructive">
                                            {errors.card_last_4}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mark_card_expiration">
                                        Vencimiento
                                    </Label>
                                    <Input
                                        id="mark_card_expiration"
                                        type="text"
                                        placeholder="MM/AA"
                                        maxLength={7}
                                        value={data.card_expiration}
                                        onChange={(e) =>
                                            setData(
                                                'card_expiration',
                                                formatCardExpiration(
                                                    e.target.value,
                                                ),
                                            )
                                        }
                                    />
                                    {errors.card_expiration && (
                                        <p className="text-xs text-destructive">
                                            {errors.card_expiration}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="mark_card_authorization_code">
                                    Código de Autorización
                                </Label>
                                <Input
                                    id="mark_card_authorization_code"
                                    type="text"
                                    value={data.card_authorization_code}
                                    onChange={(e) =>
                                        setData(
                                            'card_authorization_code',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Ej. 987654"
                                />
                                {errors.card_authorization_code && (
                                    <p className="text-xs text-destructive">
                                        {errors.card_authorization_code}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="mark_card_value_charged">
                                    Monto Cargado (L.){' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="mark_card_value_charged"
                                    type="number"
                                    step="0.01"
                                    value={data.card_value_charged}
                                    onChange={(e) =>
                                        setData(
                                            'card_value_charged',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="0.00"
                                    className="font-mono"
                                    required
                                />
                                {errors.card_value_charged && (
                                    <p className="text-xs text-destructive">
                                        {errors.card_value_charged}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Bank Transfer Fields */}
                    {data.payment_type === 'bank transfer' && (
                        <div className="grid gap-4 rounded-lg border bg-muted/40 p-4">
                            <div className="grid gap-2">
                                <Label htmlFor="mark_transfer_bank_id">
                                    Banco{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={data.transfer_bank_id}
                                    onValueChange={(val) =>
                                        setData('transfer_bank_id', val)
                                    }
                                >
                                    <SelectTrigger
                                        id="mark_transfer_bank_id"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Seleccione un Banco" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[150]">
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
                                {errors.transfer_bank_id && (
                                    <p className="text-xs text-destructive">
                                        {errors.transfer_bank_id}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="mark_transfer_authorization_code">
                                    Código de Autorización / Referencia{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="mark_transfer_authorization_code"
                                    type="text"
                                    value={data.transfer_authorization_code}
                                    onChange={(e) =>
                                        setData(
                                            'transfer_authorization_code',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Ej. 11223344"
                                    required
                                />
                                {errors.transfer_authorization_code && (
                                    <p className="text-xs text-destructive">
                                        {errors.transfer_authorization_code}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="mark_transfer_value">
                                    Monto Transferido (L.){' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="mark_transfer_value"
                                    type="number"
                                    step="0.01"
                                    value={data.transfer_value}
                                    onChange={(e) =>
                                        setData('transfer_value', e.target.value)
                                    }
                                    placeholder="0.00"
                                    className="font-mono"
                                    required
                                />
                                {errors.transfer_value && (
                                    <p className="text-xs text-destructive">
                                        {errors.transfer_value}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Comprobante de Pago */}
                    <div className="space-y-2">
                        <Label htmlFor="mark_proof_of_payment">
                            Comprobante de Pago (PDF o Imagen){' '}
                            {data.payment_type !== 'cash' && (
                                <span className="text-destructive">*</span>
                            )}
                        </Label>

                        {data.proof_of_payment ? (
                            <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-500">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="max-w-[200px] truncate text-xs font-semibold text-foreground sm:max-w-xs">
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
                        ) : (
                            <div className="group relative">
                                <input
                                    type="file"
                                    id="mark_proof_of_payment"
                                    className="hidden"
                                    accept=".pdf,image/*"
                                    onChange={(e) => {
                                        const file =
                                            e.target.files?.[0] || null;
                                        setData('proof_of_payment', file);
                                    }}
                                />
                                <label
                                    htmlFor="mark_proof_of_payment"
                                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:bg-accent/10"
                                >
                                    <div className="mb-1.5 rounded-full bg-secondary p-2 text-secondary-foreground transition-transform duration-200 group-hover:scale-110">
                                        <Upload className="h-4 w-4" />
                                    </div>
                                    <span className="text-xs font-semibold text-foreground">
                                        Subir Comprobante
                                    </span>
                                    <span className="mt-0.5 text-[10px] text-muted-foreground">
                                        PDF hasta 30MB, imágenes hasta 10MB
                                    </span>
                                </label>
                            </div>
                        )}
                        {errors.proof_of_payment && (
                            <p className="text-xs text-destructive">
                                {errors.proof_of_payment}
                            </p>
                        )}
                    </div>

                    <AlertDialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                onOpenChange(false);
                                reset();
                            }}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            {processing && <Spinner className="mr-2" />}
                            {processing
                                ? 'Guardando...'
                                : 'Confirmar y Marcar como Pagado'}
                        </Button>
                    </AlertDialogFooter>
                </form>
            </AlertDialogContent>
        </AlertDialog>
    );
}
