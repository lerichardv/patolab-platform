import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, add, isPast, isToday, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Microscope, Edit2, Trash2, Tag, CalendarClock, FileText, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult
} from '@hello-pangea/dnd';
import SpecimenSheet from './specimen-sheet';
import SpecimenViewSheet from './specimen-view-sheet';
import { toast } from 'sonner';
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
    locations: any[];
    sequences: any[];
    activeLocationId: number | null;
    products: any[];
}


const getDueDateInfo = (specimen: Specimen) => {
    if (!specimen.category || !specimen.category.unit || !specimen.category.quantity) return null;

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

export default function SpecimensIndex({ priorities: initialPriorities, customers, specimenTypes, examinations, categories, referrers, locations, sequences, activeLocationId, products }: Props) {
    const { props } = usePage() as any;
    const flash = props.flash || {};

    const [priorities, setPriorities] = useState<Priority[]>(initialPriorities);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [specimenToDelete, setSpecimenToDelete] = useState<Specimen | null>(null);

    const [selectedSpecimenForView, setSelectedSpecimenForView] = useState<Specimen | null>(null);
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);

    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
    const [paymentInvoiceUrl, setPaymentInvoiceUrl] = useState<string | null>(null);
    const [activePdf, setActivePdf] = useState<'invoice' | 'payment_invoice'>('invoice');
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    useEffect(() => {
        setPriorities(initialPriorities);
    }, [initialPriorities]);

    const findSpecimenById = (id: number): Specimen | null => {
        for (const p of priorities) {
            const found = p.specimens.find(s => s.id === id);
            if (found) return found;
        }
        return null;
    };

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

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;

        if (!destination) return;
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

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

        const [movedSpecimen] = sourceSpecimens.splice(source.index, 1);
        movedSpecimen.priority_id = destPriorityId;

        destSpecimens.splice(destination.index, 0, movedSpecimen);

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
                setPriorities(initialPriorities); // Revert on error
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
        if (!el) return;
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
                        <p className="text-muted-foreground">Administre el ciclo de vida de las muestras como un tablero Kanban.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCreate} className="h-10 px-5 text-sm w-full md:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Nueva Muestra
                        </Button>
                    </div>
                </div>

                <div
                    className="relative flex-1 group/kanban overflow-hidden"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Left Scroll Button */}
                    {canScrollLeft && isNearLeft && (
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
                    {canScrollRight && isNearRight && (
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
                                {priorities.map((priority) => (
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
                                                                        onClick={() => handleView(specimen)}
                                                                        className={`bg-card rounded-md shadow-sm border p-3 flex flex-col gap-2 cursor-pointer hover:border-primary/50 transition-all duration-200 ${snapshot.isDragging ? 'shadow-xl ring-2 ring-primary/20 scale-[1.02] rotate-2 z-50 opacity-90' : ''
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-start justify-between">
                                                                            <div>
                                                                                <div className="font-medium text-sm">
                                                                                    {specimen.customer_relation?.name}
                                                                                </div>
                                                                                {specimen.sequence_code && (
                                                                                    <div className="font-mono text-[10px] font-bold text-primary bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                                                                        {specimen.sequence_code}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleEdit(specimen);
                                                                                    }}
                                                                                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                                                                                    title="Editar Muestra"
                                                                                >
                                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDeleteClick(specimen);
                                                                                    }}
                                                                                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                                                                    title="Desactivar Muestra"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {specimen.type?.name} - {specimen.examination?.name}
                                                                        </div>
                                                                        {(() => {
                                                                            const dueInfo = getDueDateInfo(specimen);
                                                                            if (!dueInfo) return null;
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
                priorities={initialPriorities}
                locations={locations}
                sequences={sequences}
                activeLocationId={activeLocationId}
                products={products}
            />

            <SpecimenViewSheet
                specimen={selectedSpecimenForView}
                open={isViewSheetOpen}
                onOpenChange={setIsViewSheetOpen}
                onEditClick={handleEditFromView}
                preventCloseOnOutsideClick={showInvoiceModal}
            />

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
