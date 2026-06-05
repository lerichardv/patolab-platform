import * as React from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import HeadingSheet from '@/components/heading-sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Microscope, CreditCard, ExternalLink, Download, FileText, FileImage, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
	group: any | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function SpecimenGroupViewSheet({
	group,
	open,
	onOpenChange
}: Props) {
	if (!group) return null;

	const [copied, setCopied] = React.useState(false);
	const [copiedSpecimenId, setCopiedSpecimenId] = React.useState<number | null>(null);

	const copyPublicLink = () => {
		if (!group.access_token) return;
		const url = `${window.location.origin}/specimen-group/${group.id}?token=${group.access_token}`;
		navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const copySpecimenPublicLink = (specimen: any) => {
		if (!specimen.access_token) return;
		const url = `${window.location.origin}/specimen/${specimen.sequence_code}?token=${specimen.access_token}`;
		navigator.clipboard.writeText(url);
		setCopiedSpecimenId(specimen.id);
		setTimeout(() => setCopiedSpecimenId(null), 2000);
	};

	const invoice = group.invoice;
	const specimens = group.specimens || [];

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

	const getFileExtension = (path: string) => {
		return path.split('.').pop()?.toLowerCase();
	};

	const isImageFile = (path: string) => {
		const ext = getFileExtension(path);
		return ext ? ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) : false;
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-[90vw] md:max-w-[1000px] lg:max-w-[1100px] overflow-y-auto z-[100]">
				<div className="flex flex-col gap-6 h-full pb-8">
					{/* Header */}
					<div className="flex items-center gap-3 border-b pb-4 pr-12">
						<div>
							<HeadingSheet
								title={`Grupo: ${group.name}`}
								description={`Detalles y facturación del grupo de muestras.`}
							/>
						</div>
					</div>

					{/* Content Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-5">
						{/* Specimens List (Left 2 Columns) */}
						<div className="lg:col-span-2 space-y-6">
							{group.access_token && (
								<div className="rounded-lg border bg-card text-card-foreground p-5 shadow-sm space-y-4 border-dashed border-primary/20 bg-primary/[0.01]">
									<div className="space-y-1.5 flex flex-col">
										<span className="text-sm font-semibold text-primary flex items-center gap-1.5 font-sans">
											<ExternalLink className="w-4 h-4" /> Enlace Público de Progreso del Grupo
										</span>
										<p className="text-xs text-muted-foreground">Comparta este enlace con el cliente para que pueda consultar el estado de todas las muestras del grupo.</p>
										<div className="flex gap-2 w-full mt-1.5">
											<input
												type="text"
												readOnly
												value={`${window.location.origin}/specimen-group/${group.id}?token=${group.access_token}`}
												className="flex-1 px-3 py-1.5 text-xs font-mono bg-background border rounded-md select-all outline-none"
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={copyPublicLink}
												className="h-9 flex items-center gap-1.5 shrink-0"
											>
												{copied ? (
													<>
														<Check className="w-3.5 h-3.5 text-emerald-500" /> Copiado
													</>
												) : (
													<>
														<Copy className="w-3.5 h-3.5" /> Copiar
													</>
												)}
											</Button>
											<a
												href={`/specimen-group/${group.id}?token=${group.access_token}`}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 text-xs font-medium"
											>
												Abrir
											</a>
										</div>
									</div>
								</div>
							)}

							<div className="rounded-lg border bg-card text-card-foreground p-5 shadow-sm space-y-4">
								<h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
									<Microscope className="w-5 h-5" /> Muestras en el Grupo ({specimens.length})
								</h3>
								<Separator />

								<div className="space-y-4">
									{specimens.map((specimen: any) => (
										<div key={specimen.id} className="border rounded-lg p-4 space-y-3 bg-muted/10 hover:bg-muted/20 transition-all">
											<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
												<div className="flex items-center gap-2">
													{specimen.sequence_code && (
														<span className="font-mono font-bold text-primary text-xs bg-primary/5 border border-primary/20 px-2 py-0.5 rounded">
															{specimen.sequence_code}
														</span>
													)}
													<span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: specimen.status_color || '#cbd5e1' }}>
														{specimen.status === 'received' ? 'Recibida' :
															specimen.status === 'macroscopic_review' ? 'Rev. Macroscópica' :
																specimen.status === 'processing' ? 'En Proceso' :
																	specimen.status === 'microscopic_review' ? 'Rev. Microscópica' :
																		specimen.status === 'finalized' ? 'Finalizada' :
																			specimen.status === 'delivered' ? 'Entregada' :
																				specimen.status === 'cancelled' ? 'Cancelada' : specimen.status}
													</span>
												</div>
												<div className="flex items-center gap-1">
													<div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: specimen.priority?.color }} />
													<span className="text-xs text-muted-foreground font-medium">{specimen.priority?.name}</span>
												</div>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
												<div>
													<span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Paciente</span>
													<span className="font-medium text-foreground">{specimen.customer_relation?.name || 'N/A'}</span>
												</div>
												<div>
													<span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Examen</span>
													<span className="font-medium text-foreground">{specimen.type?.name} - {specimen.examination?.name}</span>
												</div>
												<div>
													<span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Tiempo / Categoría</span>
													<span className="font-medium text-foreground">{specimen.category?.name || 'N/A'}</span>
												</div>
												<div>
													<span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Médico Remitente</span>
													<span className="font-medium text-foreground">{specimen.referrer_relation?.name || 'N/A'}</span>
												</div>
												{specimen.anatomic_site && (
													<div className="sm:col-span-2">
														<span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Sitio Anatómico</span>
														<span className="font-medium text-foreground">{specimen.anatomic_site}</span>
													</div>
												)}
											</div>

											{/* Specimen public link */}
											{specimen.access_token && (
												<div className="mt-3 p-2 bg-background border border-dashed rounded-md flex flex-col gap-1.5 text-xs">
													<span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
														<ExternalLink className="w-3 h-3 text-primary" /> Enlace Público Individual
													</span>
													<div className="flex gap-2 w-full">
														<input
															type="text"
															readOnly
															value={`${window.location.origin}/specimen/${specimen.sequence_code}?token=${specimen.access_token}`}
															className="flex-1 px-2.5 py-1 text-[11px] font-mono bg-muted/30 border rounded select-all outline-none"
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() => copySpecimenPublicLink(specimen)}
															className="h-7 px-2.5 text-[11px] flex items-center gap-1 shrink-0"
														>
															{copiedSpecimenId === specimen.id ? (
																<>
																	<Check className="w-3 h-3 text-emerald-500" /> Copiado
																</>
															) : (
																<>
																	<Copy className="w-3 h-3" /> Copiar
																</>
															)}
														</Button>
														<a
															href={`/specimen/${specimen.sequence_code}?token=${specimen.access_token}`}
															target="_blank"
															rel="noopener noreferrer"
															className="h-7 inline-flex items-center justify-center rounded border bg-background hover:bg-accent px-2.5 text-[11px]"
														>
															Abrir
														</a>
													</div>
												</div>
											)}

											{/* Specimen medical order file */}
											{specimen.medical_order_file && (
												<div className="mt-3 p-2 bg-background border rounded-md flex items-center justify-between text-xs">
													<div className="flex items-center gap-2 min-w-0">
														{isImageFile(specimen.medical_order_file) ? (
															<FileImage className="w-4 h-4 text-blue-500 shrink-0" />
														) : (
															<FileText className="w-4 h-4 text-red-500 shrink-0" />
														)}
														<span className="font-medium truncate max-w-[240px]">
															Orden Médica: {specimen.medical_order_file.split('/').pop()}
														</span>
													</div>
													<div className="flex gap-1.5 shrink-0">
														<a
															href={`/storage/${specimen.medical_order_file}`}
															target="_blank"
															rel="noopener noreferrer"
															className="h-7 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent px-2.5 text-[11px] font-medium gap-1"
														>
															<ExternalLink className="w-3 h-3" /> Ver
														</a>
														<a
															href={`/storage/${specimen.medical_order_file}`}
															download
															className="h-7 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-2.5 text-[11px] font-medium gap-1"
														>
															<Download className="w-3 h-3" /> Descargar
														</a>
													</div>
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Billing Info (Right Column) */}
						<div className="space-y-6">
							{invoice && (
								<div className="rounded-lg border bg-card text-card-foreground p-5 shadow-sm space-y-4">
									<h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
										<CreditCard className="w-5 h-5" /> Facturación del Grupo
									</h3>
									<Separator />

									<div className="space-y-4 text-sm">
										<div className="space-y-1">
											<span className="text-xs text-muted-foreground block">Número de Factura</span>
											<span className="font-semibold text-foreground">{invoice.full_invoice_number}</span>
										</div>

										<div className="space-y-1">
											<span className="text-xs text-muted-foreground block">Método de Pago</span>
											<div>
												<Badge variant={invoice.payment_type === 'credit' ? 'destructive' : 'default'} className="capitalize">
													{getPaymentTypeLabel(invoice.payment_type)}
												</Badge>
											</div>
										</div>

										<Separator />

										<div className="space-y-2">
											<div className="flex justify-between text-xs">
												<span className="text-muted-foreground">Importe Neto:</span>
												<span>L. {parseFloat(invoice.amount).toFixed(2)}</span>
											</div>
											<div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
												<span>Descuentos:</span>
												<span>- L. {parseFloat(invoice.discount).toFixed(2)}</span>
											</div>
											<div className="flex justify-between text-xs font-semibold">
												<span className="text-muted-foreground">Subtotal:</span>
												<span>L. {parseFloat(invoice.subtotal).toFixed(2)}</span>
											</div>
											<Separator />
											<div className="flex justify-between text-sm font-bold text-primary">
												<span>Total Factura:</span>
												<span>L. {parseFloat(invoice.total).toFixed(2)}</span>
											</div>
											<div className="flex justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
												<span>Total Pagado:</span>
												<span>L. {parseFloat(invoice.total_paid || 0).toFixed(2)}</span>
											</div>
										</div>

										{invoice.invoice_file && (
											<div className="pt-2">
												<a
													href={`/storage/${invoice.invoice_file}`}
													target="_blank"
													rel="noopener noreferrer"
													className="w-full inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-1.5"
												>
													<ExternalLink className="w-3.5 h-3.5" /> Ver Factura PDF
												</a>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Proof of payment */}
							{invoice && invoice.proof_of_payment && (
								<div className="rounded-lg border bg-card text-card-foreground p-5 shadow-sm space-y-4">
									<h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
										<FileText className="w-5 h-5" /> Comprobante de Pago
									</h3>
									<Separator />

									<div className="space-y-3">
										<div className="flex items-center justify-between bg-muted/40 rounded p-2.5 text-xs">
											<div className="flex items-center gap-2 min-w-0">
												{isImageFile(invoice.proof_of_payment) ? (
													<FileImage className="w-4 h-4 text-blue-500 shrink-0" />
												) : (
													<FileText className="w-4 h-4 text-red-500 shrink-0" />
												)}
												<span className="font-medium truncate max-w-[150px]">
													{invoice.proof_of_payment.split('/').pop()}
												</span>
											</div>
											<a
												href={`/storage/${invoice.proof_of_payment}`}
												target="_blank"
												rel="noopener noreferrer"
												className="h-8 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent px-3 text-xs font-medium gap-1"
											>
												<ExternalLink className="w-3 h-3" /> Ver
											</a>
										</div>
										{isImageFile(invoice.proof_of_payment) && (
											<div className="border rounded-md overflow-hidden max-h-[200px] flex items-center justify-center bg-muted/10">
												<img
													src={`/storage/${invoice.proof_of_payment}`}
													alt="Comprobante de Pago"
													className="max-h-[200px] max-w-full object-contain"
												/>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
