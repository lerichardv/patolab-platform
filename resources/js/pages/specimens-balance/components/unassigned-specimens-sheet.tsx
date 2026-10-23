import { Inbox } from 'lucide-react';
import React, { lazy, Suspense } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import type { FilterOptions, SpecimenItem } from '../types';

const UnassignedSpecimensContent = lazy(
    () => import('./unassigned-specimens-content'),
);

export interface UnassignedSpecimensSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pathologists?: { id: number; name: string; email: string }[];
    canManage?: boolean;
    filterOptions?: FilterOptions;
    onBulkAction?: (
        action: 'move_date' | 'assign_pathologist',
        specimens: SpecimenItem[],
    ) => void;
}

function UnassignedSpecimensSkeleton() {
    return (
        <div className="flex h-full flex-col bg-background">
            {/* Filter toolbar skeleton */}
            <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3">
                <Skeleton className="h-9 min-w-[200px] flex-1 rounded-md sm:max-w-xs" />
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-32 rounded-md" />
                <Skeleton className="h-9 w-36 rounded-md" />
                <Skeleton className="ml-auto h-6 w-20 rounded-full" />
            </div>

            {/* Table skeleton */}
            <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
                <div className="flex h-10 items-center justify-between rounded-md border bg-muted/40 px-4">
                    <Skeleton className="h-4 w-6 rounded" />
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-24 rounded" />
                </div>
                {[1, 2, 3, 4, 5, 6, 7].map((idx) => (
                    <div
                        key={idx}
                        className="flex h-12 items-center justify-between rounded-md border bg-card px-4"
                    >
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-20 rounded" />
                        <Skeleton className="h-4 w-36 rounded" />
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="h-4 w-20 rounded" />
                        <Skeleton className="h-7 w-20 rounded-md" />
                    </div>
                ))}
            </div>

            {/* Pagination skeleton */}
            <div className="flex items-center justify-between border-t px-6 py-3">
                <Skeleton className="h-4 w-48 rounded" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-7 w-16 rounded-md" />
                </div>
            </div>
        </div>
    );
}

export const UnassignedSpecimensSheet: React.FC<
    UnassignedSpecimensSheetProps
> = ({
    open,
    onOpenChange,
    pathologists,
    canManage,
    filterOptions,
    onBulkAction,
}) => {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex h-full w-full flex-col p-0 sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl"
            >
                {/* Persistent Header */}
                <SheetHeader className="border-b px-6 py-4 text-left">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Inbox className="h-4 w-4" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">
                                Muestras Sin Asignar
                            </SheetTitle>
                            <SheetDescription className="text-xs text-muted-foreground">
                                Tabla completa de muestras pendientes por
                                asignar patólogo. Puedes filtrar, seleccionar
                                múltiples muestras para acciones en bulk o
                                asignarlas directamente.
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <Suspense fallback={<UnassignedSpecimensSkeleton />}>
                    {open && (
                        <UnassignedSpecimensContent
                            onClose={() => onOpenChange(false)}
                            pathologists={pathologists}
                            canManage={canManage}
                            filterOptions={filterOptions}
                            onBulkAction={onBulkAction}
                        />
                    )}
                </Suspense>
            </SheetContent>
        </Sheet>
    );
};

export default UnassignedSpecimensSheet;
