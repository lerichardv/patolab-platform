import { PDFViewer, ZoomMode } from '@embedpdf/react-pdf-viewer';
import type { PluginRegistry, UICapability } from '@embedpdf/react-pdf-viewer';
import {
    Loader2,
    FileText,
    AlertCircle,
    Download,
    ZoomIn,
    ZoomOut,
    Layers,
} from 'lucide-react';
import React, {
    useCallback,
    useRef,
    useState,
    useEffect,
    useMemo,
} from 'react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { editorStyles } from '@/pages/specimens/report-editor/components/editor-styles';
import PagePreview from '@/pages/specimens/report-editor/page-preview/page';
import { ReportPaginator } from '@/pages/specimens/report-editor/services/report-paginator';

interface PreviewDataResponse {
    has_pdf: boolean;
    pdf_url: string | null;
    specimen: any;
    report: any;
}

interface ReportPreviewSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    specimenCode: string | null;
    patientName?: string;
}

export const ReportPreviewSheet: React.FC<ReportPreviewSheetProps> = ({
    open,
    onOpenChange,
    specimenCode,
    patientName,
}) => {
    const { appearance } = useAppearance();

    // Data fetching state
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewDataResponse | null>(
        null,
    );
    const [fetchError, setFetchError] = useState<string | null>(null);

    // PDF viewer state (when has_pdf === true)
    const [isPdfLoaded, setIsPdfLoaded] = useState(false);
    const registryRef = useRef<PluginRegistry | null>(null);

    // HTML preview zoom & resize state (when has_pdf === false)
    const [htmlZoomScale, setHtmlZoomScale] = useState(0.85);
    const [htmlZoomMode, setHtmlZoomMode] = useState<'fit' | 'manual'>('fit');
    const htmlOuterRef = useRef<HTMLDivElement>(null);

    const dialogPreviewContainerRef = useRef<HTMLDivElement>(null);
    const wheelStopHandlerRef = useRef<((e: Event) => void) | null>(null);

    // Prevent Radix modal scroll-lock libraries from blocking wheel & touch scrolling inside PDF viewer
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

    // Load preview data from server when sheet opens
    useEffect(() => {
        if (!open || !specimenCode) {
            return;
        }

        let isMounted = true;
        const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
            setIsLoadingData(true);
            setFetchError(null);
            setIsPdfLoaded(false);
            setPreviewData(null);

            fetch(
                `/reports/keywords/${encodeURIComponent(specimenCode)}/preview-data`,
                {
                    headers: {
                        Accept: 'application/json',
                    },
                },
            )
                .then((res) => {
                    if (!res.ok) {
                        throw new Error(
                            `Error al consultar datos (${res.status})`,
                        );
                    }

                    return res.json();
                })
                .then((data: PreviewDataResponse) => {
                    if (isMounted) {
                        setPreviewData(data);
                        setIsLoadingData(false);
                    }
                })
                .catch((err: any) => {
                    if (isMounted) {
                        setFetchError(
                            err.message || 'Error al obtener datos del informe',
                        );
                        setIsLoadingData(false);
                    }
                });
        }, 0);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [open, specimenCode]);

    // Handle HTML zoom fit auto-scaling
    useEffect(() => {
        if (
            !htmlOuterRef.current ||
            htmlZoomMode !== 'fit' ||
            previewData?.has_pdf
        ) {
            return;
        }

        const handleResize = () => {
            const target = htmlOuterRef.current;

            if (target) {
                // Reserve 48px padding & scrollbar
                const availableWidth = target.clientWidth - 48;
                const scale = Math.max(
                    0.3,
                    Math.min(availableWidth / 800, 1.2),
                );
                const roundedScale = Math.round(scale * 100) / 100;

                setHtmlZoomScale((prev) =>
                    Math.abs(prev - roundedScale) >= 0.005
                        ? roundedScale
                        : prev,
                );
            }
        };

        handleResize();
        const observer = new ResizeObserver(handleResize);
        observer.observe(htmlOuterRef.current);

        return () => observer.disconnect();
    }, [htmlZoomMode, previewData?.has_pdf]);

    // Calculate paginated blocks using ReportPaginator when HTML preview is active
    const computedPages = useMemo(() => {
        if (
            !previewData ||
            previewData.has_pdf ||
            !previewData.specimen?.report
        ) {
            return [];
        }

        try {
            return ReportPaginator.paginate({
                specimen: previewData.specimen,
                report: previewData.specimen.report,
                customer: previewData.specimen.customer_relation,
                referrer: previewData.specimen.referrer_relation,
                isMicroscopyVisible: true,
            });
        } catch (e) {
            console.error('Error paginating report:', e);

            return [];
        }
    }, [previewData]);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setIsPdfLoaded(false);
            setPreviewData(null);
            setFetchError(null);
            registryRef.current = null;
        }

        onOpenChange(newOpen);
    };

    const handlePdfReady = (registry: PluginRegistry) => {
        registryRef.current = registry;
        setIsPdfLoaded(true);

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

                // Remove page settings button from left group
                const leftGroup = items.find(
                    (item: { id: string }) => item.id === 'left-group',
                );

                if (leftGroup && Array.isArray(leftGroup.items)) {
                    leftGroup.items = leftGroup.items.filter(
                        (item: { id: string }) =>
                            item.id !== 'page-settings-button',
                    );
                }

                // Filter out mode tabs and mode select button
                const filteredItems = items.filter(
                    (item: { id: string }) =>
                        item.id !== 'mode-tabs' &&
                        item.id !== 'mode-select-button',
                );

                // In right group, remove comment button and ensure fullscreen button exists
                const rightGroup = items.find(
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
    };

    const totalHtmlPages = computedPages.length > 0 ? computedPages.length : 1;

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
                side="right"
                className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl"
            >
                {/* Header */}
                <SheetHeader className="border-b px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <SheetTitle className="text-lg font-bold">
                                Vista Previa del Informe
                            </SheetTitle>
                        </div>

                        {previewData && !previewData.has_pdf && (
                            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                <Layers className="h-3 w-3" />
                                Vista Previa HTML
                            </span>
                        )}
                    </div>
                    <SheetDescription className="text-xs text-muted-foreground">
                        {specimenCode ? (
                            <>
                                Previsualización del informe patológico para la
                                muestra{' '}
                                <span className="font-mono font-semibold text-primary">
                                    {specimenCode}
                                </span>
                                {patientName ? ` (${patientName})` : ''}.
                            </>
                        ) : (
                            'Puede previsualizar el informe patológico completo.'
                        )}
                    </SheetDescription>
                </SheetHeader>

                {/* Content Body */}
                <div
                    ref={setDialogPreviewContainer}
                    className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100 dark:bg-slate-950/40"
                >
                    {/* Loading State Overlay */}
                    {isLoadingData && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-xs">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm font-medium text-muted-foreground">
                                Cargando informe patológico...
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {fetchError && !isLoadingData && (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                            <AlertCircle className="h-10 w-10 text-destructive" />
                            <h3 className="text-base font-semibold">
                                Error al cargar el informe
                            </h3>
                            <p className="max-w-md text-sm text-muted-foreground">
                                {fetchError}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setFetchError(null);
                                    setIsLoadingData(true);
                                }}
                            >
                                Reintentar
                            </Button>
                        </div>
                    )}

                    {/* Case 1: PDF Viewer (when specimen has generated report_file) */}
                    {!isLoadingData &&
                        previewData?.has_pdf &&
                        previewData.pdf_url && (
                            <div className="relative h-full w-full">
                                {!isPdfLoaded && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-xs">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Cargando visor de documento PDF...
                                        </p>
                                    </div>
                                )}

                                <PDFViewer
                                    config={{
                                        src: previewData.pdf_url,
                                        tabBar: 'never',
                                        disabledCategories: [
                                            'annotation',
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
                                    className="h-full w-full"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                    }}
                                    onReady={handlePdfReady}
                                />
                            </div>
                        )}

                    {/* Case 2: Direct HTML Report Rendering (when no pregenerated PDF file exists) */}
                    {!isLoadingData && previewData && !previewData.has_pdf && (
                        <div
                            ref={htmlOuterRef}
                            className="relative flex h-full w-full flex-col overflow-hidden"
                        >
                            <style
                                dangerouslySetInnerHTML={{
                                    __html: editorStyles,
                                }}
                            />

                            {/* Floating Controls Toolbar */}
                            <div className="pointer-events-none absolute top-3 right-4 left-4 z-20 flex items-center justify-between">
                                {/* Zoom Controls */}
                                <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/60 bg-background/90 px-2 py-1 text-xs shadow-md backdrop-blur-md">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHtmlZoomMode('manual');
                                            setHtmlZoomScale((prev) =>
                                                Math.max(
                                                    0.3,
                                                    Math.round(
                                                        (prev - 0.1) * 10,
                                                    ) / 10,
                                                ),
                                            );
                                        }}
                                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        title="Zoom -"
                                    >
                                        <ZoomOut className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="min-w-[34px] px-1 text-center font-mono text-[11px] font-semibold text-foreground">
                                        {Math.round(htmlZoomScale * 100)}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHtmlZoomMode('manual');
                                            setHtmlZoomScale((prev) =>
                                                Math.min(
                                                    1.5,
                                                    Math.round(
                                                        (prev + 0.1) * 10,
                                                    ) / 10,
                                                ),
                                            );
                                        }}
                                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        title="Zoom +"
                                    >
                                        <ZoomIn className="h-3.5 w-3.5" />
                                    </button>
                                    <div className="mx-1 h-3 w-px bg-border/80" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHtmlZoomMode('fit');

                                            if (htmlOuterRef.current) {
                                                const availableWidth =
                                                    htmlOuterRef.current
                                                        .clientWidth - 48;
                                                const scale = Math.max(
                                                    0.3,
                                                    Math.min(
                                                        availableWidth / 800,
                                                        1.2,
                                                    ),
                                                );
                                                setHtmlZoomScale(
                                                    Math.round(scale * 100) /
                                                        100,
                                                );
                                            }
                                        }}
                                        className={cn(
                                            'cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                                            htmlZoomMode === 'fit' &&
                                                'bg-primary text-primary-foreground hover:bg-primary/90',
                                        )}
                                    >
                                        Ajustar
                                    </button>
                                </div>

                                {/* Download Action */}
                                <a
                                    href={`/specimens/${specimenCode}/report-editor/pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Descargar PDF
                                </a>
                            </div>

                            {/* Scrollable Container with Scaled Pages */}
                            <div className="flex-1 [scrollbar-gutter:stable] overflow-x-auto overflow-y-auto p-4 pt-16">
                                {computedPages.length > 0 ? (
                                    <div
                                        style={{
                                            height: `${(1035 * totalHtmlPages + 24 * (totalHtmlPages - 1)) * htmlZoomScale}px`,
                                            width: `${800 * htmlZoomScale}px`,
                                            margin: '0 auto',
                                            position: 'relative',
                                        }}
                                    >
                                        <div
                                            className="shrink-0 origin-top-left"
                                            style={{
                                                transform: `scale(${htmlZoomScale})`,
                                            }}
                                        >
                                            {computedPages.map(
                                                (pageBlocks, index) => (
                                                    <PagePreview
                                                        key={index + 1}
                                                        pageNum={index + 1}
                                                        totalPages={
                                                            totalHtmlPages
                                                        }
                                                        pageBlocks={pageBlocks}
                                                        specimen={
                                                            previewData.specimen
                                                        }
                                                        sampleCollectionDate={
                                                            previewData.specimen
                                                                .sample_collection_date ||
                                                            ''
                                                        }
                                                        reportDate={
                                                            previewData.specimen
                                                                .report
                                                                ?.report_date ||
                                                            ''
                                                        }
                                                        finalizationDate={
                                                            previewData.specimen
                                                                .report
                                                                ?.finalization_date ||
                                                            ''
                                                        }
                                                        customEditorStyles={
                                                            editorStyles
                                                        }
                                                    />
                                                ),
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
                                        <FileText className="h-10 w-10 text-muted-foreground/50" />
                                        <p className="text-sm font-medium text-foreground">
                                            Sin contenido de informe redactado
                                        </p>
                                        <p className="max-w-xs text-xs text-muted-foreground">
                                            Esta muestra aún no cuenta con texto
                                            guardado en el informe patológico.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <SheetFooter className="border-t bg-card px-6 py-3">
                    <div className="flex w-full items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">
                            {specimenCode || ''}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="px-5 text-xs"
                        >
                            Cerrar
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};
