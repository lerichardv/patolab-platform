import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext } from '@hello-pangea/dnd';
import { router } from '@inertiajs/react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { updateOrder as updateSpecimenOrder } from '@/actions/App/Http/Controllers/SpecimenController';
import type { Priority, Specimen } from '../index';
import { KanbanColumn } from './kanban-column';
import { KanbanScrollButtons } from './kanban-scroll-buttons';

export interface KanbanBoardProps {
    priorities: Priority[];
    setPriorities: React.Dispatch<React.SetStateAction<Priority[]>>;
    filteredPriorities: Priority[];
    initialPriorities: Priority[];
    deduplicateSpecimens: (prioritiesList: Priority[]) => Priority[];
    visibleCounts: Record<number, number>;
    auth: any;
    isSelectionMode: boolean;
    selectedIds: number[];
    toggleSelectSpecimen: (id: number) => void;
    handleView: (specimen: Specimen) => void;
    handleAssignClick: (specimen: Specimen) => void;
    handleEdit: (specimen: Specimen) => void;
    handleLoadGroupAndOpenSheet: (groupId: number) => void;
    handleCancelClick: (specimen: Specimen) => void;
    handleDeleteClick: (specimen: Specimen) => void;
    handleLoadMore: (priorityId: number) => void;
}

export function KanbanBoard({
    priorities,
    setPriorities,
    filteredPriorities,
    initialPriorities,
    deduplicateSpecimens,
    visibleCounts,
    auth,
    isSelectionMode,
    selectedIds,
    toggleSelectSpecimen,
    handleView,
    handleAssignClick,
    handleEdit,
    handleLoadGroupAndOpenSheet,
    handleCancelClick,
    handleDeleteClick,
    handleLoadMore,
}: KanbanBoardProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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

        const sourcePriorityIndex = priorities.findIndex(
            (p) => p.id === sourcePriorityId,
        );
        const destPriorityIndex = priorities.findIndex(
            (p) => p.id === destPriorityId,
        );

        const sourcePriority = priorities[sourcePriorityIndex];
        const destPriority = priorities[destPriorityIndex];

        const sourceSpecimens = [...sourcePriority.specimens];
        const destSpecimens =
            sourcePriorityId === destPriorityId
                ? sourceSpecimens
                : [...destPriority.specimens];

        // Find the index of the moved specimen in the unfiltered source specimens list
        const unfilteredSourceIndex = sourceSpecimens.findIndex(
            (s) => s.id === movedSpecimenId,
        );

        if (unfilteredSourceIndex === -1) {
            return;
        }

        const [movedSpecimen] = sourceSpecimens.splice(
            unfilteredSourceIndex,
            1,
        );
        movedSpecimen.priority_id = destPriorityId;

        // Calculate the filtered list of specimens in destination priority to find the target position
        const destFilteredPriority = filteredPriorities.find(
            (p) => p.id === destPriorityId,
        );
        const destFilteredSpecimens = destFilteredPriority
            ? destFilteredPriority.specimens
            : destPriority.specimens;

        const destFilteredSpecimensWithoutMoved =
            sourcePriorityId === destPriorityId
                ? destFilteredSpecimens.filter((s) => s.id !== movedSpecimenId)
                : destFilteredSpecimens;

        const targetSpecimen =
            destFilteredSpecimensWithoutMoved[destination.index];
        let unfilteredDestIndex = -1;

        if (targetSpecimen) {
            unfilteredDestIndex = destSpecimens.findIndex(
                (s) => s.id === targetSpecimen.id,
            );
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
                : movedSpecimen.customer_relation?.name ||
                  `Muestra #${movedSpecimen.id}`;

            toast.success('Prioridad de muestra actualizada', {
                description: `La muestra "${specimenIdentifier}" ha sido trasladada a la prioridad "${destPriority.name}".`,
            });
        }

        setPriorities(newPriorities);

        // Prepare the payload for updateOrder
        const itemsToUpdate = destSpecimens.map((specimen, index) => ({
            id: specimen.id,
            priority_id: destPriorityId,
            order: index + 1,
        }));

        router.post(
            updateSpecimenOrder().url,
            { items: itemsToUpdate },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    toast.error('Error al actualizar el orden');
                    setPriorities(deduplicateSpecimens(initialPriorities)); // Revert on error
                },
            },
        );
    };

    return (
        <div className="group/kanban relative flex-1 overflow-hidden">
            <KanbanScrollButtons
                containerRef={scrollContainerRef}
                dependencies={[filteredPriorities]}
            />

            <div
                ref={scrollContainerRef}
                className="h-full w-full overflow-x-auto pb-4"
            >
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex min-h-[calc(100vh-200px)] gap-4">
                        {filteredPriorities.map((priority) => (
                            <KanbanColumn
                                key={priority.id}
                                priority={priority}
                                visibleCounts={visibleCounts}
                                auth={auth}
                                isSelectionMode={isSelectionMode}
                                selectedIds={selectedIds}
                                toggleSelectSpecimen={toggleSelectSpecimen}
                                handleView={handleView}
                                handleAssignClick={handleAssignClick}
                                handleEdit={handleEdit}
                                handleLoadGroupAndOpenSheet={
                                    handleLoadGroupAndOpenSheet
                                }
                                handleCancelClick={handleCancelClick}
                                handleDeleteClick={handleDeleteClick}
                                handleLoadMore={handleLoadMore}
                            />
                        ))}
                    </div>
                </DragDropContext>
            </div>
        </div>
    );
}
