import { Clock } from 'lucide-react';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { durationsData as durationsDataAction } from '@/actions/App/Http/Controllers/SpecimenBalanceController';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import type { FilterOptions } from '../types';

const DurationSettingsForm = lazy(() => import('./duration-settings-form'));

export interface DurationSettingsData {
    pathologists: { id: number; name: string; email?: string }[];
    durationsMap: Record<number, Record<number, number>>;
    filterOptions: FilterOptions;
    currentUserId: number;
    canManage: boolean;
}

interface DurationSettingsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pathologists?: { id: number; name: string; email: string }[];
    currentUserId?: number;
    canManage?: boolean;
    filterOptions?: FilterOptions;
    durationsMap?: Record<number, Record<number, number>>;
}

function DurationSettingsSkeleton() {
    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                {/* Pathologist selector skeleton */}
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-9 w-full rounded-md" />
                </div>

                {/* Filter bar skeleton */}
                <div className="flex w-full flex-wrap items-center gap-2">
                    <Skeleton className="h-9 w-full rounded-md sm:w-64" />
                    <Skeleton className="h-9 w-28 rounded-md" />
                    <Skeleton className="h-9 w-28 rounded-md" />
                    <Skeleton className="h-9 w-36 rounded-md" />
                </div>

                {/* Bulk action toolbar skeleton */}
                <div className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-center justify-between border-b pb-2.5">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded" />
                            <Skeleton className="h-4 w-36" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-7 w-28 rounded-md" />
                            <Skeleton className="h-7 w-24 rounded-md" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                        <Skeleton className="h-4 w-44" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-7 w-16 rounded-md" />
                            <Skeleton className="h-7 w-32 rounded-md" />
                            <Skeleton className="h-7 w-20 rounded-md" />
                        </div>
                    </div>
                </div>

                {/* Examination cards grid skeleton */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b pb-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                        {[1, 2, 3, 4, 5, 6].map((idx) => (
                            <div
                                key={idx}
                                className="space-y-2 rounded-md border p-2.5"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-4 rounded" />
                                        <Skeleton className="h-5 w-5 rounded-full" />
                                        <Skeleton className="h-4 w-28 rounded" />
                                    </div>
                                    <Skeleton className="h-7 w-16 rounded" />
                                </div>
                                <div className="flex items-center gap-1 pt-0.5">
                                    {[1, 2, 3, 4, 5, 6].map((p) => (
                                        <Skeleton
                                            key={p}
                                            className="h-5 w-8 rounded"
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t bg-background px-6 py-3">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-36 rounded-md" />
            </SheetFooter>
        </div>
    );
}

export const DurationSettingsSheet: React.FC<DurationSettingsSheetProps> = ({
    open,
    onOpenChange,
    pathologists: propPathologists,
    currentUserId: propCurrentUserId,
    canManage: propCanManage,
    filterOptions: propFilterOptions,
    durationsMap: propDurationsMap,
}) => {
    const [data, setData] = useState<DurationSettingsData | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        let isMounted = true;

        const fetchUrl = durationsDataAction
            ? durationsDataAction.url()
            : '/specimens-balance/durations-data';

        fetch(fetchUrl, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Error al cargar configuración de tiempos');
                }

                return res.json();
            })
            .then((resData: DurationSettingsData) => {
                if (isMounted) {
                    setData(resData);
                }
            })
            .catch(() => {
                if (isMounted) {
                    toast.error(
                        'No se pudo cargar la configuración de tiempos desde la base de datos',
                    );
                }
            });

        return () => {
            isMounted = false;
            setData(null);
        };
    }, [open]);

    // Active dataset: freshly fetched from database, or fallback to props if offline/passed
    const activeData =
        data ||
        (propPathologists && propDurationsMap
            ? {
                  pathologists: propPathologists,
                  currentUserId: propCurrentUserId || 0,
                  canManage: propCanManage ?? false,
                  filterOptions: propFilterOptions || {
                      specimenTypes: [],
                      examinations: [],
                      categories: [],
                  },
                  durationsMap: propDurationsMap,
              }
            : null);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl md:max-w-3xl lg:max-w-4xl"
            >
                <SheetHeader className="shrink-0 border-b px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <SheetTitle className="text-base font-bold">
                            Configuración de Tiempos de Examen
                        </SheetTitle>
                    </div>
                    <SheetDescription className="text-xs">
                        Defina la duración estimada de cada análisis para el
                        cálculo de capacidad y carga diaria de trabajo (8
                        horas).
                    </SheetDescription>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {!activeData ? (
                        <DurationSettingsSkeleton />
                    ) : (
                        <Suspense fallback={<DurationSettingsSkeleton />}>
                            <DurationSettingsForm
                                onClose={() => onOpenChange(false)}
                                pathologists={activeData.pathologists}
                                currentUserId={activeData.currentUserId}
                                canManage={activeData.canManage}
                                filterOptions={activeData.filterOptions}
                                durationsMap={activeData.durationsMap}
                            />
                        </Suspense>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default DurationSettingsSheet;
