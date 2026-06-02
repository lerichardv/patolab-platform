import { useForm } from '@inertiajs/react';
import { Check, ChevronsUpDown, Upload, FileText, X, ExternalLink, AlertCircle, CreditCard, Landmark, Receipt, Wallet, Calendar } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface Props {
	invoice: any;
	customers: any[];
	banks: any[];
	onSuccess: () => void;
	setIsDirty?: (dirty: boolean) => void;
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
	const [open, setOpen] = useState(false);
	const selectedOption = options.find((opt) => opt.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen} modal={true}>
			<PopoverTrigger asChild className='w-full'>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between"
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
					<CommandInput placeholder={`Buscar ${placeholder.toLowerCase()}...`} />
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

export default function InvoiceForm({ invoice, customers, banks, onSuccess, setIsDirty }: Props) {
	const [showConfirm, setShowConfirm] = useState(false);

	const { data, setData, post, processing, errors, setError, clearErrors, isDirty } = useForm({
		_method: 'PUT',
		customer_id: invoice?.customer_id ? invoice.customer_id.toString() : '',
		payment_type: invoice?.payment_type || '',
		amount: invoice?.amount ? invoice.amount.toString() : '0',
		discount: invoice?.discount ? invoice.discount.toString() : '0',
		subtotal: invoice?.subtotal ? invoice.subtotal.toString() : '0',
		exempt_amount: invoice?.exempt_amount ? invoice.exempt_amount.toString() : '0',
		total: invoice?.total ? invoice.total.toString() : '0',
		total_paid: invoice?.total_paid ? invoice.total_paid.toString() : '0',
		payment_method_date: invoice?.payment_method_date ? invoice.payment_method_date.split(/[ T]/)[0] : new Date().toISOString().split('T')[0],
		cash_value: invoice?.cash_value ? invoice.cash_value.toString() : '',
		check_number: invoice?.check_number || '',
		check_value: invoice?.check_value ? invoice.check_value.toString() : '',
		card_last_4: invoice?.card_last_4 || '',
		card_value_charged: invoice?.card_value_charged ? invoice.card_value_charged.toString() : '',
		card_expiration: invoice?.card_expiration || '',
		card_authorization_code: invoice?.card_authorization_code || '',
		transfer_bank_id: invoice?.transfer_bank_id ? invoice.transfer_bank_id.toString() : '',
		transfer_value: invoice?.transfer_value ? invoice.transfer_value.toString() : '',
		transfer_authorization_code: invoice?.transfer_authorization_code || '',
		proof_of_payment: null as File | null,
		regenerate_pdf: true,
	});

	useEffect(() => {
		if (setIsDirty) {
			setIsDirty(isDirty);
		}
	}, [isDirty, setIsDirty]);

	// Re-calculate totals when amount or discount change
	useEffect(() => {
		const amt = parseFloat(data.amount) || 0;
		const disc = parseFloat(data.discount) || 0;
		const sub = Math.max(0, amt - disc);
		setData(d => ({
			...d,
			subtotal: sub.toString(),
			total: sub.toString(),
		}));
	}, [data.amount, data.discount]);

	const formatCardExpiration = (value: string) => {
		const clean = value.replace(/\D/g, '');
		if (clean.length <= 2) return clean;
		return `${clean.slice(0, 2)}/${clean.slice(2, 6)}`;
	};

	const validateForm = () => {
		clearErrors();
		const localErrors: Record<string, string> = {};

		if (!data.customer_id) {
			localErrors.customer_id = 'El cliente es requerido.';
		}
		if (!data.payment_type) {
			localErrors.payment_type = 'El método de pago es requerido.';
		}
		if (!data.amount || parseFloat(data.amount) < 0) {
			localErrors.amount = 'El importe es requerido y debe ser mayor o igual a 0.';
		}
		if (!data.discount || parseFloat(data.discount) < 0) {
			localErrors.discount = 'El descuento debe ser mayor o igual a 0.';
		}

		if (data.payment_type !== 'credit' && !data.payment_method_date) {
			localErrors.payment_method_date = 'La fecha de pago es requerida.';
		}

		if (data.payment_type === 'cash') {
			if (!data.cash_value || parseFloat(data.cash_value) <= 0) {
				localErrors.cash_value = 'El valor recibido es requerido y debe ser mayor que 0.';
			}
		}

		if (data.payment_type === 'check') {
			if (!data.check_number) {
				localErrors.check_number = 'El número de cheque es requerido.';
			}
			if (!data.check_value || parseFloat(data.check_value) <= 0) {
				localErrors.check_value = 'El valor del cheque es requerido y debe ser mayor que 0.';
			}
		}

		if (data.payment_type === 'credit card') {
			if (!data.card_last_4 || data.card_last_4.length !== 4) {
				localErrors.card_last_4 = 'Se requieren los últimos 4 dígitos.';
			}
			if (!data.card_expiration) {
				localErrors.card_expiration = 'El vencimiento de la tarjeta es requerido.';
			} else if (!/^(0[1-9]|1[0-2])\/\d{2}(\d{2})?$/.test(data.card_expiration)) {
				localErrors.card_expiration = 'El vencimiento debe tener un formato como 12/26 o 12/2026.';
			}
			if (!data.card_authorization_code) {
				localErrors.card_authorization_code = 'El código de autorización es requerido.';
			}
			if (!data.card_value_charged || parseFloat(data.card_value_charged) <= 0) {
				localErrors.card_value_charged = 'El valor cobrado es requerido y debe ser mayor que 0.';
			}
		}

		if (data.payment_type === 'bank transfer') {
			if (!data.transfer_bank_id) {
				localErrors.transfer_bank_id = 'El banco es requerido.';
			}
			if (!data.transfer_authorization_code) {
				localErrors.transfer_authorization_code = 'El código de autorización/referencia es requerido.';
			}
			if (!data.transfer_value || parseFloat(data.transfer_value) <= 0) {
				localErrors.transfer_value = 'El valor transferido es requerido y debe ser mayor que 0.';
			}
		}

		if (Object.keys(localErrors).length > 0) {
			Object.entries(localErrors).forEach(([key, val]) => {
				setError(key as any, val);
			});
			toast.error('Por favor complete los campos obligatorios del formulario.');
			return false;
		}

		return true;
	};

	const handlePreSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (validateForm()) {
			setShowConfirm(true);
		}
	};

	const submitForm = () => {
		setShowConfirm(false);
		post(`/invoices/${invoice.id}`, {
			onSuccess: () => {
				toast.success('Factura actualizada correctamente');
				onSuccess();
			},
			onError: (err) => {
				toast.error('Error al guardar cambios.');
				console.error(err);
			}
		});
	};

	return (
		<form onSubmit={handlePreSubmit} className="space-y-6 px-5 py-2">
			{/* Cliente */}
			<div className="grid gap-2">
				<Label htmlFor="customer_id">Cliente / Paciente <span className="text-destructive">*</span></Label>
				<FormCombobox
					placeholder="Seleccione un Cliente"
					value={data.customer_id}
					onChange={(val) => setData('customer_id', val)}
					options={customers.map((c) => ({ label: `${c.name} (${c.id_number || 'Sin ID'})`, value: c.id.toString() }))}
				/>
				{errors.customer_id && <p className="text-xs text-destructive">{errors.customer_id}</p>}
			</div>

			{/* Método de Pago */}
			<div className="grid gap-2">
				<Label htmlFor="payment_type">Método de Pago <span className="text-destructive">*</span></Label>
				<Select value={data.payment_type} onValueChange={(val) => setData('payment_type', val)}>
					<SelectTrigger id="payment_type">
						<SelectValue placeholder="Seleccione un Método" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="cash">Efectivo</SelectItem>
						<SelectItem value="credit card">Tarjeta de Crédito</SelectItem>
						<SelectItem value="bank transfer">Transferencia Bancaria</SelectItem>
						<SelectItem value="check">Cheque</SelectItem>
						<SelectItem value="credit">Crédito</SelectItem>
					</SelectContent>
				</Select>
				{errors.payment_type && <p className="text-xs text-destructive">{errors.payment_type}</p>}
			</div>

			{/* Detalles según método */}
			{data.payment_type && data.payment_type !== 'credit' && (
				<div className="grid gap-2">
					<Label htmlFor="payment_method_date">Fecha de Pago <span className="text-destructive">*</span></Label>
					<Input
						id="payment_method_date"
						type="date"
						value={data.payment_method_date}
						onChange={(e) => setData('payment_method_date', e.target.value)}
						required
					/>
					{errors.payment_method_date && <p className="text-xs text-destructive">{errors.payment_method_date}</p>}
				</div>
			)}

			{/* Efectivo */}
			{data.payment_type === 'cash' && (
				<div className="grid gap-2 p-4 bg-muted/40 border rounded-lg">
					<Label htmlFor="cash_value">Valor Recibido (L.) <span className="text-destructive">*</span></Label>
					<Input
						id="cash_value"
						type="number"
						step="0.01"
						value={data.cash_value}
						onChange={(e) => setData('cash_value', e.target.value)}
						placeholder="0.00"
						className="font-mono"
						required
					/>
					{errors.cash_value && <p className="text-xs text-destructive">{errors.cash_value}</p>}
				</div>
			)}

			{/* Cheque */}
			{data.payment_type === 'check' && (
				<div className="grid gap-4 p-4 bg-muted/40 border rounded-lg">
					<div className="grid gap-2">
						<Label htmlFor="check_number">Número de Cheque <span className="text-destructive">*</span></Label>
						<Input
							id="check_number"
							type="text"
							value={data.check_number}
							onChange={(e) => setData('check_number', e.target.value)}
							placeholder="Ej. 123456"
							required
						/>
						{errors.check_number && <p className="text-xs text-destructive">{errors.check_number}</p>}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="check_value">Valor del Cheque (L.) <span className="text-destructive">*</span></Label>
						<Input
							id="check_value"
							type="number"
							step="0.01"
							value={data.check_value}
							onChange={(e) => setData('check_value', e.target.value)}
							placeholder="0.00"
							className="font-mono"
							required
						/>
						{errors.check_value && <p className="text-xs text-destructive">{errors.check_value}</p>}
					</div>
				</div>
			)}

			{/* Tarjeta de Crédito */}
			{data.payment_type === 'credit card' && (
				<div className="grid gap-4 p-4 bg-muted/40 border rounded-lg">
					<div className="grid grid-cols-2 gap-4">
						<div className="grid gap-2">
							<Label htmlFor="card_last_4">Últimos 4 Dígitos <span className="text-destructive">*</span></Label>
							<Input
								id="card_last_4"
								type="text"
								maxLength={4}
								value={data.card_last_4}
								onChange={(e) => setData('card_last_4', e.target.value.replace(/\D/g, ''))}
								placeholder="1234"
								required
							/>
							{errors.card_last_4 && <p className="text-xs text-destructive">{errors.card_last_4}</p>}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="card_expiration">Vencimiento <span className="text-destructive">*</span></Label>
							<Input
								id="card_expiration"
								type="text"
								placeholder="MM/AA o MM/AAAA"
								maxLength={7}
								value={data.card_expiration}
								onChange={(e) => setData('card_expiration', formatCardExpiration(e.target.value))}
								required
							/>
							{errors.card_expiration && <p className="text-xs text-destructive">{errors.card_expiration}</p>}
						</div>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="card_authorization_code">Código de Autorización <span className="text-destructive">*</span></Label>
						<Input
							id="card_authorization_code"
							type="text"
							value={data.card_authorization_code}
							onChange={(e) => setData('card_authorization_code', e.target.value)}
							placeholder="Ej. 987654"
							required
						/>
						{errors.card_authorization_code && <p className="text-xs text-destructive">{errors.card_authorization_code}</p>}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="card_value_charged">Monto Cargado (L.) <span className="text-destructive">*</span></Label>
						<Input
							id="card_value_charged"
							type="number"
							step="0.01"
							value={data.card_value_charged}
							onChange={(e) => setData('card_value_charged', e.target.value)}
							placeholder="0.00"
							className="font-mono"
							required
						/>
						{errors.card_value_charged && <p className="text-xs text-destructive">{errors.card_value_charged}</p>}
					</div>
				</div>
			)}

			{/* Transferencia Bancaria */}
			{data.payment_type === 'bank transfer' && (
				<div className="grid gap-4 p-4 bg-muted/40 border rounded-lg">
					<div className="grid gap-2">
						<Label htmlFor="transfer_bank_id">Banco <span className="text-destructive">*</span></Label>
						<Select
							value={data.transfer_bank_id}
							onValueChange={(val) => setData('transfer_bank_id', val)}
						>
							<SelectTrigger id="transfer_bank_id" className="w-full">
								<SelectValue placeholder="Seleccione un Banco" />
							</SelectTrigger>
							<SelectContent>
								{banks && banks.length > 0 ? (
									banks.map((bank: any) => (
										<SelectItem key={bank.id} value={bank.id.toString()}>
											{bank.name}
										</SelectItem>
									))
								) : (
									<SelectItem value="none" disabled>No hay bancos registrados</SelectItem>
								)}
							</SelectContent>
						</Select>
						{errors.transfer_bank_id && <p className="text-xs text-destructive">{errors.transfer_bank_id}</p>}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="transfer_authorization_code">Código de Autorización / Referencia <span className="text-destructive">*</span></Label>
						<Input
							id="transfer_authorization_code"
							type="text"
							value={data.transfer_authorization_code}
							onChange={(e) => setData('transfer_authorization_code', e.target.value)}
							placeholder="Ej. 11223344"
							required
						/>
						{errors.transfer_authorization_code && <p className="text-xs text-destructive">{errors.transfer_authorization_code}</p>}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="transfer_value">Monto Transferido (L.) <span className="text-destructive">*</span></Label>
						<Input
							id="transfer_value"
							type="number"
							step="0.01"
							value={data.transfer_value}
							onChange={(e) => setData('transfer_value', e.target.value)}
							placeholder="0.00"
							className="font-mono"
							required
						/>
						{errors.transfer_value && <p className="text-xs text-destructive">{errors.transfer_value}</p>}
					</div>
				</div>
			)}

			{/* Totales de Facturación */}
			<div className="space-y-4 rounded-lg border p-4 bg-muted/20">
				<h4 className="text-sm font-bold text-primary flex items-center gap-1.5">
					Importes de Facturación
				</h4>
				<Separator />
				<div className="grid grid-cols-2 gap-4">
					<div className="grid gap-1.5">
						<Label htmlFor="amount">Importe Bruto (L.) <span className="text-destructive">*</span></Label>
						<Input
							id="amount"
							type="number"
							step="0.01"
							value={data.amount}
							onChange={(e) => setData('amount', e.target.value)}
							className="font-mono"
							required
						/>
						{errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor="discount">Descuento (L.) <span className="text-destructive">*</span></Label>
						<Input
							id="discount"
							type="number"
							step="0.01"
							value={data.discount}
							onChange={(e) => setData('discount', e.target.value)}
							className="font-mono"
							required
						/>
						{errors.discount && <p className="text-xs text-destructive">{errors.discount}</p>}
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4 pt-2">
					<div className="space-y-1">
						<span className="text-xs text-muted-foreground">Subtotal</span>
						<p className="text-sm font-semibold font-mono">L. {parseFloat(data.subtotal).toFixed(2)}</p>
					</div>
					<div className="space-y-1">
						<span className="text-xs text-muted-foreground">Total de Factura</span>
						<p className="text-sm font-bold font-mono text-primary">L. {parseFloat(data.total).toFixed(2)}</p>
					</div>
				</div>

				<div className="grid gap-1.5 pt-2">
					<Label htmlFor="total_paid">Total Pagado (L.) <span className="text-destructive">*</span></Label>
					<Input
						id="total_paid"
						type="number"
						step="0.01"
						value={data.total_paid}
						onChange={(e) => setData('total_paid', e.target.value)}
						className="font-mono"
						required
					/>
					{errors.total_paid && <p className="text-xs text-destructive">{errors.total_paid}</p>}
				</div>
			</div>

			{/* Comprobante de Pago */}
			{((data.payment_type !== 'cash' && data.payment_type !== 'credit')) && (
				<div className="grid gap-2 p-4 border rounded-lg bg-muted/10">
					<Label className="flex items-center gap-1.5">
						Comprobante de Pago
					</Label>
					<div className="flex flex-col gap-2">
						{invoice?.proof_of_payment && typeof invoice.proof_of_payment === 'string' && (
							<div className="flex items-center gap-2 p-2 bg-secondary rounded border">
								<FileText className="w-4 h-4 text-primary" />
								<span className="text-xs font-mono truncate max-w-[200px]">
									{invoice.proof_of_payment.split('/').pop()}
								</span>
								<a
									href={`/storage/${invoice.proof_of_payment}`}
									target="_blank"
									rel="noopener noreferrer"
									className="ml-auto inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
								>
									Ver actual <ExternalLink className="w-3 h-3" />
								</a>
							</div>
						)}
						<div className="flex items-center justify-center w-full">
							<label htmlFor="proof_of_payment" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-muted/40">
								<div className="flex flex-col items-center justify-center pt-3 pb-3">
									<Upload className="w-6 h-6 mb-2 text-muted-foreground" />
									<p className="text-xs text-muted-foreground">
										<span className="font-semibold">Haga clic para subir</span> o arrastre y suelte
									</p>
									<p className="text-[10px] text-muted-foreground/80 mt-0.5">
										PDF, PNG, JPG hasta 30MB
									</p>
								</div>
								<input
									id="proof_of_payment"
									type="file"
									accept="image/*,application/pdf"
									className="hidden"
									onChange={(e) => setData('proof_of_payment', e.target.files?.[0] || null)}
								/>
							</label>
						</div>
						{data.proof_of_payment && (
							<div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1.5 rounded border border-emerald-200">
								<Check className="w-4 h-4 shrink-0" />
								<span className="truncate font-semibold">{data.proof_of_payment.name}</span>
								<button type="button" onClick={() => setData('proof_of_payment', null)} className="ml-auto text-muted-foreground hover:text-foreground">
									<X className="w-3.5 h-3.5" />
								</button>
							</div>
						)}
						{errors.proof_of_payment && <p className="text-xs text-destructive">{errors.proof_of_payment}</p>}
					</div>
				</div>
			)}

			{/* Botones de acción */}
			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button
					type="submit"
					disabled={processing}
					className="w-full sm:w-auto"
				>
					{processing ? 'Guardando...' : 'Guardar Cambios'}
				</Button>
			</div>

			<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
				<AlertDialogContent className="max-w-[450px]">
					<AlertDialogHeader>
						<AlertDialogTitle>¿Está seguro de actualizar los datos de la factura?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción guardará permanentemente los cambios en la factura{data.regenerate_pdf && " y regenerará el archivo PDF de la factura correspondiente"}.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="flex items-center justify-between py-3 border-y my-4">
						<div className="flex flex-col gap-0.5">
							<Label htmlFor="dialog_regenerate_pdf" className="font-semibold cursor-pointer">
								Regenerar archivo PDF de la factura
							</Label>
							<span className="text-xs text-muted-foreground">
								Regenera el comprobante digital con los nuevos datos.
							</span>
						</div>
						<Switch
							id="dialog_regenerate_pdf"
							checked={data.regenerate_pdf}
							onCheckedChange={(checked) => setData('regenerate_pdf', checked)}
						/>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setShowConfirm(false)}>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={submitForm}
							className="bg-primary text-primary-foreground hover:bg-primary/90"
						>
							Sí, actualizar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</form>
	);
}
