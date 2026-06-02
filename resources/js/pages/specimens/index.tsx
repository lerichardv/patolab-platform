import type {
	DropResult
} from '@hello-pangea/dnd';
import {
	DragDropContext,
	Droppable,
	Draggable
} from '@hello-pangea/dnd';
import { Head, router, usePage } from '@inertiajs/react';
import { formatDistanceToNow, add, isPast, isToday, format, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Microscope, Edit2, Trash2, Tag, CalendarClock, FileText, ExternalLink, ChevronLeft, ChevronRight, MoreVertical, UserPlus, ChevronDown, Layers, Check, Filter } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { DateRangePicker } from '@/components/date-range-picker';
import { useIsMobile } from '@/hooks/use-mobile';
import {
	updateOrder as updateSpecimenOrder,
	destroy as destroySpecimen
} from '@/actions/App/Http/Controllers/SpecimenController';
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
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import SpecimenSheet from './specimen-sheet';
import SpecimenGroupSheet from './specimen-group-sheet';
import SpecimenViewSheet from './specimen-view-sheet';
import SpecimenPathologistSheet from './specimen-pathologist-sheet';
import SpecimenBulkPathologistSheet from './specimen-bulk-pathologist-sheet';
import InvoiceSheet from '../invoices/invoice-sheet';

interface Specimen {
	id: number;
	priority_id: number;
	customer_relation: any;
	type: any;
	examination: any;
	category: any;
	referrer_relation: any;
	anatomic_site: string;
	diagnosis: string | null;
	clinical_notes: string | null;
	status: string;
	status_color?: string;
	sequence_code?: string;
	created_at: string;
	invoice_relation?: any;
	users?: any[];
	group?: any;
	group_id?: any;
}

interface Priority {
	id: number;
	name: string;
	color: string;
	specimens: Specimen[];
}

interface Props {
	priorities: Priority[];
	customers: any[];
	specimenTypes: any[];
	examinations: any[];
	categories: any[];
	referrers: any[];
	referrerTypes: any[];
	locations: any[];
	sequences: any[];
	activeLocationId: number | null;
	products: any[];
	pathologists: any[];
	banks: any[];
}


const getDueDateInfo = (specimen: Specimen) => {
	if (!specimen.category || !specimen.category.unit || !specimen.category.quantity) {
		return null;
	}

	const createdAt = new Date(specimen.created_at);
	const unitMap: Record<string, string> = {
		'minutes': 'minutes',
		'hours': 'hours',
		'days': 'days',
		'weeks': 'weeks'
	};

	const duration = { [unitMap[specimen.category.unit] || 'days']: specimen.category.quantity };
	const dueDate = add(createdAt, duration);

	const isCompleted = ['finalized', 'delivered', 'cancelled'].includes(specimen.status);

	let colorClass = 'bg-secondary text-secondary-foreground border-transparent';

	if (!isCompleted) {
		if (isToday(dueDate)) {
			colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50';
		} else if (isPast(dueDate)) {
			colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50';
		} else {
			colorClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
		}
	}

	const timeDefined = `${specimen.category.quantity} ${specimen.category.unit === 'minutes' ? 'minutos' :
		specimen.category.unit === 'hours' ? 'horas' :
			specimen.category.unit === 'days' ? 'días' :
				specimen.category.unit === 'weeks' ? 'semanas' : specimen.category.unit
		}`;

	const dueDateFormatted = formatDistanceToNow(dueDate, { addSuffix: true, locale: es });
	const fullDueDate = format(dueDate, 'dd/MM/yyyy HH:mm');

	return {
		timeDefined,
		dueDateFormatted,
		fullDueDate,
		colorClass
	};
};

const ALL_STATUSES = [
	{ value: 'received', label: 'Recibida' },
	{ value: 'macroscopic_review', label: 'Rev. Macroscópica' },
	{ value: 'processing', label: 'En Proceso' },
	{ value: 'microscopic_review', label: 'Rev. Microscópica' },
	{ value: 'finalized', label: 'Finalizada' },
	{ value: 'delivered', label: 'Entregada' },
	{ value: 'cancelled', label: 'Cancelada' },
];

const deduplicateSpecimens = (prioritiesList: Priority[]): Priority[] => {
	const seenIds = new Set<number>();
	return prioritiesList.map(priority => {
		const uniqueSpecimens = (priority.specimens || []).filter(specimen => {
			if (seenIds.has(specimen.id)) {
				return false;
			}
			seenIds.add(specimen.id);
			return true;
		});
		return {
			...priority,
			specimens: uniqueSpecimens
		};
	});
};

export default function SpecimensIndex({ priorities: initialPriorities, customers, specimenTypes, examinations, categories, referrers, referrerTypes, locations, sequences, activeLocationId, products, pathologists, banks }: Props) {
	const { props } = usePage() as any;
	const flash = props.flash || {};
	const isMobile = useIsMobile();

	const [priorities, setPriorities] = useState<Priority[]>(() => deduplicateSpecimens(initialPriorities));
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isGroupSheetOpen, setIsGroupSheetOpen] = useState(false);
	const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [specimenToDelete, setSpecimenToDelete] = useState<Specimen | null>(null);

	const [isAssignSheetOpen, setIsAssignSheetOpen] = useState(false);
	const [selectedSpecimenForAssign, setSelectedSpecimenForAssign] = useState<Specimen | null>(null);

	const [selectedSpecimenForView, setSelectedSpecimenForView] = useState<Specimen | null>(null);
	const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);

	const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
	const [paymentInvoiceUrl, setPaymentInvoiceUrl] = useState<string | null>(null);
	const [activePdf, setActivePdf] = useState<'invoice' | 'payment_invoice'>('invoice');
	const [showInvoiceModal, setShowInvoiceModal] = useState(false);

	const [isSelectionMode, setIsSelectionMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
	const [isBulkAssignSheetOpen, setIsBulkAssignSheetOpen] = useState(false);

	const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
	const [isInvoiceSheetOpen, setIsInvoiceSheetOpen] = useState(false);

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

	const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
	const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);

	const availableGroups = useMemo(() => {
		const groupsMap = new Map<string, { id: string; name: string }>();
		priorities.forEach(priority => {
			priority.specimens.forEach(specimen => {
				const matchesStatus = selectedStatuses.includes(specimen.status);
				const specDateStr = format(new Date(specimen.created_at), 'yyyy-MM-dd');
				const matchesDate = (!dateRange.from || specDateStr >= dateRange.from) &&
					(!dateRange.to || specDateStr <= dateRange.to);

				if (matchesStatus && matchesDate && specimen.group) {
					groupsMap.set(specimen.group.id.toString(), {
						id: specimen.group.id.toString(),
						name: specimen.group.name
					});
				}
			});
		});
		return Array.from(groupsMap.values());
	}, [priorities, selectedStatuses, dateRange]);

	useEffect(() => {
		if (selectedGroupId !== 'all' && !availableGroups.some(g => g.id === selectedGroupId)) {
			setSelectedGroupId('all');
		}
	}, [availableGroups, selectedGroupId]);

	const filteredPriorities = useMemo(() => {
		return priorities.map(priority => {
			const filteredSpecimens = priority.specimens.filter(specimen => {
				const matchesStatus = selectedStatuses.includes(specimen.status);

				const specDateStr = format(new Date(specimen.created_at), 'yyyy-MM-dd');
				const matchesDate = (!dateRange.from || specDateStr >= dateRange.from) &&
					(!dateRange.to || specDateStr <= dateRange.to);

				const matchesGroup = selectedGroupId === 'all' ||
					(specimen.group_id?.toString() === selectedGroupId);

				return matchesStatus && matchesDate && matchesGroup;
			});
			return {
				...priority,
				specimens: filteredSpecimens
			};
		});
	}, [priorities, selectedStatuses, dateRange, selectedGroupId]);

	const visibleSpecimenIds = useMemo(() => {
		return filteredPriorities.flatMap(p => p.specimens.map(s => s.id));
	}, [filteredPriorities]);

	const isAllVisibleSelected = useMemo(() => {
		if (visibleSpecimenIds.length === 0) return false;
		return visibleSpecimenIds.every(id => selectedIds.includes(id));
	}, [visibleSpecimenIds, selectedIds]);

	const handleSelectAllVisible = () => {
		if (isAllVisibleSelected) {
			setSelectedIds(prev => prev.filter(id => !visibleSpecimenIds.includes(id)));
		} else {
			setSelectedIds(prev => Array.from(new Set([...prev, ...visibleSpecimenIds])));
		}
	};

	useEffect(() => {
		setPriorities(deduplicateSpecimens(initialPriorities));
	}, [initialPriorities]);

	const findSpecimenById = (id: number): Specimen | null => {
		for (const p of priorities) {
			const found = p.specimens.find(s => s.id === id);

			if (found) {
				return found;
			}
		}

		return null;
	};

	const toggleSelectSpecimen = (id: number) => {
		setSelectedIds(prev =>
			prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
		);
	};

	const selectedSpecimens = useMemo(() => {
		const list: Specimen[] = [];
		for (const p of priorities) {
			for (const s of p.specimens) {
				if (selectedIds.includes(s.id)) {
					list.push(s);
				}
			}
		}
		return list;
	}, [priorities, selectedIds]);

	const handleBulkChangeStatus = (status: string) => {
		router.post('/specimens/bulk-action', {
			ids: selectedIds,
			action: 'change_status',
			value: status
		}, {
			preserveScroll: true,
			preserveState: true,
			onSuccess: () => {
				toast.success('Estados de muestras actualizados');
				setSelectedIds([]);
				setIsSelectionMode(false);
			},
			onError: () => {
				toast.error('Error al actualizar los estados');
			}
		});
	};

	const handleBulkChangePriority = (priorityId: number) => {
		router.post('/specimens/bulk-action', {
			ids: selectedIds,
			action: 'change_priority',
			value: priorityId
		}, {
			preserveScroll: true,
			preserveState: true,
			onSuccess: () => {
				toast.success('Prioridades de muestras actualizadas');
				setSelectedIds([]);
				setIsSelectionMode(false);
			},
			onError: () => {
				toast.error('Error al actualizar las prioridades');
			}
		});
	};

	const confirmBulkDelete = () => {
		router.post('/specimens/bulk-action', {
			ids: selectedIds,
			action: 'delete'
		}, {
			preserveScroll: true,
			preserveState: true,
			onSuccess: () => {
				toast.success('Muestras desactivadas con éxito');
				setSelectedIds([]);
				setIsSelectionMode(false);
				setIsBulkDeleteDialogOpen(false);
			},
			onError: () => {
				toast.error('Error al desactivar las muestras');
			}
		});
	};

	const handleAssignClick = (specimen: Specimen) => {
		setSelectedSpecimenForAssign(specimen);
		setIsAssignSheetOpen(true);
	};

	const activeAssignSpecimen = selectedSpecimenForAssign
		? findSpecimenById(selectedSpecimenForAssign.id)
		: null;

	useEffect(() => {
		if (flash.new_invoice_url) {
			setInvoiceUrl(flash.new_invoice_url);

			if (flash.new_payment_invoice_url) {
				setPaymentInvoiceUrl(flash.new_payment_invoice_url);
			} else {
				setPaymentInvoiceUrl(null);
			}

			setActivePdf('invoice');
			setShowInvoiceModal(true);
		}
	}, [flash.new_invoice_url, flash.new_payment_invoice_url]);

	useEffect(() => {
		if (flash.new_specimen_id) {
			const specId = parseInt(flash.new_specimen_id);
			const found = findSpecimenById(specId);

			if (found) {
				setIsSheetOpen(false);
				setSelectedSpecimen(null);

				setSelectedSpecimenForView(found);
				setIsViewSheetOpen(true);
			}
		}
	}, [flash.new_specimen_id, priorities]);

	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const specimenParam = urlParams.get('specimen');
		const action = urlParams.get('action');

		if (specimenParam && action === 'view' && priorities.length > 0) {
			let found: Specimen | null = null;
			for (const p of priorities) {
				const spec = p.specimens.find((s) => {
					// Match by sequence_code (case insensitive)
					if (s.sequence_code?.toLowerCase() === specimenParam.toLowerCase()) {
						return true;
					}
					// Fallback to match by numeric id
					const parsedId = parseInt(specimenParam);
					if (!isNaN(parsedId) && s.id === parsedId) {
						return true;
					}
					return false;
				});
				if (spec) {
					found = spec;
					break;
				}
			}

			if (found) {
				setIsSheetOpen(false);
				setSelectedSpecimen(null);
				setSelectedSpecimenForView(found);
				setIsViewSheetOpen(true);

				// Clean the query parameters from URL to avoid re-triggering on fresh re-renders/navs
				const newUrl = window.location.pathname;
				window.history.replaceState({}, '', newUrl);
			}
		}
	}, [priorities]);

	const onDragEnd = (result: DropResult) => {
		const { source, destination, draggableId } = result;

		if (!destination) {
			return;
		}

		if (
			source.droppableId === destination.droppableId &&
			source.index === destination.index
		) {
			return;
		}

		const movedSpecimenId = parseInt(draggableId);
		const sourcePriorityId = parseInt(source.droppableId);
		const destPriorityId = parseInt(destination.droppableId);

		const sourcePriorityIndex = priorities.findIndex(p => p.id === sourcePriorityId);
		const destPriorityIndex = priorities.findIndex(p => p.id === destPriorityId);

		const sourcePriority = priorities[sourcePriorityIndex];
		const destPriority = priorities[destPriorityIndex];

		const sourceSpecimens = [...sourcePriority.specimens];
		const destSpecimens = sourcePriorityId === destPriorityId
			? sourceSpecimens
			: [...destPriority.specimens];

		// Find the index of the moved specimen in the unfiltered source specimens list
		const unfilteredSourceIndex = sourceSpecimens.findIndex(s => s.id === movedSpecimenId);
		if (unfilteredSourceIndex === -1) return;

		const [movedSpecimen] = sourceSpecimens.splice(unfilteredSourceIndex, 1);
		movedSpecimen.priority_id = destPriorityId;

		// Calculate the filtered list of specimens in destination priority to find the target position
		const destFilteredSpecimens = destPriority.specimens.filter(specimen => {
			const matchesStatus = selectedStatuses.includes(specimen.status);
			const specDateStr = format(new Date(specimen.created_at), 'yyyy-MM-dd');
			const matchesDate = (!dateRange.from || specDateStr >= dateRange.from) &&
				(!dateRange.to || specDateStr <= dateRange.to);
			return matchesStatus && matchesDate;
		});

		const destFilteredSpecimensWithoutMoved = sourcePriorityId === destPriorityId
			? destFilteredSpecimens.filter(s => s.id !== movedSpecimenId)
			: destFilteredSpecimens;

		const targetSpecimen = destFilteredSpecimensWithoutMoved[destination.index];
		let unfilteredDestIndex = -1;
		if (targetSpecimen) {
			unfilteredDestIndex = destSpecimens.findIndex(s => s.id === targetSpecimen.id);
		}

		if (unfilteredDestIndex !== -1) {
			destSpecimens.splice(unfilteredDestIndex, 0, movedSpecimen);
		} else {
			destSpecimens.push(movedSpecimen);
		}

		const newPriorities = [...priorities];
		newPriorities[sourcePriorityIndex] = {
			...sourcePriority,
			specimens: sourceSpecimens,
		};

		if (sourcePriorityId !== destPriorityId) {
			newPriorities[destPriorityIndex] = {
				...destPriority,
				specimens: destSpecimens,
			};

			const specimenIdentifier = movedSpecimen.sequence_code
				? `${movedSpecimen.sequence_code} - ${movedSpecimen.customer_relation?.name || ''}`
				: movedSpecimen.customer_relation?.name || `Muestra #${movedSpecimen.id}`;

			toast.success('Prioridad de muestra actualizada', {
				description: `La muestra "${specimenIdentifier}" ha sido trasladada a la prioridad "${destPriority.name}".`,
			});
		}

		setPriorities(newPriorities);

		// Prepare the payload for updateOrder
		const itemsToUpdate = destSpecimens.map((specimen, index) => ({
			id: specimen.id,
			priority_id: destPriorityId,
			order: index + 1
		}));

		router.post(updateSpecimenOrder().url, { items: itemsToUpdate }, {
			preserveScroll: true,
			preserveState: true,
			onError: () => {
				toast.error('Error al actualizar el orden');
				setPriorities(deduplicateSpecimens(initialPriorities)); // Revert on error
			}
		});
	};

	const handleCreate = () => {
		setSelectedSpecimen(null);
		setIsSheetOpen(true);
	};

	const handleEdit = (specimen: Specimen) => {
		setSelectedSpecimen(specimen);
		setIsSheetOpen(true);
	};

	const handleView = (specimen: Specimen) => {
		setSelectedSpecimenForView(specimen);
		setIsViewSheetOpen(true);
	};

	const handleEditFromView = () => {
		if (selectedSpecimenForView) {
			setSelectedSpecimen(selectedSpecimenForView);
			setIsViewSheetOpen(false);
			setIsSheetOpen(true);
		}
	};

	const handleDeleteClick = (specimen: Specimen) => {
		setSpecimenToDelete(specimen);
		setIsDeleteDialogOpen(true);
	};

	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const [mouseY, setMouseY] = useState(0);
	const [isNearLeft, setIsNearLeft] = useState(false);
	const [isNearRight, setIsNearRight] = useState(false);

	const updateScrollState = () => {
		const el = scrollContainerRef.current;

		if (el) {
			setCanScrollLeft(el.scrollLeft > 5);
			setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
		}
	};

	useEffect(() => {
		updateScrollState();
		window.addEventListener('resize', updateScrollState);

		return () => window.removeEventListener('resize', updateScrollState);
	}, [priorities]);

	const handleScroll = () => {
		updateScrollState();
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		const el = scrollContainerRef.current;

		if (!el) {
			return;
		}

		const rect = el.getBoundingClientRect();

		const relativeY = e.clientY - rect.top;
		setMouseY(relativeY);

		const relativeX = e.clientX - rect.left;
		const threshold = 80; // Distance in pixels to activate
		setIsNearLeft(relativeX >= 0 && relativeX < threshold);
		setIsNearRight(relativeX > rect.width - threshold && relativeX <= rect.width);
	};

	const handleMouseLeave = () => {
		setIsNearLeft(false);
		setIsNearRight(false);
	};

	const scrollLeftFn = (e: React.MouseEvent) => {
		e.stopPropagation();
		const el = scrollContainerRef.current;

		if (el) {
			el.scrollBy({ left: -350, behavior: 'smooth' });
		}
	};

	const scrollRightFn = (e: React.MouseEvent) => {
		e.stopPropagation();
		const el = scrollContainerRef.current;

		if (el) {
			el.scrollBy({ left: 350, behavior: 'smooth' });
		}
	};

	const confirmDelete = () => {
		if (specimenToDelete) {
			router.delete(destroySpecimen(specimenToDelete.id).url, {
				preserveScroll: true,
				onSuccess: () => {
					toast.success('Muestra eliminada correctamente');
					setIsDeleteDialogOpen(false);
				},
			});
		}
	};

	return (
		<>
			<Head title="Gestión de Muestras" />
			<div className="flex h-full flex-1 flex-col gap-4 p-4">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<div className="flex items-center gap-2">
							<Microscope className="h-6 w-6 text-primary" />
							<h1 className="text-2xl font-bold tracking-tight">Muestras</h1>
						</div>
					</div>
					<div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto justify-end">
						{/* Filtro de Estado (Combobox Múltiple) */}
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

						{/* Filtro de Grupo (Combobox con Búsqueda) */}
						<Popover open={isGroupFilterOpen} onOpenChange={setIsGroupFilterOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={isGroupFilterOpen}
									className="h-10 gap-2 border bg-card hover:bg-accent/50 transition-colors justify-between w-full md:w-[200px]"
								>
									<div className="flex items-center gap-2 truncate">
										<Layers className="h-4 w-4 text-muted-foreground shrink-0" />
										<span className="truncate">
											{selectedGroupId === 'all'
												? 'Todos los grupos'
												: availableGroups.find(g => g.id === selectedGroupId)?.name || 'Grupo seleccionado'}
										</span>
									</div>
									<ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[200px] p-0" align="end">
								<Command>
									<CommandInput placeholder="Buscar grupo..." />
									<CommandList>
										<CommandEmpty>No se encontraron grupos.</CommandEmpty>
										<CommandGroup>
											<CommandItem
												value="todos"
												onSelect={() => {
													setSelectedGroupId('all');
													setIsGroupFilterOpen(false);
												}}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														selectedGroupId === 'all' ? "opacity-100" : "opacity-0"
													)}
												/>
												Todos los grupos
											</CommandItem>
											{availableGroups.map((group) => (
												<CommandItem
													key={group.id}
													value={group.name}
													onSelect={() => {
														setSelectedGroupId(group.id);
														setIsGroupFilterOpen(false);
													}}
												>
													<Check
														className={cn(
															"mr-2 h-4 w-4",
															selectedGroupId === group.id ? "opacity-100" : "opacity-0"
														)}
													/>
													{group.name}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>

						{/* Filtro de Rango de Fechas */}
						<DateRangePicker
							value={dateRange}
							onChange={setDateRange}
						/>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button className="h-10 px-5 text-sm w-full md:w-auto gap-2">
									<Plus className="h-4 w-4" />
									<span>Nueva Muestra</span>
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuItem onClick={handleCreate} className="group cursor-pointer">
									<Microscope className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-white group-focus:text-white transition-colors" />
									<span>Muestra Individual</span>
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setIsGroupSheetOpen(true)} className="group cursor-pointer">
									<Layers className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-white group-focus:text-white transition-colors" />
									<span>Grupo de Muestras</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<div className='flex flex-col sm:flex-row sm:items-center gap-2 w-full'>

					{/* Seleccionar control */}
					<div className="flex items-center justify-between sm:justify-start gap-2 border rounded-md px-3 h-10 bg-card hover:bg-accent/50 transition-colors cursor-pointer select-none w-full sm:w-auto shrink-0" onClick={() => {
						setIsSelectionMode(prev => {
							const next = !prev;
							if (!next) setSelectedIds([]);
							return next;
						});
					}}>
						<span className="text-sm font-medium">Seleccionar</span>
						<Switch
							checked={isSelectionMode}
							onCheckedChange={(checked) => {
								setIsSelectionMode(checked);
								if (!checked) {
									setSelectedIds([]);
								}
							}}
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
					{isSelectionMode && (
						<div className="flex flex-col w-full sm:flex-row sm:items-center justify-between gap-2 select-none bg-gray-50 dark:bg-muted/10 border border-gray-100 dark:border-border/60 rounded-lg p-2 sm:p-0 sm:pl-3 sm:pr-1 sm:py-1 px-3 w-full">
							<div className="text-xs sm:text-sm text-muted-foreground flex flex-wrap sm:flex-nowrap items-center gap-2">
								<span>
									<span className="font-semibold text-primary">{selectedIds.length}</span>{' '}
									<span className="sm:hidden">{selectedIds.length === 1 ? 'seleccionada' : 'seleccionadas'}</span>
									<span className="hidden sm:inline">{selectedIds.length === 1 ? 'muestra seleccionada' : 'muestras seleccionadas'}</span>
								</span>
								{visibleSpecimenIds.length > 0 && (
									<>
										<span className="text-muted-foreground/30">|</span>
										<Button
											type="button"
											variant="link"
											onClick={handleSelectAllVisible}
											className="h-auto p-0 text-xs sm:text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
										>
											<span className="sm:hidden">{isAllVisibleSelected ? 'Deseleccionar' : 'Seleccionar todas'}</span>
											<span className="hidden sm:inline">{isAllVisibleSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}</span>
										</Button>
									</>
								)}
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											disabled={selectedIds.length === 0}
											className="h-8 px-3 sm:px-4 text-xs flex items-center gap-2 w-full sm:w-auto"
										>
											<Layers className="h-4 w-4" /> Acciones en Bulk <ChevronDown className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-56">
										<DropdownMenuLabel>Acciones en Lote</DropdownMenuLabel>
										<DropdownMenuSeparator />

										{/* Cambiar Estado Submenu */}
										<DropdownMenuSub>
											<DropdownMenuSubTrigger>
												<Tag className="mr-2 h-4 w-4" />
												<span>Cambiar Estado</span>
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent>
												<DropdownMenuItem onClick={() => handleBulkChangeStatus('received')}>
													Recibida
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleBulkChangeStatus('macroscopic_review')}>
													Rev. Macroscópica
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleBulkChangeStatus('processing')}>
													En Proceso
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleBulkChangeStatus('microscopic_review')}>
													Rev. Microscópica
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleBulkChangeStatus('finalized')}>
													Finalizada
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleBulkChangeStatus('delivered')}>
													Entregada
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleBulkChangeStatus('cancelled')}>
													Cancelada
												</DropdownMenuItem>
											</DropdownMenuSubContent>
										</DropdownMenuSub>

										{/* Cambiar Prioridad Submenu */}
										<DropdownMenuSub>
											<DropdownMenuSubTrigger>
												<CalendarClock className="mr-2 h-4 w-4" />
												<span>Cambiar Prioridad</span>
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent>
												{priorities.map(p => (
													<DropdownMenuItem key={p.id} onClick={() => handleBulkChangePriority(p.id)}>
														{p.name}
													</DropdownMenuItem>
												))}
											</DropdownMenuSubContent>
										</DropdownMenuSub>

										{/* Asignar Patólogo in Bulk */}
										<DropdownMenuItem onClick={() => setIsBulkAssignSheetOpen(true)}>
											<UserPlus className="mr-2 h-4 w-4" />
											<span>Asignar Patólogo</span>
										</DropdownMenuItem>

										<DropdownMenuSeparator />
										<DropdownMenuItem
											variant="destructive"
											onClick={() => setIsBulkDeleteDialogOpen(true)}
										>
											<Trash2 className="mr-2 h-4 w-4" />
											<span>Desactivar Muestras</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					)}

				</div>

				<div
					className="relative flex-1 group/kanban overflow-hidden"
					onMouseMove={handleMouseMove}
					onMouseLeave={handleMouseLeave}
				>
					{/* Left Scroll Button */}
					{!isMobile && canScrollLeft && isNearLeft && (
						<button
							type="button"
							onClick={scrollLeftFn}
							className="absolute left-2 z-[60] flex items-center justify-center p-3 rounded-full bg-background/80 hover:bg-background border border-primary/20 hover:border-primary/50 text-foreground shadow-lg backdrop-blur-md transition-[transform,background-color,border-color,box-shadow] duration-150 hover:scale-110 active:scale-95"
							style={{
								top: `${mouseY}px`,
								transform: 'translateY(-50%)',
							}}
						>
							<ChevronLeft className="w-5 h-5 text-primary" />
						</button>
					)}

					{/* Right Scroll Button */}
					{!isMobile && canScrollRight && isNearRight && (
						<button
							type="button"
							onClick={scrollRightFn}
							className="absolute right-2 z-[60] flex items-center justify-center p-3 rounded-full bg-background/80 hover:bg-background border border-primary/20 hover:border-primary/50 text-foreground shadow-lg backdrop-blur-md transition-[transform,background-color,border-color,box-shadow] duration-150 hover:scale-110 active:scale-95"
							style={{
								top: `${mouseY}px`,
								transform: 'translateY(-50%)',
							}}
						>
							<ChevronRight className="w-5 h-5 text-primary" />
						</button>
					)}

					<div
						ref={scrollContainerRef}
						className="overflow-x-auto pb-4 w-full h-full"
						onScroll={handleScroll}
					>
						<DragDropContext onDragEnd={onDragEnd}>
							<div className="flex gap-4 min-h-[calc(100vh-200px)]">
								{filteredPriorities.map((priority) => (
									<div key={priority.id} className="w-80 min-w-80 flex flex-col rounded-lg p-3 relative overflow-hidden">
										{/* Dynamic Background Layer */}
										<div
											className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
											style={{ backgroundColor: priority.color }}
										/>

										{/* Content Container */}
										<div className="relative z-10 flex flex-col h-full">
											<div className="flex items-center gap-2 mb-4 font-semibold text-sm px-1">
												<div
													className="w-3 h-3 rounded-full shadow-sm"
													style={{ backgroundColor: priority.color }}
												/>
												<span>{priority.name}</span>
												<span className="ml-auto bg-background/60 text-muted-foreground px-2 py-0.5 rounded-full text-xs">
													{priority.specimens.length}
												</span>
											</div>
											<Droppable droppableId={priority.id.toString()}>
												{(provided) => (
													<div
														{...provided.droppableProps}
														ref={provided.innerRef}
														className="flex-1 flex flex-col gap-3 min-h-[150px]"
													>
														{priority.specimens.map((specimen, index) => (
															<Draggable key={specimen.id} draggableId={specimen.id.toString()} index={index}>
																{(provided, snapshot) => (
																	<div
																		ref={provided.innerRef}
																		{...provided.draggableProps}
																		{...provided.dragHandleProps}
																		onClick={() => {
																			if (isSelectionMode) {
																				toggleSelectSpecimen(specimen.id);
																			} else {
																				handleView(specimen);
																			}
																		}}
																		className={`rounded-md shadow-sm border p-3 flex flex-col gap-2 cursor-pointer hover:border-primary/50 transition-all duration-200 ${snapshot.isDragging ? 'shadow-xl ring-2 ring-primary/20 scale-[1.02] rotate-2 z-50 opacity-90' : ''
																			} ${selectedIds.includes(specimen.id)
																				? 'border-primary bg-primary/[0.02] ring-1 ring-primary/30'
																				: (specimen.users && specimen.users.length > 0)
																					? 'border-sky-300/80 dark:border-sky-850 bg-sky-50/50 dark:bg-sky-950/20'
																					: 'bg-card'
																			}`}
																	>
																		<div className="flex gap-3 items-start">
																			{isSelectionMode && (
																				<div className="pt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
																					<Checkbox
																						checked={selectedIds.includes(specimen.id)}
																						onCheckedChange={() => toggleSelectSpecimen(specimen.id)}
																					/>
																				</div>
																			)}
																			<div className="flex-1 min-w-0 flex flex-col gap-2">
																				<div className="flex items-start justify-between">
																					<div>
																						{specimen.group?.name && (
																							<div className="mb-1">
																								<Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-300 dark:bg-purple-500/20 border-none hover:bg-purple-500/10">
																									{specimen.group.name}
																								</Badge>
																							</div>
																						)}
																						<div className="font-medium text-sm">
																							{specimen.customer_relation?.name}
																						</div>
																						{specimen.sequence_code && (
																							<div className="font-mono text-[10px] font-bold text-primary bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded w-fit mt-0.5">
																								{specimen.sequence_code}
																							</div>
																						)}
																					</div>
																					<div className="flex ml-1" onClick={(e) => e.stopPropagation()}>
																						<Button
																							variant="ghost"
																							size="icon"
																							className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted relative"
																							onClick={() => handleAssignClick(specimen)}
																							title="Asignar Patólogo"
																						>
																							<UserPlus className="w-4 h-4" />
																							<span className={`absolute bottom-0 right-0 flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-extrabold ring-1 ring-background ${(specimen.users?.length || 0) > 0
																								? 'bg-sky-500 text-white'
																								: 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
																								}`}>
																								{specimen.users?.length || 0}
																							</span>
																						</Button>
																						<DropdownMenu>
																							<DropdownMenuTrigger asChild>
																								<button
																									className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-md transition-colors"
																									title="Acciones"
																								>
																									<MoreVertical className="w-4 h-4" />
																								</button>
																							</DropdownMenuTrigger>
																							<DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
																								<DropdownMenuItem
																									onClick={(e) => {
																										e.stopPropagation();
																										handleEdit(specimen);
																									}}
																								>
																									<Edit2 className="mr-2 h-4 w-4" />
																									<span>Editar</span>
																								</DropdownMenuItem>
																								<DropdownMenuItem
																									variant="destructive"
																									onClick={(e) => {
																										e.stopPropagation();
																										handleDeleteClick(specimen);
																									}}
																								>
																									<Trash2 className="mr-2 h-4 w-4" />
																									<span>Eliminar</span>
																								</DropdownMenuItem>
																							</DropdownMenuContent>
																						</DropdownMenu>
																					</div>
																				</div>
																				<div className="text-xs text-muted-foreground">
																					{specimen.type?.name} - {specimen.examination?.name}
																				</div>
																				{(() => {
																					const dueInfo = getDueDateInfo(specimen);

																					if (!dueInfo) {
																						return null;
																					}

																					return (
																						<div className="flex items-center gap-1.5 flex-wrap mt-0.5">
																							<div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-primary/10 text-primary border-primary/20 w-fit">
																								<Tag className="w-3 h-3" /> {specimen.category.name}
																							</div>
																							{!['finalized', 'delivered', 'cancelled'].includes(specimen.status) && (
																								<div
																									className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border w-fit ${dueInfo.colorClass}`}
																									title={`Fecha Estimada: ${dueInfo.fullDueDate}`}
																								>
																									<CalendarClock className="w-3 h-3" /> Est: {dueInfo.dueDateFormatted}
																								</div>
																							)}
																						</div>
																					);
																				})()}
																				<div className="mt-1 flex items-center justify-between text-xs">
																					<span
																						className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
																						style={{ backgroundColor: specimen.status_color || '#cbd5e1' }}
																					>
																						{specimen.status === 'received' ? 'Recibida' :
																							specimen.status === 'macroscopic_review' ? 'Rev. Macroscópica' :
																								specimen.status === 'processing' ? 'En Proceso' :
																									specimen.status === 'microscopic_review' ? 'Rev. Microscópica' :
																										specimen.status === 'finalized' ? 'Finalizada' :
																											specimen.status === 'delivered' ? 'Entregada' :
																												specimen.status === 'cancelled' ? 'Cancelada' : specimen.status}
																					</span>
																					<span className="text-muted-foreground capitalize" title={new Date(specimen.created_at).toLocaleString('es-ES')}>
																						{formatDistanceToNow(new Date(specimen.created_at), { addSuffix: true, locale: es })}
																					</span>
																				</div>
																			</div>
																		</div>
																	</div>
																)}
															</Draggable>
														))}
														{provided.placeholder}
													</div>
												)}
											</Droppable>
										</div>
									</div>
								))}
							</div>
						</DragDropContext>
					</div>
				</div>
			</div>

			<SpecimenSheet
				specimen={selectedSpecimen}
				open={isSheetOpen}
				onOpenChange={setIsSheetOpen}
				customers={customers}
				specimenTypes={specimenTypes}
				examinations={examinations}
				categories={categories}
				referrers={referrers}
				referrerTypes={referrerTypes}
				priorities={initialPriorities}
				locations={locations}
				sequences={sequences}
				activeLocationId={activeLocationId}
				products={products}
				banks={banks}
			/>

			<SpecimenGroupSheet
				open={isGroupSheetOpen}
				onOpenChange={setIsGroupSheetOpen}
				customers={customers}
				specimenTypes={specimenTypes}
				examinations={examinations}
				categories={categories}
				referrers={referrers}
				referrerTypes={referrerTypes}
				priorities={initialPriorities}
				locations={locations}
				sequences={sequences}
				activeLocationId={activeLocationId}
				products={products}
				banks={banks}
			/>

			<SpecimenViewSheet
				specimen={selectedSpecimenForView}
				open={isViewSheetOpen}
				onOpenChange={setIsViewSheetOpen}
				onEditClick={handleEditFromView}
				preventCloseOnOutsideClick={showInvoiceModal}
				onEditInvoiceClick={(invoice) => {
					setSelectedInvoice(invoice);
					setIsInvoiceSheetOpen(true);
				}}
			/>

			<InvoiceSheet
				invoice={selectedInvoice}
				open={isInvoiceSheetOpen}
				onOpenChange={setIsInvoiceSheetOpen}
				customers={customers}
				banks={banks}
			/>

			<SpecimenPathologistSheet
				specimen={activeAssignSpecimen}
				open={isAssignSheetOpen}
				onOpenChange={setIsAssignSheetOpen}
				pathologists={pathologists}
			/>

			<SpecimenBulkPathologistSheet
				selectedSpecimens={selectedSpecimens}
				open={isBulkAssignSheetOpen}
				onOpenChange={setIsBulkAssignSheetOpen}
				pathologists={pathologists}
			/>

			<AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Está completamente seguro?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción desactivará las {selectedIds.length} muestras seleccionadas.
							Ya no aparecerán en el tablero Kanban.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-white hover:bg-destructive/90">
							Desactivar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Está completamente seguro?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción desactivará la muestra.
							Ya no aparecerá en el tablero Kanban.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
							Desactivar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* DIÁLOGO DE IMPRESIÓN/VISTA PREVIA DE FACTURA */}
			<AlertDialog open={showInvoiceModal} onOpenChange={(open) => {
				setShowInvoiceModal(open);

				if (!open) {
					setInvoiceUrl(null);
					setPaymentInvoiceUrl(null);
					setActivePdf('invoice');
				}
			}}>
				<AlertDialogContent className="max-w-[700px] w-full z-[100]" overlayClassName="z-[100]">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<FileText className="w-5 h-5 text-primary" /> Factura Generada con Éxito
						</AlertDialogTitle>
						<AlertDialogDescription>
							La muestra ha sido registrada y la factura se generó en formato PDF. Puede descargarla, imprimirla o visualizarla a continuación.
						</AlertDialogDescription>
					</AlertDialogHeader>

					{paymentInvoiceUrl && (
						<div className="flex gap-2 mt-2">
							<Button
								type="button"
								variant={activePdf === 'invoice' ? 'default' : 'outline'}
								size="sm"
								onClick={() => setActivePdf('invoice')}
								className="flex-1"
							>
								Factura de Crédito
							</Button>
							<Button
								type="button"
								variant={activePdf === 'payment_invoice' ? 'default' : 'outline'}
								size="sm"
								onClick={() => setActivePdf('payment_invoice')}
								className="flex-1"
							>
								Recibo de Pago Inicial
							</Button>
						</div>
					)}

					{(activePdf === 'invoice' ? invoiceUrl : paymentInvoiceUrl) && (
						<div className="my-4 border rounded-lg overflow-hidden bg-muted">
							<iframe
								src={activePdf === 'invoice' ? invoiceUrl! : paymentInvoiceUrl!}
								className="w-full h-[400px] border-none"
								title="Factura PDF"
							/>
						</div>
					)}

					<AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
						<Button
							variant="outline"
							onClick={() => {
								setShowInvoiceModal(false);
								setInvoiceUrl(null);
								setPaymentInvoiceUrl(null);
								setActivePdf('invoice');
							}}
							className="sm:order-1"
						>
							Cerrar
						</Button>
						<Button
							onClick={() => {
								const url = activePdf === 'invoice' ? invoiceUrl : paymentInvoiceUrl;

								if (url) {
									window.open(url, '_blank');
								}
							}}
							className="sm:order-2"
						>
							<ExternalLink className="mr-2 h-4 w-4" /> Abrir en pestaña nueva
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
