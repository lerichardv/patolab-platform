import { Droppable } from '@hello-pangea/dnd';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Priority, Specimen } from '../index';
import { KanbanCard } from './kanban-card';

const KanbanColumnSentinel = ({
    priorityId,
    totalCount,
    visibleCount,
    onLoadMore,
}: {
    priorityId: number;
    totalCount: number;
    visibleCount: number;
    onLoadMore: (priorityId: number) => void;
}) => {
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const node = sentinelRef.current;

        if (!node || visibleCount >= totalCount) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMore(priorityId);
                }
            },
            { rootMargin: '300px' },
        );

        observer.observe(node);

        return () => {
            observer.unobserve(node);
        };
    }, [priorityId, totalCount, visibleCount, onLoadMore]);

    return (
        <div
            ref={sentinelRef}
            className="my-2 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10"
        >
            <div className="flex items-center gap-2 font-medium text-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>
                    Mostrando {visibleCount} de {totalCount} muestras
                </span>
            </div>
            <button
                type="button"
                onClick={() => onLoadMore(priorityId)}
                className="mt-0.5 text-[11px] font-semibold text-primary hover:underline"
            >
                Cargar más muestras
            </button>
        </div>
    );
};

export interface KanbanColumnProps {
    priority: Priority;
    visibleCounts: Record<number, number>;
    auth: {
        permissions?: string[];
        [key: string]: any;
    };
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

export function KanbanColumn({
    priority,
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
}: KanbanColumnProps) {
    const totalSpecimens = priority.specimens.length;
    const isPaginated = totalSpecimens > 50;
    const visibleLimit = isPaginated
        ? visibleCounts[priority.id] || 50
        : totalSpecimens;
    const visibleSpecimens = isPaginated
        ? priority.specimens.slice(0, visibleLimit)
        : priority.specimens;

    return (
        <div
            key={priority.id}
            className="relative flex w-85 min-w-85 flex-col overflow-hidden rounded-lg p-3"
        >
            {/* Dynamic Background Layer */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
                style={{
                    backgroundColor: priority.color,
                }}
            />

            {/* Content Container */}
            <div className="relative z-10 flex h-full flex-col">
                <div className="mb-4 flex items-center gap-2 px-1 text-sm font-semibold">
                    <div
                        className="h-3 w-3 rounded-full shadow-sm"
                        style={{
                            backgroundColor: priority.color,
                        }}
                    />
                    <span>{priority.name}</span>
                    <span className="ml-auto rounded-full bg-background/60 px-2 py-0.5 text-xs text-muted-foreground">
                        {totalSpecimens}
                    </span>
                </div>
                <Droppable droppableId={priority.id.toString()}>
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="flex min-h-[150px] flex-1 flex-col gap-3"
                        >
                            {visibleSpecimens.map((specimen, index) => (
                                <KanbanCard
                                    key={specimen.id}
                                    specimen={specimen}
                                    index={index}
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
                                />
                            ))}
                            {isPaginated && visibleLimit < totalSpecimens && (
                                <KanbanColumnSentinel
                                    priorityId={priority.id}
                                    totalCount={totalSpecimens}
                                    visibleCount={visibleLimit}
                                    onLoadMore={handleLoadMore}
                                />
                            )}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>
        </div>
    );
}

export default KanbanColumn;
