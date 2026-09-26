import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
    columnCount?: number;
    cardsPerColumn?: number;
}

export default function KanbanBoardSkeleton({
    columnCount = 4,
    cardsPerColumn = 3,
}: Props) {
    const columns = Array.from({ length: columnCount });
    const cards = Array.from({ length: cardsPerColumn });

    return (
        <div className="group/kanban relative flex-1 overflow-hidden">
            <div className="h-full w-full overflow-x-auto pb-4">
                <div className="flex min-h-[calc(100vh-200px)] gap-4">
                    {columns.map((_, colIndex) => (
                        <div
                            key={colIndex}
                            className="relative flex w-85 min-w-85 flex-col overflow-hidden rounded-lg border border-border/60 bg-muted/20 p-3"
                        >
                            {/* Column Header Skeleton */}
                            <div className="mb-4 flex items-center gap-2 px-1">
                                <Skeleton className="h-3 w-3 rounded-full bg-muted-foreground/20" />
                                <Skeleton className="h-4 w-28 bg-muted-foreground/20" />
                                <Skeleton className="ml-auto h-5 w-8 rounded-full bg-muted-foreground/20" />
                            </div>

                            {/* Column Cards Skeleton */}
                            <div className="flex flex-col gap-2.5">
                                {cards.map((_, cardIndex) => (
                                    <div
                                        key={cardIndex}
                                        className="relative flex flex-col gap-2.5 rounded-md border border-border/70 bg-card p-3 shadow-xs"
                                    >
                                        {/* Top Row: Sequence Code & Status Badge */}
                                        <div className="flex items-center justify-between">
                                            <Skeleton className="h-4 w-24 bg-muted" />
                                            <Skeleton className="h-4 w-16 rounded-full bg-muted" />
                                        </div>

                                        {/* Customer Name */}
                                        <Skeleton className="h-4 w-40 bg-muted" />

                                        {/* Examination / Detail */}
                                        <div className="flex flex-col gap-1">
                                            <Skeleton className="h-3 w-52 bg-muted/70" />
                                            <Skeleton className="h-3 w-32 bg-muted/50" />
                                        </div>

                                        {/* Bottom Row: Date & Pathologist Avatar */}
                                        <div className="mt-1 flex items-center justify-between border-t border-border/40 pt-2">
                                            <Skeleton className="h-3 w-24 bg-muted/60" />
                                            <Skeleton className="h-5 w-5 rounded-full bg-muted" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
