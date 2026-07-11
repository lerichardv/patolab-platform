import { useForm } from '@inertiajs/react';
import {
    Check,
    ChevronsUpDown,
    Upload,
    FileText,
    X,
    ExternalLink,
    CreditCard,
    Landmark,
    Receipt,
    Wallet,
    Percent,
    Coins,
    BadgePercent,
    Info,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import AsyncCustomerCombobox, { type CustomerOption } from '@/components/async-customer-combobox';
import HeadingSheet from '@/components/heading-sheet';
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
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface Props {
    invoice: any;
    banks: any[];
    specimenTypes: any[];
    examinations: any[];
    settings?: Record<string, string>;
    onSuccess: () => void;
    setIsDirty?: (dirty: boolean) => void;
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
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild className="w-full">
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
            >
                <Command>
                    <CommandInput
                        placeholder={`Buscar ${placeholder.toLowerCase()}...`}
                    />
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

export default function InvoiceForm({
    invoice,
    banks,
    specimenTypes,
    examinations,
    settings,
    onSuccess,
    setIsDirty,
}: Props) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [regeneratePdf, setRegeneratePdf] = useState(true);
    const [selectedCustomerData, setSelectedCustomerData] = useState<CustomerOption | null>(
        invoice?.customer
            ? { id: invoice.customer.id, name: invoice.customer.name, id_number: invoice.customer.id_number, phone: invoice.customer.phone, gender: invoice.customer.gender, type: invoice.customer.type, age: invoice.customer.age }
            : null,
    );

    const {
        data,
        setData,
        post,
        processing,
        errors,
        setError,
        clearErrors,
        isDirty,
    } = useForm({
        _method: 'PUT',
        customer_id: invoice?.customer_id ? invoice.customer_id.toString() : '',
        payment_type: invoice?.payment_type || '',
        quantity: invoice?.quantity ? invoice.quantity : 1,
        selected_price: '',
        custom_specimen_price: '0',
        additional_discount_enabled: false,
        additional_discount: '0',
        custom_amount_enabled:
            invoice?.custom_amount && parseFloat(invoice.custom_amount) > 0
                ? true
                : false,
        custom_amount: invoice?.custom_amount
            ? invoice.custom_amount.toString()
            : '0',
        custom_amount_reason: invoice?.custom_amount_reason || '',
        age_discount_type: invoice?.age_discount_type || null,
        age_discount_amount: invoice?.age_discount_amount
            ? invoice.age_discount_amount.toString()
            : '0',
        amount: invoice?.amount ? invoice.amount.toString() : '0',
        discount: invoice?.discount ? invoice.discount.toString() : '0',
        subtotal: invoice?.subtotal ? invoice.subtotal.toString() : '0',
        exempt_amount: invoice?.exempt_amount
            ? invoice.exempt_amount.toString()
            : '0',
        total: invoice?.total ? invoice.total.toString() : '0',
        total_paid: invoice?.total_paid ? invoice.total_paid.toString() : '0',
        payment_method_date: invoice?.payment_method_date
            ? invoice.payment_method_date.split(/[ T]/)[0]
            : new Date().toISOString().split('T')[0],
        cash_value: invoice?.cash_value ? invoice.cash_value.toString() : '',
        check_number: invoice?.check_number || '',
        check_value: invoice?.check_value ? invoice.check_value.toString() : '',
        card_last_4: invoice?.card_last_4 || '',
        card_value_charged: invoice?.card_value_charged
            ? invoice.card_value_charged.toString()
            : '',
        card_expiration: invoice?.card_expiration || '',
        card_authorization_code: invoice?.card_authorization_code || '',
        transfer_bank_id: invoice?.transfer_bank_id
            ? invoice.transfer_bank_id.toString()
            : '',
        transfer_value: invoice?.transfer_value
            ? invoice.transfer_value.toString()
            : '',
        transfer_authorization_code: invoice?.transfer_authorization_code || '',
        has_initial_payment:
            invoice?.payment_type === 'credit' &&
            parseFloat(invoice.total_paid || 0) > 0,
        initial_payment_amount:
            invoice?.payment_type === 'credit' &&
            parseFloat(invoice.total_paid || 0) > 0
                ? invoice.total_paid.toString()
                : '',
        initial_payment_type: 'cash',
        proof_of_payment: null as File | null,
        group_specimens: [] as any[],
    });

    const handleUpdateGroupSpecimenPrice = (id: number, val: string) => {
        setData((prev: any) => {
            const thirdAgePercent = parseFloat(
                settings?.third_age_discount || '30',
            );
            const fourthAgePercent = parseFloat(
                settings?.fourth_age_discount || '40',
            );

            const updatedGroupSpecimens = prev.group_specimens.map(
                (gs: any) => {
                    if (gs.id !== id) {
                        return gs;
                    }

                    let ageAmt = 0;
                    const chosenPrice =
                        val === 'custom'
                            ? parseFloat(gs.custom_specimen_price) || 0
                            : parseFloat(val) || 0;

                    if (gs.age_discount_type === 'third') {
                        ageAmt = (chosenPrice * thirdAgePercent) / 100;
                    } else if (gs.age_discount_type === 'fourth') {
                        ageAmt = (chosenPrice * fourthAgePercent) / 100;
                    }

                    return {
                        ...gs,
                        selected_price: val,
                        age_discount_amount: ageAmt.toString(),
                    };
                },
            );

            return {
                ...prev,
                group_specimens: updatedGroupSpecimens,
            };
        });
    };

    const handleUpdateGroupSpecimenCustomPrice = (id: number, val: string) => {
        setData((prev: any) => {
            const thirdAgePercent = parseFloat(
                settings?.third_age_discount || '30',
            );
            const fourthAgePercent = parseFloat(
                settings?.fourth_age_discount || '40',
            );

            const updatedGroupSpecimens = prev.group_specimens.map(
                (gs: any) => {
                    if (gs.id !== id) {
                        return gs;
                    }

                    let ageAmt = 0;
                    const chosenPrice = parseFloat(val) || 0;

                    if (gs.age_discount_type === 'third') {
                        ageAmt = (chosenPrice * thirdAgePercent) / 100;
                    } else if (gs.age_discount_type === 'fourth') {
                        ageAmt = (chosenPrice * fourthAgePercent) / 100;
                    }

                    return {
                        ...gs,
                        custom_specimen_price: val,
                        age_discount_amount: ageAmt.toString(),
                    };
                },
            );

            return {
                ...prev,
                group_specimens: updatedGroupSpecimens,
            };
        });
    };

    const handleUpdateGroupSpecimenQuantity = (id: number, val: number) => {
        setData((prev: any) => ({
            ...prev,
            group_specimens: prev.group_specimens.map((gs: any) =>
                gs.id === id ? { ...gs, quantity: val } : gs,
            ),
        }));
    };

    const handleUpdateGroupSpecimenAgeDiscountToggle = (
        id: number,
        type: 'third' | 'fourth',
    ) => {
        setData((prev: any) => {
            const thirdAgePercent = parseFloat(
                settings?.third_age_discount || '30',
            );
            const fourthAgePercent = parseFloat(
                settings?.fourth_age_discount || '40',
            );

            const updatedGroupSpecimens = prev.group_specimens.map(
                (gs: any) => {
                    if (gs.id !== id) {
                        return gs;
                    }

                    const currentType = gs.age_discount_type;
                    const updatedType = currentType === type ? null : type;

                    const chosen =
                        gs.selected_price === 'custom'
                            ? parseFloat(gs.custom_specimen_price) || 0
                            : parseFloat(gs.selected_price) || 0;

                    let amt = 0;

                    if (updatedType === 'third') {
                        amt = chosen * (thirdAgePercent / 100);
                    } else if (updatedType === 'fourth') {
                        amt = chosen * (fourthAgePercent / 100);
                    }

                    return {
                        ...gs,
                        age_discount_type: updatedType,
                        age_discount_amount: amt.toString(),
                    };
                },
            );

            return {
                ...prev,
                group_specimens: updatedGroupSpecimens,
            };
        });
    };

    const handleUpdateGroupSpecimenAdditionalDiscountToggle = (
        id: number,
        checked: boolean,
    ) => {
        setData((prev: any) => ({
            ...prev,
            group_specimens: prev.group_specimens.map((gs: any) =>
                gs.id === id
                    ? {
                          ...gs,
                          additional_discount_enabled: checked,
                          additional_discount: checked
                              ? gs.additional_discount || '0'
                              : '0',
                      }
                    : gs,
            ),
        }));
    };

    const handleUpdateGroupSpecimenAdditionalDiscountChange = (
        id: number,
        val: string,
    ) => {
        setData((prev: any) => ({
            ...prev,
            group_specimens: prev.group_specimens.map((gs: any) =>
                gs.id === id ? { ...gs, additional_discount: val } : gs,
            ),
        }));
    };

    useEffect(() => {
        if (setIsDirty) {
            setIsDirty(isDirty);
        }
    }, [isDirty, setIsDirty]);

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
        has_initial_payment: false,
        initial_payment_amount: '',
        initial_payment_type: 'cash',
    });
    const [localPaymentErrors, setLocalPaymentErrors] = useState<
        Record<string, string>
    >({});

    const handleOpenPaymentSheet = () => {
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
            transfer_authorization_code: data.transfer_authorization_code || '',
            has_initial_payment: data.has_initial_payment || false,
            initial_payment_amount: data.initial_payment_amount || '',
            initial_payment_type: data.initial_payment_type || 'cash',
        });
        setLocalPaymentErrors({});
        setIsPaymentSheetOpen(true);
    };

    const hasSpecimen = !!invoice?.specimen;
    const isGroupInvoice = !!invoice?.is_group;
    const selectedExamination = hasSpecimen
        ? examinations.find(
              (e) => e.id === invoice.specimen.specimen_type_examination,
          )
        : null;
    const availablePrices = React.useMemo(
        () => selectedExamination?.prices || [],
        [selectedExamination],
    );
    const maxSpecimenPriceVal = React.useMemo(() => {
        if (availablePrices.length === 0) {
            return 0;
        }

        return Math.max(
            ...availablePrices.map((p: any) => parseFloat(p.amount) || 0),
        );
    }, [availablePrices]);

    const thirdAgePercent = parseFloat(settings?.third_age_discount || '30');
    const fourthAgePercent = parseFloat(settings?.fourth_age_discount || '40');

    // Reconstruction useEffect (runs once on mount / invoice change)
    useEffect(() => {
        if (invoice) {
            const qty = parseInt(invoice.quantity || 1);
            const customAmt = parseFloat(invoice.custom_amount) || 0;
            const customEnabled = customAmt > 0;
            const customReason = invoice.custom_amount_reason || '';
            const ageType = invoice.age_discount_type || null;
            const ageAmt = parseFloat(invoice.age_discount_amount || 0);

            let hasInitial = false;
            let initialAmt = '';
            let initialType = 'cash';

            if (invoice.payment_type === 'credit') {
                const totalPaidVal = parseFloat(invoice.total_paid || 0);

                if (totalPaidVal > 0) {
                    hasInitial = true;
                    initialAmt = totalPaidVal.toString();

                    if (parseFloat(invoice.cash_value || 0) > 0) {
                        initialType = 'cash';
                    } else if (
                        invoice.card_last_4 ||
                        parseFloat(invoice.card_value_charged || 0) > 0
                    ) {
                        initialType = 'credit card';
                    } else if (
                        invoice.transfer_bank_id ||
                        parseFloat(invoice.transfer_value || 0) > 0
                    ) {
                        initialType = 'bank transfer';
                    } else if (
                        invoice.check_number ||
                        parseFloat(invoice.check_value || 0) > 0
                    ) {
                        initialType = 'check';
                    }
                }
            }

            if (invoice.is_group || invoice.group_id) {
                const rawGroupSpecimens =
                    invoice.group_specimens || invoice.groupSpecimens || [];
                const loadedGroupSpecimens = rawGroupSpecimens.map(
                    (gs: any) => {
                        const spec = gs.specimen;
                        const availablePrices = spec?.examination?.prices || [];
                        const sortedPrices = [...availablePrices].sort(
                            (a: any, b: any) =>
                                parseFloat(b.amount) - parseFloat(a.amount),
                        );
                        const maxPrice =
                            sortedPrices.length > 0
                                ? parseFloat(sortedPrices[0].amount) || 0
                                : 0;

                        const amount = parseFloat(gs.amount) || 0;
                        const specQty = parseInt(gs.quantity) || 1;

                        const exactMatch = sortedPrices.find(
                            (p: any) =>
                                Math.abs(parseFloat(p.amount) - amount) < 0.01,
                        );

                        let selected_price = '';
                        let custom_specimen_price = '0';

                        if (exactMatch) {
                            selected_price = exactMatch.amount.toString();
                        } else {
                            selected_price = 'custom';
                            custom_specimen_price = amount.toString();
                        }

                        return {
                            id: gs.id,
                            specimen_id: gs.specimen_id,
                            sequence_code: spec?.sequence_code || 'Sin código',
                            patient_name:
                                spec?.customer_relation?.name ||
                                invoice.customer?.name ||
                                'N/A',
                            type_name: spec?.type?.name || 'N/A',
                            examination_name: spec?.examination?.name || 'N/A',
                            available_prices: availablePrices,
                            selected_price,
                            custom_specimen_price,
                            quantity: specQty,
                            max_price: maxPrice,
                            age_discount_type: gs.age_discount_type || null,
                            age_discount_amount:
                                gs.age_discount_amount?.toString() || '0',
                            additional_discount_enabled:
                                !!gs.additional_discount_enabled,
                            additional_discount:
                                gs.additional_discount?.toString() || '0',
                            insumos: (spec?.products || []).map((p: any) => ({
                                id: p.id,
                                quantity: p.pivot?.quantity || 0,
                                price: p.pivot?.price || p.price || 0,
                                name: p.name,
                                code: p.code,
                            })),
                        };
                    },
                );

                const totalDisc = parseFloat(invoice.discount || 0) || 0;
                const additionalDisc = Math.max(0, totalDisc - ageAmt);

                setData((d: any) => ({
                    ...d,
                    quantity: qty,
                    selected_price: '',
                    custom_specimen_price: '0',
                    group_specimens: loadedGroupSpecimens,
                    additional_discount_enabled: additionalDisc > 0,
                    additional_discount: additionalDisc.toString(),
                    custom_amount_enabled: customEnabled,
                    custom_amount: customAmt.toString(),
                    custom_amount_reason: customReason,
                    age_discount_type: ageType,
                    age_discount_amount: ageAmt.toString(),
                    has_initial_payment: hasInitial,
                    initial_payment_amount: initialAmt,
                    initial_payment_type: initialType,
                }));
            } else if (invoice.specimen && availablePrices.length > 0) {
                const sortedPrices = [...availablePrices].sort(
                    (a: any, b: any) =>
                        parseFloat(b.amount) - parseFloat(a.amount),
                );
                const maxPrice = parseFloat(sortedPrices[0].amount) || 0;
                const totalDiscount = parseFloat(invoice.discount || 0);
                const discountWithoutAge = Math.max(0, totalDiscount - ageAmt);

                // Exact match check
                const exactMatch = sortedPrices.find((p: any) => {
                    const specimenDiscount =
                        Math.max(0, maxPrice - parseFloat(p.amount)) * qty;

                    return (
                        Math.abs(specimenDiscount - discountWithoutAge) < 0.01
                    );
                });

                if (exactMatch) {
                    setData((d: any) => ({
                        ...d,
                        quantity: qty,
                        selected_price: exactMatch.amount.toString(),
                        custom_specimen_price: '0',
                        group_specimens: [],
                        additional_discount_enabled: false,
                        additional_discount: '0',
                        custom_amount_enabled: customEnabled,
                        custom_amount: customAmt.toString(),
                        custom_amount_reason: customReason,
                        age_discount_type: ageType,
                        age_discount_amount: ageAmt.toString(),
                        has_initial_payment: hasInitial,
                        initial_payment_amount: initialAmt,
                        initial_payment_type: initialType,
                    }));
                } else {
                    const targetPrice = maxPrice - discountWithoutAge / qty;
                    setData((d: any) => ({
                        ...d,
                        quantity: qty,
                        selected_price: 'custom',
                        custom_specimen_price: targetPrice.toFixed(2),
                        group_specimens: [],
                        additional_discount_enabled: false,
                        additional_discount: '0',
                        custom_amount_enabled: customEnabled,
                        custom_amount: customAmt.toString(),
                        custom_amount_reason: customReason,
                        age_discount_type: ageType,
                        age_discount_amount: ageAmt.toString(),
                        has_initial_payment: hasInitial,
                        initial_payment_amount: initialAmt,
                        initial_payment_type: initialType,
                    }));
                }
            } else {
                const totalDisc = parseFloat(invoice.discount || 0) || 0;
                const ageAmt =
                    parseFloat(invoice.age_discount_amount || 0) || 0;
                const additionalDisc = Math.max(0, totalDisc - ageAmt);

                const unitPrice = invoice.specimen
                    ? (parseFloat(invoice.amount) - customAmt) / qty
                    : 0;

                setData((d: any) => ({
                    ...d,
                    quantity: qty,
                    selected_price: invoice.specimen ? 'custom' : '',
                    custom_specimen_price: invoice.specimen
                        ? unitPrice.toFixed(2)
                        : '0',
                    group_specimens: [],
                    additional_discount_enabled: additionalDisc > 0,
                    additional_discount: additionalDisc.toString(),
                    custom_amount_enabled: customEnabled,
                    custom_amount: customAmt.toString(),
                    custom_amount_reason: customReason,
                    age_discount_type: ageType,
                    age_discount_amount: ageAmt.toString(),
                    has_initial_payment: hasInitial,
                    initial_payment_amount: initialAmt,
                    initial_payment_type: initialType,
                }));
            }
        }
    }, [invoice, availablePrices, setData]);

    // Derived values
    const selectedPriceVal =
        data.selected_price === 'custom'
            ? parseFloat(data.custom_specimen_price) || 0
            : parseFloat(data.selected_price) || 0;
    const quantityVal = parseInt(data.quantity) || 1;

    const baseSpecimenPriceVal = React.useMemo(() => {
        return Math.max(maxSpecimenPriceVal, selectedPriceVal);
    }, [maxSpecimenPriceVal, selectedPriceVal]);

    const totalSpecimenAmount = React.useMemo(() => {
        if (!isGroupInvoice || !data.group_specimens) {
            return 0;
        }

        return data.group_specimens.reduce((sum: number, gs: any) => {
            const priceVal =
                gs.selected_price === 'custom'
                    ? parseFloat(gs.custom_specimen_price) || 0
                    : parseFloat(gs.selected_price) || 0;
            const basePrice = Math.max(gs.max_price || 0, priceVal);
            const qty = gs.quantity || 1;

            return sum + basePrice * qty;
        }, 0);
    }, [isGroupInvoice, data.group_specimens]);

    const totalSpecimenDiscount = React.useMemo(() => {
        if (!isGroupInvoice || !data.group_specimens) {
            return 0;
        }

        return data.group_specimens.reduce((sum: number, gs: any) => {
            const priceVal =
                gs.selected_price === 'custom'
                    ? parseFloat(gs.custom_specimen_price) || 0
                    : parseFloat(gs.selected_price) || 0;
            const basePrice = Math.max(gs.max_price || 0, priceVal);
            const diff = Math.max(0, basePrice - priceVal);
            const ageDisc = parseFloat(gs.age_discount_amount) || 0;
            const addDisc = gs.additional_discount_enabled
                ? parseFloat(gs.additional_discount) || 0
                : 0;
            const qty = gs.quantity || 1;

            return sum + (diff + ageDisc + addDisc) * qty;
        }, 0);
    }, [isGroupInvoice, data.group_specimens]);

    // Auto-calculate specimen discount
    const specimenDiscountVal = React.useMemo(() => {
        if (hasSpecimen) {
            return (
                Math.max(0, baseSpecimenPriceVal - selectedPriceVal) *
                quantityVal
            );
        } else if (isGroupInvoice) {
            return totalSpecimenDiscount;
        }

        return 0;
    }, [
        hasSpecimen,
        isGroupInvoice,
        baseSpecimenPriceVal,
        selectedPriceVal,
        quantityVal,
        totalSpecimenDiscount,
    ]);

    // Auto-calculate age discount
    const ageDiscountVal = React.useMemo(() => {
        const basePrice = hasSpecimen
            ? selectedPriceVal
            : isGroupInvoice
              ? totalSpecimenAmount
              : parseFloat(data.amount) || 0;

        const qty = hasSpecimen
            ? quantityVal
            : isGroupInvoice
              ? 1
              : quantityVal;

        if (data.age_discount_type === 'third') {
            return ((basePrice * thirdAgePercent) / 100) * qty;
        } else if (data.age_discount_type === 'fourth') {
            return ((basePrice * fourthAgePercent) / 100) * qty;
        }

        return 0;
    }, [
        hasSpecimen,
        isGroupInvoice,
        selectedPriceVal,
        totalSpecimenAmount,
        data.amount,
        data.age_discount_type,
        thirdAgePercent,
        fourthAgePercent,
        quantityVal,
    ]);

    const autoDiscountTotal = specimenDiscountVal + ageDiscountVal;

    // Reactively update age_discount_amount in form data
    useEffect(() => {
        if (data.age_discount_amount !== ageDiscountVal.toString()) {
            setData('age_discount_amount', ageDiscountVal.toString());
        }
    }, [ageDiscountVal, data.age_discount_amount, setData]);

    // Reactively update custom_amount when custom_amount_enabled changes
    const customAmountVal = data.custom_amount_enabled
        ? parseFloat(data.custom_amount) || 0
        : 0;

    // Reactively update amount in form data
    useEffect(() => {
        if (hasSpecimen) {
            const amountToSet =
                baseSpecimenPriceVal * quantityVal + customAmountVal;

            if (data.amount !== amountToSet.toString()) {
                setData('amount', amountToSet.toString());
            }
        } else if (isGroupInvoice) {
            const amountToSet = totalSpecimenAmount + customAmountVal;

            if (data.amount !== amountToSet.toString()) {
                setData('amount', amountToSet.toString());
            }
        }
    }, [
        baseSpecimenPriceVal,
        quantityVal,
        customAmountVal,
        hasSpecimen,
        isGroupInvoice,
        totalSpecimenAmount,
        data.amount,
        setData,
    ]);

    // Reactively update total discount in form data
    const additionalDiscountVal = data.additional_discount_enabled
        ? parseFloat(data.additional_discount) || 0
        : 0;
    const totalDiscountVal = autoDiscountTotal + additionalDiscountVal;

    useEffect(() => {
        if (data.discount !== totalDiscountVal.toString()) {
            setData('discount', totalDiscountVal.toString());
        }
    }, [totalDiscountVal, data.discount, setData]);

    // Reactively update subtotal and total in form data
    const subtotalVal = hasSpecimen
        ? Math.max(
              0,
              baseSpecimenPriceVal * quantityVal +
                  customAmountVal -
                  totalDiscountVal,
          )
        : isGroupInvoice
          ? Math.max(
                0,
                totalSpecimenAmount + customAmountVal - totalDiscountVal,
            )
          : Math.max(
                0,
                (parseFloat(data.amount) || 0) * quantityVal +
                    customAmountVal -
                    totalDiscountVal,
            );

    const totalVal = subtotalVal;

    useEffect(() => {
        setData((d) => ({
            ...d,
            subtotal: subtotalVal.toFixed(2),
            total: totalVal.toFixed(2),
        }));
    }, [subtotalVal, totalVal, setData]);

    // Keep total_paid in sync with payment choices reactively
    useEffect(() => {
        if (data.payment_type === 'credit') {
            const initialAmt = data.has_initial_payment
                ? parseFloat(data.initial_payment_amount) || 0
                : 0;

            if (data.total_paid !== initialAmt.toString()) {
                setData('total_paid', initialAmt.toString());
            }
        } else {
            if (data.total_paid !== totalVal.toFixed(2)) {
                setData('total_paid', totalVal.toFixed(2));
            }
        }
    }, [
        data.payment_type,
        data.has_initial_payment,
        data.initial_payment_amount,
        totalVal,
        data.total_paid,
        setData,
    ]);

    const formatCardExpiration = (value: string) => {
        const clean = value.replace(/\D/g, '');

        if (clean.length <= 2) {
            return clean;
        }

        return `${clean.slice(0, 2)}/${clean.slice(2, 6)}`;
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
            case 'credit':
                return 'Al Crédito';
            default:
                return type || 'Sin seleccionar';
        }
    };

    const handleSavePaymentDetails = () => {
        const errors: Record<string, string> = {};

        if (!localPayment.payment_type) {
            errors.payment_type = 'El tipo de pago es requerido.';
        }

        if (
            localPayment.payment_type !== 'credit' &&
            !localPayment.payment_method_date
        ) {
            errors.payment_method_date = 'La fecha de pago es requerida.';
        }

        if (localPayment.payment_type === 'cash') {
            if (
                !localPayment.cash_value ||
                parseFloat(localPayment.cash_value) <= 0
            ) {
                errors.cash_value =
                    'El valor recibido es requerido y debe ser mayor que 0.';
            }
        }

        if (localPayment.payment_type === 'check') {
            if (!localPayment.check_number) {
                errors.check_number = 'El número de cheque es requerido.';
            }

            if (
                !localPayment.check_value ||
                parseFloat(localPayment.check_value) <= 0
            ) {
                errors.check_value =
                    'El valor del cheque es requerido y debe ser mayor que 0.';
            }
        }

        if (localPayment.payment_type === 'credit card') {
            if (
                !localPayment.card_last_4 ||
                localPayment.card_last_4.length !== 4
            ) {
                errors.card_last_4 = 'Se requieren los últimos 4 dígitos.';
            }

            if (!localPayment.card_expiration) {
                errors.card_expiration =
                    'El vencimiento de la tarjeta es requerido.';
            } else if (
                !/^(0[1-9]|1[0-2])\/\d{2}(\d{2})?$/.test(
                    localPayment.card_expiration,
                )
            ) {
                errors.card_expiration =
                    'El vencimiento debe tener un formato como 12/26 o 12/2026.';
            }

            if (!localPayment.card_authorization_code) {
                errors.card_authorization_code =
                    'El código de autorización es requerido.';
            }

            if (
                !localPayment.card_value_charged ||
                parseFloat(localPayment.card_value_charged) <= 0
            ) {
                errors.card_value_charged =
                    'El valor cobrado es requerido y debe ser mayor que 0.';
            }
        }

        if (localPayment.payment_type === 'bank transfer') {
            if (
                !localPayment.transfer_bank_id ||
                localPayment.transfer_bank_id === 'none'
            ) {
                errors.transfer_bank_id = 'El banco es requerido.';
            }

            if (!localPayment.transfer_authorization_code) {
                errors.transfer_authorization_code =
                    'El código de autorización/referencia es requerido.';
            }

            if (
                !localPayment.transfer_value ||
                parseFloat(localPayment.transfer_value) <= 0
            ) {
                errors.transfer_value =
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
                errors.initial_payment_amount =
                    'El monto de pago inicial es requerido y debe ser mayor que 0.';
            } else if (
                parseFloat(localPayment.initial_payment_amount) > totalVal
            ) {
                errors.initial_payment_amount = `El pago inicial no puede superar el total (L. ${totalVal.toFixed(2)}).`;
            }

            if (!localPayment.initial_payment_type) {
                errors.initial_payment_type =
                    'El tipo de pago inicial es requerido.';
            }

            if (
                localPayment.initial_payment_type === 'check' &&
                !localPayment.check_number
            ) {
                errors.check_number = 'El número de cheque es requerido.';
            }

            if (localPayment.initial_payment_type === 'credit card') {
                if (
                    !localPayment.card_last_4 ||
                    localPayment.card_last_4.length !== 4
                ) {
                    errors.card_last_4 = 'Se requieren los últimos 4 dígitos.';
                }

                if (!localPayment.card_expiration) {
                    errors.card_expiration =
                        'El vencimiento de la tarjeta es requerido.';
                } else if (
                    !/^(0[1-9]|1[0-2])\/\d{2}(\d{2})?$/.test(
                        localPayment.card_expiration,
                    )
                ) {
                    errors.card_expiration =
                        'El vencimiento debe tener un formato como 12/26 o 12/2026.';
                }

                if (!localPayment.card_authorization_code) {
                    errors.card_authorization_code =
                        'El código de autorización es requerido.';
                }
            }

            if (localPayment.initial_payment_type === 'bank transfer') {
                if (
                    !localPayment.transfer_bank_id ||
                    localPayment.transfer_bank_id === 'none'
                ) {
                    errors.transfer_bank_id = 'El banco es requerido.';
                }

                if (!localPayment.transfer_authorization_code) {
                    errors.transfer_authorization_code =
                        'El código de autorización/referencia es requerido.';
                }
            }
        }

        if (Object.keys(errors).length > 0) {
            setLocalPaymentErrors(errors);
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

        setIsPaymentSheetOpen(false);
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
                                            data.initial_payment_amount || '0',
                                        ).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tipo de Pago Inicial:</span>
                                    <span className="font-semibold text-foreground capitalize">
                                        {getPaymentTypeLabel(
                                            data.initial_payment_type,
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
                                {data.initial_payment_type ===
                                    'credit card' && (
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
                                                    {
                                                        data.card_authorization_code
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                                {data.initial_payment_type ===
                                    'bank transfer' && (
                                    <>
                                        {data.transfer_bank_id && (
                                            <div className="flex justify-between">
                                                <span>Banco:</span>
                                                <span className="font-semibold text-foreground">
                                                    {banks.find(
                                                        (b) =>
                                                            b.id.toString() ===
                                                            data.transfer_bank_id.toString(),
                                                    )?.name ||
                                                        'Banco Seleccionado'}
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
    };

    const validateForm = () => {
        clearErrors();
        const localErrors: Record<string, string> = {};

        if (!data.customer_id) {
            localErrors.customer_id = 'El cliente es requerido.';
        }

        if (!data.payment_type) {
            localErrors.payment_type = 'El método de pago es requerido.';
        }

        if (!data.quantity || parseInt(data.quantity.toString()) < 1) {
            localErrors.quantity = 'La cantidad debe ser mayor o igual a 1.';
        }

        if (hasSpecimen || isGroupInvoice) {
            if (hasSpecimen) {
                if (!data.selected_price) {
                    localErrors.selected_price =
                        'La lista de precios es requerida.';
                } else if (data.selected_price === 'custom') {
                    if (!data.custom_specimen_price) {
                        localErrors.custom_specimen_price =
                            'El precio personalizado es requerido.';
                    } else if (parseFloat(data.custom_specimen_price) < 0) {
                        localErrors.custom_specimen_price =
                            'El precio personalizado debe ser mayor o igual a 0.';
                    }
                }
            } else if (isGroupInvoice) {
                data.group_specimens.forEach((gs: any, idx: number) => {
                    if (!gs.selected_price) {
                        localErrors[
                            `group_specimens.${idx}.selected_price` as any
                        ] = 'La lista de precios es requerida.';
                    } else if (gs.selected_price === 'custom') {
                        if (!gs.custom_specimen_price) {
                            localErrors[
                                `group_specimens.${idx}.custom_specimen_price` as any
                            ] = 'El precio personalizado es requerido.';
                        } else if (parseFloat(gs.custom_specimen_price) < 0) {
                            localErrors[
                                `group_specimens.${idx}.custom_specimen_price` as any
                            ] =
                                'El precio personalizado debe ser mayor o igual a 0.';
                        }
                    }
                });
            }

            if (data.custom_amount_enabled) {
                if (!data.custom_amount) {
                    localErrors.custom_amount =
                        'El importe adicional es requerido.';
                } else if (parseFloat(data.custom_amount) < 0) {
                    localErrors.custom_amount =
                        'El importe adicional debe ser mayor o igual a 0.';
                }

                if (
                    !data.custom_amount_reason ||
                    !data.custom_amount_reason.trim()
                ) {
                    localErrors.custom_amount_reason =
                        'La razón del importe adicional es requerida.';
                }
            }

            const additionalDiscountVal = data.additional_discount_enabled
                ? parseFloat(data.additional_discount) || 0
                : 0;
            const maxAllowedDiscount = hasSpecimen
                ? baseSpecimenPriceVal * quantityVal +
                  customAmountVal -
                  autoDiscountTotal
                : totalSpecimenAmount + customAmountVal - autoDiscountTotal;

            if (data.additional_discount_enabled) {
                if (!data.additional_discount || additionalDiscountVal < 0) {
                    localErrors.additional_discount =
                        'El descuento adicional debe ser mayor o igual a 0.';
                } else if (additionalDiscountVal > maxAllowedDiscount) {
                    localErrors.additional_discount = `El descuento adicional no puede superar el subtotal (L. ${maxAllowedDiscount.toFixed(2)}).`;
                }
            }
        } else {
            if (!data.amount || parseFloat(data.amount) < 0) {
                localErrors.amount =
                    'El importe es requerido y debe ser mayor o igual a 0.';
            }

            if (!data.discount || parseFloat(data.discount) < 0) {
                localErrors.discount =
                    'El descuento debe ser mayor o igual a 0.';
            }
        }

        if (data.payment_type !== 'credit' && !data.payment_method_date) {
            localErrors.payment_method_date = 'La fecha de pago es requerida.';
        }

        if (data.payment_type === 'cash') {
            if (!data.cash_value || parseFloat(data.cash_value) <= 0) {
                localErrors.cash_value =
                    'El valor recibido es requerido y debe ser mayor que 0.';
            }
        }

        if (data.payment_type === 'check') {
            if (!data.check_number) {
                localErrors.check_number = 'El número de cheque es requerido.';
            }

            if (!data.check_value || parseFloat(data.check_value) <= 0) {
                localErrors.check_value =
                    'El valor del cheque es requerido y debe ser mayor que 0.';
            }
        }

        if (data.payment_type === 'credit card') {
            if (!data.card_last_4 || data.card_last_4.length !== 4) {
                localErrors.card_last_4 = 'Se requieren los últimos 4 dígitos.';
            }

            if (!data.card_expiration) {
                localErrors.card_expiration =
                    'El vencimiento de la tarjeta es requerido.';
            } else if (
                !/^(0[1-9]|1[0-2])\/\d{2}(\d{2})?$/.test(data.card_expiration)
            ) {
                localErrors.card_expiration =
                    'El vencimiento debe tener un formato como 12/26 o 12/2026.';
            }

            if (!data.card_authorization_code) {
                localErrors.card_authorization_code =
                    'El código de autorización es requerido.';
            }

            if (
                !data.card_value_charged ||
                parseFloat(data.card_value_charged) <= 0
            ) {
                localErrors.card_value_charged =
                    'El valor cobrado es requerido y debe ser mayor que 0.';
            }
        }

        if (data.payment_type === 'bank transfer') {
            if (!data.transfer_bank_id) {
                localErrors.transfer_bank_id = 'El banco es requerido.';
            }

            if (!data.transfer_authorization_code) {
                localErrors.transfer_authorization_code =
                    'El código de autorización/referencia es requerido.';
            }

            if (!data.transfer_value || parseFloat(data.transfer_value) <= 0) {
                localErrors.transfer_value =
                    'El valor transferido es requerido y debe ser mayor que 0.';
            }
        }

        if (data.payment_type === 'credit' && data.has_initial_payment) {
            if (
                !data.initial_payment_amount ||
                parseFloat(data.initial_payment_amount) <= 0
            ) {
                localErrors.initial_payment_amount =
                    'El monto de pago inicial es requerido y debe ser mayor que 0.';
            } else if (parseFloat(data.initial_payment_amount) > totalVal) {
                localErrors.initial_payment_amount = `El pago inicial no puede superar el total (L. ${totalVal.toFixed(2)}).`;
            }

            if (!data.initial_payment_type) {
                localErrors.initial_payment_type =
                    'El tipo de pago inicial es requerido.';
            }

            if (data.initial_payment_type === 'check' && !data.check_number) {
                localErrors.check_number = 'El número de cheque es requerido.';
            }

            if (data.initial_payment_type === 'credit card') {
                if (!data.card_last_4 || data.card_last_4.length !== 4) {
                    localErrors.card_last_4 =
                        'Se requieren los últimos 4 dígitos.';
                }

                if (!data.card_expiration) {
                    localErrors.card_expiration =
                        'El vencimiento de la tarjeta es requerido.';
                } else if (
                    !/^(0[1-9]|1[0-2])\/\d{2}(\d{2})?$/.test(
                        data.card_expiration,
                    )
                ) {
                    localErrors.card_expiration =
                        'El vencimiento debe tener un formato como 12/26 o 12/2026.';
                }

                if (!data.card_authorization_code) {
                    localErrors.card_authorization_code =
                        'El código de autorización es requerido.';
                }
            }

            if (data.initial_payment_type === 'bank transfer') {
                if (
                    !data.transfer_bank_id ||
                    data.transfer_bank_id === 'none'
                ) {
                    localErrors.transfer_bank_id = 'El banco es requerido.';
                }

                if (!data.transfer_authorization_code) {
                    localErrors.transfer_authorization_code =
                        'El código de autorización/referencia es requerido.';
                }
            }
        }

        if (Object.keys(localErrors).length > 0) {
            Object.entries(localErrors).forEach(([key, val]) => {
                setError(key as any, val);
            });
            toast.error(
                'Por favor complete los campos obligatorios del formulario.',
            );

            return false;
        }

        return true;
    };

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            setShowConfirm(true);
        }
    };

    const submitForm = (regen: boolean) => {
        setShowConfirm(false);
        post(`/invoices/${invoice.id}?regenerate_pdf=${regen}`, {
            onSuccess: () => {
                toast.success('Factura actualizada correctamente');
                onSuccess();
            },
            onError: (err) => {
                toast.error('Error al guardar cambios.');
                console.error(err);
            },
        });
    };

    return (
        <form onSubmit={handlePreSubmit} className="space-y-6 px-5 py-2">
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
                                    onClick={handleOpenPaymentSheet}
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
                                <p className="mt-1 text-xs text-destructive">
                                    {errors.payment_type}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Billing configuration inputs based on hasSpecimen */}
                    {hasSpecimen ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {/* Lista de Precios */}
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="selected_price"
                                        className="flex items-center gap-1"
                                    >
                                        <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                                        Lista de Precios{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Select
                                        value={data.selected_price}
                                        onValueChange={(val) =>
                                            setData('selected_price', val)
                                        }
                                    >
                                        <SelectTrigger
                                            id="selected_price"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Seleccione un Precio" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availablePrices.length > 0 ? (
                                                <>
                                                    {availablePrices.map(
                                                        (price: any) => (
                                                            <SelectItem
                                                                key={price.id}
                                                                value={price.amount.toString()}
                                                            >
                                                                L.{' '}
                                                                {parseFloat(
                                                                    price.amount,
                                                                ).toFixed(2)}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                    <SelectItem value="custom">
                                                        Precio Personalizado
                                                    </SelectItem>
                                                </>
                                            ) : (
                                                <>
                                                    <SelectItem
                                                        value="0"
                                                        disabled
                                                    >
                                                        No hay precios
                                                        configurados para este
                                                        tipo de muestra
                                                    </SelectItem>
                                                    <SelectItem value="custom">
                                                        Precio Personalizado
                                                    </SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {data.selected_price === 'custom' && (
                                        <div className="mt-1 grid gap-1.5 transition-all duration-300">
                                            <Label
                                                htmlFor="custom_specimen_price"
                                                className="text-xs"
                                            >
                                                Precio Muestra Personalizado
                                                (L.){' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <div className="relative">
                                                <span className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-muted-foreground select-none">
                                                    L.
                                                </span>
                                                <Input
                                                    id="custom_specimen_price"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={
                                                        data.custom_specimen_price
                                                    }
                                                    onChange={(e) =>
                                                        setData(
                                                            'custom_specimen_price',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="0.00"
                                                    className="pl-7 font-mono"
                                                    required
                                                />
                                            </div>
                                            {errors.custom_specimen_price && (
                                                <span className="text-[10px] text-destructive">
                                                    {
                                                        errors.custom_specimen_price
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {errors.selected_price && (
                                        <span className="text-[10px] text-destructive">
                                            {errors.selected_price}
                                        </span>
                                    )}
                                    {invoice.specimen?.type && (
                                        <span className="truncate text-[10px] text-muted-foreground">
                                            <strong className="text-foreground">
                                                {invoice.specimen.type.name}
                                            </strong>
                                            {invoice.specimen.examination
                                                ?.name &&
                                                ` - ${invoice.specimen.examination.name}`}
                                        </span>
                                    )}
                                </div>

                                {/* Cantidad */}
                                <div className="grid gap-2">
                                    <Label htmlFor="quantity">
                                        Cantidad{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <NumberPicker
                                        value={data.quantity}
                                        onChange={(val) =>
                                            setData('quantity', val)
                                        }
                                        min={1}
                                        className="flex items-start"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Número de muestras a procesar.
                                    </p>
                                </div>

                                {/* Descuento Calculado */}
                                <div className="grid gap-2">
                                    <Label htmlFor="auto_discount">
                                        Descuento Automático (L.)
                                    </Label>
                                    <Input
                                        id="auto_discount"
                                        type="text"
                                        value={parseFloat(
                                            autoDiscountTotal.toString(),
                                        ).toFixed(2)}
                                        readOnly
                                        disabled
                                        className="bg-muted font-mono font-semibold text-emerald-600 disabled:opacity-100 dark:text-emerald-400"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Incluye selección de tarifa y descuento
                                        por edad.
                                    </p>
                                </div>
                            </div>

                            {/* Descuento Adicional Switch + Input (styling matching specimen-form.tsx) */}
                            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <Label
                                            htmlFor="additional-discount-toggle"
                                            className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold"
                                        >
                                            <BadgePercent className="h-3.5 w-3.5 text-muted-foreground" />
                                            Descuento Adicional Personalizado
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">
                                            Permite aplicar un descuento
                                            adicional personalizado a la
                                            factura.
                                        </span>
                                    </div>
                                    <Switch
                                        id="additional-discount-toggle"
                                        checked={
                                            data.additional_discount_enabled
                                        }
                                        onCheckedChange={(checked) => {
                                            setData((d) => ({
                                                ...d,
                                                additional_discount_enabled:
                                                    checked,
                                                additional_discount: checked
                                                    ? d.additional_discount ||
                                                      '0'
                                                    : '0',
                                            }));
                                        }}
                                    />
                                </div>
                                {data.additional_discount_enabled && (
                                    <div className="flex flex-col gap-3 border-t border-border/50 pt-2 transition-all duration-300">
                                        <div className="grid gap-1.5">
                                            <Label
                                                htmlFor="additional_discount"
                                                className="text-xs"
                                            >
                                                Monto de Descuento Adicional
                                                (L.){' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="additional_discount"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={data.additional_discount}
                                                onChange={(e) =>
                                                    setData(
                                                        'additional_discount',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="0.00"
                                                className="font-mono"
                                                required
                                            />
                                            {errors.additional_discount && (
                                                <span className="text-[10px] text-destructive">
                                                    {errors.additional_discount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Cobrar otro importe Switch + Inputs */}
                            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <Label
                                            htmlFor="custom-amount-toggle"
                                            className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold"
                                        >
                                            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                                            Cobrar otro importe personalizado
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">
                                            Permite agregar un importe manual
                                            para servicios adicionales.
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
                                                    ? d.custom_amount_reason ||
                                                      ''
                                                    : '',
                                            }));
                                        }}
                                    />
                                </div>
                                {data.custom_amount_enabled && (
                                    <div className="flex flex-col gap-3 border-t border-border/50 pt-2 transition-all duration-300">
                                        <div className="grid gap-1.5">
                                            <Label
                                                htmlFor="custom_amount"
                                                className="text-xs"
                                            >
                                                Importe Adicional Personalizado
                                                (L.){' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
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
                                                placeholder="0.00"
                                                className="font-mono"
                                                required
                                            />
                                            {errors.custom_amount && (
                                                <span className="text-[10px] text-destructive">
                                                    {errors.custom_amount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label
                                                htmlFor="custom_amount_reason"
                                                className="text-xs"
                                            >
                                                Concepto / Razón del Importe
                                                Adicional{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="custom_amount_reason"
                                                type="text"
                                                value={
                                                    data.custom_amount_reason
                                                }
                                                onChange={(e) =>
                                                    setData(
                                                        'custom_amount_reason',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Ej. Materiales especiales, urgencia, etc."
                                                required
                                            />
                                            {errors.custom_amount_reason && (
                                                <span className="text-[10px] text-destructive">
                                                    {
                                                        errors.custom_amount_reason
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Descuentos por Edad (Tercera/Cuarta) switches (styling matching specimen-form.tsx) */}
                            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                                <div className="mb-2 flex flex-col gap-0.5 border-b pb-2">
                                    <Label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                        <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                                        Descuentos por Edad
                                    </Label>
                                    <span className="text-[10px] text-muted-foreground">
                                        Aplique el descuento de la tercera o
                                        cuarta edad al paciente. Solo se puede
                                        aplicar uno a la vez.
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <Label
                                            htmlFor="third-age-discount-toggle"
                                            className="cursor-pointer text-xs font-semibold"
                                        >
                                            Tercera Edad ({thirdAgePercent}%)
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">
                                            Aplica {thirdAgePercent}% de
                                            descuento sobre el precio base.
                                        </span>
                                    </div>
                                    <Switch
                                        id="third-age-discount-toggle"
                                        checked={
                                            data.age_discount_type === 'third'
                                        }
                                        onCheckedChange={(checked) => {
                                            setData(
                                                'age_discount_type',
                                                checked ? 'third' : null,
                                            );
                                        }}
                                    />
                                </div>
                                <div className="mt-1 flex items-center justify-between border-t border-border/50 pt-3">
                                    <div className="flex flex-col gap-0.5">
                                        <Label
                                            htmlFor="fourth-age-discount-toggle"
                                            className="cursor-pointer text-xs font-semibold"
                                        >
                                            Cuarta Edad ({fourthAgePercent}%)
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">
                                            Aplica {fourthAgePercent}% de
                                            descuento sobre el precio base.
                                        </span>
                                    </div>
                                    <Switch
                                        id="fourth-age-discount-toggle"
                                        checked={
                                            data.age_discount_type === 'fourth'
                                        }
                                        onCheckedChange={(checked) => {
                                            setData(
                                                'age_discount_type',
                                                checked ? 'fourth' : null,
                                            );
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : isGroupInvoice ? (
                        <div className="space-y-4">
                            {/* Render Group Specimens (matching step 2 facturacion of specimen-group-sheet.tsx) */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Configuración de Precios e Insumos por
                                    Muestra
                                </h3>
                                {data.group_specimens.map(
                                    (gs: any, idx: number) => {
                                        const prices =
                                            gs.available_prices || [];
                                        const maxVal =
                                            prices.length > 0
                                                ? Math.max(
                                                      ...prices.map(
                                                          (p: any) =>
                                                              parseFloat(
                                                                  p.amount,
                                                              ) || 0,
                                                      ),
                                                  )
                                                : 0;
                                        const chosen =
                                            gs.selected_price === 'custom'
                                                ? parseFloat(
                                                      gs.custom_specimen_price,
                                                  ) || 0
                                                : parseFloat(
                                                      gs.selected_price,
                                                  ) || 0;
                                        const diffDiscount = Math.max(
                                            0,
                                            maxVal - chosen,
                                        );
                                        const ageDiscVal =
                                            parseFloat(
                                                gs.age_discount_amount,
                                            ) || 0;
                                        const addDiscVal =
                                            gs.additional_discount_enabled
                                                ? parseFloat(
                                                      gs.additional_discount,
                                                  ) || 0
                                                : 0;
                                        const qty = gs.quantity || 1;
                                        const specimenSubtotal = Math.max(
                                            0,
                                            (maxVal -
                                                (diffDiscount +
                                                    ageDiscVal +
                                                    addDiscVal)) *
                                                qty,
                                        );

                                        return (
                                            <Card
                                                key={gs.id || idx}
                                                className="overflow-hidden border border-border/80 shadow-sm"
                                            >
                                                <CardHeader className="flex flex-row items-center justify-between bg-muted/40 px-4 py-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="text-sm font-bold text-foreground">
                                                            Muestra #{idx + 1} -{' '}
                                                            {gs.type_name}
                                                            {gs.examination_name &&
                                                                ` - ${gs.examination_name}`}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Paciente:{' '}
                                                            <strong className="text-foreground">
                                                                {
                                                                    gs.patient_name
                                                                }
                                                            </strong>
                                                        </div>
                                                        {gs.sequence_code && (
                                                            <div className="mt-0.5 w-fit rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                                                                {
                                                                    gs.sequence_code
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className="font-mono text-xs"
                                                    >
                                                        Subtotal: L.{' '}
                                                        {specimenSubtotal.toFixed(
                                                            2,
                                                        )}
                                                    </Badge>
                                                </CardHeader>
                                                <CardContent className="space-y-4 p-4">
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                                        <div className="grid gap-2">
                                                            <Label className="text-xs font-semibold">
                                                                Seleccionar
                                                                Precio (L.)
                                                            </Label>
                                                            <Select
                                                                value={
                                                                    gs.selected_price
                                                                }
                                                                onValueChange={(
                                                                    val,
                                                                ) =>
                                                                    handleUpdateGroupSpecimenPrice(
                                                                        gs.id,
                                                                        val,
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="h-9">
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
                                                            {gs.selected_price ===
                                                                'custom' && (
                                                                <div className="mt-2 grid gap-1 transition-all duration-300">
                                                                    <div className="relative">
                                                                        <span className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-xs text-muted-foreground select-none">
                                                                            L.
                                                                        </span>
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            value={
                                                                                gs.custom_specimen_price ||
                                                                                ''
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                handleUpdateGroupSpecimenCustomPrice(
                                                                                    gs.id,
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
                                                                    {(
                                                                        errors as any
                                                                    )[
                                                                        `group_specimens.${idx}.custom_specimen_price`
                                                                    ] && (
                                                                        <span className="text-[10px] text-destructive">
                                                                            {
                                                                                (
                                                                                    errors as any
                                                                                )[
                                                                                    `group_specimens.${idx}.custom_specimen_price`
                                                                                ]
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {(errors as any)[
                                                                `group_specimens.${idx}.selected_price`
                                                            ] && (
                                                                <span className="mt-1 block text-[10px] text-destructive">
                                                                    {
                                                                        (
                                                                            errors as any
                                                                        )[
                                                                            `group_specimens.${idx}.selected_price`
                                                                        ]
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="grid gap-2">
                                                            <Label className="text-xs font-semibold">
                                                                Cantidad
                                                            </Label>
                                                            <NumberPicker
                                                                value={qty}
                                                                onChange={(
                                                                    val,
                                                                ) =>
                                                                    handleUpdateGroupSpecimenQuantity(
                                                                        gs.id,
                                                                        val,
                                                                    )
                                                                }
                                                                min={1}
                                                            />
                                                        </div>

                                                        <div className="grid gap-2">
                                                            <Label className="text-xs font-semibold">
                                                                Descuento
                                                                Estimado (L.)
                                                            </Label>
                                                            <Input
                                                                type="number"
                                                                value={(
                                                                    (diffDiscount +
                                                                        ageDiscVal +
                                                                        addDiscVal) *
                                                                    qty
                                                                ).toFixed(2)}
                                                                disabled
                                                                readOnly
                                                                className="h-9 bg-muted font-mono font-semibold text-emerald-600"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Age discounts switches */}
                                                    <div className="grid grid-cols-1 gap-4 border-t pt-3 md:grid-cols-2">
                                                        <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5">
                                                            <div className="flex flex-col gap-0.5">
                                                                <Label className="text-xs font-semibold">
                                                                    Tercera Edad
                                                                    (
                                                                    {
                                                                        thirdAgePercent
                                                                    }
                                                                    %)
                                                                </Label>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    Aplica
                                                                    descuento al
                                                                    precio base
                                                                </span>
                                                            </div>
                                                            <Switch
                                                                checked={
                                                                    gs.age_discount_type ===
                                                                    'third'
                                                                }
                                                                onCheckedChange={() =>
                                                                    handleUpdateGroupSpecimenAgeDiscountToggle(
                                                                        gs.id,
                                                                        'third',
                                                                    )
                                                                }
                                                            />
                                                        </div>

                                                        <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5">
                                                            <div className="flex flex-col gap-0.5">
                                                                <Label className="text-xs font-semibold">
                                                                    Cuarta Edad
                                                                    (
                                                                    {
                                                                        fourthAgePercent
                                                                    }
                                                                    %)
                                                                </Label>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    Aplica
                                                                    descuento al
                                                                    precio base
                                                                </span>
                                                            </div>
                                                            <Switch
                                                                checked={
                                                                    gs.age_discount_type ===
                                                                    'fourth'
                                                                }
                                                                onCheckedChange={() =>
                                                                    handleUpdateGroupSpecimenAgeDiscountToggle(
                                                                        gs.id,
                                                                        'fourth',
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Additional discount toggle for specimen */}
                                                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-col gap-0.5">
                                                                <Label className="text-xs font-semibold">
                                                                    Descuento
                                                                    Adicional
                                                                    Muestra
                                                                </Label>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    Descuento
                                                                    extra
                                                                    personalizado
                                                                </span>
                                                            </div>
                                                            <Switch
                                                                checked={
                                                                    !!gs.additional_discount_enabled
                                                                }
                                                                onCheckedChange={(
                                                                    checked,
                                                                ) =>
                                                                    handleUpdateGroupSpecimenAdditionalDiscountToggle(
                                                                        gs.id,
                                                                        checked,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        {!!gs.additional_discount_enabled && (
                                                            <div className="border-t border-border/50 pt-2">
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    placeholder="0.00"
                                                                    value={
                                                                        gs.additional_discount ||
                                                                        ''
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        handleUpdateGroupSpecimenAdditionalDiscountChange(
                                                                            gs.id,
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="h-8 font-mono text-xs"
                                                                />
                                                                {(
                                                                    errors as any
                                                                )[
                                                                    `group_specimens.${idx}.additional_discount`
                                                                ] && (
                                                                    <span className="mt-1 block text-[10px] text-destructive">
                                                                        {
                                                                            (
                                                                                errors as any
                                                                            )[
                                                                                `group_specimens.${idx}.additional_discount`
                                                                            ]
                                                                        }
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Supply summary for specimen */}
                                                    {gs.insumos &&
                                                        gs.insumos.length >
                                                            0 && (
                                                            <div className="space-y-2 border-t pt-3">
                                                                <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                                    Insumos /
                                                                    Reactivos
                                                                </Label>
                                                                <div className="divide-y divide-border/60 overflow-hidden rounded-lg border bg-card/50">
                                                                    {gs.insumos.map(
                                                                        (
                                                                            ins: any,
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    ins.id
                                                                                }
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
                                                                                        x
                                                                                        L.{' '}
                                                                                        {parseFloat(
                                                                                            ins.price,
                                                                                        ).toFixed(
                                                                                            2,
                                                                                        )}
                                                                                    </span>
                                                                                    <span className="font-mono text-[10px] text-muted-foreground">
                                                                                        Total:
                                                                                        L.{' '}
                                                                                        {(
                                                                                            ins.quantity *
                                                                                            parseFloat(
                                                                                                ins.price,
                                                                                            )
                                                                                        ).toFixed(
                                                                                            2,
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                </CardContent>
                                            </Card>
                                        );
                                    },
                                )}
                            </div>

                            {/* Descuento Automático Group */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="auto_discount_group">
                                        Descuento Automático Total (L.)
                                    </Label>
                                    <Input
                                        id="auto_discount_group"
                                        type="text"
                                        value={parseFloat(
                                            autoDiscountTotal.toString(),
                                        ).toFixed(2)}
                                        readOnly
                                        disabled
                                        className="bg-muted font-mono font-semibold text-emerald-600 disabled:opacity-100 dark:text-emerald-400"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Suma de diferencias de lista y descuento
                                        por edad.
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Cantidad de Muestras</Label>
                                    <Input
                                        type="text"
                                        value={data.group_specimens.length}
                                        readOnly
                                        disabled
                                        className="bg-muted font-mono font-semibold disabled:opacity-100"
                                    />
                                </div>
                            </div>

                            {/* Cobrar otro importe */}
                            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <Label
                                            htmlFor="custom-amount-toggle-group"
                                            className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold"
                                        >
                                            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                                            Cobrar otro importe personalizado
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">
                                            Permite agregar un importe manual
                                            para servicios adicionales.
                                        </span>
                                    </div>
                                    <Switch
                                        id="custom-amount-toggle-group"
                                        checked={data.custom_amount_enabled}
                                        onCheckedChange={(checked) => {
                                            setData((d) => ({
                                                ...d,
                                                custom_amount_enabled: checked,
                                                custom_amount: checked
                                                    ? d.custom_amount || '0'
                                                    : '0',
                                                custom_amount_reason: checked
                                                    ? d.custom_amount_reason ||
                                                      ''
                                                    : '',
                                            }));
                                        }}
                                    />
                                </div>
                                {data.custom_amount_enabled && (
                                    <div className="flex flex-col gap-3 border-t border-border/50 pt-2 transition-all duration-300">
                                        <div className="grid gap-1.5">
                                            <Label
                                                htmlFor="custom_amount_group"
                                                className="text-xs"
                                            >
                                                Importe Adicional Personalizado
                                                (L.){' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="custom_amount_group"
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
                                                placeholder="0.00"
                                                className="font-mono"
                                                required
                                            />
                                            {errors.custom_amount && (
                                                <span className="text-[10px] text-destructive">
                                                    {errors.custom_amount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label
                                                htmlFor="custom_amount_reason_group"
                                                className="text-xs"
                                            >
                                                Concepto / Razón del Importe
                                                Adicional{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="custom_amount_reason_group"
                                                type="text"
                                                value={
                                                    data.custom_amount_reason
                                                }
                                                onChange={(e) =>
                                                    setData(
                                                        'custom_amount_reason',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Ej. Materiales especiales, urgencia, etc."
                                                required
                                            />
                                            {errors.custom_amount_reason && (
                                                <span className="text-[10px] text-destructive">
                                                    {
                                                        errors.custom_amount_reason
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Generic Inputs if not specimen */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="amount">
                                        Importe Unitario (L.){' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        value={data.amount}
                                        onChange={(e) =>
                                            setData('amount', e.target.value)
                                        }
                                        className="font-mono"
                                        required
                                    />
                                    {errors.amount && (
                                        <p className="text-xs text-destructive">
                                            {errors.amount}
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="quantity">
                                        Cantidad{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <NumberPicker
                                        value={data.quantity}
                                        onChange={(val) =>
                                            setData('quantity', val)
                                        }
                                        min={1}
                                        className="flex items-start"
                                    />
                                </div>

                                {/* Descuento Calculado (Consistente con Specimen) */}
                                <div className="grid gap-2">
                                    <Label htmlFor="auto_discount_ns">
                                        Descuento Automático (L.)
                                    </Label>
                                    <Input
                                        id="auto_discount_ns"
                                        type="text"
                                        value={parseFloat(
                                            autoDiscountTotal.toString(),
                                        ).toFixed(2)}
                                        readOnly
                                        disabled
                                        className="bg-muted font-mono font-semibold text-emerald-600 disabled:opacity-100 dark:text-emerald-400"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Incluye descuento por edad.
                                    </p>
                                </div>
                            </div>

                            {/* Descuento Adicional Switch + Input (Consistente con Specimen) */}
                            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <Label
                                            htmlFor="additional-discount-toggle-ns"
                                            className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold"
                                        >
                                            <BadgePercent className="h-3.5 w-3.5 text-muted-foreground" />
                                            Descuento Adicional Personalizado
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">
                                            Permite aplicar un descuento
                                            adicional personalizado a la
                                            factura.
                                        </span>
                                    </div>
                                    <Switch
                                        id="additional-discount-toggle-ns"
                                        checked={
                                            data.additional_discount_enabled
                                        }
                                        onCheckedChange={(checked) => {
                                            setData((d) => ({
                                                ...d,
                                                additional_discount_enabled:
                                                    checked,
                                                additional_discount: checked
                                                    ? d.additional_discount ||
                                                      '0'
                                                    : '0',
                                            }));
                                        }}
                                    />
                                </div>
                                {data.additional_discount_enabled && (
                                    <div className="flex flex-col gap-3 border-t border-border/50 pt-2 transition-all duration-300">
                                        <div className="grid gap-1.5">
                                            <Label
                                                htmlFor="additional_discount_ns"
                                                className="text-xs"
                                            >
                                                Monto de Descuento Adicional
                                                (L.){' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="additional_discount_ns"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={data.additional_discount}
                                                onChange={(e) =>
                                                    setData(
                                                        'additional_discount',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="0.00"
                                                className="font-mono"
                                                required
                                            />
                                            {errors.additional_discount && (
                                                <span className="text-xs text-destructive">
                                                    {errors.additional_discount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Descuentos por Edad Switch (Consistente con Specimen) */}
                            <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
                                <div className="flex flex-col gap-0.5">
                                    <Label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                        <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                                        Descuentos por Edad
                                    </Label>
                                    <span className="text-[10px] text-muted-foreground">
                                        Aplique el descuento de la tercera o
                                        cuarta edad al paciente. Solo se puede
                                        aplicar uno a la vez.
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <Label
                                            htmlFor="third-age-discount-toggle-ns"
                                            className="cursor-pointer text-xs font-semibold"
                                        >
                                            Tercera Edad ({thirdAgePercent}%)
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">
                                            Aplica {thirdAgePercent}% de
                                            descuento sobre el precio base.
                                        </span>
                                    </div>
                                    <Switch
                                        id="third-age-discount-toggle-ns"
                                        checked={
                                            data.age_discount_type === 'third'
                                        }
                                        onCheckedChange={(checked) => {
                                            setData(
                                                'age_discount_type',
                                                checked ? 'third' : null,
                                            );
                                        }}
                                    />
                                </div>
                                <div className="mt-1 flex items-center justify-between border-t border-border/50 pt-3">
                                    <div className="flex flex-col gap-0.5">
                                        <Label
                                            htmlFor="fourth-age-discount-toggle-ns"
                                            className="cursor-pointer text-xs font-semibold"
                                        >
                                            Cuarta Edad ({fourthAgePercent}%)
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">
                                            Aplica {fourthAgePercent}% de
                                            descuento sobre el precio base.
                                        </span>
                                    </div>
                                    <Switch
                                        id="fourth-age-discount-toggle-ns"
                                        checked={
                                            data.age_discount_type === 'fourth'
                                        }
                                        onCheckedChange={(checked) => {
                                            setData(
                                                'age_discount_type',
                                                checked ? 'fourth' : null,
                                            );
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Cobrar otro importe Switch + Inputs for non-specimen */}
                            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <Label
                                            htmlFor="custom-amount-toggle-ns"
                                            className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold"
                                        >
                                            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                                            Cobrar otro importe personalizado
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">
                                            Permite agregar un importe manual
                                            para servicios adicionales.
                                        </span>
                                    </div>
                                    <Switch
                                        id="custom-amount-toggle-ns"
                                        checked={data.custom_amount_enabled}
                                        onCheckedChange={(checked) => {
                                            setData((d) => ({
                                                ...d,
                                                custom_amount_enabled: checked,
                                                custom_amount: checked
                                                    ? d.custom_amount || '0'
                                                    : '0',
                                                custom_amount_reason: checked
                                                    ? d.custom_amount_reason ||
                                                      ''
                                                    : '',
                                            }));
                                        }}
                                    />
                                </div>
                                {data.custom_amount_enabled && (
                                    <div className="flex flex-col gap-3 border-t border-border/50 pt-2 transition-all duration-300">
                                        <div className="grid gap-1.5">
                                            <Label
                                                htmlFor="custom_amount_ns"
                                                className="text-xs"
                                            >
                                                Importe Adicional Personalizado
                                                (L.){' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="custom_amount_ns"
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
                                                placeholder="0.00"
                                                className="font-mono"
                                                required
                                            />
                                            {errors.custom_amount && (
                                                <span className="text-[10px] text-destructive">
                                                    {errors.custom_amount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label
                                                htmlFor="custom_amount_reason_ns"
                                                className="text-xs"
                                            >
                                                Concepto / Razón del Importe
                                                Adicional{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="custom_amount_reason_ns"
                                                type="text"
                                                value={
                                                    data.custom_amount_reason
                                                }
                                                onChange={(e) =>
                                                    setData(
                                                        'custom_amount_reason',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Ej. Materiales especiales, urgencia, etc."
                                                required
                                            />
                                            {errors.custom_amount_reason && (
                                                <span className="text-[10px] text-destructive">
                                                    {
                                                        errors.custom_amount_reason
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Comprobante de Pago Uploader (conditions match specimen-form.tsx) */}
                    {((data.payment_type !== 'cash' &&
                        data.payment_type !== 'credit') ||
                        (data.payment_type === 'credit' &&
                            data.has_initial_payment &&
                            data.initial_payment_type !== 'cash')) && (
                        <div className="grid gap-2 rounded-lg border bg-muted/10 p-4">
                            <Label className="flex items-center gap-1.5">
                                Comprobante de Pago
                            </Label>
                            <div className="flex flex-col gap-2">
                                {invoice?.proof_of_payment &&
                                    typeof invoice.proof_of_payment ===
                                        'string' && (
                                        <div className="flex items-center gap-2 rounded border bg-secondary p-2">
                                            <FileText className="h-4 w-4 text-primary" />
                                            <span className="max-w-[200px] truncate font-mono text-xs">
                                                {invoice.proof_of_payment
                                                    .split('/')
                                                    .pop()}
                                            </span>
                                            <a
                                                href={`/storage/${invoice.proof_of_payment}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-auto inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                                            >
                                                Ver actual{' '}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    )}
                                <div className="flex w-full items-center justify-center">
                                    <label
                                        htmlFor="proof_of_payment"
                                        className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-background hover:bg-muted/40"
                                    >
                                        <div className="flex flex-col items-center justify-center pt-3 pb-3">
                                            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground">
                                                <span className="font-semibold">
                                                    Haga clic para subir
                                                </span>{' '}
                                                o arrastre y suelte
                                            </p>
                                            <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                                                PDF, PNG, JPG hasta 30MB
                                            </p>
                                        </div>
                                        <input
                                            id="proof_of_payment"
                                            type="file"
                                            accept="image/*,application/pdf"
                                            className="hidden"
                                            onChange={(e) =>
                                                setData(
                                                    'proof_of_payment',
                                                    e.target.files?.[0] || null,
                                                )
                                            }
                                        />
                                    </label>
                                </div>
                                {data.proof_of_payment && (
                                    <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-600 dark:bg-emerald-950/20">
                                        <Check className="h-4 w-4 shrink-0" />
                                        <span className="truncate font-semibold">
                                            {data.proof_of_payment.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setData(
                                                    'proof_of_payment',
                                                    null,
                                                )
                                            }
                                            className="ml-auto text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )}
                                {errors.proof_of_payment && (
                                    <p className="text-xs text-destructive">
                                        {errors.proof_of_payment}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Sticky Summary Card (exact matching layout, styling, concepts from specimen-form.tsx) */}
                <div className="flex flex-col justify-start lg:col-span-4">
                    <div className="sticky top-6 flex flex-col gap-4 rounded-xl border bg-muted/30 p-5 shadow-sm dark:bg-muted/10">
                        <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Resumen de Totales
                        </h4>
                        <div className="mt-2 flex flex-col gap-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    {isGroupInvoice
                                        ? 'Precio Regular Muestras:'
                                        : hasSpecimen
                                          ? 'Precio Regular Muestra:'
                                          : 'Importe Base Regular:'}
                                </span>
                                <span className="font-semibold text-foreground">
                                    L.{' '}
                                    {(isGroupInvoice
                                        ? totalSpecimenAmount
                                        : hasSpecimen
                                          ? baseSpecimenPriceVal * quantityVal
                                          : (parseFloat(data.amount) || 0) *
                                            quantityVal
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
                                            L. {customAmountVal.toFixed(2)}
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
                                    {(hasSpecimen || isGroupInvoice) &&
                                        specimenDiscountVal > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span>Categoría Muestra:</span>
                                                <span className="font-semibold">
                                                    - L.{' '}
                                                    {specimenDiscountVal.toFixed(
                                                        2,
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    {ageDiscountVal > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span>
                                                {data.age_discount_type ===
                                                'third'
                                                    ? 'Tercera Edad'
                                                    : 'Cuarta Edad'}
                                                :
                                            </span>
                                            <span className="font-semibold">
                                                - L. {ageDiscountVal.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    {additionalDiscountVal > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span>Descuento Adicional:</span>
                                            <span className="font-semibold">
                                                - L.{' '}
                                                {additionalDiscountVal.toFixed(
                                                    2,
                                                )}
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
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Descuento:
                                    </span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                        - L. 0.00
                                    </span>
                                </div>
                            )}

                            <Separator />

                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                    Sub-Total:
                                </span>
                                <span className="font-semibold text-foreground">
                                    L. {subtotalVal.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between text-xs">
                                <span className="flex flex-col text-muted-foreground">
                                    <span>Importe Exonerado:</span>
                                    <span className="text-[10px] text-muted-foreground/80">
                                        (Servicios médicos)
                                    </span>
                                </span>
                                <span className="font-semibold text-foreground">
                                    L. {totalVal.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                    Importe Exento:
                                </span>
                                <span className="font-semibold text-foreground">
                                    L. 0.00
                                </span>
                            </div>

                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                    Importe Gravado 15%:
                                </span>
                                <span className="font-semibold text-foreground">
                                    L. 0.00
                                </span>
                            </div>

                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                    Importe Gravado 18%:
                                </span>
                                <span className="font-semibold text-foreground">
                                    L. 0.00
                                </span>
                            </div>

                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                    ISV 15%:
                                </span>
                                <span className="font-semibold text-foreground">
                                    L. 0.00
                                </span>
                            </div>

                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                    ISV 18%:
                                </span>
                                <span className="font-semibold text-foreground">
                                    L. 0.00
                                </span>
                            </div>

                            <Separator className="h-0.5" />

                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm font-bold text-foreground">
                                    Total a Pagar:
                                </span>
                                <span className="font-mono text-lg font-extrabold text-primary">
                                    L. {totalVal.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                    Total Pagado:
                                </span>
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
                                    Guardar Cambios
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide-out payment selector Sheet */}
            <Sheet
                open={isPaymentSheetOpen}
                onOpenChange={setIsPaymentSheetOpen}
            >
                <SheetContent
                    side="right"
                    className="z-[100] w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]"
                >
                    <HeadingSheet
                        title="Método de Pago"
                        description="Configure el método de pago e ingrese la información fiscal requerida para facturar."
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
                                                totalVal.toString();
                                        } else if (value === 'check') {
                                            next.check_value =
                                                totalVal.toString();
                                        } else if (value === 'credit card') {
                                            next.card_value_charged =
                                                totalVal.toString();
                                        } else if (value === 'bank transfer') {
                                            next.transfer_value =
                                                totalVal.toString();
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
                                        <SelectContent>
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
                                            setLocalPayment((prev) => {
                                                const next = {
                                                    ...prev,
                                                    has_initial_payment:
                                                        checked,
                                                    initial_payment_amount:
                                                        checked
                                                            ? prev.initial_payment_amount ||
                                                              totalVal.toString()
                                                            : '',
                                                    initial_payment_type:
                                                        checked
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
                                                        next.transfer_value =
                                                            amt;
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
                                                    min="0.01"
                                                    max={totalVal}
                                                    value={
                                                        localPayment.initial_payment_amount
                                                    }
                                                    onChange={(e) => {
                                                        const val =
                                                            e.target.value;

                                                        setLocalPayment(
                                                            (prev) => {
                                                                const next = {
                                                                    ...prev,
                                                                    initial_payment_amount:
                                                                        val,
                                                                    cash_value:
                                                                        '',
                                                                    check_value:
                                                                        '',
                                                                    card_value_charged:
                                                                        '',
                                                                    transfer_value:
                                                                        '',
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
                                                            },
                                                        );
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
                                                        setLocalPayment(
                                                            (prev) => {
                                                                const next = {
                                                                    ...prev,
                                                                    initial_payment_type:
                                                                        value,
                                                                    cash_value:
                                                                        '',
                                                                    check_value:
                                                                        '',
                                                                    card_value_charged:
                                                                        '',
                                                                    transfer_value:
                                                                        '',
                                                                };

                                                                const amt =
                                                                    next.initial_payment_amount ||
                                                                    '0';

                                                                if (
                                                                    value ===
                                                                    'cash'
                                                                ) {
                                                                    next.cash_value =
                                                                        amt;
                                                                } else if (
                                                                    value ===
                                                                    'check'
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
                                                            },
                                                        );
                                                    }}
                                                >
                                                    <SelectTrigger
                                                        id="sheet_initial_payment_type"
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
                                                        <SelectContent>
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

            {/* Confirmation AlertDialog with prompt for PDF regeneration */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="max-w-[550px]">
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
                        invoice?.credit) && (
                        <div className="my-2.5 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:border-amber-950/40 dark:bg-amber-950/15 dark:text-amber-300">
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
                                htmlFor="dialog-regenerate-pdf"
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
                            id="dialog-regenerate-pdf"
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
