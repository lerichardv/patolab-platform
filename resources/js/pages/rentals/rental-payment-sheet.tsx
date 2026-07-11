import { useForm, usePage } from '@inertiajs/react';
import {
    FileText,
    Upload,
    X,
    Plus,
    ChevronsUpDown,
    Check,
    Calendar,
    Wallet,
    CreditCard,
    Landmark,
    Receipt,
} from 'lucide-react';
import type { FormEventHandler } from 'react';
import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { pay as payRental } from '@/actions/App/Http/Controllers/RentalController';
import AsyncCustomerCombobox from '@/components/async-customer-combobox';
import type { CustomerOption } from '@/components/async-customer-combobox';
import HeadingSheet from '@/components/heading-sheet';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberPicker } from '@/components/ui/number-picker';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import CustomerSheet from '../customers/customer-sheet';
import RentalSheet from './rental-sheet';

interface Customer {
    id: number;
    name: string;
    id_number: string;
    type?: 'cliente' | 'empresa';
    email?: string | null;
    phone?: string | null;
    age?: number | string | null;
}

interface Bank {
    id: number;
    name: string;
}

interface Rental {
    id: number;
    name: string;
    description: string;
}

interface Props {
    rental: Rental | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    banks: Bank[];
    rentals: Rental[];
}

function FormCombobox({
    options,
    value,
    onChange,
    placeholder,
    emptyMessage = 'No se encontraron resultados.',
    disabled = false,
}: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    emptyMessage?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild className="w-full">
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between text-left font-normal"
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="z-[110] w-[--radix-popover-trigger-width] p-0"
                align="start"
            >
                <Command>
                    <CommandInput placeholder="Buscar..." />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4 shrink-0',
                                            value === option.value
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate">
                                        {option.label}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

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
        case 'credit':
            return 'Al Crédito';
        default:
            return type || 'Sin seleccionar';
    }
};

const formatCardExpiration = (value: string) => {
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

export default function RentalPaymentSheet({
    rental,
    open,
    onOpenChange,
    banks,
    rentals,
}: Props) {
    const { props } = usePage() as any;
    const settings = props.settings || {};
    const flash = props.flash || {};

    const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
    const [isNewRentalSheetOpen, setIsNewRentalSheetOpen] = useState(false);
    const [baseAmount, setBaseAmount] = useState('0.00');

    const [isPaymentMethodSheetOpen, setIsPaymentMethodSheetOpen] =
        useState(false);
    const [localPayment, setLocalPayment] = useState({
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

    const { data, setData, post, processing, errors, reset } = useForm({
        rental_id: rental ? rental.id.toString() : '',
        customer_id: '',
        quantity: 1,
        amount: '0.00',
        discount: '0.00',
        payment_type: '',
        has_initial_payment: false,
        initial_payment_amount: '',
        initial_payment_type: 'cash',
        custom_amount_enabled: false,
        custom_amount: '0.00',
        custom_amount_reason: '',
        age_discount_type: null as string | null,
        age_discount_amount: '0.00',
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
        proof_of_payment: null as File | null,
        description: '',
    });

    useEffect(() => {
        if (flash.new_rental_id) {
            setData('rental_id', flash.new_rental_id.toString());
        }
    }, [flash.new_rental_id, setData]);

    // Reset form on open/change
    useEffect(() => {
        if (open) {
            reset();

            if (rental) {
                setData('rental_id', rental.id.toString());
            } else {
                setData('rental_id', '');
            }

            setBaseAmount('0.00');
        }
    }, [open, rental]);

    useEffect(() => {
        if (isPaymentMethodSheetOpen) {
            setLocalPayment({
                payment_type: data.payment_type || '',
                payment_method_date: data.payment_method_date || '',
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
                has_initial_payment: data.has_initial_payment || false,
                initial_payment_amount: data.initial_payment_amount || '',
                initial_payment_type: data.initial_payment_type || 'cash',
            });
            setLocalPaymentErrors({});
        }
    }, [isPaymentMethodSheetOpen]);

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

    // Update total amount: base amount * quantity + custom amount
    const totalBaseAmount = useMemo(() => {
        const base = parseFloat(baseAmount) || 0;
        const custom = data.custom_amount_enabled
            ? parseFloat(data.custom_amount) || 0
            : 0;

        return base * quantityVal + custom;
    }, [
        baseAmount,
        quantityVal,
        data.custom_amount_enabled,
        data.custom_amount,
    ]);

    useEffect(() => {
        setData('amount', totalBaseAmount.toString());
    }, [totalBaseAmount, setData]);

    // Total calculations
    const customAmountVal = data.custom_amount_enabled
        ? parseFloat(data.custom_amount) || 0
        : 0;
    const [additionalDiscount, setAdditionalDiscount] = useState('0.00');
    const [additionalDiscountEnabled, setAdditionalDiscountEnabled] =
        useState(false);

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

    // Calculate the rental subtotal (base rental price minus final discounts, excluding custom extra charge).
    // This is the taxable portion.
    const rentalSubtotalVal = useMemo(() => {
        const base = parseFloat(baseAmount) || 0;
        const totalBase = base * quantityVal;

        return Math.max(0, totalBase - finalDiscountVal);
    }, [baseAmount, quantityVal, finalDiscountVal]);

    // Calculate 15% ISV on the rental subtotal.
    // Business Rule: This 15% ISV is stored in the database's `isv_15` column.
    const isv15Val = useMemo(() => {
        return rentalSubtotalVal * 0.15;
    }, [rentalSubtotalVal]);

    // Subtotal includes the rental subtotal and the custom amount.
    const subtotalVal = useMemo(() => {
        return rentalSubtotalVal + customAmountVal;
    }, [rentalSubtotalVal, customAmountVal]);

    // Total includes the subtotal plus the calculated 15% ISV.
    const totalVal = useMemo(() => {
        return subtotalVal + isv15Val;
    }, [subtotalVal, isv15Val]);

    // Proof file required validator
    const isProofRequired = useMemo(() => {
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
        data.payment_type,
        data.has_initial_payment,
        data.initial_payment_type,
    ]);

    const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

    const handleSavePaymentDetails = () => {
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
            if (
                !localPayment.cash_value ||
                parseFloat(localPayment.cash_value) <= 0
            ) {
                errorsMap.cash_value =
                    'El valor recibido es requerido y debe ser mayor que 0.';
            }
        }

        if (localPayment.payment_type === 'check') {
            if (!localPayment.check_number) {
                errorsMap.check_number = 'El número de cheque es requerido.';
            }

            if (
                !localPayment.check_value ||
                parseFloat(localPayment.check_value) <= 0
            ) {
                errorsMap.check_value =
                    'El valor del cheque es requerido y debe ser mayor que 0.';
            }
        }

        if (localPayment.payment_type === 'credit card') {
            if (
                !localPayment.card_last_4 ||
                localPayment.card_last_4.length !== 4
            ) {
                errorsMap.card_last_4 = 'Se requieren los últimos 4 dígitos.';
            }

            if (!localPayment.card_expiration) {
                errorsMap.card_expiration =
                    'El vencimiento de la tarjeta es requerido.';
            } else if (
                !/^(0[1-9]|1[0-2])\/\d{2}(\d{2})?$/.test(
                    localPayment.card_expiration,
                )
            ) {
                errorsMap.card_expiration =
                    'El vencimiento debe tener un formato como 12/26 o 12/2026.';
            }

            if (!localPayment.card_authorization_code) {
                errorsMap.card_authorization_code =
                    'El código de autorización es requerido.';
            }

            if (
                !localPayment.card_value_charged ||
                parseFloat(localPayment.card_value_charged) <= 0
            ) {
                errorsMap.card_value_charged =
                    'El valor cobrado es requerido y debe ser mayor que 0.';
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

            if (
                !localPayment.transfer_value ||
                parseFloat(localPayment.transfer_value) <= 0
            ) {
                errorsMap.transfer_value =
                    'El valor transferido es requerido y debe ser mayor que 0.';
            }
        }

        if (
            localPayment.payment_type === 'credit' &&
            localPayment.has_initial_payment
        ) {
            if (
                !localPayment.initial_payment_amount ||
                parseFloat(localPayment.initial_payment_amount) <= 0
            ) {
                errorsMap.initial_payment_amount =
                    'El monto de pago inicial es requerido y debe ser mayor que 0.';
            } else if (
                parseFloat(localPayment.initial_payment_amount) > totalVal
            ) {
                errorsMap.initial_payment_amount = `El pago inicial no puede superar el total (L. ${totalVal.toFixed(2)}).`;
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
                    !localPayment.card_last_4 ||
                    localPayment.card_last_4.length !== 4
                ) {
                    errorsMap.card_last_4 =
                        'Se requieren los últimos 4 dígitos.';
                }

                if (!localPayment.card_expiration) {
                    errorsMap.card_expiration =
                        'El vencimiento de la tarjeta es requerido.';
                } else if (
                    !/^(0[1-9]|1[0-2])\/\d{2}(\d{2})?$/.test(
                        localPayment.card_expiration,
                    )
                ) {
                    errorsMap.card_expiration =
                        'El vencimiento debe tener un formato como 12/26 o 12/2026.';
                }

                if (!localPayment.card_authorization_code) {
                    errorsMap.card_authorization_code =
                        'El código de autorización es requerido.';
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

        // Apply to data
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
            has_initial_payment: localPayment.has_initial_payment,
            initial_payment_amount: localPayment.initial_payment_amount,
            initial_payment_type: localPayment.initial_payment_type,
        }));

        setIsPaymentMethodSheetOpen(false);
    };

    const renderPaymentResume = () => {
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
                        {data.transfer_bank_id && (
                            <div className="flex justify-between">
                                <span>Banco:</span>
                                <span className="font-semibold text-foreground">
                                    {banks.find(
                                        (b) =>
                                            b.id.toString() ===
                                            data.transfer_bank_id.toString(),
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
                                    L.{' '}
                                    {parseFloat(data.transfer_value).toFixed(2)}
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
                                            data.initial_payment_amount,
                                        ).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Forma Pago Inicial:</span>
                                    <span className="font-semibold text-foreground capitalize">
                                        {getPaymentTypeLabel(
                                            data.initial_payment_type,
                                        )}
                                    </span>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        );
    };

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

        if (isProofRequired && !data.proof_of_payment) {
            toast.error(
                'El comprobante de pago es requerido para este método de pago',
            );

            return;
        }

        post(payRental(parseInt(data.rental_id)).url, {
            onSuccess: () => {
                toast.success('Pago de otro cobro registrado con éxito');
                onOpenChange(false);
            },
            onError: (errs) => {
                const firstError = Object.values(errs)[0];
                toast.error(
                    firstError || 'Ocurrió un error al procesar el pago.',
                );
            },
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="z-[100] w-full overflow-y-auto sm:max-w-[750px]">
                <HeadingSheet
                    title="Registrar Pago de Otro Cobro"
                    description="Configure el cobro, el cliente, e ingrese los datos de facturación y forma de pago."
                />

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
                                    onClick={() =>
                                        setIsNewRentalSheetOpen(true)
                                    }
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
                                <SelectTrigger
                                    id="rental_id"
                                    className="w-full"
                                >
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
                                                selectedCustomer.type ===
                                                    'empresa'
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
                                onChange={(id, customer) => {
                                    setData('customer_id', id);
                                    setSelectedCustomer(customer ?? null);
                                }}
                                placeholder="Seleccione un cliente"
                            />

                            {selectedCustomer && (
                                <div className="grid grid-cols-1 gap-4 border-t border-border/50 pt-3 text-xs sm:grid-cols-3">
                                    <div className="flex flex-col gap-1 text-left">
                                        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            RTN / Identidad
                                        </span>
                                        <span className="font-mono font-medium text-foreground">
                                            {selectedCustomer.id_number ||
                                                'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 text-left">
                                        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            Correo Electrónico
                                        </span>
                                        <span className="font-medium break-all text-foreground">
                                            {selectedCustomer.email ||
                                                'Sin correo'}
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
                                    onChange={(e) =>
                                        setBaseAmount(e.target.value)
                                    }
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
                                            setAdditionalDiscount(
                                                e.target.value,
                                            )
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
                                            message={
                                                errors.custom_amount_reason
                                            }
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
                                    Aplica descuento de tercera (
                                    {thirdAgePercent}%) o cuarta (
                                    {fourthAgePercent}%) edad
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
                                    checked={
                                        data.age_discount_type === 'fourth'
                                    }
                                    onCheckedChange={(checked) =>
                                        setData(
                                            'age_discount_type',
                                            checked ? 'fourth' : null,
                                        )
                                    }
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
                                renderPaymentResume()
                            ) : (
                                <div className="mt-2 border-t pt-2.5 text-[11px] text-muted-foreground italic">
                                    Por favor, configure los detalles del método
                                    de pago.
                                </div>
                            )}
                        </div>

                        {/* Proof of Payment File upload */}
                        {isProofRequired && (
                            <div className="space-y-2">
                                <Label htmlFor="proof_of_payment">
                                    Comprobante de Pago (PDF o Imagen){' '}
                                    <span className="text-destructive">*</span>
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
                                                        data.proof_of_payment
                                                            .size /
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
                                                setData(
                                                    'proof_of_payment',
                                                    null,
                                                )
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
                                        {(parseFloat(baseAmount) || 0).toFixed(
                                            2,
                                        )}{' '}
                                        x {quantityVal} (L.{' '}
                                        {(
                                            (parseFloat(baseAmount) || 0) *
                                            quantityVal
                                        ).toFixed(2)}
                                        )
                                    </span>
                                ) : (
                                    <span>
                                        L.{' '}
                                        {(parseFloat(baseAmount) || 0).toFixed(
                                            2,
                                        )}
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
                                Subtotal Gravado (15%):
                            </span>
                            <span>L. {rentalSubtotalVal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            {/* Note: This 15% ISV is calculated only on the rental base amount and is stored in the isv_15 column */}
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
                                    {data.custom_amount_reason ||
                                        'Cargo Adicional'}
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
                            onClick={() => onOpenChange(false)}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing
                                ? 'Registrando...'
                                : 'Confirmar y Facturar'}
                        </Button>
                    </div>
                </form>
            </SheetContent>

            {/* Inline Customer creation sub-sheet */}
            <CustomerSheet
                open={isCustomerSheetOpen}
                onOpenChange={setIsCustomerSheetOpen}
                className="z-[110]"
                overlayClassName="z-[105]"
            />

            {/* Inline Rental creation sub-sheet */}
            <RentalSheet
                open={isNewRentalSheetOpen}
                onOpenChange={setIsNewRentalSheetOpen}
                className="z-[110]"
                overlayClassName="z-[105]"
            />

            {/* Sub-sheet UI for configuring payment method details */}
            <Sheet
                open={isPaymentMethodSheetOpen}
                onOpenChange={setIsPaymentMethodSheetOpen}
            >
                <SheetContent
                    className="z-[110] w-full overflow-y-auto sm:max-w-[650px]"
                    overlayClassName="z-[105]"
                >
                    <HeadingSheet
                        title="Método de Pago"
                        description="Configure el método de pago e ingrese la información fiscal requerida para facturar."
                    />
                    <div className="mt-6 flex flex-col gap-6 px-5 pb-10">
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
                                        const updated = {
                                            ...prev,
                                            payment_type: value,
                                        };

                                        if (value === 'credit') {
                                            updated.has_initial_payment = false;
                                        }

                                        return updated;
                                    });
                                }}
                            >
                                <SelectTrigger
                                    id="sheet_payment_type"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Seleccione el tipo de pago" />
                                </SelectTrigger>
                                <SelectContent className="z-[120]">
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
                                    <SelectItem value="credit">
                                        Al Crédito
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
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
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
                                        required
                                    />
                                    {localPaymentErrors.payment_method_date && (
                                        <p className="text-xs text-destructive">
                                            {
                                                localPaymentErrors.payment_method_date
                                            }
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
                                        <SelectContent className="z-[120]">
                                            {banks && banks.length > 0 ? (
                                                banks.map((bank: any) => (
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
                                            Active esta opción si el cliente
                                            realiza un abono o pago inicial al
                                            momento del registro.
                                        </span>
                                    </div>
                                    <Switch
                                        id="sheet-has-initial-payment"
                                        checked={
                                            localPayment.has_initial_payment
                                        }
                                        onCheckedChange={(checked) => {
                                            setLocalPayment((prev) => ({
                                                ...prev,
                                                has_initial_payment: checked,
                                                initial_payment_amount: checked
                                                    ? prev.initial_payment_amount
                                                    : '',
                                                initial_payment_type: checked
                                                    ? prev.initial_payment_type
                                                    : 'cash',
                                            }));
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
                                                    min="0.01"
                                                    max={totalVal}
                                                    value={
                                                        localPayment.initial_payment_amount
                                                    }
                                                    onChange={(e) =>
                                                        setLocalPayment(
                                                            (prev) => ({
                                                                ...prev,
                                                                initial_payment_amount:
                                                                    e.target
                                                                        .value,
                                                            }),
                                                        )
                                                    }
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
                                                    onValueChange={(value) =>
                                                        setLocalPayment(
                                                            (prev) => ({
                                                                ...prev,
                                                                initial_payment_type:
                                                                    value,
                                                            }),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="sheet_initial_payment_type"
                                                        className="w-full"
                                                    >
                                                        <SelectValue placeholder="Seleccione el tipo de pago" />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[120]">
                                                        <SelectItem value="cash">
                                                            Efectivo
                                                        </SelectItem>
                                                        <SelectItem value="credit card">
                                                            Tarjeta de Crédito
                                                        </SelectItem>
                                                        <SelectItem value="bank transfer">
                                                            Transferencia
                                                            Bancaria
                                                        </SelectItem>
                                                        <SelectItem value="check">
                                                            Cheque
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
                                            {localPaymentErrors.payment_method_date && (
                                                <p className="text-xs text-destructive">
                                                    {
                                                        localPaymentErrors.payment_method_date
                                                    }
                                                </p>
                                            )}
                                        </div>

                                        {/* Nested conditional fields for initial payment details if it matches check, card, or transfer */}
                                        {localPayment.initial_payment_type ===
                                            'check' && (
                                            <div className="grid gap-4 rounded border bg-muted/50 p-3">
                                                <div className="grid gap-1">
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
                                                            setLocalPayment(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    check_number:
                                                                        e.target
                                                                            .value,
                                                                }),
                                                            )
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
                                                            Últimos 4 Dígitos{' '}
                                                            <span className="text-destructive">
                                                                *
                                                            </span>
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
                                                            required
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
                                                            Vencimiento{' '}
                                                            <span className="text-destructive">
                                                                *
                                                            </span>
                                                        </Label>
                                                        <Input
                                                            id="sheet_card_expiration"
                                                            type="text"
                                                            placeholder="MM/AA o MM/AAAA"
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
                                                            required
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
                                                        Código de Autorización{' '}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
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
                                                        required
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
                                                        <SelectContent className="z-[120]">
                                                            {banks &&
                                                            banks.length > 0 ? (
                                                                banks.map(
                                                                    (
                                                                        bank: any,
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
                                                                    No hay
                                                                    bancos
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
                                onClick={() =>
                                    setIsPaymentMethodSheetOpen(false)
                                }
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
        </Sheet>
    );
}
