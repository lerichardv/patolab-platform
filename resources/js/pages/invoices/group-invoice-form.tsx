import { useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    BadgePercent,
    ChevronDown,
    Edit2,
    Info,
    Receipt,
    Tag,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import AsyncCustomerCombobox from '@/components/async-customer-combobox';
import type { CustomerOption } from '@/components/async-customer-combobox';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import {
    calculateConsolidatedTotals,
    calculateInvoiceItem,
} from '@/services/invoice-calculation';

import {
    PaymentMethodSheet,
    PaymentResume,
    getPaymentTypeLabel,
} from './payment-method-sheet';

interface Props {
    invoice: any;
    banks?: any[];
    specimenTypes?: any[];
    examinations?: any[];
    settings?: Record<string, string>;
    onSuccess: () => void;
    setIsDirty?: (dirty: boolean) => void;
}

export default function GroupInvoiceForm({
    invoice,
    banks = [],
    settings: propSettings,
    onSuccess,
    setIsDirty,
}: Props) {
    const { props: pageProps } = usePage<any>();
    const settings = propSettings || pageProps.settings || {};

    const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [regeneratePdf, setRegeneratePdf] = useState(true);

    const [selectedCustomerData, setSelectedCustomerData] =
        useState<CustomerOption | null>(
            invoice?.customer
                ? {
                      id: invoice.customer.id,
                      name: invoice.customer.name,
                      id_number: invoice.customer.id_number,
                      phone: invoice.customer.phone,
                      email: invoice.customer.email,
                      gender: invoice.customer.gender,
                      type: invoice.customer.type,
                      age: invoice.customer.age,
                  }
                : null,
        );

    const {
        data,
        setData,
        put,
        processing,
        errors,
        setError,
        clearErrors,
        isDirty,
    } = useForm({
        customer_id: invoice?.customer_id ? invoice.customer_id.toString() : '',
        quantity: parseInt(invoice?.quantity || 1),
        amount: invoice?.amount ? invoice.amount.toString() : '0',
        discount: invoice?.discount ? invoice.discount.toString() : '0',
        subtotal: invoice?.subtotal ? invoice.subtotal.toString() : '0',
        exempt_amount: invoice?.exempt_amount
            ? invoice.exempt_amount.toString()
            : '0',
        total: invoice?.total ? invoice.total.toString() : '0',
        custom_amount_enabled: parseFloat(invoice?.custom_amount || 0) > 0,
        custom_amount: invoice?.custom_amount
            ? invoice.custom_amount.toString()
            : '0',
        custom_amount_reason: invoice?.custom_amount_reason || '',
        additional_discount_enabled:
            parseFloat(invoice?.additional_discount || 0) > 0,
        additional_discount: invoice?.additional_discount
            ? invoice.additional_discount.toString()
            : '0',
        age_discount_type: invoice?.age_discount_type || null,
        age_discount_amount: invoice?.age_discount_amount
            ? invoice.age_discount_amount.toString()
            : '0',
        payment_type: invoice?.payment_type || 'cash',
        total_paid: invoice?.total_paid ? invoice.total_paid.toString() : '0',
        group_specimens: [] as any[],
        proof_of_payment: null as File | null,
        has_initial_payment: false,
        initial_payment_amount: '',
        initial_payment_type: 'cash',
        payment_method_date:
            invoice?.payment_method_date ||
            new Date().toISOString().split('T')[0],
        cash_value: invoice?.cash_value?.toString() || '',
        check_number: invoice?.check_number || '',
        check_value: invoice?.check_value?.toString() || '',
        card_last_4: invoice?.card_last_4 || '',
        card_value_charged: invoice?.card_value_charged?.toString() || '',
        card_expiration: invoice?.card_expiration || '',
        card_authorization_code: invoice?.card_authorization_code || '',
        transfer_bank_id: invoice?.transfer_bank_id?.toString() || '',
        transfer_value: invoice?.transfer_value?.toString() || '',
        transfer_authorization_code: invoice?.transfer_authorization_code || '',
        regenerate_pdf: true,
    });

    useEffect(() => {
        if (setIsDirty) {
            setIsDirty(isDirty);
        }
    }, [isDirty, setIsDirty]);

    // Hydrate group_specimens on mount or when invoice changes
    useEffect(() => {
        if (invoice) {
            const items =
                invoice.group_specimens ||
                invoice.groupSpecimens ||
                invoice.invoice_specimens ||
                invoice.invoiceSpecimens ||
                [];

            const hydrated = items.map((gs: any, idx: number) => {
                const spec = gs.specimen || gs;
                const exam = gs.examination || spec.examination || {};
                const prices = gs.available_prices || exam.prices || [];

                const rawSelected = gs.selected_price
                    ? gs.selected_price.toString()
                    : '';
                const amount = parseFloat(gs.amount || 0);
                const customPriceVal = parseFloat(
                    gs.custom_specimen_price || 0,
                );

                let matched = prices.find(
                    (p: any) =>
                        Math.abs(
                            parseFloat(p.amount) - parseFloat(rawSelected),
                        ) < 0.01,
                );

                if (!matched && rawSelected !== 'custom' && amount > 0) {
                    matched = prices.find(
                        (p: any) =>
                            Math.abs(parseFloat(p.amount) - amount) < 0.01,
                    );
                }

                let selPrice = '';
                let custom_specimen_price = customPriceVal.toString();

                if (matched) {
                    selPrice = matched.amount.toString();
                } else if (rawSelected === 'custom') {
                    selPrice = 'custom';
                    custom_specimen_price =
                        customPriceVal > 0
                            ? customPriceVal.toString()
                            : amount > 0
                              ? amount.toString()
                              : '0';
                } else if (prices.length > 0) {
                    selPrice = prices[0].amount.toString();
                } else {
                    selPrice = 'custom';
                    custom_specimen_price =
                        amount > 0 ? amount.toString() : '0';
                }

                return {
                    id: gs.id || idx,
                    specimen_id: gs.specimen_id || spec.id,
                    examination_id:
                        gs.examination_id ||
                        exam.id ||
                        spec.specimen_type_examination,
                    selected_price: selPrice,
                    custom_specimen_price:
                        gs.custom_specimen_price?.toString() || '0',
                    quantity: parseInt(gs.quantity || spec.quantity || 1),
                    additional_discount_enabled:
                        parseFloat(gs.additional_discount || 0) > 0,
                    additional_discount:
                        gs.additional_discount?.toString() || '0',
                    age_discount_type: gs.age_discount_type || null,
                    type_name:
                        spec.type?.name ||
                        spec.specimen_type_name ||
                        gs.type_name ||
                        'Muestra',
                    examination_name:
                        exam.name ||
                        spec.examination_name ||
                        gs.examination_name ||
                        'Análisis',
                    patient_name:
                        spec.customer_relation?.name ||
                        spec.customerRelation?.name ||
                        (typeof spec.customer === 'object' &&
                            spec.customer?.name) ||
                        spec.customer_name ||
                        spec.patient_name ||
                        gs.specimen?.customer_relation?.name ||
                        gs.specimen?.customerRelation?.name ||
                        gs.patient_name ||
                        invoice.customer?.name ||
                        'Sin nombre',
                    sequence_code: spec.sequence_code || gs.sequence_code || '',
                    available_prices: prices,
                    max_price: parseFloat(gs.max_price || 0),
                    insumos: spec.insumos || gs.insumos || [],
                };
            });

            setData('group_specimens', hydrated);
        }
    }, [invoice]);

    const thirdAgePercent = parseFloat(settings?.third_age_discount || '30');
    const fourthAgePercent = parseFloat(settings?.fourth_age_discount || '40');

    // Derived values using InvoiceCalculationService algorithm
    const calculatedLineItems = useMemo(() => {
        if (!data.group_specimens || data.group_specimens.length === 0) {
            return [];
        }

        return data.group_specimens.map((gs: any) => {
            const prices = gs.available_prices || gs.examination?.prices || [];

            const itemCalc = calculateInvoiceItem(
                {
                    examination_id: gs.examination_id,
                    selected_price: gs.selected_price,
                    custom_specimen_price: gs.custom_specimen_price,
                    quantity: gs.quantity,
                    age_discount_type: gs.age_discount_type,
                    additional_discount_enabled: gs.additional_discount_enabled,
                    additional_discount: gs.additional_discount,
                    available_prices: prices,
                    max_price: gs.max_price,
                },
                gs.examination,
                {
                    third_age_discount: thirdAgePercent,
                    fourth_age_discount: fourthAgePercent,
                },
            );

            return {
                ...gs,
                ...itemCalc,
            };
        });
    }, [data.group_specimens, thirdAgePercent, fourthAgePercent]);

    const consolidatedTotals = useMemo(() => {
        const extra = data.custom_amount_enabled
            ? parseFloat(data.custom_amount) || 0
            : 0;

        return calculateConsolidatedTotals(calculatedLineItems, 0, extra);
    }, [calculatedLineItems, data.custom_amount_enabled, data.custom_amount]);

    const totalVal = consolidatedTotals.total;
    const totalDiscountVal = consolidatedTotals.discount;

    // Group line items by specimen for rendering parity with specimen-group-sheet.tsx step 2
    const groupedBySpecimen = useMemo(() => {
        const groups: Map<
            number | string,
            {
                specimen_id: number | string;
                type_name: string;
                patient_name: string;
                sequence_code: string;
                insumos: any[];
                lineItems: any[];
                specimenSubtotal: number;
                specimenDiscount: number;
            }
        > = new Map();

        calculatedLineItems.forEach((itemCalc: any) => {
            const specKey = itemCalc.specimen_id || itemCalc.id;

            if (!groups.has(specKey)) {
                groups.set(specKey, {
                    specimen_id: specKey,
                    type_name: itemCalc.type_name || 'Muestra',
                    patient_name: itemCalc.patient_name || 'Sin nombre',
                    sequence_code: itemCalc.sequence_code || '',
                    insumos: itemCalc.insumos || [],
                    lineItems: [],
                    specimenSubtotal: 0,
                    specimenDiscount: 0,
                });
            }

            const specGroup = groups.get(specKey)!;
            specGroup.lineItems.push(itemCalc);
            specGroup.specimenSubtotal += itemCalc.lineSubtotal || 0;
            specGroup.specimenDiscount += itemCalc.totalLineDiscount || 0;
        });

        return Array.from(groups.values());
    }, [calculatedLineItems]);

    // Sync calculated totals to form state
    useEffect(() => {
        const amtStr = consolidatedTotals.amount.toFixed(2);
        const discStr = consolidatedTotals.discount.toFixed(2);
        const subStr = consolidatedTotals.subtotal.toFixed(2);
        const totStr = consolidatedTotals.total.toFixed(2);

        if (
            data.amount !== amtStr ||
            data.discount !== discStr ||
            data.subtotal !== subStr ||
            data.total !== totStr ||
            data.quantity !== (consolidatedTotals.quantity || 1)
        ) {
            setData((d: any) => ({
                ...d,
                quantity: consolidatedTotals.quantity || 1,
                amount: amtStr,
                discount: discStr,
                subtotal: subStr,
                total: totStr,
                exempt_amount: totStr,
            }));
        }
    }, [
        consolidatedTotals,
        data.amount,
        data.discount,
        data.subtotal,
        data.total,
        data.quantity,
    ]);

    // Form handlers for group specimens
    const updateGroupSpecimen = (id: any, updates: Record<string, any>) => {
        setData((d: any) => ({
            ...d,
            group_specimens: d.group_specimens.map((item: any) =>
                item.id === id ? { ...item, ...updates } : item,
            ),
        }));
    };

    const handleUpdatePrice = (id: any, val: string) => {
        updateGroupSpecimen(id, {
            selected_price: val,
            custom_specimen_price: val === 'custom' ? '0' : '',
        });
    };

    const handleUpdateCustomPrice = (id: any, val: string) => {
        updateGroupSpecimen(id, { custom_specimen_price: val });
    };

    const handleUpdateQuantity = (id: any, qty: number) => {
        updateGroupSpecimen(id, { quantity: Math.max(1, qty) });
    };

    const handleToggleAdditionalDiscount = (id: any, enabled: boolean) => {
        updateGroupSpecimen(id, {
            additional_discount_enabled: enabled,
            additional_discount: enabled ? '0' : '0',
        });
    };

    const handleUpdateAdditionalDiscount = (id: any, val: string) => {
        updateGroupSpecimen(id, { additional_discount: val });
    };

    const handleToggleAgeDiscount = (id: any, type: string) => {
        setData((d: any) => ({
            ...d,
            group_specimens: d.group_specimens.map((item: any) => {
                if (item.id === id) {
                    const nextType =
                        item.age_discount_type === type ? null : type;

                    return {
                        ...item,
                        age_discount_type: nextType,
                    };
                }

                return item;
            }),
        }));
    };

    const validateForm = () => {
        clearErrors();
        const localErrors: Record<string, string> = {};

        if (!data.customer_id) {
            localErrors.customer_id = 'El cliente / paciente es requerido.';
        }

        if (data.custom_amount_enabled) {
            if (!data.custom_amount || parseFloat(data.custom_amount) < 0) {
                localErrors.custom_amount =
                    'El importe personalizado debe ser mayor o igual a 0.';
            }

            if (
                !data.custom_amount_reason ||
                !data.custom_amount_reason.trim()
            ) {
                localErrors.custom_amount_reason =
                    'La razón del importe adicional es requerida.';
            }
        }

        if (Object.keys(localErrors).length > 0) {
            Object.entries(localErrors).forEach(([k, v]) =>
                setError(k as any, v),
            );
            toast.error('Por favor, corrija los errores en el formulario.');

            return false;
        }

        return true;
    };

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setShowConfirm(true);
    };

    const submitForm = (regenPdf: boolean) => {
        setData('regenerate_pdf', regenPdf);
        put(`/invoices/${invoice.id}`, {
            onSuccess: () => {
                toast.success('Factura grupal actualizada correctamente.');
                onSuccess();
            },
            onError: (err: any) => {
                if (err && Object.keys(err).length > 0) {
                    const firstError = Object.values(err)[0] as string;
                    toast.error(firstError);
                } else {
                    toast.error('Error al guardar los cambios de la factura.');
                }
            },
        });
    };

    return (
        <form onSubmit={handlePreSubmit} className="mb-5 space-y-6 px-5 py-2">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* Left Column: Form Inputs */}
                <div className="flex flex-col gap-6 lg:col-span-8">
                    {/* Cliente */}
                    <div className="grid gap-2">
                        <Label htmlFor="customer_id">
                            Cliente / Paciente{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <AsyncCustomerCombobox
                            placeholder="Seleccione un Cliente"
                            value={data.customer_id}
                            initialCustomer={selectedCustomerData}
                            onChange={(val, customer) => {
                                setData('customer_id', val);
                                setSelectedCustomerData(customer ?? null);
                            }}
                        />
                        {errors.customer_id && (
                            <p className="text-xs text-destructive">
                                {errors.customer_id}
                            </p>
                        )}
                    </div>

                    {/* Group Specimens Pricing & Supplies List grouped per specimen and per examination */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Configuración de Precios por Muestra
                        </h3>
                        {groupedBySpecimen.map(
                            (specGroup: any, specIdx: number) => {
                                return (
                                    <div
                                        key={specGroup.specimen_id || specIdx}
                                        className="space-y-3 rounded-xl border bg-muted/20 p-4"
                                    >
                                        {/* Specimen Header */}
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <div>
                                                <h5 className="text-sm font-bold text-foreground">
                                                    Muestra #{specIdx + 1} -{' '}
                                                    {specGroup.type_name}
                                                </h5>
                                                <span className="text-xs text-muted-foreground">
                                                    Paciente:{' '}
                                                    <strong className="text-foreground">
                                                        {specGroup.patient_name}
                                                    </strong>
                                                    {specGroup.sequence_code && (
                                                        <>
                                                            {' '}
                                                            &nbsp;|&nbsp;
                                                            Muestra:{' '}
                                                            <span className="font-mono text-[10px] font-bold text-primary">
                                                                {
                                                                    specGroup.sequence_code
                                                                }
                                                            </span>
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs font-semibold text-primary"
                                            >
                                                Subtotal Muestra: L.{' '}
                                                {specGroup.specimenSubtotal.toFixed(
                                                    2,
                                                )}
                                            </Badge>
                                        </div>

                                        {/* List of Examinations for this Specimen */}
                                        <div className="flex flex-col gap-3">
                                            {specGroup.lineItems.map(
                                                (
                                                    examCalc: any,
                                                    examIdx: number,
                                                ) => {
                                                    const prices =
                                                        examCalc.available_prices ||
                                                        [];
                                                    const qty =
                                                        examCalc.quantity || 1;
                                                    const examName =
                                                        examCalc.examination_name ||
                                                        `Análisis #${examIdx + 1}`;

                                                    return (
                                                        <Card
                                                            key={
                                                                examCalc.id ||
                                                                examIdx
                                                            }
                                                            className="overflow-hidden border border-border/80 pt-6 pb-2 shadow-sm"
                                                        >
                                                            <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Tipo de
                                                                        muestra:{' '}
                                                                        <strong className="text-foreground">
                                                                            {
                                                                                specGroup.type_name
                                                                            }
                                                                        </strong>
                                                                    </div>
                                                                    <div className="text-sm font-bold text-foreground">
                                                                        {
                                                                            examName
                                                                        }
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="border-emerald-500/30 bg-emerald-500/10 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                                                                    >
                                                                        Descuento:
                                                                        L.{' '}
                                                                        {examCalc.totalLineDiscount.toFixed(
                                                                            2,
                                                                        )}
                                                                    </Badge>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="font-mono text-xs font-semibold text-primary"
                                                                    >
                                                                        Subtotal:
                                                                        L.{' '}
                                                                        {examCalc.lineSubtotal.toFixed(
                                                                            2,
                                                                        )}
                                                                    </Badge>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent className="space-y-4 p-4">
                                                                <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                                                                    {/* Price Selector */}
                                                                    <div className="grid gap-2">
                                                                        <Label className="text-xs font-semibold">
                                                                            Importe
                                                                            /
                                                                            Precio
                                                                            Base
                                                                            (L.)
                                                                            *
                                                                        </Label>
                                                                        <Select
                                                                            value={
                                                                                examCalc.selected_price
                                                                            }
                                                                            onValueChange={(
                                                                                val,
                                                                            ) =>
                                                                                handleUpdatePrice(
                                                                                    examCalc.id,
                                                                                    val,
                                                                                )
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="h-9 w-full">
                                                                                <SelectValue placeholder="Seleccione un precio" />
                                                                            </SelectTrigger>
                                                                            <SelectContent className="z-[110]">
                                                                                {prices.length >
                                                                                0 ? (
                                                                                    <>
                                                                                        {prices.map(
                                                                                            (
                                                                                                p: any,
                                                                                            ) => (
                                                                                                <SelectItem
                                                                                                    key={
                                                                                                        p.id
                                                                                                    }
                                                                                                    value={p.amount.toString()}
                                                                                                >
                                                                                                    L.{' '}
                                                                                                    {parseFloat(
                                                                                                        p.amount,
                                                                                                    ).toFixed(
                                                                                                        2,
                                                                                                    )}
                                                                                                </SelectItem>
                                                                                            ),
                                                                                        )}
                                                                                        <SelectItem value="custom">
                                                                                            Precio
                                                                                            Personalizado
                                                                                        </SelectItem>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <SelectItem
                                                                                            value="0"
                                                                                            disabled
                                                                                        >
                                                                                            No
                                                                                            hay
                                                                                            precios
                                                                                            configurados
                                                                                        </SelectItem>
                                                                                        <SelectItem value="custom">
                                                                                            Precio
                                                                                            Personalizado
                                                                                        </SelectItem>
                                                                                    </>
                                                                                )}
                                                                            </SelectContent>
                                                                        </Select>

                                                                        {examCalc.selected_price ===
                                                                            'custom' && (
                                                                            <div className="relative mt-1">
                                                                                <span className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-xs text-muted-foreground select-none">
                                                                                    L.
                                                                                </span>
                                                                                <Input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    min="0"
                                                                                    value={
                                                                                        examCalc.custom_specimen_price ||
                                                                                        ''
                                                                                    }
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) =>
                                                                                        handleUpdateCustomPrice(
                                                                                            examCalc.id,
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                    placeholder="0.00"
                                                                                    className="h-8 pl-7 font-mono text-xs"
                                                                                    required
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Quantity Picker */}
                                                                    <div className="flex flex-col items-start gap-2">
                                                                        <Label className="text-xs font-semibold">
                                                                            Cantidad
                                                                            *
                                                                        </Label>
                                                                        <NumberPicker
                                                                            value={
                                                                                qty
                                                                            }
                                                                            onChange={(
                                                                                val,
                                                                            ) =>
                                                                                handleUpdateQuantity(
                                                                                    examCalc.id,
                                                                                    val,
                                                                                )
                                                                            }
                                                                            min={
                                                                                1
                                                                            }
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Collapsible Discounts Section */}
                                                                <Collapsible
                                                                    defaultOpen={
                                                                        examCalc.totalLineDiscount >
                                                                            0 ||
                                                                        examCalc.additional_discount_enabled ||
                                                                        !!examCalc.age_discount_type
                                                                    }
                                                                    className="rounded-lg border bg-muted/20 p-3"
                                                                >
                                                                    <CollapsibleTrigger
                                                                        asChild
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            className="group flex w-full cursor-pointer items-center justify-between text-xs font-semibold text-foreground transition-colors hover:text-primary"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <Tag className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                                                                                <span>
                                                                                    Opciones
                                                                                    de
                                                                                    Descuento
                                                                                </span>
                                                                                {examCalc.totalLineDiscount >
                                                                                    0 && (
                                                                                    <Badge
                                                                                        variant="secondary"
                                                                                        className="h-5 px-1.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                                                                                    >
                                                                                        -L.{' '}
                                                                                        {examCalc.totalLineDiscount.toFixed(
                                                                                            2,
                                                                                        )}
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                                                        </button>
                                                                    </CollapsibleTrigger>

                                                                    <CollapsibleContent className="space-y-3 pt-3">
                                                                        {/* Descuento Adicional Muestra */}
                                                                        <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <Label className="cursor-pointer text-xs font-semibold">
                                                                                        Descuento
                                                                                        Adicional
                                                                                        Muestra
                                                                                    </Label>
                                                                                    <span className="text-[10px] text-muted-foreground">
                                                                                        Descuento
                                                                                        extra
                                                                                        personalizado
                                                                                        a
                                                                                        este
                                                                                        análisis.
                                                                                    </span>
                                                                                </div>
                                                                                <Switch
                                                                                    checked={
                                                                                        !!examCalc.additional_discount_enabled
                                                                                    }
                                                                                    onCheckedChange={(
                                                                                        checked,
                                                                                    ) =>
                                                                                        handleToggleAdditionalDiscount(
                                                                                            examCalc.id,
                                                                                            checked,
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </div>
                                                                            {!!examCalc.additional_discount_enabled && (
                                                                                <div className="border-t border-border/50 pt-2">
                                                                                    <Input
                                                                                        type="number"
                                                                                        step="0.01"
                                                                                        min="0"
                                                                                        placeholder="0.00"
                                                                                        value={
                                                                                            examCalc.additional_discount ||
                                                                                            ''
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            handleUpdateAdditionalDiscount(
                                                                                                examCalc.id,
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                        className="h-8 font-mono text-xs"
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Descuentos por Edad Switches */}
                                                                        <div className="grid grid-cols-1 gap-3 border-t pt-3 md:grid-cols-2">
                                                                            <div className="flex items-center justify-between rounded-lg border bg-card p-2.5">
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <Label className="text-xs font-semibold">
                                                                                        Tercera
                                                                                        Edad
                                                                                        (
                                                                                        {
                                                                                            thirdAgePercent
                                                                                        }
                                                                                        %)
                                                                                    </Label>
                                                                                    <span className="text-[10px] text-muted-foreground">
                                                                                        Aplica
                                                                                        descuento
                                                                                        al
                                                                                        precio
                                                                                        base
                                                                                    </span>
                                                                                </div>
                                                                                <Switch
                                                                                    checked={
                                                                                        examCalc.age_discount_type ===
                                                                                        'third'
                                                                                    }
                                                                                    onCheckedChange={() =>
                                                                                        handleToggleAgeDiscount(
                                                                                            examCalc.id,
                                                                                            'third',
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </div>

                                                                            <div className="flex items-center justify-between rounded-lg border bg-card p-2.5">
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <Label className="text-xs font-semibold">
                                                                                        Cuarta
                                                                                        Edad
                                                                                        (
                                                                                        {
                                                                                            fourthAgePercent
                                                                                        }
                                                                                        %)
                                                                                    </Label>
                                                                                    <span className="text-[10px] text-muted-foreground">
                                                                                        Aplica
                                                                                        descuento
                                                                                        al
                                                                                        precio
                                                                                        base
                                                                                    </span>
                                                                                </div>
                                                                                <Switch
                                                                                    checked={
                                                                                        examCalc.age_discount_type ===
                                                                                        'fourth'
                                                                                    }
                                                                                    onCheckedChange={() =>
                                                                                        handleToggleAgeDiscount(
                                                                                            examCalc.id,
                                                                                            'fourth',
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </CollapsibleContent>
                                                                </Collapsible>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                },
                                            )}
                                        </div>

                                        {/* Insumos / Reactivos list attached to this specimen */}
                                        {specGroup.insumos &&
                                            specGroup.insumos.length > 0 && (
                                                <div className="space-y-2 border-t pt-3">
                                                    <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                        Insumos / Reactivos
                                                    </Label>
                                                    <div className="divide-y divide-border/60 overflow-hidden rounded-lg border bg-card/50">
                                                        {specGroup.insumos.map(
                                                            (ins: any) => (
                                                                <div
                                                                    key={ins.id}
                                                                    className="flex items-center justify-between p-2.5 text-xs transition-colors hover:bg-muted/10"
                                                                >
                                                                    <div className="flex max-w-[70%] flex-col gap-0.5">
                                                                        <span className="truncate font-medium text-foreground">
                                                                            {
                                                                                ins.name
                                                                            }
                                                                        </span>
                                                                        <span className="font-mono text-[10px] text-muted-foreground">
                                                                            {
                                                                                ins.code
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex shrink-0 flex-col gap-0.5 text-right">
                                                                        <span className="font-semibold text-foreground">
                                                                            {
                                                                                ins.quantity
                                                                            }{' '}
                                                                            unid.
                                                                        </span>
                                                                        <span className="font-mono text-[10px] text-muted-foreground">
                                                                            L.{' '}
                                                                            {parseFloat(
                                                                                ins.price ||
                                                                                    0,
                                                                            ).toFixed(
                                                                                2,
                                                                            )}{' '}
                                                                            c/u
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                );
                            },
                        )}
                    </div>

                    {/* Cobrar otro importe personalizado */}
                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <Label
                                    htmlFor="custom-amount-toggle"
                                    className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold"
                                >
                                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                                    Cobrar otro importe personalizado
                                </Label>
                                <span className="text-[10px] text-muted-foreground">
                                    Añade un cobro o recargo adicional a la
                                    factura.
                                </span>
                            </div>
                            <Switch
                                id="custom-amount-toggle"
                                checked={data.custom_amount_enabled}
                                onCheckedChange={(checked) => {
                                    setData((d) => ({
                                        ...d,
                                        custom_amount_enabled: checked,
                                        custom_amount: checked
                                            ? d.custom_amount || '0'
                                            : '0',
                                        custom_amount_reason: checked
                                            ? d.custom_amount_reason
                                            : '',
                                    }));
                                }}
                            />
                        </div>

                        {data.custom_amount_enabled && (
                            <div className="grid grid-cols-1 gap-4 border-t border-border/50 pt-3 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label
                                        htmlFor="custom_amount"
                                        className="text-xs font-semibold"
                                    >
                                        Monto del Importe (L.){' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-xs text-muted-foreground select-none">
                                            L.
                                        </span>
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
                                            className="pl-7 font-mono text-xs"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    {errors.custom_amount && (
                                        <span className="text-[10px] text-destructive">
                                            {errors.custom_amount}
                                        </span>
                                    )}
                                </div>

                                <div className="grid gap-1.5">
                                    <Label
                                        htmlFor="custom_amount_reason"
                                        className="text-xs font-semibold"
                                    >
                                        Razón / Concepto{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="custom_amount_reason"
                                        type="text"
                                        value={data.custom_amount_reason}
                                        onChange={(e) =>
                                            setData(
                                                'custom_amount_reason',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ej. Servicio expreso, urgente..."
                                        className="text-xs"
                                        required
                                    />
                                    {errors.custom_amount_reason && (
                                        <span className="text-[10px] text-destructive">
                                            {errors.custom_amount_reason}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Método de Pago Trigger and Resume */}
                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                        <div className="flex flex-col gap-2">
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
                                    onClick={() => setIsPaymentSheetOpen(true)}
                                    className="h-8 font-semibold"
                                >
                                    Seleccionar o Editar Método de Pago
                                </Button>
                            </div>

                            <PaymentResume
                                data={data}
                                banks={banks}
                                className="mt-2"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Totals & Summary Sidebar */}
                <div className="flex flex-col gap-6 lg:col-span-4">
                    <div className="sticky top-4 flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
                        <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Resumen de Factura Grupal
                        </h4>

                        <div className="mt-2 flex flex-col gap-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Precio Regular Muestras:
                                </span>
                                <span className="font-semibold text-foreground">
                                    L.{' '}
                                    {(
                                        consolidatedTotals.amount -
                                        (data.custom_amount_enabled
                                            ? parseFloat(data.custom_amount) ||
                                              0
                                            : 0)
                                    ).toFixed(2)}
                                </span>
                            </div>

                            {data.custom_amount_enabled && (
                                <div className="flex flex-col gap-0.5 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Importe Personalizado:
                                        </span>
                                        <span className="font-semibold text-foreground text-primary">
                                            L.{' '}
                                            {(
                                                parseFloat(
                                                    data.custom_amount,
                                                ) || 0
                                            ).toFixed(2)}
                                        </span>
                                    </div>
                                    {data.custom_amount_reason && (
                                        <span className="truncate text-[10px] text-muted-foreground italic">
                                            Razón: {data.custom_amount_reason}
                                        </span>
                                    )}
                                </div>
                            )}

                            {totalDiscountVal > 0 ? (
                                <div className="flex flex-col gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                                        Descuentos Aplicados
                                    </span>
                                    {calculatedLineItems.some(
                                        (i: any) => i.priceDiscount > 0,
                                    ) && (
                                        <div className="flex justify-between text-xs">
                                            <span>
                                                Tarifa / Categoría Muestra:
                                            </span>
                                            <span className="font-semibold">
                                                - L.{' '}
                                                {calculatedLineItems
                                                    .reduce(
                                                        (sum: number, i: any) =>
                                                            sum +
                                                            (i.priceDiscount ||
                                                                0),
                                                        0,
                                                    )
                                                    .toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    {calculatedLineItems.some(
                                        (i: any) => i.ageDiscountAmount > 0,
                                    ) && (
                                        <div className="flex justify-between text-xs">
                                            <span>Descuento por Edad:</span>
                                            <span className="font-semibold">
                                                - L.{' '}
                                                {calculatedLineItems
                                                    .reduce(
                                                        (sum: number, i: any) =>
                                                            sum +
                                                            (i.ageDiscountAmount ||
                                                                0),
                                                        0,
                                                    )
                                                    .toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    {calculatedLineItems.some(
                                        (i: any) => i.addDiscountAmount > 0,
                                    ) && (
                                        <div className="flex justify-between text-xs">
                                            <span>Descuento Adicional:</span>
                                            <span className="font-semibold">
                                                - L.{' '}
                                                {calculatedLineItems
                                                    .reduce(
                                                        (sum: number, i: any) =>
                                                            sum +
                                                            (i.addDiscountAmount ||
                                                                0),
                                                        0,
                                                    )
                                                    .toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    <Separator className="my-1 bg-emerald-500/20" />
                                    <div className="flex justify-between text-xs font-bold">
                                        <span>Descuento Total:</span>
                                        <span>
                                            - L. {totalDiscountVal.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Descuentos:</span>
                                    <span>L. 0.00</span>
                                </div>
                            )}

                            <Separator />

                            <div className="flex justify-between text-sm font-medium">
                                <span>Subtotal Neto:</span>
                                <span className="font-mono">
                                    L. {consolidatedTotals.subtotal.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between text-base font-bold">
                                <span>Total Factura:</span>
                                <span className="font-mono text-lg text-primary">
                                    L. {totalVal.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Monto ya abonado:</span>
                                <span className="font-mono font-semibold text-foreground">
                                    L.{' '}
                                    {parseFloat(data.total_paid || 0).toFixed(
                                        2,
                                    )}
                                </span>
                            </div>

                            {/* Guardar Cambios inline button in sidebar */}
                            <div className="mt-4 pt-2">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full font-bold"
                                >
                                    {processing && (
                                        <Spinner className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Guardar Cambios Factura Grupal
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide-out payment selector Sheet */}
            <PaymentMethodSheet
                open={isPaymentSheetOpen}
                onOpenChange={setIsPaymentSheetOpen}
                banks={banks}
                totalAmount={totalVal}
                paymentData={data}
                onSave={(paymentData) => {
                    setData((d) => ({
                        ...d,
                        ...paymentData,
                    }));
                    setIsPaymentSheetOpen(false);
                }}
                className="z-[100]"
            />

            {/* Confirmation AlertDialog with prompt for PDF regeneration */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="max-w-[550px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-bold text-foreground">
                            Confirmar Actualización de Factura Grupal
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground">
                            Esta acción guardará permanentemente los cambios
                            realizados en esta factura grupal.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {data.payment_type === 'credit' && (
                        <div className="my-2.5 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:border-amber-950/40 dark:bg-amber-950/15 dark:text-amber-300">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>
                                <strong>Nota sobre Crédito:</strong> Esta
                                factura está asociada a un crédito. Al guardar,
                                los montos y el saldo pendiente del crédito se
                                actualizarán automáticamente.
                            </span>
                        </div>
                    )}

                    {/* PDF Regeneration Toggle Option */}
                    <div className="my-4 flex items-center justify-between rounded-lg border bg-muted/30 p-3.5">
                        <div className="flex flex-col gap-0.5">
                            <label
                                htmlFor="dialog-regenerate-pdf-group"
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
                            id="dialog-regenerate-pdf-group"
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
                                setShowConfirm(false);
                                submitForm(regeneratePdf);
                            }}
                            className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
                        >
                            Guardar Cambios
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </form>
    );
}
