import { Layers } from 'lucide-react';
import React, { lazy, Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import type { CalendarDay, SpecimenItem } from '../types';

const BalanceBulkActionForm = lazy(() => import('./balance-bulk-action-form'));

export interface BalanceBulkActionSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedSpecimens: SpecimenItem[];
    initialAction?: 'move_date' | 'assign_pathologist';
    onSuccess?: () => void;
    pathologists?: { id: number; name: string; email: string }[];
    calendarDays?: CalendarDay[];
}

function BalanceBulkActionSkeleton() {
    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                {/* Action selector skeleton */}
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-9 w-full rounded-md" />
                </div>

                {/* Target input skeleton */}
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-9 w-full rounded-md" />
                    <div className="flex gap-1 pt-1">
                        <Skeleton className="h-6 w-12 rounded-md" />
                        <Skeleton className="h-6 w-14 rounded-md" />
                        <Skeleton className="h-6 w-14 rounded-md" />
                    </div>
                </div>

                {/* Selected specimens list skeleton */}
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-40" />
                    <div className="space-y-1.5 rounded-lg border bg-muted/10 p-2">
                        <Skeleton className="h-6 w-full rounded" />
                        <Skeleton className="h-6 w-full rounded" />
                        <Skeleton className="h-6 w-full rounded" />
                    </div>
                </div>

                {/* Reason textarea skeleton */}
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-44" />
                    <Skeleton className="h-20 w-full rounded-md" />
                    <Skeleton className="h-3 w-64" />
                </div>
            </div>

            <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t bg-background px-6 py-3">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-36 rounded-md" />
            </SheetFooter>
        </div>
    );
}

export const BalanceBulkActionSheet: React.FC<BalanceBulkActionSheetProps> = ({
    open,
    onOpenChange,
    selectedSpecimens = [],
    initialAction = 'move_date',
    onSuccess,
    pathologists,
    calendarDays,
}) => {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl md:max-w-2xl"
            >
                {/* Header */}
                <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Layers className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <SheetTitle className="text-base font-bold">
                                    {selectedSpecimens.length === 1
                                        ? 'Reprogramar Muestra'
                                        : 'Acciones en Lote'}
                                </SheetTitle>
                                <Badge
                                    variant="secondary"
                                    className="font-mono text-xs font-semibold"
                                >
                                    {selectedSpecimens.length}{' '}
                                    {selectedSpecimens.length === 1
                                        ? 'muestra'
                                        : 'muestras'}
                                </Badge>
                            </div>
                            <SheetDescription className="text-xs text-muted-foreground">
                                {selectedSpecimens.length === 1
                                    ? 'Reprogramar fecha de entrega o reasignar patólogo con registro de auditoría.'
                                    : 'Modifique la fecha o patólogo de las muestras seleccionadas con registro de auditoría.'}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <Suspense fallback={<BalanceBulkActionSkeleton />}>
                        {open && (
                            <BalanceBulkActionForm
                                onClose={() => onOpenChange(false)}
                                selectedSpecimens={selectedSpecimens}
                                initialAction={initialAction}
                                onSuccess={onSuccess}
                                pathologists={pathologists}
                                calendarDays={calendarDays}
                            />
                        )}
                    </Suspense>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default BalanceBulkActionSheet;
