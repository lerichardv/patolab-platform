import { ArrowRight, Check, Loader2 } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { CompleteMacroscopyDialog } from './components/complete-macroscopy-dialog';
import { EnableEditingDialog } from './components/enable-editing-dialog';
import { StartMicroscopyDialog } from './components/start-microscopy-dialog';
import type { Specimen, SpecimenStatus } from './types';

interface SpecimenActionBarProps {
    specimen: Specimen;
    nextStatus: string | null;
    availableStates?: any[];
    isFinished: boolean;
    sessionEditingEnabled: boolean;
    canEnableEditing: boolean;
    isGeneratingPdf: boolean;
    hasMacroAccess: boolean;
    hasMicroAccess: boolean;
    onEnableEditingClick: () => void;
    onTransitionState: (status: SpecimenStatus) => void;
    onStartMicroscopyFinalization: () => void;
}

const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; bgClass: string; textClass: string }
> = {
    received: {
        label: 'Recibida',
        color: '#3b82f6',
        bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
        textClass: 'text-blue-600 dark:text-blue-400',
    },
    macroscopic_review: {
        label: 'Rev. Macroscópica',
        color: '#8b5cf6',
        bgClass: 'bg-violet-500/10 dark:bg-violet-500/20',
        textClass: 'text-violet-600 dark:text-violet-400',
    },
    processing: {
        label: 'Procesamiento',
        color: '#f59e0b',
        bgClass: 'bg-amber-500/10 dark:bg-amber-500/20',
        textClass: 'text-amber-600 dark:text-amber-400',
    },
    microscopic_review: {
        label: 'Rev. Microscópica',
        color: '#d946ef',
        bgClass: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/20',
        textClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    },
    finalized: {
        label: 'Finalizada',
        color: '#10b981',
        bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        textClass: 'text-emerald-600 dark:text-emerald-400',
    },
    delivered: {
        label: 'Entregada',
        color: '#64748b',
        bgClass: 'bg-slate-500/10 dark:bg-slate-500/20',
        textClass: 'text-slate-600 dark:text-slate-400',
    },
    cancelled: {
        label: 'Cancelada',
        color: '#ef4444',
        bgClass: 'bg-red-500/10 dark:bg-red-500/20',
        textClass: 'text-red-600 dark:text-red-400',
    },
};

export function SpecimenActionBar({
    specimen,
    nextStatus,
    availableStates = [],
    isFinished,
    sessionEditingEnabled,
    canEnableEditing,
    isGeneratingPdf,
    hasMacroAccess,
    hasMicroAccess,
    onEnableEditingClick,
    onTransitionState,
    onStartMicroscopyFinalization,
}: SpecimenActionBarProps) {
    const currentFromAvailable = availableStates.find(
        (s: any) => (s.status ?? s) === specimen.status,
    );
    const currentConfig = {
        ...(STATUS_CONFIG[specimen.status] || {
            label: specimen.status,
            color: '#cbd5e1',
            bgClass: 'bg-slate-500/10',
            textClass: 'text-slate-600',
        }),
        ...(currentFromAvailable?.label
            ? { label: currentFromAvailable.label }
            : {}),
    };

    const nextFromAvailable = nextStatus
        ? availableStates.find((s: any) => (s.status ?? s) === nextStatus)
        : null;
    const nextConfig = nextStatus
        ? {
              ...(STATUS_CONFIG[nextStatus] || {
                  label: nextStatus,
                  color: '#cbd5e1',
                  bgClass: 'bg-slate-500/10',
                  textClass: 'text-slate-600',
              }),
              ...(nextFromAvailable?.label
                  ? { label: nextFromAvailable.label }
                  : {}),
          }
        : null;

    return (
        <div className="fixed right-1 bottom-0 left-1 z-30 transition-all duration-200 lg:right-auto lg:left-4 lg:w-[calc(50vw-2rem)]">
            <div className="flex w-full items-center justify-between gap-4 rounded-t-xl border border-border/80 bg-background/90 p-2 pr-2 pl-4 shadow-xl backdrop-blur-md dark:bg-background/95 dark:shadow-2xl">
                {/* Current status pill */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                        Fase:
                    </span>
                    <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase ${currentConfig.bgClass} ${currentConfig.textClass}`}
                    >
                        {currentConfig.label}
                    </span>
                </div>

                {/* Main Action buttons */}
                <div className="flex items-center gap-2">
                    {/* If specimen is already finalized or delivered */}
                    {isFinished && !sessionEditingEnabled && (
                        <EnableEditingDialog
                            disabled={!canEnableEditing}
                            onConfirm={onEnableEditingClick}
                            className="h-8 px-3 py-2 text-xs font-semibold"
                        />
                    )}

                    {isFinished && sessionEditingEnabled && (
                        <Button
                            onClick={onStartMicroscopyFinalization}
                            disabled={isGeneratingPdf}
                            size="sm"
                            className="h-8 cursor-pointer gap-2 bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-fuchsia-700"
                        >
                            {isGeneratingPdf ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Generando...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Guardar y Finalizar</span>
                                </>
                            )}
                        </Button>
                    )}

                    {/* Contextual actions if not finished */}
                    {!isFinished && nextStatus && (
                        <>
                            {/* Case A: Next status is finalized */}
                            {nextStatus === 'finalized' && (
                                <Button
                                    onClick={onStartMicroscopyFinalization}
                                    disabled={isGeneratingPdf}
                                    size="sm"
                                    className="h-8 cursor-pointer gap-2 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                                >
                                    {isGeneratingPdf ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            <span>
                                                Generando previsualización...
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-3.5 w-3.5" />
                                            <span>Finalizar Reporte</span>
                                        </>
                                    )}
                                </Button>
                            )}

                            {/* Case B: Current is macroscopic_review, advancing to nextStatus (not finalized) */}
                            {nextStatus !== 'finalized' &&
                                specimen.status === 'macroscopic_review' &&
                                hasMacroAccess && (
                                    <CompleteMacroscopyDialog
                                        targetStatusLabel={
                                            nextConfig?.label || nextStatus
                                        }
                                        buttonSize="sm"
                                        buttonClassName="cursor-pointer gap-2 h-8 px-3 py-2 bg-violet-600 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
                                        onConfirm={() =>
                                            onTransitionState(
                                                nextStatus as SpecimenStatus,
                                            )
                                        }
                                    />
                                )}

                            {/* Case C: Current is processing, advancing to nextStatus (not finalized) */}
                            {nextStatus !== 'finalized' &&
                                specimen.status === 'processing' && (
                                    <StartMicroscopyDialog
                                        targetStatusLabel={
                                            nextConfig?.label || nextStatus
                                        }
                                        buttonSize="sm"
                                        buttonClassName="cursor-pointer gap-2 h-8 px-3 py-2 bg-fuchsia-600 text-xs font-semibold text-white shadow-sm hover:bg-fuchsia-700"
                                        onConfirm={() =>
                                            onTransitionState(
                                                nextStatus as SpecimenStatus,
                                            )
                                        }
                                    />
                                )}

                            {/* Case D: Current is microscopic_review and nextStatus is something other than finalized */}
                            {nextStatus !== 'finalized' &&
                                specimen.status === 'microscopic_review' &&
                                hasMicroAccess && (
                                    <Button
                                        onClick={() =>
                                            onTransitionState(
                                                nextStatus as SpecimenStatus,
                                            )
                                        }
                                        size="sm"
                                        className="h-8 cursor-pointer gap-2 bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-fuchsia-700"
                                    >
                                        <span>
                                            Avanzar a{' '}
                                            {nextConfig?.label || nextStatus}
                                        </span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                )}

                            {/* Case E: Any other intermediate status advancing to nextStatus (not finalized) */}
                            {nextStatus !== 'finalized' &&
                                specimen.status !== 'macroscopic_review' &&
                                specimen.status !== 'processing' &&
                                specimen.status !== 'microscopic_review' && (
                                    <Button
                                        onClick={() =>
                                            onTransitionState(
                                                nextStatus as SpecimenStatus,
                                            )
                                        }
                                        size="sm"
                                        className="h-8 cursor-pointer gap-2 bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                                    >
                                        <span>
                                            Avanzar a{' '}
                                            {nextConfig?.label || nextStatus}
                                        </span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SpecimenActionBar;
