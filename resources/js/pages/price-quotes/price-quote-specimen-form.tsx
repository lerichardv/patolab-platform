import {
	Check,
	ChevronDown,
	FileText,
	Microscope,
	Plus,
	Search,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import FormCombobox from '@/components/form-combobox';
import HeadingSheet from '@/components/heading-sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import CategorySheet from '@/pages/specimen-categories/category-sheet';
import SpecimenTypeExaminationSheet from '@/pages/specimen-type-examinations/specimen-type-examination-sheet';
import SpecimenTypeForm from '@/pages/specimen-types/specimen-type-form';
import type { FormQuoteSpecimen } from './price-quote-form';

export interface FormQuoteSpecimenGroup {
	specimen: string; // 12-char hex code
	specimen_type: number;
	specimen_type_name?: string;
	specimen_category: number;
	specimen_category_name?: string;
	selectedExamIds: number[];
	items?: FormQuoteSpecimen[];
}

export interface PriceQuoteSpecimenFormProps {
	editingSpecimen?: FormQuoteSpecimenGroup | null;
	specimenTypes: any[];
	specimenCategories: any[];
	examinations: any[];
	onSave: (items: FormQuoteSpecimen[], specimenCode: string) => void;
	onCancel?: () => void;
	setIsDirty?: (dirty: boolean) => void;
}

export default function PriceQuoteSpecimenForm({
	editingSpecimen = null,
	specimenTypes = [],
	specimenCategories = [],
	examinations = [],
	onSave,
	onCancel,
	setIsDirty,
}: PriceQuoteSpecimenFormProps) {
	const [specimenType, setSpecimenType] = useState<string>(() => {
		if (!editingSpecimen?.specimen_type) {
			return specimenTypes[0]?.id?.toString() || '';
		}

		const val = typeof editingSpecimen.specimen_type === 'object'
			? (editingSpecimen.specimen_type as any).id
			: editingSpecimen.specimen_type;

		return val ? val.toString() : (specimenTypes[0]?.id?.toString() || '');
	});
	const [specimenCategory, setSpecimenCategory] = useState<string>(() => {
		if (!editingSpecimen?.specimen_category) {
			return specimenCategories[0]?.id?.toString() || '';
		}

		const val = typeof editingSpecimen.specimen_category === 'object'
			? (editingSpecimen.specimen_category as any).id
			: editingSpecimen.specimen_category;

		return val ? val.toString() : (specimenCategories[0]?.id?.toString() || '');
	});
	const [selectedExamIds, setSelectedExamIds] = useState<number[]>(
		editingSpecimen ? editingSpecimen.selectedExamIds : [],
	);
	const [examSearchQuery, setExamSearchQuery] = useState<string>('');
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Sheets for "+ Nuevo" actions
	const [isSpecimenTypeSheetOpen, setIsSpecimenTypeSheetOpen] =
		useState(false);
	const [isExaminationSheetOpen, setIsExaminationSheetOpen] = useState(false);
	const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);

	// Filter examinations for currently selected specimen type
	const availableExamsForType = useMemo(() => {
		if (!specimenType) {
			return [];
		}

		return examinations.filter(
			(e) => e.specimen_type?.toString() === specimenType,
		);
	}, [examinations, specimenType]);

	const generateTemporarySpecimenCode = () => {
		const bytes = new Uint8Array(4);
		crypto.getRandomValues(bytes);
		const hex = Array.from(bytes, (b) =>
			b.toString(16).padStart(2, '0'),
		).join('');

		return `temp_${hex}`;
	};

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const formErrors: Record<string, string> = {};

		if (!specimenType) {
			formErrors.specimen_type = 'Seleccione el tipo de muestra.';
		}

		if (!specimenCategory) {
			formErrors.specimen_category = 'Seleccione la categoría de tiempo.';
		}

		if (selectedExamIds.length === 0) {
			formErrors.examinations =
				'Seleccione al menos un examen o análisis.';
		}

		if (Object.keys(formErrors).length > 0) {
			setErrors(formErrors);

			return;
		}

		const typeObj = specimenTypes.find(
			(t) => t.id.toString() === specimenType,
		);
		const catObj = specimenCategories.find(
			(c) => c.id.toString() === specimenCategory,
		);

		const specimenCode =
			editingSpecimen?.specimen || generateTemporarySpecimenCode();

		const savedItems: FormQuoteSpecimen[] = selectedExamIds.map(
			(examId) => {
				const existing = editingSpecimen?.items?.find(
					(i) => i.examination_id === examId,
				);
				const examObj = examinations.find((e) => e.id === examId);
				const prices = examObj?.prices || [];
				const sortedPrices = [...prices].sort(
					(a: any, b: any) =>
						parseFloat(b.amount) - parseFloat(a.amount),
				);
				const defaultPrice =
					sortedPrices.length > 0
						? sortedPrices[0].amount.toString()
						: '0';

				if (existing) {
					return {
						...existing,
						specimen: specimenCode,
						specimen_type: parseInt(specimenType),
						specimen_type_name: typeObj?.name || 'Muestra',
						specimen_category: parseInt(specimenCategory),
						specimen_category_name: catObj?.name || 'Categoría',
						examination_name:
							examObj?.name ||
							existing.examination_name ||
							'Examen',
						available_prices:
							sortedPrices.length > 0
								? sortedPrices
								: existing.available_prices || [],
					};
				}

				return {
					client_id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
					specimen: specimenCode,
					specimen_type: parseInt(specimenType),
					specimen_type_name: typeObj?.name || 'Muestra',
					specimen_category: parseInt(specimenCategory),
					specimen_category_name: catObj?.name || 'Categoría',
					examination_id: examId,
					examination_name: examObj?.name || 'Examen',
					quantity: 1,
					selected_price: defaultPrice,
					custom_specimen_price: 0,
					additional_discount_enabled: false,
					additional_discount: 0,
					age_discout_type: null,
					available_prices: sortedPrices,
				};
			},
		);

		setIsDirty?.(true);
		onSave(savedItems, specimenCode);
	};

	const filteredSearchedExams = useMemo(() => {
		if (!examSearchQuery) {
			return availableExamsForType;
		}

		return availableExamsForType.filter((exam) =>
			exam.name.toLowerCase().includes(examSearchQuery.toLowerCase()),
		);
	}, [availableExamsForType, examSearchQuery]);

	return (
		<>
			<form
				onSubmit={handleFormSubmit}
				className="flex flex-1 flex-col justify-between space-y-5 px-5 py-5 pb-8"
			>
				<div className="space-y-5">
					{/* Tipo de Muestra & Análisis / Examen(es) */}
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						{/* Tipo de Muestra */}
						<div className="grid gap-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="nested_specimen_type">
									Tipo de Muestra
								</Label>
								<button
									type="button"
									onClick={() =>
										setIsSpecimenTypeSheetOpen(true)
									}
									className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
								>
									<Plus className="h-3.5 w-3.5" /> Nuevo
								</button>
							</div>
							<Popover modal={true}>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										role="combobox"
										className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
									>
										<div className="flex items-center gap-2 truncate">
											<Microscope className="h-4 w-4 text-muted-foreground" />
											<span className="truncate">
												{specimenTypes.find(
													(t) =>
														t.id.toString() ===
														specimenType,
												)?.name || 'Seleccionar tipo'}
											</span>
										</div>
										<ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent
									className="z-[9999] w-[--radix-popover-trigger-width] p-0"
									align="start"
								>
									<Command>
										<CommandInput placeholder="Buscar tipo de muestra..." />
										<CommandList>
											<CommandEmpty>
												No se encontraron resultados.
											</CommandEmpty>
											<CommandGroup>
												{specimenTypes.map((t) => (
													<CommandItem
														key={t.id}
														value={t.name}
														onSelect={() => {
															setSpecimenType(
																t.id.toString(),
															);
															setSelectedExamIds(
																[],
															);
															setErrors(
																(prev) => ({
																	...prev,
																	specimen_type:
																		'',
																}),
															);
														}}
													>
														<Check
															className={cn(
																'mr-2 h-4 w-4',
																specimenType ===
																	t.id.toString()
																	? 'opacity-100'
																	: 'opacity-0',
															)}
														/>
														<span>{t.name}</span>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
							{errors.specimen_type && (
								<p className="text-xs text-destructive">
									{errors.specimen_type}
								</p>
							)}
						</div>

						{/* Análisis / Examen(es) */}
						<div className="grid gap-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="nested_examination">
									Análisis / Examen(es)
								</Label>
								<button
									type="button"
									onClick={() =>
										setIsExaminationSheetOpen(true)
									}
									disabled={!specimenType}
									className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
								>
									<Plus className="h-3.5 w-3.5" /> Nuevo
								</button>
							</div>
							<Popover
								modal={true}
								onOpenChange={(open) => {
									if (!open) {
										setExamSearchQuery('');
									}
								}}
							>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										disabled={!specimenType}
										className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50 disabled:opacity-50"
									>
										<div className="flex items-center gap-2 truncate">
											<FileText className="h-4 w-4 text-muted-foreground" />
											<span className="truncate">
												{selectedExamIds.length > 0
													? `Análisis (${selectedExamIds.length} seleccionados)`
													: specimenType
														? 'Seleccionar examen'
														: 'Primero seleccione tipo de muestra'}
											</span>
										</div>
										<ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent
									className="z-[9999] w-[--radix-popover-trigger-width] p-2"
									align="start"
								>
									<div className="space-y-1.5">
										<div className="relative px-1 py-1">
											<Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground/70" />
											<Input
												placeholder="Buscar análisis..."
												value={examSearchQuery}
												onChange={(e) =>
													setExamSearchQuery(
														e.target.value,
													)
												}
												className="h-9 w-full pr-3 pl-9 text-sm focus-visible:ring-1"
											/>
										</div>
										<div className="flex items-center justify-between border-b px-2 py-1 pb-1.5 text-xs text-muted-foreground">
											<span>Filtrar por análisis</span>
											<button
												type="button"
												onClick={() => {
													const visibleIds =
														filteredSearchedExams.map(
															(e) => e.id,
														);
													const areAll =
														visibleIds.length > 0 &&
														visibleIds.every((id) =>
															selectedExamIds.includes(
																id,
															),
														);
													const nextVal = areAll
														? selectedExamIds.filter(
															(id) =>
																!visibleIds.includes(
																	id,
																),
														)
														: [
															...new Set([
																...selectedExamIds,
																...visibleIds,
															]),
														];
													setSelectedExamIds(nextVal);
													setErrors((prev) => ({
														...prev,
														examinations: '',
													}));
												}}
												className="cursor-pointer font-medium transition-colors hover:text-primary"
											>
												{filteredSearchedExams.length >
													0 &&
													filteredSearchedExams.every(
														(e) =>
															selectedExamIds.includes(
																e.id,
															),
													)
													? 'Ninguno'
													: 'Todos'}
											</button>
										</div>
										<div className="max-h-60 space-y-1 overflow-y-auto pt-1">
											{filteredSearchedExams.length ===
												0 ? (
												<div className="py-6 text-center text-xs text-muted-foreground select-none">
													No se encontraron
													resultados.
												</div>
											) : (
												filteredSearchedExams.map(
													(exam) => {
														const isChecked =
															selectedExamIds.includes(
																exam.id,
															);

														return (
															<div
																key={exam.id}
																className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none hover:bg-accent hover:text-accent-foreground"
																onClick={() => {
																	setSelectedExamIds(
																		(
																			prev,
																		) =>
																			prev.includes(
																				exam.id,
																			)
																				? prev.filter(
																					(
																						id,
																					) =>
																						id !==
																						exam.id,
																				)
																				: [
																					...prev,
																					exam.id,
																				],
																	);

																	setErrors(
																		(
																			prev,
																		) => ({
																			...prev,
																			examinations:
																				'',
																		}),
																	);
																}}
															>
																<Checkbox
																	checked={
																		isChecked
																	}
																	className="pointer-events-none"
																	onCheckedChange={() => { }}
																/>
																<span className="truncate">
																	{exam.name}
																</span>
															</div>
														);
													},
												)
											)}
										</div>
									</div>
								</PopoverContent>
							</Popover>
							{errors.examinations && (
								<p className="text-xs text-destructive">
									{errors.examinations}
								</p>
							)}
						</div>
					</div>

					{/* Categoría (Tiempo) */}
					<div className="grid gap-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="nested_category">
								Categoría (Tiempo)
							</Label>
							<button
								type="button"
								onClick={() => setIsCategorySheetOpen(true)}
								className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
							>
								<Plus className="h-3.5 w-3.5" /> Nuevo
							</button>
						</div>
						<FormCombobox
							placeholder="Seleccionar categoría"
							value={specimenCategory}
							onChange={(v) => {
								setSpecimenCategory(v);
								setErrors((prev) => ({
									...prev,
									specimen_category: '',
								}));
							}}
							options={specimenCategories.map((c) => ({
								label: c.name,
								value: c.id.toString(),
							}))}
						/>
						{errors.specimen_category && (
							<p className="text-xs text-destructive">
								{errors.specimen_category}
							</p>
						)}
					</div>
				</div>

				{/* Form Action Buttons */}
				<div className="flex items-center justify-end gap-2 border-t pt-4">
					{onCancel && (
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							className="text-xs"
						>
							Cancelar
						</Button>
					)}
					<Button type="submit" className="gap-1.5 text-xs font-bold">
						<Check className="h-4 w-4" />
						<span>
							{editingSpecimen
								? 'Guardar Cambios'
								: 'Agregar Muestra'}
						</span>
					</Button>
				</div>
			</form>

			{/* Sheets for "+ Nuevo" actions */}
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
						onSuccess={() => setIsSpecimenTypeSheetOpen(false)}
					/>
				</SheetContent>
			</Sheet>

			<SpecimenTypeExaminationSheet
				examination={null}
				specimenTypes={specimenTypes}
				open={isExaminationSheetOpen}
				onOpenChange={setIsExaminationSheetOpen}
				defaultSpecimenTypeId={specimenType || undefined}
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
		</>
	);
}
