import { Download, FileText, Maximize2 } from 'lucide-react';
import React, { Fragment, useEffect, useRef, useState } from 'react';

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { DebugHudPanel } from './page-preview/debug';
import type { MeasuredBlock } from './page-preview/types';

export interface LivePdfPreviewProps {
    specimen: any;
    isFinished: boolean;
    isLoading: boolean;
    totalPages: number;
    renderPreviewPage: (pageNum: number) => React.ReactNode;
    pages?: MeasuredBlock[][];
    /** Called before opening the PDF so the latest content is saved first. */
    onBeforeDownload?: () => Promise<void>;
}

export default function LivePdfPreview({
    specimen,
    isFinished,
    isLoading,
    totalPages,
    renderPreviewPage,
    pages = [],
    onBeforeDownload,
}: LivePdfPreviewProps) {
    const [zoomScale, setZoomScale] = useState(1);
    const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
    const containerRef = useRef<HTMLDivElement>(null);

    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
    const [fullscreenZoomScale, setFullscreenZoomScale] = useState(1);
    const [fullscreenZoomMode, setFullscreenZoomMode] = useState<
        'fit' | 'manual'
    >('fit');
    const fullscreenContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || zoomMode !== 'fit') {
            return;
        }

        const handleResize = () => {
            const parent = containerRef.current;

            if (parent) {
                const parentWidth = parent.clientWidth;
                const scale = (parentWidth - 32) / 800;

                setZoomScale(Math.min(scale, 1.2));
            }
        };

        handleResize();
        const observer = new ResizeObserver(handleResize);

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [zoomMode, isLoading]);

    useEffect(() => {
        if (
            !fullscreenContainerRef.current ||
            fullscreenZoomMode !== 'fit' ||
            !isFullscreenOpen
        ) {
            return;
        }

        const handleResize = () => {
            const parent = fullscreenContainerRef.current;

            if (parent) {
                const parentWidth = parent.clientWidth;
                const scale = (parentWidth - 48) / 800;

                setFullscreenZoomScale(Math.min(scale, 1.5));
            }
        };

        handleResize();
        const observer = new ResizeObserver(handleResize);

        observer.observe(fullscreenContainerRef.current);

        return () => observer.disconnect();
    }, [fullscreenZoomMode, isFullscreenOpen, isLoading]);

    return (
        <>
            {/* RIGHT COLUMN: Live PDF Preview */}
            <div className="left-[50vw] block flex h-[calc(100vh-64px)] min-h-[500px] w-screen flex-col space-y-3 lg:fixed lg:top-[64px] lg:w-[50vw]">
                <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-200 shadow-xs dark:bg-slate-950/20">
                    {/* Floating Controls Overlay */}
                    <div className="pointer-events-none absolute top-4 right-4 left-4 z-20 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                        {/* Zoom Controls (Glassmorphism) */}
                        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs shadow-md backdrop-blur-md dark:bg-slate-900/80">
                            <button
                                type="button"
                                onClick={() => {
                                    setZoomMode('manual');
                                    setZoomScale((prev) =>
                                        Math.max(0.3, prev - 0.1),
                                    );
                                }}
                                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                title="Zoom Out"
                            >
                                -
                            </button>
                            <span className="min-w-[36px] px-1 text-center font-mono font-semibold text-foreground">
                                {Math.round(zoomScale * 100)}%
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setZoomMode('manual');
                                    setZoomScale((prev) =>
                                        Math.min(1.5, prev + 0.1),
                                    );
                                }}
                                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                title="Zoom In"
                            >
                                +
                            </button>
                            <div className="mx-1 h-3.5 w-px bg-border/80" />
                            <button
                                type="button"
                                onClick={() => {
                                    setZoomMode('fit');

                                    if (containerRef.current) {
                                        const scale =
                                            (containerRef.current.clientWidth -
                                                32) /
                                            800;

                                        setZoomScale(Math.min(scale, 1.2));
                                    }
                                }}
                                className={cn(
                                    'cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                                    zoomMode === 'fit' &&
                                        'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                                )}
                            >
                                Ajustar
                            </button>
                            <div className="mx-1 h-3.5 w-px bg-border/80" />
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFullscreenOpen(true);
                                }}
                                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                title="Pantalla Completa"
                            >
                                <Maximize2 className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Floating Download Button */}
                        <button
                            type="button"
                            onClick={async () => {
                                if (onBeforeDownload) {
                                    try {
                                        await onBeforeDownload();
                                    } catch {
                                        // Save failed — still allow download so user isn't blocked
                                    }
                                }

                                window.open(
                                    `/specimens/${specimen.sequence_code}/report-editor/pdf`,
                                    '_blank',
                                );
                            }}
                            className="pointer-events-auto inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-md transition-all hover:scale-[1.02] hover:bg-primary/95 active:scale-[0.98] sm:w-auto"
                        >
                            <Download className="h-3.5 w-3.5" />
                            {isFinished
                                ? 'Descargar Informe'
                                : 'Descargar Previsualización'}
                        </button>
                    </div>

                    {/* Scrollable Preview Pane */}
                    <div
                        ref={containerRef}
                        className="flex-1 overflow-x-auto overflow-y-auto p-4 pt-24 sm:pt-16"
                    >
                        <div
                            style={{
                                height: `${(1035 * totalPages + 24 * (totalPages - 1)) * zoomScale}px`,
                                width: `${800 * zoomScale}px`,
                                margin: '0 auto',
                                position: 'relative',
                            }}
                        >
                            <div
                                className="shrink-0 origin-top-left"
                                style={{
                                    transform: `scale(${zoomScale})`,
                                }}
                            >
                                {Array.from({ length: totalPages }).map(
                                    (_, i) => (
                                        <Fragment key={i}>
                                            {renderPreviewPage(i + 1)}
                                        </Fragment>
                                    ),
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* GSAP DevTools Floating Debug HUD */}
            <DebugHudPanel pages={pages} totalPages={totalPages} />

            {/* Fullscreen Preview Sheet */}
            <Sheet open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
                <SheetContent
                    side="bottom"
                    className="mx-auto flex h-[96vh] w-[98vw] max-w-none flex-col justify-start overflow-hidden rounded-t-2xl border-t bg-slate-200 p-0 dark:bg-slate-950/20 [&>button]:top-4 [&>button]:right-6 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:border [&>button]:bg-background/80 [&>button]:shadow-xs [&>button]:backdrop-blur-xs"
                >
                    <div className="flex items-center justify-between border-b bg-background px-6 py-3 shadow-xs">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <div>
                                <SheetTitle className="text-sm font-semibold">
                                    Vista Completa de Reporte
                                </SheetTitle>
                                <SheetDescription className="text-[10px] text-muted-foreground">
                                    Paciente: {specimen.customer_relation?.name}{' '}
                                    | Código: {specimen.sequence_code}
                                </SheetDescription>
                            </div>
                        </div>

                        {/* Zoom Controls inside Fullscreen Sheet */}
                        <div className="mr-12 flex items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs shadow-sm backdrop-blur-md dark:bg-slate-900/80">
                            <button
                                type="button"
                                onClick={() => {
                                    setFullscreenZoomMode('manual');
                                    setFullscreenZoomScale((prev) =>
                                        Math.max(0.3, prev - 0.1),
                                    );
                                }}
                                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                title="Zoom Out"
                            >
                                -
                            </button>
                            <span className="min-w-[36px] px-1 text-center font-mono font-semibold text-foreground">
                                {Math.round(fullscreenZoomScale * 100)}%
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setFullscreenZoomMode('manual');
                                    setFullscreenZoomScale((prev) =>
                                        Math.min(2.0, prev + 0.1),
                                    );
                                }}
                                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                title="Zoom In"
                            >
                                +
                            </button>
                            <div className="mx-1 h-3.5 w-px bg-border/80" />
                            <button
                                type="button"
                                onClick={() => {
                                    setFullscreenZoomMode('fit');

                                    if (fullscreenContainerRef.current) {
                                        const scale =
                                            (fullscreenContainerRef.current
                                                .clientWidth -
                                                48) /
                                            800;

                                        setFullscreenZoomScale(
                                            Math.min(scale, 1.5),
                                        );
                                    }
                                }}
                                className={cn(
                                    'cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                                    fullscreenZoomMode === 'fit' &&
                                        'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                                )}
                            >
                                Ajustar
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Preview Pane inside Sheet */}
                    <div
                        ref={fullscreenContainerRef}
                        className="flex flex-1 justify-center overflow-x-auto overflow-y-auto bg-slate-200 p-6 dark:bg-slate-950/20"
                    >
                        <div
                            style={{
                                height: `${(1035 * totalPages + 24 * (totalPages - 1)) * fullscreenZoomScale}px`,
                                width: `${800 * fullscreenZoomScale}px`,
                                margin: '0 auto',
                                position: 'relative',
                            }}
                        >
                            <div
                                className="shrink-0 origin-top-left"
                                style={{
                                    transform: `scale(${fullscreenZoomScale})`,
                                }}
                            >
                                {Array.from({ length: totalPages }).map(
                                    (_, i) => (
                                        <Fragment key={i}>
                                            {renderPreviewPage(i + 1)}
                                        </Fragment>
                                    ),
                                )}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
