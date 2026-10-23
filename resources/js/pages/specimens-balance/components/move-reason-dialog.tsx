import {
	ArrowRight,
	Calendar,
	FileText,
	MoveRight,
	User,
} from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SpecimenItem } from '../types';

interface MoveReasonDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	specimen: SpecimenItem | null;
	sourceDate?: string;
	targetDate?: string;
	sourcePathologistName?: string;
	targetPathologistName?: string;
	onConfirm: (reason: string) => void;
	onCancel: () => void;
	isSubmitting?: boolean;
}

interface MoveReasonBodyProps {
	specimen: SpecimenItem | null;
	sourceDate?: string;
	targetDate?: string;
	sourcePathologistName?: string;
	targetPathologistName?: string;
	onConfirm: (reason: string) => void;
	onCancel: () => void;
	isSubmitting: boolean;
}

const MoveReasonDialogBody: React.FC<MoveReasonBodyProps> = ({
	specimen,
	sourceDate,
	targetDate,
	sourcePathologistName,
	targetPathologistName,
	onConfirm,
	onCancel,
	isSubmitting,
}) => {
	const [reason, setReason] = useState('');
	const [error, setError] = useState<string | null>(null);

	const handleConfirm = () => {
		const trimmed = reason.trim();

		if (!trimmed) {
			setError('El motivo del movimiento es obligatorio.');

			return;
		}

		setError(null);
		onConfirm(trimmed);
	};

	const isDateChanged = Boolean(
		sourceDate && targetDate && sourceDate !== targetDate,
	);
	const isPathologistChanged = Boolean(
		sourcePathologistName &&
		targetPathologistName &&
		sourcePathologistName !== targetPathologistName,
	);

	return (
		<>
			<DialogHeader className="gap-1 text-left">
				<DialogTitle className="flex items-center gap-2 text-base font-semibold">
					<MoveRight className="h-5 w-5 text-primary" />
					<span>Confirmar movimiento de muestra</span>
				</DialogTitle>
				<DialogDescription className="text-xs text-muted-foreground">
					Por favor ingrese el motivo obligatorio para registrar este
					cambio en el tablero y en el historial de auditoría.
				</DialogDescription>
			</DialogHeader>

			{/* Resumen de la muestra y cambios */}
			{specimen && (
				<div className="space-y-3 rounded-lg border bg-muted/40 p-3 text-xs">
					{/* Cabecera de la muestra */}
					<div className="flex items-center justify-between border-b pb-2">
						<div className="font-mono font-bold text-foreground">
							{specimen.sequence_code}
						</div>
						<div className="max-w-[200px] truncate text-muted-foreground">
							{specimen.customer_name}
						</div>
					</div>

					{/* Detalle de Tipo y Examen */}
					<div className="flex items-center gap-1.5 text-muted-foreground">
						<FileText className="h-3.5 w-3.5 shrink-0" />
						<span className="truncate">
							{specimen.type_name}
							{specimen.examination_name &&
								` - ${specimen.examination_name}`}
						</span>
					</div>

					{/* Cambio de Fecha */}
					{isDateChanged && (
						<div className="flex items-center gap-2 rounded-md bg-background/80 px-2.5 py-1.5 text-xs">
							<Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
							<span className="text-muted-foreground">
								Fecha:
							</span>
							<span className="font-medium text-foreground">
								{sourceDate}
							</span>
							<ArrowRight className="h-3 w-3 text-muted-foreground" />
							<span className="font-semibold text-primary">
								{targetDate}
							</span>
						</div>
					)}

					{/* Cambio de Patólogo */}
					{isPathologistChanged && (
						<div className="flex items-center gap-2 rounded-md bg-background/80 px-2.5 py-1.5 text-xs">
							<User className="h-3.5 w-3.5 shrink-0 text-amber-500" />
							<span className="text-muted-foreground">
								Patólogo:
							</span>
							<span className="font-medium text-foreground">
								{sourcePathologistName}
							</span>
							<ArrowRight className="h-3 w-3 text-muted-foreground" />
							<span className="font-semibold text-amber-600 dark:text-amber-400">
								{targetPathologistName}
							</span>
						</div>
					)}
				</div>
			)}

			{/* Campo de Motivo */}
			<div className="space-y-1.5">
				<Label htmlFor="move_reason" className="text-xs font-medium mb-1">
					Motivo del movimiento{' '}
					<span className="text-destructive">*</span>
				</Label>
				<Textarea
					id="move_reason"
					placeholder="Describa el motivo por el cual se mueve esta muestra (ej. reprogramación por carga, cambio solicitado por médico, etc.)..."
					value={reason}
					onChange={(e) => {
						setReason(e.target.value);

						if (error && e.target.value.trim()) {
							setError(null);
						}
					}}
					rows={3}
					className="resize-none text-xs"
					autoFocus
				/>
				{error && (
					<p className="text-[11px] font-medium text-destructive">
						{error}
					</p>
				)}
				<p className="text-[11px] text-muted-foreground">
					Este motivo y su fecha serán guardados en el registro de
					auditoría del sistema.
				</p>
			</div>

			<DialogFooter className="gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onCancel}
					disabled={isSubmitting}
				>
					Cancelar
				</Button>
				<Button
					type="button"
					size="sm"
					onClick={handleConfirm}
					disabled={!reason.trim() || isSubmitting}
				>
					{isSubmitting
						? 'Guardando...'
						: 'Confirmar movimiento'}
				</Button>
			</DialogFooter>
		</>
	);
};

export const MoveReasonDialog: React.FC<MoveReasonDialogProps> = ({
	open,
	onOpenChange,
	specimen,
	sourceDate,
	targetDate,
	sourcePathologistName,
	targetPathologistName,
	onConfirm,
	onCancel,
	isSubmitting = false,
}) => {
	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					onCancel();
				} else {
					onOpenChange(isOpen);
				}
			}}
		>
			<DialogContent
				className="max-w-md gap-4 sm:max-w-2xl"
				onPointerDownOutside={(e) => {
					// Prevent accidental clicks outside from silently submitting without reason
					e.preventDefault();
					onCancel();
				}}
			>
				{open && (
					<MoveReasonDialogBody
						specimen={specimen}
						sourceDate={sourceDate}
						targetDate={targetDate}
						sourcePathologistName={sourcePathologistName}
						targetPathologistName={targetPathologistName}
						onConfirm={onConfirm}
						onCancel={onCancel}
						isSubmitting={isSubmitting}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
};
