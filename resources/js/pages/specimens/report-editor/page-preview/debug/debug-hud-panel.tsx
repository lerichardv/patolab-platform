import {
    Activity,
    ChevronDown,
    ChevronUp,
    Compass,
    Eye,
    EyeOff,
    Layers,
    Minimize2,
    Ruler,
    Table,
} from 'lucide-react';
import React, { useState } from 'react';

import { useDebugReport } from './debug-context';
import type { MeasuredBlock } from './types';

interface DebugHudPanelProps {
    pages: MeasuredBlock[][];
    totalPages: number;
}

export function DebugHudPanel({ pages, totalPages }: DebugHudPanelProps) {
    const {
        isEnvDebugReportEnabled,
        showMaster,
        showMargins,
        showRulers,
        showBlockBounds,
        showSubElements,
        showPageGauges,
        compactMode,
        selectedBlockId,
        setShowMaster,
        toggleLayer,
        resetDefaults,
        setSelectedBlockId,
    } = useDebugReport();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<
        'controls' | 'pages' | 'inspector'
    >('controls');

    if (!isEnvDebugReportEnabled) {
        return null;
    }

    const maxBodyHeight = 212.79;

    // Find selected block
    let selectedBlock: MeasuredBlock | null = null;

    if (selectedBlockId) {
        for (const p of pages) {
            const found = p.find((b) => b.id === selectedBlockId);

            if (found) {
                selectedBlock = found;
                break;
            }
        }
    }

    if (isCollapsed) {
        return (
            <div className="fixed right-6 bottom-6 z-50">
                <button
                    type="button"
                    onClick={() => setIsCollapsed(false)}
                    className="flex items-center gap-2 rounded-full border border-cyan-500/50 bg-slate-950/90 px-3.5 py-1.5 font-mono text-xs font-semibold text-cyan-400 shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-slate-900 hover:text-cyan-300"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                    </span>
                    <span>GSAP DEBUG HUD</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed right-6 bottom-6 z-50 w-96 max-w-[calc(100vw-3rem)] rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-3.5 font-mono text-slate-100 shadow-2xl backdrop-blur-md transition-all duration-200">
            {/* HUD HEADER */}
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
                <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400">
                        <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold tracking-wide text-cyan-400">
                                REPORT DEBUGGER
                            </span>
                            <span className="py-0.2 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-1.5 text-[9px] font-bold text-emerald-400">
                                .ENV ON
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            GSAP ScrollTrigger Style Controls
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setShowMaster(!showMaster)}
                        title={
                            showMaster
                                ? 'Desactivar overlays'
                                : 'Activar overlays'
                        }
                        className={`rounded-md p-1 transition-colors ${
                            showMaster
                                ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                        {showMaster ? (
                            <Eye className="h-3.5 w-3.5" />
                        ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(true)}
                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                        title="Minimizar HUD"
                    >
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="mt-2.5 flex rounded-lg bg-slate-900/80 p-0.5 text-xs">
                <button
                    type="button"
                    onClick={() => setActiveTab('controls')}
                    className={`flex-1 rounded-md py-1 text-center font-medium transition-all ${
                        activeTab === 'controls'
                            ? 'bg-cyan-500/20 text-cyan-300 shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Capas
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('pages')}
                    className={`flex-1 rounded-md py-1 text-center font-medium transition-all ${
                        activeTab === 'pages'
                            ? 'bg-cyan-500/20 text-cyan-300 shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Páginas ({totalPages})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('inspector')}
                    className={`flex-1 rounded-md py-1 text-center font-medium transition-all ${
                        activeTab === 'inspector'
                            ? 'bg-cyan-500/20 text-cyan-300 shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Inspector {selectedBlock ? '●' : ''}
                </button>
            </div>

            {/* TAB CONTENT: CONTROLS */}
            {activeTab === 'controls' && (
                <div className="mt-3 space-y-2 text-xs">
                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-900/40 px-2.5 py-1.5 transition-colors hover:bg-slate-900/80">
                        <span className="flex items-center gap-2 text-slate-300">
                            <Compass className="h-3.5 w-3.5 text-blue-400" />
                            Márgenes y Ancho Útil (15mm / 12mm)
                        </span>
                        <input
                            type="checkbox"
                            checked={showMargins}
                            onChange={() => toggleLayer('showMargins')}
                            className="h-3.5 w-3.5 accent-cyan-500"
                        />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-900/40 px-2.5 py-1.5 transition-colors hover:bg-slate-900/80">
                        <span className="flex items-center gap-2 text-slate-300">
                            <Ruler className="h-3.5 w-3.5 text-indigo-400" />
                            Regla Vertical en Milímetros
                        </span>
                        <input
                            type="checkbox"
                            checked={showRulers}
                            onChange={() => toggleLayer('showRulers')}
                            className="h-3.5 w-3.5 accent-cyan-500"
                        />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-900/40 px-2.5 py-1.5 transition-colors hover:bg-slate-900/80">
                        <span className="flex items-center gap-2 text-slate-300">
                            <Layers className="h-3.5 w-3.5 text-cyan-400" />
                            Límites y Altos de Bloques
                        </span>
                        <input
                            type="checkbox"
                            checked={showBlockBounds}
                            onChange={() => toggleLayer('showBlockBounds')}
                            className="h-3.5 w-3.5 accent-cyan-500"
                        />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-900/40 px-2.5 py-1.5 transition-colors hover:bg-slate-900/80">
                        <span className="flex items-center gap-2 text-slate-300">
                            <Table className="h-3.5 w-3.5 text-amber-400" />
                            Sub-elementos (Filas / Items / Líneas)
                        </span>
                        <input
                            type="checkbox"
                            checked={showSubElements}
                            onChange={() => toggleLayer('showSubElements')}
                            className="h-3.5 w-3.5 accent-cyan-500"
                        />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-900/40 px-2.5 py-1.5 transition-colors hover:bg-slate-900/80">
                        <span className="flex items-center gap-2 text-slate-300">
                            <Activity className="h-3.5 w-3.5 text-emerald-400" />
                            Medidor de Capacidad por Página
                        </span>
                        <input
                            type="checkbox"
                            checked={showPageGauges}
                            onChange={() => toggleLayer('showPageGauges')}
                            className="h-3.5 w-3.5 accent-cyan-500"
                        />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-900/40 px-2.5 py-1.5 transition-colors hover:bg-slate-900/80">
                        <span className="flex items-center gap-2 text-slate-300">
                            <Minimize2 className="h-3.5 w-3.5 text-purple-400" />
                            Modo Compacto de Etiquetas
                        </span>
                        <input
                            type="checkbox"
                            checked={compactMode}
                            onChange={() => toggleLayer('compactMode')}
                            className="h-3.5 w-3.5 accent-cyan-500"
                        />
                    </label>

                    <div className="flex items-center justify-between pt-1">
                        <button
                            type="button"
                            onClick={resetDefaults}
                            className="text-[10px] text-slate-400 underline transition-colors hover:text-slate-200"
                        >
                            Restablecer valores predeterminados
                        </button>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: PAGES OVERVIEW */}
            {activeTab === 'pages' && (
                <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1 text-xs">
                    {pages.map((pageBlocks, idx) => {
                        const pageNum = idx + 1;
                        const used = pageBlocks.reduce(
                            (acc, b) => acc + (b.height || 0),
                            0,
                        );
                        const free = Math.max(0, maxBodyHeight - used);
                        const pct = (used / maxBodyHeight) * 100;
                        const isOver = used > maxBodyHeight + 0.05;
                        const isNear = pct >= 90 && !isOver;

                        return (
                            <div
                                key={pageNum}
                                className="rounded-lg border border-slate-800 bg-slate-900/60 p-2 transition-all hover:border-cyan-500/40 hover:bg-slate-900"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <span className="text-cyan-400">
                                            Página {pageNum}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            ({pageBlocks.length} bloques)
                                        </span>
                                    </div>
                                    <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                            isOver
                                                ? 'bg-rose-500/20 text-rose-400'
                                                : isNear
                                                  ? 'bg-amber-500/20 text-amber-400'
                                                  : 'bg-emerald-500/20 text-emerald-400'
                                        }`}
                                    >
                                        {isOver
                                            ? 'OVERFLOW'
                                            : `${pct.toFixed(1)}%`}
                                    </span>
                                </div>

                                {/* Mini Bar */}
                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                    <div
                                        className={`h-full transition-all ${
                                            isOver
                                                ? 'bg-rose-500'
                                                : isNear
                                                  ? 'bg-amber-500'
                                                  : 'bg-emerald-500'
                                        }`}
                                        style={{
                                            width: `${Math.min(100, pct)}%`,
                                        }}
                                    />
                                </div>

                                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                                    <span>Usado: {used.toFixed(2)}mm</span>
                                    <span>Libre: {free.toFixed(2)}mm</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TAB CONTENT: BLOCK INSPECTOR */}
            {activeTab === 'inspector' && (
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 text-xs">
                    {selectedBlock ? (
                        <div className="space-y-2 rounded-lg border border-cyan-500/30 bg-slate-900/80 p-2.5">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                <span className="font-bold text-cyan-300">
                                    {selectedBlock.debugMeta?.blockType ||
                                        selectedBlock.type}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedBlockId(null)}
                                    className="text-[10px] text-slate-400 hover:text-slate-200"
                                >
                                    Deseleccionar
                                </button>
                            </div>

                            <div className="text-[11px] text-slate-300">
                                {selectedBlock.debugMeta?.formula ||
                                    `Alto: ${selectedBlock.height.toFixed(2)}mm`}
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 rounded-md bg-slate-950 p-2 text-[10px] text-slate-400">
                                <div>
                                    ID:{' '}
                                    <span className="text-slate-200">
                                        {selectedBlock.id}
                                    </span>
                                </div>
                                <div>
                                    Alto:{' '}
                                    <span className="font-bold text-cyan-400">
                                        {selectedBlock.height.toFixed(2)}mm
                                    </span>
                                </div>
                                <div>
                                    Y Inicio:{' '}
                                    <span className="text-slate-200">
                                        {selectedBlock.debugMeta?.accumHeightBeforeMm?.toFixed(
                                            2,
                                        ) ?? 0}
                                        mm
                                    </span>
                                </div>
                                <div>
                                    Y Fin:{' '}
                                    <span className="text-slate-200">
                                        {selectedBlock.debugMeta?.accumHeightAfterMm?.toFixed(
                                            2,
                                        ) ?? selectedBlock.height.toFixed(2)}
                                        mm
                                    </span>
                                </div>
                                {selectedBlock.debugMeta?.lineCount && (
                                    <div>
                                        Líneas:{' '}
                                        <span className="text-slate-200">
                                            {selectedBlock.debugMeta.lineCount}
                                        </span>
                                    </div>
                                )}
                                {selectedBlock.debugMeta?.fontLineHeightMm && (
                                    <div>
                                        Interlínea:{' '}
                                        <span className="text-slate-200">
                                            {selectedBlock.debugMeta.fontLineHeightMm.toFixed(
                                                2,
                                            )}
                                            mm
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-slate-800 p-4 text-center text-[11px] text-slate-400">
                            Haz clic sobre cualquier bloque en la vista previa
                            para inspeccionar su fórmula de cálculo y
                            coordenadas exactas.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
