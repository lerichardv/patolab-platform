import { useState, useEffect, useMemo, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown, Plus, Upload, FileText, X, ExternalLink, AlertCircle, Tag, Microscope, Wallet, CreditCard, Landmark, Receipt, Trash2, Edit2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
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
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import HeadingSheet from '@/components/heading-sheet';
import { cn } from '@/lib/utils';

// Reuse on-the-fly creators
import CustomerForm from '../customers/customer-form';
import ReferrerForm from '../referrers/referrer-form';
import SequenceForm from '../sequences/sequence-form';
import SpecimenTypeForm from '../specimen-types/specimen-type-form';
import SpecimenTypeExaminationSheet from '../specimen-type-examinations/specimen-type-examination-sheet';
import CategorySheet from '../specimen-categories/category-sheet';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
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
	products: any[];
	banks: any[];
}

function FormCombobox({
	options,
	value,
	onChange,
	placeholder,
	emptyMessage = 'No se encontraron resultados.',
	disabled = false
}: {
	options: { label: string; value: string; color?: string; disabled?: boolean }[];
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
			<PopoverTrigger asChild className='w-full'>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between h-10"
					disabled={disabled}
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
			<PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[110]" align="start">
				<Command>
					<CommandInput placeholder={`Buscar ${placeholder.toLowerCase()}...`} />
					<CommandList>
						<CommandEmpty>{emptyMessage}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.label}
									disabled={option.disabled}
									onSelect={() => {
										if (option.disabled) return;
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
									<span className={cn("truncate", option.disabled && "text-muted-foreground opacity-50")}>{option.label}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export default function SpecimenGroupSheet({
	open,
	onOpenChange,
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
	banks = []
}: Props) {
	const { settings } = usePage<any>().props;
	const thirdAgePercent = parseFloat(settings?.third_age_discount || '30');
	const fourthAgePercent = parseFloat(settings?.fourth_age_discount || '40');

	// Page close/refresh prevention states
	const [isFormDirty, setIsFormDirty] = useState(false);
	const [showCloseConfirm, setShowCloseConfirm] = useState(false);

	// Wizard wizard states
	const [currentStep, setCurrentStep] = useState(1);
	const [globalCustomerId, setGlobalCustomerId] = useState('');
	const [specimens, setSpecimens] = useState<any[]>([]);

	// Nested specimen form states
	const [isNestedFormOpen, setIsNestedFormOpen] = useState(false);
	const [nestedSpecimenToEditId, setNestedSpecimenToEditId] = useState<string | null>(null);
	const [nestedErrors, setNestedErrors] = useState<Record<string, string>>({});

	// Nested form inputs
	const [nestedCustomer, setNestedCustomer] = useState('');
	const [nestedSpecimenType, setNestedSpecimenType] = useState('');
	const [nestedExamination, setNestedExamination] = useState('');
	const [nestedCategory, setNestedCategory] = useState('');
	const [nestedReferrer, setNestedReferrer] = useState('');
	const [nestedAnatomicSite, setNestedAnatomicSite] = useState('');
	const [nestedDiagnosis, setNestedDiagnosis] = useState('');
	const [nestedClinicalNotes, setNestedClinicalNotes] = useState('');
	const [nestedStatus, setNestedStatus] = useState('received');
	const [nestedPriority, setNestedPriority] = useState('');
	const [nestedMedicalOrderFile, setNestedMedicalOrderFile] = useState<File | null>(null);

	// Insumos/Reactivos inside Step 1 nested form
	const [nestedAgregarInsumos, setNestedAgregarInsumos] = useState(false);
	const [nestedInsumos, setNestedInsumos] = useState<any[]>([]);
	const [supplySearchQuery, setSupplySearchQuery] = useState('');

	// On-the-fly creator sheet states
	const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
	const [isReferrerSheetOpen, setIsReferrerSheetOpen] = useState(false);
	const [isSequenceSheetOpen, setIsSequenceSheetOpen] = useState(false);
	const [isSpecimenTypeSheetOpen, setIsSpecimenTypeSheetOpen] = useState(false);
	const [isExaminationSheetOpen, setIsExaminationSheetOpen] = useState(false);
	const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);

	// Global billing fields (Step 2)
	const [paymentType, setPaymentType] = useState('');
	const [paymentMethodDate, setPaymentMethodDate] = useState(new Date().toISOString().split('T')[0]);
	const [proofOfPayment, setProofOfPayment] = useState<File | null>(null);
	const [customAmountEnabled, setCustomAmountEnabled] = useState(false);
	const [customAmount, setCustomAmount] = useState('0');
	const [customAmountReason, setCustomAmountReason] = useState('');

	// Credit initial payment details
	const [hasInitialPayment, setHasInitialPayment] = useState(false);
	const [initialPaymentAmount, setInitialPaymentAmount] = useState('');
	const [initialPaymentType, setInitialPaymentType] = useState('cash');

	// Detailed payment method fields
	const [cashValue, setCashValue] = useState('');
	const [checkNumber, setCheckNumber] = useState('');
	const [checkValue, setCheckValue] = useState('');
	const [cardLast4, setCardLast4] = useState('');
	const [cardValueCharged, setCardValueCharged] = useState('');
	const [cardExpiration, setCardExpiration] = useState('');
	const [cardAuthorizationCode, setCardAuthorizationCode] = useState('');
	const [transferBankId, setTransferBankId] = useState('');
	const [transferValue, setTransferValue] = useState('');
	const [transferAuthorizationCode, setTransferAuthorizationCode] = useState('');

	const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
	const [processing, setProcessing] = useState(false);

	// Reset whole form when opened
	useEffect(() => {
		if (open) {
			setCurrentStep(1);
			setGlobalCustomerId('');
			setSpecimens([]);
			setIsFormDirty(false);
			setPaymentType('');
			setProofOfPayment(null);
			setCustomAmountEnabled(false);
			setCustomAmount('0');
			setCustomAmountReason('');
			setHasInitialPayment(false);
			setInitialPaymentAmount('');
			setInitialPaymentType('cash');
			resetDetailedPayments();
		}
	}, [open]);

	const resetDetailedPayments = () => {
		setCashValue('');
		setCheckNumber('');
		setCheckValue('');
		setCardLast4('');
		setCardValueCharged('');
		setCardExpiration('');
		setCardAuthorizationCode('');
		setTransferBankId('');
		setTransferValue('');
		setTransferAuthorizationCode('');
	};

	// Warn on refresh or navigation
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (open && isFormDirty) {
				e.preventDefault();
				e.returnValue = '';
				return '';
			}
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [open, isFormDirty]);

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			if (isFormDirty) {
				setShowCloseConfirm(true);
				return;
			}
		}
		onOpenChange(newOpen);
	};

	// Auto-select first priority when priorities load
	useEffect(() => {
		if (priorities && priorities.length > 0 && !nestedPriority) {
			setNestedPriority(priorities[0].id.toString());
		}
	}, [priorities]);

	// Active customer details
	const selectedGlobalCustomer = useMemo(() => {
		return customers.find(c => c.id.toString() === globalCustomerId);
	}, [globalCustomerId, customers]);

	// Pre-select global customer when opening nested form to create a specimen
	const handleOpenNestedForm = () => {
		setNestedSpecimenToEditId(null);
		setNestedCustomer(globalCustomerId); // Default to global customer!
		setNestedSpecimenType('');
		setNestedExamination('');
		setNestedCategory('');
		setNestedReferrer('');
		setNestedAnatomicSite('');
		setNestedDiagnosis('');
		setNestedClinicalNotes('');
		setNestedStatus('received');
		setNestedPriority(priorities && priorities.length > 0 ? priorities[0].id.toString() : '');
		setNestedMedicalOrderFile(null);
		setNestedAgregarInsumos(false);
		setNestedInsumos([]);
		setNestedErrors({});
		setSupplySearchQuery('');
		setIsNestedFormOpen(true);
	};

	const handleEditNestedSpecimen = (spec: any) => {
		setNestedSpecimenToEditId(spec.client_id);
		setNestedCustomer(spec.customer.toString());
		setNestedSpecimenType(spec.specimen_type.toString());
		setNestedExamination(spec.specimen_type_examination.toString());
		setNestedCategory(spec.specimen_category.toString());
		setNestedReferrer(spec.referrer.toString());
		setNestedAnatomicSite(spec.anatomic_site || '');
		setNestedDiagnosis(spec.diagnosis || '');
		setNestedClinicalNotes(spec.clinical_notes || '');
		setNestedStatus(spec.status || 'received');
		setNestedPriority(spec.priority_id ? spec.priority_id.toString() : '');
		setNestedMedicalOrderFile(spec.medical_order_file || null);
		setNestedAgregarInsumos(spec.agregar_insumos || false);
		setNestedInsumos(spec.insumos || []);
		setNestedErrors({});
		setSupplySearchQuery('');
		setIsNestedFormOpen(true);
	};

	const handleDeleteNestedSpecimen = (clientId: string) => {
		setSpecimens(prev => prev.filter(s => s.client_id !== clientId));
		setIsFormDirty(true);
	};

	// Filter products for nested search
	const filteredProducts = useMemo(() => {
		return products.filter(product =>
			product.name.toLowerCase().includes(supplySearchQuery.toLowerCase()) ||
			product.code.toLowerCase().includes(supplySearchQuery.toLowerCase())
		);
	}, [products, supplySearchQuery]);

	// Nested form handlers
	const handleAddNestedInsumo = (product: any) => {
		if (nestedInsumos.some(i => i.id === product.id)) {
			toast.info(`El producto "${product.name}" ya ha sido agregado.`);
			return;
		}
		const sortedPrices = [...(product.prices || [])].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
		const defaultPrice = sortedPrices.length > 0 ? parseFloat(sortedPrices[0].amount) : (parseFloat(product.sale_price) || 0);

		setNestedInsumos(prev => [...prev, {
			id: product.id,
			name: product.name,
			code: product.code,
			quantity: 1,
			total_stock: parseInt(product.total_stock) || 0,
			price: defaultPrice,
			prices: sortedPrices,
			sale_price: parseFloat(product.sale_price) || 0
		}]);
	};

	const handleRemoveNestedInsumo = (id: number) => {
		setNestedInsumos(prev => prev.filter(i => i.id !== id));
	};

	const handleUpdateNestedQty = (id: number, qty: number) => {
		setNestedInsumos(prev => prev.map(i => {
			if (i.id === id) {
				const capped = Math.max(1, Math.min(i.total_stock, qty));
				return { ...i, quantity: capped };
			}
			return i;
		}));
	};

	const handleUpdateNestedPrice = (id: number, price: number) => {
		setNestedInsumos(prev => prev.map(i => {
			if (i.id === id) {
				return { ...i, price };
			}
			return i;
		}));
	};

	// Validate nested specimen Step 1 fields
	const validateNestedSpecimen = () => {
		const errors: Record<string, string> = {};
		if (!nestedCustomer) errors.customer = 'El paciente es requerido.';
		if (!nestedReferrer) errors.referrer = 'El médico remitente es requerido.';
		if (!nestedSpecimenType) errors.specimen_type = 'El tipo de muestra es requerido.';
		if (!nestedExamination) errors.specimen_type_examination = 'El examen es requerido.';
		if (!nestedCategory) errors.specimen_category = 'La categoría de tiempo es requerida.';
		if (!nestedPriority) errors.priority_id = 'La prioridad es requerida.';
		if (!nestedStatus) errors.status = 'El estado es requerido.';

		// Verify CAI sequences
		if (nestedSpecimenType && activeLocationId) {
			const sequence = sequences.find(s => s.specimen_type.toString() === nestedSpecimenType && s.location_id === activeLocationId && s.active);
			if (!sequence) {
				errors.specimen_type = 'No existe una secuencia de numeración activa configurada en esta sucursal para este tipo de muestra.';
			}
		}

		setNestedErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSaveNestedSpecimen = () => {
		if (!validateNestedSpecimen()) {
			toast.error('Complete todos los campos obligatorios del espécimen.');
			return;
		}

		// Get prices list from chosen specimen type to populate default pricing structure in Step 2
		const selectedType = specimenTypes.find(t => t.id.toString() === nestedSpecimenType);
		const prices = selectedType?.prices || [];
		const sortedPrices = [...prices].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
		const defaultPrice = sortedPrices.length > 0 ? sortedPrices[0].amount.toString() : '0';

		const specObject = {
			client_id: nestedSpecimenToEditId || Math.random().toString(36).substring(2, 9),
			customer: parseInt(nestedCustomer),
			customer_name: customers.find(c => c.id.toString() === nestedCustomer)?.name || 'Desconocido',
			specimen_type: parseInt(nestedSpecimenType),
			specimen_type_name: selectedType?.name || '',
			specimen_type_examination: parseInt(nestedExamination),
			specimen_type_examination_name: examinations.find(e => e.id.toString() === nestedExamination)?.name || '',
			specimen_category: parseInt(nestedCategory),
			referrer: parseInt(nestedReferrer),
			anatomic_site: nestedAnatomicSite,
			diagnosis: nestedDiagnosis,
			clinical_notes: nestedClinicalNotes,
			status: nestedStatus,
			priority_id: parseInt(nestedPriority),
			medical_order_file: nestedMedicalOrderFile,
			agregar_insumos: nestedAgregarInsumos,
			insumos: nestedInsumos,

			// Step 2 pricing details (set defaults here)
			selected_price: defaultPrice,
			age_discount_type: null,
			age_discount_amount: '0',
			additional_discount_enabled: false,
			additional_discount: '0',
		};

		if (nestedSpecimenToEditId) {
			setSpecimens(prev => prev.map(s => s.client_id === nestedSpecimenToEditId ? specObject : s));
			toast.success('Muestra editada en la lista temporal');
		} else {
			setSpecimens(prev => [...prev, specObject]);
			toast.success('Muestra agregada a la lista temporal');
		}

		setIsNestedFormOpen(false);
		setIsFormDirty(true);
	};

	// Step 2 Price calculations per specimen and global
	const handleSpecimenPriceChange = (clientId: string, price: string) => {
		setSpecimens(prev => prev.map(s => {
			if (s.client_id === clientId) {
				return { ...s, selected_price: price };
			}
			return s;
		}));
	};

	const handleSpecimenAgeDiscountToggle = (clientId: string, type: 'third' | 'fourth' | null) => {
		setSpecimens(prev => prev.map(s => {
			if (s.client_id === clientId) {
				const updatedType = s.age_discount_type === type ? null : type;
				let amt = 0;
				const basePrice = parseFloat(s.selected_price) || 0;
				if (updatedType === 'third') amt = (basePrice * thirdAgePercent) / 100;
				else if (updatedType === 'fourth') amt = (basePrice * fourthAgePercent) / 100;

				return { ...s, age_discount_type: updatedType, age_discount_amount: amt.toString() };
			}
			return s;
		}));
	};

	const handleSpecimenAdditionalDiscountToggle = (clientId: string, checked: boolean) => {
		setSpecimens(prev => prev.map(s => {
			if (s.client_id === clientId) {
				return {
					...s,
					additional_discount_enabled: checked,
					additional_discount: checked ? s.additional_discount || '0' : '0'
				};
			}
			return s;
		}));
	};

	const handleSpecimenAdditionalDiscountChange = (clientId: string, amount: string) => {
		setSpecimens(prev => prev.map(s => {
			if (s.client_id === clientId) {
				return { ...s, additional_discount: amount };
			}
			return s;
		}));
	};
	// Global Totals calculations
	const specimensBaseTotal = useMemo(() => {
		return specimens.reduce((sum, s) => {
			const prices = specimenTypes.find(t => t.id === s.specimen_type)?.prices || [];
			const maxVal = prices.length > 0 ? Math.max(...prices.map((p: any) => parseFloat(p.amount) || 0)) : 0;
			return sum + maxVal;
		}, 0);
	}, [specimens, specimenTypes]);

	const specimensAutoDiscount = useMemo(() => {
		return specimens.reduce((sum, s) => {
			const prices = specimenTypes.find(t => t.id === s.specimen_type)?.prices || [];
			const maxVal = prices.length > 0 ? Math.max(...prices.map((p: any) => parseFloat(p.amount) || 0)) : 0;
			const chosen = parseFloat(s.selected_price) || 0;
			const diff = Math.max(0, maxVal - chosen);
			const ageDisc = parseFloat(s.age_discount_amount) || 0;
			return sum + diff + ageDisc;
		}, 0);
	}, [specimens, specimenTypes]);

	const specimensAdditionalDiscount = useMemo(() => {
		return specimens.reduce((sum, s) => {
			const addDisc = s.additional_discount_enabled ? (parseFloat(s.additional_discount) || 0) : 0;
			return sum + addDisc;
		}, 0);
	}, [specimens]);

	const customAmountVal = useMemo(() => {
		return customAmountEnabled ? (parseFloat(customAmount) || 0) : 0;
	}, [customAmountEnabled, customAmount]);

	const globalDiscountTotal = useMemo(() => {
		return specimensAutoDiscount + specimensAdditionalDiscount;
	}, [specimensAutoDiscount, specimensAdditionalDiscount]);

	const finalSubtotalVal = useMemo(() => {
		const base = specimens.reduce((sum, s) => {
			const prices = specimenTypes.find(t => t.id === s.specimen_type)?.prices || [];
			const maxVal = prices.length > 0 ? Math.max(...prices.map((p: any) => parseFloat(p.amount) || 0)) : 0;
			return sum + maxVal;
		}, 0);
		return Math.max(0, (base + customAmountVal) - globalDiscountTotal);
	}, [specimens, specimenTypes, customAmountVal, globalDiscountTotal]);

	// Validation for step 1 wizard
	const validateStep1 = () => {
		if (!globalCustomerId) {
			toast.error('Seleccione el cliente de facturación del grupo.');
			return false;
		}
		if (specimens.length === 0) {
			toast.error('Agregue al menos una muestra al grupo.');
			return false;
		}
		return true;
	};

	const handleNextStep = () => {
		if (validateStep1()) {
			setCurrentStep(2);
		}
	};

	// Auto-fill detailed payment fields based on finalSubtotalVal and selections
	useEffect(() => {
		if (!isPaymentSheetOpen) return;
		const type = paymentType;
		if (type === 'cash') {
			setCashValue(finalSubtotalVal.toString());
			setCheckValue(''); setCheckNumber('');
			setCardValueCharged(''); setCardLast4(''); setCardExpiration(''); setCardAuthorizationCode('');
			setTransferValue(''); setTransferBankId(''); setTransferAuthorizationCode('');
		} else if (type === 'check') {
			setCheckValue(finalSubtotalVal.toString());
			setCashValue('');
			setCardValueCharged(''); setCardLast4(''); setCardExpiration(''); setCardAuthorizationCode('');
			setTransferValue(''); setTransferBankId(''); setTransferAuthorizationCode('');
		} else if (type === 'credit card') {
			setCardValueCharged(finalSubtotalVal.toString());
			setCashValue('');
			setCheckValue(''); setCheckNumber('');
			setTransferValue(''); setTransferBankId(''); setTransferAuthorizationCode('');
		} else if (type === 'bank transfer') {
			setTransferValue(finalSubtotalVal.toString());
			setCashValue('');
			setCheckValue(''); setCheckNumber('');
			setCardValueCharged(''); setCardLast4(''); setCardExpiration(''); setCardAuthorizationCode('');
		} else if (type === 'credit') {
			if (hasInitialPayment) {
				const initialAmt = initialPaymentAmount || '0';
				if (initialPaymentType === 'cash') {
					setCashValue(initialAmt);
					setCheckValue(''); setCheckNumber('');
					setCardValueCharged(''); setCardLast4(''); setCardExpiration(''); setCardAuthorizationCode('');
					setTransferValue(''); setTransferBankId(''); setTransferAuthorizationCode('');
				} else if (initialPaymentType === 'check') {
					setCheckValue(initialAmt);
					setCashValue('');
					setCardValueCharged(''); setCardLast4(''); setCardExpiration(''); setCardAuthorizationCode('');
					setTransferValue(''); setTransferBankId(''); setTransferAuthorizationCode('');
				} else if (initialPaymentType === 'credit card') {
					setCardValueCharged(initialAmt);
					setCashValue('');
					setCheckValue(''); setCheckNumber('');
					setTransferValue(''); setTransferBankId(''); setTransferAuthorizationCode('');
				} else if (initialPaymentType === 'bank transfer') {
					setTransferValue(initialAmt);
					setCashValue('');
					setCheckValue(''); setCheckNumber('');
					setCardValueCharged(''); setCardLast4(''); setCardExpiration(''); setCardAuthorizationCode('');
				}
			} else {
				setCashValue('');
				setCheckValue(''); setCheckNumber('');
				setCardValueCharged(''); setCardLast4(''); setCardExpiration(''); setCardAuthorizationCode('');
				setTransferValue(''); setTransferBankId(''); setTransferAuthorizationCode('');
			}
		}
	}, [finalSubtotalVal, paymentType, hasInitialPayment, initialPaymentAmount, initialPaymentType, isPaymentSheetOpen]);

	const handleSavePaymentDetails = () => {
		// Validate local payment inputs
		if (!paymentType) {
			toast.error('Seleccione el tipo de pago.');
			return;
		}
		if (paymentType === 'cash' && (!cashValue || parseFloat(cashValue) <= 0)) {
			toast.error('Ingrese el monto en efectivo recibido.');
			return;
		}
		if (paymentType === 'check') {
			if (!checkNumber) {
				toast.error('Ingrese el número de cheque.');
				return;
			}
			if (!checkValue || parseFloat(checkValue) <= 0) {
				toast.error('Ingrese el valor del cheque.');
				return;
			}
		}
		if (paymentType === 'credit card') {
			if (!cardLast4 || cardLast4.length !== 4) {
				toast.error('Ingrese los últimos 4 dígitos de la tarjeta.');
				return;
			}
			if (!cardExpiration || !/^(0[1-9]|1[0-2])\/\d{2}(\d{2})?$/.test(cardExpiration)) {
				toast.error('Ingrese la fecha de vencimiento (MM/AA).');
				return;
			}
			if (!cardAuthorizationCode) {
				toast.error('Ingrese el código de autorización.');
				return;
			}
			if (!cardValueCharged || parseFloat(cardValueCharged) <= 0) {
				toast.error('Ingrese el valor cobrado.');
				return;
			}
		}
		if (paymentType === 'bank transfer') {
			if (!transferBankId) {
				toast.error('Seleccione el banco receptor.');
				return;
			}
			if (!transferAuthorizationCode) {
				toast.error('Ingrese el código de transferencia.');
				return;
			}
			if (!transferValue || parseFloat(transferValue) <= 0) {
				toast.error('Ingrese el valor transferido.');
				return;
			}
		}
		if (paymentType === 'credit' && hasInitialPayment) {
			const initialAmt = parseFloat(initialPaymentAmount) || 0;
			if (initialAmt <= 0) {
				toast.error('Ingrese el monto de pago inicial.');
				return;
			}
			if (initialAmt > finalSubtotalVal) {
				toast.error('El pago inicial no puede superar el subtotal.');
				return;
			}
			if (initialPaymentType === 'check' && !checkNumber) {
				toast.error('Ingrese el número de cheque.');
				return;
			}
			if (initialPaymentType === 'credit card') {
				if (!cardLast4 || cardLast4.length !== 4) {
					toast.error('Ingrese los últimos 4 dígitos de la tarjeta.');
					return;
				}
				if (!cardExpiration || !/^(0[1-9]|1[0-2])\/\d{2}(\d{2})?$/.test(cardExpiration)) {
					toast.error('Ingrese la fecha de vencimiento (MM/AA).');
					return;
				}
				if (!cardAuthorizationCode) {
					toast.error('Ingrese el código de autorización.');
					return;
				}
			}
			if (initialPaymentType === 'bank transfer') {
				if (!transferBankId) {
					toast.error('Seleccione el banco.');
					return;
				}
				if (!transferAuthorizationCode) {
					toast.error('Ingrese la referencia/código.');
					return;
				}
			}
		}

		setIsPaymentSheetOpen(false);
		toast.success('Método de pago configurado.');
	};

	// Form submit handler
	const handleSubmitGroup = (e: React.FormEvent) => {
		e.preventDefault();

		// Step 2 validations
		if (!paymentType) {
			toast.error('Configure el método de pago.');
			return;
		}

		const isProofRequired =
			(paymentType !== 'credit' && paymentType !== 'cash') ||
			(paymentType === 'credit' && hasInitialPayment && initialPaymentType !== 'cash');

		if (isProofRequired && !proofOfPayment) {
			toast.error('El comprobante de pago es obligatorio.');
			return;
		}

		// Validate custom amount
		if (customAmountEnabled) {
			if (!customAmount || parseFloat(customAmount) < 0) {
				toast.error('El importe personalizado debe ser mayor o igual a 0.');
				return;
			}
			if (!customAmountReason.trim()) {
				toast.error('Ingrese la razón del cargo adicional.');
				return;
			}
		}

		// Check if browser reportValidity passes
		const formEl = e.currentTarget as HTMLFormElement;
		if (!formEl.reportValidity()) return;

		setProcessing(true);

		// Build request payload using Inertia router POST
		const payload: Record<string, any> = {
			global_customer_id: globalCustomerId,
			payment_type: paymentType,
			has_initial_payment: hasInitialPayment,
			initial_payment_amount: hasInitialPayment ? initialPaymentAmount : null,
			initial_payment_type: hasInitialPayment ? initialPaymentType : null,
			custom_amount_enabled: customAmountEnabled,
			custom_amount: customAmountEnabled ? customAmount : '0',
			custom_amount_reason: customAmountEnabled ? customAmountReason : '',
			payment_method_date: paymentMethodDate,
			proof_of_payment: proofOfPayment,

			// Detailed payment fields
			cash_value: cashValue,
			check_number: checkNumber,
			check_value: checkValue,
			card_last_4: cardLast4,
			card_value_charged: cardValueCharged,
			card_expiration: cardExpiration,
			card_authorization_code: cardAuthorizationCode,
			transfer_bank_id: transferBankId,
			transfer_value: transferValue,
			transfer_authorization_code: transferAuthorizationCode,

			// Specimens list
			specimens: specimens.map(s => ({
				customer: s.customer,
				specimen_type: s.specimen_type,
				specimen_type_examination: s.specimen_type_examination,
				specimen_category: s.specimen_category,
				referrer: s.referrer,
				anatomic_site: s.anatomic_site,
				diagnosis: s.diagnosis,
				clinical_notes: s.clinical_notes,
				status: s.status,
				priority_id: s.priority_id,
				selected_price: s.selected_price,
				age_discount_type: s.age_discount_type,
				age_discount_amount: s.age_discount_amount,
				additional_discount_enabled: s.additional_discount_enabled,
				additional_discount: s.additional_discount,

				// Nest supplies
				insumos: s.insumos.map((i: any) => ({
					id: i.id,
					quantity: i.quantity,
					price: i.price,
				}))
			}))
		};

		// Attach medical order files dynamically
		specimens.forEach((s, idx) => {
			if (s.medical_order_file instanceof File) {
				payload[`specimens.${idx}.medical_order_file`] = s.medical_order_file;
			}
		});

		router.post('/specimen-groups', payload, {
			onSuccess: () => {
				setProcessing(false);
				setIsFormDirty(false);
				onOpenChange(false);
				toast.success('Muestras agrupadas creadas y facturadas con éxito');
			},
			onError: (err) => {
				setProcessing(false);
				console.error(err);
				const firstErr = Object.values(err)[0];
				toast.error(typeof firstErr === 'string' ? firstErr : 'Error al registrar el grupo de muestras');
			}
		});
	};

	const getPaymentTypeLabel = (type: string) => {
		switch (type) {
			case 'cash': return 'Efectivo';
			case 'credit card': return 'Tarjeta de Crédito';
			case 'bank transfer': return 'Transferencia Bancaria';
			case 'check': return 'Cheque';
			case 'credit': return 'Al Crédito';
			default: return type || 'Sin seleccionar';
		}
	};

	return (
		<>
			{processing && (
				<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4">
					<Spinner className="w-12 h-12 text-primary" />
					<div className="flex flex-col items-center text-center">
						<h3 className="text-lg font-bold text-foreground">Procesando Grupo de Facturación</h3>
						<p className="text-sm text-muted-foreground max-w-xs mt-1">
							Estamos creando las muestras, incrementando CAI y compilando la factura grupal en PDF. Espere.
						</p>
					</div>
				</div>
			)}

			<Sheet open={open} onOpenChange={handleOpenChange}>
				<SheetContent className="w-full sm:max-w-[90vw] md:max-w-[1000px] lg:max-w-[1200px] overflow-y-auto">
					<HeadingSheet
						title="Crear Muestra Agrupada"
						description="Registre múltiples muestras asignadas a la misma factura grupal con una gestión integral de precios e insumos."
					/>

					{/* Wizard Steps indicator */}
					<div className="mx-5 mb-6 bg-muted/40 p-4 rounded-lg border border-border/60 flex flex-col gap-4">
						<div className="flex items-center justify-center flex-nowrap gap-2 sm:gap-4 pb-4 border-b border-border/40 w-full max-w-lg mx-auto">
							{/* Step 1 */}
							<button
								type="button"
								onClick={() => {
									if (currentStep > 1) {
										setCurrentStep(1);
									}
								}}
								className={cn(
									"flex items-center gap-2 sm:gap-3 group text-left cursor-pointer focus:outline-none",
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
									<span className="text-xs font-bold leading-none text-foreground">
										Paso 1
									</span>
									<span className="hidden sm:block text-[11px] font-semibold text-primary mt-1 leading-none">
										Muestras a Registrar
									</span>
								</div>
							</button>

							<div className="h-[2px] w-8 sm:w-12 bg-muted-foreground/20 rounded-full overflow-hidden shrink-0">
								<div className={cn(
									"h-full bg-primary transition-all duration-300 ease-out",
									currentStep > 1 ? "w-full" : "w-0"
								)} />
							</div>

							{/* Step 2 */}
							<button
								type="button"
								onClick={handleNextStep}
								className={cn(
									"flex items-center gap-2 sm:gap-3 group text-left cursor-pointer focus:outline-none",
									currentStep !== 2 && "hover:opacity-80"
								)}
							>
								<div className={cn(
									"w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 shrink-0",
									currentStep === 2
										? "bg-primary text-primary-foreground ring-4 ring-primary/10"
										: "bg-muted text-muted-foreground border border-border"
								)}>
									2
								</div>
								<div className="flex flex-col">
									<span className="text-xs font-bold leading-none text-muted-foreground group-hover:text-foreground">
										Paso 2
									</span>
									<span className="hidden sm:block text-[11px] font-medium mt-1 leading-none text-muted-foreground group-hover:text-foreground">
										Facturación Grupal
									</span>
								</div>
							</button>
						</div>

						{/* Customer Global Selector */}
						<div className="space-y-4">
							<div className="flex items-center justify-between gap-5">
								<div className="flex items-center gap-2 w-full">
									<span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cliente</span>
									<div className="flex flex-col w-full gap-2">
										<FormCombobox
											placeholder="Seleccionar cliente"
											value={globalCustomerId}
											onChange={(v) => {
												setGlobalCustomerId(v);
												setIsFormDirty(true);
											}}
											options={customers.map(c => ({ label: c.name, value: c.id.toString() }))}
										/>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setIsCustomerSheetOpen(true)}
									className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
								>
									<Plus className="w-3 h-3" /> Nuevo
								</button>
							</div>

							{selectedGlobalCustomer && (
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border/50 text-xs">
									<div className="flex flex-col gap-1">
										<span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">RTN / Identidad</span>
										<span className="font-mono text-foreground font-medium">{selectedGlobalCustomer.id_number || 'N/A'}</span>
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Correo Electrónico</span>
										<span className="text-foreground font-medium break-all">{selectedGlobalCustomer.email || 'Sin correo'}</span>
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Teléfono</span>
										<span className="text-foreground font-medium">{selectedGlobalCustomer.phone || 'N/A'}</span>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Step 1 Content */}
					{currentStep === 1 && (
						<div className="px-5 space-y-6">
							<div className="flex justify-between items-center border-b pb-4">
								<div className="space-y-0.5">
									<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
										Muestras en este Grupo
									</h3>
									<p className="text-xs text-muted-foreground">
										Cree y configure la lista de muestras para facturar juntas.
									</p>
								</div>
								<Button
									onClick={handleOpenNestedForm}
									disabled={!globalCustomerId}
									className="font-semibold text-xs"
									size="sm"
								>
									<Plus className="w-4 h-4 mr-1.5" /> Agregar Muestra
								</Button>
							</div>

							{specimens.length === 0 ? (
								<div className="flex flex-col items-center justify-center border-2 border-dashed border-muted/50 rounded-xl p-16 text-center">
									<Microscope className="w-12 h-12 text-muted-foreground/30 mb-4" />
									<h3 className="text-sm font-bold text-foreground mb-1">Sin Muestras</h3>
									<p className="text-xs text-muted-foreground max-w-sm mb-4">
										{!globalCustomerId
											? 'Seleccione un cliente de facturación en la barra superior antes de comenzar.'
											: 'Presione "Agregar Muestra" para registrar el primer espécimen en esta factura grupal.'}
									</p>
								</div>
							) : (
								<div className="border rounded-xl bg-card overflow-hidden">
									<Table>
										<TableHeader>
											<TableRow className="bg-muted/40">
												<TableHead className="w-12">Nº</TableHead>
												<TableHead>Paciente</TableHead>
												<TableHead>Examen</TableHead>
												<TableHead>Remitente</TableHead>
												<TableHead>Insumos</TableHead>
												<TableHead className="w-24 text-right">Acciones</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{specimens.map((spec, idx) => (
												<TableRow key={spec.client_id} className="hover:bg-accent/5">
													<TableCell className="font-semibold">{idx + 1}</TableCell>
													<TableCell>
														<div className="font-semibold text-sm">{spec.customer_name}</div>
													</TableCell>
													<TableCell>
														<div className="font-medium text-xs text-primary">{spec.specimen_type_examination_name}</div>
														<div className="text-[10px] text-muted-foreground mt-0.5">{spec.specimen_type_name}</div>
													</TableCell>
													<TableCell>
														<span className="text-xs text-muted-foreground">
															{referrers.find(r => r.id === spec.referrer)?.name || 'N/A'}
														</span>
													</TableCell>
													<TableCell>
														<Badge variant={spec.insumos.length > 0 ? "secondary" : "outline"} className="text-[10px]">
															{spec.insumos.length} reactivos
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														<div className="flex justify-end gap-1.5">
															<Button
																variant="ghost"
																size="icon"
																onClick={() => handleEditNestedSpecimen(spec)}
																className="h-8 w-8 text-muted-foreground hover:text-foreground"
															>
																<Edit2 className="w-3.5 h-3.5" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => handleDeleteNestedSpecimen(spec.client_id)}
																className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
															>
																<Trash2 className="w-3.5 h-3.5" />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}

							<div className="flex justify-end border-t pt-4 mt-6">
								<Button
									onClick={handleNextStep}
									disabled={specimens.length === 0}
									className="font-semibold"
								>
									Siguiente Paso
								</Button>
							</div>
						</div>
					)}

					{/* Step 2 Content */}
					{currentStep === 2 && (
						<form onSubmit={handleSubmitGroup} className="px-5 space-y-6 pb-6">
							<div className="space-y-0.5 border-b pb-4">
								<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
									Detalles de Facturación y Metodología
								</h3>
								<p className="text-xs text-muted-foreground">
									Configure el método de pago, cargue comprobantes y revise los insumos/precios de cada muestra.
								</p>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
								{/* Left column: List of specimens collapse and Payment config */}
								<div className="lg:col-span-8 space-y-6">

									{/* Specimens configuration cards */}
									<div className="space-y-4">
										<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
											Configuración de Precios e Insumos por Muestra
										</h4>
										{specimens.map((spec, specIdx) => {
											const prices = specimenTypes.find(t => t.id === spec.specimen_type)?.prices || [];
											const maxVal = prices.length > 0 ? Math.max(...prices.map((p: any) => parseFloat(p.amount) || 0)) : 0;
											const chosen = parseFloat(spec.selected_price) || 0;
											const diffDiscount = Math.max(0, maxVal - chosen);
											const ageDiscVal = parseFloat(spec.age_discount_amount) || 0;
											const addDiscVal = spec.additional_discount_enabled ? (parseFloat(spec.additional_discount) || 0) : 0;
											const specimenSubtotal = Math.max(0, maxVal - (diffDiscount + ageDiscVal + addDiscVal));

											return (
												<Card key={spec.client_id} className="border border-border/80 shadow-sm overflow-hidden">
													<CardHeader className="bg-muted/40 py-3 px-4 flex flex-row justify-between items-center">
														<div className="flex flex-col gap-0.5">
															<div className="text-sm font-bold text-foreground">
																Muestra #{specIdx + 1} - {spec.specimen_type_examination_name}
															</div>
															<div className="text-xs text-muted-foreground">
																Paciente: <strong className="text-foreground">{spec.customer_name}</strong>
															</div>
														</div>
														<Badge variant="outline" className="font-mono text-xs">
															Subtotal: L. {specimenSubtotal.toFixed(2)}
														</Badge>
													</CardHeader>
													<CardContent className="p-4 space-y-4">
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
															<div className="grid gap-2">
																<Label className="text-xs font-semibold">Seleccionar Precio (L.)</Label>
																<Select
																	value={spec.selected_price}
																	onValueChange={(val) => handleSpecimenPriceChange(spec.client_id, val)}
																>
																	<SelectTrigger className="h-9">
																		<SelectValue placeholder="Seleccione un precio" />
																	</SelectTrigger>
																	<SelectContent className="z-[110]">
																		{prices.map((p: any) => (
																			<SelectItem key={p.id} value={p.amount.toString()}>
																				L. {parseFloat(p.amount).toFixed(2)}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															</div>

															<div className="grid gap-2">
																<Label className="text-xs font-semibold">Descuento Estimado (L.)</Label>
																<Input
																	type="number"
																	value={(diffDiscount + ageDiscVal + addDiscVal).toFixed(2)}
																	disabled
																	readOnly
																	className="bg-muted font-mono font-semibold text-emerald-600 h-9"
																/>
															</div>
														</div>

														{/* Age discounts switches */}
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
															<div className="flex items-center justify-between p-2.5 bg-muted/20 border rounded-lg">
																<div className="flex flex-col gap-0.5">
																	<Label className="text-xs font-semibold">Tercera Edad ({thirdAgePercent}%)</Label>
																	<span className="text-[10px] text-muted-foreground">Aplica descuento al precio base</span>
																</div>
																<Switch
																	checked={spec.age_discount_type === 'third'}
																	onCheckedChange={() => handleSpecimenAgeDiscountToggle(spec.client_id, 'third')}
																/>
															</div>

															<div className="flex items-center justify-between p-2.5 bg-muted/20 border rounded-lg">
																<div className="flex flex-col gap-0.5">
																	<Label className="text-xs font-semibold">Cuarta Edad ({fourthAgePercent}%)</Label>
																	<span className="text-[10px] text-muted-foreground">Aplica descuento al precio base</span>
																</div>
																<Switch
																	checked={spec.age_discount_type === 'fourth'}
																	onCheckedChange={() => handleSpecimenAgeDiscountToggle(spec.client_id, 'fourth')}
																/>
															</div>
														</div>

														{/* Additional discount toggle for specimen */}
														<div className="p-3 bg-muted/20 border rounded-lg flex flex-col gap-3">
															<div className="flex items-center justify-between">
																<div className="flex flex-col gap-0.5">
																	<Label className="text-xs font-semibold">Descuento Adicional Muestra</Label>
																	<span className="text-[10px] text-muted-foreground">Descuento extra personalizado</span>
																</div>
																<Switch
																	checked={spec.additional_discount_enabled}
																	onCheckedChange={(checked) => handleSpecimenAdditionalDiscountToggle(spec.client_id, checked)}
																/>
															</div>
															{spec.additional_discount_enabled && (
																<div className="pt-2 border-t border-border/50">
																	<Input
																		type="number"
																		step="0.01"
																		min="0"
																		placeholder="0.00"
																		value={spec.additional_discount}
																		onChange={(e) => handleSpecimenAdditionalDiscountChange(spec.client_id, e.target.value)}
																		className="h-8"
																	/>
																</div>
															)}
														</div>

														{/* Supply summary for specimen */}
														{spec.insumos && spec.insumos.length > 0 && (
															<div className="space-y-2 border-t pt-3">
																<Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
																	Insumos / Reactivos
																</Label>
																<div className="border rounded-lg bg-card/50 overflow-hidden divide-y divide-border/60">
																	{spec.insumos.map((ins: any) => (
																		<div key={ins.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/10 transition-colors">
																			<div className="flex flex-col gap-0.5 max-w-[70%]">
																				<span className="font-medium text-foreground truncate">{ins.name}</span>
																				<span className="text-[10px] font-mono text-muted-foreground">{ins.code}</span>
																			</div>
																			<div className="text-right flex flex-col gap-0.5 shrink-0">
																				<span className="font-semibold text-foreground">
																					{ins.quantity} x L. {parseFloat(ins.price).toFixed(2)}
																				</span>
																				<span className="text-[10px] text-muted-foreground font-mono">
																					Total: L. {(ins.quantity * parseFloat(ins.price)).toFixed(2)}
																				</span>
																			</div>
																		</div>
																	))}
																</div>
															</div>
														)}
													</CardContent>
												</Card>
											);
										})}
									</div>

									{/* Cobrar otro importe personalizado */}
									<div className="flex flex-col gap-3 p-4 bg-muted/30 border rounded-lg">
										<div className="flex items-center justify-between">
											<div className="flex flex-col gap-0.5">
												<Label htmlFor="custom-amount-toggle" className="text-xs font-semibold cursor-pointer">
													Cobrar otro importe personalizado (Grupo)
												</Label>
												<span className="text-[10px] text-muted-foreground">
													Permite agregar un importe manual para servicios adicionales del grupo.
												</span>
											</div>
											<Switch
												id="custom-amount-toggle"
												checked={customAmountEnabled}
												onCheckedChange={(checked) => {
													setCustomAmountEnabled(checked);
													setCustomAmount(checked ? '0' : '0');
													setCustomAmountReason('');
												}}
											/>
										</div>

										{customAmountEnabled && (
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
														value={customAmount}
														onChange={(e) => setCustomAmount(e.target.value)}
														placeholder="0.00"
														required
													/>
												</div>
												<div className="grid gap-1.5">
													<Label htmlFor="custom_amount_reason" className="text-xs">
														Concepto / Razón del Importe Adicional <span className="text-destructive">*</span>
													</Label>
													<Input
														id="custom_amount_reason"
														type="text"
														value={customAmountReason}
														onChange={(e) => setCustomAmountReason(e.target.value)}
														placeholder="Ej. Materiales especiales, urgencia, etc."
														required
													/>
												</div>
											</div>
										)}
									</div>

									{/* Detailed payment configuration */}
									<div className="flex flex-col gap-3 p-4 bg-muted/30 border rounded-lg">
										<div className="flex items-center justify-between">
											<div>
												<span className="text-xs font-semibold">Método de pago:</span>
												<span className="ml-2 px-2.5 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary font-bold capitalize">
													{getPaymentTypeLabel(paymentType)}
												</span>
											</div>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setIsPaymentSheetOpen(true)}
												className="font-semibold h-8"
											>
												{paymentType ? 'Cambiar método de Pago' : 'Seleccionar método de pago'}
											</Button>
										</div>

										{paymentType ? (
											<div className="flex flex-col gap-1.5 text-xs text-muted-foreground mt-2 border-t pt-3">
												<div className="flex justify-between items-center">
													<span>Método de Pago:</span>
													<span className="font-bold text-foreground capitalize flex items-center gap-1">
														{paymentType === 'cash' && <Wallet className="w-3.5 h-3.5 text-primary" />}
														{paymentType === 'credit card' && <CreditCard className="w-3.5 h-3.5 text-primary" />}
														{paymentType === 'bank transfer' && <Landmark className="w-3.5 h-3.5 text-primary" />}
														{paymentType === 'check' && <Receipt className="w-3.5 h-3.5 text-primary" />}
														{getPaymentTypeLabel(paymentType)}
													</span>
												</div>
												{paymentMethodDate && (
													<div className="flex justify-between">
														<span>Fecha:</span>
														<span className="font-mono text-foreground">{paymentMethodDate}</span>
													</div>
												)}
												{paymentType === 'cash' && cashValue && (
													<div className="flex justify-between">
														<span>Monto Efectivo:</span>
														<span className="font-semibold text-foreground font-mono">L. {parseFloat(cashValue).toFixed(2)}</span>
													</div>
												)}
												{paymentType === 'check' && (
													<>
														{checkNumber && (
															<div className="flex justify-between">
																<span>Número de Cheque:</span>
																<span className="font-semibold text-foreground font-mono">{checkNumber}</span>
															</div>
														)}
														{checkValue && (
															<div className="flex justify-between">
																<span>Monto Cheque:</span>
																<span className="font-semibold text-foreground font-mono">L. {parseFloat(checkValue).toFixed(2)}</span>
															</div>
														)}
													</>
												)}
												{paymentType === 'credit card' && (
													<>
														{cardLast4 && (
															<div className="flex justify-between">
																<span>Tarjeta (Últimos 4):</span>
																<span className="font-semibold text-foreground font-mono">**** {cardLast4}</span>
															</div>
														)}
														{cardExpiration && (
															<div className="flex justify-between">
																<span>Expira:</span>
																<span className="font-semibold text-foreground font-mono">{cardExpiration}</span>
															</div>
														)}
														{cardAuthorizationCode && (
															<div className="flex justify-between">
																<span>Código Autorización:</span>
																<span className="font-semibold text-foreground font-mono">{cardAuthorizationCode}</span>
															</div>
														)}
														{cardValueCharged && (
															<div className="flex justify-between">
																<span>Monto Cobrado:</span>
																<span className="font-semibold text-foreground font-mono">L. {parseFloat(cardValueCharged).toFixed(2)}</span>
															</div>
														)}
													</>
												)}
												{paymentType === 'bank transfer' && (
													<>
														{transferBankId && (
															<div className="flex justify-between">
																<span>Banco:</span>
																<span className="font-semibold text-foreground">
																	{banks.find(b => b.id.toString() === transferBankId.toString())?.name || 'Banco Seleccionado'}
																</span>
															</div>
														)}
														{transferAuthorizationCode && (
															<div className="flex justify-between">
																<span>Código Transferencia:</span>
																<span className="font-semibold text-foreground font-mono">{transferAuthorizationCode}</span>
															</div>
														)}
														{transferValue && (
															<div className="flex justify-between">
																<span>Monto Transferido:</span>
																<span className="font-semibold text-foreground font-mono">L. {parseFloat(transferValue).toFixed(2)}</span>
															</div>
														)}
													</>
												)}
												{paymentType === 'credit' && (
													<>
														<div className="flex justify-between">
															<span>Pago Inicial:</span>
															<span className="font-semibold text-foreground">{hasInitialPayment ? 'Sí' : 'No'}</span>
														</div>
														{hasInitialPayment && (
															<>
																<div className="flex justify-between">
																	<span>Monto Inicial:</span>
																	<span className="font-semibold text-foreground font-mono">L. {parseFloat(initialPaymentAmount || '0').toFixed(2)}</span>
																</div>
																<div className="flex justify-between">
																	<span>Tipo de Pago Inicial:</span>
																	<span className="font-semibold text-foreground capitalize">{getPaymentTypeLabel(initialPaymentType)}</span>
																</div>
															</>
														)}
													</>
												)}
											</div>
										) : (
											<div className="text-[11px] text-muted-foreground mt-2 border-t pt-2.5 italic">
												Por favor, configure los detalles del pago.
											</div>
										)}
									</div>

									{/* Proof of Payment File Upload */}
									{((paymentType !== 'cash' && paymentType !== 'credit' && paymentType !== '') || (paymentType === 'credit' && hasInitialPayment && initialPaymentType !== 'cash')) && (
										<div className="grid gap-2">
											<Label htmlFor="proof_of_payment">
												Comprobante de Pago (PDF o Imagen) <span className="text-destructive">*</span>
											</Label>

											{proofOfPayment ? (
												<div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20">
													<div className="flex items-center gap-3">
														<div className="p-2 bg-emerald-500/10 rounded-md text-emerald-500">
															<FileText className="w-5 h-5" />
														</div>
														<div className="flex flex-col text-xs">
															<span className="font-semibold text-foreground truncate max-w-[150px] sm:max-w-xs">
																{proofOfPayment.name}
															</span>
															<span className="text-[10px] text-muted-foreground">
																{(proofOfPayment.size / 1024 / 1024).toFixed(2)} MB
															</span>
														</div>
													</div>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => setProofOfPayment(null)}
														className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
													>
														<X className="w-4 h-4" />
													</Button>
												</div>
											) : (
												<div className="relative group">
													<input
														type="file"
														id="proof_of_payment"
														className="hidden"
														accept=".pdf,image/*"
														onChange={(e) => {
															const file = e.target.files?.[0] || null;
															if (file && file.size > 50 * 1024 * 1024) {
																toast.error("El archivo de Comprobante no debe exceder los 50MB.");
																e.target.value = '';
																return;
															}
															setProofOfPayment(file);
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
															PDF o imágenes hasta 50MB
														</span>
													</label>
												</div>
											)}
										</div>
									)}

								</div>

								{/* Right column: Total Resume Card */}
								<div className="lg:col-span-4 space-y-4">
									<div className="p-5 rounded-xl bg-muted/30 dark:bg-muted/10 border shadow-sm flex flex-col gap-4">
										<h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
											Resumen de Totales (Grupo)
										</h4>
										<div className="flex flex-col gap-3 mt-2">
											<div className="flex justify-between text-xs">
												<span className="text-muted-foreground">Precio Regular Muestras:</span>
												<span className="font-semibold text-foreground">L. {specimensBaseTotal.toFixed(2)}</span>
											</div>

											{customAmountEnabled && (
												<div className="flex flex-col gap-0.5 text-xs">
													<div className="flex justify-between">
														<span className="text-muted-foreground">Importe Personalizado:</span>
														<span className="font-semibold text-foreground text-primary">L. {customAmountVal.toFixed(2)}</span>
													</div>
													{customAmountReason && (
														<span className="text-[10px] text-muted-foreground italic truncate">
															Razón: {customAmountReason}
														</span>
													)}
												</div>
											)}

											{globalDiscountTotal > 0 ? (
												<div className="flex flex-col gap-1.5 bg-emerald-500/5 dark:bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
													<span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Descuentos Aplicados</span>
													{specimensAutoDiscount > 0 && (
														<div className="flex justify-between text-xs">
															<span>Descuentos Muestras / Edad:</span>
															<span className="font-semibold">- L. {specimensAutoDiscount.toFixed(2)}</span>
														</div>
													)}
													{specimensAdditionalDiscount > 0 && (
														<div className="flex justify-between text-xs">
															<span>Descuentos Adicionales:</span>
															<span className="font-semibold">- L. {specimensAdditionalDiscount.toFixed(2)}</span>
														</div>
													)}
													<Separator className="bg-emerald-500/20 my-1" />
													<div className="flex justify-between text-xs font-bold">
														<span>Descuento Total:</span>
														<span>- L. {globalDiscountTotal.toFixed(2)}</span>
													</div>
												</div>
											) : (
												<div className="flex justify-between text-xs">
													<span className="text-muted-foreground">Descuento:</span>
													<span className="text-emerald-600 dark:text-emerald-400 font-semibold">- L. 0.00</span>
												</div>
											)}
											<Separator />
											<div className="flex justify-between text-xs">
												<span className="text-muted-foreground">Sub-Total:</span>
												<span className="font-semibold text-foreground">L. {finalSubtotalVal.toFixed(2)}</span>
											</div>
											<div className="flex justify-between text-xs">
												<span className="text-muted-foreground flex flex-col">
													<span>Importe Exonerado:</span>
													<span className="text-[10px] text-muted-foreground/80">(Servicios médicos)</span>
												</span>
												<span className="font-semibold text-foreground">L. {finalSubtotalVal.toFixed(2)}</span>
											</div>
											<div className="flex justify-between text-xs">
												<span className="text-muted-foreground">Importe Exento:</span>
												<span className="font-semibold text-foreground">L. 0.00</span>
											</div>
											<div className="flex justify-between text-xs">
												<span className="text-muted-foreground">ISV 15% / 18%:</span>
												<span className="font-semibold text-foreground">L. 0.00</span>
											</div>
											<Separator className="h-0.5" />
											<div className="flex justify-between items-center mt-2">
												<span className="text-sm font-bold text-foreground">Total a Pagar:</span>
												<span className="text-lg font-extrabold text-primary font-mono">L. {finalSubtotalVal.toFixed(2)}</span>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Wizard navigation buttons */}
							<div className="flex items-center justify-between gap-3 pt-4 border-t mt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => setCurrentStep(1)}
									className="w-full sm:w-auto"
								>
									Atrás
								</Button>
								<Button
									type="submit"
									className="w-full sm:w-auto"
									disabled={processing}
								>
									{processing && <Spinner className="mr-2" />}
									Facturar y Crear Muestras
								</Button>
							</div>
						</form>
					)}
				</SheetContent>
			</Sheet>

			{/* Nested Specimen Form Dialog */}
			<Sheet open={isNestedFormOpen} onOpenChange={setIsNestedFormOpen}>
				<SheetContent side="right" className="w-full max-w-[550px] sm:max-w-[750px] overflow-y-auto z-[90]">
					<HeadingSheet
						title={nestedSpecimenToEditId ? "Editar Muestra del Grupo" : "Agregar Muestra al Grupo"}
						description="Ingrese los datos requeridos para registrar este espécimen en el grupo."
					/>

					<div className="px-5 py-4 space-y-5">
						<div className="grid gap-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="nested_customer">Paciente / Cliente</Label>
								<button
									type="button"
									onClick={() => setIsCustomerSheetOpen(true)}
									className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
								>
									<Plus className="w-3.5 h-3.5" /> Nuevo
								</button>
							</div>
							<FormCombobox
								placeholder="Seleccionar paciente"
								value={nestedCustomer}
								onChange={(v) => {
									setNestedCustomer(v);
									setNestedErrors(prev => ({ ...prev, customer: '' }));
								}}
								options={customers.map(c => ({ label: c.name, value: c.id.toString() }))}
							/>
							{nestedErrors.customer && <p className="text-xs text-destructive">{nestedErrors.customer}</p>}
						</div>

						<div className="grid gap-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="nested_referrer">Médico Remitente</Label>
								<button
									type="button"
									onClick={() => setIsReferrerSheetOpen(true)}
									className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
								>
									<Plus className="w-3.5 h-3.5" /> Nuevo
								</button>
							</div>
							<FormCombobox
								placeholder="Seleccionar médico"
								value={nestedReferrer}
								onChange={(v) => {
									setNestedReferrer(v);
									setNestedErrors(prev => ({ ...prev, referrer: '' }));
								}}
								options={referrers.map(r => ({ label: r.name, value: r.id.toString() }))}
							/>
							{nestedErrors.referrer && <p className="text-xs text-destructive">{nestedErrors.referrer}</p>}
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="grid gap-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="nested_specimen_type">Tipo de Muestra</Label>
									<button
										type="button"
										onClick={() => setIsSpecimenTypeSheetOpen(true)}
										className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
									>
										<Plus className="w-3.5 h-3.5" /> Nuevo
									</button>
								</div>
								<FormCombobox
									placeholder="Seleccionar tipo"
									value={nestedSpecimenType}
									onChange={(v) => {
										setNestedSpecimenType(v);
										setNestedExamination(''); // reset exam
										setNestedErrors(prev => ({ ...prev, specimen_type: '' }));
									}}
									options={specimenTypes.map(t => ({ label: t.name, value: t.id.toString() }))}
								/>
								{nestedErrors.specimen_type && <p className="text-xs text-destructive">{nestedErrors.specimen_type}</p>}
							</div>

							<div className="grid gap-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="nested_examination">Análisis / Examen</Label>
									<button
										type="button"
										onClick={() => setIsExaminationSheetOpen(true)}
										disabled={!nestedSpecimenType}
										className="text-xs font-medium text-primary hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Plus className="w-3.5 h-3.5" /> Nuevo
									</button>
								</div>
								<FormCombobox
									placeholder={nestedSpecimenType ? "Seleccionar examen" : "Primero seleccione tipo de muestra"}
									value={nestedExamination}
									disabled={!nestedSpecimenType}
									onChange={(v) => {
										setNestedExamination(v);
										setNestedErrors(prev => ({ ...prev, specimen_type_examination: '' }));
									}}
									options={examinations
										.filter(e => e.specimen_type?.toString() === nestedSpecimenType)
										.map(e => ({ label: e.name, value: e.id.toString() }))}
								/>
								{nestedErrors.specimen_type_examination && <p className="text-xs text-destructive">{nestedErrors.specimen_type_examination}</p>}
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="grid gap-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="nested_category">Categoría (Tiempo)</Label>
									<button
										type="button"
										onClick={() => setIsCategorySheetOpen(true)}
										className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
									>
										<Plus className="w-3.5 h-3.5" /> Nuevo
									</button>
								</div>
								<FormCombobox
									placeholder="Seleccionar categoría"
									value={nestedCategory}
									onChange={(v) => {
										setNestedCategory(v);
										setNestedErrors(prev => ({ ...prev, specimen_category: '' }));
									}}
									options={categories.map(c => ({ label: c.name, value: c.id.toString() }))}
								/>
								{nestedErrors.specimen_category && <p className="text-xs text-destructive">{nestedErrors.specimen_category}</p>}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="nested_priority">Prioridad</Label>
								<FormCombobox
									placeholder="Seleccionar prioridad"
									value={nestedPriority}
									onChange={(v) => {
										setNestedPriority(v);
										setNestedErrors(prev => ({ ...prev, priority_id: '' }));
									}}
									options={priorities.map(p => ({ label: p.name, value: p.id.toString(), color: p.color }))}
								/>
								{nestedErrors.priority_id && <p className="text-xs text-destructive">{nestedErrors.priority_id}</p>}
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="nested_anatomic_site">Sitio Anatómico</Label>
								<Input
									id="nested_anatomic_site"
									value={nestedAnatomicSite}
									onChange={(e) => setNestedAnatomicSite(e.target.value)}
									placeholder="Ej. Brazo izquierdo..."
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="nested_status">Estado Inicial</Label>
								<FormCombobox
									placeholder="Seleccionar estado"
									value={nestedStatus}
									onChange={(v) => {
										setNestedStatus(v);
										setNestedErrors(prev => ({ ...prev, status: '' }));
									}}
									options={[
										{ label: 'Recibida', value: 'received', color: '#3b82f6' },
										{ label: 'Revisión Macroscópica', value: 'macroscopic_review', color: '#8b5cf6', disabled: true },
										{ label: 'En Proceso', value: 'processing', color: '#f59e0b', disabled: true },
										{ label: 'Revisión Microscópica', value: 'microscopic_review', color: '#d946ef', disabled: true },
										{ label: 'Finalizada', value: 'finalized', color: '#10b981', disabled: true },
										{ label: 'Entregada', value: 'delivered', color: '#64748b', disabled: true },
										{ label: 'Cancelada', value: 'cancelled', color: '#ef4444', disabled: true },
									]}
								/>
								{nestedErrors.status && <p className="text-xs text-destructive">{nestedErrors.status}</p>}
							</div>
						</div>

						{/* Medical order file upload inside nested form */}
						<div className="grid gap-2">
							<Label htmlFor="nested_medical_order_file">Orden Médica (Archivo PDF o Imagen)</Label>
							{nestedMedicalOrderFile ? (
								<div className="flex items-center justify-between p-3 border rounded-lg bg-emerald-500/5 border-emerald-500/20">
									<div className="flex items-center gap-2">
										<FileText className="w-5 h-5 text-emerald-500" />
										<div className="flex flex-col text-xs">
											<span className="font-semibold text-foreground truncate max-w-[200px]">
												{nestedMedicalOrderFile.name}
											</span>
											<span className="text-[10px] text-muted-foreground">
												{(nestedMedicalOrderFile.size / 1024 / 1024).toFixed(2)} MB
											</span>
										</div>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => setNestedMedicalOrderFile(null)}
										className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
									>
										<X className="w-4 h-4" />
									</Button>
								</div>
							) : (
								<div className="relative group">
									<input
										type="file"
										id="nested_medical_order_file"
										className="hidden"
										accept=".pdf,image/*"
										onChange={(e) => {
											const file = e.target.files?.[0] || null;
											if (file && file.size > 50 * 1024 * 1024) {
												toast.error("El archivo de Orden Médica no debe exceder los 50MB.");
												e.target.value = '';
												return;
											}
											setNestedMedicalOrderFile(file);
										}}
									/>
									<label
										htmlFor="nested_medical_order_file"
										className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 rounded-lg p-5 cursor-pointer bg-card hover:bg-accent/10 transition-all duration-200 text-center"
									>
										<div className="p-2.5 bg-secondary rounded-full text-secondary-foreground mb-2">
											<Upload className="w-4 h-4" />
										</div>
										<span className="text-xs font-semibold text-foreground">Subir Orden Médica</span>
										<span className="text-[10px] text-muted-foreground mt-1">PDF o imágenes hasta 50MB</span>
									</label>
								</div>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="nested_diagnosis">Diagnóstico Clínico / Sospecha</Label>
							<Textarea
								id="nested_diagnosis"
								value={nestedDiagnosis}
								onChange={(e) => setNestedDiagnosis(e.target.value)}
								placeholder="Escriba el diagnóstico aquí..."
								className="resize-none"
								rows={2}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="nested_clinical_notes">Notas Clínicas</Label>
							<Textarea
								id="nested_clinical_notes"
								value={nestedClinicalNotes}
								onChange={(e) => setNestedClinicalNotes(e.target.value)}
								placeholder="Información adicional relevante..."
								className="resize-none"
								rows={2}
							/>
						</div>

						{/* Agregar Insumos inside Nested Form */}
						<div className="flex items-center justify-between p-4 bg-muted/30 border rounded-lg">
							<div className="flex flex-col gap-0.5">
								<Label className="text-xs font-semibold cursor-pointer">
									Agregar insumos
								</Label>
								<span className="text-[10px] text-muted-foreground">
									Registre los insumos químicos o reactivos que se utilizarán en el análisis.
								</span>
							</div>
							<Switch
								checked={nestedAgregarInsumos}
								onCheckedChange={(checked) => {
									setNestedAgregarInsumos(checked);
									if (!checked) setNestedInsumos([]);
								}}
							/>
						</div>

						{nestedAgregarInsumos && (
							<div className="border rounded-xl p-4 bg-muted/10 border-border/60 space-y-4">
								<div className="relative">
									<Input
										type="text"
										placeholder="Buscar insumo por nombre o código..."
										value={supplySearchQuery}
										onChange={(e) => setSupplySearchQuery(e.target.value)}
										className="w-full pr-8 h-9"
									/>
									{supplySearchQuery && (
										<button
											type="button"
											onClick={() => setSupplySearchQuery('')}
											className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
										>
											<X className="w-4 h-4" />
										</button>
									)}
								</div>

								<div className="border rounded-xl bg-card overflow-hidden">
									<div className="max-h-[220px] overflow-y-auto divide-y divide-border">
										{filteredProducts.length === 0 ? (
											<div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1">
												<Microscope className="w-6 h-6 text-muted-foreground/30" />
												<span>No se encontraron insumos.</span>
											</div>
										) : (
											filteredProducts.map((product) => {
												const totalStock = parseInt(product.total_stock) || 0;
												const isOutOfStock = totalStock <= 0;
												const isAlreadyAdded = nestedInsumos.some(i => i.id === product.id);

												return (
													<div key={product.id} className="p-2 flex items-center justify-between text-xs">
														<div className="flex flex-col gap-0.5 max-w-[65%]">
															<span className="font-semibold text-foreground truncate">{product.name}</span>
															<span className="text-[9px] font-mono text-muted-foreground">{product.code}</span>
														</div>
														<div className="flex items-center gap-2">
															<span className="text-[10px] text-emerald-600 font-semibold">{totalStock} u.</span>
															<Button
																type="button"
																size="sm"
																variant={isAlreadyAdded ? "secondary" : "outline"}
																onClick={() => handleAddNestedInsumo(product)}
																disabled={isOutOfStock}
																className="h-7 text-[10px] font-semibold"
															>
																{isAlreadyAdded ? 'Agregado' : 'Agregar'}
															</Button>
														</div>
													</div>
												);
											})
										)}
									</div>
								</div>

								{nestedInsumos.length > 0 && (
									<div className="space-y-2 border-t pt-3">
										<div className="text-[11px] font-bold text-muted-foreground uppercase">Seleccionados ({nestedInsumos.length})</div>
										<div className="divide-y border rounded bg-card max-h-[200px] overflow-y-auto">
											{nestedInsumos.map(i => (
												<div key={i.id} className="p-2 flex flex-col gap-2 hover:bg-accent/5">
													<div className="flex justify-between items-center text-xs">
														<span className="font-medium truncate max-w-[200px]">{i.name}</span>
														<Button
															variant="ghost"
															size="icon"
															onClick={() => handleRemoveNestedInsumo(i.id)}
															className="h-6 w-6 text-muted-foreground hover:text-destructive"
														>
															<X className="w-3 h-3" />
														</Button>
													</div>
													<div className="flex items-center justify-between gap-4">
														<div className="flex items-center border rounded bg-background p-0.5 h-7">
															<button
																type="button"
																onClick={() => handleUpdateNestedQty(i.id, i.quantity - 1)}
																disabled={i.quantity <= 1}
																className="h-5 w-5 hover:bg-muted rounded text-xs font-bold"
															>
																-
															</button>
															<span className="w-6 text-center text-xs font-mono font-bold">{i.quantity}</span>
															<button
																type="button"
																onClick={() => handleUpdateNestedQty(i.id, i.quantity + 1)}
																disabled={i.quantity >= i.total_stock}
																className="h-5 w-5 hover:bg-muted rounded text-xs font-bold"
															>
																+
															</button>
														</div>
														<span className="text-[10px] font-mono text-muted-foreground">Stock: {i.total_stock}</span>
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						)}

						<div className="flex justify-end gap-3 pt-4 border-t">
							<Button variant="outline" onClick={() => setIsNestedFormOpen(false)}>
								Cancelar
							</Button>
							<Button onClick={handleSaveNestedSpecimen}>
								Guardar Muestra
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{/* Close warning AlertDialog */}
			<AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
				<AlertDialogContent className="max-w-[450px]">
					<AlertDialogHeader>
						<AlertDialogTitle>¿Estás seguro de salir?</AlertDialogTitle>
						<AlertDialogDescription>
							Todos los datos ingresados en la creación grupal se perderán permanentemente.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setShowCloseConfirm(false)}>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								setShowCloseConfirm(false);
								setIsFormDirty(false);
								onOpenChange(false);
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
						>
							Sí, salir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Payment Details Configuration Sheet */}
			<Sheet open={isPaymentSheetOpen} onOpenChange={setIsPaymentSheetOpen}>
				<SheetContent side="right" className="w-full max-w-[450px] sm:max-w-[650px] overflow-y-auto z-[95]">
					<HeadingSheet
						title="Método de Pago (Grupo)"
						description="Configure el método de pago e ingrese la información fiscal requerida para facturar."
					/>
					<div className="mt-6 flex flex-col gap-6 px-5 pb-6">
						<div className="grid gap-2">
							<Label htmlFor="group_payment_type">Tipo de Pago <span className="text-destructive">*</span></Label>
							<Select
								value={paymentType}
								onValueChange={(val) => {
									setPaymentType(val);
									if (val === 'credit') {
										setHasInitialPayment(false);
									}
									resetDetailedPayments();
								}}
							>
								<SelectTrigger id="group_payment_type" className="w-full">
									<SelectValue placeholder="Seleccione el tipo de pago" />
								</SelectTrigger>
								<SelectContent className="z-[110]">
									<SelectItem value="cash">Efectivo</SelectItem>
									<SelectItem value="credit card">Tarjeta de Crédito</SelectItem>
									<SelectItem value="bank transfer">Transferencia Bancaria</SelectItem>
									<SelectItem value="check">Cheque</SelectItem>
									<SelectItem value="credit">Al Crédito</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{paymentType !== 'credit' && paymentType !== '' && (
							<div className="grid gap-2">
								<Label htmlFor="group_payment_date">Fecha de Pago</Label>
								<Input
									id="group_payment_date"
									type="date"
									value={paymentMethodDate}
									onChange={(e) => setPaymentMethodDate(e.target.value)}
								/>
							</div>
						)}

						{paymentType === 'cash' && (
							<div className="grid gap-2">
								<Label htmlFor="group_cash_value">Efectivo Recibido (L.) <span className="text-destructive">*</span></Label>
								<Input
									id="group_cash_value"
									type="number"
									step="0.01"
									placeholder="0.00"
									value={cashValue}
									onChange={(e) => setCashValue(e.target.value)}
								/>
							</div>
						)}

						{paymentType === 'check' && (
							<div className="space-y-4">
								<div className="grid gap-2">
									<Label htmlFor="group_check_number">Número de Cheque <span className="text-destructive">*</span></Label>
									<Input
										id="group_check_number"
										type="text"
										placeholder="Ej. 100234"
										value={checkNumber}
										onChange={(e) => setCheckNumber(e.target.value)}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="group_check_value">Valor del Cheque (L.) <span className="text-destructive">*</span></Label>
									<Input
										id="group_check_value"
										type="number"
										step="0.01"
										placeholder="0.00"
										value={checkValue}
										onChange={(e) => setCheckValue(e.target.value)}
									/>
								</div>
							</div>
						)}

						{paymentType === 'credit card' && (
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div className="grid gap-2">
										<Label htmlFor="group_card_last_4">Últimos 4 Dígitos <span className="text-destructive">*</span></Label>
										<Input
											id="group_card_last_4"
											type="text"
											maxLength={4}
											placeholder="1234"
											value={cardLast4}
											onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="group_card_expiration">Vencimiento (MM/AA) <span className="text-destructive">*</span></Label>
										<Input
											id="group_card_expiration"
											type="text"
											placeholder="12/26"
											value={cardExpiration}
											onChange={(e) => {
												const cleaned = e.target.value.replace(/\D/g, '');
												let formatted = cleaned;
												if (cleaned.length > 2) {
													formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
												}
												setCardExpiration(formatted);
											}}
										/>
									</div>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="group_card_auth">Código de Autorización <span className="text-destructive">*</span></Label>
									<Input
										id="group_card_auth"
										type="text"
										placeholder="Ej. 900234"
										value={cardAuthorizationCode}
										onChange={(e) => setCardAuthorizationCode(e.target.value)}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="group_card_charged">Monto a Cobrar (L.) <span className="text-destructive">*</span></Label>
									<Input
										id="group_card_charged"
										type="number"
										step="0.01"
										placeholder="0.00"
										value={cardValueCharged}
										onChange={(e) => setCardValueCharged(e.target.value)}
									/>
								</div>
							</div>
						)}

						{paymentType === 'bank transfer' && (
							<div className="space-y-4">
								<div className="grid gap-2">
									<Label htmlFor="group_transfer_bank">Banco Receptor <span className="text-destructive">*</span></Label>
									<Select
										value={transferBankId}
										onValueChange={setTransferBankId}
									>
										<SelectTrigger id="group_transfer_bank" className="w-full">
											<SelectValue placeholder="Seleccione el banco" />
										</SelectTrigger>
										<SelectContent className="z-[110]">
											{banks.map((b) => (
												<SelectItem key={b.id} value={b.id.toString()}>
													{b.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="group_transfer_auth">Código de Autorización / Referencia <span className="text-destructive">*</span></Label>
									<Input
										id="group_transfer_auth"
										type="text"
										placeholder="Ej. TX-102934"
										value={transferAuthorizationCode}
										onChange={(e) => setTransferAuthorizationCode(e.target.value)}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="group_transfer_value">Monto Transferido (L.) <span className="text-destructive">*</span></Label>
									<Input
										id="group_transfer_value"
										type="number"
										step="0.01"
										placeholder="0.00"
										value={transferValue}
										onChange={(e) => setTransferValue(e.target.value)}
									/>
								</div>
							</div>
						)}

						{paymentType === 'credit' && (
							<div className="space-y-4">
								<div className="flex items-center justify-between p-4 bg-muted/20 border rounded-lg">
									<div className="flex flex-col gap-0.5">
										<Label className="text-xs font-semibold cursor-pointer">Registrar pago inicial / prima</Label>
										<span className="text-[10px] text-muted-foreground">Si el cliente abona una parte del saldo hoy</span>
									</div>
									<Switch
										checked={hasInitialPayment}
										onCheckedChange={(checked) => {
											setHasInitialPayment(checked);
											if (!checked) {
												setInitialPaymentAmount('');
												resetDetailedPayments();
											}
										}}
									/>
								</div>

								{hasInitialPayment && (
									<div className="space-y-4 pt-2 border-t">
										<div className="grid gap-2">
											<Label htmlFor="group_initial_amount">Monto de Pago Inicial (L.) <span className="text-destructive">*</span></Label>
											<Input
												id="group_initial_amount"
												type="number"
												step="0.01"
												placeholder="0.00"
												value={initialPaymentAmount}
												onChange={(e) => setInitialPaymentAmount(e.target.value)}
											/>
										</div>

										<div className="grid gap-2">
											<Label htmlFor="group_initial_type">Tipo de Pago Inicial <span className="text-destructive">*</span></Label>
											<Select
												value={initialPaymentType}
												onValueChange={(val) => {
													setInitialPaymentType(val);
													resetDetailedPayments();
												}}
											>
												<SelectTrigger id="group_initial_type" className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent className="z-[110]">
													<SelectItem value="cash">Efectivo</SelectItem>
													<SelectItem value="credit card">Tarjeta de Crédito</SelectItem>
													<SelectItem value="bank transfer">Transferencia Bancaria</SelectItem>
													<SelectItem value="check">Cheque</SelectItem>
												</SelectContent>
											</Select>
										</div>

										{initialPaymentType === 'check' && (
											<div className="grid gap-2">
												<Label htmlFor="group_check_number">Número de Cheque <span className="text-destructive">*</span></Label>
												<Input
													id="group_check_number"
													type="text"
													placeholder="Ej. 100234"
													value={checkNumber}
													onChange={(e) => setCheckNumber(e.target.value)}
												/>
											</div>
										)}

										{initialPaymentType === 'credit card' && (
											<div className="grid grid-cols-2 gap-4">
												<div className="grid gap-2">
													<Label htmlFor="group_card_last_4">Últimos 4 Dígitos <span className="text-destructive">*</span></Label>
													<Input
														id="group_card_last_4"
														type="text"
														maxLength={4}
														placeholder="1234"
														value={cardLast4}
														onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
													/>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="group_card_auth">Autorización <span className="text-destructive">*</span></Label>
													<Input
														id="group_card_auth"
														type="text"
														placeholder="Ej. 900234"
														value={cardAuthorizationCode}
														onChange={(e) => setCardAuthorizationCode(e.target.value)}
													/>
												</div>
											</div>
										)}

										{initialPaymentType === 'bank transfer' && (
											<div className="grid grid-cols-2 gap-4">
												<div className="grid gap-2">
													<Label htmlFor="group_transfer_bank">Banco <span className="text-destructive">*</span></Label>
													<Select
														value={transferBankId}
														onValueChange={setTransferBankId}
													>
														<SelectTrigger id="group_transfer_bank" className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent className="z-[110]">
															{banks.map((b) => (
																<SelectItem key={b.id} value={b.id.toString()}>
																	{b.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="group_transfer_auth">Referencia <span className="text-destructive">*</span></Label>
													<Input
														id="group_transfer_auth"
														type="text"
														placeholder="TX-1029"
														value={transferAuthorizationCode}
														onChange={(e) => setTransferAuthorizationCode(e.target.value)}
													/>
												</div>
											</div>
										)}
									</div>
								)}
							</div>
						)}

						<div className="flex justify-end gap-3 pt-6 border-t mt-4">
							<Button variant="outline" onClick={() => setIsPaymentSheetOpen(false)}>
								Cancelar
							</Button>
							<Button onClick={handleSavePaymentDetails}>
								Guardar
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{/* On-the-fly sheets for nested creation */}
			<Sheet open={isCustomerSheetOpen} onOpenChange={setIsCustomerSheetOpen}>
				<SheetContent side="right" className="w-full max-w-[450px] sm:max-w-[650px] overflow-y-auto z-[100]">
					<HeadingSheet
						title="Nuevo Paciente"
						description="Ingrese los datos del nuevo paciente a registrar en el sistema."
					/>
					<CustomerForm
						customer={undefined}
						onSuccess={() => setIsCustomerSheetOpen(false)}
					/>
				</SheetContent>
			</Sheet>

			<Sheet open={isReferrerSheetOpen} onOpenChange={setIsReferrerSheetOpen}>
				<SheetContent side="right" className="w-full max-w-[450px] sm:max-w-[650px] overflow-y-auto z-[100]">
					<HeadingSheet
						title="Nuevo Médico Remitente"
						description="Ingrese los datos del médico remitente a registrar en el sistema."
					/>
					<ReferrerForm
						referrer={null}
						referrerTypes={referrerTypes}
						onSuccess={() => setIsReferrerSheetOpen(false)}
					/>
				</SheetContent>
			</Sheet>

			<Sheet open={isSpecimenTypeSheetOpen} onOpenChange={setIsSpecimenTypeSheetOpen}>
				<SheetContent side="right" className="w-full max-w-[450px] sm:max-w-[650px] overflow-y-auto z-[100]">
					<HeadingSheet
						title="Nuevo Tipo de Muestra"
						description="Ingrese los datos del tipo de muestra a registrar en el sistema."
					/>
					<SpecimenTypeForm
						specimenType={null}
						onSuccess={() => setIsSpecimenTypeSheetOpen(false)}
					/>
				</SheetContent>
			</Sheet>

			<SpecimenTypeExaminationSheet
				examination={null}
				specimenTypes={specimenTypes}
				open={isExaminationSheetOpen}
				onOpenChange={setIsExaminationSheetOpen}
				defaultSpecimenTypeId={nestedSpecimenType || undefined}
			/>

			<CategorySheet
				category={null}
				open={isCategorySheetOpen}
				onOpenChange={setIsCategorySheetOpen}
			/>
		</>
	);
}
