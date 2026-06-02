import * as React from 'react';
import { format, add, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarClock, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateRange {
	from: string;
	to: string;
}

interface DateRangePickerProps {
	value: DateRange;
	onChange: (value: DateRange) => void;
	placeholder?: string;
	align?: 'start' | 'center' | 'end';
}

export function DateRangePicker({
	value,
	onChange,
	placeholder = 'Cualquier fecha',
	align = 'end'
}: DateRangePickerProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" className="h-10 gap-2 border bg-card hover:bg-accent/50 transition-colors w-full justify-between lg:justify-start">
					<span className="flex items-center gap-2 truncate">
						<CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
						<span className="truncate">
							{value.from && value.to
								? `${format(new Date(value.from + 'T00:00:00'), 'dd/MM/yyyy')} - ${format(new Date(value.to + 'T00:00:00'), 'dd/MM/yyyy')}`
								: placeholder}
						</span>
					</span>
					<ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-4" align={align}>
				<div className="space-y-4">
					<div className="flex flex-col gap-1">
						<h4 className="font-medium text-sm">Rango de fechas</h4>
						<p className="text-xs text-muted-foreground">Filtrar registros creados entre estas fechas.</p>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label htmlFor="date-from" className="text-xs">Desde</Label>
							<Input
								id="date-from"
								type="date"
								value={value.from || ''}
								onChange={(e) => onChange({ ...value, from: e.target.value })}
								className="h-9 text-sm w-full"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="date-to" className="text-xs">Hasta</Label>
							<Input
								id="date-to"
								type="date"
								value={value.to || ''}
								onChange={(e) => onChange({ ...value, to: e.target.value })}
								className="h-9 text-sm w-full"
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-1.5 pt-2 border-t text-xs">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 text-xs font-normal"
							onClick={() => {
								const today = new Date();
								const from = format(today, 'yyyy-MM-dd');
								const to = format(today, 'yyyy-MM-dd');
								onChange({ from, to });
							}}
						>
							Hoy
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 text-xs font-normal"
							onClick={() => {
								const today = new Date();
								const from = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
								const to = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
								onChange({ from, to });
							}}
						>
							Esta semana
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 text-xs font-normal"
							onClick={() => {
								const today = new Date();
								const from = format(add(today, { days: -7 }), 'yyyy-MM-dd');
								const to = format(today, 'yyyy-MM-dd');
								onChange({ from, to });
							}}
						>
							Últimos 7 días
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 text-xs font-normal"
							onClick={() => {
								const today = new Date();
								const from = format(add(today, { days: -30 }), 'yyyy-MM-dd');
								const to = format(today, 'yyyy-MM-dd');
								onChange({ from, to });
							}}
						>
							Últimos 30 días
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="col-span-2 h-7 text-xs font-normal text-muted-foreground hover:text-foreground"
							onClick={() => {
								onChange({ from: '', to: '' });
							}}
						>
							Limpiar filtros de fecha
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
