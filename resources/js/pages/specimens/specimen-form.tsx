import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus, Upload, FileText, X, ExternalLink, AlertCircle, Tag, Microscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import CustomerForm from '../customers/customer-form';
import SequenceForm from '../sequences/sequence-form';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    store as storeSpecimen,
    update as updateSpecimen
} from '@/actions/App/Http/Controllers/SpecimenController';

interface Props {
    specimen: any | null;
    onSuccess: () => void;
    setIsDirty?: (dirty: boolean) => void;
    customers: any[];
    specimenTypes: any[];
    examinations: any[];
    categories: any[];
    referrers: any[];
    priorities: any[];
    locations: any[];
    sequences: any[];
    activeLocationId: number | null;
    products?: any[];
}

function FormCombobox({
    options,
    value,
    onChange,
    placeholder,
    emptyMessage = 'No se encontraron resultados.'
}: {
    options: { label: string; value: string; color?: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    emptyMessage?: string;
}) {
    const [open, setOpen] = React.useState(false);
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    <div className="flex items-center gap-2 truncate">
                        {selectedOption?.color && (
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedOption.color }} />
                        )}
                        <span className="truncate">
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar ${placeholder.toLowerCase()}...`} />
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
                                            "mr-2 h-4 w-4 shrink-0",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.color && (
                                        <div className="mr-2 w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: option.color }} />
                                    )}
                                    <span className="truncate">{option.label}</span>
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
    priorities,
    locations = [],
    sequences = [],
    activeLocationId = null,
    products = []
}: Props) {
    const [isCustomerSheetOpen, setIsCustomerSheetOpen] = React.useState(false);
    const [isSequenceSheetOpen, setIsSequenceSheetOpen] = React.useState(false);
    const [localSequences, setLocalSequences] = React.useState<any[]>(sequences);
    const [showConfirm, setShowConfirm] = React.useState(false);
    const [isFacturating, setIsFacturating] = React.useState(false);
    const [currentStep, setCurrentStep] = React.useState(1);
    const [searchQuery, setSearchQuery] = React.useState('');
    const formRef = React.useRef<HTMLFormElement>(null);

    React.useEffect(() => {
        setLocalSequences(sequences);
    }, [sequences]);

    const { data, setData, post, processing, errors, setError, clearErrors, isDirty } = useForm({
        _method: specimen ? 'PUT' : undefined,
        customer: specimen?.customer ? specimen.customer.toString() : '',
        specimen_type: specimen?.specimen_type ? specimen.specimen_type.toString() : '',
        specimen_type_examination: specimen?.specimen_type_examination ? specimen.specimen_type_examination.toString() : '',
        specimen_category: specimen?.specimen_category ? specimen.specimen_category.toString() : '',
        referrer: specimen?.referrer ? specimen.referrer.toString() : '',
        anatomic_site: specimen?.anatomic_site || '',
        diagnosis: specimen?.diagnosis || '',
        clinical_notes: specimen?.clinical_notes || '',
        status: specimen?.status || 'received',
        priority_id: specimen?.priority_id ? specimen.priority_id.toString() : '',
        medical_order_file: null as File | null,

        // Billing fields (creation only)
        amount: '',
        selected_price: '',
        custom_amount_enabled: false,
        custom_amount: '0',
        custom_amount_reason: '',
        discount: '0',
        payment_type: 'cash',
        proof_of_payment: null as File | null,
        has_initial_payment: false,
        initial_payment_amount: '',
        initial_payment_type: 'cash',

        // Insumos field (creation only)
        insumos: [] as Array<{ id: number; quantity: number; name: string; code: string; total_stock: number; price: number; prices: any[] }>,
    });

    const filteredProducts = React.useMemo(() => {
        return products.filter(product =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.code.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [products, searchQuery]);

    const selectedType = React.useMemo(() => {
        return specimenTypes.find(t => t.id.toString() === data.specimen_type);
    }, [data.specimen_type, specimenTypes]);

    const availablePrices = React.useMemo(() => {
        return selectedType?.prices || [];
    }, [selectedType]);

    React.useEffect(() => {
        if (!data.specimen_type) {
            setData('selected_price', '');
            return;
        }
        const selected = specimenTypes.find(t => t.id.toString() === data.specimen_type);
        const prices = selected?.prices || [];
        if (prices.length > 0) {
            const sortedPrices = [...prices].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
            setData('selected_price', sortedPrices[0].amount.toString());
        } else {
            setData('selected_price', '');
        }
    }, [data.specimen_type, specimenTypes]);


    const handleAddInsumo = (product: any) => {
        if (data.insumos.some((i: any) => i.id === product.id)) {
            toast.info(`El producto "${product.name}" ya ha sido agregado.`);
            return;
        }

        const sortedPrices = [...(product.prices || [])].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
        const defaultPrice = sortedPrices.length > 0 ? parseFloat(sortedPrices[0].amount) : (parseFloat(product.sale_price) || 0);

        const newInsumo = {
            id: product.id,
            name: product.name,
            code: product.code,
            quantity: 1,
            total_stock: parseInt(product.total_stock) || 0,
            price: defaultPrice,
            prices: sortedPrices,
            sale_price: parseFloat(product.sale_price) || 0
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
        if (specimen || !data.specimen_type || !activeLocationId) return null;
        return localSequences.find(
            s => s.specimen_type.toString() === data.specimen_type &&
                s.location_id === activeLocationId &&
                s.active
        );
    }, [specimen, data.specimen_type, localSequences, activeLocationId]);

    const nextSequencePreview = React.useMemo(() => {
        if (!matchingSequence) return '';
        const fillWidth = matchingSequence.fill ?? 4;
        const paddedSeq = String(matchingSequence.current_sequence).padStart(fillWidth, '0');
        const paddedMonth = String(matchingSequence.month).padStart(2, '0');
        return `${matchingSequence.prefix}${matchingSequence.separator}${paddedSeq}${matchingSequence.separator}${paddedMonth}${matchingSequence.separator}${matchingSequence.year}`;
    }, [matchingSequence]);

    const validateStep1 = () => {
        clearErrors();
        const localErrors: Record<string, string> = {};

        // Validar campos de la muestra
        if (!data.customer) localErrors.customer = 'El paciente es requerido.';
        if (!data.referrer) localErrors.referrer = 'El médico remitente es requerido.';
        if (!data.specimen_type) {
            localErrors.specimen_type = 'El tipo de muestra es requerido.';
        } else if (!specimen && !matchingSequence) {
            localErrors.specimen_type = 'No existe una secuencia de numeración activa configurada para este tipo de muestra.';
        }
        if (!data.specimen_type_examination) localErrors.specimen_type_examination = 'El examen a realizar es requerido.';
        if (!data.specimen_category) localErrors.specimen_category = 'La categoría de tiempo es requerida.';
        if (!data.priority_id) localErrors.priority_id = 'La prioridad es requerida.';
        if (!data.anatomic_site.trim()) localErrors.anatomic_site = 'El sitio anatómico es requerido.';
        if (!data.status) localErrors.status = 'El estado es requerido.';

        // El archivo de orden médica es requerido al crear
        if (!data.medical_order_file) {
            localErrors.medical_order_file = 'El archivo de orden médica es requerido.';
        }

        if (Object.keys(localErrors).length > 0) {
            Object.entries(localErrors).forEach(([key, val]) => {
                setError(key as any, val);
            });

            toast.error(
                <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm text-destructive flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" /> Error de Validación
                    </span>
                    <span className="text-xs text-muted-foreground">Por favor, complete todos los campos obligatorios del Paso 1 antes de continuar.</span>
                </div>
            );
            return false;
        }
        return true;
    };

    const handleNextStep = () => {
        if (currentStep === 1 && validateStep1()) {
            setCurrentStep(2);
        } else if (currentStep === 2) {
            setCurrentStep(3);
        }
    };

    const validateStep3 = () => {
        clearErrors();
        const localErrors: Record<string, string> = {};

        // Validar campos de facturación (creación)
        if (!data.amount) {
            localErrors.amount = 'El importe es requerido.';
        } else if (parseFloat(data.amount) < 0) {
            localErrors.amount = 'El importe debe ser mayor o igual a 0.';
        }

        if (data.custom_amount_enabled) {
            if (!data.custom_amount) {
                localErrors.custom_amount = 'El importe personalizado es requerido.';
            } else if (parseFloat(data.custom_amount) < 0) {
                localErrors.custom_amount = 'El importe personalizado debe ser mayor o igual a 0.';
            }
            if (!data.custom_amount_reason || !data.custom_amount_reason.trim()) {
                localErrors.custom_amount_reason = 'El concepto/razón del importe adicional es requerido.';
            }
        }

        if (data.discount && parseFloat(data.discount) < 0) {
            localErrors.discount = 'El descuento debe ser mayor o igual a 0.';
        }

        if (data.payment_type === 'credit' && data.has_initial_payment) {
            if (!data.initial_payment_amount) {
                localErrors.initial_payment_amount = 'El monto de pago inicial es requerido.';
            } else {
                const amt = parseFloat(data.initial_payment_amount);
                if (isNaN(amt) || amt <= 0) {
                    localErrors.initial_payment_amount = 'El monto de pago inicial debe ser mayor a cero.';
                } else if (amt > totalVal) {
                    localErrors.initial_payment_amount = `El monto de pago inicial no puede superar el total de la factura (L. ${totalVal.toFixed(2)}).`;
                }
            }
            if (!data.initial_payment_type) {
                localErrors.initial_payment_type = 'El tipo de pago inicial es requerido.';
            }
        }

        const needsProof = data.payment_type !== 'credit' || (data.payment_type === 'credit' && data.has_initial_payment);
        if (needsProof && !data.proof_of_payment) {
            localErrors.proof_of_payment = 'El comprobante de pago es requerido.';
        }

        if (Object.keys(localErrors).length > 0) {
            Object.entries(localErrors).forEach(([key, val]) => {
                setError(key as any, val);
            });

            toast.error(
                <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm text-destructive flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" /> Error de Validación
                    </span>
                    <span className="text-xs text-muted-foreground">Por favor, complete todos los campos obligatorios del Paso 3 antes de continuar.</span>
                </div>
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

        // Si es creación y estamos en el paso 2, avanzar al paso 3
        if (currentStep === 2) {
            handleNextStep();
            return;
        }

        // Validar campos requeridos nativos en el navegador primero
        if (formRef.current && !formRef.current.reportValidity()) {
            return;
        }

        // Si estamos en el paso 3, validar el paso 3 y mostrar diálogo de confirmación
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
                toast.success(specimen ? 'Muestra actualizada' : 'Muestra creada y facturada');
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
        if (availablePrices.length === 0) return 0;
        return Math.max(...availablePrices.map((p: any) => parseFloat(p.amount) || 0));
    }, [availablePrices]);

    const maxInsumosTotalVal = React.useMemo(() => {
        return data.insumos.reduce((sum: number, insumo: any) => {
            const maxPrice = insumo.prices && insumo.prices.length > 0
                ? parseFloat(insumo.prices[0].amount)
                : (parseFloat(insumo.sale_price) || insumo.price || 0);
            return sum + (maxPrice * insumo.quantity);
        }, 0);
    }, [data.insumos]);

    // Discounts
    const specimenDiscountVal = React.useMemo(() => {
        const selected = parseFloat(data.selected_price) || 0;
        return Math.max(0, maxSpecimenPriceVal - selected);
    }, [maxSpecimenPriceVal, data.selected_price]);

    const insumosDiscountVal = React.useMemo(() => {
        return data.insumos.reduce((sum: number, insumo: any) => {
            const maxPrice = insumo.prices && insumo.prices.length > 0
                ? parseFloat(insumo.prices[0].amount)
                : (parseFloat(insumo.sale_price) || insumo.price || 0);
            const discountPerUnit = Math.max(0, maxPrice - insumo.price);
            return sum + (discountPerUnit * insumo.quantity);
        }, 0);
    }, [data.insumos]);

    const autoDiscountTotal = specimenDiscountVal + insumosDiscountVal;

    React.useEffect(() => {
        const extra = data.custom_amount_enabled ? (parseFloat(data.custom_amount) || 0) : 0;
        const amountToSet = maxSpecimenPriceVal + extra + insumosDiscountVal;
        if (data.amount !== amountToSet.toString()) {
            setData('amount', amountToSet.toString());
        }
    }, [maxSpecimenPriceVal, data.custom_amount_enabled, data.custom_amount, insumosDiscountVal]);

    React.useEffect(() => {
        if (data.discount !== autoDiscountTotal.toString()) {
            setData('discount', autoDiscountTotal.toString());
        }
    }, [autoDiscountTotal]);

    // Cálculos de facturación en tiempo real
    const insumosTotalVal = data.insumos.reduce((sum: number, insumo: any) => sum + (parseFloat(insumo.price || 0) * (insumo.quantity || 0)), 0);

    const amountVal = parseFloat(data.amount) || 0;
    const selectedPriceVal = parseFloat(data.selected_price) || 0;
    const customAmountVal = data.custom_amount_enabled ? (parseFloat(data.custom_amount) || 0) : 0;
    const discountVal = parseFloat(data.discount) || 0;
    const subtotalVal = Math.max(0, maxSpecimenPriceVal + maxInsumosTotalVal + customAmountVal - autoDiscountTotal);
    const totalVal = subtotalVal; // taxes are 0

    const selectedCustomerLabel = customers.find(c => c.id.toString() === data.customer)?.name || 'Sin seleccionar';
    const selectedExaminationLabel = examinations.find(e => e.id.toString() === data.specimen_type_examination)?.name || 'Sin seleccionar';

    const getPaymentTypeLabel = (type: string) => {
        switch (type) {
            case 'cash': return 'Efectivo';
            case 'credit card': return 'Tarjeta de Crédito';
            case 'bank transfer': return 'Transferencia Bancaria';
            case 'credit': return 'Al Crédito';
            default: return type;
        }
    };

    return (
        <>
            {isFacturating && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4">
                    <Spinner className="w-12 h-12 text-primary" />
                    <div className="flex flex-col items-center text-center">
                        <h3 className="text-lg font-bold text-foreground">Procesando Factura</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mt-1">
                            Estamos registrando la muestra, aplicando el rango CAI y generando el PDF de la factura. Por favor, espere.
                        </p>
                    </div>
                </div>
            )}

            <form ref={formRef} onSubmit={handlePreSubmit} className="flex flex-col gap-6 py-4 px-5">

                {/* Wizard Steps Header */}
                {!specimen && (
                    <div className="mb-2 flex items-center justify-center flex-wrap gap-4 bg-muted/40 p-4 rounded-lg border border-border/60">
                        {/* Paso 1 */}
                        <button
                            type="button"
                            onClick={() => {
                                if (currentStep > 1) {
                                    setCurrentStep(1);
                                }
                            }}
                            className={cn(
                                "flex items-center gap-3 group text-left cursor-pointer focus:outline-none",
                                currentStep > 1 && "hover:opacity-80"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 shrink-0",
                                currentStep === 1
                                    ? "bg-primary text-primary-foreground ring-4 ring-primary/10"
                                    : "bg-emerald-500 text-white"
                            )}>
                                {currentStep > 1 ? <Check className="w-4.5 h-4.5 stroke-[3]" /> : "1"}
                            </div>
                            <div className="flex flex-col">
                                <span className={cn(
                                    "text-xs font-bold leading-none transition-colors",
                                    currentStep === 1 ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                    Paso 1
                                </span>
                                <span className={cn(
                                    "text-[11px] font-medium mt-0.5 leading-none transition-colors",
                                    currentStep === 1 ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                    Datos de la Muestra
                                </span>
                            </div>
                        </button>

                        <div className="h-[2px] w-12 bg-muted-foreground/20 rounded-full overflow-hidden shrink-0">
                            <div className={cn(
                                "h-full bg-primary transition-all duration-300 ease-out",
                                currentStep > 1 ? "w-full" : "w-0"
                            )} />
                        </div>

                        {/* Paso 2 */}
                        <button
                            type="button"
                            onClick={() => {
                                if (currentStep === 1 && validateStep1()) {
                                    setCurrentStep(2);
                                } else if (currentStep === 3) {
                                    setCurrentStep(2);
                                }
                            }}
                            className={cn(
                                "flex items-center gap-3 group text-left cursor-pointer focus:outline-none",
                                currentStep !== 2 && "hover:opacity-80"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 shrink-0",
                                currentStep === 2
                                    ? "bg-primary text-primary-foreground ring-4 ring-primary/10"
                                    : currentStep > 2
                                        ? "bg-emerald-500 text-white"
                                        : "bg-muted text-muted-foreground border border-border"
                            )}>
                                {currentStep > 2 ? <Check className="w-4.5 h-4.5 stroke-[3]" /> : "2"}
                            </div>
                            <div className="flex flex-col">
                                <span className={cn(
                                    "text-xs font-bold leading-none transition-colors",
                                    currentStep === 2 ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                    Paso 2
                                </span>
                                <span className={cn(
                                    "text-[11px] font-medium mt-0.5 leading-none transition-colors",
                                    currentStep === 2 ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                    Insumos
                                </span>
                            </div>
                        </button>

                        <div className="h-[2px] w-12 bg-muted-foreground/20 rounded-full overflow-hidden shrink-0">
                            <div className={cn(
                                "h-full bg-primary transition-all duration-300 ease-out",
                                currentStep > 2 ? "w-full" : "w-0"
                            )} />
                        </div>

                        {/* Paso 3 */}
                        <button
                            type="button"
                            onClick={() => {
                                if (currentStep === 1 && validateStep1()) {
                                    setCurrentStep(3);
                                } else if (currentStep === 2) {
                                    setCurrentStep(3);
                                }
                            }}
                            className={cn(
                                "flex items-center gap-3 group text-left cursor-pointer focus:outline-none",
                                currentStep !== 3 && "hover:opacity-80"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 shrink-0",
                                currentStep === 3
                                    ? "bg-primary text-primary-foreground ring-4 ring-primary/10"
                                    : "bg-muted text-muted-foreground border border-border"
                            )}>
                                3
                            </div>
                            <div className="flex flex-col">
                                <span className={cn(
                                    "text-xs font-bold leading-none transition-colors",
                                    currentStep === 3 ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                    Paso 3
                                </span>
                                <span className={cn(
                                    "text-[11px] font-medium mt-0.5 leading-none transition-colors",
                                    currentStep === 3 ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                    Facturación
                                </span>
                            </div>
                        </button>
                    </div>
                )}

                {/* SECCIÓN 1: DATOS DE LA MUESTRA */}
                {(!specimen ? currentStep === 1 : true) && (
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                            Datos de la Muestra
                        </h3>

                        {specimen && specimen.sequence_code && (
                            <div className="mb-4 bg-muted/40 p-3 rounded-md border border-dashed flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5" /> Código de Secuencia (Muestra):
                                </span>
                                <span className="font-mono text-sm font-bold text-primary">{specimen.sequence_code}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="customer">Cliente / Paciente</Label>
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomerSheetOpen(true)}
                                        className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Nuevo
                                    </button>
                                </div>
                                <FormCombobox
                                    placeholder="Seleccionar cliente"
                                    value={data.customer}
                                    onChange={(v) => setData('customer', v)}
                                    options={customers.map(c => ({ label: c.name, value: c.id.toString() }))}
                                />
                                {errors.customer && <p className="text-sm text-destructive">{errors.customer}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="referrer">Remitente (Médico)</Label>
                                <FormCombobox
                                    placeholder="Seleccionar médico"
                                    value={data.referrer}
                                    onChange={(v) => setData('referrer', v)}
                                    options={referrers.map(r => ({ label: r.name, value: r.id.toString() }))}
                                />
                                {errors.referrer && <p className="text-sm text-destructive">{errors.referrer}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="specimen_type">Tipo de Muestra</Label>
                                <FormCombobox
                                    placeholder="Seleccionar tipo"
                                    value={data.specimen_type}
                                    onChange={(v) => setData('specimen_type', v)}
                                    options={specimenTypes.map(t => ({ label: t.name, value: t.id.toString() }))}
                                />

                                {errors.specimen_type && <p className="text-sm text-destructive">{errors.specimen_type}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="specimen_type_examination">Examen a Realizar</Label>
                                <FormCombobox
                                    placeholder="Seleccionar examen"
                                    value={data.specimen_type_examination}
                                    onChange={(v) => setData('specimen_type_examination', v)}
                                    options={examinations.map(e => ({ label: e.name, value: e.id.toString() }))}
                                />
                                {errors.specimen_type_examination && <p className="text-sm text-destructive">{errors.specimen_type_examination}</p>}
                            </div>
                        </div>

                        <div className="mt-4">
                            {!specimen && data.specimen_type && (
                                <div className="mt-1 transition-all duration-300">
                                    {matchingSequence ? (
                                        <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                                            <Tag className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-semibold">Secuencia num. activa configurada</span>
                                                <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400">
                                                    Ejemplo de próximo código correlativo a ser asignado:
                                                </span>
                                                <div className="mt-1">
                                                    <span className="font-mono font-bold bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400 text-xs border border-emerald-500/20">
                                                        {nextSequencePreview}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">¡Falta secuencia de numeración!</span>
                                                <span className="text-[10.5px] leading-normal text-amber-600 dark:text-amber-400">
                                                    No existe una secuencia activa para este tipo de muestra en la sucursal activa. Debe crear una antes de poder facturar.
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsSequenceSheetOpen(true)}
                                                    className="mt-1.5 inline-flex items-center gap-1.5 self-start px-3 py-1.5 text-[11px] font-semibold rounded-md bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 dark:hover:bg-amber-500/30 transition-colors cursor-pointer"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Crear Secuencia Ahora
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="specimen_category">Categoría (Tiempo)</Label>
                                <FormCombobox
                                    placeholder="Seleccionar categoría"
                                    value={data.specimen_category}
                                    onChange={(v) => setData('specimen_category', v)}
                                    options={categories.map(c => ({ label: c.name, value: c.id.toString() }))}
                                />
                                {errors.specimen_category && <p className="text-sm text-destructive">{errors.specimen_category}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="priority_id">Prioridad</Label>
                                <FormCombobox
                                    placeholder="Seleccionar prioridad"
                                    value={data.priority_id}
                                    onChange={(v) => setData('priority_id', v)}
                                    options={priorities.map(p => ({ label: p.name, value: p.id.toString(), color: p.color }))}
                                />
                                {errors.priority_id && <p className="text-sm text-destructive">{errors.priority_id}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="anatomic_site">Sitio Anatómico</Label>
                                <Input
                                    id="anatomic_site"
                                    value={data.anatomic_site}
                                    onChange={(e) => setData('anatomic_site', e.target.value)}
                                    placeholder="Ej. Brazo izquierdo..."
                                    required
                                />
                                {errors.anatomic_site && <p className="text-sm text-destructive">{errors.anatomic_site}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="status">Estado Inicial / Actual</Label>
                                <FormCombobox
                                    placeholder="Seleccionar estado"
                                    value={data.status}
                                    onChange={(v) => setData('status', v)}
                                    options={[
                                        { label: 'Recibida', value: 'received', color: '#3b82f6' },
                                        { label: 'Revisión Macroscópica', value: 'macroscopic_review', color: '#8b5cf6' },
                                        { label: 'En Proceso', value: 'processing', color: '#f59e0b' },
                                        { label: 'Revisión Microscópica', value: 'microscopic_review', color: '#d946ef' },
                                        { label: 'Finalizada', value: 'finalized', color: '#10b981' },
                                        { label: 'Entregada', value: 'delivered', color: '#64748b' },
                                        { label: 'Cancelada', value: 'cancelled', color: '#ef4444' },
                                    ]}
                                />
                                {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
                            </div>
                        </div>

                        <div className="grid gap-2 mt-4">
                            <Label htmlFor="medical_order_file">Orden Médica (Archivo PDF o Imagen) <span className="text-destructive">*</span></Label>

                            {specimen?.medical_order_file && !data.medical_order_file && (
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40 border-muted">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-md text-primary">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold text-foreground">Archivo de Orden Médica existente</span>
                                            <span className="text-[10px] text-muted-foreground">Ya hay un archivo subido</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`/storage/${specimen.medical_order_file}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background hover:bg-muted border rounded-md shadow-sm transition-colors text-foreground"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" /> Ver / Descargar
                                        </a>
                                    </div>
                                </div>
                            )}

                            {data.medical_order_file && (
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-md text-emerald-500">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                                                {data.medical_order_file.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {(data.medical_order_file.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setData('medical_order_file', null)}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}

                            {(!data.medical_order_file) && (
                                <div className="relative group">
                                    <input
                                        type="file"
                                        id="medical_order_file"
                                        className="hidden"
                                        accept=".pdf,image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setData('medical_order_file', file);
                                        }}
                                    />
                                    <label
                                        htmlFor="medical_order_file"
                                        className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 rounded-lg p-5 cursor-pointer bg-card hover:bg-accent/10 transition-all duration-200"
                                    >
                                        <div className="p-2.5 bg-secondary rounded-full text-secondary-foreground group-hover:scale-110 transition-transform duration-200 mb-2">
                                            <Upload className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-semibold text-foreground">
                                            {specimen?.medical_order_file ? 'Reemplazar archivo de Orden Médica' : 'Subir Orden Médica'}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground mt-1">
                                            PDF hasta 30MB, imágenes hasta 10MB
                                        </span>
                                    </label>
                                </div>
                            )}

                            {errors.medical_order_file && (
                                <p className="text-sm text-destructive">{errors.medical_order_file}</p>
                            )}
                        </div>

                        <div className="grid gap-2 mt-4">
                            <Label htmlFor="diagnosis">Diagnóstico Clínico / Sospecha</Label>
                            <Textarea
                                id="diagnosis"
                                value={data.diagnosis}
                                onChange={(e) => setData('diagnosis', e.target.value)}
                                placeholder="Escriba el diagnóstico aquí..."
                                className="resize-none"
                                rows={3}
                            />
                            {errors.diagnosis && <p className="text-sm text-destructive">{errors.diagnosis}</p>}
                        </div>

                        <div className="grid gap-2 mt-4">
                            <Label htmlFor="clinical_notes">Notas Clínicas</Label>
                            <Textarea
                                id="clinical_notes"
                                value={data.clinical_notes}
                                onChange={(e) => setData('clinical_notes', e.target.value)}
                                placeholder="Información adicional relevante..."
                                className="resize-none"
                                rows={3}
                            />
                            {errors.clinical_notes && <p className="text-sm text-destructive">{errors.clinical_notes}</p>}
                        </div>
                    </div>
                )}

                {/* SECCIÓN 2: INSUMOS (CREACIÓN SOLAMENTE) */}
                {!specimen && currentStep === 2 && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Selección de Insumos / Reactivos
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Busque y agregue los insumos químicos o reactivos que se utilizarán en el análisis de esta muestra. El inventario se actualizará al emitir la factura.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Columna Izquierda: Buscador e Insumos Disponibles */}
                            <div className="lg:col-span-7 flex flex-col gap-4">
                                <div className="relative">
                                    <Input
                                        type="text"
                                        placeholder="Buscar insumo por nombre o código..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pr-8"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="border rounded-xl bg-card overflow-hidden">
                                    <div className="p-3 bg-muted/40 font-semibold text-xs border-b text-muted-foreground flex justify-between">
                                        <span>Insumo / Descripción</span>
                                        <span>Stock Disponible</span>
                                    </div>
                                    <div className="max-h-[350px] overflow-y-auto divide-y divide-border">
                                        {filteredProducts.length === 0 ? (
                                            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                                                <Microscope className="w-8 h-8 text-muted-foreground/40" />
                                                <span>No se encontraron insumos disponibles.</span>
                                            </div>
                                        ) : (
                                            filteredProducts.map((product) => {
                                                const totalStock = parseInt(product.total_stock) || 0;
                                                const isOutOfStock = totalStock <= 0;
                                                const isAlreadyAdded = data.insumos.some((i: any) => i.id === product.id);

                                                return (
                                                    <div
                                                        key={product.id}
                                                        className={cn(
                                                            "p-3 flex items-center justify-between transition-colors",
                                                            isOutOfStock ? "bg-muted/10 opacity-70" : "hover:bg-accent/10"
                                                        )}
                                                    >
                                                        <div className="flex flex-col gap-0.5 max-w-[70%]">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-sm text-foreground truncate">{product.name}</span>
                                                                <span className="text-[10px] font-mono font-bold bg-muted text-muted-foreground border px-1 rounded uppercase tracking-wider shrink-0">{product.code}</span>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground truncate">{product.description || "Sin descripción"}</span>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {isOutOfStock ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold rounded-md bg-destructive/10 border border-destructive/20 text-destructive shrink-0">
                                                                    Agotado
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                                                                    {totalStock} u.
                                                                </span>
                                                            )}

                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant={isAlreadyAdded ? "secondary" : "outline"}
                                                                onClick={() => handleAddInsumo(product)}
                                                                disabled={isOutOfStock}
                                                                className="h-8 font-semibold shrink-0"
                                                            >
                                                                {isAlreadyAdded ? (
                                                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                                        <Check className="w-3.5 h-3.5" /> Agregado
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1">
                                                                        <Plus className="w-3.5 h-3.5" /> Agregar
                                                                    </span>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Columna Derecha: Insumos Seleccionados */}
                            <div className="lg:col-span-5 flex flex-col gap-4">
                                <div className="border rounded-xl bg-card overflow-hidden">
                                    <div className="p-3 bg-muted/40 font-bold text-xs border-b text-muted-foreground flex justify-between items-center">
                                        <span>Insumos Seleccionados</span>
                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                                            {data.insumos.length}
                                        </span>
                                    </div>

                                    <div className="min-h-[250px] max-h-[400px] overflow-y-auto divide-y divide-border flex flex-col">
                                        {data.insumos.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground gap-3">
                                                <div className="p-3 bg-secondary rounded-full text-muted-foreground/50">
                                                    <Tag className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-col gap-1 max-w-[200px]">
                                                    <span className="font-bold text-foreground">Lista vacía</span>
                                                    <span className="text-xs text-muted-foreground leading-normal">
                                                        Presione "Agregar" en la lista de insumos disponibles de la izquierda.
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            data.insumos.map((insumo: any) => (
                                                <div key={insumo.id} className="p-3.5 flex flex-col gap-3 hover:bg-accent/5 transition-colors">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex flex-col gap-0.5 min-w-0">
                                                            <span className="font-semibold text-sm text-foreground truncate">{insumo.name}</span>
                                                            <span className="text-[10px] font-mono text-muted-foreground uppercase">{insumo.code}</span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveInsumo(insumo.id)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex flex-col gap-1 w-[55%]">
                                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Precio</span>
                                                            <Select
                                                                value={parseFloat(insumo.price || 0).toString()}
                                                                onValueChange={(val) => {
                                                                    const parsed = parseFloat(val);
                                                                    if (!isNaN(parsed)) {
                                                                        handleUpdateInsumoPrice(insumo.id, parsed);
                                                                    }
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-8 text-xs font-mono font-medium w-full">
                                                                    <SelectValue placeholder="Seleccionar precio" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {insumo.prices && insumo.prices.length > 0 ? (
                                                                        insumo.prices.map((p: any, idx: number) => {
                                                                            const priceStr = parseFloat(p.amount || 0).toString();
                                                                            return (
                                                                                <SelectItem key={idx} value={priceStr} className="font-mono text-xs">
                                                                                    L. {parseFloat(p.amount || 0).toFixed(2)}
                                                                                </SelectItem>
                                                                            );
                                                                        })
                                                                    ) : (
                                                                        <SelectItem value={parseFloat(insumo.price || 0).toString()} className="font-mono text-xs">
                                                                            L. {parseFloat(insumo.price || 0).toFixed(2)}
                                                                        </SelectItem>
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-1 w-[45%]">
                                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider text-right w-full">Cantidad</span>
                                                            <div className="flex items-center border rounded-lg bg-background p-1 shrink-0 shadow-sm h-8 w-full justify-between">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleUpdateInsumoQty(insumo.id, insumo.quantity - 1)}
                                                                    disabled={insumo.quantity <= 1}
                                                                    className="h-6 w-6 rounded-md"
                                                                >
                                                                    <span className="text-sm font-bold leading-none">-</span>
                                                                </Button>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={insumo.total_stock}
                                                                    value={insumo.quantity}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value) || 1;
                                                                        handleUpdateInsumoQty(insumo.id, val);
                                                                    }}
                                                                    className="w-8 text-center font-mono text-xs font-bold border-none focus:ring-0 focus:outline-none p-0 shrink-0 select-all"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleUpdateInsumoQty(insumo.id, insumo.quantity + 1)}
                                                                    disabled={insumo.quantity >= insumo.total_stock}
                                                                    className="h-6 w-6 rounded-md"
                                                                >
                                                                    <span className="text-sm font-bold leading-none">+</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center text-[11px] text-muted-foreground border-t pt-2 mt-1">
                                                        <span>Límite: <strong className="text-foreground">{insumo.total_stock} u.</strong></span>
                                                        <span className="font-mono">Total: <strong className="text-foreground text-xs">L. {(insumo.price * insumo.quantity).toFixed(2)}</strong></span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECCIÓN 3: FACTURACIÓN (CREACIÓN SOLAMENTE) */}
                {!specimen && currentStep === 3 && (
                    <>
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Facturación
                            </h3>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Left Column: Fields */}
                                <div className="lg:col-span-8 flex flex-col gap-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                             <div className="flex flex-col gap-0.5">
                                                 <Label htmlFor="selected_price">Importe / Precio Base (L.) <span className="text-destructive">*</span></Label>
                                                 <span className="text-[11px] text-muted-foreground">
                                                     Precios de la categoría de muestra: <strong className="text-foreground">{selectedType?.name || 'Sin seleccionar'}</strong>
                                                 </span>
                                             </div>
                                            <Select
                                                value={data.selected_price}
                                                onValueChange={(val) => setData('selected_price', val)}
                                            >
                                                <SelectTrigger id="selected_price" className="w-full">
                                                    <SelectValue placeholder="Seleccione un precio" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availablePrices.length > 0 ? (
                                                        availablePrices.map((price: any) => (
                                                            <SelectItem key={price.id} value={price.amount.toString()}>
                                                                L. {parseFloat(price.amount).toFixed(2)}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <SelectItem value="0" disabled>
                                                            No hay precios configurados para este tipo de muestra
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="discount">Descuento Calculado (L.)</Label>
                                            <Input
                                                id="discount"
                                                type="number"
                                                value={parseFloat(data.discount || '0').toFixed(2)}
                                                readOnly
                                                disabled
                                                className="bg-muted font-mono font-semibold text-emerald-600 dark:text-emerald-400 disabled:opacity-100"
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                                Calculado automáticamente basado en los precios e insumos seleccionados.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Cobrar otro importe personalizado */}
                                    <div className="flex flex-col gap-3 p-4 bg-muted/30 border rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-0.5">
                                                <Label htmlFor="custom-amount-toggle" className="text-xs font-semibold cursor-pointer">
                                                    Cobrar otro importe personalizado
                                                </Label>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Permite agregar un importe manual para servicios adicionales.
                                                </span>
                                            </div>
                                            <Switch
                                                id="custom-amount-toggle"
                                                checked={data.custom_amount_enabled}
                                                onCheckedChange={(checked) => {
                                                    setData(d => ({
                                                        ...d,
                                                        custom_amount_enabled: checked,
                                                        custom_amount: checked ? d.custom_amount || '0' : '0',
                                                        custom_amount_reason: checked ? d.custom_amount_reason || '' : ''
                                                    }));
                                                }}
                                            />
                                        </div>

                                        {data.custom_amount_enabled && (
                                            <div className="flex flex-col gap-3 pt-2 border-t border-border/50 transition-all duration-300">
                                                <div className="grid gap-1.5">
                                                    <Label htmlFor="custom_amount" className="text-xs">
                                                        Importe Adicional Personalizado (L.) <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Input
                                                        id="custom_amount"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={data.custom_amount}
                                                        onChange={(e) => setData('custom_amount', e.target.value)}
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                    {errors.custom_amount && (
                                                        <span className="text-[10px] text-destructive">{errors.custom_amount}</span>
                                                    )}
                                                </div>
                                                <div className="grid gap-1.5">
                                                    <Label htmlFor="custom_amount_reason" className="text-xs">
                                                        Concepto / Razón del Importe Adicional <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Input
                                                        id="custom_amount_reason"
                                                        type="text"
                                                        value={data.custom_amount_reason}
                                                        onChange={(e) => setData('custom_amount_reason', e.target.value)}
                                                        placeholder="Ej. Materiales especiales, urgencia, etc."
                                                        required
                                                    />
                                                    {errors.custom_amount_reason && (
                                                        <span className="text-[10px] text-destructive">{errors.custom_amount_reason}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="payment_type">Tipo de Pago <span className="text-destructive">*</span></Label>
                                            <Select
                                                value={data.payment_type}
                                                onValueChange={(value) => {
                                                    setData(data => {
                                                        const updated = { ...data, payment_type: value };
                                                        if (value === 'credit') {
                                                            updated.proof_of_payment = null;
                                                            updated.has_initial_payment = false;
                                                        }
                                                        return updated;
                                                    });
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Seleccione el tipo de pago" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cash">Efectivo</SelectItem>
                                                    <SelectItem value="credit card">Tarjeta de Crédito</SelectItem>
                                                    <SelectItem value="bank transfer">Transferencia Bancaria</SelectItem>
                                                    <SelectItem value="credit">Al Crédito</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.payment_type && <p className="text-sm text-destructive">{errors.payment_type}</p>}
                                        </div>
                                    </div>

                                    {data.payment_type === 'credit' && (
                                        <div className="flex flex-col gap-3 p-4 bg-muted/30 border rounded-lg mt-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-0.5">
                                                    <Label htmlFor="has-initial-payment" className="text-xs font-semibold cursor-pointer">
                                                        Con pago inicial
                                                    </Label>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Active esta opción si el cliente realiza un abono o pago inicial al momento del registro.
                                                    </span>
                                                </div>
                                                <Switch
                                                    id="has-initial-payment"
                                                    checked={data.has_initial_payment}
                                                    onCheckedChange={(checked) => {
                                                        setData(d => ({
                                                            ...d,
                                                            has_initial_payment: checked,
                                                            proof_of_payment: checked ? d.proof_of_payment : null,
                                                            initial_payment_amount: checked ? d.initial_payment_amount : '',
                                                            initial_payment_type: checked ? d.initial_payment_type : 'cash'
                                                        }));
                                                    }}
                                                />
                                            </div>

                                            {data.has_initial_payment && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-2">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="initial_payment_amount">
                                                            Monto de Pago Inicial (L.) <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            id="initial_payment_amount"
                                                            type="number"
                                                            step="0.01"
                                                            min="0.01"
                                                            max={totalVal}
                                                            value={data.initial_payment_amount}
                                                            onChange={(e) => setData('initial_payment_amount', e.target.value)}
                                                            placeholder="0.00"
                                                            required
                                                        />
                                                        {errors.initial_payment_amount && (
                                                            <p className="text-sm text-destructive">{errors.initial_payment_amount}</p>
                                                        )}
                                                    </div>

                                                    <div className="grid gap-2">
                                                        <Label htmlFor="initial_payment_type">
                                                            Tipo de Pago Inicial <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Select
                                                            value={data.initial_payment_type}
                                                            onValueChange={(value) => setData('initial_payment_type', value)}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Seleccione el tipo de pago" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="cash">Efectivo</SelectItem>
                                                                <SelectItem value="credit card">Tarjeta de Crédito</SelectItem>
                                                                <SelectItem value="bank transfer">Transferencia Bancaria</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        {errors.initial_payment_type && (
                                                            <p className="text-sm text-destructive">{errors.initial_payment_type}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Comprobante de Pago */}
                                    {(data.payment_type !== 'credit' || (data.payment_type === 'credit' && data.has_initial_payment)) ? (
                                        <div className="grid gap-2">
                                            <Label htmlFor="proof_of_payment">
                                                Comprobante de Pago (PDF o Imagen) <span className="text-destructive">*</span>
                                            </Label>

                                            {data.proof_of_payment && (
                                                <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-emerald-500/10 rounded-md text-emerald-500">
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold text-foreground truncate max-w-[150px] sm:max-w-xs">
                                                                {data.proof_of_payment.name}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {(data.proof_of_payment.size / 1024 / 1024).toFixed(2)} MB
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setData('proof_of_payment', null)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}

                                            {!data.proof_of_payment && (
                                                <div className="relative group">
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
                                                        className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 rounded-lg p-5 cursor-pointer bg-card hover:bg-accent/10 transition-all duration-200"
                                                    >
                                                        <div className="p-2.5 bg-secondary rounded-full text-secondary-foreground group-hover:scale-110 transition-transform duration-200 mb-2">
                                                            <Upload className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-xs font-semibold text-foreground">
                                                            Subir Comprobante
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground mt-1">
                                                            PDF hasta 30MB, imágenes hasta 10MB
                                                        </span>
                                                    </label>
                                                </div>
                                            )}
                                            {errors.proof_of_payment && <p className="text-sm text-destructive">{errors.proof_of_payment}</p>}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col justify-center p-4 bg-muted/30 border border-dashed rounded-lg">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                Pago al Crédito seleccionado
                                            </span>
                                            <span className="text-[10px] text-muted-foreground mt-0.5">
                                                No se requiere comprobante de pago físico en este momento. Se registrará la deuda en el saldo de crédito del cliente.
                                            </span>
                                        </div>
                                    )}

                                    {/* Breakdown of selected supplies */}
                                    {data.insumos && data.insumos.length > 0 && (
                                        <div className="border rounded-xl bg-card overflow-hidden mt-2">
                                            <div className="p-3 bg-muted/40 font-semibold text-xs border-b text-muted-foreground flex justify-between">
                                                <span>Insumo / Reactivo Utilizado</span>
                                                <div className="flex gap-8 text-right font-semibold">
                                                    <span className="w-12">Cant.</span>
                                                    <span className="w-20">Precio U.</span>
                                                    <span className="w-20">Total</span>
                                                </div>
                                            </div>
                                            <div className="divide-y divide-border">
                                                {data.insumos.map((insumo: any) => (
                                                    <div key={insumo.id} className="p-3 flex justify-between items-center text-xs">
                                                        <div className="flex flex-col gap-0.5 min-w-0">
                                                            <span className="font-semibold text-foreground truncate max-w-[180px] sm:max-w-xs">{insumo.name}</span>
                                                            <span className="text-[9px] font-mono text-muted-foreground uppercase">{insumo.code}</span>
                                                        </div>
                                                        <div className="flex gap-8 text-right font-mono text-xs shrink-0">
                                                            <span className="w-12 text-muted-foreground">{insumo.quantity} u.</span>
                                                            <span className="w-20 text-muted-foreground">L. {parseFloat(insumo.price || 0).toFixed(2)}</span>
                                                            <span className="w-20 font-bold text-foreground">L. {(insumo.price * insumo.quantity).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-3 bg-muted/20 border-t flex justify-between items-center text-xs font-semibold">
                                                <span className="text-muted-foreground">Subtotal Insumos / Reactivos:</span>
                                                <span className="font-mono text-sm text-primary">L. {insumosTotalVal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Summary Card */}
                                <div className="lg:col-span-4 flex flex-col justify-start">
                                    <div className="p-5 rounded-xl bg-muted/30 dark:bg-muted/10 border shadow-sm flex flex-col gap-4">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            Resumen de Totales
                                        </h4>
                                        <div className="flex flex-col gap-3 mt-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Precio Regular Muestra:</span>
                                                <span className="font-semibold text-foreground">L. {maxSpecimenPriceVal.toFixed(2)}</span>
                                            </div>
                                            {data.custom_amount_enabled && (
                                                <div className="flex flex-col gap-0.5 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Importe Personalizado:</span>
                                                        <span className="font-semibold text-foreground text-primary">L. {customAmountVal.toFixed(2)}</span>
                                                    </div>
                                                    {data.custom_amount_reason && (
                                                        <span className="text-[10px] text-muted-foreground italic truncate">
                                                            Razón: {data.custom_amount_reason}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {maxInsumosTotalVal > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Insumos / Reactivos (Reg.):</span>
                                                    <span className="font-semibold text-foreground">L. {maxInsumosTotalVal.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {autoDiscountTotal > 0 && (
                                                <div className="flex flex-col gap-1.5 bg-emerald-500/5 dark:bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Descuentos Aplicados</span>
                                                    {specimenDiscountVal > 0 && (
                                                        <div className="flex justify-between text-xs">
                                                            <span>Categoría Muestra:</span>
                                                            <span className="font-semibold">- L. {specimenDiscountVal.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    {insumosDiscountVal > 0 && (
                                                        <div className="flex justify-between text-xs">
                                                            <span>Insumos / Reactivos:</span>
                                                            <span className="font-semibold">- L. {insumosDiscountVal.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    <Separator className="bg-emerald-500/20 my-1" />
                                                    <div className="flex justify-between text-xs font-bold">
                                                        <span>Descuento Total:</span>
                                                        <span>- L. {autoDiscountTotal.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {autoDiscountTotal === 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Descuento:</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">- L. 0.00</span>
                                                </div>
                                            )}
                                            <Separator />
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Sub-Total:</span>
                                                <span className="font-semibold text-foreground">L. {subtotalVal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground flex flex-col">
                                                    <span>Importe Exonerado:</span>
                                                    <span className="text-[10px] text-muted-foreground/80">(Servicios médicos)</span>
                                                </span>
                                                <span className="font-semibold text-foreground">L. {totalVal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Importe Exento:</span>
                                                <span className="font-semibold text-foreground">L. 0.00</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Importe Gravado 15%:</span>
                                                <span className="font-semibold text-foreground">L. 0.00</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Importe Gravado 18%:</span>
                                                <span className="font-semibold text-foreground">L. 0.00</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">ISV 15%:</span>
                                                <span className="font-semibold text-foreground">L. 0.00</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">ISV 18%:</span>
                                                <span className="font-semibold text-foreground">L. 0.00</span>
                                            </div>
                                            <Separator className="h-0.5" />
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-sm font-bold text-foreground">Total a Pagar:</span>
                                                <span className="text-lg font-extrabold text-primary">L. {totalVal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* BOTONES DE ENVÍO */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t mt-4">
                    {specimen && specimen.created_at ? (
                        <div className="text-sm text-muted-foreground">
                            Creada el: {new Date(specimen.created_at).toLocaleString('es-ES', {
                                dateStyle: 'long',
                                timeStyle: 'short'
                            })}
                        </div>
                    ) : !specimen && currentStep > 1 ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep(prev => prev - 1)}
                            className="w-full sm:w-auto"
                            disabled={processing}
                        >
                            Atrás
                        </Button>
                    ) : (
                        <div />
                    )}

                    {specimen ? (
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing && <Spinner className="mr-2" />}
                            Guardar Cambios
                        </Button>
                    ) : currentStep < 3 ? (
                        <Button
                            type="button"
                            onClick={handleNextStep}
                            className="w-full sm:w-auto"
                            disabled={!specimen && currentStep === 1 && !!data.specimen_type && !matchingSequence}
                        >
                            Siguiente
                        </Button>
                    ) : (
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing && <Spinner className="mr-2" />}
                            Facturar y Crear Muestra
                        </Button>
                    )}
                </div>
            </form>

            <Sheet open={isCustomerSheetOpen} onOpenChange={setIsCustomerSheetOpen}>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Nuevo Cliente / Paciente</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 -mx-5 px-5">
                        <CustomerForm onSuccess={() => setIsCustomerSheetOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={isSequenceSheetOpen} onOpenChange={setIsSequenceSheetOpen}>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Nueva Secuencia de Numeración</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 -mx-5 px-5">
                        {isSequenceSheetOpen && (
                            <SequenceForm
                                locations={locations}
                                specimenTypes={specimenTypes}
                                defaultLocationId={activeLocationId || undefined}
                                defaultSpecimenTypeId={data.specimen_type ? parseInt(data.specimen_type) : undefined}
                                sequences={localSequences}
                                onSuccess={() => {
                                    setIsSequenceSheetOpen(false);
                                }}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* CONFIRMACIÓN DE DIÁLOGO SHADCN (ALERTDIALOG) */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="max-w-[500px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Resumen de Factura y Transacción</AlertDialogTitle>
                        <AlertDialogDescription>
                            Revise detalladamente los importes antes de emitir la factura fiscal.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="grid gap-3 py-3 text-sm">
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">Cliente / Paciente:</span>
                            <span className="font-semibold text-foreground">{selectedCustomerLabel}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">Examen:</span>
                            <span className="font-semibold text-foreground truncate max-w-[250px]">{selectedExaminationLabel}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">Tipo de Pago:</span>
                            <span className="font-semibold text-foreground">{getPaymentTypeLabel(data.payment_type)}</span>
                        </div>

                        {data.insumos && data.insumos.length > 0 && (
                            <div className="border-b pb-2 flex flex-col gap-1.5">
                                <span className="font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Insumos Seleccionados:</span>
                                <div className="max-h-[120px] overflow-y-auto flex flex-col gap-1.5 pr-1">
                                    {data.insumos.map((insumo: any) => (
                                        <div key={insumo.id} className="flex justify-between items-center text-xs bg-muted/30 p-1.5 rounded border border-border/50">
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-foreground truncate max-w-[220px]">{insumo.name}</span>
                                                <span className="text-[9px] font-mono text-muted-foreground uppercase">{insumo.code}</span>
                                            </div>
                                            <div className="text-right shrink-0 font-mono text-xs">
                                                <span className="text-muted-foreground text-[10px] mr-2">{insumo.quantity}x L. {parseFloat(insumo.price).toFixed(2)}</span>
                                                <span className="font-bold text-foreground">L. {(insumo.price * insumo.quantity).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">Precio Regular Muestra:</span>
                            <span className="font-semibold text-foreground">L. {maxSpecimenPriceVal.toFixed(2)}</span>
                        </div>
                         {data.custom_amount_enabled && (
                            <div className="flex flex-col gap-0.5 border-b pb-2">
                                <div className="flex justify-between">
                                    <span className="font-medium text-muted-foreground">Importe Personalizado:</span>
                                    <span className="font-semibold text-foreground">L. {customAmountVal.toFixed(2)}</span>
                                </div>
                                {data.custom_amount_reason && (
                                    <span className="text-[10px] text-muted-foreground italic text-left">
                                        Razón: {data.custom_amount_reason}
                                    </span>
                                )}
                            </div>
                        )}
                        {maxInsumosTotalVal > 0 && (
                            <div className="flex justify-between border-b pb-2">
                                <span className="font-medium text-muted-foreground">Insumos y Reactivos (Reg.):</span>
                                <span className="font-semibold text-foreground">L. {maxInsumosTotalVal.toFixed(2)}</span>
                            </div>
                        )}
                        {autoDiscountTotal > 0 ? (
                            <div className="border-b pb-2 flex flex-col gap-1.5 bg-emerald-500/5 dark:bg-emerald-500/10 p-2.5 rounded border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                                <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Descuentos Aplicados</span>
                                {specimenDiscountVal > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span>Categoría Muestra:</span>
                                        <span className="font-semibold">- L. {specimenDiscountVal.toFixed(2)}</span>
                                    </div>
                                )}
                                {insumosDiscountVal > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span>Insumos / Reactivos:</span>
                                        <span className="font-semibold">- L. {insumosDiscountVal.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-1 border-t border-emerald-500/20 text-xs font-bold">
                                    <span>Total Descuentos:</span>
                                    <span>- L. {autoDiscountTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between border-b pb-2 text-emerald-600 dark:text-emerald-400">
                                <span className="font-medium">Descuentos Aplicados:</span>
                                <span className="font-semibold">- L. 0.00</span>
                            </div>
                        )}
                        <div className="flex justify-between border-b pb-2 text-xs">
                            <span className="font-medium text-muted-foreground">Importe Exonerado:</span>
                            <span className="font-semibold text-foreground">L. {totalVal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2 text-xs">
                            <span className="font-medium text-muted-foreground">Importe Exento:</span>
                            <span className="font-semibold text-foreground">L. 0.00</span>
                        </div>
                        <div className="flex justify-between pt-1 text-base font-bold">
                            <span>TOTAL NETO A PAGAR:</span>
                            <span className="text-primary">L. {totalVal.toFixed(2)}</span>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowConfirm(false)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setShowConfirm(false);
                            submitForm();
                        }}>
                            Confirmar y Emitir Factura
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
