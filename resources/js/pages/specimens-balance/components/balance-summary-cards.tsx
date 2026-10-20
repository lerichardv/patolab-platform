import {
    ArcElement,
    Chart as ChartJS,
    DoughnutController,
    Legend,
    Tooltip,
} from 'chart.js';
import { CheckCircle2, ChevronRight, Users } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { BalanceSummary } from '../types';

ChartJS.register(DoughnutController, ArcElement, Tooltip, Legend);

interface BalanceSummaryCardsProps {
    summary: BalanceSummary;
    onOpenUnassignedSheet: () => void;
    onOpenExpiredSheet: () => void;
}

function BalanceDoughnutChart({
    totalSpecimens,
    assignedPercentage,
    pathologistsDistribution,
    unassignedCount,
}: {
    totalSpecimens: number;
    assignedPercentage: number;
    pathologistsDistribution: {
        id: number;
        name: string;
        count: number;
        color: string;
    }[];
    unassignedCount: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const chartInstanceRef = useRef<ChartJS | null>(null);

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const labels: string[] = [];
        const data: number[] = [];
        const backgroundColor: string[] = [];

        if (totalSpecimens === 0) {
            labels.push('Sin muestras');
            data.push(1);
            backgroundColor.push('#e2e8f0');
        } else {
            pathologistsDistribution.forEach((p) => {
                if (p.count > 0) {
                    labels.push(p.name);
                    data.push(p.count);
                    backgroundColor.push(p.color);
                }
            });

            if (unassignedCount > 0) {
                labels.push('No asignadas');
                data.push(unassignedCount);
                backgroundColor.push('#cbd5e1');
            }
        }

        const ctx = canvasRef.current.getContext('2d');

        if (!ctx) {
            return;
        }

        chartInstanceRef.current = new ChartJS(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [
                    {
                        data,
                        backgroundColor,
                        borderWidth: 2,
                        borderColor: 'transparent',
                        hoverOffset: 3,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        enabled: false, // Use external HTML tooltip to prevent clipping by canvas boundaries
                        external: (context) => {
                            const tooltipEl = tooltipRef.current;

                            if (!tooltipEl) {
                                return;
                            }

                            if (context.tooltip.opacity === 0) {
                                tooltipEl.style.opacity = '0';

                                return;
                            }

                            const dp = context.tooltip.dataPoints?.[0];

                            if (!dp) {
                                return;
                            }

                            const label = dp.label || '';
                            const count = Number(dp.raw);
                            const pct =
                                totalSpecimens > 0
                                    ? Math.round((count / totalSpecimens) * 100)
                                    : 0;
                            const color =
                                (dp.dataset.backgroundColor as string[])?.[
                                    dp.dataIndex
                                ] || '#3b82f6';

                            tooltipEl.innerHTML = `
                                <div class="flex items-center gap-1.5 font-semibold text-foreground">
                                    <span class="inline-block h-2.5 w-2.5 rounded-xs shrink-0" style="background-color: ${color};"></span>
                                    <span>${label}</span>
                                </div>
                                <div class="mt-1 text-[11px] text-muted-foreground">
                                    <span class="font-medium text-foreground">${count}</span> ${count === 1 ? 'muestra' : 'muestras'} (${pct}%)
                                </div>
                            `;

                            const caretX = context.tooltip.caretX;
                            const caretY = context.tooltip.caretY;

                            // Always position tooltip to the right of the cursor point so it never overflows
                            // to the left over the card border and AppContent overflow-x-hidden boundary
                            const left = Math.max(16, caretX + 14);

                            let translateY = '-50%';

                            if (caretY < 30) {
                                translateY = '0%';
                            } else if (caretY > 98) {
                                translateY = '-100%';
                            }

                            tooltipEl.style.transform = `translateY(${translateY})`;
                            tooltipEl.style.left = `${left}px`;
                            tooltipEl.style.top = `${caretY}px`;
                            tooltipEl.style.opacity = '1';
                        },
                    },
                },
                animation: {
                    duration: 400,
                },
            },
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [totalSpecimens, pathologistsDistribution, unassignedCount]);

    return (
        <div className="relative z-30 flex h-32 w-32 shrink-0 items-center justify-center">
            <canvas ref={canvasRef} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-2xl font-extrabold tracking-tight text-foreground">
                    {assignedPercentage}%
                </span>
                <span className="text-[9px] leading-tight font-medium text-muted-foreground">
                    Carga asignada
                </span>
            </div>

            {/* Floating HTML Tooltip overlay */}
            <div
                ref={tooltipRef}
                className="pointer-events-none absolute z-50 rounded-lg border border-border/80 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg backdrop-blur-xs transition-opacity duration-150"
                style={{
                    opacity: 0,
                    whiteSpace: 'nowrap',
                }}
            />
        </div>
    );
}

export function BalanceSummaryCards({
    summary,
    onOpenUnassignedSheet,
    onOpenExpiredSheet,
}: BalanceSummaryCardsProps) {
    const {
        total_specimens,
        assigned_count,
        unassigned_count,
        assigned_percentage,
        pathologists_distribution,
        unassigned_preview,
        expired_count,
        expired_preview,
    } = summary;

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Card 1: Resumen de Carga / Distribución */}
            <Card className="flex flex-col justify-between border-border/80 bg-card p-4 shadow-xs">
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Resumen de Carga
                        </span>
                        <Badge
                            variant="outline"
                            className="text-[11px] font-normal"
                        >
                            {total_specimens} total
                        </Badge>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Chart.js Doughnut Chart */}
                        <BalanceDoughnutChart
                            totalSpecimens={total_specimens}
                            assignedPercentage={assigned_percentage}
                            pathologistsDistribution={pathologists_distribution}
                            unassignedCount={unassigned_count}
                        />

                        {/* Legend */}
                        <div className="flex max-h-32 min-w-0 flex-1 flex-col justify-center gap-1.5 overflow-y-auto pr-1">
                            {pathologists_distribution.length === 0 ? (
                                <div className="text-xs text-muted-foreground">
                                    Sin patólogos
                                </div>
                            ) : (
                                <>
                                    {pathologists_distribution.map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex items-center justify-between gap-1.5 text-xs"
                                            title={`${p.name}: ${p.count} muestras`}
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                                                    style={{
                                                        backgroundColor:
                                                            p.color,
                                                    }}
                                                />
                                                <span className="truncate text-muted-foreground">
                                                    {p.name}
                                                </span>
                                            </div>
                                            <span className="shrink-0 font-medium text-foreground tabular-nums">
                                                {p.count}
                                            </span>
                                        </div>
                                    ))}

                                    {unassigned_count > 0 && (
                                        <div
                                            className="flex items-center justify-between gap-1.5 border-t border-border/50 pt-1 text-xs"
                                            title={`No asignadas: ${unassigned_count} muestras`}
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="h-2.5 w-2.5 shrink-0 rounded-xs bg-slate-300 dark:bg-slate-600" />
                                                <span className="truncate text-muted-foreground">
                                                    No asignadas
                                                </span>
                                            </div>
                                            <span className="shrink-0 font-medium text-foreground tabular-nums">
                                                {unassigned_count}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {
                            pathologists_distribution.filter((p) => p.count > 0)
                                .length
                        }{' '}
                        patólogos activos
                    </span>
                    <span className="font-medium text-foreground">
                        {assigned_count} asignadas
                    </span>
                </div>
            </Card>

            {/* Card 2: Casos Pendientes / Sin Asignar */}
            <Card className="flex flex-col justify-between border-border/80 bg-card p-4 shadow-xs">
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Casos Pendientes
                        </span>
                        {unassigned_count > 0 ? (
                            <Badge
                                variant="secondary"
                                className="text-[11px] font-semibold tabular-nums"
                            >
                                {unassigned_count}
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="text-[11px] font-normal text-emerald-600"
                            >
                                0
                            </Badge>
                        )}
                    </div>

                    {unassigned_preview.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                            <CheckCircle2 className="mb-1 h-6 w-6 text-emerald-500" />
                            <span>No hay muestras pendientes por asignar</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/40">
                            {unassigned_preview.map((item) => {
                                const isStat =
                                    item.priority_name
                                        ?.toLowerCase()
                                        .includes('stat') ||
                                    item.priority_name
                                        ?.toLowerCase()
                                        .includes('urgente');
                                const isHigh =
                                    item.priority_name
                                        ?.toLowerCase()
                                        .includes('alta') ||
                                    item.priority_name
                                        ?.toLowerCase()
                                        .includes('prioritari');

                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-2 py-1.5 text-xs transition-colors hover:bg-muted/30"
                                    >
                                        <span className="shrink-0 font-mono font-semibold text-foreground">
                                            {item.sequence_code}
                                        </span>
                                        <span
                                            className="max-w-[130px] min-w-0 truncate text-muted-foreground"
                                            title={item.examination_name}
                                        >
                                            {item.examination_name}
                                        </span>
                                        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                                            {item.points} pts
                                        </span>
                                        <span
                                            className={cn(
                                                'shrink-0 text-[11px] font-bold uppercase',
                                                isStat
                                                    ? 'font-extrabold text-destructive'
                                                    : isHigh
                                                      ? 'text-amber-500'
                                                      : 'font-medium text-muted-foreground',
                                            )}
                                        >
                                            {item.priority_name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-2 border-t border-border/60 pt-2 text-right">
                    <button
                        type="button"
                        onClick={onOpenUnassignedSheet}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
                    >
                        <span>Ver todos los pendientes</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </Card>

            {/* Card 3: Próximos a Vencer (TAT) / Muestras Vencidas */}
            <Card className="flex flex-col justify-between border-border/80 bg-card p-4 shadow-xs">
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Próximos a Vencer (TAT)
                        </span>
                        {expired_count > 0 ? (
                            <Badge
                                variant="destructive"
                                className="text-[11px] font-semibold tabular-nums"
                            >
                                {expired_count}
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="text-[11px] font-normal text-emerald-600"
                            >
                                0
                            </Badge>
                        )}
                    </div>

                    {expired_preview.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                            <CheckCircle2 className="mb-1 h-6 w-6 text-emerald-500" />
                            <span>
                                No hay muestras vencidas o fuera de tiempo
                            </span>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/40">
                            {expired_preview.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-2 py-1.5 text-xs transition-colors hover:bg-muted/30"
                                >
                                    <span className="shrink-0 font-mono font-semibold text-destructive">
                                        {item.sequence_code}
                                    </span>
                                    <span
                                        className="max-w-[140px] min-w-0 truncate text-muted-foreground"
                                        title={item.examination_name}
                                    >
                                        {item.examination_name}
                                    </span>
                                    <span className="shrink-0 font-semibold text-destructive tabular-nums">
                                        {item.overdue_label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-2 border-t border-border/60 pt-2 text-right">
                    <button
                        type="button"
                        onClick={onOpenExpiredSheet}
                        className="inline-flex items-center gap-1 text-xs font-medium text-destructive transition-colors hover:underline"
                    >
                        <span>Ver todas las vencidas</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </Card>
        </div>
    );
}
