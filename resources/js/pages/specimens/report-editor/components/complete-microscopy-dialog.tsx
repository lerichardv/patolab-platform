import { PDFViewer, ZoomMode } from '@embedpdf/react-pdf-viewer';
import type {
    PluginRegistry,
    ViewportCapability,
    ScrollCapability,
    UICapability,
} from '@embedpdf/react-pdf-viewer';
import { ArrowDown, Unlock, Lock } from 'lucide-react';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

interface CompleteMicroscopyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tempPdfUrl: string | null;
    onConfirm: () => void;
}

export const CompleteMicroscopyDialog: React.FC<
    CompleteMicroscopyDialogProps
> = ({ open, onOpenChange, tempPdfUrl, onConfirm }) => {
    const { appearance } = useAppearance();
    const dialogPreviewContainerRef = useRef<HTMLDivElement>(null);
    const wheelStopHandlerRef = useRef<((e: Event) => void) | null>(null);

    // Prevent modal scroll-lock libraries (e.g. react-remove-scroll) from cancelling wheel & touch scrolling.
    // This must run when the container mounts (ref callback), NOT via a `useEffect([open])` — Radix
    // `Presence` mounts the dialog content after the parent effect fires, so the ref is still null then.
    const setDialogPreviewContainer = useCallback(
        (node: HTMLDivElement | null) => {
            const prevHandler = wheelStopHandlerRef.current;
            const prevContainer = dialogPreviewContainerRef.current;

            if (prevHandler && prevContainer) {
                prevContainer.removeEventListener('wheel', prevHandler);
                prevContainer.removeEventListener('touchmove', prevHandler);
            }

            dialogPreviewContainerRef.current = node;

            if (node) {
                const stopPropagation = (e: Event) => {
                    e.stopPropagation();
                };
                wheelStopHandlerRef.current = stopPropagation;
                node.addEventListener('wheel', stopPropagation, {
                    passive: true,
                });
                node.addEventListener('touchmove', stopPropagation, {
                    passive: true,
                });
            } else {
                wheelStopHandlerRef.current = null;
            }
        },
        [],
    );

    const [scrollPercentage, setScrollPercentage] = useState(0);
    const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
    const [isPdfLoaded, setIsPdfLoaded] = useState(false);
    const registryRef = useRef<PluginRegistry | null>(null);
    const cleanupsRef = useRef<(() => void)[]>([]);

    const resetDialogState = () => {
        setIsPdfLoaded(false);
        setScrollPercentage(0);
        setHasScrolledToEnd(false);
        cleanupsRef.current.forEach((cleanup) => cleanup());
        cleanupsRef.current = [];
        registryRef.current = null;
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            resetDialogState();
        }

        onOpenChange(newOpen);
    };

    useEffect(() => {
        return () => {
            cleanupsRef.current.forEach((cleanup) => cleanup());
            cleanupsRef.current = [];
            registryRef.current = null;
        };
    }, []);

    const handlePdfReady = (registry: PluginRegistry) => {
        registryRef.current = registry;
        cleanupsRef.current.forEach((cleanup) => cleanup());
        cleanupsRef.current = [];

        const uiPlugin = registry.getPlugin('ui');
        const uiCapability = (
            uiPlugin && typeof uiPlugin.provides === 'function'
                ? uiPlugin.provides()
                : undefined
        ) as UICapability | undefined;

        if (uiCapability) {
            const schema = uiCapability.getSchema();
            const toolbar = schema?.toolbars?.['main-toolbar'];

            if (toolbar) {
                const items = JSON.parse(JSON.stringify(toolbar.items));

                // Remove page-settings-button from left-group
                const leftGroup = items.find(
                    (item: { id: string }) => item.id === 'left-group',
                );

                if (leftGroup && Array.isArray(leftGroup.items)) {
                    leftGroup.items = leftGroup.items.filter(
                        (item: { id: string }) =>
                            item.id !== 'page-settings-button',
                    );
                }

                // Filter out mode-tabs and mode-select-button
                const filteredItems = items.filter(
                    (item: { id: string }) =>
                        item.id !== 'mode-tabs' &&
                        item.id !== 'mode-select-button',
                );

                // In right-group, remove comment-button and add fullscreen-button
                const rightGroup = filteredItems.find(
                    (item: { id: string }) => item.id === 'right-group',
                );

                if (rightGroup && Array.isArray(rightGroup.items)) {
                    rightGroup.items = rightGroup.items.filter(
                        (item: { id: string }) => item.id !== 'comment-button',
                    );

                    if (
                        !rightGroup.items.some(
                            (item: { id: string }) =>
                                item.id === 'fullscreen-button',
                        )
                    ) {
                        rightGroup.items.push({
                            type: 'command-button',
                            id: 'fullscreen-button',
                            commandId: 'document:fullscreen',
                            variant: 'icon',
                        });
                    }
                }

                uiCapability.mergeSchema({
                    toolbars: {
                        'main-toolbar': {
                            ...toolbar,
                            items: filteredItems,
                        },
                    },
                });
            }
        }

        const viewportPlugin = registry.getPlugin('viewport');
        const viewportCapability = (
            viewportPlugin && typeof viewportPlugin.provides === 'function'
                ? viewportPlugin.provides()
                : undefined
        ) as ViewportCapability | undefined;

        const scrollPlugin = registry.getPlugin('scroll');
        const scrollCapability = (
            scrollPlugin && typeof scrollPlugin.provides === 'function'
                ? scrollPlugin.provides()
                : undefined
        ) as ScrollCapability | undefined;

        const updateScrollMetrics = () => {
            if (!viewportCapability) {
                return;
            }

            try {
                const metrics = viewportCapability.getMetrics();

                if (!metrics) {
                    return;
                }

                const { scrollTop, scrollHeight, clientHeight } = metrics;

                if (scrollHeight <= 0 || clientHeight <= 0) {
                    return;
                }

                setIsPdfLoaded(true);

                const totalScrollable = scrollHeight - clientHeight;

                if (totalScrollable <= 10) {
                    setScrollPercentage(100);
                    setHasScrolledToEnd(true);
                } else {
                    const pct = Math.min(
                        100,
                        Math.max(
                            0,
                            Math.round((scrollTop / totalScrollable) * 100),
                        ),
                    );
                    setScrollPercentage(pct);

                    if (totalScrollable - scrollTop <= 50 || pct >= 98) {
                        setHasScrolledToEnd(true);
                    }
                }
            } catch {
                // Ignore if metrics are not ready yet
            }
        };

        if (viewportCapability) {
            updateScrollMetrics();
            setTimeout(updateScrollMetrics, 100);
            setTimeout(updateScrollMetrics, 300);

            const unsubViewport = viewportCapability.onViewportChange(() => {
                updateScrollMetrics();
            });
            const unsubResize = viewportCapability.onViewportResize(() => {
                updateScrollMetrics();
            });
            const unsubScroll = viewportCapability.onScrollChange(() => {
                updateScrollMetrics();
            });

            cleanupsRef.current.push(unsubViewport, unsubResize, unsubScroll);
        }

        if (scrollCapability) {
            const unsubLayoutReady = scrollCapability.onLayoutReady(() => {
                updateScrollMetrics();
            });
            const unsubLayoutChange = scrollCapability.onLayoutChange(() => {
                updateScrollMetrics();
            });
            const unsubScrollCap = scrollCapability.onScroll(() => {
                updateScrollMetrics();
            });

            cleanupsRef.current.push(
                unsubLayoutReady,
                unsubLayoutChange,
                unsubScrollCap,
            );
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent className="flex h-[90vh] w-[95vw] max-w-6xl flex-col p-6 md:h-[95vh]">
                <AlertDialogHeader className="flex-none">
                    <AlertDialogTitle>
                        ¿Confirmar completado de microscopía y previsualizar
                        reporte?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Antes de finalizar, verifique el formato en la vista
                        previa del PDF real.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
                    {/* Progress indicators */}
                    <div className="mb-2 flex flex-none items-center justify-between px-1 text-xs">
                        <span className="font-medium text-muted-foreground">
                            Progreso de lectura del reporte
                        </span>
                        {isPdfLoaded ? (
                            <span className="font-bold text-fuchsia-600 dark:text-fuchsia-400">
                                {scrollPercentage}%
                            </span>
                        ) : (
                            <span className="flex animate-pulse items-center gap-1.5 font-medium text-muted-foreground">
                                <span className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-fuchsia-600 border-t-transparent dark:border-fuchsia-400" />
                                Cargando visor...
                            </span>
                        )}
                    </div>
                    <div className="mb-4 h-1.5 w-full flex-none overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        {isPdfLoaded ? (
                            <div
                                className="h-full rounded-full bg-fuchsia-600 transition-all duration-200"
                                style={{ width: `${scrollPercentage}%` }}
                            />
                        ) : (
                            <div className="h-full w-full animate-pulse bg-fuchsia-600/30 dark:bg-fuchsia-400/30" />
                        )}
                    </div>

                    {/* Scrollable Container */}
                    <div
                        ref={setDialogPreviewContainer}
                        className="relative flex min-h-0 w-full flex-1"
                    >
                        {tempPdfUrl && (
                            <div className="relative h-full w-full border border-gray-300 shadow-sm dark:border-gray-700">
                                <PDFViewer
                                    config={{
                                        src: tempPdfUrl,
                                        tabBar: 'never',
                                        disabledCategories: [
                                            'print',
                                            'download',
                                            'annotation',
                                            'search',
                                            'zoom',
                                            'form',
                                            'redaction',
                                            'insert',
                                            'panel-comment',
                                            'page-settings',
                                            'mode',
                                        ],
                                        zoom: {
                                            defaultZoomLevel: ZoomMode.FitWidth,
                                        },
                                        theme: {
                                            preference: appearance || 'light',
                                        },
                                    }}
                                    className="h-full w-full rounded-lg"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                    }}
                                    onReady={handlePdfReady}
                                />
                            </div>
                        )}
                    </div>

                    {/* Floating bottom cue */}
                    {isPdfLoaded && !hasScrolledToEnd && (
                        <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-300 dark:bg-slate-50/90 dark:text-slate-900">
                            <ArrowDown className="h-3.5 w-3.5 animate-pulse" />
                            <span>{`Desplace para confirmar lectura (${scrollPercentage}%)`}</span>
                        </div>
                    )}
                </div>

                <AlertDialogFooter className="mt-4 flex-none">
                    <AlertDialogCancel onClick={() => handleOpenChange(false)}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            handleOpenChange(false);
                            onConfirm();
                        }}
                        disabled={!hasScrolledToEnd}
                        className={cn(
                            'cursor-pointer gap-2 transition-all duration-300',
                            hasScrolledToEnd
                                ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-500/25 hover:bg-fuchsia-700 active:scale-[0.98]'
                                : 'pointer-events-none cursor-not-allowed bg-slate-200 text-slate-400 opacity-50 dark:bg-slate-800 dark:text-slate-500',
                        )}
                    >
                        {hasScrolledToEnd ? (
                            <>
                                <Unlock className="h-4 w-4" />
                                <span>Finalizar Reporte</span>
                            </>
                        ) : (
                            <>
                                <Lock className="h-4 w-4" />
                                <span>Finalizar Reporte</span>
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
