import { Head, router, usePage } from '@inertiajs/react';
import {
	Calculator,
	Edit2,
	Eye,
	FileText,
	Mail,
	MoreVertical,
	Plus,
	Search,
	Trash2,
	X,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import {
	index as priceQuotesIndex,
	destroy as priceQuoteDestroy,
} from '@/actions/App/Http/Controllers/PriceQuoteController';
import PriceQuotePreviewDialog from '@/components/price-quote-preview-dialog';
import PriceQuoteSendEmailDialog from '@/components/price-quote-send-email-dialog';
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import type { BreadcrumbItem } from '@/types';
import PriceQuoteSheet from './price-quote-sheet';
import PriceQuoteViewSheet from './price-quote-view-sheet';

interface PaginatedPriceQuotes {
	data: any[];
	current_page: number;
	last_page: number;
	per_page: number;
	total: number;
	links: any[];
	from: number;
	to: number;
}

interface Props {
	priceQuotes: PaginatedPriceQuotes;
	filters?: {
		search?: string;
		specimen_type?: string;
		specimen_category?: string;
		sort_field?: string;
		sort_direction?: string;
	};
}

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Facturación',
		href: '#',
	},
	{
		title: 'Cotizaciones',
		href: priceQuotesIndex().url,
	},
];

export default function PriceQuotesIndex({ priceQuotes, filters = {} }: Props) {
	const { auth, flash } = usePage<any>().props;

	const [search, setSearch] = useState(filters.search || '');
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [selectedQuoteIdForEdit, setSelectedQuoteIdForEdit] = useState<
		number | string | null
	>(null);

	// View Sheet state
	const [selectedQuoteForView, setSelectedQuoteForView] = useState<
		any | null
	>(null);
	const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);

	// PDF Preview Modal state
	const [quotePreviewUrl, setQuotePreviewUrl] = useState<string | null>(null);
	const [quotePreviewId, setQuotePreviewId] = useState<string | null>(null);
	const [isQuotePreviewOpen, setIsQuotePreviewOpen] = useState(false);

	// Send Email Dialog state
	const [quoteForEmail, setQuoteForEmail] = useState<any | null>(null);
	const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

	React.useEffect(() => {
		if (flash?.new_price_quote_url) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setQuotePreviewUrl(flash.new_price_quote_url);
			setQuotePreviewId(null);
			setIsQuotePreviewOpen(true);
		}
	}, [flash?.new_price_quote_url]);

	// Soft delete alert dialog state
	const [quoteToDelete, setQuoteToDelete] = useState<any | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const userPermissions: string[] = auth?.permissions || [];
	const isAdmin = auth?.user?.role?.slug === 'admin';

	const canCreate =
		isAdmin || userPermissions.includes('price_quotes.create');
	const canEdit = isAdmin || userPermissions.includes('price_quotes.edit');
	const canDelete =
		isAdmin || userPermissions.includes('price_quotes.delete');

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		router.get(
			priceQuotesIndex.url({
				query: {
					...filters,
					search: search.trim() ? search.trim() : undefined,
				},
			}),
			{},
			{
				preserveState: true,
				replace: true,
			},
		);
	};

	const handleClearSearch = () => {
		setSearch('');
		router.get(
			priceQuotesIndex.url({
				query: {
					...filters,
					search: undefined,
				},
			}),
			{},
			{
				preserveState: true,
				replace: true,
			},
		);
	};

	const handleOpenCreate = () => {
		setSelectedQuoteIdForEdit(null);
		setIsSheetOpen(true);
	};

	const handleOpenEdit = (quote: any) => {
		setSelectedQuoteIdForEdit(quote.id);
		setIsSheetOpen(true);
	};

	const handleConfirmDelete = () => {
		if (!quoteToDelete) {
			return;
		}

		setIsDeleting(true);
		router.delete(priceQuoteDestroy.url(quoteToDelete.id), {
			onSuccess: () => {
				toast.success('Cotización eliminada correctamente');
				setQuoteToDelete(null);
				setIsDeleting(false);
			},
			onError: (err) => {
				console.error('Error deleting quote:', err);
				toast.error('No se pudo eliminar la cotización');
				setIsDeleting(false);
			},
		});
	};

	return (
		<>
			<Head title="Cotizaciones" />

			<div className="mb-20 flex h-full flex-1 flex-col gap-4 p-4">
				{/* Header Section */}
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<div className="flex items-center gap-2">
							<Calculator className="h-6 w-6 text-primary" />
							<h1 className="text-2xl font-bold tracking-tight">
								Cotizaciones
							</h1>
						</div>
						<p className="text-sm text-muted-foreground">
							Gestione, consulte y elabore presupuestos previos de
							análisis y exámenes para pacientes y clientes.
						</p>
					</div>

					<div className="flex items-center gap-2">
						{canCreate && (
							<Button
								onClick={handleOpenCreate}
								className="h-10 gap-2 shadow-sm"
							>
								<Plus className="h-4 w-4" />
								<span>Nueva Cotización</span>
							</Button>
						)}
					</div>
				</div>

				{/* Filters & Search Toolbar */}
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<form
						onSubmit={handleSearchSubmit}
						className="relative max-w-sm flex-1"
					>
						<Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Buscar por código (#hex) o cliente..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="h-9 pr-8 pl-9 text-xs"
						/>
						{search && (
							<button
								type="button"
								onClick={handleClearSearch}
								className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</form>
				</div>

				{/* Main Table */}
				<div className="rounded-md border bg-card">
					<Table>
						<TableHeader>
							<TableRow className="text-xs">
								<TableHead className="min-w-[170px]">
									Nº Cotización
								</TableHead>
								<TableHead className="min-w-[200px]">
									Cliente
								</TableHead>
								<TableHead className="min-w-[300px]">
									Muestras / Exámenes
								</TableHead>
								<TableHead className="min-w-[120px] text-right">
									Total
								</TableHead>
								<TableHead className="w-[80px] text-right">
									Acciones
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{priceQuotes.data.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="h-32 text-center text-xs text-muted-foreground"
									>
										<div className="flex flex-col items-center justify-center gap-2">
											<FileText className="h-8 w-8 text-muted-foreground/40" />
											<span>
												No se encontraron cotizaciones
												registradas.
											</span>
										</div>
									</TableCell>
								</TableRow>
							) : (
								priceQuotes.data.map((quote) => {
									const items: any[] =
										quote.price_quote_specimens ||
										quote.specimens ||
										[];

									const quoteTotal = items.reduce(
										(sum, it) =>
											sum + parseFloat(it.total || '0'),
										0,
									);

									const formattedDate = quote.created_at
										? new Date(
											quote.created_at,
										).toLocaleDateString('es-HN', {
											year: 'numeric',
											month: 'short',
											day: 'numeric',
											hour: '2-digit',
											minute: '2-digit',
											hour12: true,
										})
										: 'N/A';

									return (
										<TableRow
											key={quote.id}
											className="text-xs transition-colors hover:bg-muted/40"
										>
											{/* Code & Date */}
											<TableCell>
												<div className="flex flex-col gap-1">
													<Badge
														variant="secondary"
														className="w-fit px-2 py-0.5 font-mono text-xs font-semibold"
													>
														#{quote.price_quote_id}
													</Badge>
													<span className="text-[11px] text-muted-foreground">
														{formattedDate}
													</span>
												</div>
											</TableCell>

											{/* Customer */}
											<TableCell>
												<div className="flex flex-col">
													<span className="font-medium text-foreground">
														{quote.customer?.name ||
															'-'}
													</span>
													{quote.customer
														?.id_number && (
															<span className="text-[10px] text-muted-foreground">
																{
																	quote.customer
																		.id_number
																}
															</span>
														)}
												</div>
											</TableCell>

											{/* Group-style Specimens / Examinations column with Eye Button */}
											<TableCell>
												<div className="space-y-1.5">
													<div className="flex items-center gap-2">
														<Badge
															variant="secondary"
															className="h-4 px-1.5 py-0 font-mono text-[10px] font-medium"
														>
															{items.length}{' '}
															{items.length === 1
																? 'examen'
																: 'exámenes'}
														</Badge>
														<Button
															variant="ghost"
															size="icon"
															className="h-5 w-5 hover:bg-muted"
															onClick={() => {
																setSelectedQuoteForView(
																	quote,
																);
																setIsViewSheetOpen(
																	true,
																);
															}}
															title="Ver detalle de exámenes"
														>
															<Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
														</Button>
													</div>

													<div className="flex flex-wrap gap-1">
														{items
															.slice(0, 3)
															.map(
																(
																	item: any,
																	i: number,
																) => {
																	const typeName =
																		item
																			.specimen_type_relation
																			?.name ||
																		item
																			.specimenType
																			?.name;
																	const examName =
																		item
																			.examination
																			?.name ||
																		'Examen';

																	return (
																		<span
																			key={
																				item.id ||
																				i
																			}
																			className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground"
																		>
																			{typeName && (
																				<span className="font-semibold text-foreground">
																					{
																						typeName
																					}

																					:
																				</span>
																			)}
																			<span>
																				{
																					examName
																				}
																			</span>
																			{item.quantity >
																				1 && (
																					<span className="font-mono text-[10px]">
																						(x
																						{
																							item.quantity
																						}

																						)
																					</span>
																				)}
																		</span>
																	);
																},
															)}
														{items.length > 3 && (
															<span className="self-center text-[10px] text-muted-foreground">
																+
																{items.length -
																	3}{' '}
																más
															</span>
														)}
													</div>
												</div>
											</TableCell>

											{/* Total */}
											<TableCell className="text-right font-mono font-bold text-foreground">
												L. {quoteTotal.toFixed(2)}
											</TableCell>

											{/* Row Actions */}
											<TableCell className="text-right">
												<DropdownMenu>
													<DropdownMenuTrigger
														asChild
													>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 hover:bg-muted"
														>
															<MoreVertical className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent
														align="end"
														className="w-40 text-xs"
													>
														<DropdownMenuItem
															onClick={() => {
																setSelectedQuoteForView(
																	quote,
																);
																setIsViewSheetOpen(
																	true,
																);
															}}
															className="cursor-pointer gap-2"
														>
															<Eye className="h-3.5 w-3.5" />
															<span>
																Ver Detalle
															</span>
														</DropdownMenuItem>

														{quote.price_quote_url && (
															<DropdownMenuItem
																onClick={() => {
																	setQuotePreviewUrl(
																		quote.price_quote_url,
																	);
																	setQuotePreviewId(
																		quote.price_quote_id,
																	);
																	setIsQuotePreviewOpen(
																		true,
																	);
																}}
																className="cursor-pointer gap-2"
															>
																<FileText className="h-3.5 w-3.5" />
																<span>
																	Ver PDF
																</span>
															</DropdownMenuItem>
														)}

														<DropdownMenuItem
															onClick={() => {
																setQuoteForEmail(quote);
																setIsEmailDialogOpen(true);
															}}
															className="cursor-pointer gap-2"
														>
															<Mail className="h-3.5 w-3.5 text-primary" />
															<span>
																Enviar por Correo
															</span>
														</DropdownMenuItem>

														{canEdit && (
															<DropdownMenuItem
																onClick={() =>
																	handleOpenEdit(
																		quote,
																	)
																}
																className="cursor-pointer gap-2"
															>
																<Edit2 className="h-3.5 w-3.5" />
																<span>
																	Editar
																</span>
															</DropdownMenuItem>
														)}

														{canDelete && (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	onClick={() =>
																		setQuoteToDelete(
																			quote,
																		)
																	}
																	className="cursor-pointer gap-2 text-destructive focus:text-destructive"
																>
																	<Trash2 className="h-3.5 w-3.5" />
																	<span>
																		Eliminar
																	</span>
																</DropdownMenuItem>
															</>
														)}
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{priceQuotes.links && priceQuotes.links.length > 3 && (
					<div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
						<div>
							Mostrando {priceQuotes.from || 0} a{' '}
							{priceQuotes.to || 0} de {priceQuotes.total}{' '}
							resultados
						</div>
						<div className="flex items-center gap-1">
							{priceQuotes.links.map((link, idx) => (
								<Button
									key={idx}
									variant={
										link.active ? 'default' : 'outline'
									}
									size="sm"
									disabled={!link.url}
									onClick={() => {
										if (link.url) {
											router.get(
												link.url,
												{},
												{ preserveState: true },
											);
										}
									}}
									className="h-8 min-w-[32px] px-2 text-xs"
									dangerouslySetInnerHTML={{
										__html: link.label,
									}}
								/>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Price Quote Edit/Create Sheet */}
			<PriceQuoteSheet
				open={isSheetOpen}
				onOpenChange={setIsSheetOpen}
				priceQuoteId={selectedQuoteIdForEdit}
				onSuccess={() => {
					router.reload({ only: ['priceQuotes'] });
				}}
			/>

			{/* Price Quote View Sheet */}
			<PriceQuoteViewSheet
				priceQuote={selectedQuoteForView}
				open={isViewSheetOpen}
				onOpenChange={setIsViewSheetOpen}
				onEdit={(quote) => {
					handleOpenEdit(quote);
				}}
				onSendEmail={(quote) => {
					setQuoteForEmail(quote);
					setIsEmailDialogOpen(true);
				}}
			/>

			{/* Soft Delete AlertDialog */}
			<AlertDialog
				open={Boolean(quoteToDelete)}
				onOpenChange={(open) => {
					if (!open) {
						setQuoteToDelete(null);
					}
				}}
			>
				<AlertDialogContent className="max-w-[450px]">
					<AlertDialogHeader>
						<AlertDialogTitle>
							¿Está seguro de eliminar esta cotización?
						</AlertDialogTitle>
						<AlertDialogDescription>
							La cotización #{quoteToDelete?.price_quote_id} será
							dada de baja y dejará de mostrarse en el listado
							activo.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={isDeleting}
							onClick={handleConfirmDelete}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							{isDeleting
								? 'Eliminando...'
								: 'Eliminar Cotización'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Price Quote Preview Dialog */}
			<PriceQuotePreviewDialog
				open={isQuotePreviewOpen}
				onOpenChange={setIsQuotePreviewOpen}
				quoteUrl={quotePreviewUrl}
				quoteId={quotePreviewId}
			/>

			{/* Price Quote Send Email Dialog */}
			<PriceQuoteSendEmailDialog
				open={isEmailDialogOpen}
				onOpenChange={setIsEmailDialogOpen}
				priceQuote={quoteForEmail}
			/>
		</>
	);
}

PriceQuotesIndex.layout = {
	breadcrumbs,
};
