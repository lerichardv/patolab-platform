import { router } from '@inertiajs/react';
import { Mail, Paperclip, Send, User } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { sendEmail as priceQuoteSendEmail } from '@/actions/App/Http/Controllers/PriceQuoteController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

interface PriceQuoteSendEmailDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	priceQuote: any | null;
}

interface PriceQuoteSendEmailFormProps {
	priceQuote: any;
	onClose: () => void;
}

function PriceQuoteSendEmailForm({
	priceQuote,
	onClose,
}: PriceQuoteSendEmailFormProps) {
	const customerEmail = priceQuote.customer?.email?.trim() || '';
	const customerName = priceQuote.customer?.name || '-';
	const quoteId = priceQuote.price_quote_id || '';
	const totalAmount = priceQuote.total
		? Number(priceQuote.total).toFixed(2)
		: '0.00';

	const [recipientEmail, setRecipientEmail] = useState(customerEmail);
	const [subject, setSubject] = useState(`Cotización #${quoteId} — PatoLab`);
	const [customMessage, setCustomMessage] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [emailError, setEmailError] = useState('');

	const handleSend = (e: React.FormEvent) => {
		e.preventDefault();

		if (!priceQuote?.id) {
			return;
		}

		const trimmedEmail = recipientEmail.trim();

		if (!trimmedEmail) {
			setEmailError('El correo electrónico del destinatario es obligatorio.');

			return;
		}

		// Basic email format check
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		if (!emailRegex.test(trimmedEmail)) {
			setEmailError('Ingrese una dirección de correo electrónico válida.');

			return;
		}

		setEmailError('');
		setIsSubmitting(true);

		router.post(
			priceQuoteSendEmail.url(priceQuote.id),
			{
				recipient_email: trimmedEmail,
				subject: subject.trim() || undefined,
				custom_message: customMessage.trim() || undefined,
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					toast.success(`Cotización enviada exitosamente a ${trimmedEmail}`);
					setIsSubmitting(false);
					onClose();
				},
				onError: (errors) => {
					console.error('Error sending price quote email:', errors);
					const errorMsg =
						errors.email ||
						errors.recipient_email ||
						'No se pudo enviar el correo electrónico. Verifique la dirección o el servicio de correo.';

					toast.error(errorMsg);
					setIsSubmitting(false);
				},
			}
		);
	};

	return (
		<form onSubmit={handleSend} className="space-y-4 py-1">
			{/* Quote summary chip */}
			<div className="rounded-lg border bg-muted/50 p-3 text-xs space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="font-semibold text-foreground">
						Cotización:
					</span>
					<Badge variant="outline" className="font-mono text-xs">
						#{quoteId}
					</Badge>
				</div>
				<div className="flex items-center justify-between text-muted-foreground">
					<span>Cliente:</span>
					<span className="font-medium text-foreground">
						{customerName}
					</span>
				</div>
				<div className="flex items-center justify-between text-muted-foreground">
					<span>Total:</span>
					<span className="font-mono font-bold text-foreground">
						L. {totalAmount}
					</span>
				</div>
			</div>

			{/* Recipient Email */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<Label htmlFor="recipient_email" className="text-xs font-medium">
						Correo del Destinatario <span className="text-destructive">*</span>
					</Label>
					{customerEmail && recipientEmail !== customerEmail && (
						<button
							type="button"
							onClick={() => {
								setRecipientEmail(customerEmail);
								setEmailError('');
							}}
							className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
						>
							<User className="h-3 w-3" />
							Usar correo del cliente
						</button>
					)}
				</div>
				<Input
					id="recipient_email"
					type="email"
					placeholder="ejemplo@correo.com"
					value={recipientEmail}
					onChange={(e) => {
						setRecipientEmail(e.target.value);

						if (emailError) {
							setEmailError('');
						}
					}}
					disabled={isSubmitting}
					className={emailError ? 'border-destructive' : ''}
					autoFocus
				/>
				{emailError ? (
					<p className="text-[11px] font-medium text-destructive">
						{emailError}
					</p>
				) : customerEmail ? (
					<p className="text-[11px] text-muted-foreground">
						Correo registrado: <span className="font-medium">{customerEmail}</span>
					</p>
				) : (
					<p className="text-[11px] text-amber-600 dark:text-amber-400">
						El cliente no tiene correo registrado. Ingrese el correo deseado.
					</p>
				)}
			</div>

			{/* Subject */}
			<div className="space-y-1.5">
				<Label htmlFor="email_subject" className="text-xs font-medium">
					Asunto
				</Label>
				<Input
					id="email_subject"
					type="text"
					placeholder="Asunto del correo..."
					value={subject}
					onChange={(e) => setSubject(e.target.value)}
					disabled={isSubmitting}
				/>
			</div>

			{/* Custom Message */}
			<div className="space-y-1.5">
				<Label htmlFor="custom_message" className="text-xs font-medium">
					Mensaje Opcional (Nota adicional)
				</Label>
				<Textarea
					id="custom_message"
					placeholder="Escriba un mensaje personalizado o instrucciones para el cliente..."
					value={customMessage}
					onChange={(e) => setCustomMessage(e.target.value)}
					rows={3}
					disabled={isSubmitting}
					className="text-xs resize-none"
				/>
			</div>

			{/* Attachment badge info */}
			<div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
				<Paperclip className="h-4 w-4 shrink-0" />
				<span>
					El PDF de la cotización se adjuntará automáticamente al correo.
				</span>
			</div>

			<DialogFooter className="gap-2 pt-2">
				<Button
					type="button"
					variant="outline"
					onClick={onClose}
					disabled={isSubmitting}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					disabled={isSubmitting || !recipientEmail.trim()}
					className="gap-1.5"
				>
					{isSubmitting ? (
						<>
							<Spinner className="h-4 w-4" />
							<span>Enviando...</span>
						</>
					) : (
						<>
							<Send className="h-4 w-4" />
							<span>Enviar Correo</span>
						</>
					)}
				</Button>
			</DialogFooter>
		</form>
	);
}

export default function PriceQuoteSendEmailDialog({
	open,
	onOpenChange,
	priceQuote,
}: PriceQuoteSendEmailDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-foreground">
						<Mail className="h-5 w-5 text-primary" />
						Enviar Cotización por Correo
					</DialogTitle>
					<DialogDescription>
						Envíe el documento formal de la cotización en formato PDF al cliente o a un correo personalizado.
					</DialogDescription>
				</DialogHeader>

				{open && priceQuote && (
					<PriceQuoteSendEmailForm
						key={`${priceQuote.id}-${open}`}
						priceQuote={priceQuote}
						onClose={() => onOpenChange(false)}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
