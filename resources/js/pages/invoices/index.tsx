import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import debounce from 'lodash/debounce';
import { Eye, Edit, Search, Receipt, CreditCard, ChevronUp, ChevronDown, ChevronsUpDown, Check, Download, Plus, Layers, FileImage, FileText, ExternalLink, Clock, User, Tag, AlertCircle, Coins, Microscope } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import * as React from 'react';
import { index as invoicesIndex } from '@/actions/App/Http/Controllers/InvoiceController';
import { usePage } from '@inertiajs/react';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/date-range-picker';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import InvoiceViewSheet from './invoice-view-sheet';
import InvoiceSheet from './invoice-sheet';
import SpecimenSheet from '../specimens/specimen-sheet';
import SpecimenViewSheet from '../specimens/specimen-view-sheet';
import SpecimenGroupViewSheet from '../specimens/specimen-group-view-sheet';
import SpecimenGroupSheet from '../specimens/specimen-group-sheet';
import HeadingSheet from '@/components/heading-sheet';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface Invoice {
	id: number;
	full_invoice_number: string;
	invoice_number: number;
	cai_range_id: number;
	cai_range: any;
	customer_id: number;
	customer: any;
	specimen_id: number;
	specimen: any;
	payment_type: 'cash' | 'card' | 'credit card' | 'transfer' | 'bank transfer' | 'credit' | 'check';
	credit_payment_id: number | null;
	credit_relation: any;
	amount: string | number;
	discount: string | number;
	subtotal: string | number;
	exempt_amount: string | number;
	total: string | number;
	total_paid: string | number;
	proof_of_payment: string | null;
	invoice_file: string | null;
	created_at: string;
	group?: any;
}

interface Props {
	invoices: {
		data: Invoice[];
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
		payment_type?: string;
		customer_id?: string;
		specimen_type_id?: string;
		has_credit?: string;
		date_from?: string;
		date_to?: string;
		sort_field?: string;
		sort_direction?: 'asc' | 'desc';
		group_id?: string;
	};
	customers: {
		id: number;
		name: string;
		id_number: string;
	}[];
	specimenTypes: {
		id: number;
		name: string;
	}[];
	banks: {
		id: number;
		name: string;
	}[];
	examinations: any[];
	groups?: {
		id: number;
		name: string;
	}[];
	categories: any[];
	referrers: any[];
	referrerTypes: any[];
	priorities: any[];
	locations: any[];
	sequences: any[];
	activeLocationId: number | null;
	products: any[];
}

function FormCombobox({
	options,
	value,
	onChange,
	placeholder,
	emptyMessage = 'No se encontraron resultados.',
	disabled = false
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
			<PopoverTrigger asChild className='w-full'>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between font-normal text-left"
					disabled={disabled}
				>
					<span className="truncate">
						{selectedOption ? selectedOption.label : placeholder}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
											"mr-2 h-4 w-4 shrink-0",
											value === option.value ? "opacity-100" : "opacity-0"
										)}
									/>
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

export default function InvoicesIndex({ invoices, filters, customers, specimenTypes, banks, examinations, categories, referrers, referrerTypes, priorities, locations, sequences, activeLocationId, products, groups }: Props) {
	const { props } = usePage() as any;
	const flash = props.flash || {};

	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
	const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
	const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
	const [search, setSearch] = useState(filters.search || '');

	const [isSpecimenSheetOpen, setIsSpecimenSheetOpen] = useState(false);
	const [selectedSpecimen, setSelectedSpecimen] = useState<any | null>(null);
	const [selectedSpecimenForView, setSelectedSpecimenForView] = useState<any | null>(null);
	const [isSpecimenViewSheetOpen, setIsSpecimenViewSheetOpen] = useState(false);

	const [selectedGroupForView, setSelectedGroupForView] = useState<any | null>(null);
	const [isGroupViewSheetOpen, setIsGroupViewSheetOpen] = useState(false);
	const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
	const [isGroupSheetOpen, setIsGroupSheetOpen] = useState(false);

	useEffect(() => {
		if (flash.new_specimen_id) {
			const specId = parseInt(flash.new_specimen_id);
			const foundInvoice = invoices.data.find(inv => inv.specimen_id === specId);
			if (foundInvoice && foundInvoice.specimen) {
				const specimenWithInvoice = {
					...foundInvoice.specimen,
					invoice_relation: {
						...foundInvoice,
						specimen: undefined
					}
				};
				setIsSpecimenSheetOpen(false);
				setSelectedSpecimen(null);
				setSelectedSpecimenForView(specimenWithInvoice);
				setIsSpecimenViewSheetOpen(true);
			}
		}
	}, [flash.new_specimen_id, invoices.data]);

	const containerRef = useRef<HTMLDivElement>(null);
	const [showLeftShadow, setShowLeftShadow] = useState(false);
	const [showRightShadow, setShowRightShadow] = useState(false);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const scrollContainer = container.querySelector('.relative.w-full.overflow-auto') || container;

		const handleScroll = () => {
			const scrollLeft = scrollContainer.scrollLeft;
			const scrollWidth = scrollContainer.scrollWidth;
			const clientWidth = scrollContainer.clientWidth;

			setShowLeftShadow(scrollLeft > 2);
			setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 2);
		};

		handleScroll();

		scrollContainer.addEventListener('scroll', handleScroll);
		window.addEventListener('resize', handleScroll);

		return () => {
			scrollContainer.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleScroll);
		};
	}, [invoices.data]);

	const handleFilterChange = (key: string, value: string) => {
		const newFilters = { ...filters, [key]: value };

		if (value === 'all' || value === '') {
			delete newFilters[key as keyof typeof filters];
		}

		router.get(invoicesIndex().url, newFilters, {
			preserveState: true,
			replace: true,
		});
	};

	const handleExport = (format: 'csv' | 'xlsx') => {
		const queryParams = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				queryParams.append(key, String(value));
			}
		});
		queryParams.set('format', format);
		window.location.href = `/invoices/export?${queryParams.toString()}`;
	};

	const handleSort = (field: string) => {
		const isCurrentField = filters.sort_field === field || (field === 'date' && !filters.sort_field);
		const direction = isCurrentField && filters.sort_direction === 'asc' ? 'desc' : 'asc';

		const newFilters = {
			...filters,
			sort_field: field,
			sort_direction: direction
		};

		router.get(invoicesIndex().url, newFilters, {
			preserveState: true,
			replace: true,
		});
	};

	const renderSortHeader = (field: string, label: string) => {
		const isSorted = filters.sort_field === field || (field === 'date' && !filters.sort_field);
		const direction = isSorted ? (filters.sort_direction || 'desc') : null;

		return (
			<button
				onClick={() => handleSort(field)}
				className="flex items-center gap-1.5 hover:text-foreground transition-colors group/btn font-semibold text-left"
			>
				<span>{label}</span>
				{direction === 'asc' ? (
					<ChevronUp className="h-4 w-4 text-primary shrink-0" />
				) : direction === 'desc' ? (
					<ChevronDown className="h-4 w-4 text-primary shrink-0" />
				) : (
					<ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover/btn:opacity-100 transition-opacity shrink-0" />
				)}
			</button>
		);
	};

	const debouncedSearch = useCallback(
		debounce((value: string) => {
			handleFilterChange('search', value);
		}, 300),
		[filters]
	);

	useEffect(() => {
		if (search !== filters.search) {
			debouncedSearch(search);
		}
	}, [search]);

	const handleViewDetails = (invoice: Invoice) => {
		setSelectedInvoice(invoice);
		setIsSheetOpen(true);
	};

	const handleEditDetails = (invoice: Invoice) => {
		setInvoiceToEdit(invoice);
		setIsEditSheetOpen(true);
	};

	const getPaymentTypeLabel = (type: string) => {
		const labels: Record<string, string> = {
			'cash': 'Efectivo',
			'card': 'Tarjeta de Crédito',
			'credit card': 'Tarjeta de Crédito',
			'transfer': 'Transferencia Bancaria',
			'bank transfer': 'Transferencia Bancaria',
			'check': 'Cheque',
			'credit': 'Crédito'
		};

		return labels[type] || type;
	};

	const getPaymentBadge = (type: string) => {
		switch (type) {
			case 'cash':
				return (
					<Badge variant="outline" className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 px-2.5 py-0.5">
						Efectivo
					</Badge>
				);
			case 'card':
			case 'credit card':
				return (
					<Badge variant="outline" className="rounded-full bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50 px-2.5 py-0.5">
						Tarjeta de Crédito
					</Badge>
				);
			case 'transfer':
			case 'bank transfer':
				return (
					<Badge variant="outline" className="rounded-full bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50 px-2.5 py-0.5">
						Transferencia Bancaria
					</Badge>
				);
			case 'check':
				return (
					<Badge variant="outline" className="rounded-full bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 px-2.5 py-0.5">
						Cheque
					</Badge>
				);
			case 'credit':
				return (
					<Badge variant="outline" className="rounded-full bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50 px-2.5 py-0.5">
						Crédito
					</Badge>
				);
			default:
				return (
					<Badge variant="outline" className="rounded-full px-2.5 py-0.5">
						{type}
					</Badge>
				);
		}
	};


	return (
		<>
			<Head title="Facturas de Muestras" />
			<div className="flex h-full flex-1 flex-col gap-4 p-4">
				{/* Header */}
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<div className="flex items-center gap-2">
							<Receipt className="h-6 w-6 text-primary" />
							<h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
						</div>
						<p className="text-muted-foreground">Administre y consulte las facturas fiscales y transacciones emitidas en el laboratorio.</p>
					</div>
					<div className="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" className="h-10 gap-2">
									<Download className="h-4 w-4" />
									<span>Exportar</span>
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-40">
								<DropdownMenuItem onClick={() => handleExport('csv')}>
									Exportar a CSV
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => handleExport('xlsx')}>
									Exportar a Excel
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button className="h-10 gap-2">
									<Plus className="h-4 w-4" />
									<span>Nueva Muestra</span>
									<ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuItem onClick={() => {
									setSelectedSpecimen(null);
									setIsSpecimenSheetOpen(true);
								}}>
									<Microscope className="mr-2 h-4 w-4 text-muted-foreground" />
									<span>Muestra Individual</span>
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setIsGroupSheetOpen(true)}>
									<Layers className="mr-2 h-4 w-4 text-muted-foreground" />
									<span>Grupo de Muestras</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				{/* Filters Area - Search on Row 1, other filters on Row 2 */}
				<div className="flex flex-col gap-4 w-full">
					{/* Row 1: Search */}
					<div className='flex flex-row justify-stretch items-end gap-3'>
						<div className="relative w-full">
							<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Buscar por Nº Factura, cliente, RTN o muestra..."
								className="pl-8 w-full"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1.5 w-full max-w-[320px]">
							<span className="text-xs font-semibold text-muted-foreground">Rango de Fechas</span>
							<DateRangePicker
								value={{
									from: filters.date_from || '',
									to: filters.date_to || ''
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
									router.get(invoicesIndex().url, newFilters, {
										preserveState: true,
										replace: true,
									});
								}}
							/>
						</div>
					</div>

					{/* Row 2: Advanced filters */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 items-end">
						<div className="flex flex-col gap-1.5 w-full">
							<span className="text-xs font-semibold text-muted-foreground">Método de Pago</span>
							<Select value={filters.payment_type || 'all'} onValueChange={(v) => handleFilterChange('payment_type', v)}>
								<SelectTrigger className='w-full'>
									<SelectValue placeholder="Método de Pago" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todos los métodos</SelectItem>
									<SelectItem value="cash">Efectivo</SelectItem>
									<SelectItem value="credit card">Tarjeta</SelectItem>
									<SelectItem value="bank transfer">Transferencia</SelectItem>
									<SelectItem value="check">Cheque</SelectItem>
									<SelectItem value="credit">Crédito</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5 w-full">
							<span className="text-xs font-semibold text-muted-foreground">Cliente</span>
							<FormCombobox
								placeholder="Todos los clientes"
								value={filters.customer_id || 'all'}
								onChange={(v) => handleFilterChange('customer_id', v)}
								options={[
									{ label: 'Todos los clientes', value: 'all' },
									...customers.map((c) => ({ label: c.name, value: c.id.toString() }))
								]}
							/>
						</div>
						<div className="flex flex-col gap-1.5 w-full">
							<span className="text-xs font-semibold text-muted-foreground">Tipo de Muestra</span>
							<Select value={filters.specimen_type_id || 'all'} onValueChange={(v) => handleFilterChange('specimen_type_id', v)}>
								<SelectTrigger className='w-full'>
									<SelectValue placeholder="Tipo de Muestra" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todos los tipos</SelectItem>
									{specimenTypes.map((st) => (
										<SelectItem key={st.id} value={st.id.toString()}>
											{st.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5 w-full">
							<span className="text-xs font-semibold text-muted-foreground font-medium">¿Tiene Crédito?</span>
							<Select value={filters.has_credit || 'all'} onValueChange={(v) => handleFilterChange('has_credit', v)}>
								<SelectTrigger className='w-full'>
									<SelectValue placeholder="Crédito" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todos</SelectItem>
									<SelectItem value="yes">Con Crédito</SelectItem>
									<SelectItem value="no">Sin Crédito</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5 w-full">
							<span className="text-xs font-semibold text-muted-foreground">Grupo</span>
							<Popover open={isGroupFilterOpen} onOpenChange={setIsGroupFilterOpen}>
								<PopoverTrigger asChild className='w-full'>
									<Button
										variant="outline"
										role="combobox"
										aria-expanded={isGroupFilterOpen}
										className="h-10 gap-2 border bg-card hover:bg-accent/50 transition-colors justify-between w-full"
									>
										<div className="flex items-center gap-2 truncate">
											<Layers className="h-4 w-4 text-muted-foreground shrink-0" />
											<span className="truncate">
												{(filters.group_id || 'all') === 'all'
													? 'Todos los grupos'
													: groups?.find(g => g.id.toString() === filters.group_id)?.name || 'Grupo seleccionado'}
											</span>
										</div>
										<ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
									<Command>
										<CommandInput placeholder="Buscar grupo..." />
										<CommandList>
											<CommandEmpty>No se encontraron grupos.</CommandEmpty>
											<CommandGroup>
												<CommandItem
													value="todos"
													onSelect={() => {
														handleFilterChange('group_id', 'all');
														setIsGroupFilterOpen(false);
													}}
												>
													<Check
														className={cn(
															"mr-2 h-4 w-4",
															(filters.group_id || 'all') === 'all' ? "opacity-100" : "opacity-0"
														)}
													/>
													Todos los grupos
												</CommandItem>
												{groups?.map((group) => (
													<CommandItem
														key={group.id}
														value={group.name}
														onSelect={() => {
															handleFilterChange('group_id', group.id.toString());
															setIsGroupFilterOpen(false);
														}}
													>
														<Check
															className={cn(
																"mr-2 h-4 w-4",
																filters.group_id === group.id.toString() ? "opacity-100" : "opacity-0"
															)}
														/>
														{group.name}
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</div>
					</div>
				</div>

				{/* Table - Consistent with customer layout */}
				<div ref={containerRef} className="rounded-md border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className={`min-w-[150px] md:sticky md:left-0 z-10 bg-card border-r border-border w-[150px] after:hidden md:after:absolute after:right-[-8px] after:top-0 after:bottom-0 after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent dark:after:from-black/[0.2] pointer-events-none after:transition-opacity after:duration-200 ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}>
									{renderSortHeader('date', 'Número / Fecha')}
								</TableHead>
								<TableHead className="min-w-[200px] pl-5">
									{renderSortHeader('customer', 'Cliente')}
								</TableHead>
								<TableHead className="min-w-[150px]">
									{renderSortHeader('payment_method', 'Método')}
								</TableHead>
								<TableHead className="min-w-[220px]">
									{renderSortHeader('specimen_code', 'Muestra / Cód. Muestra')}
								</TableHead>
								<TableHead className="min-w-[180px]">
									{renderSortHeader('credit', 'Crédito')}
								</TableHead>
								<TableHead className="text-right min-w-[120px] pr-6">
									<div className="flex justify-end">
										{renderSortHeader('total', 'Total Factura')}
									</div>
								</TableHead>
								<TableHead className={`text-right md:sticky md:right-[80px] z-10 bg-card border-l border-border min-w-[110px] w-[110px] before:hidden md:before:absolute before:left-[-8px] before:top-0 before:bottom-0 before:w-[8px] before:bg-gradient-to-r before:from-transparent before:to-black/[0.06] dark:before:to-black/[0.2] pointer-events-none before:transition-opacity before:duration-200 ${showRightShadow ? 'before:opacity-100' : 'before:opacity-0'}`}>
									<div className="flex justify-end">
										{renderSortHeader('total_paid', 'Total Pagado')}
									</div>
								</TableHead>
								<TableHead className="text-right md:sticky md:right-0 z-10 bg-card min-w-[80px] w-[80px]">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{invoices.data.length > 0 ? (
								invoices.data.map((invoice) => (
									<TableRow key={invoice.id} className="group">
										<TableCell className={`min-w-[150px] md:sticky md:left-0 z-10 bg-card group-hover:bg-muted transition-colors border-r border-border w-[150px] after:hidden md:after:absolute after:right-[-8px] after:top-0 after:bottom-0 after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent dark:after:from-black/[0.2] pointer-events-none after:transition-opacity after:duration-200 ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}>
											<div className="flex flex-col gap-0.5">
												<span className="font-mono text-sm font-semibold text-foreground">{invoice.full_invoice_number}</span>
												<div className="flex items-center gap-1 text-[10px] text-muted-foreground">
													<span>
														{invoice.created_at
															? format(new Date(invoice.created_at), 'dd/MM/yyyy', { locale: es })
															: 'N/A'
														}
													</span>
													<span className="text-[9px] text-muted-foreground/80 font-mono before:content-['•'] before:mr-1">
														{invoice.created_at
															? format(new Date(invoice.created_at), 'HH:mm a', { locale: es })
															: 'N/A'
														}
													</span>
												</div>
											</div>
										</TableCell>
										<TableCell className="min-w-[200px] pl-5">
											<div className="flex flex-col">
												<div className="flex items-center gap-1.5">
													<span className="font-medium text-foreground">{invoice.customer?.name || 'N/A'}</span>
												</div>
												{invoice.customer?.id_number && (
													<span className="text-xs text-muted-foreground font-mono">{invoice.customer.id_number}</span>
												)}
											</div>
										</TableCell>
										<TableCell className="min-w-[150px]">
											{getPaymentBadge(invoice.payment_type)}
										</TableCell>
										<TableCell className="min-w-[220px]">
											{invoice.group ? (
												<div className="flex flex-col gap-1 text-xs max-w-[220px]">
													<div className="flex items-center gap-1.5">
														<span className="font-semibold text-purple-600 dark:text-purple-300 text-[10px] bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 px-1.5 py-0.5 rounded w-max">
															{invoice.group.name}
														</span>
														<Button
															variant="ghost"
															size="icon"
															className="h-5 w-5 hover:bg-muted"
															onClick={() => {
																setSelectedGroupForView({
																	...invoice.group,
																	invoice: invoice
																});
																setIsGroupViewSheetOpen(true);
															}}
															title="Ver Grupo de Muestras"
														>
															<Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
														</Button>
													</div>
													<span className="text-muted-foreground text-[10px]">
														Muestra Agrupada ({invoice.group.specimens?.length || 0} muestras)
													</span>
												</div>
											) : invoice.specimen ? (
												<div className="flex flex-col gap-1 text-xs max-w-[220px]">
													{invoice.specimen.sequence_code && (
														<div className="flex items-center gap-1.5">
															<span className="font-mono font-semibold text-primary text-[10px] bg-primary/5 dark:bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded w-max">
																{invoice.specimen.sequence_code}
															</span>
															<Button
																variant="ghost"
																size="icon"
																className="h-5 w-5 hover:bg-muted"
																onClick={() => {
																	const specimenWithInvoice = {
																		...invoice.specimen,
																		invoice_relation: {
																			...invoice,
																			specimen: undefined
																		}
																	};
																	setSelectedSpecimenForView(specimenWithInvoice);
																	setIsSpecimenViewSheetOpen(true);
																}}
																title="Ver Muestra"
															>
																<Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
															</Button>
														</div>
													)}
													<span className="text-muted-foreground text-[10px]" title={invoice.specimen.type?.name}>
														{invoice.specimen.type?.name} - {invoice.specimen.examination?.name}
													</span>
												</div>
											) : (
												<span className="text-xs text-muted-foreground italic">N/A</span>
											)}
										</TableCell>
										<TableCell className="min-w-[180px]">
											{invoice.credit_payment_id && invoice.credit_relation ? (() => {
												const credit = invoice.credit_relation;
												const paid = parseFloat(String(credit.amount_paid || 0));
												const creditAmount = parseFloat(String(credit.credit_amount || 0));
												const remaining = parseFloat(String(credit.amount_remaining || 0));
												const pct = creditAmount > 0 ? ((paid / creditAmount) * 100).toFixed(0) : '0';
 
												return (
													<div className="flex flex-col gap-1 text-xs min-w-[140px]">
														<div className="flex justify-between items-center text-[10px] text-muted-foreground">
															<span>Abonado: <strong className="text-foreground font-mono">L. {paid.toFixed(2)}</strong></span>
															<span className="font-bold text-primary font-mono">{pct}%</span>
														</div>
														<div className="w-full bg-muted rounded-full h-1.5 overflow-hidden border">
															<div
																className="bg-emerald-500 h-full rounded-full transition-all duration-300"
																style={{ width: `${Math.min(100, Math.max(0, parseFloat(pct)))}%` }}
															/>
														</div>
														<div className="flex justify-between items-center text-[10px] font-mono">
															<span className={`${remaining === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} font-semibold`}>Resta: L. {remaining.toFixed(2)}</span>
														</div>
														<div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground border-t pt-1.5 mt-0.5">
															<span className="font-mono">Crédito: {invoice.credit_payment_id}</span>
															<Button
																variant="ghost"
																size="icon"
																className="h-5 w-5 hover:bg-muted"
																onClick={() => router.get('/credits', { search: String(invoice.credit_payment_id || '') })}
																title="Ver Crédito"
															>
																<Eye className="h-3 w-3" />
															</Button>
														</div>
													</div>
												);
											})() : (
												''
											)}
										</TableCell>
										<TableCell className="text-right font-bold text-primary min-w-[120px] pr-6">
											L. {parseFloat(String(invoice.total)).toFixed(2)}
										</TableCell>
										<TableCell className={`text-right font-bold text-emerald-600 dark:text-emerald-400 md:sticky md:right-[80px] z-10 bg-card group-hover:bg-muted transition-colors border-l border-border min-w-[100px] w-[100px] before:hidden md:before:absolute before:left-[-8px] before:top-0 before:bottom-0 before:w-[8px] before:bg-gradient-to-r before:from-transparent before:to-black/[0.06] dark:before:to-black/[0.2] pointer-events-none before:transition-opacity before:duration-200 ${showRightShadow ? 'before:opacity-100' : 'before:opacity-0'}`}>
											L. {parseFloat(String(invoice.total_paid || 0)).toFixed(2)}
										</TableCell>
										<TableCell className="text-right md:sticky md:right-0 z-10 bg-card group-hover:bg-muted transition-colors min-w-[80px] w-[80px]">
											<div className="flex justify-end gap-2">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleViewDetails(invoice)}
													title="Ver Detalle de Factura"
												>
													<Eye className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleEditDetails(invoice)}
													title="Editar Factura"
												>
													<Edit className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
										No se encontraron facturas fiscales registradas.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				<Pagination
					links={invoices.links}
					meta={{
						from: invoices.from,
						to: invoices.to,
						total: invoices.total
					}}
				/>
			</div>

			{/* Premium Wide Viewer Sheet */}
			<InvoiceViewSheet
				invoice={selectedInvoice}
				open={isSheetOpen}
				onOpenChange={setIsSheetOpen}
			/>

			{/* Invoice Editor Sheet */}
			<InvoiceSheet
				invoice={invoiceToEdit}
				open={isEditSheetOpen}
				onOpenChange={setIsEditSheetOpen}
				customers={customers}
				banks={banks}
			/>

			{/* Specimen Sheets */}
			<SpecimenSheet
				specimen={selectedSpecimen}
				open={isSpecimenSheetOpen}
				onOpenChange={(open) => {
					setIsSpecimenSheetOpen(open);
					if (!open) setSelectedSpecimen(null);
				}}
				customers={customers}
				specimenTypes={specimenTypes}
				examinations={examinations}
				categories={categories}
				referrers={referrers}
				referrerTypes={referrerTypes}
				priorities={priorities}
				locations={locations}
				sequences={sequences}
				activeLocationId={activeLocationId}
				products={products}
				banks={banks}
			/>

			<SpecimenViewSheet
				specimen={selectedSpecimenForView}
				open={isSpecimenViewSheetOpen}
				onOpenChange={setIsSpecimenViewSheetOpen}
				onEditClick={() => {
					setSelectedSpecimen(selectedSpecimenForView);
					setIsSpecimenViewSheetOpen(false);
					setIsSpecimenSheetOpen(true);
				}}
			/>

			<SpecimenGroupViewSheet
				group={selectedGroupForView}
				open={isGroupViewSheetOpen}
				onOpenChange={setIsGroupViewSheetOpen}
			/>

			<SpecimenGroupSheet
				open={isGroupSheetOpen}
				onOpenChange={setIsGroupSheetOpen}
				customers={customers}
				specimenTypes={specimenTypes}
				examinations={examinations}
				categories={categories}
				referrers={referrers}
				referrerTypes={referrerTypes}
				priorities={priorities}
				locations={locations}
				sequences={sequences}
				activeLocationId={activeLocationId}
				products={products}
				banks={banks}
			/>
		</>
	);
}
// Removed local SpecimenGroupViewSheet definition to avoid duplication

