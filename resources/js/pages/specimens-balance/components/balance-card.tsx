import { Draggable } from '@hello-pangea/dnd';
import { CalendarClock, Edit2, Eye, MoreVertical, Users } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SpecimenItem } from '../types';

interface BalanceCardProps {
    specimen: SpecimenItem;
    index: number;
    canEdit?: boolean;
    draggableId?: string;
    isLinkedDrag?: boolean;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (id: number) => void;
    onView?: (specimen: SpecimenItem) => void;
    onEdit?: (specimen: SpecimenItem) => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
    specimen,
    index,
    canEdit = true,
    draggableId,
    isLinkedDrag = false,
    isSelectionMode = false,
    isSelected = false,
    onToggleSelect,
    onView,
    onEdit,
}) => {
    // Format dates to short dd/MM
    const formatShortDate = (dateStr: string) => {
        if (!dateStr) {
            return '';
        }

        const parts = dateStr.split('-');

        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}`;
        }

        return dateStr;
    };

    const isMultiAssigned = (specimen.assigned_user_ids?.length || 0) > 1;

    return (
        <Draggable
            draggableId={draggableId || specimen.id.toString()}
            index={index}
            isDragDisabled={!canEdit || isSelectionMode}
        >
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...(isSelectionMode ? {} : provided.dragHandleProps)}
                    onClick={() => {
                        if (isSelectionMode) {
                            onToggleSelect?.(specimen.id);
                        } else {
                            onView?.(specimen);
                        }
                    }}
                    style={{
                        ...provided.draggableProps.style,
                        borderColor: specimen.examination_color || '#3b82f6',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                    }}
                    className={`group relative flex h-full min-h-[105px] w-[270px] min-w-[270px] shrink-0 cursor-pointer flex-col justify-between gap-1.5 rounded-md bg-card p-2 shadow-xs transition-all duration-150 select-none hover:shadow-md hover:ring-1 hover:ring-foreground/15 dark:hover:ring-foreground/25 ${
                        snapshot.isDragging
                            ? 'z-50 scale-[1.02] rotate-1 opacity-95 shadow-xl ring-2 ring-primary/40'
                            : isSelected
                              ? 'border-primary bg-primary/[0.04] ring-2 ring-primary/50 dark:bg-primary/[0.08]'
                              : isLinkedDrag
                                ? 'animate-pulse border-sky-400 bg-sky-50/20 ring-2 ring-sky-400 dark:bg-sky-950/20'
                                : ''
                    }`}
                >
                    {/* Header: Code, Badges & Action Menu */}
                    <div className="flex items-start justify-between gap-1">
                        <div className="flex flex-wrap items-center gap-1">
                            {isSelectionMode && (
                                <div
                                    className="mr-1 flex-shrink-0 pt-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() =>
                                            onToggleSelect?.(specimen.id)
                                        }
                                        aria-label={`Seleccionar muestra ${specimen.sequence_code}`}
                                    />
                                </div>
                            )}
                            {specimen.sequence_code && (
                                <span className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                                    {specimen.sequence_code}
                                </span>
                            )}
                            {specimen.group_name && (
                                <Badge
                                    variant="secondary"
                                    className="border-none bg-purple-500/10 px-1 py-0 text-[8px] font-semibold text-purple-600 dark:bg-purple-500/20 dark:text-purple-300"
                                >
                                    {specimen.group_name}
                                </Badge>
                            )}
                            {isMultiAssigned && (
                                <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge
                                                variant="outline"
                                                className="h-4 border-sky-300 bg-sky-50 px-1 py-0 text-[8px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                                            >
                                                <Users className="mr-0.5 h-2.5 w-2.5" />
                                                {
                                                    specimen.assigned_user_ids
                                                        .length
                                                }
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent
                                            side="top"
                                            className="text-xs"
                                        >
                                            Muestra compartida entre{' '}
                                            {specimen.assigned_user_ids.length}{' '}
                                            patólogos:{' '}
                                            {specimen.assigned_users
                                                ?.map((u) => u.name)
                                                .join(', ')}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>

                        <div
                            className="flex items-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-muted-foreground opacity-60 transition-opacity hover:opacity-100"
                                    >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-40"
                                >
                                    <DropdownMenuItem
                                        onClick={() => onView?.(specimen)}
                                    >
                                        <Eye className="mr-2 h-3.5 w-3.5" />
                                        <span>Ver Detalle</span>
                                    </DropdownMenuItem>

                                    {canEdit && onEdit && (
                                        <DropdownMenuItem
                                            onClick={() => onEdit?.(specimen)}
                                        >
                                            <Edit2 className="mr-2 h-3.5 w-3.5" />
                                            <span>Editar</span>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Customer / Patient Name */}
                    <div className="truncate text-xs font-semibold text-foreground">
                        {specimen.customer_name}
                    </div>

                    {/* Specimen Type & Examination */}
                    <div className="flex flex-col text-[11px] leading-tight text-muted-foreground">
                        <span className="truncate font-medium text-foreground/80">
                            {specimen.type_name}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground">
                            {specimen.examination_name}
                        </span>
                    </div>

                    {/* Dates Footer */}
                    <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1 border-t border-border/50 pt-1 text-[9px] text-muted-foreground">
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="inline-flex items-center gap-1 font-medium text-primary/90">
                                        <CalendarClock className="h-2.5 w-2.5" />
                                        <span>
                                            Int:{' '}
                                            {formatShortDate(
                                                specimen.internal_date,
                                            )}
                                        </span>
                                        {specimen.is_manual_internal && (
                                            <span className="text-[7px] font-bold text-amber-600 dark:text-amber-400">
                                                *
                                            </span>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="bottom"
                                    className="text-[11px]"
                                >
                                    Entrega Interna: {specimen.internal_date}
                                    {specimen.is_manual_internal
                                        ? ' (Manual)'
                                        : ''}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-muted-foreground/80">
                                        Cli:{' '}
                                        {formatShortDate(specimen.client_date)}
                                        {specimen.is_manual_client && (
                                            <span className="text-[7px] font-bold text-amber-600 dark:text-amber-400">
                                                *
                                            </span>
                                        )}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="bottom"
                                    className="text-[11px]"
                                >
                                    Entrega al Cliente: {specimen.client_date}
                                    {specimen.is_manual_client
                                        ? ' (Manual)'
                                        : ''}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            )}
        </Draggable>
    );
};
