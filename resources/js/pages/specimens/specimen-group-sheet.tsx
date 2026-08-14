import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
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
	Trash2,
	Edit2,
	Loader2,
	Info,
	ChevronDown,
	ChevronUp,
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import AsyncCustomerCombobox from '@/components/async-customer-combobox';
import type { CustomerOption } from '@/components/async-customer-combobox';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { DatePicker } from '@/components/ui/date-picker';
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Reuse on-the-fly creators
import CustomerSheet from '../customers/customer-sheet';
import type { PaymentData } from '../invoices/payment-method-sheet';
import {
	PaymentMethodSheet,
	getPaymentTypeLabel,
} from '../invoices/payment-method-sheet';
import ReferrerForm from '../referrers/referrer-form';
import SequenceForm from '../sequences/sequence-form';
import CategorySheet from '../specimen-categories/category-sheet';
import ExaminationPricesForm from '../specimen-type-examinations/examination-prices-form';
import SpecimenTypeExaminationSheet from '../specimen-type-examinations/specimen-type-examination-sheet';
import SpecimenTypeForm from '../specimen-types/specimen-type-form';
interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	group?: any;
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
	const [open, setOpen] = useState(false);
	const selectedOption = options.find((opt) => opt.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen} modal={true}>
			<PopoverTrigger asChild className="w-full">
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="h-10 w-full justify-between"
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
				className="z-[110] w-[--radix-popover-trigger-width] p-0"
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

export default function SpecimenGroupSheet({
	open,
	onOpenChange,
	group = null,
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
	const { props: pageProps } = usePage<any>();
	const { settings } = pageProps;
	const flash = pageProps.flash as Record<string, any> | undefined;
	const thirdAgePercent = parseFloat(settings?.third_age_discount || '30');
	const fourthAgePercent = parseFloat(settings?.fourth_age_discount || '40');

	// Page close/refresh prevention states
	const [isFormDirty, setIsFormDirty] = useState(false);
	const [showCloseConfirm, setShowCloseConfirm] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	// Wizard wizard states
	const [currentStep, setCurrentStep] = useState(1);
	const [globalCustomerId, setGlobalCustomerId] = useState('');
	const [specimens, setSpecimens] = useState<any[]>([]);

	// Nested specimen form states
	const [isNestedFormOpen, setIsNestedFormOpen] = useState(false);
	const [nestedSpecimenToEditId, setNestedSpecimenToEditId] = useState<
		string | null
	>(null);
	const [nestedErrors, setNestedErrors] = useState<Record<string, string>>(
		{},
	);
	const [nestedReservedCode, setNestedReservedCode] = useState('');

	// Nested form inputs
	const [nestedCustomer, setNestedCustomer] = useState('');
	const [nestedSampleCollectionDate, setNestedSampleCollectionDate] =
		useState(new Date().toISOString().split('T')[0]);
	const [nestedSpecimenType, setNestedSpecimenType] = useState('');
	const [nestedExamination, setNestedExamination] = useState('');
	const [nestedCategory, setNestedCategory] = useState('');
	const [nestedReferrer, setNestedReferrer] = useState('');
	const [nestedAnatomicSite, setNestedAnatomicSite] = useState('');
	const [nestedDiagnosis, setNestedDiagnosis] = useState('');
	const [nestedClinicalNotes, setNestedClinicalNotes] = useState('');
	const [nestedStatus, setNestedStatus] = useState('received');
	const [nestedPriority, setNestedPriority] = useState('');
	const [nestedMedicalOrderFile, setNestedMedicalOrderFile] =
		useState<File | null>(null);

	// Insumos/Reactivos inside Step 1 nested form
	const [nestedAgregarInsumos, setNestedAgregarInsumos] = useState(false);
	const [nestedInsumos, setNestedInsumos] = useState<any[]>([]);
	const [supplySearchQuery, setSupplySearchQuery] = useState('');

	const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
	const [customerSheetSource, setCustomerSheetSource] = useState<
		'global' | 'nested' | 'table_row'
	>('global');
	const [customerToEdit, setCustomerToEdit] = useState<CustomerOption | null>(
		null,
	);
	const [editingCustomerRowClientId, setEditingCustomerRowClientId] =
		useState<string | null>(null);
	// Track selected customer data for display (async combobox)
	const [selectedGlobalCustomerData, setSelectedGlobalCustomerData] =
		useState<CustomerOption | null>(null);
	const [selectedNestedCustomerData, setSelectedNestedCustomerData] =
		useState<CustomerOption | null>(null);
	const prevReferrersRef = useRef<any[]>(referrers);
	const [isReferrerSheetOpen, setIsReferrerSheetOpen] = useState(false);
	const [editingReferrer, setEditingReferrer] = useState<any | null>(null);
	const [isSequenceSheetOpen, setIsSequenceSheetOpen] = useState(false);
	const [isSpecimenTypeSheetOpen, setIsSpecimenTypeSheetOpen] =
		useState(false);
	const [isExaminationSheetOpen, setIsExaminationSheetOpen] = useState(false);
	const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
	const [isEditPricesSheetOpen, setIsEditPricesSheetOpen] = useState(false);
	const [selectedExaminationForPrices, setSelectedExaminationForPrices] =
		useState<any | null>(null);

	const [localSequences, setLocalSequences] = useState<any[]>(sequences);

	useEffect(() => {
		setLocalSequences(sequences);
	}, [sequences]);

	const matchingSequence = useMemo(() => {
		if (!nestedSpecimenType) {
			return null;
		}

		if (!activeLocationId) {
			return null;
		}

		return localSequences.find(
			(s) =>
				s.specimen_type.toString() === nestedSpecimenType.toString() &&
				s.location_id.toString() === activeLocationId.toString() &&
				s.active,
		);
	}, [nestedSpecimenType, localSequences, activeLocationId]);

	const nextSequencePreview = useMemo(() => {
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

	// Global billing fields (Step 2)
	const [paymentType, setPaymentType] = useState('');
	const [isReservingCode, setIsReservingCode] = useState(false);
	const [paymentMethodDate, setPaymentMethodDate] = useState(
		new Date().toISOString().split('T')[0],
	);
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
	const [transferAuthorizationCode, setTransferAuthorizationCode] =
		useState('');

	const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
	const [processing, setProcessing] = useState(false);

	const [showInvoiceModal, setShowInvoiceModal] = useState(false);
	const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

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

	// Reset whole form when opened
	useEffect(() => {
		if (open) {
			if (group) {
				setCurrentStep(1);
				setGlobalCustomerId(group.customer_id?.toString() || '');

				if (group.customer) {
					setSelectedGlobalCustomerData({
						id: group.customer.id,
						name: group.customer.name,
						id_number: group.customer.id_number || null,
						phone: group.customer.phone || null,
						email: group.customer.email || null,
						gender: group.customer.gender || null,
						type: group.customer.type || null,
						age: group.customer.age || null,
					});
				} else {
					setSelectedGlobalCustomerData(null);
				}

				// Map specimens
				const existingSpecimens = (group.specimens || []).map(
					(s: any) => {
						const breakdown = s.invoice_group_specimen || {};

						return {
							id: s.id,
							client_id: s.id.toString(),
							customer: s.customer,
							customer_name:
								s.customer_relation?.name || 'Desconocido',
							customer_data: s.customer_relation
								? {
									id: s.customer_relation.id,
									name: s.customer_relation.name,
									id_number:
										s.customer_relation.id_number || '',
									phone: s.customer_relation.phone || '',
									secondary_phone:
										s.customer_relation.secondary_phone ||
										'',
									email: s.customer_relation.email || '',
									gender: s.customer_relation.gender || '',
									type:
										s.customer_relation.type || 'cliente',
									age: s.customer_relation.age || '',
									state: s.customer_relation.state || '',
									city: s.customer_relation.city || '',
									address:
										s.customer_relation.address || '',
								}
								: null,
							specimen_type: s.specimen_type,
							specimen_type_name: s.type?.name || '',
							specimen_type_examination:
								s.specimen_type_examination,
							specimen_type_examination_name:
								s.examination?.name || '',
							specimen_category: s.specimen_category,
							referrer: s.referrer,
							anatomic_site: s.anatomic_site || '',
							diagnosis: s.diagnosis || '',
							clinical_notes: s.clinical_notes || '',
							status: s.status,
							priority_id: s.priority_id,
							medical_order_file: s.medical_order_file,
							agregar_insumos: (s.products || []).length > 0,
							insumos: (s.products || []).map((p: any) => ({
								id: p.id,
								quantity: p.pivot?.quantity || 1,
								price: p.pivot?.price || p.price || 0,
								name: p.name,
							})),
							isExisting: true,
							sequence_code: s.sequence_code,

							selected_price:
								breakdown.selected_price?.toString() || '0',
							custom_specimen_price:
								breakdown.custom_specimen_price?.toString() ||
								'0',
							quantity: breakdown.quantity ?? 1,
							age_discount_type:
								breakdown.age_discount_type || null,
							age_discount_amount:
								breakdown.age_discount_amount?.toString() ||
								'0',
							additional_discount_enabled:
								!!breakdown.additional_discount_enabled,
							additional_discount:
								breakdown.additional_discount?.toString() ||
								'0',
						};
					},
				);
				setSpecimens(existingSpecimens);

				const invoice =
					group.invoice ||
					group.invoiceRelation ||
					group.invoice_relation ||
					group.invoice_data ||
					(group.full_invoice_number ? group : {});
				setPaymentType(invoice.payment_type || 'cash');
				setPaymentMethodDate(
					invoice.payment_method_date
						? invoice.payment_method_date.split('T')[0]
						: new Date().toISOString().split('T')[0],
				);
				setCustomAmountEnabled(
					!!invoice.custom_amount &&
					parseFloat(invoice.custom_amount) > 0,
				);
				setCustomAmount(invoice.custom_amount?.toString() || '0');
				setCustomAmountReason(invoice.custom_amount_reason || '');

				const initialPaid = parseFloat(invoice.total_paid) || 0;
				setHasInitialPayment(
					invoice.payment_type === 'credit' && initialPaid > 0,
				);
				setInitialPaymentAmount(
					invoice.payment_type === 'credit' && initialPaid > 0
						? initialPaid.toString()
						: '',
				);
				setInitialPaymentType(
					invoice.proof_of_payment &&
						invoice.proof_of_payment !== 'Efectivo'
						? 'credit card'
						: 'cash',
				);

				setCashValue(invoice.cash_value?.toString() || '');
				setCheckNumber(invoice.check_number || '');
				setCheckValue(invoice.check_value?.toString() || '');
				setCardLast4(invoice.card_last_4 || '');
				setCardValueCharged(
					invoice.card_value_charged?.toString() || '',
				);
				setCardExpiration(invoice.card_expiration || '');
				setCardAuthorizationCode(invoice.card_authorization_code || '');
				setTransferBankId(invoice.transfer_bank_id?.toString() || '');
				setTransferValue(invoice.transfer_value?.toString() || '');
				setTransferAuthorizationCode(
					invoice.transfer_authorization_code || '',
				);

				setIsFormDirty(false);
				setShowInvoiceModal(false);
				setInvoiceUrl(null);
			} else {
				setCurrentStep(1);
				setGlobalCustomerId('');
				setSelectedGlobalCustomerData(null);
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
				setShowInvoiceModal(false);
				setInvoiceUrl(null);
			}
		}
	}, [open, group]);

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

		return () =>
			window.removeEventListener('beforeunload', handleBeforeUnload);
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

	// Auto-select a newly created customer via flash data from the server
	const createdCustomerId = flash?.created_customer?.id as number | undefined;
	useEffect(() => {
		if (!flash?.created_customer) {
			return;
		}

		const createdCustomer = flash.created_customer as any;

		if (!createdCustomer.id) {
			return;
		}

		const newId = createdCustomer.id.toString();

		if (customerSheetSource === 'global') {
			setGlobalCustomerId(newId);
			setSelectedGlobalCustomerData(createdCustomer);
		} else {
			setNestedCustomer(newId);
			setSelectedNestedCustomerData(createdCustomer);
		}

		toast.success(
			`Paciente "${createdCustomer.name}" seleccionado automáticamente`,
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [createdCustomerId]);

	useEffect(() => {
		if (referrers.length > prevReferrersRef.current.length) {
			const newReferrers = referrers.filter(
				(r) =>
					!prevReferrersRef.current.some((prev) => prev.id === r.id),
			);

			if (newReferrers.length > 0) {
				setNestedReferrer(newReferrers[0].id.toString());
				toast.success(
					`Médico "${newReferrers[0].name}" seleccionado automáticamente`,
				);
			}
		}

		prevReferrersRef.current = referrers;
	}, [referrers]);

	// Active customer details
	const selectedGlobalCustomer = selectedGlobalCustomerData;

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
		setNestedSampleCollectionDate(new Date().toISOString().split('T')[0]);
		setNestedPriority(
			priorities && priorities.length > 0
				? priorities[0].id.toString()
				: '',
		);
		setNestedReservedCode('');
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
		setNestedSampleCollectionDate(
			spec.sample_collection_date
				? spec.sample_collection_date.split('T')[0]
				: new Date().toISOString().split('T')[0],
		);
		setNestedPriority(spec.priority_id ? spec.priority_id.toString() : '');
		setNestedReservedCode(spec.sequence_code || '');
		setNestedMedicalOrderFile(spec.medical_order_file || null);
		setNestedAgregarInsumos(spec.agregar_insumos || false);
		setNestedInsumos(spec.insumos || []);
		setNestedErrors({});
		setSupplySearchQuery('');
		setIsNestedFormOpen(true);
	};

	const handleDeleteNestedSpecimen = (clientId: string) => {
		setSpecimens((prev) => prev.filter((s) => s.client_id !== clientId));
		setIsFormDirty(true);
	};

	// Filter products for nested search
	const filteredProducts = useMemo(() => {
		return products.filter(
			(product) =>
				product.name
					.toLowerCase()
					.includes(supplySearchQuery.toLowerCase()) ||
				product.code
					.toLowerCase()
					.includes(supplySearchQuery.toLowerCase()),
		);
	}, [products, supplySearchQuery]);

	// Nested form handlers
	const handleAddNestedInsumo = (product: any) => {
		if (nestedInsumos.some((i) => i.id === product.id)) {
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

		setNestedInsumos((prev) => [
			...prev,
			{
				id: product.id,
				name: product.name,
				code: product.code,
				quantity: 1,
				total_stock: parseInt(product.total_stock) || 0,
				price: defaultPrice,
				prices: sortedPrices,
				sale_price: parseFloat(product.sale_price) || 0,
			},
		]);
	};

	const handleRemoveNestedInsumo = (id: number) => {
		setNestedInsumos((prev) => prev.filter((i) => i.id !== id));
	};

	const handleUpdateNestedQty = (id: number, qty: number) => {
		setNestedInsumos((prev) =>
			prev.map((i) => {
				if (i.id === id) {
					const capped = Math.max(1, Math.min(i.total_stock, qty));

					return { ...i, quantity: capped };
				}

				return i;
			}),
		);
	};

	const handleUpdateNestedPrice = (id: number, price: number) => {
		setNestedInsumos((prev) =>
			prev.map((i) => {
				if (i.id === id) {
					return { ...i, price };
				}

				return i;
			}),
		);
	};

	// Validate nested specimen Step 1 fields
	const validateNestedSpecimen = () => {
		const errors: Record<string, string> = {};

		if (!nestedCustomer) {
			errors.customer = 'El paciente es requerido.';
		}

		if (!nestedReferrer) {
			errors.referrer = 'El médico remitente es requerido.';
		}

		if (!nestedSpecimenType) {
			errors.specimen_type = 'El tipo de muestra es requerido.';
		}

		if (!nestedExamination) {
			errors.specimen_type_examination = 'El examen es requerido.';
		}

		if (!nestedCategory) {
			errors.specimen_category = 'La categoría de tiempo es requerida.';
		}

		if (!nestedPriority) {
			errors.priority_id = 'La prioridad es requerida.';
		}

		if (!nestedStatus) {
			errors.status = 'El estado es requerido.';
		}

		// Verify CAI sequences
		if (nestedSpecimenType && !matchingSequence) {
			errors.specimen_type =
				'No existe una secuencia de numeración activa configurada en esta sucursal para este tipo de muestra.';
		}

		setNestedErrors(errors);

		return Object.keys(errors).length === 0;
	};

	const handleSaveNestedSpecimen = async () => {
		if (!validateNestedSpecimen()) {
			toast.error(
				'Complete todos los campos obligatorios del espécimen.',
			);

			return;
		}

		// Get prices list from chosen examination to populate default pricing structure in Step 2
		const selectedExam = examinations.find(
			(e) => e.id.toString() === nestedExamination,
		);
		const prices = selectedExam?.prices || [];
		const sortedPrices = [...prices].sort(
			(a, b) => parseFloat(b.amount) - parseFloat(a.amount),
		);
		const defaultPrice =
			sortedPrices.length > 0 ? sortedPrices[0].amount.toString() : '0';

		const existingSpec = nestedSpecimenToEditId
			? specimens.find((s) => s.client_id === nestedSpecimenToEditId)
			: null;

		let reservedCode = nestedReservedCode;

		if (!reservedCode) {
			setIsReservingCode(true);

			try {
				const response = await axios.post('/specimens/reserve-code', {
					specimen_type_id: parseInt(nestedSpecimenType),
					location_id: activeLocationId
						? parseInt(activeLocationId.toString())
						: null,
				});
				reservedCode = response.data.code;
				setNestedReservedCode(reservedCode);
			} catch (error: any) {
				console.error(
					'Error reserving code for group specimen:',
					error,
				);
				const errMsg =
					error.response?.data?.message ||
					'Error al reservar el código de secuencia.';
				toast.error(errMsg);
				setIsReservingCode(false);

				return;
			} finally {
				setIsReservingCode(false);
			}
		}

		const specObject = {
			id: existingSpec ? existingSpec.id : undefined,
			isExisting: existingSpec ? existingSpec.isExisting : undefined,
			sequence_code: reservedCode || undefined,
			client_id:
				nestedSpecimenToEditId ||
				Math.random().toString(36).substring(2, 9),
			customer: parseInt(nestedCustomer),
			customer_name: selectedNestedCustomerData?.name || 'Desconocido',
			customer_data: selectedNestedCustomerData,
			specimen_type: parseInt(nestedSpecimenType),
			specimen_type_name:
				specimenTypes.find(
					(t) => t.id.toString() === nestedSpecimenType,
				)?.name || '',
			specimen_type_examination: parseInt(nestedExamination),
			specimen_type_examination_name:
				examinations.find((e) => e.id.toString() === nestedExamination)
					?.name || '',
			specimen_category: parseInt(nestedCategory),
			referrer: parseInt(nestedReferrer),
			anatomic_site: nestedAnatomicSite,
			diagnosis: nestedDiagnosis,
			clinical_notes: nestedClinicalNotes,
			status: nestedStatus,
			priority_id: parseInt(nestedPriority),
			sample_collection_date: nestedSampleCollectionDate,
			medical_order_file: nestedMedicalOrderFile,
			agregar_insumos: nestedAgregarInsumos,
			insumos: nestedInsumos,

			// Step 2 pricing details (set defaults here)
			selected_price: existingSpec
				? existingSpec.selected_price
				: defaultPrice,
			custom_specimen_price: existingSpec
				? existingSpec.custom_specimen_price
				: '0',
			quantity: existingSpec ? existingSpec.quantity : 1,
			age_discount_type: existingSpec
				? existingSpec.age_discount_type
				: null,
			age_discount_amount: existingSpec
				? existingSpec.age_discount_amount
				: '0',
			additional_discount_enabled: existingSpec
				? existingSpec.additional_discount_enabled
				: false,
			additional_discount: existingSpec
				? existingSpec.additional_discount
				: '0',
		};

		if (nestedSpecimenToEditId) {
			setSpecimens((prev) =>
				prev.map((s) =>
					s.client_id === nestedSpecimenToEditId ? specObject : s,
				),
			);
			toast.success('Muestra editada en la lista temporal');
		} else {
			setSpecimens((prev) => [...prev, specObject]);
			toast.success('Muestra agregada a la lista temporal');
		}

		setIsNestedFormOpen(false);
		setIsFormDirty(true);
	};

	const handleSpecimenPriceChange = (clientId: string, price: string) => {
		setSpecimens((prev) =>
			prev.map((s) => {
				if (s.client_id === clientId) {
					let ageAmt = 0;
					const chosenPrice =
						price === 'custom'
							? parseFloat(s.custom_specimen_price) || 0
							: parseFloat(price) || 0;

					if (s.age_discount_type === 'third') {
						ageAmt = (chosenPrice * thirdAgePercent) / 100;
					} else if (s.age_discount_type === 'fourth') {
						ageAmt = (chosenPrice * fourthAgePercent) / 100;
					}

					return {
						...s,
						selected_price: price,
						age_discount_amount: ageAmt.toString(),
					};
				}

				return s;
			}),
		);
	};

	const handleSpecimenCustomPriceChange = (
		clientId: string,
		customPrice: string,
	) => {
		setSpecimens((prev) =>
			prev.map((s) => {
				if (s.client_id === clientId) {
					let ageAmt = 0;
					const chosenPrice = parseFloat(customPrice) || 0;

					if (s.age_discount_type === 'third') {
						ageAmt = (chosenPrice * thirdAgePercent) / 100;
					} else if (s.age_discount_type === 'fourth') {
						ageAmt = (chosenPrice * fourthAgePercent) / 100;
					}

					return {
						...s,
						custom_specimen_price: customPrice,
						age_discount_amount: ageAmt.toString(),
					};
				}

				return s;
			}),
		);
	};

	const handleSpecimenQuantityChange = (clientId: string, qty: number) => {
		setSpecimens((prev) =>
			prev.map((s) => {
				if (s.client_id === clientId) {
					return { ...s, quantity: qty };
				}

				return s;
			}),
		);
	};

	const handleSpecimenAgeDiscountToggle = (
		clientId: string,
		type: 'third' | 'fourth' | null,
	) => {
		setSpecimens((prev) =>
			prev.map((s) => {
				if (s.client_id === clientId) {
					const updatedType =
						s.age_discount_type === type ? null : type;
					let amt = 0;
					const basePrice = parseFloat(s.selected_price) || 0;

					if (updatedType === 'third') {
						amt = (basePrice * thirdAgePercent) / 100;
					} else if (updatedType === 'fourth') {
						amt = (basePrice * fourthAgePercent) / 100;
					}

					return {
						...s,
						age_discount_type: updatedType,
						age_discount_amount: amt.toString(),
					};
				}

				return s;
			}),
		);
	};

	const handleSpecimenAdditionalDiscountToggle = (
		clientId: string,
		checked: boolean,
	) => {
		setSpecimens((prev) =>
			prev.map((s) => {
				if (s.client_id === clientId) {
					return {
						...s,
						additional_discount_enabled: checked,
						additional_discount: checked
							? s.additional_discount || '0'
							: '0',
					};
				}

				return s;
			}),
		);
	};

	const handleSpecimenAdditionalDiscountChange = (
		clientId: string,
		amount: string,
	) => {
		setSpecimens((prev) =>
			prev.map((s) => {
				if (s.client_id === clientId) {
					return { ...s, additional_discount: amount };
				}

				return s;
			}),
		);
	};
	// Global Totals calculations
	const specimensBaseTotal = useMemo(() => {
		return specimens.reduce((sum, s) => {
			const qty = s.quantity ?? 1;
			const prices =
				examinations.find((e) => e.id === s.specimen_type_examination)
					?.prices || [];
			const maxVal =
				prices.length > 0
					? Math.max(
						...prices.map((p: any) => parseFloat(p.amount) || 0),
					)
					: 0;

			const chosen =
				s.selected_price === 'custom'
					? parseFloat(s.custom_specimen_price) || 0
					: parseFloat(s.selected_price) || 0;
			const basePrice = Math.max(maxVal, chosen);

			return sum + basePrice * qty;
		}, 0);
	}, [specimens, examinations]);

	const specimensAutoDiscount = useMemo(() => {
		return specimens.reduce((sum, s) => {
			const qty = s.quantity ?? 1;
			const prices =
				examinations.find((e) => e.id === s.specimen_type_examination)
					?.prices || [];
			const maxVal =
				prices.length > 0
					? Math.max(
						...prices.map((p: any) => parseFloat(p.amount) || 0),
					)
					: 0;
			const chosen =
				s.selected_price === 'custom'
					? parseFloat(s.custom_specimen_price) || 0
					: parseFloat(s.selected_price) || 0;
			const basePrice = Math.max(maxVal, chosen);
			const diff = Math.max(0, basePrice - chosen);
			const ageDisc = parseFloat(s.age_discount_amount) || 0;

			return sum + (diff + ageDisc) * qty;
		}, 0);
	}, [specimens, examinations]);

	const specimensAdditionalDiscount = useMemo(() => {
		return specimens.reduce((sum, s) => {
			const qty = s.quantity ?? 1;
			const addDisc = s.additional_discount_enabled
				? parseFloat(s.additional_discount) || 0
				: 0;

			return sum + addDisc * qty;
		}, 0);
	}, [specimens]);

	const customAmountVal = useMemo(() => {
		return customAmountEnabled ? parseFloat(customAmount) || 0 : 0;
	}, [customAmountEnabled, customAmount]);

	const globalDiscountTotal = useMemo(() => {
		return specimensAutoDiscount + specimensAdditionalDiscount;
	}, [specimensAutoDiscount, specimensAdditionalDiscount]);

	const finalSubtotalVal = useMemo(() => {
		return Math.max(
			0,
			specimensBaseTotal + customAmountVal - globalDiscountTotal,
		);
	}, [specimensBaseTotal, customAmountVal, globalDiscountTotal]);

	const estimatedCodes = useMemo(() => {
		const typeOffsets: Record<number, number> = {};
		const map: Record<string, string> = {};

		specimens.forEach((spec) => {
			if (spec.sequence_code) {
				map[spec.client_id] = spec.sequence_code;

				return;
			}

			const typeId = parseInt(spec.specimen_type);

			if (isNaN(typeId)) {
				map[spec.client_id] = '';

				return;
			}

			const seq = localSequences.find(
				(s) =>
					s.specimen_type.toString() === typeId.toString() &&
					s.location_id === activeLocationId,
			);

			if (!seq) {
				map[spec.client_id] = '';

				return;
			}

			if (typeOffsets[typeId] === undefined) {
				typeOffsets[typeId] = 0;
			} else {
				typeOffsets[typeId]++;
			}

			const currentSeqNum = seq.current_sequence + typeOffsets[typeId];
			const fillWidth = seq.fill ?? 4;
			const paddedSeq = String(currentSeqNum).padStart(fillWidth, '0');
			const now = new Date();
			const paddedMonth = String(now.getMonth() + 1).padStart(2, '0');
			const separator = seq.separator ?? '-';
			const year = now.getFullYear();

			map[spec.client_id] =
				`${seq.prefix}${separator}${paddedSeq}${separator}${paddedMonth}${separator}${year}`;
		});

		return map;
	}, [specimens, localSequences, activeLocationId]);

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
		if (!isPaymentSheetOpen) {
			return;
		}

		const type = paymentType;

		if (type === 'cash') {
			setCashValue(finalSubtotalVal.toString());
			setCheckValue('');
			setCheckNumber('');
			setCardValueCharged('');
			setCardLast4('');
			setCardExpiration('');
			setCardAuthorizationCode('');
			setTransferValue('');
			setTransferBankId('');
			setTransferAuthorizationCode('');
		} else if (type === 'check') {
			setCheckValue(finalSubtotalVal.toString());
			setCashValue('');
			setCardValueCharged('');
			setCardLast4('');
			setCardExpiration('');
			setCardAuthorizationCode('');
			setTransferValue('');
			setTransferBankId('');
			setTransferAuthorizationCode('');
		} else if (type === 'credit card') {
			setCardValueCharged(finalSubtotalVal.toString());
			setCashValue('');
			setCheckValue('');
			setCheckNumber('');
			setTransferValue('');
			setTransferBankId('');
			setTransferAuthorizationCode('');
		} else if (type === 'bank transfer') {
			setTransferValue(finalSubtotalVal.toString());
			setCashValue('');
			setCheckValue('');
			setCheckNumber('');
			setCardValueCharged('');
			setCardLast4('');
			setCardExpiration('');
			setCardAuthorizationCode('');
		} else if (type === 'credit') {
			if (hasInitialPayment) {
				const initialAmt = initialPaymentAmount || '0';

				if (initialPaymentType === 'cash') {
					setCashValue(initialAmt);
					setCheckValue('');
					setCheckNumber('');
					setCardValueCharged('');
					setCardLast4('');
					setCardExpiration('');
					setCardAuthorizationCode('');
					setTransferValue('');
					setTransferBankId('');
					setTransferAuthorizationCode('');
				} else if (initialPaymentType === 'check') {
					setCheckValue(initialAmt);
					setCashValue('');
					setCardValueCharged('');
					setCardLast4('');
					setCardExpiration('');
					setCardAuthorizationCode('');
					setTransferValue('');
					setTransferBankId('');
					setTransferAuthorizationCode('');
				} else if (initialPaymentType === 'credit card') {
					setCardValueCharged(initialAmt);
					setCashValue('');
					setCheckValue('');
					setCheckNumber('');
					setTransferValue('');
					setTransferBankId('');
					setTransferAuthorizationCode('');
				} else if (initialPaymentType === 'bank transfer') {
					setTransferValue(initialAmt);
					setCashValue('');
					setCheckValue('');
					setCheckNumber('');
					setCardValueCharged('');
					setCardLast4('');
					setCardExpiration('');
					setCardAuthorizationCode('');
				}
			} else {
				setCashValue('');
				setCheckValue('');
				setCheckNumber('');
				setCardValueCharged('');
				setCardLast4('');
				setCardExpiration('');
				setCardAuthorizationCode('');
				setTransferValue('');
				setTransferBankId('');
				setTransferAuthorizationCode('');
			}
		}
	}, [
		finalSubtotalVal,
		paymentType,
		hasInitialPayment,
		initialPaymentAmount,
		initialPaymentType,
		isPaymentSheetOpen,
	]);

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
			(paymentType === 'credit' &&
				hasInitialPayment &&
				initialPaymentType !== 'cash');

		const hasExistingProof =
			group &&
			group.invoice?.proof_of_payment &&
			group.invoice?.payment_type === paymentType;

		if (isProofRequired && !proofOfPayment && !hasExistingProof) {
			toast.error('El comprobante de pago es obligatorio.');

			return;
		}

		// Validate custom amount
		if (customAmountEnabled) {
			if (!customAmount || parseFloat(customAmount) < 0) {
				toast.error(
					'El importe personalizado debe ser mayor o igual a 0.',
				);

				return;
			}

			if (!customAmountReason.trim()) {
				toast.error('Ingrese la razón del cargo adicional.');

				return;
			}
		}

		// Check if browser reportValidity passes
		const formEl = e.currentTarget as HTMLFormElement;

		if (!formEl.reportValidity()) {
			return;
		}

		setShowConfirm(true);
	};

	const submitGroupForm = () => {
		setProcessing(true);

		// Build request payload using Inertia router POST
		const payload: Record<string, any> = {
			global_customer_id: globalCustomerId,
			payment_type: paymentType,
			has_initial_payment: hasInitialPayment,
			initial_payment_amount: hasInitialPayment
				? initialPaymentAmount
				: null,
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
			specimens: specimens.map((s) => ({
				id: s.id,
				customer: s.customer,
				specimen_type: s.specimen_type,
				reserved_code: s.id ? null : s.sequence_code || null,
				specimen_type_examination: s.specimen_type_examination,
				specimen_category: s.specimen_category,
				referrer: s.referrer,
				anatomic_site: s.anatomic_site,
				diagnosis: s.diagnosis,
				clinical_notes: s.clinical_notes,
				status: s.status,
				priority_id: s.priority_id,
				sample_collection_date: s.sample_collection_date,
				selected_price: s.selected_price,
				custom_specimen_price: s.custom_specimen_price || '0',
				quantity: s.quantity ?? 1,
				age_discount_type: s.age_discount_type,
				age_discount_amount: s.age_discount_amount,
				additional_discount_enabled: s.additional_discount_enabled,
				additional_discount: s.additional_discount,

				// Nest supplies
				insumos: s.insumos.map((i: any) => ({
					id: i.id,
					quantity: i.quantity,
					price: i.price,
				})),
			})),
		};

		// Attach medical order files dynamically
		specimens.forEach((s, idx) => {
			if (s.medical_order_file instanceof File) {
				payload[`specimens.${idx}.medical_order_file`] =
					s.medical_order_file;
			}
		});

		const postUrl = group
			? `/specimen-groups/${group.id}/add-specimens`
			: '/specimen-groups';
		router.post(postUrl, payload, {
			onSuccess: () => {
				setProcessing(false);
				setIsFormDirty(false);
				onOpenChange(false);

				toast.success(
					group
						? 'Muestras agregadas al grupo y factura actualizada con éxito'
						: 'Muestras agrupadas creadas y facturadas con éxito',
				);
			},
			onError: (err) => {
				setProcessing(false);
				console.error(err);
				const firstErr = Object.values(err)[0];
				toast.error(
					typeof firstErr === 'string'
						? firstErr
						: group
							? 'Error al actualizar el grupo de muestras'
							: 'Error al registrar el grupo de muestras',
				);
			},
		});
	};

	return (
		<>
			{processing && (
				<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
					<Spinner className="h-12 w-12 text-primary" />
					<div className="flex flex-col items-center text-center">
						<h3 className="text-lg font-bold text-foreground">
							Procesando Grupo de Facturación
						</h3>
						<p className="mt-1 max-w-xs text-sm text-muted-foreground">
							Estamos creando las muestras y compilando la factura
							grupal en PDF. Espere.
						</p>
					</div>
				</div>
			)}

			<Sheet open={open} onOpenChange={handleOpenChange}>
				<SheetContent className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[1000px] lg:max-w-[1200px]">
					<HeadingSheet
						title={
							group
								? 'Agregar Muestras a Grupo'
								: 'Crear Muestra Agrupada'
						}
						description={
							group
								? 'Agregue más muestras a un grupo existente y actualice la facturación.'
								: 'Registre múltiples muestras asignadas a la misma factura grupal con una gestión integral de precios e insumos.'
						}
					/>

					{/* Wizard Steps indicator */}
					<div className="mx-5 mb-6 flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/40 p-4">
						<div className="mx-auto flex w-full max-w-lg flex-nowrap items-center justify-center gap-2 border-b border-border/40 pb-4 sm:gap-4">
							{/* Step 1 */}
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
									<span className="text-xs leading-none font-bold text-foreground">
										Paso 1
									</span>
									<span className="mt-1 hidden text-[11px] leading-none font-semibold text-primary sm:block">
										Muestras a Registrar
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

							{/* Step 2 */}
							<button
								type="button"
								onClick={handleNextStep}
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
									<span className="text-xs leading-none font-bold text-muted-foreground group-hover:text-foreground">
										Paso 2
									</span>
									<span className="mt-1 hidden text-[11px] leading-none font-medium text-muted-foreground group-hover:text-foreground sm:block">
										Facturación Grupal
									</span>
								</div>
							</button>
						</div>

						{/* Customer Global Selector */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<span className="shrink-0 text-xs font-bold tracking-wider text-muted-foreground uppercase">
									Cliente
								</span>
								<div className="min-w-0 flex-1">
									<AsyncCustomerCombobox
										placeholder="Seleccionar cliente"
										value={globalCustomerId}
										disabled={!!group}
										initialCustomer={
											selectedGlobalCustomerData
										}
										onChange={(v, customer) => {
											setGlobalCustomerId(v);
											setSelectedGlobalCustomerData(
												customer ?? null,
											);
											setIsFormDirty(true);
										}}
									/>
								</div>
								{!group && (
									<button
										type="button"
										onClick={() => {
											setCustomerToEdit(null);
											setCustomerSheetSource('global');
											setIsCustomerSheetOpen(true);
										}}
										className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
									>
										<Plus className="h-3 w-3" /> Nuevo
									</button>
								)}
							</div>

							{selectedGlobalCustomer && (
								<div className="relative border-t border-border/50 pt-3 text-xs">
									{pageProps.auth?.permissions?.includes(
										'patients.edit',
									) && (
											<button
												type="button"
												onClick={() => {
													setCustomerToEdit(
														selectedGlobalCustomerData,
													);
													setCustomerSheetSource(
														'global',
													);
													setIsCustomerSheetOpen(true);
												}}
												className="absolute top-3 right-0 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
											>
												<Edit2 className="h-3 w-3" /> Editar
												cliente
											</button>
										)}
									<div className="grid grid-cols-1 gap-4 pr-28 sm:grid-cols-3">
										<div className="flex flex-col gap-1">
											<span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
												RTN / Identidad
											</span>
											<span className="font-mono font-medium text-foreground">
												{selectedGlobalCustomer.id_number ||
													'N/A'}
											</span>
										</div>
										<div className="flex flex-col gap-1">
											<span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
												Correo Electrónico
											</span>
											<span className="font-medium break-all text-foreground">
												{selectedGlobalCustomer.email ||
													'Sin correo'}
											</span>
										</div>
										<div className="flex flex-col gap-1">
											<span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
												Teléfono
											</span>
											<span className="font-medium text-foreground">
												{selectedGlobalCustomer.phone ||
													'N/A'}
											</span>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Step 1 Content */}
					{currentStep === 1 && (
						<div className="space-y-6 px-5">
							<div className="flex items-center justify-between border-b pb-4">
								<div className="space-y-0.5">
									<h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
										Muestras en este Grupo
									</h3>
									<p className="text-xs text-muted-foreground">
										Cree y configure la lista de muestras
										para facturar juntas.
									</p>
								</div>
								<Button
									onClick={handleOpenNestedForm}
									disabled={!globalCustomerId}
									className="text-xs font-semibold"
									size="sm"
								>
									<Plus className="mr-1.5 h-4 w-4" /> Agregar
									Muestra
								</Button>
							</div>

							{specimens.length === 0 ? (
								<div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted/50 p-16 text-center">
									<Microscope className="mb-4 h-12 w-12 text-muted-foreground/30" />
									<h3 className="mb-1 text-sm font-bold text-foreground">
										Sin Muestras
									</h3>
									<p className="mb-4 max-w-sm text-xs text-muted-foreground">
										{!globalCustomerId
											? 'Seleccione un cliente de facturación en la barra superior antes de comenzar.'
											: 'Presione "Agregar Muestra" para registrar el primer espécimen en esta factura grupal.'}
									</p>
								</div>
							) : (
								<div className="space-y-3">
									<div className="overflow-hidden rounded-xl border bg-card">
										<Table>
											<TableHeader>
												<TableRow className="bg-muted/40">
													<TableHead className="w-12">
														Nº
													</TableHead>
													<TableHead>
														Paciente
													</TableHead>
													<TableHead>
														Examen
													</TableHead>
													<TableHead>
														Remitente
													</TableHead>
													<TableHead>
														Insumos
													</TableHead>
													<TableHead className="w-24 text-right">
														Acciones
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{specimens.map((spec, idx) => (
													<TableRow
														key={spec.client_id}
														className="hover:bg-accent/5"
													>
														<TableCell className="font-semibold">
															{idx + 1}
														</TableCell>
														<TableCell>
															<div className="flex flex-col gap-0.5">
																<div className="flex flex-wrap items-center gap-2">
																	<span className="text-sm font-semibold">
																		{
																			spec.customer_name
																		}
																	</span>
																	{estimatedCodes[
																		spec
																			.client_id
																	] && (
																			<span className="inline-flex items-center rounded-md border border-sky-100 bg-sky-50 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-400">
																				{!spec.isExisting &&
																					!spec.sequence_code &&
																					'*'}
																				{
																					estimatedCodes[
																					spec
																						.client_id
																					]
																				}
																			</span>
																		)}
																</div>
																{pageProps.auth?.permissions?.includes(
																	'patients.edit',
																) &&
																	spec.customer_data && (
																		<button
																			type="button"
																			onClick={() => {
																				setCustomerToEdit(
																					spec.customer_data,
																				);
																				setCustomerSheetSource(
																					'table_row',
																				);
																				setEditingCustomerRowClientId(
																					spec.client_id,
																				);
																				setIsCustomerSheetOpen(
																					true,
																				);
																			}}
																			className="flex items-center gap-1 self-start text-[10px] font-medium text-primary hover:underline"
																		>
																			<Edit2 className="h-3 w-3" />{' '}
																			Editar
																			paciente
																		</button>
																	)}
															</div>
														</TableCell>
														<TableCell>
															<div className="text-xs font-medium text-primary">
																{
																	spec.specimen_type_examination_name
																}
															</div>
															<div className="mt-0.5 text-[10px] text-muted-foreground">
																{
																	spec.specimen_type_name
																}
															</div>
														</TableCell>
														<TableCell>
															<span className="text-xs text-muted-foreground">
																{referrers.find(
																	(r) =>
																		r.id ===
																		spec.referrer,
																)?.name ||
																	'N/A'}
															</span>
														</TableCell>
														<TableCell>
															<Badge
																variant={
																	spec.insumos
																		.length >
																		0
																		? 'secondary'
																		: 'outline'
																}
																className="text-[10px]"
															>
																{
																	spec.insumos
																		.length
																}{' '}
																reactivos
															</Badge>
														</TableCell>
														<TableCell className="text-right">
															<div className="flex justify-end gap-1.5">
																<Button
																	variant="ghost"
																	size="icon"
																	disabled={
																		!!spec.isExisting
																	}
																	onClick={() =>
																		handleEditNestedSpecimen(
																			spec,
																		)
																	}
																	className="h-8 w-8 text-muted-foreground hover:text-foreground"
																>
																	<Edit2 className="h-3.5 w-3.5" />
																</Button>
																<Button
																	variant="ghost"
																	size="icon"
																	disabled={
																		!!spec.isExisting
																	}
																	onClick={() =>
																		handleDeleteNestedSpecimen(
																			spec.client_id,
																		)
																	}
																	className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
																>
																	<Trash2 className="h-3.5 w-3.5" />
																</Button>
															</div>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>

									<div className="text-sky-850 flex items-start gap-2.5 rounded-lg border border-sky-100 bg-sky-50/50 px-3 py-2 text-xs dark:border-sky-950/40 dark:bg-sky-950/15 dark:text-sky-300">
										<Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
										<span>
											<strong>
												Códigos de muestra reservados:
											</strong>{' '}
											Los códigos de secuencia para cada
											muestra agregada han sido reservados
											y se asignarán definitivamente al
											crear el grupo.
										</span>
									</div>
								</div>
							)}

							<div className="mt-6 flex justify-end border-t pt-4">
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
						<form
							onSubmit={handleSubmitGroup}
							className="space-y-6 px-5 pb-6"
						>
							<div className="space-y-0.5 border-b pb-4">
								<h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
									Detalles de Facturación y Metodología
								</h3>
								<p className="text-xs text-muted-foreground">
									Configure el método de pago, cargue
									comprobantes y revise los insumos/precios de
									cada muestra.
								</p>
							</div>

							<div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
								{/* Left column: List of specimens collapse and Payment config */}
								<div className="space-y-6 lg:col-span-8">
									{/* Specimens configuration cards */}
									<div className="space-y-4">
										<h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
											Configuración de Precios e Insumos
											por Muestra
										</h4>
										{specimens.map((spec, specIdx) => {
											const prices =
												examinations.find(
													(e) =>
														e.id ===
														spec.specimen_type_examination,
												)?.prices || [];
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
												parseFloat(
													spec.selected_price,
												) || 0;
											const diffDiscount = Math.max(
												0,
												maxVal - chosen,
											);
											const ageDiscVal =
												parseFloat(
													spec.age_discount_amount,
												) || 0;
											const addDiscVal =
												spec.additional_discount_enabled
													? parseFloat(
														spec.additional_discount,
													) || 0
													: 0;
											const qty = spec.quantity ?? 1;
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
													key={spec.client_id}
													className="overflow-hidden border border-border/80 shadow-sm"
												>
													<CardHeader className="flex flex-row items-center justify-between bg-muted/40 px-4 py-3">
														<div className="flex flex-col gap-0.5">
															<div className="text-sm font-bold text-foreground">
																Muestra #
																{specIdx + 1} -{' '}
																{
																	spec.specimen_type_name
																}{' '}
																-{' '}
																{
																	spec.specimen_type_examination_name
																}
															</div>
															<div className="text-xs text-muted-foreground">
																Paciente:{' '}
																<strong className="text-foreground">
																	{
																		spec.customer_name
																	}
																</strong>
															</div>
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
																<div className="flex items-center justify-between">
																	<Label className="text-xs font-semibold">
																		Seleccionar
																		Precio
																		(L.)
																	</Label>
																	{spec.specimen_type_examination && (
																		<button
																			type="button"
																			onClick={() => {
																				setSelectedExaminationForPrices(
																					examinations.find(
																						(
																							e,
																						) =>
																							e.id ===
																							spec.specimen_type_examination,
																					) ||
																					null,
																				);
																				setIsEditPricesSheetOpen(
																					true,
																				);
																			}}
																			className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
																		>
																			<Plus className="h-3 w-3" />{' '}
																			Gestionar
																		</button>
																	)}
																</div>
																<Select
																	value={
																		spec.selected_price
																	}
																	onValueChange={(
																		val,
																	) =>
																		handleSpecimenPriceChange(
																			spec.client_id,
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
																{spec.selected_price ===
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
																						spec.custom_specimen_price ||
																						''
																					}
																					onChange={(
																						e,
																					) =>
																						handleSpecimenCustomPriceChange(
																							spec.client_id,
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
																		</div>
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
																		handleSpecimenQuantityChange(
																			spec.client_id,
																			val,
																		)
																	}
																	min={1}
																/>
															</div>

															<div className="grid gap-2">
																<Label className="text-xs font-semibold">
																	Descuento
																	Estimado
																	(L.)
																</Label>
																<Input
																	type="number"
																	value={(
																		(diffDiscount +
																			ageDiscVal +
																			addDiscVal) *
																		qty
																	).toFixed(
																		2,
																	)}
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
																		Tercera
																		Edad (
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
																		spec.age_discount_type ===
																		'third'
																	}
																	onCheckedChange={() =>
																		handleSpecimenAgeDiscountToggle(
																			spec.client_id,
																			'third',
																		)
																	}
																/>
															</div>

															<div className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5">
																<div className="flex flex-col gap-0.5">
																	<Label className="text-xs font-semibold">
																		Cuarta
																		Edad (
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
																		spec.age_discount_type ===
																		'fourth'
																	}
																	onCheckedChange={() =>
																		handleSpecimenAgeDiscountToggle(
																			spec.client_id,
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
																		spec.additional_discount_enabled
																	}
																	onCheckedChange={(
																		checked,
																	) =>
																		handleSpecimenAdditionalDiscountToggle(
																			spec.client_id,
																			checked,
																		)
																	}
																/>
															</div>
															{spec.additional_discount_enabled && (
																<div className="border-t border-border/50 pt-2">
																	<Input
																		type="number"
																		step="0.01"
																		min="0"
																		placeholder="0.00"
																		value={
																			spec.additional_discount
																		}
																		onChange={(
																			e,
																		) =>
																			handleSpecimenAdditionalDiscountChange(
																				spec.client_id,
																				e
																					.target
																					.value,
																			)
																		}
																		className="h-8"
																	/>
																</div>
															)}
														</div>

														{/* Supply summary for specimen */}
														{spec.insumos &&
															spec.insumos
																.length > 0 && (
																<div className="space-y-2 border-t pt-3">
																	<Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
																		Insumos
																		/
																		Reactivos
																	</Label>
																	<div className="divide-y divide-border/60 overflow-hidden rounded-lg border bg-card/50">
																		{spec.insumos.map(
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
										})}
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
													personalizado (Grupo)
												</Label>
												<span className="text-[10px] text-muted-foreground">
													Permite agregar un importe
													manual para servicios
													adicionales del grupo.
												</span>
											</div>
											<Switch
												id="custom-amount-toggle"
												checked={customAmountEnabled}
												onCheckedChange={(checked) => {
													setCustomAmountEnabled(
														checked,
													);
													setCustomAmount(
														checked ? '0' : '0',
													);
													setCustomAmountReason('');
												}}
											/>
										</div>

										{customAmountEnabled && (
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
														value={customAmount}
														onChange={(e) =>
															setCustomAmount(
																e.target.value,
															)
														}
														placeholder="0.00"
														required
													/>
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
															customAmountReason
														}
														onChange={(e) =>
															setCustomAmountReason(
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

									{/* Detailed payment configuration */}
									<div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
										<div className="flex items-center justify-between">
											<div>
												<span className="text-xs font-semibold">
													Método de pago:
												</span>
												<span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary capitalize">
													{getPaymentTypeLabel(
														paymentType,
													)}
												</span>
											</div>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() =>
													setIsPaymentSheetOpen(true)
												}
												className="h-8 font-semibold"
											>
												{paymentType
													? 'Cambiar método de Pago'
													: 'Seleccionar método de pago'}
											</Button>
										</div>

										{paymentType ? (
											<div className="mt-2 flex flex-col gap-1.5 border-t pt-3 text-xs text-muted-foreground">
												<div className="flex items-center justify-between">
													<span>Método de Pago:</span>
													<span className="flex items-center gap-1 font-bold text-foreground capitalize">
														{paymentType ===
															'cash' && (
																<Wallet className="h-3.5 w-3.5 text-primary" />
															)}
														{paymentType ===
															'credit card' && (
																<CreditCard className="h-3.5 w-3.5 text-primary" />
															)}
														{paymentType ===
															'bank transfer' && (
																<Landmark className="h-3.5 w-3.5 text-primary" />
															)}
														{paymentType ===
															'check' && (
																<Receipt className="h-3.5 w-3.5 text-primary" />
															)}
														{getPaymentTypeLabel(
															paymentType,
														)}
													</span>
												</div>
												{paymentMethodDate && (
													<div className="flex justify-between">
														<span>Fecha:</span>
														<span className="font-mono text-foreground">
															{paymentMethodDate}
														</span>
													</div>
												)}
												{paymentType === 'cash' &&
													cashValue && (
														<div className="flex justify-between">
															<span>
																Monto Efectivo:
															</span>
															<span className="font-mono font-semibold text-foreground">
																L.{' '}
																{parseFloat(
																	cashValue,
																).toFixed(2)}
															</span>
														</div>
													)}
												{paymentType === 'check' && (
													<>
														{checkNumber && (
															<div className="flex justify-between">
																<span>
																	Número de
																	Cheque:
																</span>
																<span className="font-mono font-semibold text-foreground">
																	{
																		checkNumber
																	}
																</span>
															</div>
														)}
														{checkValue && (
															<div className="flex justify-between">
																<span>
																	Monto
																	Cheque:
																</span>
																<span className="font-mono font-semibold text-foreground">
																	L.{' '}
																	{parseFloat(
																		checkValue,
																	).toFixed(
																		2,
																	)}
																</span>
															</div>
														)}
													</>
												)}
												{paymentType ===
													'credit card' && (
														<>
															{cardLast4 && (
																<div className="flex justify-between">
																	<span>
																		Tarjeta
																		(Últimos 4):
																	</span>
																	<span className="font-mono font-semibold text-foreground">
																		****{' '}
																		{cardLast4}
																	</span>
																</div>
															)}
															{cardExpiration && (
																<div className="flex justify-between">
																	<span>
																		Expira:
																	</span>
																	<span className="font-mono font-semibold text-foreground">
																		{
																			cardExpiration
																		}
																	</span>
																</div>
															)}
															{cardAuthorizationCode && (
																<div className="flex justify-between">
																	<span>
																		Código
																		Autorización:
																	</span>
																	<span className="font-mono font-semibold text-foreground">
																		{
																			cardAuthorizationCode
																		}
																	</span>
																</div>
															)}
															{cardValueCharged && (
																<div className="flex justify-between">
																	<span>
																		Monto
																		Cobrado:
																	</span>
																	<span className="font-mono font-semibold text-foreground">
																		L.{' '}
																		{parseFloat(
																			cardValueCharged,
																		).toFixed(
																			2,
																		)}
																	</span>
																</div>
															)}
														</>
													)}
												{paymentType ===
													'bank transfer' && (
														<>
															{transferBankId && (
																<div className="flex justify-between">
																	<span>
																		Banco:
																	</span>
																	<span className="font-semibold text-foreground">
																		{banks.find(
																			(b) =>
																				b.id.toString() ===
																				transferBankId.toString(),
																		)?.name ||
																			'Banco Seleccionado'}
																	</span>
																</div>
															)}
															{transferAuthorizationCode && (
																<div className="flex justify-between">
																	<span>
																		Código
																		Transferencia:
																	</span>
																	<span className="font-mono font-semibold text-foreground">
																		{
																			transferAuthorizationCode
																		}
																	</span>
																</div>
															)}
															{transferValue && (
																<div className="flex justify-between">
																	<span>
																		Monto
																		Transferido:
																	</span>
																	<span className="font-mono font-semibold text-foreground">
																		L.{' '}
																		{parseFloat(
																			transferValue,
																		).toFixed(
																			2,
																		)}
																	</span>
																</div>
															)}
														</>
													)}
												{paymentType === 'credit' && (
													<>
														<div className="flex justify-between">
															<span>
																Pago Inicial:
															</span>
															<span className="font-semibold text-foreground">
																{hasInitialPayment
																	? 'Sí'
																	: 'No'}
															</span>
														</div>
														{hasInitialPayment && (
															<>
																<div className="flex justify-between">
																	<span>
																		Monto
																		Inicial:
																	</span>
																	<span className="font-mono font-semibold text-foreground">
																		L.{' '}
																		{parseFloat(
																			initialPaymentAmount ||
																			'0',
																		).toFixed(
																			2,
																		)}
																	</span>
																</div>
																<div className="flex justify-between">
																	<span>
																		Tipo de
																		Pago
																		Inicial:
																	</span>
																	<span className="font-semibold text-foreground capitalize">
																		{getPaymentTypeLabel(
																			initialPaymentType,
																		)}
																	</span>
																</div>
															</>
														)}
													</>
												)}
											</div>
										) : (
											<div className="mt-2 border-t pt-2.5 text-[11px] text-muted-foreground italic">
												Por favor, configure los
												detalles del pago.
											</div>
										)}
									</div>

									{/* Proof of Payment File Upload */}
									{((paymentType !== 'cash' &&
										paymentType !== 'credit' &&
										paymentType !== '') ||
										(paymentType === 'credit' &&
											hasInitialPayment &&
											initialPaymentType !== 'cash')) && (
											<div className="grid gap-2">
												<Label htmlFor="proof_of_payment">
													Comprobante de Pago (PDF o
													Imagen){' '}
													<span className="text-destructive">
														*
													</span>
												</Label>

												{proofOfPayment ? (
													<div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
														<div className="flex items-center gap-3">
															<div className="rounded-md bg-emerald-500/10 p-2 text-emerald-500">
																<FileText className="h-5 w-5" />
															</div>
															<div className="flex flex-col text-xs">
																<span className="max-w-[150px] truncate font-semibold text-foreground sm:max-w-xs">
																	{
																		proofOfPayment.name
																	}
																</span>
																<span className="text-[10px] text-muted-foreground">
																	{(
																		proofOfPayment.size /
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
																setProofOfPayment(
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

																setProofOfPayment(
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
											</div>
										)}
								</div>

								{/* Right column: Total Resume Card */}
								<div className="space-y-4 lg:col-span-4">
									<div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-5 shadow-sm dark:bg-muted/10">
										<h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
											Resumen de Totales (Grupo)
										</h4>
										<div className="mt-2 flex flex-col gap-3">
											<div className="flex justify-between text-xs">
												<span className="text-muted-foreground">
													Precio Regular Muestras:
												</span>
												<span className="font-semibold text-foreground">
													L.{' '}
													{specimensBaseTotal.toFixed(
														2,
													)}
												</span>
											</div>

											{customAmountEnabled && (
												<div className="flex flex-col gap-0.5 text-xs">
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
													{customAmountReason && (
														<span className="truncate text-[10px] text-muted-foreground italic">
															Razón:{' '}
															{customAmountReason}
														</span>
													)}
												</div>
											)}

											{globalDiscountTotal > 0 ? (
												<div className="flex flex-col gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
													<span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
														Descuentos Aplicados
													</span>
													{specimensAutoDiscount >
														0 && (
															<div className="flex justify-between text-xs">
																<span>
																	Descuentos
																	Muestras / Edad:
																</span>
																<span className="font-semibold">
																	- L.{' '}
																	{specimensAutoDiscount.toFixed(
																		2,
																	)}
																</span>
															</div>
														)}
													{specimensAdditionalDiscount >
														0 && (
															<div className="flex justify-between text-xs">
																<span>
																	Descuentos
																	Adicionales:
																</span>
																<span className="font-semibold">
																	- L.{' '}
																	{specimensAdditionalDiscount.toFixed(
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
															{globalDiscountTotal.toFixed(
																2,
															)}
														</span>
													</div>
												</div>
											) : (
												<div className="flex justify-between text-xs">
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
													L.{' '}
													{finalSubtotalVal.toFixed(
														2,
													)}
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
													L.{' '}
													{finalSubtotalVal.toFixed(
														2,
													)}
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
													ISV 15% / 18%:
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
													L.{' '}
													{finalSubtotalVal.toFixed(
														2,
													)}
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Wizard navigation buttons */}
							<div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
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

					{/* Nested Specimen Form Dialog */}
					<Sheet
						open={isNestedFormOpen}
						onOpenChange={setIsNestedFormOpen}
					>
						<SheetContent
							side="right"
							className="z-[90] w-full max-w-[550px] overflow-y-auto sm:max-w-[750px]"
						>
							<HeadingSheet
								title={
									nestedSpecimenToEditId
										? 'Editar Muestra del Grupo'
										: 'Agregar Muestra al Grupo'
								}
								description="Ingrese los datos requeridos para registrar este espécimen en el grupo."
							/>

							<div className="space-y-5 px-5 py-4">
								<div className="grid gap-2">
									<div className="flex items-center gap-2">
										<Label
											htmlFor="nested_customer"
											className="shrink-0"
										>
											Paciente / Cliente
										</Label>
										<div className="min-w-0 flex-1">
											<AsyncCustomerCombobox
												placeholder="Seleccionar paciente"
												value={nestedCustomer}
												initialCustomer={
													selectedNestedCustomerData
												}
												onChange={(v, customer) => {
													setNestedCustomer(v);
													setSelectedNestedCustomerData(
														customer ?? null,
													);
													setNestedErrors((prev) => ({
														...prev,
														customer: '',
													}));
												}}
											/>
										</div>
										<button
											type="button"
											onClick={() => {
												setCustomerToEdit(null);
												setCustomerSheetSource(
													'nested',
												);
												setIsCustomerSheetOpen(true);
											}}
											className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
										>
											<Plus className="h-3 w-3" /> Nuevo
										</button>
									</div>
									{nestedErrors.customer && (
										<p className="text-xs text-destructive">
											{nestedErrors.customer}
										</p>
									)}
								</div>

								<div className="grid gap-2">
									<div className="flex items-center justify-between">
										<Label htmlFor="nested_referrer">
											Médico Remitente
										</Label>
										<div className="flex items-center gap-3">
											{nestedReferrer && (
												<button
													type="button"
													onClick={() => {
														const selected =
															referrers.find(
																(r) =>
																	r.id.toString() ===
																	nestedReferrer,
															);
														if (selected) {
															setEditingReferrer(
																selected,
															);
															setIsReferrerSheetOpen(
																true,
															);
														}
													}}
													className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
												>
													<Edit2 className="h-3.5 w-3.5" />{' '}
													Editar
												</button>
											)}
											<button
												type="button"
												onClick={() => {
													setEditingReferrer(null);
													setIsReferrerSheetOpen(
														true,
													);
												}}
												className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
											>
												<Plus className="h-3.5 w-3.5" />{' '}
												Nuevo
											</button>
										</div>
									</div>
									<FormCombobox
										placeholder="Seleccionar médico"
										value={nestedReferrer}
										onChange={(v) => {
											setNestedReferrer(v);
											setNestedErrors((prev) => ({
												...prev,
												referrer: '',
											}));
										}}
										options={referrers.map((r) => ({
											label:
												r.notes && r.notes.trim()
													? `(ID: ${r.id}) ${r.name} - ${r.notes.trim()}`
													: `(ID: ${r.id}) ${r.name} - (Sin Notas/Hospital/Clinica)`,
											value: r.id.toString(),
										}))}
									/>
									{nestedErrors.referrer && (
										<p className="text-xs text-destructive">
											{nestedErrors.referrer}
										</p>
									)}
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="grid gap-2">
										<div className="flex items-center justify-between">
											<Label htmlFor="nested_specimen_type">
												Tipo de Muestra
											</Label>
											<button
												type="button"
												onClick={() =>
													setIsSpecimenTypeSheetOpen(
														true,
													)
												}
												className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
											>
												<Plus className="h-3.5 w-3.5" />{' '}
												Nuevo
											</button>
										</div>
										<FormCombobox
											placeholder="Seleccionar tipo"
											value={nestedSpecimenType}
											onChange={(v) => {
												setNestedSpecimenType(v);
												setNestedReservedCode('');
												setNestedExamination(''); // reset exam
												setNestedErrors((prev) => ({
													...prev,
													specimen_type: '',
												}));
											}}
											options={specimenTypes.map((t) => ({
												label: t.name,
												value: t.id.toString(),
											}))}
										/>
										{nestedErrors.specimen_type && (
											<p className="text-xs text-destructive">
												{nestedErrors.specimen_type}
											</p>
										)}
									</div>

									<div className="grid gap-2">
										<div className="flex items-center justify-between">
											<Label htmlFor="nested_examination">
												Análisis / Examen
											</Label>
											<button
												type="button"
												onClick={() =>
													setIsExaminationSheetOpen(
														true,
													)
												}
												disabled={!nestedSpecimenType}
												className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
											>
												<Plus className="h-3.5 w-3.5" />{' '}
												Nuevo
											</button>
										</div>
										<FormCombobox
											placeholder={
												nestedSpecimenType
													? 'Seleccionar examen'
													: 'Primero seleccione tipo de muestra'
											}
											value={nestedExamination}
											disabled={!nestedSpecimenType}
											onChange={(v) => {
												setNestedExamination(v);
												setNestedErrors((prev) => ({
													...prev,
													specimen_type_examination:
														'',
												}));
											}}
											options={examinations
												.filter(
													(e) =>
														e.specimen_type?.toString() ===
														nestedSpecimenType,
												)
												.map((e) => ({
													label: e.name,
													value: e.id.toString(),
												}))}
										/>
										{nestedErrors.specimen_type_examination && (
											<p className="text-xs text-destructive">
												{
													nestedErrors.specimen_type_examination
												}
											</p>
										)}
									</div>
								</div>

								{nestedSpecimenType && (
									<div className="mt-2 transition-all duration-300">
										{matchingSequence ? (
											<div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
												<Tag className="h-4 w-4 shrink-0 text-emerald-500" />
												<span className="text-xs font-semibold">
													Secuencia de numeración
													activa configurada para el
													tipo de muestra
												</span>
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
														activa. Debe crear una
														antes de poder facturar.
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

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="grid gap-2">
										<div className="flex items-center justify-between">
											<Label htmlFor="nested_category">
												Categoría (Tiempo)
											</Label>
											<button
												type="button"
												onClick={() =>
													setIsCategorySheetOpen(true)
												}
												className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
											>
												<Plus className="h-3.5 w-3.5" />{' '}
												Nuevo
											</button>
										</div>
										<FormCombobox
											placeholder="Seleccionar categoría"
											value={nestedCategory}
											onChange={(v) => {
												setNestedCategory(v);
												setNestedErrors((prev) => ({
													...prev,
													specimen_category: '',
												}));
											}}
											options={categories.map((c) => ({
												label: c.name,
												value: c.id.toString(),
											}))}
										/>
										{nestedErrors.specimen_category && (
											<p className="text-xs text-destructive">
												{nestedErrors.specimen_category}
											</p>
										)}
									</div>

									<div className="grid gap-2">
										<Label htmlFor="nested_priority">
											Prioridad
										</Label>
										<FormCombobox
											placeholder="Seleccionar prioridad"
											value={nestedPriority}
											onChange={(v) => {
												setNestedPriority(v);
												setNestedErrors((prev) => ({
													...prev,
													priority_id: '',
												}));
											}}
											options={priorities.map((p) => ({
												label: p.name,
												value: p.id.toString(),
												color: p.color,
											}))}
										/>
										{nestedErrors.priority_id && (
											<p className="text-xs text-destructive">
												{nestedErrors.priority_id}
											</p>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="grid gap-2">
										<Label htmlFor="nested_sample_collection_date">
											Fecha de la toma
										</Label>
										<DatePicker
											value={nestedSampleCollectionDate}
											onChange={(v) => {
												setNestedSampleCollectionDate(
													v,
												);
												setNestedErrors((prev) => ({
													...prev,
													sample_collection_date: '',
												}));
											}}
										/>
										{nestedErrors.sample_collection_date && (
											<p className="text-xs text-destructive">
												{
													nestedErrors.sample_collection_date
												}
											</p>
										)}
									</div>

									<div className="grid gap-2">
										<Label htmlFor="nested_status">
											Estado Inicial
										</Label>
										<FormCombobox
											placeholder="Seleccionar estado"
											value={nestedStatus}
											onChange={(v) => {
												setNestedStatus(v);
												setNestedErrors((prev) => ({
													...prev,
													status: '',
												}));
											}}
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
													disabled: true,
												},
												{
													label: 'En Proceso',
													value: 'processing',
													color: '#f59e0b',
													disabled: true,
												},
												{
													label: 'Revisión Microscópica',
													value: 'microscopic_review',
													color: '#d946ef',
													disabled: true,
												},
												{
													label: 'Finalizada',
													value: 'finalized',
													color: '#10b981',
													disabled: true,
												},
												{
													label: 'Entregada',
													value: 'delivered',
													color: '#64748b',
													disabled: true,
												},
												{
													label: 'Cancelada',
													value: 'cancelled',
													color: '#ef4444',
													disabled: true,
												},
											]}
										/>
										{nestedErrors.status && (
											<p className="text-xs text-destructive">
												{nestedErrors.status}
											</p>
										)}
									</div>
								</div>

								{/* Medical order file upload inside nested form */}
								<div className="grid gap-2">
									<Label htmlFor="nested_medical_order_file">
										Orden Médica (Archivo PDF o Imagen)
									</Label>
									{nestedMedicalOrderFile ? (
										<div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
											<div className="flex items-center gap-2">
												<FileText className="h-5 w-5 text-emerald-500" />
												<div className="flex flex-col text-xs">
													<span className="max-w-[200px] truncate font-semibold text-foreground">
														{
															nestedMedicalOrderFile.name
														}
													</span>
													<span className="text-[10px] text-muted-foreground">
														{(
															nestedMedicalOrderFile.size /
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
													setNestedMedicalOrderFile(
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
												id="nested_medical_order_file"
												className="hidden"
												accept=".pdf,image/*"
												onChange={(e) => {
													const file =
														e.target.files?.[0] ||
														null;

													if (
														file &&
														file.size >
														50 * 1024 * 1024
													) {
														toast.error(
															'El archivo de Orden Médica no debe exceder los 50MB.',
														);
														e.target.value = '';

														return;
													}

													setNestedMedicalOrderFile(
														file,
													);
												}}
											/>
											<label
												htmlFor="nested_medical_order_file"
												className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card p-5 text-center transition-all duration-200 hover:border-primary/50 hover:bg-accent/10"
											>
												<div className="mb-2 rounded-full bg-secondary p-2.5 text-secondary-foreground">
													<Upload className="h-4 w-4" />
												</div>
												<span className="text-xs font-semibold text-foreground">
													Subir Orden Médica
												</span>
												<span className="mt-1 text-[10px] text-muted-foreground">
													PDF o imágenes hasta 50MB
												</span>
											</label>
										</div>
									)}
								</div>

								<div className="grid gap-2">
									<Label htmlFor="nested_diagnosis">
										Diagnóstico Clínico / Sospecha
									</Label>
									<Textarea
										id="nested_diagnosis"
										value={nestedDiagnosis}
										onChange={(e) =>
											setNestedDiagnosis(e.target.value)
										}
										placeholder="Escriba el diagnóstico aquí..."
										className="resize-none"
										rows={2}
									/>
								</div>

								<div className="grid gap-2">
									<Label htmlFor="nested_anatomic_site">
										Sitio Anatómico
									</Label>
									<Textarea
										id="nested_anatomic_site"
										value={nestedAnatomicSite}
										onChange={(e) =>
											setNestedAnatomicSite(
												e.target.value,
											)
										}
										placeholder="Ej. Brazo izquierdo..."
										className="resize-none"
										rows={2}
									/>
								</div>

								<div className="grid gap-2">
									<Label htmlFor="nested_clinical_notes">
										Notas Clínicas
									</Label>
									<Textarea
										id="nested_clinical_notes"
										value={nestedClinicalNotes}
										onChange={(e) =>
											setNestedClinicalNotes(
												e.target.value,
											)
										}
										placeholder="Información adicional relevante..."
										className="resize-none"
										rows={2}
									/>
								</div>

								{/* Agregar Insumos inside Nested Form */}
								<div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
									<div className="flex flex-col gap-0.5">
										<Label className="cursor-pointer text-xs font-semibold">
											Agregar insumos
										</Label>
										<span className="text-[10px] text-muted-foreground">
											Registre los insumos químicos o
											reactivos que se utilizarán en el
											análisis.
										</span>
									</div>
									<Switch
										checked={nestedAgregarInsumos}
										onCheckedChange={(checked) => {
											setNestedAgregarInsumos(checked);

											if (!checked) {
												setNestedInsumos([]);
											}
										}}
									/>
								</div>

								{nestedAgregarInsumos && (
									<div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
										<div className="relative">
											<Input
												type="text"
												placeholder="Buscar insumo por nombre o código..."
												value={supplySearchQuery}
												onChange={(e) =>
													setSupplySearchQuery(
														e.target.value,
													)
												}
												className="h-9 w-full pr-8"
											/>
											{supplySearchQuery && (
												<button
													type="button"
													onClick={() =>
														setSupplySearchQuery('')
													}
													className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
												>
													<X className="h-4 w-4" />
												</button>
											)}
										</div>

										<div className="overflow-hidden rounded-xl border bg-card">
											<div className="max-h-[220px] divide-y divide-border overflow-y-auto">
												{filteredProducts.length ===
													0 ? (
													<div className="flex flex-col items-center justify-center gap-1 p-6 text-center text-xs text-muted-foreground">
														<Microscope className="h-6 w-6 text-muted-foreground/30" />
														<span>
															No se encontraron
															insumos.
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
																totalStock <= 0;
															const isAlreadyAdded =
																nestedInsumos.some(
																	(i) =>
																		i.id ===
																		product.id,
																);

															return (
																<div
																	key={
																		product.id
																	}
																	className="flex items-center justify-between p-2 text-xs"
																>
																	<div className="flex max-w-[65%] flex-col gap-0.5">
																		<span className="truncate font-semibold text-foreground">
																			{
																				product.name
																			}
																		</span>
																		<span className="font-mono text-[9px] text-muted-foreground">
																			{
																				product.code
																			}
																		</span>
																	</div>
																	<div className="flex items-center gap-2">
																		<span className="text-[10px] font-semibold text-emerald-600">
																			{
																				totalStock
																			}{' '}
																			u.
																		</span>
																		<Button
																			type="button"
																			size="sm"
																			variant={
																				isAlreadyAdded
																					? 'secondary'
																					: 'outline'
																			}
																			onClick={() =>
																				handleAddNestedInsumo(
																					product,
																				)
																			}
																			disabled={
																				isOutOfStock
																			}
																			className="h-7 text-[10px] font-semibold"
																		>
																			{isAlreadyAdded
																				? 'Agregado'
																				: 'Agregar'}
																		</Button>
																	</div>
																</div>
															);
														},
													)
												)}
											</div>
										</div>

										{nestedInsumos.length > 0 && (
											<div className="space-y-2 border-t pt-3">
												<div className="text-[11px] font-bold text-muted-foreground uppercase">
													Seleccionados (
													{nestedInsumos.length})
												</div>
												<div className="max-h-[200px] divide-y overflow-y-auto rounded border bg-card">
													{nestedInsumos.map((i) => (
														<div
															key={i.id}
															className="flex flex-col gap-2 p-2 hover:bg-accent/5"
														>
															<div className="flex items-center justify-between text-xs">
																<span className="max-w-[200px] truncate font-medium">
																	{i.name}
																</span>
																<Button
																	variant="ghost"
																	size="icon"
																	onClick={() =>
																		handleRemoveNestedInsumo(
																			i.id,
																		)
																	}
																	className="h-6 w-6 text-muted-foreground hover:text-destructive"
																>
																	<X className="h-3 w-3" />
																</Button>
															</div>
															<div className="flex items-center justify-between gap-4">
																<div className="flex h-7 items-center rounded border bg-background p-0.5">
																	<button
																		type="button"
																		onClick={() =>
																			handleUpdateNestedQty(
																				i.id,
																				i.quantity -
																				1,
																			)
																		}
																		disabled={
																			i.quantity <=
																			1
																		}
																		className="h-5 w-5 rounded text-xs font-bold hover:bg-muted"
																	>
																		-
																	</button>
																	<span className="w-6 text-center font-mono text-xs font-bold">
																		{
																			i.quantity
																		}
																	</span>
																	<button
																		type="button"
																		onClick={() =>
																			handleUpdateNestedQty(
																				i.id,
																				i.quantity +
																				1,
																			)
																		}
																		disabled={
																			i.quantity >=
																			i.total_stock
																		}
																		className="h-5 w-5 rounded text-xs font-bold hover:bg-muted"
																	>
																		+
																	</button>
																</div>
																<span className="font-mono text-[10px] text-muted-foreground">
																	Stock:{' '}
																	{
																		i.total_stock
																	}
																</span>
															</div>
														</div>
													))}
												</div>
											</div>
										)}
									</div>
								)}

								<div className="flex justify-end gap-3 border-t pt-4">
									<Button
										variant="outline"
										onClick={() =>
											setIsNestedFormOpen(false)
										}
										disabled={isReservingCode}
									>
										Cancelar
									</Button>
									<Button
										onClick={handleSaveNestedSpecimen}
										disabled={isReservingCode}
									>
										{isReservingCode ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Reservando Código...
											</>
										) : (
											'Guardar Muestra'
										)}
									</Button>
								</div>
							</div>
						</SheetContent>
					</Sheet>

					{/* Close warning AlertDialog */}
					<AlertDialog
						open={showCloseConfirm}
						onOpenChange={setShowCloseConfirm}
					>
						<AlertDialogContent className="max-w-[450px]">
							<AlertDialogHeader>
								<AlertDialogTitle>
									¿Estás seguro de salir?
								</AlertDialogTitle>
								<AlertDialogDescription>
									Todos los datos ingresados en la creación
									grupal se perderán permanentemente.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel
									onClick={() => setShowCloseConfirm(false)}
								>
									Cancelar
								</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => {
										setShowCloseConfirm(false);
										setIsFormDirty(false);
										onOpenChange(false);
									}}
									className="bg-destructive text-destructive-foreground text-white hover:bg-destructive/90"
								>
									Sí, salir
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>

					{/* Payment Details Configuration Sheet */}
					<PaymentMethodSheet
						open={isPaymentSheetOpen}
						onOpenChange={setIsPaymentSheetOpen}
						banks={banks}
						totalAmount={finalSubtotalVal}
						paymentData={{
							payment_type: paymentType,
							payment_method_date: paymentMethodDate,
							cash_value: cashValue,
							check_number: checkNumber,
							check_value: checkValue,
							card_last_4: cardLast4,
							card_value_charged: cardValueCharged,
							card_expiration: cardExpiration,
							card_authorization_code: cardAuthorizationCode,
							transfer_bank_id: transferBankId,
							transfer_value: transferValue,
							transfer_authorization_code:
								transferAuthorizationCode,
							has_initial_payment: hasInitialPayment,
							initial_payment_amount: initialPaymentAmount,
							initial_payment_type: initialPaymentType,
						}}
						onSave={(paymentData: PaymentData) => {
							setPaymentType(paymentData.payment_type);
							setPaymentMethodDate(
								paymentData.payment_method_date,
							);
							setCashValue(paymentData.cash_value);
							setCheckNumber(paymentData.check_number);
							setCheckValue(paymentData.check_value);
							setCardLast4(paymentData.card_last_4);
							setCardValueCharged(paymentData.card_value_charged);
							setCardExpiration(paymentData.card_expiration);
							setCardAuthorizationCode(
								paymentData.card_authorization_code,
							);
							setTransferBankId(paymentData.transfer_bank_id);
							setTransferValue(paymentData.transfer_value);
							setTransferAuthorizationCode(
								paymentData.transfer_authorization_code,
							);
							setHasInitialPayment(
								paymentData.has_initial_payment,
							);
							setInitialPaymentAmount(
								paymentData.initial_payment_amount,
							);
							setInitialPaymentType(
								paymentData.initial_payment_type,
							);
							setIsPaymentSheetOpen(false);
							toast.success('Método de pago configurado.');
						}}
						className="z-[95]"
						overlayClassName="z-[95]"
					/>

					{/* On-the-fly sheets for nested creation */}
					<Sheet
						open={isEditPricesSheetOpen}
						onOpenChange={setIsEditPricesSheetOpen}
					>
						<SheetContent
							side="right"
							className="z-[120] w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]"
							overlayClassName="z-[120]"
						>
							<HeadingSheet
								title="Gestionar Precios"
								description="Modifique la lista de precios para este análisis."
							/>
							<div className="-mx-5 mt-4 px-5">
								{selectedExaminationForPrices && (
									<ExaminationPricesForm
										examination={
											selectedExaminationForPrices
										}
										onSuccess={() =>
											setIsEditPricesSheetOpen(false)
										}
									/>
								)}
							</div>
						</SheetContent>
					</Sheet>

					<CustomerSheet
						open={isCustomerSheetOpen}
						onOpenChange={setIsCustomerSheetOpen}
						customer={customerToEdit as any}
						className="z-[100] w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]"
						overlayClassName="z-[100]"
						onSuccess={(updatedCustomer: any) => {
							if (updatedCustomer) {
								if (customerSheetSource === 'global') {
									setSelectedGlobalCustomerData(
										updatedCustomer,
									);
								} else if (customerSheetSource === 'nested') {
									setSelectedNestedCustomerData(
										updatedCustomer,
									);
								} else if (
									customerSheetSource === 'table_row'
								) {
									setSpecimens((prev) =>
										prev.map((s) => {
											if (
												s.client_id ===
												editingCustomerRowClientId
											) {
												return {
													...s,
													customer_name:
														updatedCustomer.name,
													customer_data:
														updatedCustomer,
												};
											}

											return s;
										}),
									);
									setEditingCustomerRowClientId(null);
								}
							}
						}}
					/>

					<Sheet
						open={isReferrerSheetOpen}
						onOpenChange={setIsReferrerSheetOpen}
					>
						<SheetContent
							side="right"
							className="z-[100] w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]"
							overlayClassName="z-[100]"
						>
							<HeadingSheet
								title={
									editingReferrer
										? 'Editar Médico Remitente'
										: 'Nuevo Médico Remitente'
								}
								description={
									editingReferrer
										? 'Modifique los datos del médico remitente.'
										: 'Ingrese los datos del médico remitente a registrar en el sistema.'
								}
							/>
							<ReferrerForm
								key={
									editingReferrer ? editingReferrer.id : 'new'
								}
								referrer={editingReferrer}
								referrerTypes={referrerTypes}
								onSuccess={() => setIsReferrerSheetOpen(false)}
							/>
						</SheetContent>
					</Sheet>

					<Sheet
						open={isSpecimenTypeSheetOpen}
						onOpenChange={setIsSpecimenTypeSheetOpen}
					>
						<SheetContent
							side="right"
							className="z-[100] w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]"
							overlayClassName="z-[100]"
						>
							<HeadingSheet
								title="Nuevo Tipo de Muestra"
								description="Ingrese los datos del tipo de muestra a registrar en el sistema."
							/>
							<SpecimenTypeForm
								specimenType={null}
								onSuccess={() =>
									setIsSpecimenTypeSheetOpen(false)
								}
							/>
						</SheetContent>
					</Sheet>

					<Sheet
						open={isSequenceSheetOpen}
						onOpenChange={setIsSequenceSheetOpen}
					>
						<SheetContent
							side="right"
							className="z-[100] w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]"
							overlayClassName="z-[100]"
						>
							<HeadingSheet
								title="Nueva Secuencia de Numeración"
								description="Configure una secuencia de numeración correlativa."
							/>
							<div className="-mx-5 mt-4 px-5">
								{isSequenceSheetOpen && (
									<SequenceForm
										locations={locations}
										specimenTypes={specimenTypes}
										defaultLocationId={
											activeLocationId || undefined
										}
										defaultSpecimenTypeId={
											nestedSpecimenType
												? parseInt(nestedSpecimenType)
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

					<SpecimenTypeExaminationSheet
						examination={null}
						specimenTypes={specimenTypes}
						open={isExaminationSheetOpen}
						onOpenChange={setIsExaminationSheetOpen}
						defaultSpecimenTypeId={nestedSpecimenType || undefined}
						className="z-[100] w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]"
						overlayClassName="z-[100]"
					/>

					<CategorySheet
						category={null}
						open={isCategorySheetOpen}
						onOpenChange={setIsCategorySheetOpen}
						className="z-[100] w-full max-w-[450px] overflow-y-auto sm:max-w-[650px]"
						overlayClassName="z-[100]"
					/>

					{/* CONFIRMACIÓN DE DIÁLOGO SHADCN (ALERTDIALOG) */}
					<AlertDialog
						open={showConfirm}
						onOpenChange={setShowConfirm}
					>
						<AlertDialogContent className="z-[120] max-w-[500px]">
							<AlertDialogHeader>
								<AlertDialogTitle>
									Resumen de Factura y Transacción
								</AlertDialogTitle>
								<AlertDialogDescription>
									Revise detalladamente los importes antes de
									emitir la factura fiscal del grupo.
								</AlertDialogDescription>
							</AlertDialogHeader>

							<div className="grid gap-3 py-3 text-sm">
								<div className="flex justify-between border-b pb-2">
									<span className="font-medium text-muted-foreground">
										Cliente / Paciente (Facturación):
									</span>
									<span className="font-semibold text-foreground">
										{selectedGlobalCustomerData?.name ||
											'Sin seleccionar'}
									</span>
								</div>

								{/* RESUMEN DE MUESTRAS EN UNA FILA */}
								<div className="flex flex-col gap-1.5 border-b pb-2">
									<span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
										Muestras del Grupo ({specimens.length}):
									</span>
									<div className="flex max-h-[160px] flex-col gap-1.5 overflow-y-auto pr-1">
										{specimens.map((spec) => {
											const specTypeName =
												specimenTypes.find(
													(t) =>
														t.id.toString() ===
														spec.specimen_type.toString(),
												)?.name || '';
											const examName =
												examinations.find(
													(e) =>
														e.id.toString() ===
														spec.specimen_type_examination.toString(),
												)?.name || '';

											const prices =
												examinations.find(
													(e) =>
														e.id ===
														spec.specimen_type_examination,
												)?.prices || [];
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
												spec.selected_price === 'custom'
													? parseFloat(
														spec.custom_specimen_price,
													) || 0
													: parseFloat(
														spec.selected_price,
													) || 0;
											const diffDiscount = Math.max(
												0,
												maxVal - chosen,
											);
											const ageDiscVal =
												parseFloat(
													spec.age_discount_amount,
												) || 0;
											const addDiscVal =
												spec.additional_discount_enabled
													? parseFloat(
														spec.additional_discount,
													) || 0
													: 0;
											const qty = spec.quantity ?? 1;
											const netPrice = Math.max(
												0,
												(maxVal -
													(diffDiscount +
														ageDiscVal +
														addDiscVal)) *
												qty,
											);

											return (
												<div
													key={spec.client_id}
													className="flex items-center justify-between border-b border-muted/50 py-0.5 text-xs last:border-0"
												>
													<span className="max-w-[320px] truncate font-medium text-foreground">
														{specTypeName} -{' '}
														{examName}{' '}
														{qty > 1 && `(x${qty})`}
													</span>
													<span className="font-semibold whitespace-nowrap text-foreground">
														L. {netPrice.toFixed(2)}
													</span>
												</div>
											);
										})}
									</div>
								</div>

								<div className="flex justify-between border-b pb-2">
									<span className="font-medium text-muted-foreground">
										Tipo de Pago:
									</span>
									<span className="font-semibold text-foreground">
										{getPaymentTypeLabel(paymentType)}
									</span>
								</div>

								<div className="flex justify-between border-b pb-2">
									<span className="font-medium text-muted-foreground">
										Total Muestras (Base):
									</span>
									<span className="font-semibold text-foreground">
										L. {specimensBaseTotal.toFixed(2)}
									</span>
								</div>

								{customAmountEnabled && (
									<div className="flex flex-col gap-0.5 border-b pb-2">
										<div className="flex justify-between">
											<span className="font-medium text-muted-foreground">
												Importe Personalizado:
											</span>
											<span className="font-semibold text-foreground">
												L. {customAmountVal.toFixed(2)}
											</span>
										</div>
										{customAmountReason && (
											<span className="text-left text-[10px] text-muted-foreground italic">
												Razón: {customAmountReason}
											</span>
										)}
									</div>
								)}

								{globalDiscountTotal > 0 ? (
									<div className="flex flex-col gap-1.5 rounded border border-b border-emerald-500/20 bg-emerald-500/5 p-2.5 pb-2 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
										<span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
											Descuentos Aplicados
										</span>
										{specimensAutoDiscount > 0 && (
											<div className="flex justify-between text-xs">
												<span>
													Descuentos Automáticos /
													Edad:
												</span>
												<span className="font-semibold">
													- L.{' '}
													{specimensAutoDiscount.toFixed(
														2,
													)}
												</span>
											</div>
										)}
										{specimensAdditionalDiscount > 0 && (
											<div className="flex justify-between text-xs">
												<span>
													Descuentos Adicionales:
												</span>
												<span className="font-semibold">
													- L.{' '}
													{specimensAdditionalDiscount.toFixed(
														2,
													)}
												</span>
											</div>
										)}
										<div className="flex justify-between border-t border-emerald-500/20 pt-1 text-xs font-bold">
											<span>Total Descuentos:</span>
											<span>
												- L.{' '}
												{globalDiscountTotal.toFixed(2)}
											</span>
										</div>
									</div>
								) : (
									<div className="flex justify-between border-b pb-2 text-emerald-600 dark:text-emerald-400">
										<span className="font-medium">
											Descuentos Aplicados:
										</span>
										<span className="font-semibold">
											- L. 0.00
										</span>
									</div>
								)}

								<div className="flex justify-between pt-1 text-base font-bold">
									<span>TOTAL NETO A PAGAR:</span>
									<span className="text-primary">
										L. {finalSubtotalVal.toFixed(2)}
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
										submitGroupForm();
									}}
								>
									Confirmar y Emitir Factura
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</SheetContent>
			</Sheet>
		</>
	);
}
