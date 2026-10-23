import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import {
    Calendar,
    CalendarDays,
    ChevronDown,
    Clock,
    Layers,
    UserPlus,
} from 'lucide-react';
import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { index as specimenBalanceIndex } from '@/actions/App/Http/Controllers/SpecimenBalanceController';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
const SpecimenViewSheet = lazy(
    () => import('../specimens/specimen-view-sheet'),
);
const SpecimenSheet = lazy(() => import('../specimens/specimen-sheet'));

import { BalanceBoard } from './components/balance-board';
import { BalanceBulkActionSheet } from './components/balance-bulk-action-sheet';
import { BalanceFiltersBar } from './components/balance-filters';
import { BalanceSummaryCards } from './components/balance-summary-cards';
import { DurationSettingsSheet } from './components/duration-settings-sheet';
import { ExpiredSpecimensSheet } from './components/expired-specimens-sheet';
import SheetShadowLoader from './components/sheet-shadow-loader';
import { UnassignedSpecimensSheet } from './components/unassigned-specimens-sheet';
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

    // Selection mode & bulk actions
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkActionSheetOpen, setIsBulkActionSheetOpen] = useState(false);
    const [bulkActionType, setBulkActionType] = useState<
        'move_date' | 'assign_pathologist'
    >('move_date');
    const [customBulkSpecimens, setCustomBulkSpecimens] = useState<
        SpecimenItem[] | null
    >(null);

    const handleReprogramSpecimen = useCallback((specimen: SpecimenItem) => {
        setIsExpiredSheetOpen(false);
        const mappedSpecimen: SpecimenItem = {
            ...specimen,
            assigned_user_ids:
                specimen.assigned_user_ids ||
                specimen.assigned_users?.map((u) => u.id) ||
                [],
            assigned_users: specimen.assigned_users || [],
        };
        setCustomBulkSpecimens([mappedSpecimen]);
        setBulkActionType('move_date');
        setIsBulkActionSheetOpen(true);
    }, []);

    const handleBulkActionFromSheet = useCallback(
        (
            action: 'move_date' | 'assign_pathologist',
            specimens: SpecimenItem[],
        ) => {
            setIsUnassignedSheetOpen(false);
            setIsExpiredSheetOpen(false);
            const mapped = specimens.map((specimen) => ({
                ...specimen,
                assigned_user_ids:
                    specimen.assigned_user_ids ||
                    specimen.assigned_users?.map((u) => u.id) ||
                    [],
                assigned_users: specimen.assigned_users || [],
            }));
            setCustomBulkSpecimens(mapped);
            setBulkActionType(action);
            setIsBulkActionSheetOpen(true);
        },
        [],
    );

    // Collect all visible specimens across unassigned row and pathologist rows
    const visibleSpecimensMap = useMemo(() => {
        const map = new Map<number, SpecimenItem>();

        // Unassigned specimens (visible if showUnassigned is active)
        if (showUnassigned && unassignedRow?.days) {
            Object.values(unassignedRow.days).forEach((specs) => {
                specs?.forEach((s) => map.set(s.id, s));
            });
        }

        // Pathologist rows
        pathologistRows?.forEach((row) => {
            if (row.days) {
                Object.values(row.days).forEach((dayData) => {
                    dayData?.specimens?.forEach((s) => map.set(s.id, s));
                });
            }
        });

        return map;
    }, [showUnassigned, unassignedRow, pathologistRows]);

    const visibleSpecimenIds = useMemo(() => {
        return Array.from(visibleSpecimensMap.keys());
    }, [visibleSpecimensMap]);

    const selectedSpecimensList = useMemo(() => {
        return selectedIds
            .map((id) => visibleSpecimensMap.get(id))
            .filter((s): s is SpecimenItem => Boolean(s));
    }, [selectedIds, visibleSpecimensMap]);

    const isAllVisibleSelected = useMemo(() => {
        if (visibleSpecimenIds.length === 0) {
            return false;
        }

        return visibleSpecimenIds.every((id) => selectedIds.includes(id));
    }, [visibleSpecimenIds, selectedIds]);

    const handleToggleSelectSpecimen = useCallback((id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id],
        );
    }, []);

    const handleSelectAllVisible = useCallback(() => {
        if (isAllVisibleSelected) {
            setSelectedIds((prev) =>
                prev.filter((id) => !visibleSpecimenIds.includes(id)),
            );
        } else {
            setSelectedIds((prev) =>
                Array.from(new Set([...prev, ...visibleSpecimenIds])),
            );
        }
    }, [isAllVisibleSelected, visibleSpecimenIds]);

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

                    {canManage && (
                        <div className="flex w-full flex-col items-center justify-end gap-2 md:w-auto md:flex-row">
                            <Button
                                className="h-10 w-full gap-2 px-4 text-sm md:w-auto"
                                onClick={() => setIsDurationSheetOpen(true)}
                            >
                                <Clock className="h-4 w-4" />
                                <span>Configurar Tiempos</span>
                            </Button>
                        </div>
                    )}
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
                    isSelectionMode={isSelectionMode}
                    onToggleSelectionMode={(enabled) => {
                        setIsSelectionMode(enabled);

                        if (!enabled) {
                            setSelectedIds([]);
                        }
                    }}
                    onToggleUnassigned={setShowUnassigned}
                    onFilterChange={handleFilterChange}
                    onTypesAndExaminationsChange={
                        handleTypesAndExaminationsChange
                    }
                    onResetFilters={handleResetFilters}
                    onScrollToToday={handleScrollToToday}
                />

                {/* Bulk Selection Bar (consistent with Kanban) */}
                {isSelectionMode && (
                    <div className="flex w-full flex-col justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2 px-3 select-none sm:flex-row sm:items-center sm:p-0 sm:py-1 sm:pr-1 sm:pl-3 dark:border-border/60 dark:bg-muted/10">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:flex-nowrap sm:text-sm">
                            <span>
                                <span className="font-semibold text-primary">
                                    {selectedIds.length}
                                </span>{' '}
                                <span className="sm:hidden">
                                    {selectedIds.length === 1
                                        ? 'seleccionada'
                                        : 'seleccionadas'}
                                </span>
                                <span className="hidden sm:inline">
                                    {selectedIds.length === 1
                                        ? 'muestra seleccionada'
                                        : 'muestras seleccionadas'}
                                </span>
                            </span>
                            {visibleSpecimenIds.length > 0 && (
                                <>
                                    <span className="text-muted-foreground/30">
                                        |
                                    </span>
                                    <Button
                                        type="button"
                                        variant="link"
                                        onClick={handleSelectAllVisible}
                                        className="h-auto p-0 text-xs font-semibold text-primary transition-colors hover:text-primary/80 sm:text-sm"
                                    >
                                        <span className="sm:hidden">
                                            {isAllVisibleSelected
                                                ? 'Deseleccionar'
                                                : 'Seleccionar todas'}
                                        </span>
                                        <span className="hidden sm:inline">
                                            {isAllVisibleSelected
                                                ? 'Deseleccionar todas'
                                                : 'Seleccionar todas'}
                                        </span>
                                    </Button>
                                </>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {canManage && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            disabled={selectedIds.length === 0}
                                            className="flex h-8 w-full items-center gap-2 px-3 text-xs sm:w-auto sm:px-4"
                                        >
                                            <Layers className="h-4 w-4" />{' '}
                                            Acciones en Bulk{' '}
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        className="w-56"
                                    >
                                        <DropdownMenuLabel>
                                            Acciones en Lote
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem
                                            onClick={() => {
                                                setBulkActionType('move_date');
                                                setIsBulkActionSheetOpen(true);
                                            }}
                                        >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            <span>Mover a Fecha</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setBulkActionType(
                                                    'assign_pathologist',
                                                );
                                                setIsBulkActionSheetOpen(true);
                                            }}
                                        >
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            <span>Asignar a Patólogo</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                )}

                {/* Main 2D Calendar Board */}
                <BalanceBoard
                    calendarDays={calendarDays}
                    unassignedRow={unassignedRow}
                    pathologistRows={pathologistRows}
                    showUnassigned={showUnassigned}
                    canManage={canManage}
                    isSelectionMode={isSelectionMode}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelectSpecimen}
                    onViewSpecimen={handleViewSpecimen}
                    onEditSpecimen={handleEditSpecimen}
                />
            </div>

            {/* Duration Settings Sheet with internal Shadow Loader */}
            <DurationSettingsSheet
                open={isDurationSheetOpen}
                onOpenChange={setIsDurationSheetOpen}
            />

            {/* Lazy-loaded Specimen View Detail Sheet with Shadow Loader */}
            {selectedSpecimenIdForView && (
                <Suspense
                    fallback={
                        <SheetShadowLoader
                            open={isViewSheetOpen}
                            onOpenChange={setIsViewSheetOpen}
                            title="Detalle de Muestra"
                            description="Cargando detalles de la muestra..."
                        />
                    }
                >
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
                </Suspense>
            )}

            {/* Lazy-loaded Specimen Edit Sheet with Shadow Loader */}
            {selectedSpecimenForEdit && (
                <Suspense
                    fallback={
                        <SheetShadowLoader
                            open={isEditSheetOpen}
                            onOpenChange={setIsEditSheetOpen}
                            title="Editar Muestra"
                            description="Cargando editor de muestra..."
                        />
                    }
                >
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

            {/* Unassigned Specimens Sheet with internal Shadow Loader */}
            <UnassignedSpecimensSheet
                open={isUnassignedSheetOpen}
                onOpenChange={setIsUnassignedSheetOpen}
                pathologists={pathologists}
                canManage={canManage}
                filterOptions={filterOptions}
                onBulkAction={handleBulkActionFromSheet}
            />

            {/* Expired Specimens Sheet with internal Shadow Loader */}
            <ExpiredSpecimensSheet
                open={isExpiredSheetOpen}
                onOpenChange={setIsExpiredSheetOpen}
                pathologists={pathologists}
                canManage={canManage}
                filterOptions={filterOptions}
                onReprogramSpecimen={handleReprogramSpecimen}
                onBulkAction={handleBulkActionFromSheet}
            />

            {/* Bulk Action / Reprogram Sheet with internal Shadow Loader */}
            <BalanceBulkActionSheet
                open={isBulkActionSheetOpen}
                onOpenChange={(open) => {
                    setIsBulkActionSheetOpen(open);

                    if (!open) {
                        setCustomBulkSpecimens(null);
                    }
                }}
                selectedSpecimens={
                    customBulkSpecimens !== null
                        ? customBulkSpecimens
                        : selectedSpecimensList
                }
                initialAction={bulkActionType}
                pathologists={pathologists}
                calendarDays={calendarDays}
                onSuccess={() => {
                    setIsSelectionMode(false);
                    setSelectedIds([]);
                    setCustomBulkSpecimens(null);
                }}
            />
        </>
    );
}
