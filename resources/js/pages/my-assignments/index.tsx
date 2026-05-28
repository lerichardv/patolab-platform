import { Head, router } from '@inertiajs/react';
import { format, add, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClipboardList, Eye, Microscope, Calendar, Clock, AlertCircle, Filter, CalendarClock, ChevronDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import SpecimenViewSheet from '../specimens/specimen-view-sheet';

interface Specimen {
	id: number;
	priority_id: number;
	sequence_code?: string;
	customer_relation?: {
		id: number;
		name: string;
		id_number: string;
	};
	type?: {
		id: number;
		name: string;
	};
	examination?: {
		id: number;
		name: string;
	};
	category?: {
		id: number;
		name: string;
		unit: string;
		quantity: number;
	};
	priority?: {
		id: number;
		name: string;
		color: string;
		order: number;
	};
	status: string;
	status_color?: string;
	created_at: string;
	invoice_relation?: any;
	users?: any[];
}

interface Priority {
	id: number;
	name: string;
	color: string;
	order: number;
}

interface Props {
	specimens: Specimen[];
	priorities: Priority[];
}

const ALL_STATUSES = [
	{ value: 'received', label: 'Recibida' },
	{ value: 'macroscopic_review', label: 'Rev. Macroscópica' },
	{ value: 'processing', label: 'En Proceso' },
	{ value: 'microscopic_review', label: 'Rev. Microscópica' },
	{ value: 'finalized', label: 'Finalizada' },
	{ value: 'delivered', label: 'Entregada' },
	{ value: 'cancelled', label: 'Cancelada' },
];

const STATUS_LABELS: Record<string, string> = {
	received: 'Recibida',
	macroscopic_review: 'Rev. Macroscópica',
	processing: 'En Proceso',
	microscopic_review: 'Rev. Microscópica',
	finalized: 'Finalizada',
	delivered: 'Entregada',
	cancelled: 'Cancelada',
};

// Calculate the due date based on specimen category configuration
const getDueDate = (specimen: Specimen): Date => {
	const createdAt = new Date(specimen.created_at);
	if (!specimen.category || !specimen.category.unit || !specimen.category.quantity) {
		return createdAt;
	}

	const unitMap: Record<string, string> = {
		'minutes': 'minutes',
		'hours': 'hours',
		'days': 'days',
		'weeks': 'weeks'
	};

	const duration = { [unitMap[specimen.category.unit] || 'days']: specimen.category.quantity };
	return add(createdAt, duration);
};

export default function MyAssignmentsIndex({ specimens, priorities }: Props) {
	const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null);
	const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);

	// Filters State: Defaults matching specimens board
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
		'received',
		'macroscopic_review',
		'processing',
		'microscopic_review',
	]);

	const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
		const today = new Date();
		const from = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
		const to = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
		return { from, to };
	});

	// Filter specimens client-side
	const filteredSpecimens = useMemo(() => {
		return specimens.filter(specimen => {
			const matchesStatus = selectedStatuses.includes(specimen.status);

			const specDateStr = format(new Date(specimen.created_at), 'yyyy-MM-dd');
			const matchesDate = (!dateRange.from || specDateStr >= dateRange.from) &&
				(!dateRange.to || specDateStr <= dateRange.to);

			return matchesStatus && matchesDate;
		});
	}, [specimens, selectedStatuses, dateRange]);

	// Group and sort filtered specimens by priority and due date desc
	const groupedSpecimens = useMemo(() => {
		const groups: Record<number, Specimen[]> = {};

		// Initialize groups
		priorities.forEach(p => {
			groups[p.id] = [];
		});

		// Distribute filtered specimens
		filteredSpecimens.forEach(specimen => {
			if (groups[specimen.priority_id]) {
				groups[specimen.priority_id].push(specimen);
			}
		});

		// Sort specimens within each priority by due date descending
		Object.keys(groups).forEach(key => {
			const numericKey = parseInt(key);
			groups[numericKey].sort((a, b) => {
				const dateA = getDueDate(a).getTime();
				const dateB = getDueDate(b).getTime();
				return dateB - dateA; // Descending
			});
		});

		return groups;
	}, [filteredSpecimens, priorities]);

	const handleViewSpecimen = (specimen: Specimen) => {
		setSelectedSpecimen(specimen);
		setIsViewSheetOpen(true);
	};

	return (
		<>
			<Head title="Mis Asignaciones" />
			<div className="flex h-full flex-1 flex-col gap-4 p-4">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<div className="flex items-center gap-2">
							<ClipboardList className="h-6 w-6 text-primary" />
							<h1 className="text-2xl font-bold tracking-tight">Mis Asignaciones</h1>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2 justify-end">
						{/* Estado Filter (Combobox Múltiple) */}
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline" className="h-10 gap-2 border bg-card hover:bg-accent/50 transition-colors">
									<Filter className="h-4 w-4 text-muted-foreground" />
									<span>Estados ({selectedStatuses.length})</span>
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-56 p-2" align="end">
								<div className="space-y-1.5">
									<div className="flex items-center justify-between px-2 py-1 border-b pb-1.5 text-xs text-muted-foreground">
										<span>Filtrar por estado</span>
										<button
											type="button"
											onClick={() => {
												if (selectedStatuses.length === ALL_STATUSES.length) {
													setSelectedStatuses([]);
												} else {
													setSelectedStatuses(ALL_STATUSES.map(s => s.value));
												}
											}}
											className="hover:text-primary transition-colors font-medium cursor-pointer"
										>
											{selectedStatuses.length === ALL_STATUSES.length ? 'Ninguno' : 'Todos'}
										</button>
									</div>
									<div className="max-h-60 overflow-y-auto space-y-1 pt-1">
										{ALL_STATUSES.map((status) => {
											const isChecked = selectedStatuses.includes(status.value);
											return (
												<div
													key={status.value}
													className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer select-none"
													onClick={() => {
														setSelectedStatuses(prev =>
															prev.includes(status.value)
																? prev.filter(s => s !== status.value)
																: [...prev, status.value]
														);
													}}
												>
													<Checkbox
														checked={isChecked}
														className="pointer-events-none"
														onCheckedChange={() => { }}
													/>
													<span>{status.label}</span>
												</div>
											);
										})}
									</div>
								</div>
							</PopoverContent>
						</Popover>

						{/* Rango de Fechas Filter */}
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline" className="h-10 gap-2 border bg-card hover:bg-accent/50 transition-colors">
									<CalendarClock className="h-4 w-4 text-muted-foreground" />
									<span>
										{dateRange.from && dateRange.to
											? `${format(new Date(dateRange.from + 'T00:00:00'), 'dd/MM/yyyy')} - ${format(new Date(dateRange.to + 'T00:00:00'), 'dd/MM/yyyy')}`
											: 'Cualquier fecha'}
									</span>
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-80 p-4" align="end">
								<div className="space-y-4">
									<div className="flex flex-col gap-1">
										<h4 className="font-medium text-sm">Rango de fechas</h4>
										<p className="text-xs text-muted-foreground">Muestras creadas entre estas fechas.</p>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<div className="space-y-1">
											<Label htmlFor="date-from" className="text-xs">Desde</Label>
											<Input
												id="date-from"
												type="date"
												value={dateRange.from}
												onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
												className="h-9 text-sm"
											/>
										</div>
										<div className="space-y-1">
											<Label htmlFor="date-to" className="text-xs">Hasta</Label>
											<Input
												id="date-to"
												type="date"
												value={dateRange.to}
												onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
												className="h-9 text-sm"
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
												setDateRange({ from, to });
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
												setDateRange({ from, to });
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
												setDateRange({ from, to });
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
												setDateRange({ from, to });
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
												setDateRange({ from: '', to: '' });
											}}
										>
											Limpiar filtros de fecha
										</Button>
									</div>
								</div>
							</PopoverContent>
						</Popover>
					</div>
				</div>

				<div className="flex flex-col gap-8">
					{priorities.map((priority) => {
						const list = groupedSpecimens[priority.id] || [];
						const priorityColor = priority.color || '#cbd5e1';
						const tableBg = `${priorityColor}05`; // subtle ~2% opacity
						const tableBorder = `${priorityColor}15`; // subtle border

						return (
							<div key={priority.id} className="flex flex-col gap-3">
								{/* Priority Section Header */}
								<div className="flex items-center gap-2 px-1">
									<div
										className="w-3 h-3 rounded-full shadow-sm"
										style={{ backgroundColor: priorityColor }}
									/>
									<h2 className="text-md font-bold tracking-tight">{priority.name}</h2>
									<Badge
										variant="secondary"
										className="ml-2 font-semibold text-xs px-2.5 py-0.5 rounded-full bg-secondary/80"
									>
										{list.length} {list.length === 1 ? 'muestra' : 'muestras'}
									</Badge>
								</div>

								{/* Table Wrapper with standard styling */}
								<div className="rounded-md border bg-card overflow-hidden">
									<div className="overflow-x-auto w-full">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className="w-[100px] font-semibold">Código</TableHead>
													<TableHead className="min-w-[75px] w-[95px] text-center font-semibold">Entrega</TableHead>
													<TableHead className="min-w-[180px] font-semibold">Paciente</TableHead>
													<TableHead className="min-w-[140px] font-semibold">Tipo de Muestra</TableHead>
													<TableHead className="min-w-[160px] font-semibold">Análisis</TableHead>
													<TableHead className="min-w-[120px] font-semibold">Estado</TableHead>
													<TableHead className="min-w-[140px] font-semibold">Fecha Registro</TableHead>
													<TableHead className="w-[80px] text-right font-semibold">Detalle</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{list.length > 0 ? (
													list.map((specimen) => {
														const dueDate = getDueDate(specimen);
														const statusName = STATUS_LABELS[specimen.status] || specimen.status;

														return (
															<TableRow
																key={specimen.id}
																className="group hover:bg-muted/30 cursor-pointer transition-colors border-border/40"
																onClick={() => handleViewSpecimen(specimen)}
															>
																<TableCell className="font-mono text-xs font-semibold text-primary">
																	{specimen.sequence_code || `#${specimen.id}`}
																</TableCell>
																{/* Visual Day Calendar Tear-off Widget */}
																<TableCell className="py-2.5">
																	{(() => {
																		const isLight = ['yellow', '#ffff00', '#facc15', '#eab308', '#ffeb3b'].includes(priorityColor.toLowerCase().trim());
																		return (
																			<div className="flex flex-col items-center justify-center border border-muted-foreground/20 rounded-md min-w-[62px] max-w-[62px] bg-background shadow-xs overflow-hidden text-center mx-auto">
																				<div
																					className={`w-full text-[8.5px] font-bold py-0.5 uppercase tracking-wider leading-none ${isLight ? 'text-neutral-900' : 'text-white'}`}
																					style={{ backgroundColor: priorityColor }}
																				>
																					{format(dueDate, 'MMM', { locale: es })}
																				</div>
																				<div className="text-base font-black px-1.5 py-0.5 leading-none mt-0.5 text-foreground">
																					{format(dueDate, 'dd')}
																				</div>
																				<div className="text-[8.5px] text-muted-foreground pb-1 leading-none mt-0.5">
																					{format(dueDate, 'HH:mm')}
																				</div>
																			</div>
																		);
																	})()}
																</TableCell>
																<TableCell className="font-medium text-foreground">
																	{specimen.customer_relation?.name || 'N/A'}
																</TableCell>
																<TableCell className="text-sm text-muted-foreground">
																	{specimen.type?.name || 'N/A'}
																</TableCell>
																<TableCell className="text-sm text-muted-foreground">
																	{specimen.examination?.name || 'N/A'}
																</TableCell>
																<TableCell>
																	<Badge
																		variant="outline"
																		className="text-white border-transparent py-0.5 px-2.5 font-semibold text-[11px]"
																		style={{ backgroundColor: specimen.status_color || '#cbd5e1' }}
																	>
																		{statusName}
																	</Badge>
																</TableCell>
																<TableCell className="text-xs text-muted-foreground">
																	{specimen.created_at
																		? format(new Date(specimen.created_at), 'dd/MM/yyyy h:mm a')
																		: 'N/A'}
																</TableCell>
																<TableCell className="text-right">
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
																		onClick={(e) => {
																			e.stopPropagation();
																			handleViewSpecimen(specimen);
																		}}
																		title="Ver detalles"
																	>
																		<Eye className="h-4 w-4" />
																	</Button>
																</TableCell>
															</TableRow>
														);
													})
												) : (
													<TableRow>
														<TableCell colSpan={8} className="h-20 text-center text-muted-foreground/60 text-sm">
															No hay muestras asignadas que coincidan con los filtros.
														</TableCell>
													</TableRow>
												)}
											</TableBody>
										</Table>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<SpecimenViewSheet
				specimen={selectedSpecimen}
				open={isViewSheetOpen}
				onOpenChange={setIsViewSheetOpen}
				onEditClick={() => {
					if (selectedSpecimen) {
						router.get('/specimens', {
							specimen: selectedSpecimen.sequence_code || String(selectedSpecimen.id),
							action: 'view'
						});
					}
				}}
			/>
		</>
	);
}
