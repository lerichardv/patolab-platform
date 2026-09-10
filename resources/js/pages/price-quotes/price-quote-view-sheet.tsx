import { Calendar, CheckCircle2, Mail, Pencil, User } from 'lucide-react';
import HeadingSheet from '@/components/heading-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

interface Props {
	priceQuote: any | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onEdit?: (priceQuote: any) => void;
	onSendEmail?: (priceQuote: any) => void;
}

export default function PriceQuoteViewSheet({
	priceQuote,
	open,
	onOpenChange,
	onEdit,
	onSendEmail,
}: Props) {
	if (!priceQuote) {
		return null;
	}

	const items: any[] =
		priceQuote.price_quote_specimens || priceQuote.specimens || [];

	const totalSummary = items.reduce(
		(acc, item) => {
			acc.subtotal += parseFloat(item.subtotal || '0');
			acc.discount += parseFloat(item.discount || '0');
			acc.exempt_amount += parseFloat(item.exempt_amount || '0');
			acc.taxable_amount_15 += parseFloat(item.taxable_amount_15 || '0');
			acc.taxable_amount_18 += parseFloat(item.taxable_amount_18 || '0');
			acc.isv_15 += parseFloat(item.isv_15 || '0');
			acc.isv_18 += parseFloat(item.isv_18 || '0');
			acc.total += parseFloat(item.total || '0');

			return acc;
		},
		{
			subtotal: 0,
			discount: 0,
			exempt_amount: 0,
			taxable_amount_15: 0,
			taxable_amount_18: 0,
			isv_15: 0,
			isv_18: 0,
			total: 0,
		},
	);

	const formattedDate = priceQuote.created_at
		? new Date(priceQuote.created_at).toLocaleDateString('es-HN', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
		: 'N/A';

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full overflow-y-auto sm:max-w-3xl"
			>
				<div className="flex items-center justify-between">
					<HeadingSheet
						title="Detalle de Cotización"
						description={`Consulta los datos, análisis y desglose financiero de la cotización #${priceQuote.price_quote_id}`}
					/>
				</div>

				<div className="space-y-6 pt-2 px-5 pb-8">
					{/* Header Info Banner */}
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
						<div className="space-y-1">
							<span className="text-xs text-muted-foreground">
								Identificador Único:
							</span>
							<div className="flex items-center gap-2">
								<Badge
									variant="secondary"
									className="px-2.5 py-0.5 font-mono text-sm"
								>
									#{priceQuote.price_quote_id}
								</Badge>
								<Badge
									variant="outline"
									className="border-emerald-500/30 text-xs text-emerald-600"
								>
									<CheckCircle2 className="mr-1 h-3 w-3" />
									Activa
								</Badge>
							</div>
						</div>

						<div className="flex items-center gap-2">
							{onSendEmail && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										onSendEmail(priceQuote);
									}}
									className="h-8 gap-1.5 text-xs"
								>
									<Mail className="h-3.5 w-3.5" />
									Enviar Correo
								</Button>
							)}
							{onEdit && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										onOpenChange(false);
										onEdit(priceQuote);
									}}
									className="h-8 gap-1.5 text-xs"
								>
									<Pencil className="h-3.5 w-3.5" />
									Editar Cotización
								</Button>
							)}
						</div>
					</div>

					{/* Metadata Card: Customer & Specimen Info */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{/* Customer Card */}
						<div className="space-y-2.5 rounded-xl border bg-card p-4 shadow-sm">
							<div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
								<User className="h-3.5 w-3.5" />
								<span>Información del Cliente</span>
							</div>
							<div className="space-y-1 text-xs">
								<p className="text-sm font-medium text-foreground">
									{priceQuote.customer?.name ||
										'Público General / Sin cliente'}
								</p>
								{priceQuote.customer?.id_number && (
									<p className="text-muted-foreground">
										Identidad:{' '}
										{priceQuote.customer.id_number}
									</p>
								)}
								{priceQuote.customer?.phone && (
									<p className="text-muted-foreground">
										Teléfono: {priceQuote.customer.phone}
									</p>
								)}
								{priceQuote.customer?.email && (
									<p className="text-muted-foreground">
										Email: {priceQuote.customer.email}
									</p>
								)}
							</div>
						</div>

						{/* Details Card */}
						<div className="space-y-2.5 rounded-xl border bg-card p-4 shadow-sm">
							<div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
								<Calendar className="h-3.5 w-3.5" />
								<span>Detalles de la Cotización</span>
							</div>
							<div className="space-y-1.5 text-xs">
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										Fecha Emisión:
									</span>
									<span className="font-medium">
										{formattedDate}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										Muestras Cotizadas:
									</span>
									<span className="font-medium">
										{items.length}{' '}
										{items.length === 1
											? 'muestra'
											: 'muestras'}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										Total Exámenes / Unidades:
									</span>
									<span className="font-medium">
										{items.reduce(
											(sum, it) =>
												sum +
												(Number(it.quantity) || 1),
											0,
										)}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Breakdown Items Table */}
					<div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
						<div className="flex items-center justify-between border-b pb-2.5">
							<h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
								Exámenes y Análisis ({items.length})
							</h4>
						</div>

						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow className="text-xs">
										<TableHead>Muestra / Examen</TableHead>
										<TableHead className="text-center">
											Cantidad
										</TableHead>
										<TableHead className="text-right">
											Precio Unit.
										</TableHead>
										<TableHead className="text-right">
											Descuento
										</TableHead>
										<TableHead className="text-right">
											Subtotal
										</TableHead>
										<TableHead className="text-right">
											ISV
										</TableHead>
										<TableHead className="text-right">
											Total
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{items.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={7}
												className="py-6 text-center text-xs text-muted-foreground"
											>
												No hay exámenes registrados en
												esta cotización.
											</TableCell>
										</TableRow>
									) : (
										items.map((item, idx) => {
											const specimenTypeName =
												item.specimen_type_relation
													?.name ||
												item.specimen_type?.name ||
												item.specimenType?.name;
											const categoryName =
												item.specimen_category_relation
													?.name ||
												item.specimen_category?.name ||
												item.specimenCategory?.name;
											const examName =
												item.examination?.name ||
												item.examination_name ||
												`Examen #${item.examination_id}`;
											const patientName =
												item.patient?.name ||
												item.customer?.name;
											const qty = item.quantity || 1;
											const unitPrice = parseFloat(
												item.selected_price || '0',
											);
											const discount = parseFloat(
												item.discount || '0',
											);
											const subtotal = parseFloat(
												item.subtotal || '0',
											);
											const isv =
												parseFloat(item.isv_15 || '0') +
												parseFloat(item.isv_18 || '0');
											const total = parseFloat(
												item.total || '0',
											);

											return (
												<TableRow
													key={item.id || idx}
													className="text-xs"
												>
													<TableCell className="font-medium text-foreground">
														<div>
															<span className="font-medium">
																{examName}
															</span>
															<div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
																{specimenTypeName && (
																	<span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-normal text-foreground/80">
																		{
																			specimenTypeName
																		}
																	</span>
																)}
																{categoryName && (
																	<span>
																		•{' '}
																		{
																			categoryName
																		}
																	</span>
																)}
																{patientName && (
																	<span>
																		•
																		Paciente:{' '}
																		{
																			patientName
																		}
																	</span>
																)}
															</div>
														</div>
													</TableCell>
													<TableCell className="text-center font-mono">
														{qty}
													</TableCell>
													<TableCell className="text-right font-mono">
														L.{' '}
														{unitPrice.toFixed(2)}
													</TableCell>
													<TableCell className="text-right font-mono text-emerald-600">
														{discount > 0
															? `- L. ${discount.toFixed(2)}`
															: 'L. 0.00'}
													</TableCell>
													<TableCell className="text-right font-mono">
														L. {subtotal.toFixed(2)}
													</TableCell>
													<TableCell className="text-right font-mono">
														L. {isv.toFixed(2)}
													</TableCell>
													<TableCell className="text-right font-mono font-bold text-foreground">
														L. {total.toFixed(2)}
													</TableCell>
												</TableRow>
											);
										})
									)}
								</TableBody>
							</Table>
						</div>
					</div>

					{/* Financial Summary Card */}
					<div className="flex justify-end">
						<div className="w-full space-y-2 rounded-xl border bg-muted/20 p-4 text-xs shadow-sm sm:w-80">
							<h4 className="border-b pb-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
								Resumen Financiero
							</h4>

							<div className="flex justify-between">
								<span className="text-muted-foreground">
									Subtotal:
								</span>
								<span className="font-mono font-medium">
									L. {totalSummary.subtotal.toFixed(2)}
								</span>
							</div>

							{totalSummary.discount > 0 && (
								<div className="flex justify-between text-emerald-600">
									<span>Descuento Total:</span>
									<span className="font-mono font-medium">
										- L. {totalSummary.discount.toFixed(2)}
									</span>
								</div>
							)}

							{totalSummary.exempt_amount > 0 && (
								<div className="flex justify-between text-muted-foreground">
									<span>Importe Exento:</span>
									<span className="font-mono font-medium">
										L.{' '}
										{totalSummary.exempt_amount.toFixed(2)}
									</span>
								</div>
							)}

							<div className="flex justify-between text-muted-foreground">
								<span>Importe Gravado 15%:</span>
								<span className="font-mono font-medium">
									L.{' '}
									{totalSummary.taxable_amount_15.toFixed(2)}
								</span>
							</div>

							<div className="flex justify-between text-muted-foreground">
								<span>I.S.V. (15%):</span>
								<span className="font-mono font-medium">
									L. {totalSummary.isv_15.toFixed(2)}
								</span>
							</div>

							{totalSummary.isv_18 > 0 && (
								<div className="flex justify-between text-muted-foreground">
									<span>I.S.V. (18%):</span>
									<span className="font-mono font-medium">
										L. {totalSummary.isv_18.toFixed(2)}
									</span>
								</div>
							)}

							<Separator className="my-2" />

							<div className="flex justify-between text-sm font-bold">
								<span>Total General:</span>
								<span className="font-mono text-base text-primary">
									L. {totalSummary.total.toFixed(2)}
								</span>
							</div>
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
