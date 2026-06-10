import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import debounce from 'lodash/debounce';
import {
	Search,
	Receipt,
	Plus,
	FileText,
	ExternalLink,
	Edit,
	Tag,
	Check,
	ChevronsUpDown,
	ChevronUp,
	ChevronDown,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import * as React from 'react';
import { index as rentalsIndex } from '@/actions/App/Http/Controllers/RentalController';
import { DateRangePicker } from '@/components/date-range-picker';
import { Pagination } from '@/components/pagination';
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import RentalPaymentSheet from './rental-payment-sheet';
import RentalSheet from './rental-sheet';

interface Invoice {
	id: number;
	full_invoice_number: string;
	total: string | number;
	invoice_file: string;
	created_at: string;
	customer?: { id: number; name: string } | null;
}

interface Rental {
	id: number;
	name: string;
	description: string;
	created_at: string;
	invoices?: Invoice[];
}

interface Props {
	rentals: {
		data: Rental[];
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
		customer_id?: string;
		date_from?: string;
		date_to?: string;
		sort_field?: string;
		sort_direction?: 'asc' | 'desc';
	};
	customers: {
		id: number;
		name: string;
		id_number: string;
	}[];
	banks: {
		id: number;
		name: string;
	}[];
	allRentals: Rental[];
}

export default function RentalsIndex({
	rentals,
	filters,
	customers,
	banks,
	allRentals = [],
}: Props) {
	const { props } = usePage() as any;
	const flash = props.flash || {};

	const [isRentalSheetOpen, setIsRentalSheetOpen] = useState(false);
	const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
	const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
	const [search, setSearch] = useState(filters.search || '');
	const [isCustomerFilterOpen, setIsCustomerFilterOpen] = useState(false);

	const [showInvoiceModal, setShowInvoiceModal] = useState(false);
	const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

	const containerRef = useRef<HTMLDivElement>(null);
	const [showLeftShadow, setShowLeftShadow] = useState(false);
	const [showRightShadow, setShowRightShadow] = useState(false);

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
	}, [rentals.data]);

	// Watch flash for new invoice generation
	useEffect(() => {
		if (flash.new_invoice_url) {
			setInvoiceUrl(flash.new_invoice_url);
			setShowInvoiceModal(true);
		}
	}, [flash.new_invoice_url]);

	const handleFilterChange = (key: string, value: string) => {
		const newFilters = { ...filters, [key]: value };

		if (value === '') {
			delete newFilters[key as keyof typeof filters];
		}

		router.get(rentalsIndex().url, newFilters, {
			preserveState: true,
			replace: true,
		});
	};

	const debouncedSearch = useMemo(
		() =>
			debounce((value: string) => {
				handleFilterChange('search', value);
			}, 300),
		[filters],
	);

	useEffect(() => {
		if (search !== filters.search) {
			debouncedSearch(search);
		}
	}, [search, debouncedSearch]);

	// Sync local search state when filters.search changes from URL navigation
	useEffect(() => {
		setSearch(filters.search || '');
	}, [filters.search]);

	const handleSort = (field: string) => {
		const isCurrentField =
			filters.sort_field === field ||
			(field === 'date' && !filters.sort_field);
		const direction =
			isCurrentField && filters.sort_direction === 'asc' ? 'desc' : 'asc';

		const newFilters = {
			...filters,
			sort_field: field,
			sort_direction: direction as 'asc' | 'desc',
		};

		router.get(rentalsIndex().url, newFilters, {
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

	const handleCreateRental = () => {
		setSelectedRental(null);
		setIsRentalSheetOpen(true);
	};

	const handleEditRental = (rental: Rental) => {
		setSelectedRental(rental);
		setIsRentalSheetOpen(true);
	};

	const handlePayRental = (rental: Rental) => {
		setSelectedRental(rental);
		setIsPaymentSheetOpen(true);
	};

	const handleGeneralPay = () => {
		setSelectedRental(null);
		setIsPaymentSheetOpen(true);
	};

	return (
		<>
			<Head title="Gestión de Alquileres" />
			<div className="flex h-full flex-1 flex-col gap-4 p-4">
				{/* Header */}
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<div className="flex items-center gap-2">
							<Tag className="h-6 w-6 text-primary" />
							<h1 className="text-2xl font-bold tracking-tight">
								Gestión de Alquileres
							</h1>
						</div>
						<p className="text-muted-foreground">
							Cree y gestione elementos de alquiler, registre pagos fiscales y visualice los comprobantes generados.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							onClick={handleCreateRental}
							className="h-10 gap-2 border-primary text-primary hover:bg-primary/5"
						>
							<Plus className="h-4 w-4" />
							<span>Nuevo Alquiler</span>
						</Button>
						<Button onClick={handleGeneralPay} className="h-10 gap-2">
							<Receipt className="h-4 w-4" />
							<span>Registrar Pago</span>
						</Button>
					</div>
				</div>

				{/* Filters */}
				<div className="flex w-full flex-col gap-4">
					{/* Row 1: Search + Date Range */}
					<div className="flex flex-row items-end justify-stretch gap-3">
						<div className="relative w-full">
							<Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Buscar por nombre, descripción o N° factura..."
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
									router.get(rentalsIndex().url, newFilters, {
										preserveState: true,
										replace: true,
									});
								}}
							/>
						</div>
					</div>

					{/* Row 2: Customer filter */}
					<div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-3">
						<div className="flex w-full flex-col gap-1.5">
							<span className="text-xs font-semibold text-muted-foreground">
								Cliente
							</span>
							<Popover open={isCustomerFilterOpen} onOpenChange={setIsCustomerFilterOpen} modal={true}>
								<PopoverTrigger asChild className="w-full">
									<Button
										variant="outline"
										role="combobox"
										aria-expanded={isCustomerFilterOpen}
										className="w-full justify-between text-left font-normal"
									>
										<span className="truncate">
											{(filters.customer_id && filters.customer_id !== 'all')
												? customers.find((c) => c.id.toString() === filters.customer_id)?.name || 'Cliente seleccionado'
												: 'Todos los clientes'}
										</span>
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
									<Command>
										<CommandInput placeholder="Buscar cliente..." />
										<CommandList>
											<CommandEmpty>No se encontraron clientes.</CommandEmpty>
											<CommandGroup>
												<CommandItem
													value="todos"
													onSelect={() => {
														handleFilterChange('customer_id', 'all');
														setIsCustomerFilterOpen(false);
													}}
												>
													<Check
														className={cn(
															'mr-2 h-4 w-4',
															(!filters.customer_id || filters.customer_id === 'all') ? 'opacity-100' : 'opacity-0',
														)}
													/>
													Todos los clientes
												</CommandItem>
												{customers.map((c) => (
													<CommandItem
														key={c.id}
														value={c.name}
														onSelect={() => {
															handleFilterChange('customer_id', c.id.toString());
															setIsCustomerFilterOpen(false);
														}}
													>
														<Check
															className={cn(
																'mr-2 h-4 w-4',
																filters.customer_id === c.id.toString() ? 'opacity-100' : 'opacity-0',
															)}
														/>
														<span className="truncate">{c.name}</span>
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

				{/* Table */}
				<div ref={containerRef} className="rounded-md border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									className={`pointer-events-none z-10 w-[80px] min-w-[80px] border-r border-border bg-card after:top-0 after:right-[-8px] after:bottom-0 after:hidden after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent after:transition-opacity after:duration-200 md:sticky md:left-0 md:after:absolute dark:after:from-black/[0.2] ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}
								>
									ID
								</TableHead>
								<TableHead className="min-w-[200px] pl-5">
									{renderSortHeader('name', 'Nombre Alquiler')}
								</TableHead>
								<TableHead className="min-w-[250px]">
									{renderSortHeader('description', 'Descripción')}
								</TableHead>
								<TableHead className="min-w-[220px]">
									Facturas Asoc. / Recibos de Pago
								</TableHead>
								<TableHead className="min-w-[150px]">
									{renderSortHeader('date', 'Fecha Registro')}
								</TableHead>
								<TableHead
									className={`z-10 w-[160px] min-w-[160px] border-l border-border bg-card text-right before:top-0 before:bottom-0 before:left-[-8px] before:hidden before:w-[8px] before:bg-gradient-to-r before:from-transparent before:to-black/[0.06] before:transition-opacity before:duration-200 md:sticky md:right-0 md:before:absolute dark:before:to-black/[0.2] ${showRightShadow ? 'before:opacity-100' : 'before:opacity-0'}`}
								>
									Acciones
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rentals.data.length > 0 ? (
								rentals.data.map((rentalItem) => {
									const stickyBgClass = 'md:bg-card group-hover:bg-muted';

									return (
										<TableRow key={rentalItem.id} className="group">
											<TableCell
												className={`pointer-events-none z-10 w-[80px] min-w-[80px] border-r border-border bg-card transition-colors group-hover:bg-muted after:top-0 after:right-[-8px] after:bottom-0 after:hidden after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent after:transition-opacity after:duration-200 md:sticky md:left-0 md:after:absolute dark:after:from-black/[0.2] ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}
											>
												<span className="font-mono text-xs font-semibold">
													#{rentalItem.id}
												</span>
											</TableCell>
											<TableCell className="min-w-[200px] pl-5">
												<span className="font-medium text-foreground">
													{rentalItem.name}
												</span>
											</TableCell>
											<TableCell className="min-w-[250px] text-xs text-muted-foreground">
												{rentalItem.description ?? '-'}
											</TableCell>
											<TableCell className="min-w-[220px]">
												{rentalItem.invoices && rentalItem.invoices.length > 0 ? (
													<div className="flex flex-col gap-1 text-[11px]">
														{rentalItem.invoices.map((inv) => (
															<a
																key={inv.id}
																href={`/storage/${inv.invoice_file}`}
																target="_blank"
																rel="noopener noreferrer"
																className="flex items-center gap-1 hover:text-primary hover:underline font-mono"
															>
																<FileText className="h-3 w-3 shrink-0" />
																<span>{inv.full_invoice_number} (L. {parseFloat(String(inv.total)).toFixed(2)})</span>
															</a>
														))}
													</div>
												) : (
													<span className="text-xs text-muted-foreground italic">Sin pagos</span>
												)}
											</TableCell>
											<TableCell className="min-w-[150px] text-xs text-muted-foreground">
												{rentalItem.created_at
													? format(new Date(rentalItem.created_at), 'dd/MM/yyyy h:mm a', { locale: es })
													: 'N/A'}
											</TableCell>
											<TableCell
												className={`z-10 text-right md:sticky md:right-0 ${stickyBgClass} w-[160px] min-w-[160px] border-l border-border transition-colors before:top-0 before:bottom-0 before:left-[-8px] before:hidden before:w-[8px] before:bg-gradient-to-r before:from-transparent before:to-black/[0.06] before:transition-opacity before:duration-200 md:before:absolute dark:before:to-black/[0.2] ${showRightShadow ? 'before:opacity-100' : 'before:opacity-0'}`}
											>
												<div className="flex justify-end gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => handlePayRental(rentalItem)}
														className="h-8 gap-1.5 border-primary text-primary hover:bg-primary/5"
													>
														<Receipt className="h-3.5 w-3.5" />
														<span>Pagar</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEditRental(rentalItem)}
														title="Editar Alquiler"
													>
														<Edit className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									);
								})
							) : (
								<TableRow>
									<TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
										No se encontraron registros de alquileres.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				<Pagination
					links={rentals.links}
					meta={{
						from: rentals.from,
						to: rentals.to,
						total: rentals.total,
					}}
				/>
			</div>

			{/* Create/Edit Rental Sheet */}
			<RentalSheet
				rental={selectedRental}
				open={isRentalSheetOpen}
				onOpenChange={setIsRentalSheetOpen}
			/>

			{/* Register Rental Payment Sheet */}
			<RentalPaymentSheet
				rental={selectedRental}
				open={isPaymentSheetOpen}
				onOpenChange={setIsPaymentSheetOpen}
				customers={customers}
				banks={banks}
				rentals={allRentals}
			/>

			{/* PDF View Preview Dialog on payment success */}
			<AlertDialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
				<AlertDialogContent className="z-[100] w-full max-w-[700px]">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5 text-primary" />
							Factura de Alquiler Generada con Éxito
						</AlertDialogTitle>
						<AlertDialogDescription>
							El pago de alquiler ha sido registrado correctamente y la factura fiscal se generó en formato PDF. Puede visualizarla, imprimirla o descargarla a continuación.
						</AlertDialogDescription>
					</AlertDialogHeader>

					{invoiceUrl && (
						<div className="my-4 overflow-hidden rounded-lg border bg-muted">
							<iframe
								src={invoiceUrl}
								className="h-[400px] w-full border-none"
								title="Factura de Alquiler PDF"
							/>
						</div>
					)}

					<AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
						<Button
							variant="outline"
							onClick={() => {
								setShowInvoiceModal(false);
								setInvoiceUrl(null);
							}}
							className="sm:order-1"
						>
							Cerrar
						</Button>
						<Button
							onClick={() => {
								if (invoiceUrl) {
									window.open(invoiceUrl, '_blank');
								}
							}}
							className="sm:order-2"
						>
							<ExternalLink className="mr-2 h-4 w-4" /> Abrir en pestaña nueva
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
