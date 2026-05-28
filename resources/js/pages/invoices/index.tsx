import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import debounce from 'lodash/debounce';
import { Eye, Search, Receipt, CreditCard } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { index as invoicesIndex } from '@/actions/App/Http/Controllers/InvoiceController';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import InvoiceViewSheet from './invoice-view-sheet';

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
	};
}

export default function InvoicesIndex({ invoices, filters }: Props) {
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
	const [search, setSearch] = useState(filters.search || '');

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
						<h1 className="text-2xl font-bold tracking-tight">Facturas</h1>
						<p className="text-muted-foreground">Administre y consulte las facturas fiscales y transacciones emitidas en el laboratorio.</p>
					</div>
				</div>

				{/* Filters Row - Identical structure & styling to customers section */}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
					<div className="relative md:col-span-2">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Buscar por Nº Factura, nombre de cliente o ID..."
							className="pl-8"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<Select value={filters.payment_type || 'all'} onValueChange={(v) => handleFilterChange('payment_type', v)}>
						<SelectTrigger>
							<SelectValue placeholder="Método de Pago" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todos los métodos</SelectItem>
							<SelectItem value="cash">Efectivo</SelectItem>
							<SelectItem value="card">Tarjeta</SelectItem>
							<SelectItem value="transfer">Transferencia</SelectItem>
							<SelectItem value="check">Cheque</SelectItem>
							<SelectItem value="credit">Crédito</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Table - Consistent with customer layout */}
				<div ref={containerRef} className="rounded-md border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className={`min-w-[150px] sticky left-0 z-10 bg-card border-r border-border w-[150px] after:absolute after:right-[-8px] after:top-0 after:bottom-0 after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent dark:after:from-black/[0.2] pointer-events-none after:transition-opacity after:duration-200 ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}>Número</TableHead>
								<TableHead className="min-w-[200px] pl-5">Cliente</TableHead>
								<TableHead className="min-w-[150px]">Método</TableHead>
								<TableHead className="min-w-[220px]">Muestra</TableHead>
								<TableHead className="min-w-[180px]">Crédito</TableHead>
								<TableHead className="text-right min-w-[120px] pr-6">Total Factura</TableHead>
								<TableHead className={`text-right sticky right-[80px] z-10 bg-card border-l border-border min-w-[110px] w-[110px] before:absolute before:left-[-8px] before:top-0 before:bottom-0 before:w-[8px] before:bg-gradient-to-r before:from-transparent before:to-black/[0.06] dark:before:to-black/[0.2] pointer-events-none before:transition-opacity before:duration-200 ${showRightShadow ? 'before:opacity-100' : 'before:opacity-0'}`}>Total Pagado</TableHead>
								<TableHead className="text-right sticky right-0 z-10 bg-card min-w-[80px] w-[80px]">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{invoices.data.length > 0 ? (
								invoices.data.map((invoice) => (
									<TableRow key={invoice.id} className="group">
										<TableCell className={`min-w-[150px] sticky left-0 z-10 bg-card group-hover:bg-muted/50 transition-colors border-r border-border w-[150px] after:absolute after:right-[-8px] after:top-0 after:bottom-0 after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent dark:after:from-black/[0.2] pointer-events-none after:transition-opacity after:duration-200 ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}>
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
											{invoice.specimen ? (
												<div className="flex flex-col gap-1 text-xs max-w-[220px]">
													{invoice.specimen.sequence_code && (
														<span className="font-mono font-semibold text-primary text-[10px] bg-primary/5 dark:bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded w-max">
															{invoice.specimen.sequence_code}
														</span>
													)}
													<span className="font-medium truncate" title={invoice.specimen.type?.name}>
														{invoice.specimen.type?.name}
													</span>
													<span className="text-muted-foreground truncate" title={invoice.specimen.examination?.name}>
														{invoice.specimen.examination?.name}
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
										<TableCell className={`text-right font-bold text-emerald-600 dark:text-emerald-400 sticky right-[80px] z-10 bg-card group-hover:bg-muted/50 transition-colors border-l border-border min-w-[100px] w-[100px] before:absolute before:left-[-8px] before:top-0 before:bottom-0 before:w-[8px] before:bg-gradient-to-r before:from-transparent before:to-black/[0.06] dark:before:to-black/[0.2] pointer-events-none before:transition-opacity before:duration-200 ${showRightShadow ? 'before:opacity-100' : 'before:opacity-0'}`}>
											L. {parseFloat(String(invoice.total_paid || 0)).toFixed(2)}
										</TableCell>
										<TableCell className="text-right sticky right-0 z-10 bg-card group-hover:bg-muted/50 transition-colors min-w-[80px] w-[80px]">
											<div className="flex justify-end gap-2">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleViewDetails(invoice)}
													title="Ver Detalle de Factura"
												>
													<Eye className="h-4 w-4" />
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
		</>
	);
}
