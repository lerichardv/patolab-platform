import { useForm, usePage } from '@inertiajs/react';
import { FileText, Upload, X, Plus, ExternalLink, Info } from 'lucide-react';
import type { FormEventHandler } from 'react';
import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { pay as payRental } from '@/actions/App/Http/Controllers/RentalController';
import AsyncCustomerCombobox from '@/components/async-customer-combobox';
import type { CustomerOption } from '@/components/async-customer-combobox';
import InputError from '@/components/input-error';
import {
    AlertDialog,
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
import { NumberPicker } from '@/components/ui/number-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import CustomerSheet from '../customers/customer-sheet';
import {
    PaymentMethodSheet,
    PaymentResume,
    getPaymentTypeLabel,
} from '../invoices/payment-method-sheet';
import RentalSheet from './rental-sheet';

export interface Bank {
    id: number;
    name: string;
}

export interface Rental {
    id: number;
    name: string;
    description: string;
}

export interface Invoice {
    id: number;
    full_invoice_number?: string | null;
    invoice_number?: number | string | null;
    customer_id?: number;
    customer?: any;
    rental_id?: number | null;
    rental?: { id: number; name: string; description?: string } | null;
    invoice_type?: string | null;
    payment_type?: string;
    credit_payment_id?: number | null;
    creditRelation?: any;
    credit_relation?: any;
    quantity?: number;
    amount?: string | number;
    discount?: string | number;
    subtotal?: string | number;
    exempt_amount?: string | number;
    total?: string | number;
    total_paid?: string | number;
    proof_of_payment?: string | null;
    invoice_file?: string | null;
    invoice_date?: string | null;
    created_at?: string;
    pay_isv?: boolean;
    custom_amount_enabled?: boolean;
    custom_amount?: string | number;
    custom_amount_reason?: string | null;
    age_discount_type?: string | null;
    age_discount_amount?: string | number | null;
    isv_15?: string | number | null;
    payment_method_date?: string | null;
    cash_value?: string | number | null;
    check_number?: string | null;
    check_value?: string | number | null;
    card_last_4?: string | null;
    card_value_charged?: string | number | null;
    card_expiration?: string | null;
    card_authorization_code?: string | null;
    transfer_bank_id?: number | string | null;
    transfer_value?: string | number | null;
    transfer_authorization_code?: string | null;
    description?: string | null;
}

export interface RentalPaymentFormProps {
    rental?: Rental | null;
    invoice?: Invoice | null;
    isEditMode: boolean;
    banks: Bank[];
    rentals: Rental[];
    settings?: Record<string, string>;
    onSuccess?: () => void;
    onClose: () => void;
}

export default function RentalPaymentForm({
    rental,
    invoice,
    isEditMode,
    banks,
    rentals,
    settings = {},
    onSuccess,
    onClose,
}: RentalPaymentFormProps) {
    const { props } = usePage() as any;
    const flash = props.flash || {};

    const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
    const [isNewRentalSheetOpen, setIsNewRentalSheetOpen] = useState(false);
    const [baseAmount, setBaseAmount] = useState(
        isEditMode && invoice ? (invoice.amount || '0.00').toString() : '0.00',
    );

    const [isPaymentMethodSheetOpen, setIsPaymentMethodSheetOpen] =
        useState(false);

    const [selectedCustomer, setSelectedCustomer] =
        useState<CustomerOption | null>(
            isEditMode && invoice?.customer
                ? {
                      id: invoice.customer.id,
                      name: invoice.customer.name,
                      id_number: invoice.customer.id_number,
                      email: invoice.customer.email,
                      age: invoice.customer.age,
                      type: invoice.customer.type,
                      phone: invoice.customer.phone,
                      gender: invoice.customer.gender,
                      address: invoice.customer.address,
                  }
                : null,
        );

    // Initial discount breakdown
    const initialTotalDisc =
        isEditMode && invoice ? parseFloat(String(invoice.discount || '0')) : 0;
    const initialAgeDisc =
        isEditMode && invoice
            ? parseFloat(String(invoice.age_discount_amount || '0'))
            : 0;
    const initialAddDisc = Math.max(0, initialTotalDisc - initialAgeDisc);

    const [additionalDiscount, setAdditionalDiscount] = useState(
        initialAddDisc > 0 ? initialAddDisc.toFixed(2) : '0.00',
    );
    const [additionalDiscountEnabled, setAdditionalDiscountEnabled] = useState(
        initialAddDisc > 0,
    );
    const [showConfirm, setShowConfirm] = useState(false);
    const [regeneratePdf, setRegeneratePdf] = useState(true);

    const { data, setData, post, processing, errors, transform } = useForm({
        rental_id:
            isEditMode && invoice
                ? (invoice.rental_id || invoice.rental?.id || '').toString()
                : rental
                  ? rental.id.toString()
                  : '',
        customer_id:
            isEditMode && invoice ? (invoice.customer_id || '').toString() : '',
        quantity: isEditMode && invoice ? invoice.quantity || 1 : 1,
        amount:
            isEditMode && invoice
                ? (invoice.amount || '0.00').toString()
                : '0.00',
        discount:
            isEditMode && invoice
                ? (invoice.discount || '0.00').toString()
                : '0.00',
        payment_type: isEditMode && invoice ? invoice.payment_type || '' : '',
        pay_isv:
            isEditMode && invoice
                ? invoice.pay_isv !== undefined
                    ? Boolean(invoice.pay_isv)
                    : parseFloat(String(invoice.isv_15 || '0')) > 0
                : true,
        has_initial_payment: Boolean(
            isEditMode &&
            invoice &&
            invoice.payment_type === 'credit' &&
            (invoice.creditRelation || invoice.credit_relation) &&
            parseFloat(
                String(
                    (invoice.creditRelation || invoice.credit_relation)
                        .amount_paid || '0',
                ),
            ) > 0,
        ),
        initial_payment_amount:
            isEditMode &&
            invoice &&
            (invoice.creditRelation || invoice.credit_relation)
                ? String(
                      (invoice.creditRelation || invoice.credit_relation)
                          .amount_paid || '',
                  )
                : '',
        initial_payment_type: 'cash',
        custom_amount_enabled: Boolean(
            isEditMode &&
            invoice &&
            invoice.custom_amount &&
            parseFloat(String(invoice.custom_amount)) > 0,
        ),
        custom_amount:
            isEditMode && invoice && invoice.custom_amount
                ? String(invoice.custom_amount)
                : '0.00',
        custom_amount_reason:
            isEditMode && invoice ? invoice.custom_amount_reason || '' : '',
        age_discount_type:
            isEditMode && invoice ? invoice.age_discount_type || null : null,
        age_discount_amount:
            isEditMode && invoice && invoice.age_discount_amount
                ? String(invoice.age_discount_amount)
                : '0.00',
        payment_method_date:
            isEditMode && invoice
                ? invoice.payment_method_date
                    ? invoice.payment_method_date.split(/[ T]/)[0]
                    : invoice.invoice_date
                      ? invoice.invoice_date.split(/[ T]/)[0]
                      : ''
                : '',
        cash_value:
            isEditMode && invoice && invoice.cash_value
                ? String(invoice.cash_value)
                : '',
        check_number: isEditMode && invoice ? invoice.check_number || '' : '',
        check_value:
            isEditMode && invoice && invoice.check_value
                ? String(invoice.check_value)
                : '',
        card_last_4: isEditMode && invoice ? invoice.card_last_4 || '' : '',
        card_value_charged:
            isEditMode && invoice && invoice.card_value_charged
                ? String(invoice.card_value_charged)
                : '',
        card_expiration:
            isEditMode && invoice ? invoice.card_expiration || '' : '',
        card_authorization_code:
            isEditMode && invoice ? invoice.card_authorization_code || '' : '',
        transfer_bank_id:
            isEditMode && invoice && invoice.transfer_bank_id
                ? String(invoice.transfer_bank_id)
                : '',
        transfer_value:
            isEditMode && invoice && invoice.transfer_value
                ? String(invoice.transfer_value)
                : '',
        transfer_authorization_code:
            isEditMode && invoice
                ? invoice.transfer_authorization_code || ''
                : '',
        proof_of_payment: null as File | null,
        description: isEditMode && invoice ? invoice.description || '' : '',
    });

    useEffect(() => {
        if (flash.new_rental_id) {
            setData('rental_id', flash.new_rental_id.toString());
        }
    }, [flash.new_rental_id, setData]);

    // Age discounts
    const thirdAgePercent = parseFloat(settings?.third_age_discount || '30');
    const fourthAgePercent = parseFloat(settings?.fourth_age_discount || '40');

    const quantityVal = data.quantity ?? 1;

    // Calculate age discount
    const ageDiscountVal = useMemo(() => {
        const base = parseFloat(baseAmount) || 0;

        if (data.age_discount_type === 'third') {
            return ((base * thirdAgePercent) / 100) * quantityVal;
        } else if (data.age_discount_type === 'fourth') {
            return ((base * fourthAgePercent) / 100) * quantityVal;
        }

        return 0;
    }, [
        baseAmount,
        data.age_discount_type,
        thirdAgePercent,
        fourthAgePercent,
        quantityVal,
    ]);

    // Update form age discount amount
    useEffect(() => {
        setData('age_discount_amount', ageDiscountVal.toString());
    }, [ageDiscountVal, setData]);

    // Compute actual discount value
    const finalDiscountVal = useMemo(() => {
        const addDisc = additionalDiscountEnabled
            ? parseFloat(additionalDiscount) || 0
            : 0;

        return ageDiscountVal + addDisc;
    }, [ageDiscountVal, additionalDiscount, additionalDiscountEnabled]);

    useEffect(() => {
        setData('discount', finalDiscountVal.toString());
    }, [finalDiscountVal, setData]);

    // Total calculations
    const customAmountVal = data.custom_amount_enabled
        ? parseFloat(data.custom_amount) || 0
        : 0;

    // Calculate the rental subtotal (base rental price minus final discounts, excluding custom extra charge).
    // This is the taxable portion.
    const rentalSubtotalVal = useMemo(() => {
        const base = parseFloat(baseAmount) || 0;
        const totalBase = base * quantityVal;

        return Math.max(0, totalBase - finalDiscountVal);
    }, [baseAmount, quantityVal, finalDiscountVal]);

    // Calculate 15% ISV on the rental subtotal.
    const isv15Val = useMemo(() => {
        return data.pay_isv ? rentalSubtotalVal * 0.15 : 0;
    }, [rentalSubtotalVal, data.pay_isv]);

    // Subtotal includes the rental subtotal and the custom amount.
    const subtotalVal = useMemo(() => {
        return rentalSubtotalVal + customAmountVal;
    }, [rentalSubtotalVal, customAmountVal]);

    // Total includes the subtotal plus the calculated 15% ISV.
    const totalVal = useMemo(() => {
        return subtotalVal + isv15Val;
    }, [subtotalVal, isv15Val]);

    const totalPaidVal = useMemo(() => {
        if (data.payment_type === 'credit') {
            return data.has_initial_payment
                ? parseFloat(data.initial_payment_amount) || 0
                : 0;
        }

        return totalVal;
    }, [
        data.payment_type,
        data.has_initial_payment,
        data.initial_payment_amount,
        totalVal,
    ]);

    // Setup transform for payload
    useEffect(() => {
        transform((d: any) => {
            const payload: any = {
                ...d,
                amount: (parseFloat(baseAmount) || 0).toFixed(2),
                subtotal: subtotalVal.toFixed(2),
                exempt_amount: (d.pay_isv ? 0 : rentalSubtotalVal).toFixed(2),
                total: totalVal.toFixed(2),
                total_paid: totalPaidVal.toFixed(2),
            };

            if (isEditMode) {
                payload._method = 'PUT';

                if (!(d.proof_of_payment instanceof File)) {
                    delete payload.proof_of_payment;
                }
            }

            return payload;
        });
    }, [
        transform,
        baseAmount,
        subtotalVal,
        rentalSubtotalVal,
        totalVal,
        totalPaidVal,
        isEditMode,
    ]);

    const hasExistingProof = Boolean(invoice?.proof_of_payment);

    // Proof file required validator
    const isProofRequired = useMemo(() => {
        if (isEditMode && hasExistingProof && !data.proof_of_payment) {
            return false;
        }

        if (data.payment_type === 'cash') {
            return false;
        }

        if (data.payment_type === 'credit') {
            if (data.has_initial_payment) {
                return data.initial_payment_type !== 'cash';
            }

            return false;
        }

        return true;
    }, [
        isEditMode,
        hasExistingProof,
        data.proof_of_payment,
        data.payment_type,
        data.has_initial_payment,
        data.initial_payment_type,
    ]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!data.rental_id) {
            toast.error('Debe seleccionar o crear un cobro');

            return;
        }

        if (!data.payment_type) {
            toast.error('Debe seleccionar un método de pago');

            return;
        }

        if (data.payment_type === 'credit' && !data.customer_id) {
            toast.error('Debe seleccionar un cliente para ventas al crédito');

            return;
        }

        if (parseFloat(baseAmount) <= 0) {
            toast.error('El importe base debe ser mayor a cero');

            return;
        }

        if (additionalDiscountEnabled) {
            const addDisc = parseFloat(additionalDiscount) || 0;
            const totalBase =
                (parseFloat(baseAmount) || 0) * (data.quantity ?? 1);

            if (addDisc > totalBase - ageDiscountVal) {
                toast.error(
                    `El descuento adicional no puede superar el subtotal (L. ${(totalBase - ageDiscountVal).toFixed(2)}).`,
                );

                return;
            }
        }

        if (
            isProofRequired &&
            !data.proof_of_payment &&
            (!isEditMode || !hasExistingProof)
        ) {
            toast.error(
                'El comprobante de pago es requerido para este método de pago',
            );

            return;
        }

        if (isEditMode) {
            setShowConfirm(true);
        } else {
            submitCreate();
        }
    };

    const submitCreate = () => {
        post(payRental(parseInt(data.rental_id)).url, {
            onSuccess: () => {
                toast.success('Pago de otro cobro registrado con éxito');
                onClose();
                onSuccess?.();
            },
            onError: (errs) => {
                const firstError = Object.values(errs)[0] as string;
                toast.error(
                    firstError || 'Ocurrió un error al procesar el pago.',
                );
            },
        });
    };

    const submitEdit = (regen: boolean) => {
        if (!invoice) {
            return;
        }

        setShowConfirm(false);

        const targetUrl =
            typeof (window as any).route === 'function'
                ? (window as any).route('invoices.update', invoice.id) +
                  `?regenerate_pdf=${regen}`
                : `/invoices/${invoice.id}?regenerate_pdf=${regen}`;

        post(targetUrl, {
            onSuccess: () => {
                toast.success('Factura actualizada con éxito');
                onClose();
                onSuccess?.();
            },
            onError: (errs) => {
                const firstError = Object.values(errs)[0] as string;
                toast.error(firstError || 'Error al guardar cambios.');
            },
        });
    };

    return (
        <>
            <form onSubmit={submit} className="mt-6 space-y-6 px-5 pb-10">
                {/* SECTION 1: RENTAL & CUSTOMER */}
                <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                    <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Información del Cobro y Cliente
                    </h3>

                    {/* Rental Selection */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="rental_id">
                                Cobro Seleccionado *
                            </Label>
                            <button
                                type="button"
                                onClick={() => setIsNewRentalSheetOpen(true)}
                                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                                <Plus className="h-3 w-3" /> Nuevo
                            </button>
                        </div>
                        <Select
                            value={data.rental_id}
                            onValueChange={(value) =>
                                setData('rental_id', value)
                            }
                        >
                            <SelectTrigger id="rental_id" className="w-full">
                                <SelectValue placeholder="Seleccione un cobro existente" />
                            </SelectTrigger>
                            <SelectContent className="z-[110]">
                                {rentals.map((r) => (
                                    <SelectItem
                                        key={r.id}
                                        value={r.id.toString()}
                                    >
                                        {r.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.rental_id} />
                    </div>

                    {/* Customer selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="customer_id">
                                    Cliente Facturación{' '}
                                    {data.payment_type === 'credit'
                                        ? '*'
                                        : '(Opcional)'}
                                </Label>
                                {selectedCustomer && (
                                    <span
                                        className={cn(
                                            'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                                            selectedCustomer.type === 'empresa'
                                                ? 'border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                                        )}
                                    >
                                        {selectedCustomer.type === 'empresa'
                                            ? 'Empresa'
                                            : 'Individual'}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCustomerSheetOpen(true)}
                                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                                <Plus className="h-3 w-3" /> Nuevo
                            </button>
                        </div>

                        <AsyncCustomerCombobox
                            value={data.customer_id}
                            initialCustomer={selectedCustomer}
                            onChange={(id, cust) => {
                                setData('customer_id', id);
                                setSelectedCustomer(cust ?? null);
                            }}
                            placeholder="Seleccione un cliente"
                            allowClear
                        />

                        {selectedCustomer && (
                            <div className="grid grid-cols-1 gap-4 border-t border-border/50 pt-3 text-xs sm:grid-cols-3">
                                <div className="flex flex-col gap-1 text-left">
                                    <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                        RTN / Identidad
                                    </span>
                                    <span className="font-mono font-medium text-foreground">
                                        {selectedCustomer.id_number || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 text-left">
                                    <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                        Correo Electrónico
                                    </span>
                                    <span className="font-medium break-all text-foreground">
                                        {selectedCustomer.email || 'Sin correo'}
                                    </span>
                                </div>
                                {selectedCustomer.type !== 'empresa' && (
                                    <div className="flex flex-col gap-1 text-left">
                                        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            Edad
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {selectedCustomer.age
                                                ? `${selectedCustomer.age} años`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                        <InputError message={errors.customer_id} />
                    </div>
                </div>

                {/* SECTION 2: BILLING FIELDS */}
                <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                    <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Conceptos e Importes
                    </h3>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="base_amount">
                                Importe / Precio Base (L.) *
                            </Label>
                            <Input
                                id="base_amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={baseAmount}
                                onChange={(e) => setBaseAmount(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="quantity">Cantidad *</Label>
                            <NumberPicker
                                value={data.quantity}
                                onChange={(val) => setData('quantity', val)}
                                min={1}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="discount_read">
                                Descuento Total (L.)
                            </Label>
                            <Input
                                id="discount_read"
                                type="number"
                                value={parseFloat(data.discount).toFixed(2)}
                                readOnly
                                disabled
                                className="bg-muted font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                            />
                        </div>
                    </div>

                    {/* Additional Discount Switch */}
                    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <Label className="cursor-pointer text-xs font-semibold">
                                    Descuento Adicional
                                </Label>
                                <span className="text-[10px] text-muted-foreground">
                                    Aplica un descuento adicional manual
                                </span>
                            </div>
                            <Switch
                                checked={additionalDiscountEnabled}
                                onCheckedChange={(checked) => {
                                    setAdditionalDiscountEnabled(checked);

                                    if (!checked) {
                                        setAdditionalDiscount('0.00');
                                    }
                                }}
                            />
                        </div>
                        {additionalDiscountEnabled && (
                            <div className="grid gap-1.5 border-t pt-2">
                                <Label
                                    htmlFor="additional_discount"
                                    className="text-xs"
                                >
                                    Monto Descuento Adicional (L.) *
                                </Label>
                                <Input
                                    id="additional_discount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={additionalDiscount}
                                    onChange={(e) =>
                                        setAdditionalDiscount(e.target.value)
                                    }
                                    required
                                />
                            </div>
                        )}
                    </div>

                    {/* Custom Extra Charge */}
                    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <Label className="cursor-pointer text-xs font-semibold">
                                    Cobrar cargo adicional personalizado
                                </Label>
                                <span className="text-[10px] text-muted-foreground">
                                    Agregar conceptos extraordinarios
                                </span>
                            </div>
                            <Switch
                                checked={data.custom_amount_enabled}
                                onCheckedChange={(checked) => {
                                    setData((d) => ({
                                        ...d,
                                        custom_amount_enabled: checked,
                                        custom_amount: checked
                                            ? d.custom_amount
                                            : '0.00',
                                        custom_amount_reason: checked
                                            ? d.custom_amount_reason
                                            : '',
                                    }));
                                }}
                            />
                        </div>
                        {data.custom_amount_enabled && (
                            <div className="grid gap-3 border-t pt-2">
                                <div className="grid gap-1.5">
                                    <Label
                                        htmlFor="custom_amount"
                                        className="text-xs"
                                    >
                                        Monto Cargo Adicional (L.) *
                                    </Label>
                                    <Input
                                        id="custom_amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.custom_amount}
                                        onChange={(e) =>
                                            setData(
                                                'custom_amount',
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <InputError
                                        message={errors.custom_amount}
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label
                                        htmlFor="custom_amount_reason"
                                        className="text-xs"
                                    >
                                        Concepto / Razón *
                                    </Label>
                                    <Input
                                        id="custom_amount_reason"
                                        value={data.custom_amount_reason}
                                        onChange={(e) =>
                                            setData(
                                                'custom_amount_reason',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ej. Gastos de envío, limpieza especial, etc."
                                        required
                                    />
                                    <InputError
                                        message={errors.custom_amount_reason}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Age discounts */}
                    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
                        <div className="flex flex-col gap-1 border-b pb-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">
                                Descuentos por Edad
                            </Label>
                            <span className="text-[10px] text-muted-foreground">
                                Aplica descuento de tercera ({thirdAgePercent}%)
                                o cuarta ({fourthAgePercent}%) edad
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="age_third" className="text-xs">
                                Tercera Edad
                            </Label>
                            <Switch
                                id="age_third"
                                checked={data.age_discount_type === 'third'}
                                onCheckedChange={(checked) =>
                                    setData(
                                        'age_discount_type',
                                        checked ? 'third' : null,
                                    )
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between border-t pt-2">
                            <Label htmlFor="age_fourth" className="text-xs">
                                Cuarta Edad
                            </Label>
                            <Switch
                                id="age_fourth"
                                checked={data.age_discount_type === 'fourth'}
                                onCheckedChange={(checked) =>
                                    setData(
                                        'age_discount_type',
                                        checked ? 'fourth' : null,
                                    )
                                }
                            />
                        </div>
                    </div>

                    {/* ISV Switch */}
                    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <Label
                                    className="cursor-pointer text-xs font-semibold"
                                    htmlFor="pay_isv"
                                >
                                    Calcular ISV (15%)
                                </Label>
                                <span className="text-[10px] text-muted-foreground">
                                    Activar o desactivar el cálculo de impuesto
                                    sobre ventas
                                </span>
                            </div>
                            <Switch
                                id="pay_isv"
                                checked={data.pay_isv}
                                onCheckedChange={(checked) => {
                                    setData('pay_isv', checked);
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 3: PAYMENT METHOD */}
                <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                    <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Método y Forma de Pago
                    </h3>

                    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold">
                                    Método de pago:
                                </span>
                                <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary capitalize">
                                    {getPaymentTypeLabel(data.payment_type)}
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setIsPaymentMethodSheetOpen(true)
                                }
                                className="h-8 font-semibold"
                            >
                                {data.payment_type
                                    ? 'Cambiar método de Pago'
                                    : 'Seleccionar método de pago'}
                            </Button>
                        </div>

                        {data.payment_type ? (
                            <PaymentResume data={data} banks={banks} />
                        ) : (
                            <div className="mt-2 border-t pt-2.5 text-[11px] text-muted-foreground italic">
                                Por favor, configure los detalles del método de
                                pago.
                            </div>
                        )}
                    </div>

                    {/* Proof of Payment File upload */}
                    {(isProofRequired || (isEditMode && hasExistingProof)) && (
                        <div className="space-y-2">
                            <Label htmlFor="proof_of_payment">
                                Comprobante de Pago (PDF o Imagen){' '}
                                {isProofRequired && !hasExistingProof && (
                                    <span className="text-destructive">*</span>
                                )}
                            </Label>
                            {data.proof_of_payment ? (
                                <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-md bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="max-w-[200px] truncate text-xs font-semibold text-foreground">
                                                {data.proof_of_payment.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {(
                                                    data.proof_of_payment.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(2)}{' '}
                                                MB (Nuevo archivo seleccionado)
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
                            ) : invoice?.proof_of_payment ? (
                                <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-md bg-primary/10 p-2 text-primary">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold text-foreground">
                                                Comprobante actual guardado
                                            </span>
                                            <a
                                                href={`/storage/${invoice.proof_of_payment}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                                            >
                                                Ver comprobante{' '}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>
                                    <div>
                                        <input
                                            type="file"
                                            id="proof_of_payment"
                                            className="hidden"
                                            accept=".pdf,image/*"
                                            onChange={(e) => {
                                                const file =
                                                    e.target.files?.[0] || null;
                                                setData(
                                                    'proof_of_payment',
                                                    file,
                                                );
                                            }}
                                        />
                                        <label
                                            htmlFor="proof_of_payment"
                                            className="cursor-pointer rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground"
                                        >
                                            Reemplazar archivo
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="group relative">
                                    <input
                                        type="file"
                                        id="proof_of_payment"
                                        className="hidden"
                                        accept=".pdf,image/*"
                                        onChange={(e) => {
                                            const file =
                                                e.target.files?.[0] || null;
                                            setData('proof_of_payment', file);
                                        }}
                                    />
                                    <label
                                        htmlFor="proof_of_payment"
                                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:bg-accent/10"
                                    >
                                        <div className="mb-2 rounded-full bg-secondary p-2.5 text-secondary-foreground">
                                            <Upload className="h-4 w-4" />
                                        </div>
                                        <span className="text-xs font-semibold text-foreground">
                                            Subir Comprobante
                                        </span>
                                        <span className="mt-1 text-[10px] text-muted-foreground">
                                            PDF o Imagen hasta 30MB
                                        </span>
                                    </label>
                                </div>
                            )}
                            <InputError message={errors.proof_of_payment} />
                        </div>
                    )}

                    {/* Description / Reason */}
                    <div className="grid gap-2">
                        <Label htmlFor="payment_description">
                            Razón o descripción (opcional)
                        </Label>
                        <Textarea
                            id="payment_description"
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                            placeholder="Ej. Cobro de sala de reuniones, período mensual, etc."
                            rows={3}
                            className="resize-none"
                        />
                        <InputError message={errors.description} />
                    </div>
                </div>

                {/* BILLING RESUME */}
                <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Importe Base:
                        </span>
                        <span className="font-semibold">
                            {quantityVal > 1 ? (
                                <span>
                                    L.{' '}
                                    {(parseFloat(baseAmount) || 0).toFixed(2)} x{' '}
                                    {quantityVal} (L.{' '}
                                    {(
                                        (parseFloat(baseAmount) || 0) *
                                        quantityVal
                                    ).toFixed(2)}
                                    )
                                </span>
                            ) : (
                                <span>
                                    L.{' '}
                                    {(parseFloat(baseAmount) || 0).toFixed(2)}
                                </span>
                            )}
                        </span>
                    </div>
                    {finalDiscountVal > 0 && (
                        <div className="flex justify-between pl-3 text-xs text-emerald-600 dark:text-emerald-400">
                            <span>- Descuento total aplicado:</span>
                            <span>L. {finalDiscountVal.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-t pt-1 text-xs">
                        <span className="text-muted-foreground">
                            {data.pay_isv
                                ? 'Subtotal Gravado (15%):'
                                : 'Subtotal Exento:'}
                        </span>
                        <span>L. {rentalSubtotalVal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                            ISV (15%):
                        </span>
                        <span className="font-semibold">
                            L. {isv15Val.toFixed(2)}
                        </span>
                    </div>
                    {data.custom_amount_enabled && (
                        <div className="flex justify-between pl-3 text-xs text-muted-foreground">
                            <span>
                                +{' '}
                                {data.custom_amount_reason || 'Cargo Adicional'}
                                :
                            </span>
                            <span>L. {customAmountVal.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-t pt-2 text-base font-bold">
                        <span className="text-primary">Total Factura:</span>
                        <span className="text-primary">
                            L. {totalVal.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex justify-end gap-3 border-t pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing
                            ? isEditMode
                                ? 'Guardando...'
                                : 'Registrando...'
                            : isEditMode
                              ? 'Guardar Cambios'
                              : 'Confirmar y Facturar'}
                    </Button>
                </div>
            </form>

            {/* Confirmation AlertDialog with prompt for PDF regeneration */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent
                    className="z-[120] max-w-[550px]"
                    overlayClassName="z-[115]"
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-bold text-foreground">
                            Confirmar Actualización
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground">
                            Esta acción guardará permanentemente los cambios
                            realizados en esta factura.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {(data.payment_type === 'credit' ||
                        invoice?.payment_type === 'credit' ||
                        invoice?.credit_payment_id ||
                        invoice?.creditRelation ||
                        invoice?.credit_relation) && (
                        <div className="my-2.5 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-50/5 p-3 text-xs text-amber-800 dark:border-amber-950/40 dark:bg-amber-950/15 dark:text-amber-300">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>
                                <strong>Nota sobre Crédito:</strong> Esta
                                factura está asociada a un crédito. Al guardar,
                                los montos y el saldo pendiente del crédito se
                                actualizarán automáticamente para reflejar estos
                                cambios.
                            </span>
                        </div>
                    )}

                    {/* PDF Regeneration Toggle Option */}
                    <div className="my-4 flex items-center justify-between rounded-lg border bg-muted/30 p-3.5">
                        <div className="flex flex-col gap-0.5">
                            <label
                                htmlFor="rental-dialog-regenerate-pdf"
                                className="cursor-pointer text-xs font-bold text-foreground"
                            >
                                Regenerar PDF del Comprobante
                            </label>
                            <span className="text-[10px] text-muted-foreground">
                                Actualiza el archivo PDF para reflejar los
                                nuevos montos y cambios.
                            </span>
                        </div>
                        <Switch
                            id="rental-dialog-regenerate-pdf"
                            checked={regeneratePdf}
                            onCheckedChange={setRegeneratePdf}
                        />
                    </div>

                    <AlertDialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <AlertDialogCancel
                            onClick={() => setShowConfirm(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <Button
                            type="button"
                            onClick={() => {
                                submitEdit(regeneratePdf);
                            }}
                            className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
                        >
                            Guardar Cambios
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Inline Customer creation sub-sheet */}
            <CustomerSheet
                open={isCustomerSheetOpen}
                onOpenChange={setIsCustomerSheetOpen}
                className="z-[110]"
                overlayClassName="z-[105]"
                onSuccess={(newCustomer) => {
                    if (newCustomer) {
                        setData('customer_id', String(newCustomer.id));
                        setSelectedCustomer({
                            id: newCustomer.id,
                            name: newCustomer.name,
                            id_number: newCustomer.id_number,
                            email: newCustomer.email,
                            age: newCustomer.age,
                            type: newCustomer.type,
                            phone: newCustomer.phone,
                            gender: newCustomer.gender,
                            address: newCustomer.address,
                        });
                    }
                }}
            />

            {/* Inline Rental creation sub-sheet */}
            <RentalSheet
                open={isNewRentalSheetOpen}
                onOpenChange={setIsNewRentalSheetOpen}
                className="z-[110]"
                overlayClassName="z-[105]"
            />

            {/* Sub-sheet UI for configuring payment method details */}
            <PaymentMethodSheet
                open={isPaymentMethodSheetOpen}
                onOpenChange={setIsPaymentMethodSheetOpen}
                banks={banks}
                totalAmount={totalVal}
                paymentData={data}
                onSave={(paymentData) => {
                    setData((d) => ({
                        ...d,
                        ...paymentData,
                    }));
                    setIsPaymentMethodSheetOpen(false);
                }}
                className="z-[110]"
                overlayClassName="z-[105]"
            />
        </>
    );
}
