import { Calendar, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

export interface DailyReportItem {
	item: number;
	date: string;
	customer_name: string;
	quantity: number;
	payment_type_code: number;
	payment_type_label: string;
	gross_amount: number;
	discount: number;
	net_amount: number;
	comment: string;
	invoice_number: string;
	is_cancelled: boolean;
	invoice_id?: number;
	invoice?: any;
}

export interface DailySettlementData {
	cash: number;
	check: number;
	card: number;
	transfer: number;
	credit: number;
	total: number;
	difference: number;
	is_balanced: boolean;
}

export interface DailyTableData {
	date: string;
	day_name: string;
	formatted_date: string;
	title: string;
	items: DailyReportItem[];
	totals: {
		gross: number;
		discount: number;
		net: number;
	};
	settlement: DailySettlementData;
	invoice_count: number;
}

interface Props {
	dayData: DailyTableData;
	onSelectInvoice?: (invoice: any) => void;
}

const formatCurrency = (val: number): string => {
	return new Intl.NumberFormat('es-HN', {
		style: 'currency',
		currency: 'HNL',
		minimumFractionDigits: 2,
	})
		.format(val)
		.replace('HNL', 'L.');
};

export default function DailySettlementTable({
	dayData,
	onSelectInvoice,
}: Props) {
	const { title, items, totals, settlement, invoice_count, formatted_date } =
		dayData;

	const getPaymentBadge = (code: number, isCancelled: boolean) => {
		if (isCancelled || code === 0) {
			return (
				<Badge
					variant="destructive"
					className="px-2 py-0 text-[11px] font-medium"
				>
					Anulada
				</Badge>
			);
		}

		switch (code) {
			case 1:
				return (
					<Badge
						variant="outline"
						className="border-emerald-200 bg-emerald-50 px-2 py-0 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
					>
						1 - Efectivo
					</Badge>
				);
			case 2:
				return (
					<Badge
						variant="outline"
						className="border-blue-200 bg-blue-50 px-2 py-0 text-[11px] font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
					>
						2 - Cheque
					</Badge>
				);
			case 3:
				return (
					<Badge
						variant="outline"
						className="border-purple-200 bg-purple-50 px-2 py-0 text-[11px] font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
					>
						3 - T/C POS
					</Badge>
				);
			case 4:
				return (
					<Badge
						variant="outline"
						className="border-amber-200 bg-amber-50 px-2 py-0 text-[11px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
					>
						4 - Transferencia
					</Badge>
				);
			case 5:
				return (
					<Badge
						variant="outline"
						className="border-indigo-200 bg-indigo-50 px-2 py-0 text-[11px] font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
					>
						5 - Crédito
					</Badge>
				);
			default:
				return (
					<Badge
						variant="secondary"
						className="px-2 py-0 text-[11px] font-medium"
					>
						{code}
					</Badge>
				);
		}
	};

	return (
		<Card
			id={`day-${dayData.date}`}
			className="scroll-mt-24 overflow-hidden border border-border shadow-sm"
		>
			{/* Header banner replicating the Excel title: LIQUIDACIÓN DEL DIA [DÍA] [DD] [MES] [YYYY] */}
			<CardHeader className="border-b border-border px-4 pb-3.5 sm:px-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<div className="rounded-md bg-primary/10 p-1.5 text-primary">
							<Calendar className="h-4 w-4" />
						</div>
						<h3 className="text-base font-bold tracking-tight text-foreground">
							{title}
						</h3>
					</div>
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="text-xs">
							{invoice_count}{' '}
							{invoice_count === 1 ? 'Factura' : 'Facturas'}
						</Badge>
						{settlement.is_balanced ? (
							<Badge
								variant="outline"
								className="flex items-center gap-1 border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
							>
								<CheckCircle2 className="h-3 w-3" /> Cuadrado
							</Badge>
						) : (
							<Badge
								variant="destructive"
								className="flex items-center gap-1 text-xs font-semibold"
							>
								<AlertTriangle className="h-3 w-3" /> Descuadre
								({formatCurrency(settlement.difference)})
							</Badge>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className="p-0">
				{/* Daily Invoices Table */}
				<div className="overflow-x-auto">
					<Table>
						<TableHeader className="bg-muted/30">
							<TableRow className="border-b border-border text-xs">
								<TableHead className="w-12 text-center font-bold">
									ITEM
								</TableHead>
								<TableHead className="w-24 text-center font-bold">
									FECHA
								</TableHead>
								<TableHead className="min-w-[200px] font-bold">
									NOMBRE PACIENTE
								</TableHead>
								<TableHead className="w-16 text-center font-bold">
									CANTIDAD
								</TableHead>
								<TableHead className="w-32 text-center font-bold">
									FORMA DE PAGO
								</TableHead>
								<TableHead className="w-28 text-right font-bold">
									VALOR FACTURA
								</TableHead>
								<TableHead className="w-24 text-right font-bold">
									DESCUENTO
								</TableHead>
								<TableHead className="w-28 text-right font-bold">
									PAGO RECIBIDO
								</TableHead>
								<TableHead className="w-36 font-bold">
									COMENTARIO
								</TableHead>
								<TableHead className="w-32 text-center font-bold">
									FACTURA
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="text-sm">
							{items.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={10}
										className="py-6 text-center text-xs text-muted-foreground"
									>
										No hay facturas registradas en esta
										fecha ({formatted_date}).
									</TableCell>
								</TableRow>
							) : (
								items.map((row) => (
									<TableRow
										key={row.item}
										className={`transition-colors hover:bg-muted/30 ${row.is_cancelled
											? 'bg-destructive/5 text-muted-foreground'
											: ''
											}`}
									>
										<TableCell className="text-center font-mono text-xs text-muted-foreground">
											{row.item}
										</TableCell>
										<TableCell className="text-center text-xs whitespace-nowrap">
											{row.date}
										</TableCell>
										<TableCell
											className={`font-medium ${row.is_cancelled ? 'text-destructive line-through' : ''}`}
										>
											{row.customer_name}
										</TableCell>
										<TableCell className="text-center text-xs">
											{row.quantity}
										</TableCell>
										<TableCell className="text-center whitespace-nowrap">
											{getPaymentBadge(
												row.payment_type_code,
												row.is_cancelled,
											)}
										</TableCell>
										<TableCell className="text-right font-mono text-xs">
											{row.is_cancelled
												? '-'
												: formatCurrency(
													row.gross_amount,
												)}
										</TableCell>
										<TableCell className="text-right font-mono text-xs">
											{row.discount > 0
												? formatCurrency(row.discount)
												: '-'}
										</TableCell>
										<TableCell className="text-right font-mono text-xs font-semibold text-foreground">
											{row.is_cancelled
												? '-'
												: formatCurrency(
													row.net_amount,
												)}
										</TableCell>
										<TableCell
											className="max-w-[150px] truncate text-xs text-muted-foreground"
											title={row.comment}
										>
											{row.comment || '-'}
										</TableCell>
										<TableCell className="text-center whitespace-nowrap">
											{row.invoice && onSelectInvoice ? (
												<Button
													variant="ghost"
													size="sm"
													className="mx-auto flex h-7 items-center gap-1 px-2 font-mono text-xs text-primary hover:bg-primary/5 hover:text-primary/80"
													onClick={() =>
														onSelectInvoice(
															row.invoice,
														)
													}
													title="Ver detalle de factura"
												>
													<FileText className="h-3 w-3" />
													<span>
														{row.invoice_number}
													</span>
												</Button>
											) : (
												<span className="font-mono text-xs font-medium">
													{row.invoice_number}
												</span>
											)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
						{items.length > 0 && (
							<tfoot>
								<TableRow className="border-t-2 border-border bg-muted/40 text-xs font-bold">
									<TableCell
										colSpan={5}
										className="pr-4 text-right tracking-wider uppercase"
									>
										TOTAL
									</TableCell>
									<TableCell className="text-right font-mono">
										{formatCurrency(totals.gross)}
									</TableCell>
									<TableCell className="text-right font-mono">
										{formatCurrency(totals.discount)}
									</TableCell>
									<TableCell className="text-right font-mono text-sm text-primary">
										{formatCurrency(totals.net)}
									</TableCell>
									<TableCell colSpan={2}></TableCell>
								</TableRow>
							</tfoot>
						)}
					</Table>
				</div>

				{/* Daily Settlement Summary Block (Liquidación / Valores) */}
				<div className="border-t border-border bg-muted/10 p-4 sm:p-6">
					<div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
						{/* Summary description & quick stats */}
						<div className="space-y-2 text-xs text-muted-foreground">
							<p className="text-sm font-semibold text-foreground">
								Arqueo de Caja y Cobranza Diaria
							</p>
							<p>
								Detalle de los valores cobrados en este día
								agrupados por cada forma de pago para auditoría
								y conciliación contra recibos bancarios y arqueo
								físico.
							</p>
							<div className="flex flex-wrap gap-2 pt-2">
								<span className="inline-flex items-center rounded border border-border bg-background px-2 py-0.5 text-[11px]">
									Total Facturas:{' '}
									<strong className="ml-1 text-foreground">
										{invoice_count}
									</strong>
								</span>
								<span className="inline-flex items-center rounded border border-border bg-background px-2 py-0.5 text-[11px]">
									Neto Facturado:{' '}
									<strong className="ml-1 text-foreground">
										{formatCurrency(totals.net)}
									</strong>
								</span>
								<span className="inline-flex items-center rounded border border-border bg-background px-2 py-0.5 text-[11px]">
									Descuentos:{' '}
									<strong className="ml-1 text-foreground">
										{formatCurrency(totals.discount)}
									</strong>
								</span>
							</div>
						</div>

						{/* Settlement breakdown card replicating reference excel format */}
						<div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
							<div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-xs font-bold text-foreground">
								<span>Liquidación</span>
								<span>Valores</span>
							</div>
							<div className="divide-y divide-border/60 text-xs">
								<div className="flex items-center justify-between px-4 py-2 hover:bg-muted/20">
									<span className="text-muted-foreground">
										1.- Total Recibido en Efectivo
									</span>
									<span className="font-mono font-medium">
										{formatCurrency(settlement.cash)}
									</span>
								</div>
								<div className="flex items-center justify-between px-4 py-2 hover:bg-muted/20">
									<span className="text-muted-foreground">
										2.- Total Recibido en Cheques
									</span>
									<span className="font-mono font-medium">
										{formatCurrency(settlement.check)}
									</span>
								</div>
								<div className="flex items-center justify-between px-4 py-2 hover:bg-muted/20">
									<span className="text-muted-foreground">
										3.- Total Recibido en T/C POS
									</span>
									<span className="font-mono font-medium">
										{formatCurrency(settlement.card)}
									</span>
								</div>
								<div className="flex items-center justify-between px-4 py-2 hover:bg-muted/20">
									<span className="text-muted-foreground">
										4.- Total Recibido en Transferencia
									</span>
									<span className="font-mono font-medium">
										{formatCurrency(settlement.transfer)}
									</span>
								</div>
								<div className="flex items-center justify-between px-4 py-2 hover:bg-muted/20">
									<span className="text-muted-foreground">
										5.- Facturas al Crédito
									</span>
									<span className="font-mono font-medium">
										{formatCurrency(settlement.credit)}
									</span>
								</div>
								<div className="flex items-center justify-between border-t-2 border-b-2 border-border border-b-primary bg-muted/30 px-4 py-2.5 text-sm font-bold">
									<span className="text-foreground">
										Total Ventas Diarias
									</span>
									<span className="font-mono font-bold text-primary">
										{formatCurrency(settlement.total)}
									</span>
								</div>
							</div>
							<div className="flex items-center justify-between border-t border-border bg-muted/10 px-4 py-2 text-[11px] text-muted-foreground">
								<span>Verificación de Cuadre:</span>
								<span
									className={
										settlement.is_balanced
											? 'font-mono font-semibold text-emerald-600 dark:text-emerald-400'
											: 'font-mono font-semibold text-destructive'
									}
								>
									{settlement.is_balanced
										? 'Diferencia: L. 0.00'
										: `Diferencia: ${formatCurrency(settlement.difference)}`}
								</span>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
