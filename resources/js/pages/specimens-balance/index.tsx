import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import { CalendarDays, Clock } from 'lucide-react';
import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { index as specimenBalanceIndex } from '@/actions/App/Http/Controllers/SpecimenBalanceController';
import { Button } from '@/components/ui/button';
import SpecimenViewSheet from '../specimens/specimen-view-sheet';

const SpecimenSheet = lazy(() => import('../specimens/specimen-sheet'));
const UnassignedSpecimensSheet = lazy(
    () => import('./components/unassigned-specimens-sheet'),
);
const ExpiredSpecimensSheet = lazy(
    () => import('./components/expired-specimens-sheet'),
);

import { BalanceBoard } from './components/balance-board';
import { BalanceFiltersBar } from './components/balance-filters';
import { BalanceSummaryCards } from './components/balance-summary-cards';
import { DurationSettingsSheet } from './components/duration-settings-sheet';
import SheetShadowLoader from './components/sheet-shadow-loader';
import type {
    BalanceFilters,
    BalanceSummary,
    CalendarDay,
    FilterOptions,
    PathologistRowData,
    SpecimenItem,
    UnassignedRowData,
} from './types';

interface PageProps {
    calendarDays: CalendarDay[];
    today: string;
    unassignedRow: UnassignedRowData;
    pathologistRows: PathologistRowData[];
    pathologists: { id: number; name: string; email: string }[];
    durationsMap: Record<number, Record<number, number>>;
    summary: BalanceSummary;
    filterOptions: FilterOptions;
    filters: BalanceFilters;
}

export default function SpecimensBalancePage({
    calendarDays,
    today,
    unassignedRow,
    pathologistRows,
    pathologists,
    durationsMap,
    summary,
    filterOptions,
    filters: serverFilters,
}: PageProps) {
    const pageProps = usePage<any>().props;
    const auth = pageProps.auth;
    const permissions: string[] = auth?.permissions || [];
    const canManage =
        permissions.includes('specimens_balance.manage') ||
        permissions.includes('specimens.edit');

    // Filters state
    const [filters, setFilters] = useState<BalanceFilters>(serverFilters || {});
    const [prevServerFilters, setPrevServerFilters] = useState(serverFilters);
    const [showUnassigned, setShowUnassigned] = useState(false);

    if (prevServerFilters !== serverFilters) {
        setPrevServerFilters(serverFilters);
        setFilters(serverFilters || {});
    }

    // Sheet states
    const [isDurationSheetOpen, setIsDurationSheetOpen] = useState(false);
    const [selectedSpecimenIdForView, setSelectedSpecimenIdForView] = useState<
        number | null
    >(null);
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
    const [selectedSpecimenForEdit, setSelectedSpecimenForEdit] =
        useState<SpecimenItem | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [isUnassignedSheetOpen, setIsUnassignedSheetOpen] = useState(false);
    const [isExpiredSheetOpen, setIsExpiredSheetOpen] = useState(false);

    // Debounced search query router visit
    const debouncedFilterVisit = useMemo(
        () =>
            debounce((newFilters: BalanceFilters) => {
                const queryParams: Record<string, any> = {};

                Object.entries(newFilters).forEach(([key, value]) => {
                    if (value && value !== 'all') {
                        queryParams[key] = value;
                    }
                });

                router.get(specimenBalanceIndex().url, queryParams, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                });
            }, 350),
        [],
    );

    const handleFilterChange = useCallback(
        (key: keyof BalanceFilters, value: string) => {
            const updated = {
                ...filters,
                [key]: value,
            };
            setFilters(updated);

            if (key === 'pathologist_id' && value === 'unassigned') {
                setShowUnassigned(true);
            }

            if (key === 'search') {
                debouncedFilterVisit(updated);
            } else {
                const queryParams: Record<string, any> = {};
                Object.entries(updated).forEach(([k, v]) => {
                    if (v && v !== 'all') {
                        queryParams[k] = v;
                    }
                });

                router.get(specimenBalanceIndex().url, queryParams, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                });
            }
        },
        [filters, debouncedFilterVisit],
    );

    const handleTypesAndExaminationsChange = useCallback(
        (typeParam: any, examParam: any) => {
            const updated = {
                ...filters,
                specimen_type_id: typeParam,
                examination_id: examParam,
            };
            setFilters(updated);

            const queryParams: Record<string, any> = {};
            Object.entries(updated).forEach(([k, v]) => {
                if (v && v !== 'all') {
                    queryParams[k] = v;
                }
            });

            router.get(specimenBalanceIndex().url, queryParams, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [filters],
    );

    const handleResetFilters = useCallback(() => {
        setFilters({});
        setShowUnassigned(false);
        router.get(
            specimenBalanceIndex().url,
            {},
            {
                preserveState: false,
            },
        );
    }, []);

    const handleScrollToToday = useCallback(() => {
        const todayColumn = document.getElementById(`day-column-${today}`);

        if (todayColumn) {
            todayColumn.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest',
            });
        }
    }, [today]);

    const handleViewSpecimen = (specimen: SpecimenItem) => {
        setSelectedSpecimenIdForView(specimen.id);
        setIsViewSheetOpen(true);
    };

    const handleEditSpecimen = (specimen: SpecimenItem) => {
        setSelectedSpecimenForEdit(specimen);
        setIsEditSheetOpen(true);
    };

    return (
        <>
            <Head title="Balance de Muestras" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header Title & Actions */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Balance de Muestras
                            </h1>
                        </div>
                    </div>

                    <div className="flex w-full flex-col items-center justify-end gap-2 md:w-auto md:flex-row">
                        <Button
                            variant="outline"
                            className="h-10 w-full gap-2 border bg-card px-4 text-sm transition-colors hover:bg-accent/50 md:w-auto"
                            onClick={handleScrollToToday}
                        >
                            <CalendarDays className="h-4 w-4 text-primary" />
                            <span>Ir a Hoy</span>
                        </Button>

                        {canManage && (
                            <Button
                                className="h-10 w-full gap-2 px-4 text-sm md:w-auto"
                                onClick={() => setIsDurationSheetOpen(true)}
                            >
                                <Clock className="h-4 w-4" />
                                <span>Configurar Tiempos</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <BalanceSummaryCards
                        summary={summary}
                        onOpenUnassignedSheet={() =>
                            setIsUnassignedSheetOpen(true)
                        }
                        onOpenExpiredSheet={() => setIsExpiredSheetOpen(true)}
                    />
                )}

                {/* Filters Bar */}
                <BalanceFiltersBar
                    filters={filters}
                    filterOptions={filterOptions}
                    pathologists={pathologists}
                    showUnassigned={showUnassigned}
                    unassignedCount={unassignedRow.total_specimens}
                    onToggleUnassigned={setShowUnassigned}
                    onFilterChange={handleFilterChange}
                    onTypesAndExaminationsChange={
                        handleTypesAndExaminationsChange
                    }
                    onResetFilters={handleResetFilters}
                />

                {/* Main 2D Calendar Board */}
                <BalanceBoard
                    calendarDays={calendarDays}
                    unassignedRow={unassignedRow}
                    pathologistRows={pathologistRows}
                    showUnassigned={showUnassigned}
                    canManage={canManage}
                    onViewSpecimen={handleViewSpecimen}
                    onEditSpecimen={handleEditSpecimen}
                />
            </div>

            {/* Duration Settings Sheet Drawer */}
            <DurationSettingsSheet
                open={isDurationSheetOpen}
                onOpenChange={setIsDurationSheetOpen}
                pathologists={pathologists}
                currentUserId={auth?.user?.id || 0}
                canManage={canManage}
                filterOptions={filterOptions}
                durationsMap={durationsMap}
            />

            {/* Specimen View Detail Sheet */}
            {selectedSpecimenIdForView && (
                <SpecimenViewSheet
                    specimenId={selectedSpecimenIdForView}
                    open={isViewSheetOpen}
                    onOpenChange={(open) => {
                        setIsViewSheetOpen(open);

                        if (!open) {
                            setSelectedSpecimenIdForView(null);
                        }
                    }}
                    onEditClick={() => {
                        setIsViewSheetOpen(false);
                        setSelectedSpecimenForEdit({
                            id: selectedSpecimenIdForView,
                        } as SpecimenItem);
                        setIsEditSheetOpen(true);
                    }}
                />
            )}

            {/* Specimen Edit Sheet */}
            {selectedSpecimenForEdit && (
                <Suspense fallback={null}>
                    <SpecimenSheet
                        key={`edit_specimen_${selectedSpecimenForEdit.id}`}
                        open={isEditSheetOpen}
                        onOpenChange={(open) => {
                            setIsEditSheetOpen(open);

                            if (!open) {
                                setSelectedSpecimenForEdit(null);
                            }
                        }}
                        specimen={selectedSpecimenForEdit}
                        onSuccess={() => {
                            router.reload();
                        }}
                    />
                </Suspense>
            )}

            {/* Lazy-loaded Unassigned Specimens Sheet with Shadow Loader */}
            {isUnassignedSheetOpen && (
                <Suspense
                    fallback={
                        <SheetShadowLoader
                            open={isUnassignedSheetOpen}
                            onOpenChange={setIsUnassignedSheetOpen}
                            title="Muestras Sin Asignar"
                            description="Cargando muestras pendientes por asignar..."
                        />
                    }
                >
                    <UnassignedSpecimensSheet
                        open={isUnassignedSheetOpen}
                        onOpenChange={setIsUnassignedSheetOpen}
                        pathologists={pathologists}
                        canManage={canManage}
                        onViewSpecimen={handleViewSpecimen}
                        onEditSpecimen={handleEditSpecimen}
                    />
                </Suspense>
            )}

            {/* Lazy-loaded Expired Specimens Sheet with Shadow Loader */}
            {isExpiredSheetOpen && (
                <Suspense
                    fallback={
                        <SheetShadowLoader
                            open={isExpiredSheetOpen}
                            onOpenChange={setIsExpiredSheetOpen}
                            title="Muestras Vencidas / Retrasadas"
                            description="Cargando muestras fuera de tiempo..."
                        />
                    }
                >
                    <ExpiredSpecimensSheet
                        open={isExpiredSheetOpen}
                        onOpenChange={setIsExpiredSheetOpen}
                        onViewSpecimen={handleViewSpecimen}
                        onEditSpecimen={handleEditSpecimen}
                    />
                </Suspense>
            )}
        </>
    );
}
