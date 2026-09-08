import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock } from 'lucide-react';
import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { addDeliveryDuration } from '@/services/specimen-delivery-date';

interface DeliveryDatePreviewProps {
	startDate?: Date | string | null;
	quantity: number | string | null | undefined;
	unit: string | null | undefined;
	label?: string;
	variant?: 'client' | 'internal';
	className?: string;
}

function capitalize(str: string): string {
	if (!str) {
		return '';
	}

	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function DeliveryDatePreview({
	startDate,
	quantity,
	unit = 'days',
	label,
	variant = 'client',
	className,
}: DeliveryDatePreviewProps) {
	const qty = useMemo(() => {
		const num = parseInt(String(quantity || '0'), 10);

		return isNaN(num) || num <= 0 ? 0 : num;
	}, [quantity]);

	const activeUnit = unit || 'days';

	const calculation = useMemo(() => {
		if (!qty) {
			return null;
		}

		try {
			const base = startDate ? new Date(startDate) : new Date();
			const validBase = isNaN(base.getTime()) ? new Date() : base;
			const targetDate = addDeliveryDuration(validBase, qty, activeUnit);

			if (isNaN(targetDate.getTime())) {
				return null;
			}

			const isShortUnit =
				activeUnit === 'minutes' || activeUnit === 'hours';

			const formattedDate = capitalize(
				isShortUnit
					? format(targetDate, "d 'de' MMM, HH:mm 'hrs'", {
						locale: es,
					})
					: format(targetDate, "EEE, d 'de' MMM yyyy", { locale: es }),
			);

			const relativeStr = formatDistanceToNow(targetDate, {
				addSuffix: true,
				locale: es,
			});

			const fullDateStr = capitalize(
				format(targetDate, "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm", {
					locale: es,
				}),
			);

			return {
				targetDate,
				formattedDate,
				relativeStr,
				fullDateStr,
			};
		} catch {
			return null;
		}
	}, [startDate, qty, activeUnit]);

	const defaultLabel = 'Fecha Estimada';

	return (
		<div className="grid w-full gap-2">
			<Label className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
				<span className="flex items-center gap-1.5">
					{variant === 'internal' ? (
						<Clock className="h-3 w-3 text-indigo-500" />
					) : (
						<Calendar className="h-3 w-3 text-primary" />
					)}
					{label || defaultLabel}
				</span>
				{calculation && (
					<span className="text-[8px] font-normal text-muted-foreground/80">
						Días hábiles
					</span>
				)}
			</Label>

			{calculation ? (
				<div
					className={cn(
						'group relative flex h-9 w-full items-center justify-between gap-2 overflow-hidden rounded-md border px-2.5 py-1 text-xs shadow-xs transition-all',
						variant === 'internal'
							? 'border-indigo-500/30 text-foreground hover:border-indigo-500/50'
							: 'border-primary/30 text-foreground hover:border-primary/50',
						className,
					)}
					title={`${calculation.fullDateStr} (${calculation.relativeStr} • excluye fines de semana)`}
				>
					<div className="flex min-w-0 items-center gap-1.5 truncate">
						<span className="relative flex h-1.5 w-1.5 shrink-0">
							<span
								className={cn(
									'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
									variant === 'internal'
										? 'bg-indigo-400'
										: 'bg-primary/80',
								)}
							/>
							<span
								className={cn(
									'relative inline-flex h-1.5 w-1.5 rounded-full',
									variant === 'internal'
										? 'bg-indigo-500'
										: 'bg-primary',
								)}
							/>
						</span>
						<span className="truncate font-semibold tracking-tight text-foreground">
							{calculation.formattedDate}
						</span>
					</div>
					<span
						className={cn(
							'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tracking-tight',
							variant === 'internal'
								? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
								: 'bg-primary/15 text-primary',
						)}
					>
						{calculation.relativeStr}
					</span>
				</div>
			) : (
				<div
					className={cn(
						'flex h-9 w-full items-center gap-2 rounded-md border border-dashed border-border/80 bg-muted/20 px-2.5 py-1 text-xs text-muted-foreground/70',
						className,
					)}
				>
					<Calendar className="h-3.5 w-3.5 shrink-0 opacity-50" />
					<span className="truncate text-[11px]">
						Ingrese cantidad para calcular
					</span>
				</div>
			)}
		</div>
	);
}
