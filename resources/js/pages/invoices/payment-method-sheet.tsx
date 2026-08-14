import { Wallet, CreditCard, Landmark, Receipt, Coins } from 'lucide-react';
import { useState, useEffect } from 'react';
import * as React from 'react';
import { toast } from 'sonner';
import HeadingSheet from '@/components/heading-sheet';
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
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface Bank {
    id: number;
    name: string;
}

export interface PaymentData {
    payment_type: string;
    payment_method_date: string;
    cash_value: string;
    check_number: string;
    check_value: string;
    card_last_4: string;
    card_value_charged: string;
    card_expiration: string;
    card_authorization_code: string;
    transfer_bank_id: string;
    transfer_value: string;
    transfer_authorization_code: string;
    has_initial_payment: boolean;
    initial_payment_amount: string;
    initial_payment_type: string;
}

export const getPaymentTypeLabel = (type: string): string => {
    switch (type) {
        case 'cash':
            return 'Efectivo';
        case 'credit card':
            return 'Tarjeta de Crédito';
        case 'bank transfer':
            return 'Transferencia Bancaria';
        case 'check':
            return 'Cheque';
        case 'credit':
            return 'Al Crédito';
        default:
            return type || 'Sin seleccionar';
    }
};

export const formatCardExpiration = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length === 0) {
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

interface PaymentMethodSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    banks: Bank[];
    totalAmount: number;
    paymentData: Partial<PaymentData>;
    onSave: (data: PaymentData) => void;
    title?: string;
    description?: string;
    className?: string;
    overlayClassName?: string;
}

export function PaymentMethodSheet({
    open,
    onOpenChange,
    banks,
    totalAmount,
    paymentData,
    onSave,
    title = 'Método de Pago',
    description = 'Configure el método de pago e ingrese la información fiscal requerida para facturar.',
    className,
    overlayClassName,
}: PaymentMethodSheetProps) {
    const [localPayment, setLocalPayment] = useState<PaymentData>({
        payment_type: '',
        payment_method_date: '',
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
        has_initial_payment: false,
        initial_payment_amount: '',
        initial_payment_type: 'cash',
    });

    const [localPaymentErrors, setLocalPaymentErrors] = useState<
        Record<string, string>
    >({});

    useEffect(() => {
        if (open) {
            setLocalPayment({
                payment_type: paymentData.payment_type || '',
                payment_method_date:
                    paymentData.payment_method_date ||
                    new Date().toISOString().split('T')[0],
                cash_value: paymentData.cash_value || '',
                check_number: paymentData.check_number || '',
                check_value: paymentData.check_value || '',
                card_last_4: paymentData.card_last_4 || '',
                card_value_charged: paymentData.card_value_charged || '',
                card_expiration: paymentData.card_expiration || '',
                card_authorization_code:
                    paymentData.card_authorization_code || '',
                transfer_bank_id: paymentData.transfer_bank_id || '',
                transfer_value: paymentData.transfer_value || '',
                transfer_authorization_code:
                    paymentData.transfer_authorization_code || '',
                has_initial_payment: paymentData.has_initial_payment || false,
                initial_payment_amount:
                    paymentData.initial_payment_amount || '',
                initial_payment_type:
                    paymentData.initial_payment_type || 'cash',
            });
            setLocalPaymentErrors({});
        }
    }, [open, paymentData]);

    const handleSave = () => {
        const errorsMap: Record<string, string> = {};

        if (!localPayment.payment_type) {
            errorsMap.payment_type = 'El tipo de pago es requerido.';
        }

        if (
            localPayment.payment_type !== 'credit' &&
            !localPayment.payment_method_date
        ) {
            errorsMap.payment_method_date = 'La fecha de pago es requerida.';
        }

        if (localPayment.payment_type === 'cash') {
            const val = parseFloat(localPayment.cash_value);
            const minAllowed = totalAmount === 0 ? 0 : 0.01;

            if (!localPayment.cash_value || isNaN(val) || val < minAllowed) {
                errorsMap.cash_value =
                    totalAmount === 0
                        ? 'El valor recibido es requerido y debe ser mayor o igual que 0.'
                        : 'El valor recibido es requerido y debe ser mayor que 0.';
            }
        }

        if (localPayment.payment_type === 'check') {
            if (!localPayment.check_number) {
                errorsMap.check_number = 'El número de cheque es requerido.';
            }

            const val = parseFloat(localPayment.check_value);
            const minAllowed = totalAmount === 0 ? 0 : 0.01;

            if (!localPayment.check_value || isNaN(val) || val < minAllowed) {
                errorsMap.check_value =
                    totalAmount === 0
                        ? 'El valor del cheque es requerido y debe ser mayor o igual que 0.'
                        : 'El valor del cheque es requerido y debe ser mayor que 0.';
            }
        }

        if (localPayment.payment_type === 'credit card') {
            if (
                localPayment.card_last_4 &&
                localPayment.card_last_4.length !== 4
            ) {
                errorsMap.card_last_4 = 'Se requieren los últimos 4 dígitos.';
            }

            if (
                localPayment.card_expiration &&
                !/^(0[1-9]|1[0-2])\/\d{2}(\d{2})?$/.test(
                    localPayment.card_expiration,
                )
            ) {
                errorsMap.card_expiration =
                    'El vencimiento debe tener un formato como 12/26 o 12/2026.';
            }

            const val = parseFloat(localPayment.card_value_charged);
            const minAllowed = totalAmount === 0 ? 0 : 0.01;

            if (
                !localPayment.card_value_charged ||
                isNaN(val) ||
                val < minAllowed
            ) {
                errorsMap.card_value_charged =
                    totalAmount === 0
                        ? 'El valor cobrado es requerido y debe ser mayor o igual que 0.'
                        : 'El valor cobrado es requerido y debe ser mayor que 0.';
            }
        }

        if (localPayment.payment_type === 'bank transfer') {
            if (
                !localPayment.transfer_bank_id ||
                localPayment.transfer_bank_id === 'none'
            ) {
                errorsMap.transfer_bank_id = 'El banco es requerido.';
            }

            if (!localPayment.transfer_authorization_code) {
                errorsMap.transfer_authorization_code =
                    'El código de autorización/referencia es requerido.';
            }

            const val = parseFloat(localPayment.transfer_value);
            const minAllowed = totalAmount === 0 ? 0 : 0.01;

            if (
                !localPayment.transfer_value ||
                isNaN(val) ||
                val < minAllowed
            ) {
                errorsMap.transfer_value =
                    totalAmount === 0
                        ? 'El valor transferido es requerido y debe ser mayor o igual que 0.'
                        : 'El valor transferido es requerido y debe ser mayor que 0.';
            }
        }

        if (
            localPayment.payment_type === 'credit' &&
            localPayment.has_initial_payment
        ) {
            const val = parseFloat(localPayment.initial_payment_amount);
            const minAllowed = totalAmount === 0 ? 0 : 0.01;

            if (
                !localPayment.initial_payment_amount ||
                isNaN(val) ||
                val < minAllowed
            ) {
                errorsMap.initial_payment_amount =
                    totalAmount === 0
                        ? 'El monto de pago inicial es requerido y debe ser mayor o igual que 0.'
                        : 'El monto de pago inicial es requerido y debe ser mayor que 0.';
            } else if (val > totalAmount) {
                errorsMap.initial_payment_amount = `El pago inicial no puede superar el total (L. ${totalAmount.toFixed(
                    2,
                )}).`;
            }

            if (!localPayment.initial_payment_type) {
                errorsMap.initial_payment_type =
                    'El tipo de pago inicial es requerido.';
            }

            if (
                localPayment.initial_payment_type === 'check' &&
                !localPayment.check_number
            ) {
                errorsMap.check_number = 'El número de cheque es requerido.';
            }

            if (localPayment.initial_payment_type === 'credit card') {
                if (
                    localPayment.card_last_4 &&
                    localPayment.card_last_4.length !== 4
                ) {
                    errorsMap.card_last_4 =
                        'Se requieren los últimos 4 dígitos.';
                }

                if (
                    localPayment.card_expiration &&
                    !/^(0[1-9]|1[0-2])\/\d{2}(\d{2})?$/.test(
                        localPayment.card_expiration,
                    )
                ) {
                    errorsMap.card_expiration =
                        'El vencimiento debe tener un formato como 12/26 o 12/2026.';
                }
            }

            if (localPayment.initial_payment_type === 'bank transfer') {
                if (
                    !localPayment.transfer_bank_id ||
                    localPayment.transfer_bank_id === 'none'
                ) {
                    errorsMap.transfer_bank_id = 'El banco es requerido.';
                }

                if (!localPayment.transfer_authorization_code) {
                    errorsMap.transfer_authorization_code =
                        'El código de autorización/referencia es requerido.';
                }
            }
        }

        if (Object.keys(errorsMap).length > 0) {
            setLocalPaymentErrors(errorsMap);
            toast.error(
                'Por favor complete los campos obligatorios del método de pago.',
            );

            return;
        }

        onSave(localPayment);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className={cn(
                    'w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]',
                    className,
                )}
                overlayClassName={overlayClassName}
            >
                <HeadingSheet title={title} description={description} />
                <div className="mt-6 flex flex-col gap-6 px-5 pb-6">
                    {/* Payment type selector */}
                    <div className="grid gap-2">
                        <Label htmlFor="sheet_payment_type">
                            Tipo de Pago{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={localPayment.payment_type}
                            onValueChange={(value) => {
                                setLocalPayment((prev) => {
                                    const next = {
                                        ...prev,
                                        payment_type: value,
                                        cash_value: '',
                                        check_value: '',
                                        check_number: '',
                                        card_value_charged: '',
                                        card_last_4: '',
                                        card_expiration: '',
                                        card_authorization_code: '',
                                        transfer_value: '',
                                        transfer_bank_id: '',
                                        transfer_authorization_code: '',
                                    };

                                    if (value === 'cash') {
                                        next.cash_value =
                                            totalAmount.toString();
                                    } else if (value === 'check') {
                                        next.check_value =
                                            totalAmount.toString();
                                    } else if (value === 'credit card') {
                                        next.card_value_charged =
                                            totalAmount.toString();
                                    } else if (value === 'bank transfer') {
                                        next.transfer_value =
                                            totalAmount.toString();
                                    } else if (value === 'credit') {
                                        next.has_initial_payment = false;
                                    }

                                    return next;
                                });
                            }}
                        >
                            <SelectTrigger
                                id="sheet_payment_type"
                                className="w-full"
                            >
                                <SelectValue placeholder="Seleccione el tipo de pago" />
                            </SelectTrigger>
                            <SelectContent className="z-[110]">
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
                                <SelectItem value="credit">
                                    <div className="flex items-center gap-2">
                                        <Coins className="h-4 w-4 text-primary" />
                                        <span>Al Crédito</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {localPaymentErrors.payment_type && (
                            <p className="text-xs text-destructive">
                                {localPaymentErrors.payment_type}
                            </p>
                        )}
                    </div>

                    {/* Payment Method Date */}
                    {localPayment.payment_type !== 'credit' &&
                        localPayment.payment_type !== '' && (
                            <div className="grid gap-2">
                                <Label htmlFor="payment_method_date">
                                    Fecha de Pago{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="payment_method_date"
                                    type="date"
                                    value={localPayment.payment_method_date}
                                    onChange={(e) =>
                                        setLocalPayment((prev) => ({
                                            ...prev,
                                            payment_method_date: e.target.value,
                                        }))
                                    }
                                    required
                                />
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
                                    <span className="text-destructive">*</span>
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
                                    <span className="text-destructive">*</span>
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
                                        Últimos 4 Dígitos
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
                                    />
                                    {localPaymentErrors.card_last_4 && (
                                        <p className="text-xs text-destructive">
                                            {localPaymentErrors.card_last_4}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="card_expiration">
                                        Vencimiento
                                    </Label>
                                    <Input
                                        id="card_expiration"
                                        type="text"
                                        placeholder="MM/AA"
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
                                    />
                                    {localPaymentErrors.card_expiration && (
                                        <p className="text-xs text-destructive">
                                            {localPaymentErrors.card_expiration}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="card_authorization_code">
                                    Código de Autorización
                                </Label>
                                <Input
                                    id="card_authorization_code"
                                    type="text"
                                    value={localPayment.card_authorization_code}
                                    onChange={(e) =>
                                        setLocalPayment((prev) => ({
                                            ...prev,
                                            card_authorization_code:
                                                e.target.value,
                                        }))
                                    }
                                    placeholder="Ej. 987654"
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
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="card_value_charged"
                                    type="number"
                                    step="0.01"
                                    value={localPayment.card_value_charged}
                                    onChange={(e) =>
                                        setLocalPayment((prev) => ({
                                            ...prev,
                                            card_value_charged: e.target.value,
                                        }))
                                    }
                                    placeholder="0.00"
                                    className="font-mono"
                                    required
                                />
                                {localPaymentErrors.card_value_charged && (
                                    <p className="text-xs text-destructive">
                                        {localPaymentErrors.card_value_charged}
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
                                    <span className="text-destructive">*</span>
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
                                    <SelectContent className="z-[110]">
                                        {banks && banks.length > 0 ? (
                                            banks.map((bank: Bank) => (
                                                <SelectItem
                                                    key={bank.id}
                                                    value={bank.id.toString()}
                                                >
                                                    {bank.name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>
                                                No hay bancos registrados
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {localPaymentErrors.transfer_bank_id && (
                                    <p className="text-xs text-destructive">
                                        {localPaymentErrors.transfer_bank_id}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="transfer_authorization_code">
                                    Código de Autorización / Referencia{' '}
                                    <span className="text-destructive">*</span>
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
                                    <span className="text-destructive">*</span>
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

                    {/* Credit Options */}
                    {localPayment.payment_type === 'credit' && (
                        <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                    <Label
                                        htmlFor="sheet-has-initial-payment"
                                        className="cursor-pointer text-xs font-semibold"
                                    >
                                        Con pago inicial
                                    </Label>
                                    <span className="text-[10px] text-muted-foreground">
                                        Active esta opción si el cliente realiza
                                        un abono o pago inicial al momento del
                                        registro.
                                    </span>
                                </div>
                                <Switch
                                    id="sheet-has-initial-payment"
                                    checked={localPayment.has_initial_payment}
                                    onCheckedChange={(checked) => {
                                        setLocalPayment((prev) => {
                                            const next = {
                                                ...prev,
                                                has_initial_payment: checked,
                                                initial_payment_amount: checked
                                                    ? prev.initial_payment_amount ||
                                                      totalAmount.toString()
                                                    : '',
                                                initial_payment_type: checked
                                                    ? prev.initial_payment_type ||
                                                      'cash'
                                                    : 'cash',
                                                cash_value: '',
                                                check_value: '',
                                                card_value_charged: '',
                                                transfer_value: '',
                                            };

                                            if (checked) {
                                                const amt =
                                                    next.initial_payment_amount;

                                                if (
                                                    next.initial_payment_type ===
                                                    'cash'
                                                ) {
                                                    next.cash_value = amt;
                                                } else if (
                                                    next.initial_payment_type ===
                                                    'check'
                                                ) {
                                                    next.check_value = amt;
                                                } else if (
                                                    next.initial_payment_type ===
                                                    'credit card'
                                                ) {
                                                    next.card_value_charged =
                                                        amt;
                                                } else if (
                                                    next.initial_payment_type ===
                                                    'bank transfer'
                                                ) {
                                                    next.transfer_value = amt;
                                                }
                                            }

                                            return next;
                                        });
                                    }}
                                />
                            </div>

                            {localPayment.has_initial_payment && (
                                <div className="mt-2 flex flex-col gap-4 border-t pt-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="sheet_initial_payment_amount">
                                                Monto de Pago Inicial (L.){' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="sheet_initial_payment_amount"
                                                type="number"
                                                step="0.01"
                                                min={
                                                    totalAmount === 0
                                                        ? '0'
                                                        : '0.01'
                                                }
                                                max={totalAmount}
                                                value={
                                                    localPayment.initial_payment_amount
                                                }
                                                onChange={(e) => {
                                                    const val = e.target.value;

                                                    setLocalPayment((prev) => {
                                                        const next = {
                                                            ...prev,
                                                            initial_payment_amount:
                                                                val,
                                                            cash_value: '',
                                                            check_value: '',
                                                            card_value_charged:
                                                                '',
                                                            transfer_value: '',
                                                        };

                                                        if (
                                                            next.initial_payment_type ===
                                                            'cash'
                                                        ) {
                                                            next.cash_value =
                                                                val;
                                                        } else if (
                                                            next.initial_payment_type ===
                                                            'check'
                                                        ) {
                                                            next.check_value =
                                                                val;
                                                        } else if (
                                                            next.initial_payment_type ===
                                                            'credit card'
                                                        ) {
                                                            next.card_value_charged =
                                                                val;
                                                        } else if (
                                                            next.initial_payment_type ===
                                                            'bank transfer'
                                                        ) {
                                                            next.transfer_value =
                                                                val;
                                                        }

                                                        return next;
                                                    });
                                                }}
                                                placeholder="0.00"
                                                required
                                            />
                                            {localPaymentErrors.initial_payment_amount && (
                                                <p className="text-xs text-destructive">
                                                    {
                                                        localPaymentErrors.initial_payment_amount
                                                    }
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="sheet_initial_payment_type">
                                                Tipo de Pago Inicial{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Select
                                                value={
                                                    localPayment.initial_payment_type
                                                }
                                                onValueChange={(value) => {
                                                    setLocalPayment((prev) => {
                                                        const next = {
                                                            ...prev,
                                                            initial_payment_type:
                                                                value,
                                                            cash_value: '',
                                                            check_value: '',
                                                            card_value_charged:
                                                                '',
                                                            transfer_value: '',
                                                        };

                                                        const amt =
                                                            next.initial_payment_amount ||
                                                            '0';

                                                        if (value === 'cash') {
                                                            next.cash_value =
                                                                amt;
                                                        } else if (
                                                            value === 'check'
                                                        ) {
                                                            next.check_value =
                                                                amt;
                                                        } else if (
                                                            value ===
                                                            'credit card'
                                                        ) {
                                                            next.card_value_charged =
                                                                amt;
                                                        } else if (
                                                            value ===
                                                            'bank transfer'
                                                        ) {
                                                            next.transfer_value =
                                                                amt;
                                                        }

                                                        return next;
                                                    });
                                                }}
                                            >
                                                <SelectTrigger
                                                    id="sheet_initial_payment_type"
                                                    className="w-full"
                                                >
                                                    <SelectValue placeholder="Seleccione el tipo de pago" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[110]">
                                                    <SelectItem value="cash">
                                                        <div className="flex items-center gap-2">
                                                            <Wallet className="h-4 w-4 text-primary" />
                                                            <span>
                                                                Efectivo
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="credit card">
                                                        <div className="flex items-center gap-2">
                                                            <CreditCard className="h-4 w-4 text-primary" />
                                                            <span>
                                                                Tarjeta de
                                                                Crédito
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="bank transfer">
                                                        <div className="flex items-center gap-2">
                                                            <Landmark className="h-4 w-4 text-primary" />
                                                            <span>
                                                                Transferencia
                                                                Bancaria
                                                            </span>
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
                                            {localPaymentErrors.initial_payment_type && (
                                                <p className="text-xs text-destructive">
                                                    {
                                                        localPaymentErrors.initial_payment_type
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Date field for credit initial payment */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="sheet_payment_method_date">
                                            Fecha del Abono Inicial{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="sheet_payment_method_date"
                                            type="date"
                                            value={
                                                localPayment.payment_method_date
                                            }
                                            onChange={(e) =>
                                                setLocalPayment((prev) => ({
                                                    ...prev,
                                                    payment_method_date:
                                                        e.target.value,
                                                }))
                                            }
                                            required
                                        />
                                    </div>

                                    {/* Nested conditional fields for initial payment details if it matches check, card, or transfer */}
                                    {localPayment.initial_payment_type ===
                                        'check' && (
                                        <div className="grid gap-1 rounded border bg-muted/50 p-3">
                                            <Label
                                                htmlFor="sheet_check_number"
                                                className="text-xs"
                                            >
                                                Número de Cheque{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="sheet_check_number"
                                                type="text"
                                                value={
                                                    localPayment.check_number
                                                }
                                                onChange={(e) =>
                                                    setLocalPayment((prev) => ({
                                                        ...prev,
                                                        check_number:
                                                            e.target.value,
                                                    }))
                                                }
                                                placeholder="Ej. 123456"
                                                className="h-8 text-xs"
                                                required
                                            />
                                            {localPaymentErrors.check_number && (
                                                <p className="text-[10px] text-destructive">
                                                    {
                                                        localPaymentErrors.check_number
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {localPayment.initial_payment_type ===
                                        'credit card' && (
                                        <div className="grid gap-3 rounded border bg-muted/50 p-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="grid gap-1">
                                                    <Label
                                                        htmlFor="sheet_card_last_4"
                                                        className="text-xs"
                                                    >
                                                        Últimos 4 Dígitos
                                                    </Label>
                                                    <Input
                                                        id="sheet_card_last_4"
                                                        type="text"
                                                        maxLength={4}
                                                        value={
                                                            localPayment.card_last_4
                                                        }
                                                        onChange={(e) =>
                                                            setLocalPayment(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    card_last_4:
                                                                        e.target.value.replace(
                                                                            /\D/g,
                                                                            '',
                                                                        ),
                                                                }),
                                                            )
                                                        }
                                                        placeholder="1234"
                                                        className="h-8 text-xs"
                                                    />
                                                    {localPaymentErrors.card_last_4 && (
                                                        <p className="text-[10px] text-destructive">
                                                            {
                                                                localPaymentErrors.card_last_4
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label
                                                        htmlFor="sheet_card_expiration"
                                                        className="text-xs"
                                                    >
                                                        Vencimiento
                                                    </Label>
                                                    <Input
                                                        id="sheet_card_expiration"
                                                        type="text"
                                                        placeholder="MM/AA"
                                                        maxLength={7}
                                                        value={
                                                            localPayment.card_expiration
                                                        }
                                                        onChange={(e) =>
                                                            setLocalPayment(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    card_expiration:
                                                                        formatCardExpiration(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        ),
                                                                }),
                                                            )
                                                        }
                                                        className="h-8 text-xs"
                                                    />
                                                    {localPaymentErrors.card_expiration && (
                                                        <p className="text-[10px] text-destructive">
                                                            {
                                                                localPaymentErrors.card_expiration
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid gap-1">
                                                <Label
                                                    htmlFor="sheet_card_authorization_code"
                                                    className="text-xs"
                                                >
                                                    Código de Autorización
                                                </Label>
                                                <Input
                                                    id="sheet_card_authorization_code"
                                                    type="text"
                                                    value={
                                                        localPayment.card_authorization_code
                                                    }
                                                    onChange={(e) =>
                                                        setLocalPayment(
                                                            (prev) => ({
                                                                ...prev,
                                                                card_authorization_code:
                                                                    e.target
                                                                        .value,
                                                            }),
                                                        )
                                                    }
                                                    placeholder="Ej. 987654"
                                                    className="h-8 text-xs"
                                                />
                                                {localPaymentErrors.card_authorization_code && (
                                                    <p className="text-[10px] text-destructive">
                                                        {
                                                            localPaymentErrors.card_authorization_code
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {localPayment.initial_payment_type ===
                                        'bank transfer' && (
                                        <div className="grid gap-3 rounded border bg-muted/50 p-3">
                                            <div className="grid gap-1">
                                                <Label
                                                    htmlFor="sheet_transfer_bank_id"
                                                    className="text-xs"
                                                >
                                                    Banco{' '}
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
                                                </Label>
                                                <Select
                                                    value={
                                                        localPayment.transfer_bank_id
                                                    }
                                                    onValueChange={(val) =>
                                                        setLocalPayment(
                                                            (prev) => ({
                                                                ...prev,
                                                                transfer_bank_id:
                                                                    val,
                                                            }),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="sheet_transfer_bank_id"
                                                        className="h-8 w-full text-xs"
                                                    >
                                                        <SelectValue placeholder="Seleccione un Banco" />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[110]">
                                                        {banks &&
                                                        banks.length > 0 ? (
                                                            banks.map(
                                                                (
                                                                    bank: Bank,
                                                                ) => (
                                                                    <SelectItem
                                                                        key={
                                                                            bank.id
                                                                        }
                                                                        value={bank.id.toString()}
                                                                        className="text-xs"
                                                                    >
                                                                        {
                                                                            bank.name
                                                                        }
                                                                    </SelectItem>
                                                                ),
                                                            )
                                                        ) : (
                                                            <SelectItem
                                                                value="none"
                                                                disabled
                                                            >
                                                                No hay bancos
                                                                registrados
                                                            </SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                {localPaymentErrors.transfer_bank_id && (
                                                    <p className="text-[10px] text-destructive">
                                                        {
                                                            localPaymentErrors.transfer_bank_id
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                            <div className="grid gap-1">
                                                <Label
                                                    htmlFor="sheet_transfer_authorization_code"
                                                    className="text-xs"
                                                >
                                                    Código de Autorización /
                                                    Referencia{' '}
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
                                                </Label>
                                                <Input
                                                    id="sheet_transfer_authorization_code"
                                                    type="text"
                                                    value={
                                                        localPayment.transfer_authorization_code
                                                    }
                                                    onChange={(e) =>
                                                        setLocalPayment(
                                                            (prev) => ({
                                                                ...prev,
                                                                transfer_authorization_code:
                                                                    e.target
                                                                        .value,
                                                            }),
                                                        )
                                                    }
                                                    placeholder="Ej. 11223344"
                                                    className="h-8 text-xs"
                                                    required
                                                />
                                                {localPaymentErrors.transfer_authorization_code && (
                                                    <p className="text-[10px] text-destructive">
                                                        {
                                                            localPaymentErrors.transfer_authorization_code
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-4 flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 font-semibold"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            className="flex-1 font-semibold"
                        >
                            Guardar Detalles
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

interface PaymentResumeProps {
    data: Partial<PaymentData>;
    banks: Bank[];
    className?: string;
}

export function PaymentResume({ data, banks, className }: PaymentResumeProps) {
    if (!data.payment_type) {
        return null;
    }

    const label = getPaymentTypeLabel(data.payment_type);

    return (
        <div
            className={cn(
                'mt-2 flex flex-col gap-1.5 border-t pt-3 text-xs text-muted-foreground',
                className,
            )}
        >
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
                            <span>Número de Cheque:</span>
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
                    {data.card_expiration && (
                        <div className="flex justify-between">
                            <span>Expira:</span>
                            <span className="font-mono font-semibold text-foreground">
                                {data.card_expiration}
                            </span>
                        </div>
                    )}
                    {data.card_authorization_code && (
                        <div className="flex justify-between">
                            <span>Código Autorización:</span>
                            <span className="font-mono font-semibold text-foreground">
                                {data.card_authorization_code}
                            </span>
                        </div>
                    )}
                    {data.card_value_charged && (
                        <div className="flex justify-between">
                            <span>Monto Cobrado:</span>
                            <span className="font-mono font-semibold text-foreground">
                                L.{' '}
                                {parseFloat(data.card_value_charged).toFixed(2)}
                            </span>
                        </div>
                    )}
                </>
            )}
            {data.payment_type === 'bank transfer' && (
                <>
                    {data.transfer_bank_id && (
                        <div className="flex justify-between">
                            <span>Banco:</span>
                            <span className="font-semibold text-foreground">
                                {banks.find(
                                    (b) =>
                                        b.id.toString() ===
                                        data.transfer_bank_id?.toString(),
                                )?.name || 'Banco Seleccionado'}
                            </span>
                        </div>
                    )}
                    {data.transfer_authorization_code && (
                        <div className="flex justify-between">
                            <span>Código Transferencia:</span>
                            <span className="font-mono font-semibold text-foreground">
                                {data.transfer_authorization_code}
                            </span>
                        </div>
                    )}
                    {data.transfer_value && (
                        <div className="flex justify-between">
                            <span>Monto Transferido:</span>
                            <span className="font-mono font-semibold text-foreground">
                                L. {parseFloat(data.transfer_value).toFixed(2)}
                            </span>
                        </div>
                    )}
                </>
            )}
            {data.payment_type === 'credit' && (
                <>
                    <div className="flex justify-between">
                        <span>Pago Inicial:</span>
                        <span className="font-semibold text-foreground">
                            {data.has_initial_payment ? 'Sí' : 'No'}
                        </span>
                    </div>
                    {data.has_initial_payment && (
                        <>
                            <div className="flex justify-between">
                                <span>Monto Inicial:</span>
                                <span className="font-mono font-semibold text-foreground">
                                    L.{' '}
                                    {parseFloat(
                                        data.initial_payment_amount || '0',
                                    ).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Forma Pago Inicial:</span>
                                <span className="font-semibold text-foreground capitalize">
                                    {getPaymentTypeLabel(
                                        data.initial_payment_type || 'cash',
                                    )}
                                </span>
                            </div>
                            {data.initial_payment_type === 'check' &&
                                data.check_number && (
                                    <div className="flex justify-between">
                                        <span>Nº Cheque:</span>
                                        <span className="font-mono font-semibold text-foreground">
                                            {data.check_number}
                                        </span>
                                    </div>
                                )}
                            {data.initial_payment_type === 'credit card' && (
                                <>
                                    {data.card_last_4 && (
                                        <div className="flex justify-between">
                                            <span>Tarjeta:</span>
                                            <span className="font-mono font-semibold text-foreground">
                                                **** {data.card_last_4}
                                            </span>
                                        </div>
                                    )}
                                    {data.card_authorization_code && (
                                        <div className="flex justify-between">
                                            <span>Código Aut.:</span>
                                            <span className="font-mono font-semibold text-foreground">
                                                {data.card_authorization_code}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                            {data.initial_payment_type === 'bank transfer' && (
                                <>
                                    {data.transfer_bank_id && (
                                        <div className="flex justify-between">
                                            <span>Banco:</span>
                                            <span className="font-semibold text-foreground">
                                                {banks.find(
                                                    (b) =>
                                                        b.id.toString() ===
                                                        data.transfer_bank_id?.toString(),
                                                )?.name || 'Banco Seleccionado'}
                                            </span>
                                        </div>
                                    )}
                                    {data.transfer_authorization_code && (
                                        <div className="flex justify-between">
                                            <span>Referencia:</span>
                                            <span className="font-mono font-semibold text-foreground">
                                                {
                                                    data.transfer_authorization_code
                                                }
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
