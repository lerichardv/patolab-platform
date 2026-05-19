import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, add, isPast, differenceInHours, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Microscope, Edit2, Trash2, Tag, Clock, CalendarClock } from 'lucide-react';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult
} from '@hello-pangea/dnd';
import SpecimenSheet from './specimen-sheet';
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
    created_at: string;
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
        if (isPast(dueDate)) {
            colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50';
        } else {
            const hoursLeft = differenceInHours(dueDate, new Date());
            if (hoursLeft <= 24) {
                colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50';
            }
        }
    }
    
    const timeDefined = `${specimen.category.quantity} ${
        specimen.category.unit === 'minutes' ? 'minutos' :
        specimen.category.unit === 'hours' ? 'horas' :
        specimen.category.unit === 'days' ? 'días' :
        specimen.category.unit === 'weeks' ? 'semanas' : specimen.category.unit
    }`;
    
    const dueDateFormatted = format(dueDate, 'dd/MM/yyyy HH:mm');
    
    return {
        timeDefined,
        dueDateFormatted,
        colorClass
    };
};

export default function SpecimensIndex({ priorities: initialPriorities, customers, specimenTypes, examinations, categories, referrers }: Props) {
    const [priorities, setPriorities] = useState<Priority[]>(initialPriorities);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [specimenToDelete, setSpecimenToDelete] = useState<Specimen | null>(null);

    useEffect(() => {
        setPriorities(initialPriorities);
    }, [initialPriorities]);

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

    const handleDeleteClick = (specimen: Specimen) => {
        setSpecimenToDelete(specimen);
        setIsDeleteDialogOpen(true);
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

                <div className="flex-1 overflow-x-auto pb-4">
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
                                                                onClick={() => handleEdit(specimen)}
                                                                className={`bg-card rounded-md shadow-sm border p-3 flex flex-col gap-2 cursor-pointer hover:border-primary/50 transition-all duration-200 ${
                                                                    snapshot.isDragging ? 'shadow-xl ring-2 ring-primary/20 scale-[1.02] rotate-2 z-50 opacity-90' : ''
                                                                }`}
                                                            >
                                                                <div className="flex items-start justify-between">
                                                                    <div className="font-medium text-sm">
                                                                        {specimen.customer_relation?.name}
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteClick(specimen);
                                                                            }}
                                                                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
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
                                                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-secondary/50 text-secondary-foreground border-transparent w-fit">
                                                                                <Clock className="w-3 h-3" /> {dueInfo.timeDefined}
                                                                            </div>
                                                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border w-fit ${dueInfo.colorClass}`}>
                                                                                <CalendarClock className="w-3 h-3" /> Est: {dueInfo.dueDateFormatted}
                                                                            </div>
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
                                                                         specimen.status === 'finalized' ? 'Analizada' :
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
        </>
    );
}
