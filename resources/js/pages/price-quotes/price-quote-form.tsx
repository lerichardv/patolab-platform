import { router, usePage } from '@inertiajs/react';
import {
	ArrowRight,
	Check,
	ChevronDown,
	Edit2,
	Microscope,
	Plus,
	Tag,
	Trash2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
	store as priceQuoteStore,
	update as priceQuoteUpdate,
} from '@/actions/App/Http/Controllers/PriceQuoteController';
import AsyncCustomerCombobox from '@/components/async-customer-combobox';
import type { CustomerOption } from '@/components/async-customer-combobox';
import HeadingSheet from '@/components/heading-sheet';
import PriceQuoteSummaryAlertDialog from '@/components/price-quote-summary-alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
import { cn } from '@/lib/utils';
import CustomerSheet from '@/pages/customers/customer-sheet';
import ExaminationPricesForm from '@/pages/specimen-type-examinations/examination-prices-form';
import { calculateInvoiceItem } from '@/services/invoice-calculation';
import type { FormQuoteSpecimenGroup } from './price-quote-specimen-form';
import PriceQuoteSpecimenSheet from './price-quote-specimen-sheet';

export interface FormQuoteSpecimen {
	id?: number;
	client_id: string;
	specimen: string;
	specimen_type: number;
	specimen_type_name?: string;
	specimen_category: number;
	specimen_category_name?: string;
	examination_id: number;
	examination_name?: string;
	quantity: number;
	selected_price?: string;
	custom_specimen_price?: number;
	additional_discount_enabled?: boolean;
	additional_discount?: number;
	age_discout_type?: 'third' | 'fourth' | null;
	available_prices?: any[];
}

interface Props {
	initialQuote?: any | null;
	specimenTypes: any[];
	specimenCategories: any[];
	examinations: any[];
	settings?: Record<string, string>;
	onSuccess: () => void;
	setIsDirty?: (dirty: boolean) => void;
}

export default function PriceQuoteForm({
	initialQuote = null,
	specimenTypes = [],
	specimenCategories = [],
	examinations = [],
	settings = {},
	onSuccess,
	setIsDirty,
}: Props) {
	const isEdit = Boolean(initialQuote?.id);

	const pageProps = usePage<any>().props;

	const [currentStep, setCurrentStep] = useState(1);
	const [submitting, setSubmitting] = useState(false);
	const [showSummaryConfirm, setShowSummaryConfirm] = useState(false);

	// Global Header Customer
	const [customerId, setCustomerId] = useState<string>(
		initialQuote?.customer_id ? initialQuote.customer_id.toString() : '',
	);
	const [selectedCustomer, setSelectedCustomer] =
		useState<CustomerOption | null>(initialQuote?.customer || null);

	// Customer Sheet for on-the-fly creation / edit
	const [customerToEdit, setCustomerToEdit] = useState<any | null>(null);
	const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);

	// Examination Prices Sheet state
	const [isEditPricesSheetOpen, setIsEditPricesSheetOpen] = useState(false);
	const [selectedExaminationForPrices, setSelectedExaminationForPrices] =
		useState<any | null>(null);

	// Quote Items (Specimens)
	const [quoteItems, setQuoteItems] = useState<FormQuoteSpecimen[]>(() => {
		if (
			initialQuote?.price_quote_specimens &&
			initialQuote.price_quote_specimens.length > 0
		) {
			return initialQuote.price_quote_specimens.map(
				(item: any, idx: number) => {
					const rawTypeId =
						item.specimen_type_id ??
						(typeof item.specimen_type === 'object' && item.specimen_type !== null
							? item.specimen_type.id
							: item.specimen_type);
					const specimenTypeId = Number(rawTypeId) || 0;

					const rawCatId =
						item.specimen_category_id ??
						(typeof item.specimen_category === 'object' && item.specimen_category !== null
							? item.specimen_category.id
							: item.specimen_category);
					const specimenCategoryId = Number(rawCatId) || 0;

					const rawExamId =
						typeof item.examination_id === 'object' && item.examination_id !== null
							? item.examination_id.id
							: item.examination_id;
					const examinationId = Number(rawExamId) || 0;

					const type =
						specimenTypes.find(
							(t) => t.id === specimenTypeId,
						) ||
						item.specimen_type_relation ||
						item.specimenType ||
						(typeof item.specimen_type === 'object' ? item.specimen_type : null);
					const cat =
						specimenCategories.find(
							(c) => c.id === specimenCategoryId,
						) ||
						item.specimen_category_relation ||
						item.specimenCategory ||
						(typeof item.specimen_category === 'object' ? item.specimen_category : null);
					const exam =
						examinations.find(
							(e) => e.id === examinationId,
						) || item.examination;

					const examPrices = [
						...(exam?.prices || item.available_prices || []),
					].sort(
						(a: any, b: any) =>
							parseFloat(b.amount) - parseFloat(a.amount),
					);
					const defaultPrice =
						examPrices.length > 0
							? examPrices[0].amount.toString()
							: '0';

					return {
						id: item.id,
						client_id: `existing_${item.id || idx}`,
						specimen: item.specimen || `spec_${item.id || idx}`,
						specimen_type: specimenTypeId,
						specimen_type_name:
							type?.name || `Tipo #${specimenTypeId}`,
						specimen_category: specimenCategoryId,
						specimen_category_name:
							cat?.name || `Cat #${specimenCategoryId}`,
						examination_id: examinationId,
						examination_name: exam?.name || 'Examen',
						quantity: item.quantity || 1,
						selected_price:
							item.selected_price?.toString() || defaultPrice,
						custom_specimen_price: parseFloat(
							item.custom_specimen_price || '0',
						),
						additional_discount_enabled: Boolean(
							item.additional_discount_enabled,
						),
						additional_discount: parseFloat(
							item.additional_discount || '0',
						),
						age_discout_type: item.age_discout_type || null,
						available_prices: examPrices,
					};
				},
			);
		}

		return [];
	});

	// Nested Sheet State: Adding/Editing a Specimen
	const [isAddSpecimenSheetOpen, setIsAddSpecimenSheetOpen] = useState(false);
	const [editingSpecimenGroup, setEditingSpecimenGroup] =
		useState<FormQuoteSpecimenGroup | null>(null);

	const thirdAgePercent = parseFloat(settings?.third_age_discount || '25');
	const fourthAgePercent = parseFloat(settings?.fourth_age_discount || '35');

	// Open nested sheet to Add Specimen
	const handleOpenAddSpecimen = () => {
		setEditingSpecimenGroup(null);
		setIsAddSpecimenSheetOpen(true);
	};

	// Open nested sheet to Edit an existing specimen group
	const handleOpenEditSpecimen = (group: {
		specimenCode: string;
		specimen_type: number | any;
		specimen_type_name?: string;
		specimen_category: number | any;
		specimen_category_name?: string;
		items: FormQuoteSpecimen[];
	}) => {
		const typeId =
			typeof group.specimen_type === 'object' && group.specimen_type !== null
				? group.specimen_type.id
				: group.specimen_type;
		const catId =
			typeof group.specimen_category === 'object' && group.specimen_category !== null
				? group.specimen_category.id
				: group.specimen_category;

		setEditingSpecimenGroup({
			specimen: group.specimenCode,
			specimen_type: Number(typeId) || 0,
			specimen_type_name: group.specimen_type_name,
			specimen_category: Number(catId) || 0,
			specimen_category_name: group.specimen_category_name,
			selectedExamIds: group.items.map((i) =>
				typeof i.examination_id === 'object' && i.examination_id !== null
					? (i.examination_id as any).id
					: Number(i.examination_id),
			),
			items: group.items,
		});
		setIsAddSpecimenSheetOpen(true);
	};

	// Remove all items belonging to a specimen group
	const handleDeleteSpecimenGroup = (specimenCode: string) => {
		setQuoteItems((prev) =>
			prev.filter((it) => it.specimen !== specimenCode),
		);
		setIsDirty?.(true);
		toast.info('Muestra eliminada de la cotización');
	};

	// Save nested specimen(s) from the modal sheet
	const handleSaveSpecimensFromSheet = (items: FormQuoteSpecimen[]) => {
		if (editingSpecimenGroup) {
			setQuoteItems((prev) => {
				const otherItems = prev.filter(
					(it) => it.specimen !== editingSpecimenGroup.specimen,
				);

				return [...otherItems, ...items];
			});
			toast.success('Muestra actualizada correctamente');
		} else {
			setQuoteItems((prev) => [...prev, ...items]);
			toast.success(
				`${items.length} examen(es) agregados a la cotización`,
			);
		}

		setIsDirty?.(true);
		setIsAddSpecimenSheetOpen(false);
		setEditingSpecimenGroup(null);
	};

	// Update single exam item configuration in Step 2
	const handleExamConfigChange = (
		clientId: string,
		field: keyof FormQuoteSpecimen,
		value: any,
	) => {
		setQuoteItems((prev) =>
			prev.map((it) =>
				it.client_id === clientId ? { ...it, [field]: value } : it,
			),
		);
		setIsDirty?.(true);
	};

	// Step 2 financial item breakdown calculation
	const calculatedItems = useMemo(() => {
		return quoteItems.map((item) => {
			const exam = examinations.find((e) => e.id === item.examination_id);

			const calculated = calculateInvoiceItem(
				{
					examination_id: item.examination_id,
					selected_price: item.selected_price,
					custom_specimen_price: item.custom_specimen_price,
					quantity: item.quantity,
					age_discount_type: item.age_discout_type,
					additional_discount_enabled:
						item.additional_discount_enabled,
					additional_discount: item.additional_discount,
					available_prices:
						item.available_prices || exam?.prices || [],
					examination: exam || null,
				},
				exam || null,
				settings,
			);

			return {
				...item,
				calculated,
			};
		});
	}, [quoteItems, examinations, settings]);

	// Group calculated items by specimen code for Step 1 and Step 2
	const groupedSpecimens = useMemo(() => {
		const map = new Map<string, typeof calculatedItems>();

		for (const item of calculatedItems) {
			const code = item.specimen || 'spec_unknown';

			if (!map.has(code)) {
				map.set(code, []);
			}

			map.get(code)!.push(item);
		}

		return Array.from(map.entries()).map(([specimenCode, items]) => ({
			specimenCode,
			specimen_type: items[0].specimen_type,
			specimen_type_name: items[0].specimen_type_name,
			specimen_category: items[0].specimen_category,
			specimen_category_name: items[0].specimen_category_name,
			items,
			specimenSubtotal: items.reduce(
				(sum, it) => sum + (it.calculated?.subtotal || 0),
				0,
			),
			examNames: items
				.map((i) => i.examination_name)
				.filter(Boolean) as string[],
		}));
	}, [calculatedItems]);

	// Financial totals across all items
	const totals = useMemo(() => {
		return calculatedItems.reduce(
			(acc, curr) => {
				const c = curr.calculated;
				acc.grossAmount += c.amount;
				acc.totalDiscount += c.discount;
				acc.subtotal += c.subtotal;
				acc.exemptAmount += c.exempt_amount;
				acc.taxableAmount15 += c.taxable_amount_15;
				acc.taxableAmount18 += c.taxable_amount_18;
				acc.isv15 += c.isv_15;
				acc.isv18 += c.isv_18;
				acc.total += c.total;

				return acc;
			},
			{
				grossAmount: 0,
				totalDiscount: 0,
				subtotal: 0,
				exemptAmount: 0,
				taxableAmount15: 0,
				taxableAmount18: 0,
				isv15: 0,
				isv18: 0,
				total: 0,
			},
		);
	}, [calculatedItems]);

	// Trigger summary modal instead of immediate submission
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (quoteItems.length === 0) {
			toast.error('Debe agregar al menos una muestra o examen');

			return;
		}

		setShowSummaryConfirm(true);
	};

	const executeSubmit = () => {
		setSubmitting(true);

		const specimensPayload = calculatedItems.map((item) => {
			const c = item.calculated;

			const rawTypeId =
				(item as any).specimen_type_id ??
				(typeof item.specimen_type === 'object' && item.specimen_type !== null
					? (item.specimen_type as any).id
					: item.specimen_type);
			const rawCatId =
				(item as any).specimen_category_id ??
				(typeof item.specimen_category === 'object' && item.specimen_category !== null
					? (item.specimen_category as any).id
					: item.specimen_category);
			const rawExamId =
				typeof item.examination_id === 'object' && item.examination_id !== null
					? (item.examination_id as any).id
					: item.examination_id;

			return {
				specimen: item.specimen,
				specimen_type: Number(rawTypeId) || 0,
				specimen_category: Number(rawCatId) || 0,
				examination_id: Number(rawExamId) || 0,
				quantity: item.quantity,
				amount: c.amount,
				discount: c.discount,
				subtotal: c.subtotal,
				exempt_amount: c.exempt_amount,
				taxable_amount_15: c.taxable_amount_15,
				taxable_amount_18: c.taxable_amount_18,
				isv_15: c.isv_15,
				isv_18: c.isv_18,
				total: c.total,
				selected_price: c.selected_price,
				custom_specimen_price: c.custom_specimen_price,
				additional_discount_enabled: c.additional_discount_enabled,
				additional_discount: c.additional_discount,
				age_discout_type: c.age_discount_type,
				age_discout_amount: c.age_discount_amount,
			};
		});

		const payload = {
			customer_id: customerId ? parseInt(customerId) : null,
			specimens: specimensPayload,
		};

		if (isEdit && initialQuote?.id) {
			router.put(priceQuoteUpdate.url(initialQuote.id), payload, {
				onSuccess: () => {
					toast.success('Cotización actualizada exitosamente');
					setIsDirty?.(false);
					setSubmitting(false);
					onSuccess();
				},
				onError: (err) => {
					console.error('Error updating price quote:', err);
					toast.error('Ocurrió un error al actualizar la cotización');
					setSubmitting(false);
				},
			});
		} else {
			router.post(priceQuoteStore.url(), payload, {
				onSuccess: () => {
					toast.success('Cotización creada exitosamente');
					setIsDirty?.(false);
					setSubmitting(false);
					onSuccess();
				},
				onError: (err) => {
					console.error('Error creating price quote:', err);
					toast.error('Ocurrió un error al guardar la cotización');
					setSubmitting(false);
				},
			});
		}
	};

	return (
		<>
			{submitting &&
				typeof window !== 'undefined' &&
				createPortal(
					<div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
						<Spinner className="h-12 w-12 text-primary" />
						<div className="flex flex-col items-center text-center">
							<h3 className="text-lg font-bold text-foreground">
								{isEdit
									? 'Actualizando Cotización'
									: 'Procesando Cotización'}
							</h3>
							<p className="mt-1 max-w-xs text-sm text-muted-foreground">
								Estamos guardando los exámenes y compilando la
								cotización en PDF. Espere un momento.
							</p>
						</div>
					</div>,
					document.body,
				)}
			{/* Wizard Steps indicator */}
			<div className="mx-5 mb-6 pb-8 flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/40 p-4">
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
						onClick={() => {
							if (quoteItems.length > 0) {
								setCurrentStep(2);
							}
						}}
						disabled={quoteItems.length === 0}
						className={cn(
							'group flex cursor-pointer items-center gap-2 text-left focus:outline-none sm:gap-3',
							currentStep !== 2 && 'hover:opacity-80',
							quoteItems.length === 0 &&
							'cursor-not-allowed opacity-50',
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
								placeholder="Seleccionar cliente (opcional)"
								value={customerId}
								initialCustomer={selectedCustomer}
								onChange={(val, customer) => {
									setCustomerId(val);
									setSelectedCustomer(customer ?? null);
									setIsDirty?.(true);
								}}
							/>
						</div>
						<button
							type="button"
							onClick={() => {
								setCustomerToEdit(null);
								setIsCustomerSheetOpen(true);
							}}
							className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
						>
							<Plus className="h-3 w-3" /> Nuevo
						</button>
					</div>

					{selectedCustomer && (
						<div className="relative border-t border-border/50 pt-3 text-xs">
							{pageProps?.auth?.permissions?.includes(
								'patients.edit',
							) && (
									<button
										type="button"
										onClick={() => {
											setCustomerToEdit(selectedCustomer);
											setIsCustomerSheetOpen(true);
										}}
										className="absolute top-3 right-0 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
									>
										<Edit2 className="h-3 w-3" /> Editar cliente
									</button>
								)}
							<div className="grid grid-cols-1 gap-4 pr-28 sm:grid-cols-3">
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
								<div className="flex flex-col gap-1">
									<span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
										Teléfono
									</span>
									<span className="font-medium text-foreground">
										{selectedCustomer.phone || 'N/A'}
									</span>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* STEP 1: Muestras en esta Cotización */}
			{currentStep === 1 && (
				<div className="space-y-6 px-5 pb-6">
					<div className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-0.5">
							<h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
								Muestras en esta Cotización
							</h3>
							<p className="text-xs text-muted-foreground">
								Cree y configure la lista de muestras para
								cotizar juntas.
							</p>
						</div>
						<Button
							type="button"
							onClick={handleOpenAddSpecimen}
							className="h-9 gap-1.5 font-semibold shadow-sm"
							size="sm"
						>
							<Plus className="h-4 w-4" />
							<span>Agregar Muestra</span>
						</Button>
					</div>

					{groupedSpecimens.length === 0 ? (
						/* Empty state */
						<div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted/60 p-16 text-center">
							<Microscope className="mb-4 h-12 w-12 text-muted-foreground/30" />
							<h3 className="mb-1 text-sm font-bold text-foreground">
								Sin Muestras
							</h3>
							<p className="mb-4 max-w-sm text-xs text-muted-foreground">
								Presione "Agregar Muestra" para registrar el
								primer espécimen en esta cotización.
							</p>
							<Button
								type="button"
								onClick={handleOpenAddSpecimen}
								variant="outline"
								size="sm"
								className="gap-1.5"
							>
								<Plus className="h-3.5 w-3.5" />
								<span>Agregar Muestra</span>
							</Button>
						</div>
					) : (
						/* Grouped Specimens Table matching specimen-group-form */
						<div className="space-y-3">
							<div className="overflow-hidden rounded-xl border bg-card">
								<Table>
									<TableHeader>
										<TableRow className="bg-muted/40">
											<TableHead className="w-12">
												Nº
											</TableHead>
											<TableHead>Code</TableHead>
											<TableHead>Examen</TableHead>
											<TableHead>Remitente</TableHead>
											<TableHead>Insumos</TableHead>
											<TableHead className="w-24 text-right">
												Acciones
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{groupedSpecimens.map(
											(specGroup, idx) => (
												<TableRow
													key={specGroup.specimenCode}
													className="hover:bg-accent/5"
												>
													<TableCell className="font-semibold">
														{idx + 1}
													</TableCell>
													<TableCell>
														<span className="inline-flex items-center rounded-md border border-sky-100 bg-sky-50 px-2 py-0.5 font-mono text-xs font-bold text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-400">
															{
																specGroup.specimenCode
															}
														</span>
													</TableCell>
													<TableCell>
														<div className="text-xs font-medium text-primary">
															{specGroup.examNames.join(
																', ',
															)}
														</div>
														<div className="mt-0.5 text-[10px] text-muted-foreground">
															{
																specGroup.specimen_type_name
															}
														</div>
													</TableCell>
													<TableCell>
														<span className="text-xs text-muted-foreground">
															-
														</span>
													</TableCell>
													<TableCell>
														<Badge
															variant="outline"
															className="text-[10px]"
														>
															0 reactivos
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														<div className="flex justify-end gap-1.5">
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onClick={() =>
																	handleOpenEditSpecimen(
																		specGroup,
																	)
																}
																className="h-8 w-8 text-muted-foreground hover:text-foreground"
																title="Editar espécimen"
															>
																<Edit2 className="h-3.5 w-3.5" />
															</Button>
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onClick={() =>
																	handleDeleteSpecimenGroup(
																		specGroup.specimenCode,
																	)
																}
																className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
																title="Eliminar espécimen"
															>
																<Trash2 className="h-3.5 w-3.5" />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											),
										)}
									</TableBody>
								</Table>
							</div>
						</div>
					)}

					{/* Step 1 Footer */}
					<div className="flex justify-end pt-4">
						<Button
							type="button"
							onClick={() => setCurrentStep(2)}
							disabled={quoteItems.length === 0}
							className="gap-1.5 font-semibold"
						>
							<span>Siguiente Paso</span>
							<ArrowRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}

			{/* STEP 2: Facturación y Precios de la Cotización */}
			{currentStep === 2 && (
				<form onSubmit={handleSubmit} className="space-y-6 px-5 pb-6">
					<div className="space-y-0.5 border-b pb-4">
						<h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
							Configuración de Precios y Descuentos
						</h3>
						<p className="text-xs text-muted-foreground">
							Configure los precios, descuentos por edad y
							adicionales para cada muestra cotizada.
						</p>
					</div>

					<div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
						{/* Left column: List of specimens grouped */}
						<div className="space-y-6 lg:col-span-8">
							<div className="space-y-4">
								{groupedSpecimens.map((group, groupIdx) => {
									return (
										<div
											key={group.specimenCode}
											className="space-y-3 rounded-xl border bg-muted/20 p-4"
										>
											<div className="flex items-center justify-between border-b pb-2">
												<div>
													<div className="flex items-center gap-2">
														<h5 className="text-sm font-bold text-foreground">
															Muestra #
															{groupIdx + 1} -{' '}
															{
																group.specimen_type_name
															}
														</h5>
														<span className="inline-flex items-center rounded-md border border-sky-100 bg-sky-50 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-400">
															{group.specimenCode}
														</span>
													</div>
													{selectedCustomer?.name && (
														<span className="text-xs text-muted-foreground">
															Paciente:{' '}
															<strong className="text-foreground">
																{
																	selectedCustomer.name
																}
															</strong>
														</span>
													)}
												</div>
												<Badge
													variant="outline"
													className="font-mono text-xs font-semibold text-primary"
												>
													Subtotal Muestra: L.{' '}
													{group.specimenSubtotal.toFixed(
														2,
													)}
												</Badge>
											</div>

											<div className="flex flex-col gap-3">
												{group.items.map(
													(item, examIdx) => {
														const c =
															item.calculated;
														const examObj =
															examinations.find(
																(e) =>
																	e.id ===
																	item.examination_id,
															);
														const examName = examObj
															? examObj.name
															: item.examination_name ||
															`Análisis #${examIdx + 1}`;
														const examPrices = [
															...(examObj?.prices ||
																item.available_prices ||
																[]),
														].sort(
															(a: any, b: any) =>
																parseFloat(
																	b.amount,
																) -
																parseFloat(
																	a.amount,
																),
														);

														return (
															<Card
																key={
																	item.client_id
																}
																className="overflow-hidden border border-border/80 pt-6 pb-2 shadow-sm"
															>
																<CardHeader className="flex flex-row items-center justify-between px-4 py-3">
																	<div className="flex flex-col gap-0.5">
																		<div className="text-xs text-muted-foreground">
																			Tipo
																			de
																			muestra:{' '}
																			<strong className="text-foreground">
																				{
																					group.specimen_type_name
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
																			{c.discount.toFixed(
																				2,
																			)}
																		</Badge>
																		<Badge
																			variant="outline"
																			className="font-mono text-xs font-semibold text-primary"
																		>
																			Subtotal:
																			L.{' '}
																			{c.subtotal.toFixed(
																				2,
																			)}
																		</Badge>
																	</div>
																</CardHeader>
																<CardContent className="space-y-4 p-4">
																	<div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
																		{/* Price selector */}
																		<div className="grid gap-2">
																			<div className="flex items-center justify-between">
																				<Label className="text-xs font-semibold">
																					Importe
																					/
																					Precio
																					Base
																					(L.)
																					*
																				</Label>
																				{examObj && (
																					<button
																						type="button"
																						onClick={() => {
																							setSelectedExaminationForPrices(
																								examObj,
																							);
																							setIsEditPricesSheetOpen(
																								true,
																							);
																						}}
																						className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
																					>
																						<Edit2 className="h-3 w-3" />{' '}
																						Precios
																					</button>
																				)}
																			</div>
																			<Select
																				value={
																					item.selected_price ||
																					''
																				}
																				onValueChange={(
																					val,
																				) =>
																					handleExamConfigChange(
																						item.client_id,
																						'selected_price',
																						val,
																					)
																				}
																			>
																				<SelectTrigger className="h-9 w-full">
																					<SelectValue placeholder="Seleccione un precio" />
																				</SelectTrigger>
																				<SelectContent className="z-[110]">
																					{examPrices.length >
																						0 ? (
																						<>
																							{examPrices.map(
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
																										)}{' '}
																										{p.description
																											? `(${p.description})`
																											: ''}
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

																			{item.selected_price ===
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
																								item.custom_specimen_price ??
																								''
																							}
																							onChange={(
																								e,
																							) =>
																								handleExamConfigChange(
																									item.client_id,
																									'custom_specimen_price',
																									parseFloat(
																										e
																											.target
																											.value,
																									) ||
																									0,
																								)
																							}
																							placeholder="0.00"
																							className="h-8 pl-7 font-mono text-xs"
																							required
																						/>
																					</div>
																				)}
																		</div>

																		{/* Quantity */}
																		<div className="flex flex-col items-start gap-2">
																			<Label className="text-xs font-semibold">
																				Cantidad
																				*
																			</Label>
																			<NumberPicker
																				value={
																					item.quantity
																				}
																				onChange={(
																					val,
																				) =>
																					handleExamConfigChange(
																						item.client_id,
																						'quantity',
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
																			c.discount >
																			0 ||
																			item.additional_discount_enabled ||
																			!!item.age_discout_type
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
																					{c.discount >
																						0 && (
																							<Badge
																								variant="secondary"
																								className="h-5 px-1.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
																							>
																								-L.{' '}
																								{c.discount.toFixed(
																									2,
																								)}
																							</Badge>
																						)}
																				</div>
																				<ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
																			</button>
																		</CollapsibleTrigger>

																		<CollapsibleContent className="space-y-3 pt-3">
																			{/* Additional Discount Switch */}
																			<div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
																				<div className="flex items-center justify-between">
																					<div className="flex flex-col gap-0.5">
																						<Label className="cursor-pointer text-xs font-semibold">
																							Descuento
																							Adicional
																						</Label>
																						<span className="text-[10px] text-muted-foreground">
																							Permite
																							aplicar
																							un
																							descuento
																							adicional
																							personalizado
																							a
																							este
																							análisis.
																						</span>
																					</div>
																					<Switch
																						checked={Boolean(
																							item.additional_discount_enabled,
																						)}
																						onCheckedChange={(
																							checked,
																						) =>
																							handleExamConfigChange(
																								item.client_id,
																								'additional_discount_enabled',
																								checked,
																							)
																						}
																					/>
																				</div>
																				{item.additional_discount_enabled && (
																					<div className="border-t border-border/50 pt-2">
																						<Input
																							type="number"
																							step="0.01"
																							min="0"
																							placeholder="0.00"
																							value={
																								item.additional_discount ??
																								''
																							}
																							onChange={(
																								e,
																							) =>
																								handleExamConfigChange(
																									item.client_id,
																									'additional_discount',
																									parseFloat(
																										e
																											.target
																											.value,
																									) ||
																									0,
																								)
																							}
																							className="h-8 font-mono text-xs"
																						/>
																					</div>
																				)}
																			</div>

																			{/* Age Discounts Switches */}
																			<div className="grid grid-cols-1 gap-3 border-t border-border/50 pt-3 md:grid-cols-2">
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
																							Aplica{' '}
																							{
																								thirdAgePercent
																							}

																							%
																							sobre
																							el
																							precio
																							base.
																						</span>
																					</div>
																					<Switch
																						checked={
																							item.age_discout_type ===
																							'third'
																						}
																						onCheckedChange={(
																							checked,
																						) =>
																							handleExamConfigChange(
																								item.client_id,
																								'age_discout_type',
																								checked
																									? 'third'
																									: null,
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
																							Aplica{' '}
																							{
																								fourthAgePercent
																							}

																							%
																							sobre
																							el
																							precio
																							base.
																						</span>
																					</div>
																					<Switch
																						checked={
																							item.age_discout_type ===
																							'fourth'
																						}
																						onCheckedChange={(
																							checked,
																						) =>
																							handleExamConfigChange(
																								item.client_id,
																								'age_discout_type',
																								checked
																									? 'fourth'
																									: null,
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
										</div>
									);
								})}
							</div>
						</div>

						{/* Right column: Sticky Financial Summary Card */}
						<div className="space-y-4 lg:sticky lg:top-4 lg:col-span-4">
							<Card className="border border-sidebar-border/80 shadow-md">
								<CardHeader className="border-b bg-muted/30 pb-3">
									<CardTitle className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
										Resumen de Cotización
									</CardTitle>
								</CardHeader>

								<CardContent className="space-y-3 pt-4 text-xs">
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Monto Bruto:
										</span>
										<span className="font-mono font-medium">
											L. {totals.grossAmount.toFixed(2)}
										</span>
									</div>

									<div className="flex justify-between text-emerald-600 dark:text-emerald-400">
										<span>Descuento Total:</span>
										<span className="font-mono font-semibold">
											- L.{' '}
											{totals.totalDiscount.toFixed(2)}
										</span>
									</div>

									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Subtotal Neto:
										</span>
										<span className="font-mono font-medium">
											L. {totals.subtotal.toFixed(2)}
										</span>
									</div>

									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Importe Exento:
										</span>
										<span className="font-mono">
											L. {totals.exemptAmount.toFixed(2)}
										</span>
									</div>

									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Gravado 15%:
										</span>
										<span className="font-mono">
											L.{' '}
											{totals.taxableAmount15.toFixed(2)}
										</span>
									</div>

									<div className="flex justify-between">
										<span className="text-muted-foreground">
											ISV 15%:
										</span>
										<span className="font-mono font-medium">
											L. {totals.isv15.toFixed(2)}
										</span>
									</div>

									<Separator className="my-2" />

									<div className="flex items-baseline justify-between pt-1">
										<span className="text-sm font-bold tracking-tight text-foreground">
											TOTAL COTIZADO:
										</span>
										<span className="font-mono text-xl font-extrabold text-primary">
											L. {totals.total.toFixed(2)}
										</span>
									</div>
								</CardContent>
							</Card>
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
							disabled={submitting}
						>
							{submitting && <Spinner className="mr-2" />}
							{isEdit
								? 'Actualizar Cotización'
								: 'Guardar Cotización'}
						</Button>
					</div>
				</form>
			)}

			{/* STACKED SHEET: Modal to Add / Edit Specimen */}
			<PriceQuoteSpecimenSheet
				open={isAddSpecimenSheetOpen}
				onOpenChange={(isOpen) => {
					setIsAddSpecimenSheetOpen(isOpen);

					if (!isOpen) {
						setEditingSpecimenGroup(null);
					}
				}}
				editingSpecimen={editingSpecimenGroup}
				specimenTypes={specimenTypes}
				specimenCategories={specimenCategories}
				examinations={examinations}
				onSave={handleSaveSpecimensFromSheet}
			/>

			{/* Examination Prices Modal Sheet */}
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
								examination={selectedExaminationForPrices}
								onSuccess={() =>
									setIsEditPricesSheetOpen(false)
								}
							/>
						)}
					</div>
				</SheetContent>
			</Sheet>

			{/* Customer Creation Sheet */}
			<CustomerSheet
				customer={customerToEdit}
				open={isCustomerSheetOpen}
				onOpenChange={(isOpen) => {
					setIsCustomerSheetOpen(isOpen);

					if (!isOpen) {
						setCustomerToEdit(null);
					}
				}}
				onSuccess={(newCust) => {
					if (newCust) {
						const opt: CustomerOption = {
							id: newCust.id,
							name: newCust.name,
							id_number: newCust.id_number,
							email: newCust.email,
							phone: newCust.phone,
						};
						setCustomerId(newCust.id.toString());
						setSelectedCustomer(opt);
						setIsDirty?.(true);
					}

					setIsCustomerSheetOpen(false);
					setCustomerToEdit(null);
				}}
			/>

			{/* Price Quote Summary Confirmation Dialog */}
			<PriceQuoteSummaryAlertDialog
				open={showSummaryConfirm}
				onOpenChange={setShowSummaryConfirm}
				customerName={selectedCustomer?.name}
				items={calculatedItems.map((ci) => ({
					client_id: ci.client_id,
					specimen: ci.specimen,
					temp_specimen_code: ci.specimen,
					specimen_type: ci.specimen_type,
					examination_id: ci.examination_id,
					quantity: ci.quantity,
					total: ci.calculated.total,
				}))}
				specimenTypes={specimenTypes}
				examinations={examinations}
				baseTotal={totals.grossAmount}
				autoDiscountTotal={calculatedItems.reduce(
					(sum, ci) =>
						sum +
						(Number(ci.calculated.age_discount_amount || 0) || 0) +
						Math.max(
							0,
							(ci.calculated.maxPrice || 0) -
							(Number(ci.calculated.selected_price || 0) ||
								0),
						) *
						(ci.quantity || 1),
					0,
				)}
				additionalDiscountTotal={calculatedItems.reduce(
					(sum, ci) =>
						sum +
						(ci.calculated.additional_discount_enabled
							? Number(ci.calculated.additional_discount || 0) ||
							0
							: 0),
					0,
				)}
				globalDiscountTotal={totals.totalDiscount}
				finalTotal={totals.total}
				onConfirm={executeSubmit}
			/>
		</>
	);
}
