import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import debounce from 'lodash/debounce';
import {
	Search,
	ChevronUp,
	ChevronDown,
	ChevronsUpDown,
	Check,
	Download,
	FileSpreadsheet,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as React from 'react';
import { index as cuttingsReportIndex } from '@/actions/App/Http/Controllers/Reports/CuttingsReportController';
import {
	DateRangePicker,
	setCookie,
	getLast2WeeksRange,
} from '@/components/date-range-picker';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import SpecimenViewSheet from '../../specimens/specimen-view-sheet';

interface CuttingReportItem {
	id: number;
	created_at: string | null;
	number_of_cuttings: number;
	cuttings_description: string;
	number_of_slides: number | null;
	status: string;
	comments: string | null;
	responsible: {
		id: number;
		name: string;
		role: {
			name: string;
		} | null;
	} | null;
	specimen: {
		id: number;
		sequence_code: string;
		type: {
			name: string;
		} | null;
		examination: {
			name: string;
		} | null;
	} | null;
	number_of_cassettes: number;
	cassettes_range: string;
	cassette_color: string;
	special_stains: string;
}

interface Props {
	cuttings: {
		data: CuttingReportItem[];
		links: {
			url: string | null;
			label: string;
			active: boolean;
		}[];
		current_page: number;
		last_page: number;
		total: number;
		from: number;
		to: number;
	};
	filters: {
		search?: string;
		responsible_id?: string;
		specimen_type_id?: string;
		examination_id?: string;
		date_from?: string;
		date_to?: string;
		sort_field?: string;
		sort_direction?: 'asc' | 'desc';
	};
	usersList: {
		id: number;
		name: string;
		role: {
			name: string;
		} | null;
	}[];
	specimenTypes: {
		id: number;
		name: string;
	}[];
	examinations: any[];
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
				className="w-[--radix-popover-trigger-width] p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder={`Buscar...`} />
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

export default function CuttingsReportIndex({
	cuttings,
	filters,
	usersList = [],
	specimenTypes = [],
	examinations = [],
}: Props) {
	const { props } = usePage() as any;
	const { auth } = props;

	const [search, setSearch] = useState(filters.search || '');
	const [selectedSpecimenForView, setSelectedSpecimenForView] = useState<
		any | null
	>(null);
	const [isSpecimenViewSheetOpen, setIsSpecimenViewSheetOpen] =
		useState(false);

	const [isResponsibleFilterOpen, setIsResponsibleFilterOpen] =
		useState(false);

	const containerRef = useRef<HTMLDivElement>(null);
	const [showLeftShadow, setShowLeftShadow] = useState(false);

	useEffect(() => {
		const container = containerRef.current;

		if (!container) {
			return;
		}

		const scrollContainer =
			container.querySelector('.relative.w-full.overflow-auto') ||
			container;

		const handleScroll = () => {
			const scrollLeft = scrollContainer.scrollLeft;

			setShowLeftShadow(scrollLeft > 2);
		};

		handleScroll();
		scrollContainer.addEventListener('scroll', handleScroll);
		window.addEventListener('resize', handleScroll);

		return () => {
			scrollContainer.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleScroll);
		};
	}, [cuttings.data]);
	const handleFilterChange = useCallback(
		(key: string, value: string) => {
			const newFilters = { ...filters, [key]: value };

			if (value === 'all' || value === '') {
				delete newFilters[key as keyof typeof filters];
			}

			const userId = auth?.user?.id;

			if (userId) {
				if (key === 'specimen_type_id') {
					setCookie(
						`specimen_type_filter_report_cuttings_user_${userId}`,
						value,
					);

					const examId = filters.examination_id || 'all';

					if (value !== 'all' && examId !== 'all') {
						const hasValidExam = examinations.some(
							(exam) =>
								exam.id.toString() === examId &&
								exam.specimen_type?.toString() === value,
						);

						if (!hasValidExam) {
							delete newFilters.examination_id;
						}
					} else if (value === 'all') {
						delete newFilters.examination_id;
					}
				}
			}

			router.get(cuttingsReportIndex().url, newFilters, {
				preserveState: true,
				replace: true,
			});
		},
		[filters, auth?.user?.id, examinations],
	);
	const handleExport = (format: 'csv' | 'xlsx') => {
		const queryParams = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				queryParams.append(key, String(value));
			}
		});
		queryParams.set('format', format);
		window.location.href = `/reports/cuttings/export?${queryParams.toString()}`;
	};

	const handleSort = (field: string) => {
		const isCurrentField =
			filters.sort_field === field ||
			(field === 'date' && !filters.sort_field);
		const direction =
			isCurrentField && filters.sort_direction === 'asc' ? 'desc' : 'asc';

		const newFilters = {
			...filters,
			sort_field: field,
			sort_direction: direction,
		};

		router.get(cuttingsReportIndex().url, newFilters, {
			preserveState: true,
			replace: true,
		});
	};

	const renderSortHeader = (field: string, label: string) => {
		const isSorted =
			filters.sort_field === field ||
			(field === 'date' && !filters.sort_field);
		const direction = isSorted ? filters.sort_direction || 'desc' : null;

		return (
			<button
				onClick={() => handleSort(field)}
				className="group/btn flex items-center gap-1.5 text-left font-semibold transition-colors hover:text-foreground"
			>
				<span>{label}</span>
				{direction === 'asc' ? (
					<ChevronUp className="h-4 w-4 shrink-0 text-primary" />
				) : direction === 'desc' ? (
					<ChevronDown className="h-4 w-4 shrink-0 text-primary" />
				) : (
					<ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover/btn:opacity-100" />
				)}
			</button>
		);
	};

	const debouncedSearch = useMemo(
		() =>
			debounce((value: string) => {
				handleFilterChange('search', value);
			}, 300),
		[handleFilterChange],
	);

	useEffect(() => {
		if (search !== filters.search) {
			debouncedSearch(search);
		}
	}, [search, filters.search, debouncedSearch]);

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'macroscopy':
				return (
					<Badge
						variant="outline"
						className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
					>
						Macroscopía
					</Badge>
				);
			case 'processing':
				return (
					<Badge
						variant="outline"
						className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
					>
						Procesamiento
					</Badge>
				);
			case 'delivered':
				return (
					<Badge
						variant="outline"
						className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
					>
						Entregado
					</Badge>
				);
			default:
				return (
					<Badge
						variant="outline"
						className="rounded-full px-2.5 py-0.5"
					>
						{status}
					</Badge>
				);
		}
	};

	const examinationOptions = useMemo(() => {
		const selectedSpecimenType = filters.specimen_type_id || 'all';

		const filtered =
			selectedSpecimenType === 'all'
				? examinations
				: examinations.filter(
					(exam) =>
						exam.specimen_type?.toString() ===
						selectedSpecimenType,
				);

		return [
			{ label: 'Todos los exámenes', value: 'all' },
			...filtered.map((exam) => ({
				label: exam.name,
				value: exam.id.toString(),
			})),
		];
	}, [examinations, filters.specimen_type_id]);

	const activeUserFilter = useMemo(() => {
		if (!filters.responsible_id || filters.responsible_id === 'all') {
			return null;
		}

		return usersList.find(
			(u) => u.id.toString() === filters.responsible_id,
		);
	}, [usersList, filters.responsible_id]);

	return (
		<>
			<Head title="Reporte: Hoja de Relación de Biopsias" />
			<div className="flex h-full flex-1 flex-col gap-4 p-4">
				{/* Header */}
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<div className="flex items-center gap-2">
							<FileSpreadsheet className="h-6 w-6 text-primary" />
							<h1 className="text-2xl font-bold tracking-tight">
								Reporte: Hoja de Relación de Biopsias (Cortes)
							</h1>
						</div>
						<p className="text-muted-foreground">
							Consulte y exporte la relación de cortes de biopsias
							detallada por casete, fecha, tipo de muestra y
							médico responsable.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							className="h-10 gap-2"
							onClick={() => {
								const userId = auth?.user?.id;

								if (userId) {
									const defaultRange = getLast2WeeksRange();
									setCookie(
										`date_filter_report_cuttings_user_${userId}`,
										JSON.stringify({
											range: '14_days',
											from: defaultRange.from,
											to: defaultRange.to,
										}),
									);
								}

								router.get(
									cuttingsReportIndex().url,
									{},
									{ preserveState: false },
								);
							}}
						>
							Limpiar filtros
						</Button>
						<Button
							variant="outline"
							className="h-10 gap-2"
							onClick={() => handleExport('xlsx')}
						>
							<Download className="h-4 w-4" />
							<span>Exportar a Excel</span>
						</Button>
					</div>
				</div>

				{/* Filters Area */}
				<div className="flex w-full flex-col gap-4">
					{/* Row 1: Search and Date Range */}
					<div className="flex flex-row items-end justify-stretch gap-3">
						<div className="relative w-full">
							<Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Buscar por código muestra, médico responsable o comentarios..."
								className="w-full pl-8"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<div className="flex w-full max-w-[320px] flex-col gap-1.5">
							<span className="text-xs font-semibold text-muted-foreground">
								Rango de Fechas
							</span>
							<DateRangePicker
								cookieKey={`date_filter_report_cuttings_user_${auth?.user?.id}`}
								value={{
									from: filters.date_from || '',
									to: filters.date_to || '',
								}}
								onChange={(range) => {
									const newFilters = { ...filters };

									if (range.from) {
										newFilters.date_from = range.from;
									} else {
										delete newFilters.date_from;
									}

									if (range.to) {
										newFilters.date_to = range.to;
									} else {
										delete newFilters.date_to;
									}

									router.get(
										cuttingsReportIndex().url,
										newFilters,
										{
											preserveState: true,
											replace: true,
										},
									);
								}}
							/>
						</div>
					</div>

					{/* Row 2: Advanced filters */}
					<div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-4">
						{/* Responsible User Filter */}
						<div className="flex w-full flex-col gap-1.5">
							<span className="text-xs font-semibold text-muted-foreground">
								Médico Responsable
							</span>
							<Popover
								open={isResponsibleFilterOpen}
								onOpenChange={setIsResponsibleFilterOpen}
							>
								<PopoverTrigger asChild className="w-full">
									<Button
										variant="outline"
										role="combobox"
										aria-expanded={isResponsibleFilterOpen}
										className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
									>
										<span className="truncate">
											{(filters.responsible_id ||
												'all') === 'all'
												? 'Todos los médicos'
												: activeUserFilter
													? `${activeUserFilter.name} (${activeUserFilter.role?.name || 'N/A'})`
													: 'Médico seleccionado'}
										</span>
										<ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent
									className="w-[--radix-popover-trigger-width] p-0"
									align="start"
								>
									<Command>
										<CommandInput placeholder="Buscar médico..." />
										<CommandList>
											<CommandEmpty>
												No se encontraron médicos.
											</CommandEmpty>
											<CommandGroup>
												<CommandItem
													value="todos"
													onSelect={() => {
														handleFilterChange(
															'responsible_id',
															'all',
														);
														setIsResponsibleFilterOpen(
															false,
														);
													}}
												>
													<Check
														className={cn(
															'mr-2 h-4 w-4',
															(filters.responsible_id ||
																'all') === 'all'
																? 'opacity-100'
																: 'opacity-0',
														)}
													/>
													Todos los médicos
												</CommandItem>
												{usersList.map((user) => (
													<CommandItem
														key={user.id}
														value={user.name}
														onSelect={() => {
															handleFilterChange(
																'responsible_id',
																user.id.toString(),
															);
															setIsResponsibleFilterOpen(
																false,
															);
														}}
													>
														<Check
															className={cn(
																'mr-2 h-4 w-4',
																filters.responsible_id ===
																	user.id.toString()
																	? 'opacity-100'
																	: 'opacity-0',
															)}
														/>
														<div className="flex flex-col">
															<span className="font-medium">
																{user.name}
															</span>
															<span className="text-xs text-muted-foreground">
																{user.role
																	?.name ||
																	'Sin Rol'}
															</span>
														</div>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</div>

						{/* Specimen Type */}
						<div className="flex w-full flex-col gap-1.5">
							<span className="text-xs font-semibold text-muted-foreground">
								Tipo de Muestra
							</span>
							<Select
								value={filters.specimen_type_id || 'all'}
								onValueChange={(val) =>
									handleFilterChange('specimen_type_id', val)
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Tipo de Muestra" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										Todos los tipos
									</SelectItem>
									{specimenTypes.map((type) => (
										<SelectItem
											key={type.id}
											value={type.id.toString()}
										>
											{type.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Examination */}
						<div className="flex w-full flex-col gap-1.5">
							<span className="text-xs font-semibold text-muted-foreground">
								Examen / Análisis
							</span>
							<FormCombobox
								options={examinationOptions}
								value={filters.examination_id || 'all'}
								onChange={(val) =>
									handleFilterChange('examination_id', val)
								}
								placeholder="Todos los exámenes"
							/>
						</div>
					</div>
				</div>

				{/* Info block for selected doctor */}
				{activeUserFilter && (
					<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
						<div className="flex flex-col gap-1">
							<span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
								Filtro de Médico Responsable Activo
							</span>
							<div className="flex flex-wrap items-baseline gap-x-4">
								<span className="text-sm font-semibold text-foreground">
									Nombre del Médico Responsable:{' '}
									<span className="font-normal text-muted-foreground">
										{activeUserFilter.name}
									</span>
								</span>
								<span className="text-sm font-semibold text-foreground">
									Rol:{' '}
									<span className="font-normal text-muted-foreground text-primary">
										{activeUserFilter.role?.name || 'N/A'}
									</span>
								</span>
							</div>
						</div>
					</div>
				)}

				{/* Table Container */}
				<div ref={containerRef} className="rounded-md border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									className={`pointer-events-none z-10 w-[200px] min-w-[200px] border-r border-border bg-card after:top-0 after:right-[-8px] after:bottom-0 after:hidden after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent after:transition-opacity after:duration-200 md:sticky md:left-0 md:after:absolute dark:after:from-black/[0.2] ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}
								>
									{renderSortHeader(
										'specimen_code',
										'Muestra / Fecha',
									)}
								</TableHead>
								<TableHead className="min-w-[200px] pl-5">
									<span>Tipo de Muestra-Análisis</span>
								</TableHead>
								<TableHead className="min-w-[100px] text-right">
									{renderSortHeader(
										'number_of_cuttings',
										'# Cortes',
									)}
								</TableHead>
								<TableHead className="min-w-[150px]">
									<span>Descripción Cortes</span>
								</TableHead>
								<TableHead className="min-w-[100px] text-right">
									<span># Casetes</span>
								</TableHead>
								<TableHead className="min-w-[200px]">
									<span>T. ESPECIALES (Señalar)</span>
								</TableHead>
								<TableHead className="min-w-[150px]">
									<span>Código de Casete</span>
								</TableHead>
								<TableHead className="min-w-[120px] text-right">
									{renderSortHeader(
										'number_of_slides',
										'Total Laminas',
									)}
								</TableHead>
								<TableHead className="min-w-[120px]">
									{renderSortHeader('status', 'Estado')}
								</TableHead>
								<TableHead className="min-w-[200px]">
									<span>Comentarios</span>
								</TableHead>
								<TableHead className="min-w-[180px]">
									{renderSortHeader(
										'responsible',
										'Responsables',
									)}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{cuttings.data.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={11}
										className="h-32 text-center text-muted-foreground"
									>
										No se encontraron registros que
										coincidan con los filtros.
									</TableCell>
								</TableRow>
							) : (
								cuttings.data.map((cutting) => {
									const specimenCode =
										cutting.specimen?.sequence_code ||
										'N/A';
									const specimenTypeExam = cutting.specimen
										? `${cutting.specimen.type?.name || 'N/A'} - ${cutting.specimen.examination?.name || 'N/A'}`
										: 'N/A';

									return (
										<TableRow
											key={cutting.id}
											className="group hover:bg-muted/50"
										>
											{/* Specimen Code and Date */}
											<TableCell
												className={`pointer-events-none z-10 w-[150px] min-w-[150px] border-r border-border bg-card transition-colors group-hover:bg-muted after:top-0 after:right-[-8px] after:bottom-0 after:hidden after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent after:transition-opacity after:duration-200 md:sticky md:left-0 md:after:absolute dark:after:from-black/[0.2] ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}
											>
												<div className="flex flex-col gap-0.5">
													{cutting.specimen ? (
														<button
															onClick={() => {
																setSelectedSpecimenForView(
																	cutting.specimen,
																);
																setIsSpecimenViewSheetOpen(
																	true,
																);
															}}
															className="text-left font-mono text-sm font-semibold text-primary hover:underline"
														>
															{specimenCode}
														</button>
													) : (
														<span className="font-mono text-sm text-muted-foreground">
															{specimenCode}
														</span>
													)}
													<div className="flex items-center gap-1 text-[10px] text-muted-foreground">
														<span>
															{cutting.created_at
																? format(
																	new Date(
																		cutting.created_at,
																	),
																	'dd/MM/yyyy',
																	{
																		locale: es,
																	},
																)
																: 'N/A'}
														</span>
													</div>
												</div>
											</TableCell>

											{/* Specimen Type-Exam */}
											<TableCell className="min-w-[200px] pl-5">
												<span className="font-medium text-foreground">
													{specimenTypeExam}
												</span>
											</TableCell>

											{/* Number of Cuttings */}
											<TableCell className="min-w-[100px] text-right font-mono font-medium">
												{cutting.number_of_cuttings}
											</TableCell>

											{/* Description Cuttings */}
											<TableCell className="min-w-[150px]">
												{cutting.cuttings_description || (
													<span className="text-xs text-muted-foreground italic">
														N/A
													</span>
												)}
											</TableCell>

											{/* Number of Cassettes */}
											<TableCell className="min-w-[100px] text-right font-mono font-semibold text-muted-foreground">
												{cutting.number_of_cassettes}
											</TableCell>

											{/* Special slide stains */}
											<TableCell className="min-w-[200px]">
												{cutting.special_stains ? (
													<span className="font-medium text-indigo-600 dark:text-indigo-400">
														{cutting.special_stains}
													</span>
												) : (
													<span className="text-xs text-muted-foreground italic">
														Ninguna
													</span>
												)}
											</TableCell>

											{/* Range of Cassettes */}
											<TableCell className="min-w-[150px] font-mono">
												<span
													className="inline-flex items-center justify-center rounded border border-slate-300/30 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm"
													style={{
														backgroundColor: cutting.cassette_color || '#e2e8f0',
													}}
												>
													{cutting.cassettes_range}
												</span>
											</TableCell>

											{/* Total Slides */}
											<TableCell className="min-w-[120px] text-right font-mono font-medium">
												{cutting.number_of_slides ?? 0}
											</TableCell>

											{/* Status Badge */}
											<TableCell className="min-w-[120px]">
												{getStatusBadge(cutting.status)}
											</TableCell>

											{/* Comments */}
											<TableCell className="min-w-[200px] text-xs">
												{cutting.comments || (
													<span className="text-muted-foreground italic">
														N/A
													</span>
												)}
											</TableCell>

											{/* Responsible doctor name */}
											<TableCell className="min-w-[180px]">
												{cutting.responsible ? (
													<div className="flex flex-col">
														<span className="font-medium text-foreground">
															{
																cutting
																	.responsible
																	.name
															}
														</span>
														<span className="text-[10px] text-muted-foreground">
															{cutting.responsible
																.role?.name ||
																'Sin Rol'}
														</span>
													</div>
												) : (
													<span className="text-xs text-muted-foreground italic">
														N/A
													</span>
												)}
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				<Pagination
					links={cuttings.links}
					meta={{
						from: cuttings.from,
						to: cuttings.to,
						total: cuttings.total,
					}}
				/>
			</div>

			{/* Specimen View Sheet */}
			{selectedSpecimenForView && (
				<SpecimenViewSheet
					specimen={selectedSpecimenForView}
					open={isSpecimenViewSheetOpen}
					onOpenChange={setIsSpecimenViewSheetOpen}
				/>
			)}
		</>
	);
}
