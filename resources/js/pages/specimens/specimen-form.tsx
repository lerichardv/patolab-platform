import { useForm, usePage } from '@inertiajs/react';
import {
    Check,
    ChevronsUpDown,
    Plus,
    Upload,
    FileText,
    X,
    ExternalLink,
    AlertCircle,
    Tag,
    Microscope,
    Wallet,
    CreditCard,
    Landmark,
    Receipt,
    Calendar,
} from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
    store as storeSpecimen,
    update as updateSpecimen,
} from '@/actions/App/Http/Controllers/SpecimenController';
import HeadingSheet from '@/components/heading-sheet';
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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import CustomerForm from '../customers/customer-form';
import ReferrerForm from '../referrers/referrer-form';
import SequenceForm from '../sequences/sequence-form';
import CategorySheet from '../specimen-categories/category-sheet';
import SpecimenTypeExaminationSheet from '../specimen-type-examinations/specimen-type-examination-sheet';
import SpecimenTypeForm from '../specimen-types/specimen-type-form';

interface Props {
    specimen: any | null;
    onSuccess: () => void;
    setIsDirty?: (dirty: boolean) => void;
    customers: any[];
    specimenTypes: any[];
    examinations: any[];
    categories: any[];
    referrers: any[];
    referrerTypes: any[];
    priorities: any[];
    locations: any[];
    sequences: any[];
    activeLocationId: number | null;
    products?: any[];
    banks?: any[];
}

function FormCombobox({
    options,
    value,
    onChange,
    placeholder,
    emptyMessage = 'No se encontraron resultados.',
    disabled = false,
}: {
    options: {
        label: string;
        value: string;
        color?: string;
        disabled?: boolean;
    }[];
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
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    <div className="flex items-center gap-2 truncate">
                        {selectedOption?.color && (
                            <div
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{
                                    backgroundColor: selectedOption.color,
                                }}
                            />
                        )}
                        <span className="truncate">
                            {selectedOption
                                ? selectedOption.label
                                : placeholder}
                        </span>
                    </div>
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
                                    disabled={option.disabled}
                                    onSelect={() => {
                                        if (option.disabled) {
                                            return;
                                        }

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
                                    {option.color && (
                                        <div
                                            className="mr-2 h-3 w-3 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: option.color,
                                            }}
                                        />
                                    )}
                                    <span
                                        className={cn(
                                            'truncate',
                                            option.disabled &&
                                                'text-muted-foreground opacity-50',
                                        )}
                                    >
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

export default function SpecimenForm({
    specimen,
    onSuccess,
    setIsDirty,
    customers,
    specimenTypes,
    examinations,
    categories,
    referrers,
    referrerTypes = [],
    priorities,
    locations = [],
    sequences = [],
    activeLocationId = null,
    products = [],
    banks = [],
}: Props) {
    const [isCustomerSheetOpen, setIsCustomerSheetOpen] = React.useState(false);
    const [isReferrerSheetOpen, setIsReferrerSheetOpen] = React.useState(false);
    const [isSequenceSheetOpen, setIsSequenceSheetOpen] = React.useState(false);
    const [isSpecimenTypeSheetOpen, setIsSpecimenTypeSheetOpen] =
        React.useState(false);
    const [isExaminationSheetOpen, setIsExaminationSheetOpen] =
        React.useState(false);
    const [isCategorySheetOpen, setIsCategorySheetOpen] = React.useState(false);
    const prevSpecimenTypesRef = React.useRef<any[]>(specimenTypes);
    const prevExaminationsRef = React.useRef<any[]>(examinations);
    const prevCategoriesRef = React.useRef<any[]>(categories);

    React.useEffect(() => {
        if (specimenTypes.length > prevSpecimenTypesRef.current.length) {
            const newTypes = specimenTypes.filter(
                (t) =>
                    !prevSpecimenTypesRef.current.some(
                        (prev) => prev.id === t.id,
                    ),
            );

            if (newTypes.length > 0) {
                setData('specimen_type', newTypes[0].id.toString());
                toast.success(
                    `Tipo de muestra "${newTypes[0].name}" seleccionado automáticamente`,
                );
            }
        }

        prevSpecimenTypesRef.current = specimenTypes;
    }, [specimenTypes]);

    React.useEffect(() => {
        if (examinations.length > prevExaminationsRef.current.length) {
            const newExams = examinations.filter(
                (e) =>
                    !prevExaminationsRef.current.some(
                        (prev) => prev.id === e.id,
                    ),
            );

            if (newExams.length > 0) {
                setData('specimen_type_examination', newExams[0].id.toString());
                toast.success(
                    `Análisis "${newExams[0].name}" seleccionado automáticamente`,
                );
            }
        }

        prevExaminationsRef.current = examinations;
    }, [examinations]);

    React.useEffect(() => {
        if (categories.length > prevCategoriesRef.current.length) {
            const newCats = categories.filter(
                (c) =>
                    !prevCategoriesRef.current.some((prev) => prev.id === c.id),
            );

            if (newCats.length > 0) {
                setData('specimen_category', newCats[0].id.toString());
                toast.success(
                    `Categoría "${newCats[0].name}" seleccionada automáticamente`,
                );
            }
        }

        prevCategoriesRef.current = categories;
    }, [categories]);

    const [localSequences, setLocalSequences] =
        React.useState<any[]>(sequences);
    const [showConfirm, setShowConfirm] = React.useState(false);
    const [isFacturating, setIsFacturating] = React.useState(false);
    const [isPaymentSheetOpen, setIsPaymentSheetOpen] = React.useState(false);
    const [localPayment, setLocalPayment] = React.useState({
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
    const [localPaymentErrors, setLocalPaymentErrors] = React.useState<
        Record<string, string>
    >({});

    React.useEffect(() => {
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
                has_initial_payment: data.has_initial_payment || false,
                initial_payment_amount: data.initial_payment_amount || '',
                initial_payment_type: data.initial_payment_type || 'cash',
            });
            setLocalPaymentErrors({});
        }
    }, [isPaymentSheetOpen]);

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

    const [currentStep, setCurrentStep] = React.useState(1);
    const [searchQuery, setSearchQuery] = React.useState('');
    const formRef = React.useRef<HTMLFormElement>(null);

    React.useEffect(() => {
        const container = formRef.current?.closest('.overflow-y-auto');

        if (container) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentStep]);

    React.useEffect(() => {
        setLocalSequences(sequences);
    }, [sequences]);

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
        _method: specimen ? 'PUT' : undefined,
        customer: specimen?.customer ? specimen.customer.toString() : '',
        specimen_type: specimen?.specimen_type
            ? specimen.specimen_type.toString()
            : '',
        specimen_type_examination: specimen?.specimen_type_examination
            ? specimen.specimen_type_examination.toString()
            : '',
        specimen_category: specimen?.specimen_category
            ? specimen.specimen_category.toString()
            : '',
        referrer: specimen?.referrer ? specimen.referrer.toString() : '',
        anatomic_site: specimen?.anatomic_site || '',
        diagnosis: specimen?.diagnosis || '',
        clinical_notes: specimen?.clinical_notes || '',
        status: specimen?.status || 'received',
        priority_id: specimen?.priority_id
            ? specimen.priority_id.toString()
            : priorities && priorities.length > 0
              ? priorities[0].id.toString()
              : '',
        medical_order_file: null as File | null,

        // Billing fields (creation only)
        quantity: 1,
        amount: '',
        selected_price: '',
        custom_amount_enabled: false,
        custom_amount: '0',
        custom_amount_reason: '',
        discount: '0',
        additional_discount_enabled: false,
        additional_discount: '0',
        age_discount_type: null as string | null,
        age_discount_amount: '0',
        payment_type: '',
        proof_of_payment: null as File | null,
        has_initial_payment: false,
        initial_payment_amount: '',
        initial_payment_type: 'cash',

        // Detailed payment fields (creation only)
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

        // Insumos field (creation only)
        agregar_insumos: false,
        insumos: [] as Array<{
            id: number;
            quantity: number;
            name: string;
            code: string;
            total_stock: number;
            price: number;
            prices: any[];
        }>,
    });

    const filteredProducts = React.useMemo(() => {
        return products.filter(
            (product) =>
                product.name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                product.code.toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [products, searchQuery]);

    const selectedType = React.useMemo(() => {
        return specimenTypes.find(
            (t) => t.id.toString() === data.specimen_type,
        );
    }, [data.specimen_type, specimenTypes]);

    const availablePrices = React.useMemo(() => {
        return selectedType?.prices || [];
    }, [selectedType]);

    React.useEffect(() => {
        if (!data.specimen_type) {
            setData('selected_price', '');

            return;
        }

        const selected = specimenTypes.find(
            (t) => t.id.toString() === data.specimen_type,
        );
        const prices = selected?.prices || [];

        if (prices.length > 0) {
            const sortedPrices = [...prices].sort(
                (a, b) => parseFloat(b.amount) - parseFloat(a.amount),
            );
            setData('selected_price', sortedPrices[0].amount.toString());
        } else {
            setData('selected_price', '');
        }
    }, [data.specimen_type, specimenTypes]);

    const sortedSpecimenTypes = React.useMemo(() => {
        return [...specimenTypes].sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
        );
    }, [specimenTypes]);

    const filteredExaminations = React.useMemo(() => {
        if (!data.specimen_type) {
            return [];
        }

        return examinations
            .filter((e) => e.specimen_type?.toString() === data.specimen_type)
            .sort((a, b) =>
                a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
            );
    }, [examinations, data.specimen_type]);

    React.useEffect(() => {
        if (data.specimen_type) {
            const hasValidExamSelected = filteredExaminations.some(
                (e) => e.id.toString() === data.specimen_type_examination,
            );

            if (
                !hasValidExamSelected &&
                data.specimen_type_examination !== ''
            ) {
                setData('specimen_type_examination', '');
            }
        } else if (data.specimen_type_examination !== '') {
            setData('specimen_type_examination', '');
        }
    }, [data.specimen_type, filteredExaminations]);

    const handleAddInsumo = (product: any) => {
        if (data.insumos.some((i: any) => i.id === product.id)) {
            toast.info(`El producto "${product.name}" ya ha sido agregado.`);

            return;
        }

        const sortedPrices = [...(product.prices || [])].sort(
            (a, b) => parseFloat(b.amount) - parseFloat(a.amount),
        );
        const defaultPrice =
            sortedPrices.length > 0
                ? parseFloat(sortedPrices[0].amount)
                : parseFloat(product.sale_price) || 0;

        const newInsumo = {
            id: product.id,
            name: product.name,
            code: product.code,
            quantity: 1,
            total_stock: parseInt(product.total_stock) || 0,
            price: defaultPrice,
            prices: sortedPrices,
            sale_price: parseFloat(product.sale_price) || 0,
        };

        setData('insumos', [...data.insumos, newInsumo]);
        toast.success(`"${product.name}" agregado a insumos.`);
    };

    const handleUpdateInsumoQty = (id: number, qty: number) => {
        const updated = data.insumos.map((i: any) => {
            if (i.id === id) {
                const cappedQty = Math.max(1, Math.min(i.total_stock, qty));

                return { ...i, quantity: cappedQty };
            }

            return i;
        });
        setData('insumos', updated);
    };

    const handleUpdateInsumoPrice = (id: number, price: number) => {
        const updated = data.insumos.map((i: any) => {
            if (i.id === id) {
                return { ...i, price: price };
            }

            return i;
        });
        setData('insumos', updated);
    };

    const handleRemoveInsumo = (id: number) => {
        const updated = data.insumos.filter((i: any) => i.id !== id);
        setData('insumos', updated);
    };

    React.useEffect(() => {
        clearErrors();
    }, []);

    React.useEffect(() => {
        if (setIsDirty) {
            setIsDirty(isDirty);
        }
    }, [isDirty, setIsDirty]);

    const matchingSequence = React.useMemo(() => {
        if (specimen || !data.specimen_type || !activeLocationId) {
            return null;
        }

        return localSequences.find(
            (s) =>
                s.specimen_type.toString() === data.specimen_type &&
                s.location_id === activeLocationId &&
                s.active,
        );
    }, [specimen, data.specimen_type, localSequences, activeLocationId]);

    const nextSequencePreview = React.useMemo(() => {
        if (!matchingSequence) {
            return '';
        }

        const fillWidth = matchingSequence.fill ?? 4;
        const paddedSeq = String(matchingSequence.current_sequence).padStart(
            fillWidth,
            '0',
        );
        const paddedMonth = String(matchingSequence.month).padStart(2, '0');

        return `${matchingSequence.prefix}${matchingSequence.separator}${paddedSeq}${matchingSequence.separator}${paddedMonth}${matchingSequence.separator}${matchingSequence.year}`;
    }, [matchingSequence]);

    const validateStep1 = () => {
        clearErrors();
        const localErrors: Record<string, string> = {};

        // Validar campos de la muestra
        if (!data.customer) {
            localErrors.customer = 'El paciente es requerido.';
        }

        if (!data.referrer) {
            localErrors.referrer = 'El médico remitente es requerido.';
        }

        if (!data.specimen_type) {
            localErrors.specimen_type = 'El tipo de muestra es requerido.';
        } else if (!specimen && !matchingSequence) {
            localErrors.specimen_type =
                'No existe una secuencia de numeración activa configurada para este tipo de muestra.';
        }

        if (!data.specimen_type_examination) {
            localErrors.specimen_type_examination =
                'El examen a realizar es requerido.';
        }

        if (!data.specimen_category) {
            localErrors.specimen_category =
                'La categoría de tiempo es requerida.';
        }

        if (!data.priority_id) {
            localErrors.priority_id = 'La prioridad es requerida.';
        }

        if (!data.status) {
            localErrors.status = 'El estado es requerido.';
        }

        if (Object.keys(localErrors).length > 0) {
            Object.entries(localErrors).forEach(([key, val]) => {
                setError(key as any, val);
            });

            toast.error(
                <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-destructive">
                        <AlertCircle className="h-4 w-4" /> Error de Validación
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Por favor, complete todos los campos obligatorios del
                        Paso 1 antes de continuar.
                    </span>
                </div>,
            );

            return false;
        }

        return true;
    };

    const handleNextStep = () => {
        if (currentStep === 1 && validateStep1()) {
            setCurrentStep(2);
        }
    };

    const validateStep3 = () => {
        clearErrors();
        const localErrors: Record<string, string> = {};

        // Validar campos de facturación (creación)
        if (!data.payment_type) {
            localErrors.payment_type = 'El método de pago es requerido.';
        }

        if (!data.amount) {
            localErrors.amount = 'El importe es requerido.';
        } else if (parseFloat(data.amount) < 0) {
            localErrors.amount = 'El importe debe ser mayor o igual a 0.';
        }

        if (data.custom_amount_enabled) {
            if (!data.custom_amount) {
                localErrors.custom_amount =
                    'El importe personalizado es requerido.';
            } else if (parseFloat(data.custom_amount) < 0) {
                localErrors.custom_amount =
                    'El importe personalizado debe ser mayor o igual a 0.';
            }

            if (
                !data.custom_amount_reason ||
                !data.custom_amount_reason.trim()
            ) {
                localErrors.custom_amount_reason =
                    'El concepto/razón del importe adicional es requerido.';
            }
        }

        if (data.additional_discount_enabled) {
            if (!data.additional_discount) {
                localErrors.additional_discount =
                    'El descuento adicional es requerido.';
            } else {
                const addDiscount = parseFloat(data.additional_discount);

                if (isNaN(addDiscount) || addDiscount < 0) {
                    localErrors.additional_discount =
                        'El descuento adicional debe ser mayor o igual a 0.';
                } else if (
                    addDiscount >
                    maxSpecimenPriceVal * quantityVal +
                        customAmountVal -
                        autoDiscountTotal
                ) {
                    localErrors.additional_discount = `El descuento adicional no puede superar el subtotal (L. ${(maxSpecimenPriceVal * quantityVal + customAmountVal - autoDiscountTotal).toFixed(2)}).`;
                }
            }
        }

        if (data.discount && parseFloat(data.discount) < 0) {
            localErrors.discount = 'El descuento debe ser mayor o igual a 0.';
        }

        if (data.payment_type === 'credit' && data.has_initial_payment) {
            if (!data.initial_payment_amount) {
                localErrors.initial_payment_amount =
                    'El monto de pago inicial es requerido.';
            } else {
                const amt = parseFloat(data.initial_payment_amount);

                if (isNaN(amt) || amt <= 0) {
                    localErrors.initial_payment_amount =
                        'El monto de pago inicial debe ser mayor a cero.';
                } else if (amt > totalVal) {
                    localErrors.initial_payment_amount = `El monto de pago inicial no puede superar el total de la factura (L. ${totalVal.toFixed(2)}).`;
                }
            }

            if (!data.initial_payment_type) {
                localErrors.initial_payment_type =
                    'El tipo de pago inicial es requerido.';
            }
        }

        const needsProof =
            (data.payment_type !== 'credit' && data.payment_type !== 'cash') ||
            (data.payment_type === 'credit' &&
                data.has_initial_payment &&
                data.initial_payment_type !== 'cash');

        if (needsProof && !data.proof_of_payment) {
            localErrors.proof_of_payment =
                'El comprobante de pago es requerido.';
        }

        if (Object.keys(localErrors).length > 0) {
            Object.entries(localErrors).forEach(([key, val]) => {
                setError(key as any, val);
            });

            toast.error(
                <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-destructive">
                        <AlertCircle className="h-4 w-4" /> Error de Validación
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Por favor, complete todos los campos obligatorios del
                        Paso 3 antes de continuar.
                    </span>
                </div>,
            );

            return false;
        }

        return true;
    };

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Si es edición, se guarda directamente sin confirmación de facturación
        if (specimen) {
            submitForm();

            return;
        }

        // Si es creación y estamos en el paso 1, avanzar al paso 2
        if (currentStep === 1) {
            handleNextStep();

            return;
        }

        // Validar campos requeridos nativos en el navegador primero
        if (formRef.current && !formRef.current.reportValidity()) {
            return;
        }

        // Si estamos en el paso 2, validar el paso 2 y mostrar diálogo de confirmación
        if (validateStep3()) {
            setShowConfirm(true);
        }
    };

    const submitForm = () => {
        const options = {
            onBefore: () => {
                if (!specimen) {
                    setIsFacturating(true);
                }
            },
            onSuccess: () => {
                toast.success(
                    specimen
                        ? 'Muestra actualizada'
                        : 'Muestra creada y facturada',
                );
                setIsFacturating(false);
                onSuccess();
            },
            onError: () => {
                setIsFacturating(false);
            },
        };

        if (specimen) {
            post(updateSpecimen(specimen.id).url, options);
        } else {
            post(storeSpecimen().url, options);
        }
    };

    // Maximum prices (regular prices)
    const maxSpecimenPriceVal = React.useMemo(() => {
        if (availablePrices.length === 0) {
            return 0;
        }

        return Math.max(
            ...availablePrices.map((p: any) => parseFloat(p.amount) || 0),
        );
    }, [availablePrices]);

    const maxInsumosTotalVal = React.useMemo(() => {
        return data.insumos.reduce((sum: number, insumo: any) => {
            const maxPrice =
                insumo.prices && insumo.prices.length > 0
                    ? parseFloat(insumo.prices[0].amount)
                    : parseFloat(insumo.sale_price) || insumo.price || 0;

            return sum + maxPrice * insumo.quantity;
        }, 0);
    }, [data.insumos]);

    // retrieve settings
    const { settings } = usePage<any>().props;
    const thirdAgePercent = parseFloat(settings?.third_age_discount || '30');
    const fourthAgePercent = parseFloat(settings?.fourth_age_discount || '40');

    const quantityVal = data.quantity ?? 1;

    // Discounts
    const specimenDiscountVal = React.useMemo(() => {
        const selected = parseFloat(data.selected_price) || 0;

        return Math.max(0, maxSpecimenPriceVal - selected) * quantityVal;
    }, [maxSpecimenPriceVal, data.selected_price, quantityVal]);

    const ageDiscountVal = React.useMemo(() => {
        const selected = parseFloat(data.selected_price) || 0;

        if (data.age_discount_type === 'third') {
            return ((selected * thirdAgePercent) / 100) * quantityVal;
        } else if (data.age_discount_type === 'fourth') {
            return ((selected * fourthAgePercent) / 100) * quantityVal;
        }

        return 0;
    }, [
        data.selected_price,
        data.age_discount_type,
        thirdAgePercent,
        fourthAgePercent,
        quantityVal,
    ]);

    const autoDiscountTotal = specimenDiscountVal + ageDiscountVal;

    React.useEffect(() => {
        if (data.age_discount_amount !== ageDiscountVal.toString()) {
            setData('age_discount_amount', ageDiscountVal.toString());
        }
    }, [ageDiscountVal]);

    React.useEffect(() => {
        const extra = data.custom_amount_enabled
            ? parseFloat(data.custom_amount) || 0
            : 0;
        const amountToSet = maxSpecimenPriceVal * quantityVal + extra;

        if (data.amount !== amountToSet.toString()) {
            setData('amount', amountToSet.toString());
        }
    }, [
        maxSpecimenPriceVal,
        quantityVal,
        data.custom_amount_enabled,
        data.custom_amount,
    ]);

    React.useEffect(() => {
        const additionalDiscountVal = data.additional_discount_enabled
            ? parseFloat(data.additional_discount) || 0
            : 0;
        const totalDiscount = autoDiscountTotal + additionalDiscountVal;

        if (data.discount !== totalDiscount.toString()) {
            setData('discount', totalDiscount.toString());
        }
    }, [
        autoDiscountTotal,
        data.additional_discount_enabled,
        data.additional_discount,
    ]);

    // Cálculos de facturación en tiempo real
    const insumosTotalVal = data.insumos.reduce(
        (sum: number, insumo: any) =>
            sum + parseFloat(insumo.price || 0) * (insumo.quantity || 0),
        0,
    );

    const amountVal = parseFloat(data.amount) || 0;
    const selectedPriceVal = parseFloat(data.selected_price) || 0;
    const customAmountVal = data.custom_amount_enabled
        ? parseFloat(data.custom_amount) || 0
        : 0;
    const additionalDiscountVal = data.additional_discount_enabled
        ? parseFloat(data.additional_discount) || 0
        : 0;
    const discountVal = parseFloat(data.discount) || 0;
    const subtotalVal = Math.max(
        0,
        maxSpecimenPriceVal * quantityVal +
            customAmountVal -
            (autoDiscountTotal + additionalDiscountVal),
    );
    const totalVal = subtotalVal; // taxes are 0

    // Auto-fill detailed payment fields based on totalVal and selections
    React.useEffect(() => {
        if (!isPaymentSheetOpen) {
            return;
        }

        const type = localPayment.payment_type;

        if (type === 'cash') {
            setLocalPayment((prev) => ({
                ...prev,
                cash_value: totalVal.toString(),
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
                check_value: totalVal.toString(),
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
                card_value_charged: totalVal.toString(),
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
                transfer_value: totalVal.toString(),
                cash_value: '',
                check_value: '',
                check_number: '',
                card_value_charged: '',
                card_last_4: '',
                card_expiration: '',
                card_authorization_code: '',
            }));
        } else if (type === 'credit') {
            if (localPayment.has_initial_payment) {
                const initialAmt = localPayment.initial_payment_amount || '0';

                if (localPayment.initial_payment_type === 'cash') {
                    setLocalPayment((prev) => ({
                        ...prev,
                        cash_value: initialAmt,
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
                } else if (localPayment.initial_payment_type === 'check') {
                    setLocalPayment((prev) => ({
                        ...prev,
                        check_value: initialAmt,
                        cash_value: '',
                        card_value_charged: '',
                        card_last_4: '',
                        card_expiration: '',
                        card_authorization_code: '',
                        transfer_value: '',
                        transfer_bank_id: '',
                        transfer_authorization_code: '',
                    }));
                } else if (
                    localPayment.initial_payment_type === 'credit card'
                ) {
                    setLocalPayment((prev) => ({
                        ...prev,
                        card_value_charged: initialAmt,
                        cash_value: '',
                        check_value: '',
                        check_number: '',
                        transfer_value: '',
                        transfer_bank_id: '',
                        transfer_authorization_code: '',
                    }));
                } else if (
                    localPayment.initial_payment_type === 'bank transfer'
                ) {
                    setLocalPayment((prev) => ({
                        ...prev,
                        transfer_value: initialAmt,
                        cash_value: '',
                        check_value: '',
                        check_number: '',
                        card_value_charged: '',
                        card_last_4: '',
                        card_expiration: '',
                        card_authorization_code: '',
                    }));
                }
            } else {
                // reset all details
                setLocalPayment((prev) => ({
                    ...prev,
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
                }));
            }
        }
    }, [
        totalVal,
        localPayment.payment_type,
        localPayment.has_initial_payment,
        localPayment.initial_payment_amount,
        localPayment.initial_payment_type,
        isPaymentSheetOpen,
    ]);

    const selectedCustomer = React.useMemo(() => {
        return customers.find((c) => c.id.toString() === data.customer);
    }, [data.customer, customers]);

    const selectedCustomerLabel = selectedCustomer?.name || 'Sin seleccionar';
    const selectedExaminationLabel =
        examinations.find(
            (e) => e.id.toString() === data.specimen_type_examination,
        )?.name || 'Sin seleccionar';

    const isProofRequired =
        (data.payment_type !== 'credit' && data.payment_type !== 'cash') ||
        (data.payment_type === 'credit' &&
            data.has_initial_payment &&
            data.initial_payment_type !== 'cash');

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
                {data.proof_of_payment && (
                    <div className="mt-2 flex items-center justify-between rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-emerald-600 dark:bg-emerald-500/10">
                        <span className="font-semibold">Comprobante:</span>
                        <span className="max-w-[150px] truncate font-mono text-[10px]">
                            {data.proof_of_payment.name}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {isFacturating &&
                typeof window !== 'undefined' &&
                createPortal(
                    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
                        <Spinner className="h-12 w-12 text-primary" />
                        <div className="flex flex-col items-center text-center">
                            <h3 className="text-lg font-bold text-foreground">
                                Procesando Factura
                            </h3>
                            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                                Estamos registrando la muestra, aplicando el
                                rango CAI y generando el PDF de la factura. Por
                                favor, espere.
                            </p>
                        </div>
                    </div>,
                    document.body,
                )}

            <form
                ref={formRef}
                onSubmit={handlePreSubmit}
                className="flex flex-col gap-6 px-5 py-4 pt-0"
            >
                <div className="mb-2 flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/40 p-4">
                    {!specimen && (
                        <div className="mx-auto flex w-full max-w-lg flex-nowrap items-center justify-center gap-2 border-b border-border/40 pb-4 sm:gap-4">
                            {/* Paso 1 */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (currentStep > 1) {
                                        setCurrentStep(1);
                                    }
                                }}
                                className={cn(
                                    'group flex cursor-pointer items-center gap-2 text-left focus:outline-none sm:gap-3',
                                    currentStep > 1 && 'hover:opacity-80',
                                )}
                            >
                                <div
                                    className={cn(
                                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-200',
                                        currentStep === 1
                                            ? 'bg-primary text-primary-foreground ring-4 ring-primary/10'
                                            : 'bg-emerald-500 text-white',
                                    )}
                                >
                                    {currentStep > 1 ? (
                                        <Check className="h-4.5 w-4.5 stroke-[3]" />
                                    ) : (
                                        '1'
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span
                                        className={cn(
                                            'text-xs leading-none font-bold transition-colors',
                                            currentStep === 1
                                                ? 'text-foreground'
                                                : 'text-muted-foreground group-hover:text-foreground',
                                        )}
                                    >
                                        Paso 1
                                    </span>
                                    <span
                                        className={cn(
                                            'mt-1 hidden text-[11px] leading-none font-medium transition-colors sm:block',
                                            currentStep === 1
                                                ? 'font-semibold text-primary'
                                                : 'text-muted-foreground group-hover:text-foreground',
                                        )}
                                    >
                                        Datos de la Muestra
                                    </span>
                                </div>
                            </button>

                            <div className="h-[2px] w-8 shrink-0 overflow-hidden rounded-full bg-muted-foreground/20 sm:w-12">
                                <div
                                    className={cn(
                                        'h-full bg-primary transition-all duration-300 ease-out',
                                        currentStep > 1 ? 'w-full' : 'w-0',
                                    )}
                                />
                            </div>

                            {/* Paso 2 */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (currentStep === 1 && validateStep1()) {
                                        setCurrentStep(2);
                                    }
                                }}
                                className={cn(
                                    'group flex cursor-pointer items-center gap-2 text-left focus:outline-none sm:gap-3',
                                    currentStep !== 2 && 'hover:opacity-80',
                                )}
                            >
                                <div
                                    className={cn(
                                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-200',
                                        currentStep === 2
                                            ? 'bg-primary text-primary-foreground ring-4 ring-primary/10'
                                            : 'border border-border bg-muted text-muted-foreground',
                                    )}
                                >
                                    2
                                </div>
                                <div className="flex flex-col">
                                    <span
                                        className={cn(
                                            'text-xs leading-none font-bold transition-colors',
                                            currentStep === 2
                                                ? 'text-foreground'
                                                : 'text-muted-foreground group-hover:text-foreground',
                                        )}
                                    >
                                        Paso 2
                                    </span>
                                    <span
                                        className={cn(
                                            'mt-1 hidden text-[11px] leading-none font-medium transition-colors sm:block',
                                            currentStep === 2
                                                ? 'font-semibold text-primary'
                                                : 'text-muted-foreground group-hover:text-foreground',
                                        )}
                                    >
                                        Facturación
                                    </span>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Customer Selection Row inside the gray steps container */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-5">
                            <div className="flex w-full items-center gap-2">
                                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Cliente
                                </span>
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

                                <div className="flex w-full flex-col gap-2">
                                    <FormCombobox
                                        placeholder="Seleccionar cliente"
                                        value={data.customer}
                                        onChange={(v) => setData('customer', v)}
                                        options={customers.map((c) => ({
                                            label: c.name,
                                            value: c.id.toString(),
                                        }))}
                                    />
                                    {errors.customer && (
                                        <p className="text-sm text-xs text-destructive">
                                            {errors.customer}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCustomerSheetOpen(true)}
                                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                                <Plus className="h-3 w-3" /> Nuevo
                            </button>
                        </div>

                        {selectedCustomer && (
                            <div className="grid grid-cols-1 gap-4 border-t border-border/50 pt-3 text-xs sm:grid-cols-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                        RTN / Identidad
                                    </span>
                                    <span className="font-mono font-medium text-foreground">
                                        {selectedCustomer.id_number || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                        Correo Electrónico
                                    </span>
                                    <span className="font-medium break-all text-foreground">
                                        {selectedCustomer.email || 'Sin correo'}
                                    </span>
                                </div>
                                {selectedCustomer.type !== 'empresa' && (
                                    <div className="flex flex-col gap-1">
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
                    </div>
                </div>

                {/* SECCIÓN 1: DATOS DE LA MUESTRA */}
                {(!specimen ? currentStep === 1 : true) && (
                    <div>
                        <h3 className="mb-4 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                            Datos de la Muestra
                        </h3>

                        {specimen && specimen.sequence_code && (
                            <div className="mb-4 flex items-center justify-between rounded-md border border-dashed bg-muted/40 p-3">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                    <Tag className="h-3.5 w-3.5" /> Código de
                                    Secuencia (Muestra):
                                </span>
                                <span className="font-mono text-sm font-bold text-primary">
                                    {specimen.sequence_code}
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4">
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="referrer">
                                        Remitente (Médico)
                                    </Label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsReferrerSheetOpen(true)
                                        }
                                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                    >
                                        <Plus className="h-3 w-3" /> Nuevo
                                    </button>
                                </div>
                                <FormCombobox
                                    placeholder="Seleccionar médico"
                                    value={data.referrer}
                                    onChange={(v) => setData('referrer', v)}
                                    options={referrers.map((r) => ({
                                        label: r.name,
                                        value: r.id.toString(),
                                    }))}
                                />
                                {errors.referrer && (
                                    <p className="text-sm text-destructive">
                                        {errors.referrer}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="specimen_type">
                                        Tipo de Muestra
                                    </Label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsSpecimenTypeSheetOpen(true)
                                        }
                                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                    >
                                        <Plus className="h-3 w-3" /> Nuevo
                                    </button>
                                </div>
                                <FormCombobox
                                    placeholder="Seleccionar tipo"
                                    value={data.specimen_type}
                                    onChange={(v) =>
                                        setData('specimen_type', v)
                                    }
                                    options={sortedSpecimenTypes.map((t) => ({
                                        label: t.name,
                                        value: t.id.toString(),
                                    }))}
                                />

                                {errors.specimen_type && (
                                    <p className="text-sm text-destructive">
                                        {errors.specimen_type}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="specimen_type_examination">
                                        Examen a Realizar
                                    </Label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsExaminationSheetOpen(true)
                                        }
                                        disabled={!data.specimen_type}
                                        className={cn(
                                            'flex items-center gap-1 text-xs font-medium transition-colors',
                                            data.specimen_type
                                                ? 'cursor-pointer text-primary hover:underline'
                                                : 'cursor-not-allowed text-muted-foreground/50',
                                        )}
                                    >
                                        <Plus className="h-3 w-3" /> Nuevo
                                    </button>
                                </div>
                                <FormCombobox
                                    placeholder={
                                        data.specimen_type
                                            ? 'Seleccionar examen'
                                            : 'Seleccione un tipo de muestra primero'
                                    }
                                    value={data.specimen_type_examination}
                                    onChange={(v) =>
                                        setData('specimen_type_examination', v)
                                    }
                                    options={filteredExaminations.map((e) => ({
                                        label: e.name,
                                        value: e.id.toString(),
                                    }))}
                                    disabled={!data.specimen_type}
                                />
                                {errors.specimen_type_examination && (
                                    <p className="text-sm text-destructive">
                                        {errors.specimen_type_examination}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4">
                            {!specimen && data.specimen_type && (
                                <div className="mt-1 transition-all duration-300">
                                    {matchingSequence ? (
                                        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                                            <Tag className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-semibold">
                                                    Secuencia num. activa
                                                    configurada
                                                </span>
                                                <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400">
                                                    Ejemplo de próximo código
                                                    correlativo a ser asignado:
                                                </span>
                                                <div className="mt-1">
                                                    <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                                        {nextSequencePreview}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                                    ¡Falta secuencia de
                                                    numeración!
                                                </span>
                                                <span className="text-[10.5px] leading-normal text-amber-600 dark:text-amber-400">
                                                    No existe una secuencia
                                                    activa para este tipo de
                                                    muestra en la sucursal
                                                    activa. Debe crear una antes
                                                    de poder facturar.
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setIsSequenceSheetOpen(
                                                            true,
                                                        )
                                                    }
                                                    className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 self-start rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Crear Secuencia Ahora
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="specimen_category">
                                        Categoría (Tiempo)
                                    </Label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsCategorySheetOpen(true)
                                        }
                                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                    >
                                        <Plus className="h-3 w-3" /> Nuevo
                                    </button>
                                </div>
                                <FormCombobox
                                    placeholder="Seleccionar categoría"
                                    value={data.specimen_category}
                                    onChange={(v) =>
                                        setData('specimen_category', v)
                                    }
                                    options={categories.map((c) => ({
                                        label: c.name,
                                        value: c.id.toString(),
                                    }))}
                                />
                                {errors.specimen_category && (
                                    <p className="text-sm text-destructive">
                                        {errors.specimen_category}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="priority_id">Prioridad</Label>
                                <FormCombobox
                                    placeholder="Seleccionar prioridad"
                                    value={data.priority_id}
                                    onChange={(v) => setData('priority_id', v)}
                                    options={priorities.map((p) => ({
                                        label: p.name,
                                        value: p.id.toString(),
                                        color: p.color,
                                    }))}
                                />
                                {errors.priority_id && (
                                    <p className="text-sm text-destructive">
                                        {errors.priority_id}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="anatomic_site">
                                    Sitio Anatómico
                                </Label>
                                <Input
                                    id="anatomic_site"
                                    value={data.anatomic_site}
                                    onChange={(e) =>
                                        setData('anatomic_site', e.target.value)
                                    }
                                    placeholder="Ej. Brazo izquierdo..."
                                />
                                {errors.anatomic_site && (
                                    <p className="text-sm text-destructive">
                                        {errors.anatomic_site}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="status">
                                    Estado Inicial / Actual
                                </Label>
                                <FormCombobox
                                    placeholder="Seleccionar estado"
                                    value={data.status}
                                    onChange={(v) => setData('status', v)}
                                    options={[
                                        {
                                            label: 'Recibida',
                                            value: 'received',
                                            color: '#3b82f6',
                                        },
                                        {
                                            label: 'Revisión Macroscópica',
                                            value: 'macroscopic_review',
                                            color: '#8b5cf6',
                                            disabled:
                                                data.status !==
                                                'macroscopic_review',
                                        },
                                        {
                                            label: 'En Proceso',
                                            value: 'processing',
                                            color: '#f59e0b',
                                            disabled:
                                                data.status !== 'processing',
                                        },
                                        {
                                            label: 'Revisión Microscópica',
                                            value: 'microscopic_review',
                                            color: '#d946ef',
                                            disabled:
                                                data.status !==
                                                'microscopic_review',
                                        },
                                        {
                                            label: 'Finalizada',
                                            value: 'finalized',
                                            color: '#10b981',
                                            disabled:
                                                data.status !== 'finalized',
                                        },
                                        {
                                            label: 'Entregada',
                                            value: 'delivered',
                                            color: '#64748b',
                                            disabled:
                                                data.status !== 'delivered',
                                        },
                                        {
                                            label: 'Cancelada',
                                            value: 'cancelled',
                                            color: '#ef4444',
                                            disabled:
                                                data.status !== 'cancelled',
                                        },
                                    ]}
                                />
                                {errors.status && (
                                    <p className="text-sm text-destructive">
                                        {errors.status}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 grid gap-2">
                            <Label htmlFor="medical_order_file">
                                Orden Médica (Archivo PDF o Imagen)
                            </Label>

                            {specimen?.medical_order_file &&
                                !data.medical_order_file && (
                                    <div className="flex items-center justify-between rounded-lg border border-muted bg-muted/40 p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-md bg-primary/10 p-2 text-primary">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-foreground">
                                                    Archivo de Orden Médica
                                                    existente
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Ya hay un archivo subido
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`/storage/${specimen.medical_order_file}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />{' '}
                                                Ver / Descargar
                                            </a>
                                        </div>
                                    </div>
                                )}

                            {data.medical_order_file && (
                                <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-500">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="max-w-[200px] truncate text-xs font-semibold text-foreground sm:max-w-xs">
                                                {data.medical_order_file.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {(
                                                    data.medical_order_file
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
                                            setData('medical_order_file', null)
                                        }
                                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {!data.medical_order_file && (
                                <div className="group relative">
                                    <input
                                        type="file"
                                        id="medical_order_file"
                                        className="hidden"
                                        accept=".pdf,image/*"
                                        onChange={(e) => {
                                            const file =
                                                e.target.files?.[0] || null;

                                            if (
                                                file &&
                                                file.size > 50 * 1024 * 1024
                                            ) {
                                                toast.error(
                                                    'El archivo de Orden Médica no debe exceder los 50MB.',
                                                );
                                                e.target.value = '';

                                                return;
                                            }

                                            setData('medical_order_file', file);
                                        }}
                                    />
                                    <label
                                        htmlFor="medical_order_file"
                                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:bg-accent/10"
                                    >
                                        <div className="mb-2 rounded-full bg-secondary p-2.5 text-secondary-foreground transition-transform duration-200 group-hover:scale-110">
                                            <Upload className="h-4 w-4" />
                                        </div>
                                        <span className="text-xs font-semibold text-foreground">
                                            {specimen?.medical_order_file
                                                ? 'Reemplazar archivo de Orden Médica'
                                                : 'Subir Orden Médica'}
                                        </span>
                                        <span className="mt-1 text-[10px] text-muted-foreground">
                                            PDF o imágenes hasta 50MB
                                        </span>
                                    </label>
                                </div>
                            )}

                            {errors.medical_order_file && (
                                <p className="text-sm text-destructive">
                                    {errors.medical_order_file}
                                </p>
                            )}
                        </div>

                        <div className="mt-4 grid gap-2">
                            <Label htmlFor="diagnosis">
                                Diagnóstico Clínico / Sospecha
                            </Label>
                            <Textarea
                                id="diagnosis"
                                value={data.diagnosis}
                                onChange={(e) =>
                                    setData('diagnosis', e.target.value)
                                }
                                placeholder="Escriba el diagnóstico aquí..."
                                className="resize-none"
                                rows={3}
                            />
                            {errors.diagnosis && (
                                <p className="text-sm text-destructive">
                                    {errors.diagnosis}
                                </p>
                            )}
                        </div>

                        <div className="mt-4 grid gap-2">
                            <Label htmlFor="clinical_notes">
                                Notas Clínicas
                            </Label>
                            <Textarea
                                id="clinical_notes"
                                value={data.clinical_notes}
                                onChange={(e) =>
                                    setData('clinical_notes', e.target.value)
                                }
                                placeholder="Información adicional relevante..."
                                className="resize-none"
                                rows={3}
                            />
                            {errors.clinical_notes && (
                                <p className="text-sm text-destructive">
                                    {errors.clinical_notes}
                                </p>
                            )}
                        </div>

                        {!specimen && (
                            <>
                                <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                                    <div className="flex flex-col gap-0.5">
                                        <Label
                                            htmlFor="agregar-insumos-toggle"
                                            className="cursor-pointer text-sm font-semibold"
                                        >
                                            Agregar insumos
                                        </Label>
                                        <span className="text-xs text-muted-foreground">
                                            Registre los insumos químicos o
                                            reactivos que se utilizarán en el
                                            análisis de esta muestra.
                                        </span>
                                    </div>
                                    <Switch
                                        id="agregar-insumos-toggle"
                                        checked={data.agregar_insumos}
                                        onCheckedChange={(checked) => {
                                            setData((d) => ({
                                                ...d,
                                                agregar_insumos: checked,
                                                insumos: checked
                                                    ? d.insumos
                                                    : [],
                                            }));
                                        }}
                                    />
                                </div>

                                {data.agregar_insumos && (
                                    <div className="mt-4 space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                                Selección de Insumos / Reactivos
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                Busque y agregue los insumos
                                                químicos o reactivos que se
                                                utilizarán en el análisis de
                                                esta muestra.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                                            {/* Columna Izquierda: Buscador e Insumos Disponibles */}
                                            <div className="flex flex-col gap-4 lg:col-span-7">
                                                <div className="relative">
                                                    <Input
                                                        type="text"
                                                        placeholder="Buscar insumo por nombre o código..."
                                                        value={searchQuery}
                                                        onChange={(e) =>
                                                            setSearchQuery(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full pr-8"
                                                    />
                                                    {searchQuery && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSearchQuery(
                                                                    '',
                                                                )
                                                            }
                                                            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="overflow-hidden rounded-xl border bg-card">
                                                    <div className="flex justify-between border-b bg-muted/40 p-3 text-xs font-semibold text-muted-foreground">
                                                        <span>
                                                            Insumo / Descripción
                                                        </span>
                                                        <span>
                                                            Stock Disponible
                                                        </span>
                                                    </div>
                                                    <div className="max-h-[350px] divide-y divide-border overflow-y-auto">
                                                        {filteredProducts.length ===
                                                        0 ? (
                                                            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
                                                                <Microscope className="h-8 w-8 text-muted-foreground/40" />
                                                                <span>
                                                                    No se
                                                                    encontraron
                                                                    insumos
                                                                    disponibles.
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            filteredProducts.map(
                                                                (product) => {
                                                                    const totalStock =
                                                                        parseInt(
                                                                            product.total_stock,
                                                                        ) || 0;
                                                                    const isOutOfStock =
                                                                        totalStock <=
                                                                        0;
                                                                    const isAlreadyAdded =
                                                                        data.insumos.some(
                                                                            (
                                                                                i: any,
                                                                            ) =>
                                                                                i.id ===
                                                                                product.id,
                                                                        );

                                                                    return (
                                                                        <div
                                                                            key={
                                                                                product.id
                                                                            }
                                                                            className={cn(
                                                                                'flex items-center justify-between p-3 transition-colors',
                                                                                isOutOfStock
                                                                                    ? 'bg-muted/10 opacity-70'
                                                                                    : 'hover:bg-accent/10',
                                                                            )}
                                                                        >
                                                                            <div className="flex max-w-[70%] flex-col gap-0.5">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="truncate text-sm font-semibold text-foreground">
                                                                                        {
                                                                                            product.name
                                                                                        }
                                                                                    </span>
                                                                                    <span className="shrink-0 rounded border bg-muted px-1 font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                                                        {
                                                                                            product.code
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                                <span className="truncate text-xs text-muted-foreground">
                                                                                    {product.description ||
                                                                                        'Sin descripción'}
                                                                                </span>
                                                                            </div>

                                                                            <div className="flex items-center gap-3">
                                                                                {isOutOfStock ? (
                                                                                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-destructive/20 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">
                                                                                        Agotado
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                                        {
                                                                                            totalStock
                                                                                        }{' '}
                                                                                        u.
                                                                                    </span>
                                                                                )}

                                                                                <Button
                                                                                    type="button"
                                                                                    size="sm"
                                                                                    variant={
                                                                                        isAlreadyAdded
                                                                                            ? 'secondary'
                                                                                            : 'outline'
                                                                                    }
                                                                                    onClick={() =>
                                                                                        handleAddInsumo(
                                                                                            product,
                                                                                        )
                                                                                    }
                                                                                    disabled={
                                                                                        isOutOfStock
                                                                                    }
                                                                                    className="h-8 shrink-0 font-semibold"
                                                                                >
                                                                                    {isAlreadyAdded ? (
                                                                                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                                                            <Check className="h-3.5 w-3.5" />{' '}
                                                                                            Agregado
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="flex items-center gap-1">
                                                                                            <Plus className="h-3.5 w-3.5" />{' '}
                                                                                            Agregar
                                                                                        </span>
                                                                                    )}
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                },
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Columna Derecha: Insumos Seleccionados */}
                                            <div className="flex flex-col gap-4 lg:col-span-5">
                                                <div className="overflow-hidden rounded-xl border bg-card">
                                                    <div className="flex items-center justify-between border-b bg-muted/40 p-3 text-xs font-bold text-muted-foreground">
                                                        <span>
                                                            Insumos
                                                            Seleccionados
                                                        </span>
                                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                                                            {
                                                                data.insumos
                                                                    .length
                                                            }
                                                        </span>
                                                    </div>

                                                    <div className="flex max-h-[400px] min-h-[250px] flex-col divide-y divide-border overflow-y-auto">
                                                        {data.insumos.length ===
                                                        0 ? (
                                                            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
                                                                <div className="rounded-full bg-secondary p-3 text-muted-foreground/50">
                                                                    <Tag className="h-6 w-6" />
                                                                </div>
                                                                <div className="flex max-w-[200px] flex-col gap-1">
                                                                    <span className="font-bold text-foreground">
                                                                        Lista
                                                                        vacía
                                                                    </span>
                                                                    <span className="text-xs leading-normal text-muted-foreground">
                                                                        Presione
                                                                        "Agregar"
                                                                        en la
                                                                        lista de
                                                                        insumos
                                                                        disponibles.
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            data.insumos.map(
                                                                (
                                                                    insumo: any,
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            insumo.id
                                                                        }
                                                                        className="flex flex-col gap-3 p-3.5 transition-colors hover:bg-accent/5"
                                                                    >
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="flex min-w-0 flex-col gap-0.5">
                                                                                <span className="truncate text-sm font-semibold text-foreground">
                                                                                    {
                                                                                        insumo.name
                                                                                    }
                                                                                </span>
                                                                                <span className="font-mono text-[10px] text-muted-foreground uppercase">
                                                                                    {
                                                                                        insumo.code
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() =>
                                                                                    handleRemoveInsumo(
                                                                                        insumo.id,
                                                                                    )
                                                                                }
                                                                                className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                                            >
                                                                                <X className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>

                                                                        <div className="flex items-center justify-between gap-4">
                                                                            <div className="flex w-[55%] flex-col gap-1">
                                                                                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                                                    Precio
                                                                                </span>
                                                                                <Select
                                                                                    value={parseFloat(
                                                                                        insumo.price ||
                                                                                            0,
                                                                                    ).toString()}
                                                                                    onValueChange={(
                                                                                        val,
                                                                                    ) => {
                                                                                        const parsed =
                                                                                            parseFloat(
                                                                                                val,
                                                                                            );

                                                                                        if (
                                                                                            !isNaN(
                                                                                                parsed,
                                                                                            )
                                                                                        ) {
                                                                                            handleUpdateInsumoPrice(
                                                                                                insumo.id,
                                                                                                parsed,
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <SelectTrigger className="h-8 w-full font-mono text-xs font-medium">
                                                                                        <SelectValue placeholder="Seleccionar precio" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {insumo.prices &&
                                                                                        insumo
                                                                                            .prices
                                                                                            .length >
                                                                                            0 ? (
                                                                                            insumo.prices.map(
                                                                                                (
                                                                                                    p: any,
                                                                                                    idx: number,
                                                                                                ) => {
                                                                                                    const priceStr =
                                                                                                        parseFloat(
                                                                                                            p.amount ||
                                                                                                                0,
                                                                                                        ).toString();

                                                                                                    return (
                                                                                                        <SelectItem
                                                                                                            key={
                                                                                                                idx
                                                                                                            }
                                                                                                            value={
                                                                                                                priceStr
                                                                                                            }
                                                                                                            className="font-mono text-xs"
                                                                                                        >
                                                                                                            L.{' '}
                                                                                                            {parseFloat(
                                                                                                                p.amount ||
                                                                                                                    0,
                                                                                                            ).toFixed(
                                                                                                                2,
                                                                                                            )}
                                                                                                        </SelectItem>
                                                                                                    );
                                                                                                },
                                                                                            )
                                                                                        ) : (
                                                                                            <SelectItem
                                                                                                value={parseFloat(
                                                                                                    insumo.price ||
                                                                                                        0,
                                                                                                ).toString()}
                                                                                                className="font-mono text-xs"
                                                                                            >
                                                                                                L.{' '}
                                                                                                {parseFloat(
                                                                                                    insumo.price ||
                                                                                                        0,
                                                                                                ).toFixed(
                                                                                                    2,
                                                                                                )}
                                                                                            </SelectItem>
                                                                                        )}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>

                                                                            <div className="flex w-[45%] flex-col items-end gap-1">
                                                                                <span className="w-full text-right text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                                                    Cantidad
                                                                                </span>
                                                                                <div className="flex h-8 w-full shrink-0 items-center justify-between rounded-lg border bg-background p-1 shadow-sm">
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        onClick={() =>
                                                                                            handleUpdateInsumoQty(
                                                                                                insumo.id,
                                                                                                insumo.quantity -
                                                                                                    1,
                                                                                            )
                                                                                        }
                                                                                        disabled={
                                                                                            insumo.quantity <=
                                                                                            1
                                                                                        }
                                                                                        className="h-6 w-6 rounded-md"
                                                                                    >
                                                                                        <span className="text-sm leading-none font-bold">
                                                                                            -
                                                                                        </span>
                                                                                    </Button>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="1"
                                                                                        max={
                                                                                            insumo.total_stock
                                                                                        }
                                                                                        value={
                                                                                            insumo.quantity
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) => {
                                                                                            const val =
                                                                                                parseInt(
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                                ) ||
                                                                                                1;
                                                                                            handleUpdateInsumoQty(
                                                                                                insumo.id,
                                                                                                val,
                                                                                            );
                                                                                        }}
                                                                                        className="w-8 shrink-0 border-none p-0 text-center font-mono text-xs font-bold select-all focus:ring-0 focus:outline-none"
                                                                                    />
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        onClick={() =>
                                                                                            handleUpdateInsumoQty(
                                                                                                insumo.id,
                                                                                                insumo.quantity +
                                                                                                    1,
                                                                                            )
                                                                                        }
                                                                                        disabled={
                                                                                            insumo.quantity >=
                                                                                            insumo.total_stock
                                                                                        }
                                                                                        className="h-6 w-6 rounded-md"
                                                                                    >
                                                                                        <span className="text-sm leading-none font-bold">
                                                                                            +
                                                                                        </span>
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="mt-1 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                                                                            <span>
                                                                                Límite:{' '}
                                                                                <strong className="text-foreground">
                                                                                    {
                                                                                        insumo.total_stock
                                                                                    }{' '}
                                                                                    u.
                                                                                </strong>
                                                                            </span>
                                                                            <span className="font-mono">
                                                                                Total:{' '}
                                                                                <strong className="text-xs text-foreground">
                                                                                    L.{' '}
                                                                                    {(
                                                                                        insumo.price *
                                                                                        insumo.quantity
                                                                                    ).toFixed(
                                                                                        2,
                                                                                    )}
                                                                                </strong>
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* SECCIÓN 2: FACTURACIÓN (CREACIÓN SOLAMENTE) */}
                {!specimen && currentStep === 2 && (
                    <>
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Facturación
                            </h3>

                            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                                {/* Left Column: Fields */}
                                <div className="flex flex-col gap-5 lg:col-span-8">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <div className="grid gap-2">
                                            <div className="flex flex-col gap-0.5">
                                                <Label htmlFor="selected_price">
                                                    Importe / Precio Base (L.){' '}
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
                                                </Label>
                                            </div>
                                            <Select
                                                value={data.selected_price}
                                                onValueChange={(val) =>
                                                    setData(
                                                        'selected_price',
                                                        val,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="selected_price"
                                                    className="w-full"
                                                >
                                                    <SelectValue placeholder="Seleccione un precio" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availablePrices.length >
                                                    0 ? (
                                                        availablePrices.map(
                                                            (price: any) => (
                                                                <SelectItem
                                                                    key={
                                                                        price.id
                                                                    }
                                                                    value={price.amount.toString()}
                                                                >
                                                                    L.{' '}
                                                                    {parseFloat(
                                                                        price.amount,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}
                                                                </SelectItem>
                                                            ),
                                                        )
                                                    ) : (
                                                        <SelectItem
                                                            value="0"
                                                            disabled
                                                        >
                                                            No hay precios
                                                            configurados para
                                                            este tipo de muestra
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>

                                            <span className="text-[11px] text-muted-foreground">
                                                <strong className="text-foreground">
                                                    {selectedType?.name ||
                                                        'Sin seleccionar'}
                                                    {selectedExaminationLabel &&
                                                    selectedExaminationLabel !==
                                                        'Sin seleccionar'
                                                        ? ` - ${selectedExaminationLabel}`
                                                        : ''}
                                                </strong>
                                            </span>
                                            {errors.amount && (
                                                <p className="text-sm text-destructive">
                                                    {errors.amount}
                                                </p>
                                            )}
                                        </div>

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

                                        <div className="grid gap-2">
                                            <Label htmlFor="discount">
                                                Descuento Calculado (L.)
                                            </Label>
                                            <Input
                                                id="discount"
                                                type="number"
                                                value={parseFloat(
                                                    data.discount || '0',
                                                ).toFixed(2)}
                                                readOnly
                                                disabled
                                                className="bg-muted font-mono font-semibold text-emerald-600 disabled:opacity-100 dark:text-emerald-400"
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                                Calculado automáticamente basado
                                                en los precios e insumos
                                                seleccionados.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Descuento Adicional */}
                                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-0.5">
                                                <Label
                                                    htmlFor="additional-discount-toggle"
                                                    className="cursor-pointer text-xs font-semibold"
                                                >
                                                    Descuento Adicional
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
                                                        additional_discount:
                                                            checked
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
                                                        Monto de Descuento
                                                        Adicional (L.){' '}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </Label>
                                                    <Input
                                                        id="additional_discount"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={
                                                            data.additional_discount
                                                        }
                                                        onChange={(e) =>
                                                            setData(
                                                                'additional_discount',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                    {errors.additional_discount && (
                                                        <span className="text-[10px] text-destructive">
                                                            {
                                                                errors.additional_discount
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Cobrar otro importe personalizado */}
                                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-0.5">
                                                <Label
                                                    htmlFor="custom-amount-toggle"
                                                    className="cursor-pointer text-xs font-semibold"
                                                >
                                                    Cobrar otro importe
                                                    personalizado
                                                </Label>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Permite agregar un importe
                                                    manual para servicios
                                                    adicionales.
                                                </span>
                                            </div>
                                            <Switch
                                                id="custom-amount-toggle"
                                                checked={
                                                    data.custom_amount_enabled
                                                }
                                                onCheckedChange={(checked) => {
                                                    setData((d) => ({
                                                        ...d,
                                                        custom_amount_enabled:
                                                            checked,
                                                        custom_amount: checked
                                                            ? d.custom_amount ||
                                                              '0'
                                                            : '0',
                                                        custom_amount_reason:
                                                            checked
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
                                                        Importe Adicional
                                                        Personalizado (L.){' '}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </Label>
                                                    <Input
                                                        id="custom_amount"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={
                                                            data.custom_amount
                                                        }
                                                        onChange={(e) =>
                                                            setData(
                                                                'custom_amount',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                    {errors.custom_amount && (
                                                        <span className="text-[10px] text-destructive">
                                                            {
                                                                errors.custom_amount
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="grid gap-1.5">
                                                    <Label
                                                        htmlFor="custom_amount_reason"
                                                        className="text-xs"
                                                    >
                                                        Concepto / Razón del
                                                        Importe Adicional{' '}
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
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Descuentos por Edad (Tercera y Cuarta Edad) */}
                                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                                        <div className="mb-2 flex flex-col gap-0.5 border-b pb-2">
                                            <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                Descuentos por Edad
                                            </Label>
                                            <span className="text-[10px] text-muted-foreground">
                                                Aplique el descuento de la
                                                tercera o cuarta edad al
                                                paciente. Solo se puede aplicar
                                                uno a la vez.
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-0.5">
                                                <Label
                                                    htmlFor="third-age-discount-toggle"
                                                    className="cursor-pointer text-xs font-semibold"
                                                >
                                                    Tercera Edad (
                                                    {thirdAgePercent}%)
                                                </Label>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Aplica {thirdAgePercent}% de
                                                    descuento sobre el precio
                                                    base.
                                                </span>
                                            </div>
                                            <Switch
                                                id="third-age-discount-toggle"
                                                checked={
                                                    data.age_discount_type ===
                                                    'third'
                                                }
                                                onCheckedChange={(checked) => {
                                                    setData(
                                                        'age_discount_type',
                                                        checked
                                                            ? 'third'
                                                            : null,
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
                                                    Cuarta Edad (
                                                    {fourthAgePercent}%)
                                                </Label>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Aplica {fourthAgePercent}%
                                                    de descuento sobre el precio
                                                    base.
                                                </span>
                                            </div>
                                            <Switch
                                                id="fourth-age-discount-toggle"
                                                checked={
                                                    data.age_discount_type ===
                                                    'fourth'
                                                }
                                                onCheckedChange={(checked) => {
                                                    setData(
                                                        'age_discount_type',
                                                        checked
                                                            ? 'fourth'
                                                            : null,
                                                    );
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Detalle y Tipo de Pago Wrapper */}
                                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-semibold">
                                                        Método de pago:
                                                    </span>
                                                    <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary capitalize">
                                                        {getPaymentTypeLabel(
                                                            data.payment_type,
                                                        )}
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setIsPaymentSheetOpen(
                                                            true,
                                                        )
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
                                                    Por favor, configure los
                                                    detalles del pago.
                                                </div>
                                            )}
                                            {errors.payment_type && (
                                                <p className="mt-1 text-sm text-destructive">
                                                    {errors.payment_type}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Comprobante de Pago */}
                                    {((data.payment_type !== 'cash' &&
                                        data.payment_type !== 'credit') ||
                                        (data.payment_type === 'credit' &&
                                            data.has_initial_payment &&
                                            data.initial_payment_type !==
                                                'cash')) && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="proof_of_payment">
                                                Comprobante de Pago (PDF o
                                                Imagen){' '}
                                                {isProofRequired && (
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
                                                )}
                                            </Label>

                                            {data.proof_of_payment && (
                                                <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-500">
                                                            <FileText className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="max-w-[150px] truncate text-xs font-semibold text-foreground sm:max-w-xs">
                                                                {
                                                                    data
                                                                        .proof_of_payment
                                                                        .name
                                                                }
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {(
                                                                    data
                                                                        .proof_of_payment
                                                                        .size /
                                                                    1024 /
                                                                    1024
                                                                ).toFixed(
                                                                    2,
                                                                )}{' '}
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
                                            )}

                                            {!data.proof_of_payment && (
                                                <div className="group relative">
                                                    <input
                                                        type="file"
                                                        id="proof_of_payment"
                                                        className="hidden"
                                                        accept=".pdf,image/*"
                                                        onChange={(e) => {
                                                            const file =
                                                                e.target
                                                                    .files?.[0] ||
                                                                null;

                                                            if (
                                                                file &&
                                                                file.size >
                                                                    50 *
                                                                        1024 *
                                                                        1024
                                                            ) {
                                                                toast.error(
                                                                    'El archivo de Comprobante no debe exceder los 50MB.',
                                                                );
                                                                e.target.value =
                                                                    '';

                                                                return;
                                                            }

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
                                                        <div className="mb-2 rounded-full bg-secondary p-2.5 text-secondary-foreground transition-transform duration-200 group-hover:scale-110">
                                                            <Upload className="h-4 w-4" />
                                                        </div>
                                                        <span className="text-xs font-semibold text-foreground">
                                                            Subir Comprobante
                                                        </span>
                                                        <span className="mt-1 text-[10px] text-muted-foreground">
                                                            PDF o imágenes hasta
                                                            50MB
                                                        </span>
                                                    </label>
                                                </div>
                                            )}
                                            {errors.proof_of_payment && (
                                                <p className="text-sm text-destructive">
                                                    {errors.proof_of_payment}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Breakdown of selected supplies */}
                                    {data.insumos &&
                                        data.insumos.length > 0 && (
                                            <div className="mt-2 overflow-hidden rounded-xl border bg-card">
                                                <div className="flex justify-between border-b bg-muted/40 p-3 text-xs font-semibold text-muted-foreground">
                                                    <span>
                                                        Insumo / Reactivo
                                                        Utilizado
                                                    </span>
                                                    <div className="flex gap-8 text-right font-semibold">
                                                        <span className="w-12">
                                                            Cant.
                                                        </span>
                                                        <span className="w-20">
                                                            Precio U.
                                                        </span>
                                                        <span className="w-20">
                                                            Total
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="divide-y divide-border">
                                                    {data.insumos.map(
                                                        (insumo: any) => (
                                                            <div
                                                                key={insumo.id}
                                                                className="flex items-center justify-between p-3 text-xs"
                                                            >
                                                                <div className="flex min-w-0 flex-col gap-0.5">
                                                                    <span className="max-w-[180px] truncate font-semibold text-foreground sm:max-w-xs">
                                                                        {
                                                                            insumo.name
                                                                        }
                                                                    </span>
                                                                    <span className="font-mono text-[9px] text-muted-foreground uppercase">
                                                                        {
                                                                            insumo.code
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div className="flex shrink-0 gap-8 text-right font-mono text-xs">
                                                                    <span className="w-12 text-muted-foreground">
                                                                        {
                                                                            insumo.quantity
                                                                        }{' '}
                                                                        u.
                                                                    </span>
                                                                    <span className="w-20 text-muted-foreground">
                                                                        L.{' '}
                                                                        {parseFloat(
                                                                            insumo.price ||
                                                                                0,
                                                                        ).toFixed(
                                                                            2,
                                                                        )}
                                                                    </span>
                                                                    <span className="w-20 font-bold text-foreground">
                                                                        L.{' '}
                                                                        {(
                                                                            insumo.price *
                                                                            insumo.quantity
                                                                        ).toFixed(
                                                                            2,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between border-t bg-muted/20 p-3 text-xs font-semibold">
                                                    <span className="text-muted-foreground">
                                                        Subtotal Insumos /
                                                        Reactivos:
                                                    </span>
                                                    <span className="font-mono text-sm text-primary">
                                                        L.{' '}
                                                        {insumosTotalVal.toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                </div>

                                {/* Right Column: Summary Card */}
                                <div className="flex flex-col justify-start lg:col-span-4">
                                    <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-5 shadow-sm dark:bg-muted/10">
                                        <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                            Resumen de Totales
                                        </h4>
                                        <div className="mt-2 flex flex-col gap-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">
                                                    Precio Regular Muestra:
                                                </span>
                                                <span className="font-semibold text-foreground">
                                                    L.{' '}
                                                    {maxSpecimenPriceVal.toFixed(
                                                        2,
                                                    )}
                                                </span>
                                            </div>
                                            {data.custom_amount_enabled && (
                                                <div className="flex flex-col gap-0.5 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                            Importe
                                                            Personalizado:
                                                        </span>
                                                        <span className="font-semibold text-foreground text-primary">
                                                            L.{' '}
                                                            {customAmountVal.toFixed(
                                                                2,
                                                            )}
                                                        </span>
                                                    </div>
                                                    {data.custom_amount_reason && (
                                                        <span className="truncate text-[10px] text-muted-foreground italic">
                                                            Razón:{' '}
                                                            {
                                                                data.custom_amount_reason
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {autoDiscountTotal +
                                                additionalDiscountVal >
                                            0 ? (
                                                <div className="flex flex-col gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                    <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                                                        Descuentos Aplicados
                                                    </span>
                                                    {specimenDiscountVal >
                                                        0 && (
                                                        <div className="flex justify-between text-xs">
                                                            <span>
                                                                Categoría
                                                                Muestra:
                                                            </span>
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
                                                                - L.{' '}
                                                                {ageDiscountVal.toFixed(
                                                                    2,
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {additionalDiscountVal >
                                                        0 && (
                                                        <div className="flex justify-between text-xs">
                                                            <span>
                                                                Descuento
                                                                Adicional:
                                                            </span>
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
                                                        <span>
                                                            Descuento Total:
                                                        </span>
                                                        <span>
                                                            - L.{' '}
                                                            {(
                                                                autoDiscountTotal +
                                                                additionalDiscountVal
                                                            ).toFixed(2)}
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
                                                    <span>
                                                        Importe Exonerado:
                                                    </span>
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
                                                <span className="text-lg font-extrabold text-primary">
                                                    L. {totalVal.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* BOTONES DE ENVÍO */}
                <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
                    {specimen && specimen.created_at ? (
                        <div className="text-sm text-muted-foreground">
                            Creada el:{' '}
                            {new Date(specimen.created_at).toLocaleString(
                                'es-ES',
                                {
                                    dateStyle: 'long',
                                    timeStyle: 'short',
                                },
                            )}
                        </div>
                    ) : !specimen && currentStep > 1 ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep((prev) => prev - 1)}
                            className="w-full sm:w-auto"
                            disabled={processing}
                        >
                            Atrás
                        </Button>
                    ) : (
                        <div />
                    )}

                    {specimen ? (
                        <Button
                            type="submit"
                            disabled={processing}
                            className="w-full sm:w-auto"
                        >
                            {processing && <Spinner className="mr-2" />}
                            Guardar Cambios
                        </Button>
                    ) : currentStep < 2 ? (
                        <Button
                            key="btn-next"
                            type="button"
                            onClick={handleNextStep}
                            className="w-full sm:w-auto"
                            disabled={
                                !specimen &&
                                currentStep === 1 &&
                                !!data.specimen_type &&
                                !matchingSequence
                            }
                        >
                            Siguiente
                        </Button>
                    ) : (
                        <Button
                            key="btn-submit"
                            type="submit"
                            disabled={processing}
                            className="w-full sm:w-auto"
                        >
                            {processing && <Spinner className="mr-2" />}
                            Facturar y Crear Muestra
                        </Button>
                    )}
                </div>
            </form>

            <Sheet
                open={isPaymentSheetOpen}
                onOpenChange={setIsPaymentSheetOpen}
            >
                <SheetContent
                    side="right"
                    className="w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]"
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

            <Sheet
                open={isCustomerSheetOpen}
                onOpenChange={setIsCustomerSheetOpen}
            >
                <SheetContent
                    side="right"
                    className="w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]"
                >
                    <HeadingSheet
                        title="Nuevo Cliente"
                        description="Complete los campos para registrar un nuevo cliente."
                    />
                    <div className="-mx-5 mt-4 px-5">
                        <CustomerForm
                            onSuccess={() => setIsCustomerSheetOpen(false)}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet
                open={isReferrerSheetOpen}
                onOpenChange={setIsReferrerSheetOpen}
            >
                <SheetContent
                    side="right"
                    className="w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]"
                >
                    <HeadingSheet
                        title="Nuevo Remitente"
                        description="Complete los campos para registrar un nuevo remitente."
                    />
                    <div className="-mx-5 mt-4 px-5">
                        <ReferrerForm
                            referrer={null}
                            referrerTypes={referrerTypes}
                            onSuccess={() => setIsReferrerSheetOpen(false)}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet
                open={isSequenceSheetOpen}
                onOpenChange={setIsSequenceSheetOpen}
            >
                <SheetContent
                    side="right"
                    className="w-[400px] overflow-y-auto sm:w-[540px]"
                >
                    <SheetHeader>
                        <SheetTitle>Nueva Secuencia de Numeración</SheetTitle>
                    </SheetHeader>
                    <div className="-mx-5 mt-4 px-5">
                        {isSequenceSheetOpen && (
                            <SequenceForm
                                locations={locations}
                                specimenTypes={specimenTypes}
                                defaultLocationId={
                                    activeLocationId || undefined
                                }
                                defaultSpecimenTypeId={
                                    data.specimen_type
                                        ? parseInt(data.specimen_type)
                                        : undefined
                                }
                                sequences={localSequences}
                                onSuccess={() => {
                                    setIsSequenceSheetOpen(false);
                                }}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet
                open={isSpecimenTypeSheetOpen}
                onOpenChange={setIsSpecimenTypeSheetOpen}
            >
                <SheetContent
                    side="right"
                    className="w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]"
                >
                    <HeadingSheet
                        title="Nuevo Tipo de Muestra"
                        description="Complete el formulario para crear un nuevo tipo de muestra."
                    />
                    <div className="-mx-5 mt-4 px-5">
                        <SpecimenTypeForm
                            specimenType={null}
                            onSuccess={() => setIsSpecimenTypeSheetOpen(false)}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            <SpecimenTypeExaminationSheet
                examination={null}
                specimenTypes={specimenTypes}
                open={isExaminationSheetOpen}
                onOpenChange={setIsExaminationSheetOpen}
                defaultSpecimenTypeId={data.specimen_type}
            />

            <CategorySheet
                category={null}
                open={isCategorySheetOpen}
                onOpenChange={setIsCategorySheetOpen}
            />

            {/* CONFIRMACIÓN DE DIÁLOGO SHADCN (ALERTDIALOG) */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="max-w-[500px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Resumen de Factura y Transacción
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Revise detalladamente los importes antes de emitir
                            la factura fiscal.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="grid gap-3 py-3 text-sm">
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Cliente / Paciente:
                            </span>
                            <span className="font-semibold text-foreground">
                                {selectedCustomerLabel}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Examen:
                            </span>
                            <span className="max-w-[250px] truncate font-semibold text-foreground">
                                {selectedExaminationLabel}
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

                        {data.agregar_insumos &&
                            data.insumos &&
                            data.insumos.length > 0 && (
                                <div className="flex flex-col gap-1.5 border-b pb-2">
                                    <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                                        Insumos Seleccionados (Consumo Interno):
                                    </span>
                                    <div className="flex max-h-[120px] flex-col gap-1.5 overflow-y-auto pr-1">
                                        {data.insumos.map((insumo: any) => (
                                            <div
                                                key={insumo.id}
                                                className="flex items-center justify-between rounded border border-border/50 bg-muted/30 p-1.5 text-xs"
                                            >
                                                <div className="flex min-w-0 flex-col">
                                                    <span className="max-w-[220px] truncate font-semibold text-foreground">
                                                        {insumo.name}
                                                    </span>
                                                    <span className="font-mono text-[9px] text-muted-foreground uppercase">
                                                        {insumo.code}
                                                    </span>
                                                </div>
                                                <div className="shrink-0 text-right font-mono text-xs">
                                                    <span className="mr-2 text-[10px] text-muted-foreground">
                                                        {insumo.quantity}x
                                                    </span>
                                                    <span className="font-bold text-emerald-600">
                                                        L. 0.00
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Precio Regular Muestra:
                            </span>
                            <span className="font-semibold text-foreground">
                                L. {maxSpecimenPriceVal.toFixed(2)}
                            </span>
                        </div>
                        {data.custom_amount_enabled && (
                            <div className="flex flex-col gap-0.5 border-b pb-2">
                                <div className="flex justify-between">
                                    <span className="font-medium text-muted-foreground">
                                        Importe Personalizado:
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        L. {customAmountVal.toFixed(2)}
                                    </span>
                                </div>
                                {data.custom_amount_reason && (
                                    <span className="text-left text-[10px] text-muted-foreground italic">
                                        Razón: {data.custom_amount_reason}
                                    </span>
                                )}
                            </div>
                        )}
                        {data.agregar_insumos &&
                            data.insumos &&
                            data.insumos.length > 0 && (
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-muted-foreground">
                                        Insumos y Reactivos (Reg.):
                                    </span>
                                    <span className="font-semibold text-emerald-600">
                                        L. 0.00 (Consumo Interno)
                                    </span>
                                </div>
                            )}
                        {autoDiscountTotal + additionalDiscountVal > 0 ? (
                            <div className="flex flex-col gap-1.5 rounded border border-b border-emerald-500/20 bg-emerald-500/5 p-2.5 pb-2 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                                <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                                    Descuentos Aplicados
                                </span>
                                {specimenDiscountVal > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span>Categoría Muestra:</span>
                                        <span className="font-semibold">
                                            - L.{' '}
                                            {specimenDiscountVal.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                {additionalDiscountVal > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span>Descuento Adicional:</span>
                                        <span className="font-semibold">
                                            - L.{' '}
                                            {additionalDiscountVal.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-emerald-500/20 pt-1 text-xs font-bold">
                                    <span>Total Descuentos:</span>
                                    <span>
                                        - L.{' '}
                                        {(
                                            autoDiscountTotal +
                                            additionalDiscountVal
                                        ).toFixed(2)}
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
                        <div className="flex justify-between border-b pb-2 text-xs">
                            <span className="font-medium text-muted-foreground">
                                Importe Exonerado:
                            </span>
                            <span className="font-semibold text-foreground">
                                L. {totalVal.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2 text-xs">
                            <span className="font-medium text-muted-foreground">
                                Importe Exento:
                            </span>
                            <span className="font-semibold text-foreground">
                                L. 0.00
                            </span>
                        </div>
                        <div className="flex justify-between pt-1 text-base font-bold">
                            <span>TOTAL NETO A PAGAR:</span>
                            <span className="text-primary">
                                L. {totalVal.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setShowConfirm(false)}
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowConfirm(false);
                                submitForm();
                            }}
                        >
                            Confirmar y Emitir Factura
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
