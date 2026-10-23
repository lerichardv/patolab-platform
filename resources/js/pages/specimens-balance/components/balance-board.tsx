import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { router } from '@inertiajs/react';
import { UserX } from 'lucide-react';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';
import { reschedule as rescheduleAction } from '@/actions/App/Http/Controllers/SpecimenBalanceController';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
    CalendarDay,
    PathologistRowData,
    SpecimenItem,
    UnassignedRowData,
} from '../types';
import { BalanceCard } from './balance-card';
import { MoveReasonDialog } from './move-reason-dialog';

// Parse droppableId: format "cell_{userId|'unassigned'}_{date}"
function parseDroppableId(droppableId: string): {
    userId: string | number;
    date: string;
} {
    const parts = droppableId.split('_');
    // parts[0] is "cell", parts[1] is userId or "unassigned", parts[2] is date
    const userIdStr = parts[1];
    const date = parts.slice(2).join('_');
    const userId =
        userIdStr === 'unassigned' ? 'unassigned' : parseInt(userIdStr);

    return { userId, date };
}

interface PendingMoveState {
    specimen: SpecimenItem;
    result: DropResult;
    sourceParsed: { userId: string | number; date: string };
    destParsed: { userId: string | number; date: string };
    sourcePathologistName: string;
    destPathologistName: string;
    isMulti: boolean;
    prevUnassigned: UnassignedRowData;
    prevPathologists: PathologistRowData[];
}

interface BalanceBoardProps {
    calendarDays: CalendarDay[];
    unassignedRow: UnassignedRowData;
    pathologistRows: PathologistRowData[];
    showUnassigned?: boolean;
    canManage?: boolean;
    isSelectionMode?: boolean;
    selectedIds?: number[];
    onToggleSelect?: (id: number) => void;
    onViewSpecimen: (specimen: SpecimenItem) => void;
    onEditSpecimen?: (specimen: SpecimenItem) => void;
}

export const BalanceBoard: React.FC<BalanceBoardProps> = ({
    calendarDays,
    unassignedRow: initialUnassignedRow,
    pathologistRows: initialPathologistRows,
    showUnassigned = false,
    canManage = true,
    isSelectionMode = false,
    selectedIds = [],
    onToggleSelect,
    onViewSpecimen,
    onEditSpecimen,
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Smooth progressive edge auto-scrolling during drag
    const isDraggingRef = useRef(false);
    const pointerXRef = useRef<number | null>(null);
    const currentSpeedRef = useRef(0);
    const rafIdRef = useRef<number | null>(null);

    const stopAutoScroll = useCallback(() => {
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }

        currentSpeedRef.current = 0;
        pointerXRef.current = null;
    }, []);

    const startAutoScrollLoop = useCallback(() => {
        if (rafIdRef.current !== null) {
            return;
        }

        const scrollLoop = () => {
            if (!isDraggingRef.current || !scrollContainerRef.current) {
                stopAutoScroll();

                return;
            }

            const container = scrollContainerRef.current;
            const rect = container.getBoundingClientRect();
            const clientX = pointerXRef.current;

            // Determine pinned column boundary (pathologist column on the left)
            const pinnedHeader = container.querySelector('th.sticky');
            const pinnedWidth = pinnedHeader
                ? pinnedHeader.getBoundingClientRect().width
                : 220;
            const leftBoundary = rect.left + pinnedWidth;
            const rightBoundary = Math.min(rect.right, window.innerWidth);

            const EDGE_ZONE = 150; // px zone near edges to trigger auto-scroll
            const MIN_SPEED = 2; // px per frame (smooth and gentle initial scroll)
            const MAX_SPEED = 24; // px per frame (gradually accelerates)

            let targetSpeed = 0;

            if (clientX !== null) {
                if (clientX <= leftBoundary) {
                    // Over or to the left of the pinned column -> max speed left
                    targetSpeed = -MAX_SPEED;
                } else if (clientX < leftBoundary + EDGE_ZONE) {
                    // Approaching left edge -> progressive acceleration
                    const distance = clientX - leftBoundary;
                    const intensity = Math.max(
                        0,
                        Math.min(1, 1 - distance / EDGE_ZONE),
                    );
                    const eased = Math.pow(intensity, 1.6);
                    targetSpeed = -(
                        MIN_SPEED +
                        (MAX_SPEED - MIN_SPEED) * eased
                    );
                } else if (clientX >= rightBoundary) {
                    // Beyond or at right boundary -> max speed right
                    targetSpeed = MAX_SPEED;
                } else if (clientX > rightBoundary - EDGE_ZONE) {
                    // Approaching right edge -> progressive acceleration
                    const distance = rightBoundary - clientX;
                    const intensity = Math.max(
                        0,
                        Math.min(1, 1 - distance / EDGE_ZONE),
                    );
                    const eased = Math.pow(intensity, 1.6);
                    targetSpeed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * eased;
                }
            }

            // Check container boundary limits
            if (targetSpeed < 0 && container.scrollLeft <= 0) {
                targetSpeed = 0;
                currentSpeedRef.current = 0;
            } else if (
                targetSpeed > 0 &&
                container.scrollLeft + container.clientWidth >=
                    container.scrollWidth - 1
            ) {
                targetSpeed = 0;
                currentSpeedRef.current = 0;
            }

            // Exponential interpolation (lerp) for smooth speed ramp-up & ramp-down
            const LERP_FACTOR = 0.18;
            currentSpeedRef.current +=
                (targetSpeed - currentSpeedRef.current) * LERP_FACTOR;

            if (Math.abs(currentSpeedRef.current) < 0.15) {
                currentSpeedRef.current = 0;
            }

            if (currentSpeedRef.current !== 0) {
                container.scrollLeft += currentSpeedRef.current;
            }

            rafIdRef.current = requestAnimationFrame(scrollLoop);
        };

        rafIdRef.current = requestAnimationFrame(scrollLoop);
    }, [stopAutoScroll]);

    const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
        const clientX =
            'touches' in e && e.touches[0]
                ? e.touches[0].clientX
                : (e as MouseEvent).clientX;
        pointerXRef.current = clientX;
    }, []);

    // Local mutable state for optimistic drag and drop updates
    const [unassignedRow, setUnassignedRow] =
        useState<UnassignedRowData>(initialUnassignedRow);
    const [pathologistRows, setPathologistRows] = useState<
        PathologistRowData[]
    >(initialPathologistRows);
    const [prevInitial, setPrevInitial] = useState({
        initialUnassignedRow,
        initialPathologistRows,
    });
    const [draggingInfo, setDraggingInfo] = useState<{
        specimenId: number;
        sourceUserId: string | number;
        sourceDate: string;
        isMultiAssigned: boolean;
    } | null>(null);
    const [pendingMove, setPendingMove] = useState<PendingMoveState | null>(
        null,
    );
    const [isMoveReasonDialogOpen, setIsMoveReasonDialogOpen] = useState(false);
    const [isSubmittingMove, setIsSubmittingMove] = useState(false);

    // Sync with server props during render when props change
    if (
        prevInitial.initialUnassignedRow !== initialUnassignedRow ||
        prevInitial.initialPathologistRows !== initialPathologistRows
    ) {
        setPrevInitial({ initialUnassignedRow, initialPathologistRows });
        setUnassignedRow(initialUnassignedRow);
        setPathologistRows(initialPathologistRows);
    }

    const onDragStart = useCallback(
        (start: {
            draggableId: string;
            source: { droppableId: string; index: number };
        }) => {
            isDraggingRef.current = true;
            window.addEventListener('mousemove', handlePointerMove, {
                passive: true,
            });
            window.addEventListener('touchmove', handlePointerMove, {
                passive: true,
            });
            startAutoScrollLoop();

            const parts = start.draggableId.split('_');
            const specimenId = parseInt(parts[parts.length - 1]);
            const sourceParsed = parseDroppableId(start.source.droppableId);

            let specItem: SpecimenItem | null = null;

            if (sourceParsed.userId === 'unassigned') {
                specItem =
                    unassignedRow.days[sourceParsed.date]?.[
                        start.source.index
                    ] || null;
            } else {
                const row = pathologistRows.find(
                    (p) => p.user.id === sourceParsed.userId,
                );
                specItem =
                    row?.days[sourceParsed.date]?.specimens?.[
                        start.source.index
                    ] || null;
            }

            const isMulti = (specItem?.assigned_user_ids?.length || 0) > 1;

            setDraggingInfo({
                specimenId,
                sourceUserId: sourceParsed.userId,
                sourceDate: sourceParsed.date,
                isMultiAssigned: isMulti,
            });
        },
        [
            handlePointerMove,
            startAutoScrollLoop,
            unassignedRow,
            pathologistRows,
        ],
    );

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('touchmove', handlePointerMove);
            stopAutoScroll();
        };
    }, [handlePointerMove, stopAutoScroll]);

    // Filter calendarDays so:
    // - Expired dates (older than today) ONLY appear if they have at least 1 visible specimen.
    // - Today and future dates appear continuously up to maxDate (at least 7 days ahead).
    const visibleCalendarDays = useMemo(() => {
        const specimenCountPerDate: Record<string, number> = {};

        if (showUnassigned) {
            Object.entries(unassignedRow.days).forEach(([date, specs]) => {
                if (specs && specs.length > 0) {
                    specimenCountPerDate[date] =
                        (specimenCountPerDate[date] || 0) + specs.length;
                }
            });
        }

        pathologistRows.forEach((row) => {
            Object.entries(row.days).forEach(([date, dayData]) => {
                const count = dayData?.specimens?.length || 0;

                if (count > 0) {
                    specimenCountPerDate[date] =
                        (specimenCountPerDate[date] || 0) + count;
                }
            });
        });

        // Find today's date in calendarDays
        const todayDay = calendarDays.find((d) => d.is_today);
        const todayStr =
            todayDay?.date || new Date().toISOString().split('T')[0];

        // Find maximum future date to show (at least today + 7 days, or furthest visible specimen date)
        let maxDate = todayStr;

        Object.keys(specimenCountPerDate).forEach((d) => {
            if (d > maxDate) {
                maxDate = d;
            }
        });

        const todayIndex = calendarDays.findIndex((d) => d.is_today);
        const defaultMaxIndex =
            todayIndex !== -1
                ? Math.min(calendarDays.length - 1, todayIndex + 7)
                : calendarDays.length - 1;
        const defaultMaxDate = calendarDays[defaultMaxIndex]?.date || todayStr;

        if (defaultMaxDate > maxDate) {
            maxDate = defaultMaxDate;
        }

        return calendarDays.filter((day) => {
            if (day.date < todayStr) {
                // Expired date older than today: only appear if it has visible specimens
                return (specimenCountPerDate[day.date] || 0) > 0;
            }

            // Today and future dates: appear continuously up to maxDate
            return day.date <= maxDate;
        });
    }, [calendarDays, showUnassigned, unassignedRow, pathologistRows]);

    // Calculate the maximum number of cards for each date across all visible rows
    const dateColumnWidths = useMemo(() => {
        const widths: Record<string, number> = {};
        const CARD_WIDTH = 270; // px per card
        const GAP = 8; // px between cards
        const CELL_PADDING = 16; // px cell padding

        for (const day of visibleCalendarDays) {
            let maxCards = 0;

            if (showUnassigned) {
                const unassignedCount =
                    unassignedRow.days[day.date]?.length || 0;

                if (unassignedCount > maxCards) {
                    maxCards = unassignedCount;
                }
            }

            for (const row of pathologistRows) {
                const pCount = row.days[day.date]?.specimens?.length || 0;

                if (pCount > maxCards) {
                    maxCards = pCount;
                }
            }

            if (maxCards <= 0) {
                widths[day.date] = 180;
            } else {
                widths[day.date] =
                    maxCards * CARD_WIDTH + (maxCards - 1) * GAP + CELL_PADDING;
            }
        }

        return widths;
    }, [visibleCalendarDays, showUnassigned, unassignedRow, pathologistRows]);

    const onDragEnd = (result: DropResult) => {
        isDraggingRef.current = false;
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('touchmove', handlePointerMove);
        stopAutoScroll();
        setDraggingInfo(null);

        const { source, destination } = result;

        if (!destination) {
            return;
        }

        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        const sourceParsed = parseDroppableId(source.droppableId);
        const destParsed = parseDroppableId(destination.droppableId);

        // Same cell reordering: keep within cell without prompting
        if (source.droppableId === destination.droppableId) {
            if (sourceParsed.userId === 'unassigned') {
                setUnassignedRow((prev) => {
                    const list = [...(prev.days[sourceParsed.date] || [])];
                    const [item] = list.splice(source.index, 1);
                    list.splice(destination.index, 0, item);

                    return {
                        ...prev,
                        days: {
                            ...prev.days,
                            [sourceParsed.date]: list,
                        },
                    };
                });
            } else {
                setPathologistRows((prevRows) =>
                    prevRows.map((row) => {
                        if (row.user.id !== sourceParsed.userId) {
                            return row;
                        }

                        const dayData = row.days[sourceParsed.date];
                        const list = [...(dayData?.specimens || [])];
                        const [item] = list.splice(source.index, 1);
                        list.splice(destination.index, 0, item);

                        return {
                            ...row,
                            days: {
                                ...row.days,
                                [sourceParsed.date]: {
                                    ...dayData,
                                    specimens: list,
                                },
                            },
                        };
                    }),
                );
            }

            return;
        }

        // Dropping into a DIFFERENT cell (Date or Pathologist changed)
        // Find the moved specimen
        let movedSpecimen: SpecimenItem | null = null;

        if (sourceParsed.userId === 'unassigned') {
            movedSpecimen =
                unassignedRow.days[sourceParsed.date]?.[source.index] || null;
        } else {
            const pRow = pathologistRows.find(
                (p) => p.user.id === sourceParsed.userId,
            );
            movedSpecimen =
                pRow?.days[sourceParsed.date]?.specimens?.[source.index] ||
                null;
        }

        if (!movedSpecimen) {
            return;
        }

        const isMulti = (movedSpecimen.assigned_user_ids?.length || 0) > 1;

        // RULE: When assigned to more than one pathologist, moving to another pathologist is disabled!
        if (isMulti && sourceParsed.userId !== destParsed.userId) {
            toast.warning(
                'Esta muestra está asignada a varios patólogos. No se puede transferir a otro patólogo arrastrándola.',
            );

            return;
        }

        // Snapshot current state for rollback
        const prevUnassigned = JSON.parse(JSON.stringify(unassignedRow));
        const prevPathologists = JSON.parse(JSON.stringify(pathologistRows));

        const sourcePathologistName =
            sourceParsed.userId === 'unassigned'
                ? 'Sin Asignar'
                : pathologistRows.find((p) => p.user.id === sourceParsed.userId)
                      ?.user.name || 'Patólogo';

        const destPathologistName =
            destParsed.userId === 'unassigned'
                ? 'Sin Asignar'
                : pathologistRows.find((p) => p.user.id === destParsed.userId)
                      ?.user.name || 'Patólogo';

        setPendingMove({
            specimen: movedSpecimen,
            result,
            sourceParsed,
            destParsed,
            sourcePathologistName,
            destPathologistName,
            isMulti,
            prevUnassigned,
            prevPathologists,
        });
        setIsMoveReasonDialogOpen(true);
    };

    const handleCancelMove = useCallback(() => {
        setIsMoveReasonDialogOpen(false);
        setPendingMove(null);
        toast.info('Movimiento cancelado.');
    }, []);

    const handleConfirmMove = useCallback(
        (reason: string) => {
            if (!pendingMove) {
                return;
            }

            const {
                specimen,
                result,
                sourceParsed,
                destParsed,
                isMulti,
                prevUnassigned,
                prevPathologists,
            } = pendingMove;
            const { source, destination, draggableId } = result;

            if (!destination) {
                return;
            }

            const parts = draggableId.split('_');
            const specimenId = parseInt(parts[parts.length - 1]);
            let movedSpecimen: SpecimenItem = specimen;

            setIsSubmittingMove(true);

            // =========================================================================
            // SCENARIO A: Multi-assigned specimen moved HORIZONTALLY across dates
            // =========================================================================
            if (isMulti) {
                const assignedIds = movedSpecimen.assigned_user_ids;

                setPathologistRows((prevRows) =>
                    prevRows.map((row) => {
                        const pId = row.user.id;

                        if (!assignedIds.includes(pId)) {
                            return row;
                        }

                        const updatedRow = { ...row, days: { ...row.days } };

                        // 1. Remove from source date
                        const sourceDayData = updatedRow.days[sourceParsed.date];
                        const sourceList = [
                            ...(sourceDayData?.specimens || []),
                        ];
                        const specIdx = sourceList.findIndex(
                            (s) => s.id === specimenId,
                        );
                        let itemToMove: SpecimenItem = {
                            ...movedSpecimen,
                            internal_date: destParsed.date,
                            is_manual_internal: true,
                            is_manual_client: true,
                        };

                        if (specIdx !== -1) {
                            const [removed] = sourceList.splice(specIdx, 1);
                            itemToMove = {
                                ...removed,
                                internal_date: destParsed.date,
                                is_manual_internal: true,
                                is_manual_client: true,
                            };
                        }

                        // Recalculate source day workload
                        const durationMin = itemToMove.duration_minutes || 30;
                        const sourceMinutes = Math.max(
                            0,
                            (sourceDayData?.workload?.total_minutes || 0) -
                                durationMin,
                        );
                        const sourceHours =
                            Math.round((sourceMinutes / 60) * 10) / 10;
                        const sourcePct = Math.round((sourceHours / 8) * 100);
                        const sourceColor =
                            sourceHours > 8.0
                                ? 'red'
                                : sourceHours >= 6.0
                                  ? 'yellow'
                                  : 'green';

                        updatedRow.days[sourceParsed.date] = {
                            ...sourceDayData,
                            specimens: sourceList,
                            workload: {
                                ...(sourceDayData?.workload || {
                                    hours: 0,
                                    percentage: 0,
                                    color: 'green',
                                    color_class: '',
                                    progress_class: '',
                                    label: '',
                                    specimen_count: 0,
                                    formatted_time: '',
                                }),
                                total_minutes: sourceMinutes,
                                hours: sourceHours,
                                percentage: sourcePct,
                                color: sourceColor,
                                formatted_time: `${sourceHours}h / 8.0h`,
                                specimen_count: sourceList.length,
                            },
                        };

                        // 2. Add to destination date
                        const destDayData = updatedRow.days[
                            destParsed.date
                        ] || {
                            specimens: [],
                            workload: {
                                total_minutes: 0,
                                hours: 0,
                                percentage: 0,
                                color: 'green',
                                color_class: '',
                                progress_class: '',
                                label: '',
                                specimen_count: 0,
                                formatted_time: '',
                            },
                        };
                        const destList = [...(destDayData.specimens || [])];

                        if (pId === destParsed.userId) {
                            destList.splice(destination.index, 0, itemToMove);
                        } else {
                            const targetIdx = Math.min(
                                destination.index,
                                destList.length,
                            );
                            destList.splice(targetIdx, 0, itemToMove);
                        }

                        // Recalculate dest day workload
                        const destMinutes =
                            (destDayData.workload?.total_minutes || 0) +
                            durationMin;
                        const destHours =
                            Math.round((destMinutes / 60) * 10) / 10;
                        const destPct = Math.round((destHours / 8) * 100);
                        const destColor =
                            destHours > 8.0
                                ? 'red'
                                : destHours >= 6.0
                                  ? 'yellow'
                                  : 'green';

                        updatedRow.days[destParsed.date] = {
                            ...destDayData,
                            specimens: destList,
                            workload: {
                                ...destDayData.workload,
                                total_minutes: destMinutes,
                                hours: destHours,
                                percentage: destPct,
                                color: destColor,
                                formatted_time: `${destHours}h / 8.0h`,
                                specimen_count: destList.length,
                            },
                        };

                        return updatedRow;
                    }),
                );

                // Persist date change on backend with reason
                router.post(
                    rescheduleAction(specimenId).url,
                    {
                        target_date: destParsed.date,
                        reason,
                    },
                    {
                        preserveScroll: true,
                        preserveState: true,
                        onSuccess: () => {
                            toast.success(
                                `Muestra reprogramada para ${destParsed.date} en todos los patólogos asignados (${assignedIds.length})`,
                            );
                            setIsSubmittingMove(false);
                            setIsMoveReasonDialogOpen(false);
                            setPendingMove(null);
                        },
                        onError: (errors) => {
                            setUnassignedRow(prevUnassigned);
                            setPathologistRows(prevPathologists);
                            const msg =
                                Object.values(errors)[0] ||
                                'Error al reprogramar la muestra';
                            toast.error(String(msg));
                            setIsSubmittingMove(false);
                            setIsMoveReasonDialogOpen(false);
                            setPendingMove(null);
                        },
                    },
                );

                return;
            }

            // =========================================================================
            // SCENARIO B: Single-assigned or unassigned specimen
            // =========================================================================
            // 1. Remove from source
            if (sourceParsed.userId === 'unassigned') {
                const list = [...(unassignedRow.days[sourceParsed.date] || [])];
                const [item] = list.splice(source.index, 1);
                movedSpecimen = item;
                setUnassignedRow((prev) => ({
                    ...prev,
                    total_specimens: Math.max(0, prev.total_specimens - 1),
                    days: {
                        ...prev.days,
                        [sourceParsed.date]: list,
                    },
                }));
            } else {
                const pIdx = pathologistRows.findIndex(
                    (p) => p.user.id === sourceParsed.userId,
                );

                if (pIdx !== -1) {
                    const updatedRows = [...pathologistRows];
                    const row = { ...updatedRows[pIdx] };
                    const dayData = row.days[sourceParsed.date];
                    const list = [...(dayData?.specimens || [])];
                    const [item] = list.splice(source.index, 1);
                    movedSpecimen = item;

                    row.days = {
                        ...row.days,
                        [sourceParsed.date]: {
                            ...dayData,
                            specimens: list,
                        },
                    };
                    row.total_specimens = Math.max(0, row.total_specimens - 1);
                    updatedRows[pIdx] = row;
                    setPathologistRows(updatedRows);
                }
            }

            if (!movedSpecimen) {
                setIsSubmittingMove(false);

                return;
            }

            // Update moved specimen metadata optimistically
            movedSpecimen = {
                ...movedSpecimen,
                internal_date: destParsed.date,
                is_manual_internal: true,
                is_manual_client: true,
                assigned_user_ids:
                    destParsed.userId === 'unassigned'
                        ? []
                        : [destParsed.userId as number],
            };

            // 2. Insert into destination
            if (destParsed.userId === 'unassigned') {
                setUnassignedRow((prev) => {
                    const list = [...(prev.days[destParsed.date] || [])];
                    list.splice(destination.index, 0, movedSpecimen!);

                    return {
                        ...prev,
                        total_specimens: prev.total_specimens + 1,
                        days: {
                            ...prev.days,
                            [destParsed.date]: list,
                        },
                    };
                });
            } else {
                setPathologistRows((prevRows) => {
                    const updatedRows = [...prevRows];
                    const pIdx = updatedRows.findIndex(
                        (p) => p.user.id === destParsed.userId,
                    );

                    if (pIdx !== -1) {
                        const row = { ...updatedRows[pIdx] };
                        const dayData = row.days[destParsed.date] || {
                            specimens: [],
                            workload: {
                                total_minutes: 0,
                                hours: 0,
                                percentage: 0,
                                color: 'green',
                                color_class: '',
                                progress_class: '',
                                label: '',
                                specimen_count: 0,
                                formatted_time: '',
                            },
                        };
                        const list = [...(dayData.specimens || [])];
                        list.splice(destination.index, 0, movedSpecimen!);

                        row.days = {
                            ...row.days,
                            [destParsed.date]: {
                                ...dayData,
                                specimens: list,
                            },
                        };
                        row.total_specimens = row.total_specimens + 1;
                        updatedRows[pIdx] = row;
                    }

                    return updatedRows;
                });
            }

            // 3. Send persist request to backend with reason
            router.post(
                rescheduleAction(specimenId).url,
                {
                    target_date: destParsed.date,
                    target_user_id:
                        destParsed.userId === 'unassigned'
                            ? 'unassigned'
                            : destParsed.userId,
                    reason,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        toast.success('Muestra reprogramada exitosamente');
                        setIsSubmittingMove(false);
                        setIsMoveReasonDialogOpen(false);
                        setPendingMove(null);
                    },
                    onError: (errors) => {
                        // Rollback optimistic update
                        setUnassignedRow(prevUnassigned);
                        setPathologistRows(prevPathologists);
                        const msg =
                            Object.values(errors)[0] ||
                            'Error al reprogramar la muestra';
                        toast.error(String(msg));
                        setIsSubmittingMove(false);
                        setIsMoveReasonDialogOpen(false);
                        setPendingMove(null);
                    },
                },
            );
        },
        [pendingMove, unassignedRow, pathologistRows],
    );

    return (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="relative overflow-hidden rounded-lg border bg-card shadow-xs">
                {/* Scrollable calendar table container */}
                <div ref={scrollContainerRef} className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                        <table className="w-max min-w-full border-separate border-spacing-0 text-left">
                            {/* Table Header: Dates */}
                            <thead>
                                <tr className="bg-muted/40 text-xs">
                                    {/* Pinned Left Header: Pathologists */}
                                    <th className="sticky left-0 z-30 w-56 max-w-[220px] min-w-[220px] border-r border-b border-border bg-background p-3 font-bold text-foreground shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <span>Patólogos</span>
                                            <Badge
                                                variant="outline"
                                                className="h-5 px-1.5 text-[10px] font-semibold"
                                            >
                                                {pathologistRows.length} activos
                                            </Badge>
                                        </div>
                                    </th>

                                    {/* Date Columns */}
                                    {visibleCalendarDays.map((day) => {
                                        const colWidth =
                                            dateColumnWidths[day.date] || 180;

                                        return (
                                            <th
                                                key={day.date}
                                                id={`day-column-${day.date}`}
                                                style={{
                                                    width: `${colWidth}px`,
                                                    minWidth: `${colWidth}px`,
                                                }}
                                                className={`border-r border-b border-border p-2.5 text-center font-medium transition-colors ${
                                                    day.is_today
                                                        ? 'bg-primary/5 text-primary ring-1 ring-primary/30'
                                                        : day.is_past
                                                          ? 'bg-destructive/5 text-destructive/90'
                                                          : day.is_weekend
                                                            ? 'bg-muted/30 text-muted-foreground'
                                                            : 'bg-muted/10 text-foreground'
                                                }`}
                                            >
                                                <div className="flex flex-col items-center justify-center gap-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-bold tracking-wider uppercase opacity-75">
                                                            {day.day_name}
                                                        </span>
                                                        <span className="text-sm font-extrabold">
                                                            {day.day_number}
                                                        </span>
                                                        <span className="text-[10px] font-medium opacity-75">
                                                            {day.month_name}
                                                        </span>
                                                    </div>

                                                    {day.is_today && (
                                                        <span className="py-0.2 rounded-full bg-primary px-2 text-[8px] font-extrabold text-primary-foreground shadow-xs">
                                                            HOY
                                                        </span>
                                                    )}

                                                    {day.is_past && (
                                                        <span className="text-[8px] font-semibold text-destructive/80">
                                                            Vencido
                                                        </span>
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody>
                                {/* Row 0: Sin Asignar (Shown when toggle is enabled) */}
                                {showUnassigned && (
                                    <tr
                                        className={`bg-amber-500/5 transition-all duration-200 ${
                                            draggingInfo?.isMultiAssigned &&
                                            draggingInfo.sourceUserId !==
                                                'unassigned'
                                                ? 'opacity-40 grayscale-[30%]'
                                                : 'hover:bg-amber-500/10'
                                        }`}
                                    >
                                        {/* Pinned Left Cell */}
                                        <td className="sticky left-0 z-20 w-56 max-w-[220px] min-w-[220px] border-r border-b border-border bg-background p-3 align-top shadow-xs">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                                                    <UserX className="h-4 w-4" />
                                                </div>
                                                <div className="flex min-w-0 flex-col">
                                                    <span className="truncate text-xs font-bold text-foreground">
                                                        Sin Asignar
                                                    </span>
                                                    <div className="mt-0.5 flex items-center gap-1">
                                                        <Badge
                                                            variant="outline"
                                                            className="h-4 border-amber-300 bg-amber-50 px-1 text-[9px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                                                        >
                                                            {
                                                                unassignedRow.total_specimens
                                                            }{' '}
                                                            muestras
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Date Droppable Cells for Sin Asignar */}
                                        {visibleCalendarDays.map((day) => {
                                            const specimens =
                                                unassignedRow.days[day.date] ||
                                                [];
                                            const droppableId = `cell_unassigned_${day.date}`;
                                            const colWidth =
                                                dateColumnWidths[day.date] ||
                                                180;

                                            return (
                                                <td
                                                    key={droppableId}
                                                    style={{
                                                        width: `${colWidth}px`,
                                                        minWidth: `${colWidth}px`,
                                                    }}
                                                    className={`border-r border-b border-border p-1.5 align-top transition-colors ${
                                                        day.is_today
                                                            ? 'bg-primary/[0.02]'
                                                            : day.is_weekend
                                                              ? 'bg-muted/10'
                                                              : ''
                                                    }`}
                                                >
                                                    <Droppable
                                                        droppableId={
                                                            droppableId
                                                        }
                                                        direction="horizontal"
                                                        isDropDisabled={
                                                            !canManage ||
                                                            Boolean(
                                                                draggingInfo?.isMultiAssigned &&
                                                                draggingInfo.sourceUserId !==
                                                                    'unassigned',
                                                            )
                                                        }
                                                    >
                                                        {(
                                                            provided,
                                                            snapshot,
                                                        ) => (
                                                            <div
                                                                ref={
                                                                    provided.innerRef
                                                                }
                                                                {...provided.droppableProps}
                                                                className={`flex min-h-[95px] w-full flex-row items-stretch gap-2 rounded-md p-1 transition-colors ${
                                                                    snapshot.isDraggingOver
                                                                        ? 'ring-dashed bg-amber-500/15 ring-2 ring-amber-400/50'
                                                                        : specimens.length ===
                                                                            0
                                                                          ? 'bg-transparent'
                                                                          : ''
                                                                }`}
                                                            >
                                                                {specimens.map(
                                                                    (
                                                                        specimen,
                                                                        idx,
                                                                    ) => (
                                                                        <BalanceCard
                                                                            key={`unassigned_${specimen.id}`}
                                                                            draggableId={`unassigned_${specimen.id}`}
                                                                            specimen={
                                                                                specimen
                                                                            }
                                                                            index={
                                                                                idx
                                                                            }
                                                                            canEdit={
                                                                                canManage
                                                                            }
                                                                            isSelectionMode={
                                                                                isSelectionMode
                                                                            }
                                                                            isSelected={selectedIds.includes(
                                                                                specimen.id,
                                                                            )}
                                                                            onToggleSelect={
                                                                                onToggleSelect
                                                                            }
                                                                            isLinkedDrag={Boolean(
                                                                                draggingInfo?.isMultiAssigned &&
                                                                                draggingInfo.specimenId ===
                                                                                    specimen.id &&
                                                                                draggingInfo.sourceUserId !==
                                                                                    'unassigned',
                                                                            )}
                                                                            onView={
                                                                                onViewSpecimen
                                                                            }
                                                                            onEdit={
                                                                                onEditSpecimen
                                                                            }
                                                                        />
                                                                    ),
                                                                )}
                                                                {
                                                                    provided.placeholder
                                                                }
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )}

                                {/* Rows 1..N: Pathologists */}
                                {pathologistRows.map((row, rowIndex) => {
                                    const pId = row.user.id;
                                    const isLastRow =
                                        rowIndex === pathologistRows.length - 1;

                                    return (
                                        <tr
                                            key={pId}
                                            className={`transition-all duration-200 ${
                                                draggingInfo?.isMultiAssigned &&
                                                draggingInfo.sourceUserId !==
                                                    pId
                                                    ? 'opacity-40 grayscale-[30%]'
                                                    : 'hover:bg-muted/20'
                                            }`}
                                        >
                                            {/* Pinned Left Cell */}
                                            <td
                                                className={`sticky left-0 z-20 w-56 max-w-[220px] min-w-[220px] border-r border-border bg-background p-3 align-top shadow-xs ${
                                                    isLastRow
                                                        ? 'border-b-0'
                                                        : 'border-b'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar className="h-8 w-8 shrink-0 border">
                                                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                                            {row.user.name
                                                                .split(' ')
                                                                .map(
                                                                    (n) => n[0],
                                                                )
                                                                .slice(0, 2)
                                                                .join('')}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex min-w-0 flex-col">
                                                        <span className="truncate text-xs font-semibold text-foreground">
                                                            {row.user.name}
                                                        </span>

                                                        <div className="mt-0.5 flex items-center gap-1.5">
                                                            <span className="text-[10px] font-medium text-muted-foreground">
                                                                {
                                                                    row.total_specimens
                                                                }{' '}
                                                                muestras
                                                            </span>

                                                            {/* Pressure indicator dot */}
                                                            <TooltipProvider
                                                                delayDuration={
                                                                    200
                                                                }
                                                            >
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        asChild
                                                                    >
                                                                        <span
                                                                            className={`py-0.2 inline-flex items-center gap-0.5 rounded px-1.5 text-[9px] font-bold ${
                                                                                row.overall_color ===
                                                                                'red'
                                                                                    ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                                                                                    : row.overall_color ===
                                                                                        'yellow'
                                                                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                                                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                                            }`}
                                                                        >
                                                                            {
                                                                                row.total_hours
                                                                            }
                                                                            h
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent
                                                                        side="right"
                                                                        className="text-xs"
                                                                    >
                                                                        Total
                                                                        horas
                                                                        estimadas
                                                                        pendientes:{' '}
                                                                        {
                                                                            row.total_hours
                                                                        }
                                                                        h
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Date Droppable Cells */}
                                            {visibleCalendarDays.map((day) => {
                                                const dayData =
                                                    row.days[day.date];
                                                const specimens =
                                                    dayData?.specimens || [];
                                                const workload =
                                                    dayData?.workload;
                                                const droppableId = `cell_${pId}_${day.date}`;
                                                const colWidth =
                                                    dateColumnWidths[
                                                        day.date
                                                    ] || 180;

                                                return (
                                                    <td
                                                        key={droppableId}
                                                        style={{
                                                            width: `${colWidth}px`,
                                                            minWidth: `${colWidth}px`,
                                                        }}
                                                        className={`border-r border-border p-1.5 align-top transition-colors ${
                                                            isLastRow
                                                                ? 'border-b-0'
                                                                : 'border-b'
                                                        } ${
                                                            day.is_today
                                                                ? 'bg-primary/[0.02]'
                                                                : day.is_weekend
                                                                  ? 'bg-muted/10'
                                                                  : ''
                                                        }`}
                                                    >
                                                        {/* Daily 8h Workload Progress Bar at top of cell */}
                                                        {workload &&
                                                            workload.total_minutes >
                                                                0 && (
                                                                <div className="mb-1.5 rounded-md border bg-card/80 p-1.5 shadow-2xs">
                                                                    <div className="mb-1 flex items-center justify-between text-[9px] font-semibold text-muted-foreground">
                                                                        <span>
                                                                            {
                                                                                workload.formatted_time
                                                                            }
                                                                        </span>
                                                                        <span
                                                                            className={`font-bold ${
                                                                                workload.color ===
                                                                                'red'
                                                                                    ? 'text-red-600 dark:text-red-400'
                                                                                    : workload.color ===
                                                                                        'yellow'
                                                                                      ? 'text-amber-600 dark:text-amber-400'
                                                                                      : 'text-emerald-600 dark:text-emerald-400'
                                                                            }`}
                                                                        >
                                                                            {
                                                                                workload.percentage
                                                                            }
                                                                            %
                                                                        </span>
                                                                    </div>

                                                                    {/* Progress track */}
                                                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all duration-300 ${workload.progress_class}`}
                                                                            style={{
                                                                                width: `${Math.min(100, workload.percentage)}%`,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                        <Droppable
                                                            droppableId={
                                                                droppableId
                                                            }
                                                            direction="horizontal"
                                                            isDropDisabled={
                                                                !canManage ||
                                                                Boolean(
                                                                    draggingInfo?.isMultiAssigned &&
                                                                    draggingInfo.sourceUserId !==
                                                                        pId,
                                                                )
                                                            }
                                                        >
                                                            {(
                                                                provided,
                                                                snapshot,
                                                            ) => (
                                                                <div
                                                                    ref={
                                                                        provided.innerRef
                                                                    }
                                                                    {...provided.droppableProps}
                                                                    className={`flex min-h-[95px] w-full flex-row items-stretch gap-2 rounded-md p-1 transition-colors ${
                                                                        snapshot.isDraggingOver
                                                                            ? 'ring-dashed bg-primary/10 ring-2 ring-primary/40'
                                                                            : specimens.length ===
                                                                                0
                                                                              ? 'bg-transparent'
                                                                              : ''
                                                                    }`}
                                                                >
                                                                    {specimens.map(
                                                                        (
                                                                            specimen,
                                                                            idx,
                                                                        ) => (
                                                                            <BalanceCard
                                                                                key={`${pId}_${specimen.id}`}
                                                                                draggableId={`${pId}_${specimen.id}`}
                                                                                specimen={
                                                                                    specimen
                                                                                }
                                                                                index={
                                                                                    idx
                                                                                }
                                                                                canEdit={
                                                                                    canManage
                                                                                }
                                                                                isSelectionMode={
                                                                                    isSelectionMode
                                                                                }
                                                                                isSelected={selectedIds.includes(
                                                                                    specimen.id,
                                                                                )}
                                                                                onToggleSelect={
                                                                                    onToggleSelect
                                                                                }
                                                                                isLinkedDrag={Boolean(
                                                                                    draggingInfo?.isMultiAssigned &&
                                                                                    draggingInfo.specimenId ===
                                                                                        specimen.id &&
                                                                                    draggingInfo.sourceUserId !==
                                                                                        pId,
                                                                                )}
                                                                                onView={
                                                                                    onViewSpecimen
                                                                                }
                                                                                onEdit={
                                                                                    onEditSpecimen
                                                                                }
                                                                            />
                                                                        ),
                                                                    )}
                                                                    {
                                                                        provided.placeholder
                                                                    }
                                                                </div>
                                                            )}
                                                        </Droppable>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}

                                {pathologistRows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={
                                                visibleCalendarDays.length + 1
                                            }
                                            className="py-12 text-center text-sm text-muted-foreground"
                                        >
                                            No se encontraron patólogos con
                                            muestras asignadas en este filtro.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal de confirmación de motivo de movimiento */}
            <MoveReasonDialog
                open={isMoveReasonDialogOpen}
                onOpenChange={(isOpen) => {
                    if (!isOpen && !isSubmittingMove) {
                        handleCancelMove();
                    } else {
                        setIsMoveReasonDialogOpen(isOpen);
                    }
                }}
                specimen={pendingMove?.specimen || null}
                sourceDate={pendingMove?.sourceParsed.date}
                targetDate={pendingMove?.destParsed.date}
                sourcePathologistName={pendingMove?.sourcePathologistName}
                targetPathologistName={pendingMove?.destPathologistName}
                onConfirm={handleConfirmMove}
                onCancel={handleCancelMove}
                isSubmitting={isSubmittingMove}
            />
        </DragDropContext>
    );
};
