import { Download, FileText, Loader2, Maximize2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { editorStyles } from '@/pages/specimens/report-editor/components/editor-styles';
import DeliveryNotePage from './page-preview/page';
import type { DeliveryNoteMeasuredBlock, DeliveryNoteWorkOrder } from './types';

export interface DeliveryNoteLivePdfPreviewProps {
    workOrder: DeliveryNoteWorkOrder;
    pages: DeliveryNoteMeasuredBlock[][];
    onDownloadPdf?: () => void;
    isDownloading?: boolean;
}

export default function DeliveryNoteLivePdfPreview({
    workOrder,
    pages,
    onDownloadPdf,
    isDownloading = false,
}: DeliveryNoteLivePdfPreviewProps) {
    const [zoomScale, setZoomScale] = useState(1);
    const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
    const containerRef = useRef<HTMLDivElement>(null);
    const outerContainerRef = useRef<HTMLDivElement>(null);

    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
    const [fullscreenZoomScale, setFullscreenZoomScale] = useState(1);
    const [fullscreenZoomMode, setFullscreenZoomMode] = useState<
        'fit' | 'manual'
    >('fit');
    const fullscreenOuterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!outerContainerRef.current || zoomMode !== 'fit') {
            return;
        }

        const handleResize = () => {
            const target = outerContainerRef.current;

            if (target) {
                // Reserve 32px (p-4 padding) + 16px (scrollbar gutter)
                const availableWidth = target.clientWidth - 48;
                const scale = Math.max(
                    0.3,
                    Math.min(availableWidth / 800, 1.2),
                );
                const roundedScale = Math.round(scale * 100) / 100;
                setZoomScale((prev) =>
                    Math.abs(prev - roundedScale) >= 0.005
                        ? roundedScale
                        : prev,
                );
            }
        };

        handleResize();
        const observer = new ResizeObserver(handleResize);
        observer.observe(outerContainerRef.current);

        return () => observer.disconnect();
    }, [zoomMode]);

    useEffect(() => {
        if (
            !fullscreenOuterRef.current ||
            fullscreenZoomMode !== 'fit' ||
            !isFullscreenOpen
        ) {
            return;
        }

        const handleResize = () => {
            const target = fullscreenOuterRef.current;

            if (target) {
                // Reserve 48px (p-6 padding) + 16px (scrollbar gutter)
                const availableWidth = target.clientWidth - 64;
                const scale = Math.max(
                    0.3,
                    Math.min(availableWidth / 800, 1.5),
                );
                const roundedScale = Math.round(scale * 100) / 100;
                setFullscreenZoomScale((prev) =>
                    Math.abs(prev - roundedScale) >= 0.005
                        ? roundedScale
                        : prev,
                );
            }
        };

        handleResize();
        const observer = new ResizeObserver(handleResize);
        observer.observe(fullscreenOuterRef.current);

        return () => observer.disconnect();
    }, [fullscreenZoomMode, isFullscreenOpen]);

    const displayPages = pages.length > 0 ? pages : [[]];
    const totalPages = displayPages.length;

    return (
        <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-200 shadow-xs dark:bg-slate-950/20">
            <style dangerouslySetInnerHTML={{ __html: editorStyles }} />
            {/* Floating Controls Overlay */}
            <div className="pointer-events-none absolute top-4 right-4 left-4 z-20 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                {/* Zoom Controls (Glassmorphism) */}
                <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs shadow-md backdrop-blur-md dark:bg-slate-900/80">
                    <button
                        type="button"
                        onClick={() => {
                            setZoomMode('manual');
                            setZoomScale((prev) =>
                                Math.max(
                                    0.3,
                                    Math.round((prev - 0.1) * 10) / 10,
                                ),
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
                                Math.min(
                                    1.5,
                                    Math.round((prev + 0.1) * 10) / 10,
                                ),
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

                            if (outerContainerRef.current) {
                                const availableWidth =
                                    outerContainerRef.current.clientWidth - 48;
                                const scale = Math.max(
                                    0.3,
                                    Math.min(availableWidth / 800, 1.2),
                                );
                                setZoomScale(Math.round(scale * 100) / 100);
                            }
                        }}
                        className={cn(
                            'cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors',
                            zoomMode === 'fit'
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        Ajustar
                    </button>
                    <div className="mx-1 h-3.5 w-px bg-border/80" />
                    <button
                        type="button"
                        onClick={() => setIsFullscreenOpen(true)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Pantalla Completa"
                    >
                        <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Floating Download Button */}
                {onDownloadPdf && (
                    <button
                        type="button"
                        onClick={onDownloadPdf}
                        disabled={isDownloading}
                        className="pointer-events-auto inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-md transition-all hover:scale-[1.02] hover:bg-primary/95 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
                    >
                        {isDownloading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Download className="h-3.5 w-3.5" />
                        )}
                        Descargar Nota de Entrega
                    </button>
                )}
            </div>

            {/* Scrollable Preview Canvas */}
            <div
                ref={outerContainerRef}
                className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-x-auto overflow-y-auto p-4 pt-24 sm:pt-16"
                style={{ scrollBehavior: 'smooth' }}
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
                        ref={containerRef}
                        className="shrink-0 origin-top-left"
                        style={{
                            transform: `scale(${zoomScale})`,
                        }}
                    >
                        {displayPages.map((pageBlocks, idx) => (
                            <DeliveryNotePage
                                key={`page-${idx}`}
                                pageNum={idx + 1}
                                totalPages={totalPages}
                                pageBlocks={pageBlocks}
                                workOrder={workOrder}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Fullscreen Preview Sheet */}
            <Sheet open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
                <SheetContent
                    ref={fullscreenOuterRef}
                    side="bottom"
                    className="mx-auto flex h-[96vh] w-[98vw] max-w-none flex-col justify-start overflow-hidden rounded-t-2xl border-t bg-slate-200 p-0 dark:bg-slate-950/20 [&>button]:top-4 [&>button]:right-6 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:border [&>button]:bg-background/80 [&>button]:shadow-xs [&>button]:backdrop-blur-xs"
                >
                    <style dangerouslySetInnerHTML={{ __html: editorStyles }} />
                    <div className="flex items-center justify-between border-b bg-background px-6 py-3 shadow-xs">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <div>
                                <SheetTitle className="text-sm font-semibold">
                                    Vista Completa de Nota de Entrega
                                </SheetTitle>
                                <SheetDescription className="text-[10px] text-muted-foreground">
                                    N°{' '}
                                    {workOrder.specimen?.sequence_code ||
                                        `OT-${workOrder.id}`}{' '}
                                    •{' '}
                                    {workOrder.specimen?.customer_relation
                                        ?.name || 'No especificado'}
                                </SheetDescription>
                            </div>
                        </div>

                        {/* Zoom Controls inside Fullscreen Sheet */}
                        <div className="mr-12 flex items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs shadow-xs backdrop-blur-md dark:bg-slate-900/80">
                            <button
                                type="button"
                                onClick={() => {
                                    setFullscreenZoomMode('manual');
                                    setFullscreenZoomScale((prev) =>
                                        Math.max(
                                            0.3,
                                            Math.round((prev - 0.1) * 10) / 10,
                                        ),
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
                                        Math.min(
                                            2.0,
                                            Math.round((prev + 0.1) * 10) / 10,
                                        ),
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

                                    if (fullscreenOuterRef.current) {
                                        const availableWidth =
                                            fullscreenOuterRef.current
                                                .clientWidth - 64;
                                        const scale = Math.max(
                                            0.3,
                                            Math.min(availableWidth / 800, 1.5),
                                        );
                                        setFullscreenZoomScale(
                                            Math.round(scale * 100) / 100,
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

                    <div className="flex flex-1 [scrollbar-gutter:stable] justify-center overflow-x-auto overflow-y-auto bg-slate-200 p-6 dark:bg-slate-950/20">
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
                                {displayPages.map((pageBlocks, idx) => (
                                    <DeliveryNotePage
                                        key={`fs-page-${idx}`}
                                        pageNum={idx + 1}
                                        totalPages={totalPages}
                                        pageBlocks={pageBlocks}
                                        workOrder={workOrder}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
