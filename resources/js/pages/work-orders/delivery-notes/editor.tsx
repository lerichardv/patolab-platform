import { Head, router } from '@inertiajs/react';
import type { Editor } from '@tiptap/react';
import {
    ArrowLeft,
    Briefcase,
    Download,
    FileText,
    Loader2,
    Microscope,
    MoreVertical,
    Package,
    Save,
    Trash2,
    User as UserIcon,
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
    EditorToolbar,
    RichTextEditorArea,
} from '@/components/rich-text-editor';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import EditorLayout from '@/layouts/editor-layout';
import WorkOrderViewSheet from '@/pages/my-work-orders/work-order-view-sheet';
import { editorStyles } from '@/pages/specimens/report-editor/components/editor-styles';
import { UnsavedChangesDialog } from '@/pages/specimens/report-editor/components/unsaved-changes-dialog';
import SpecimenViewSheet from '@/pages/specimens/specimen-view-sheet';
import DeliveryNoteLivePdfPreview from './live-pdf-preview';
import { DeliveryNotePaginator } from './services/delivery-note-paginator';
import type {
    DeliveryNoteMeasuredBlock,
    DeliveryNoteRecord,
    DeliveryNoteWorkOrder,
} from './types';

export interface DeliveryNoteEditorProps {
    workOrder: DeliveryNoteWorkOrder;
    deliveryNote: DeliveryNoteRecord;
}

export default function DeliveryNoteEditor({
    workOrder,
    deliveryNote,
}: DeliveryNoteEditorProps) {
    const [contentHtml, setContentHtml] = useState<string>(
        deliveryNote?.content_html || '',
    );
    const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
    const [saveState, setSaveState] = useState<'saved' | 'saving' | 'dirty'>(
        'saved',
    );
    const [isDownloading, setIsDownloading] = useState(false);
    const [showNavGuard, setShowNavGuard] = useState(false);
    const [isSavingForNav, setIsSavingForNav] = useState(false);
    const [isSpecimenSheetOpen, setIsSpecimenSheetOpen] = useState(false);
    const [isWorkOrderSheetOpen, setIsWorkOrderSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const pendingNavigationRef = useRef<(() => void) | null>(null);

    const isDirtyRef = useRef(false);
    const isSavingRef = useRef(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const contentHtmlRef = useRef(contentHtml);

    useEffect(() => {
        contentHtmlRef.current = contentHtml;
    }, [contentHtml]);

    // Track image load events to recalculate pages with true natural aspect ratios
    const [imageLoadVersion, setImageLoadVersion] = useState(0);

    useEffect(() => {
        const handleImageLoad = (e: Event) => {
            const target = e.target as HTMLElement;

            if (target && target.tagName === 'IMG') {
                setImageLoadVersion((v) => v + 1);
            }
        };

        window.addEventListener('load', handleImageLoad, true);

        // Check if images in the DOM are already loaded or when they become loaded
        const interval = setInterval(() => {
            const imgs = Array.from(
                document.querySelectorAll(
                    '.tiptap img, [data-type="image-grid"] img',
                ),
            ) as HTMLImageElement[];

            if (imgs.length > 0 && imgs.some((img) => img.naturalWidth > 0)) {
                setImageLoadVersion((v) => v + 1);
            }
        }, 300);

        const stopTimer = setTimeout(() => {
            clearInterval(interval);
        }, 2500);

        return () => {
            window.removeEventListener('load', handleImageLoad, true);
            clearInterval(interval);
            clearTimeout(stopTimer);
        };
    }, [contentHtml]);

    // Compute live paginated pages whenever contentHtml or image dimensions change
    const [pages, setPages] = useState<DeliveryNoteMeasuredBlock[][]>([]);
    const useIsomorphicLayoutEffect =
        typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

    useIsomorphicLayoutEffect(() => {
        // Reference imageLoadVersion so re-calculation triggers when image dimensions finish loading in DOM
        void imageLoadVersion;

        setPages(DeliveryNotePaginator.paginate(contentHtml));
    }, [contentHtml, imageLoadVersion]);

    const saveContent = useCallback(
        async (htmlToSave: string, showToast = true): Promise<boolean> => {
            if (isSavingRef.current) {
                return false;
            }

            isSavingRef.current = true;
            setSaveState('saving');

            try {
                const response = await fetch(
                    `/work-orders/${workOrder.id}/delivery-note/save`,
                    {
                        method: 'POST',
                        keepalive: true,
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-CSRF-TOKEN':
                                (
                                    document.querySelector(
                                        'meta[name="csrf-token"]',
                                    ) as HTMLMetaElement
                                )?.content ?? '',
                        },
                        body: JSON.stringify({
                            content_html: htmlToSave,
                        }),
                    },
                );

                if (response.ok) {
                    isDirtyRef.current = false;
                    setSaveState('saved');

                    if (showToast) {
                        toast.success(
                            'Nota de entrega guardada correctamente.',
                        );
                    }

                    return true;
                } else {
                    setSaveState('dirty');

                    if (showToast) {
                        toast.error('Error al guardar la nota de entrega.');
                    }

                    return false;
                }
            } catch {
                setSaveState('dirty');

                if (showToast) {
                    toast.error('Error de conexión al guardar.');
                }

                return false;
            } finally {
                isSavingRef.current = false;
            }
        },
        [workOrder.id],
    );

    const handleContentChange = useCallback(
        (newHtml: string) => {
            contentHtmlRef.current = newHtml;
            setContentHtml(newHtml);
            isDirtyRef.current = true;
            setSaveState('dirty');

            // Auto-save debounce (2.5s)
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
                saveContent(newHtml, false);
            }, 2500);
        },
        [saveContent],
    );

    const handleManualSave = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        return saveContent(contentHtmlRef.current, true);
    }, [saveContent]);

    const handleManualSaveRef = useRef(handleManualSave);

    useEffect(() => {
        handleManualSaveRef.current = handleManualSave;
    }, [handleManualSave]);

    // Warn user on accidental navigation while there are unsaved changes.
    // Also fires a best-effort save so data is not lost on tab close.
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!isDirtyRef.current) {
                return;
            }

            handleManualSaveRef.current();

            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () =>
            window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // In-app navigation guard: intercept Inertia router visits while there are unsaved changes.
    useEffect(() => {
        const removeListener = router.on('before', (event: any) => {
            if (!isDirtyRef.current) {
                return;
            }

            const visit = event.detail?.visit;

            // Skip partial data-only reloads
            const isPartialReload =
                Array.isArray(visit?.only) && visit.only.length > 0;

            if (isPartialReload) {
                return;
            }

            // Skip mutations targeting the delivery note editor itself (saving, uploading, etc.)
            const isDeliveryNoteAction =
                typeof visit?.url === 'string' &&
                visit.url.includes(
                    `/work-orders/${workOrder.id}/delivery-note`,
                ) &&
                visit?.method &&
                visit.method.toLowerCase() !== 'get';

            if (isDeliveryNoteAction) {
                return;
            }

            // Cancel the Inertia navigation and show the guard dialog
            event.preventDefault();

            pendingNavigationRef.current = () => {
                router.visit(visit?.url ?? window.location.href, {
                    method: visit?.method ?? 'get',
                    data: visit?.data,
                    preserveState: false,
                    preserveScroll: false,
                });
            };

            setShowNavGuard(true);
        });

        return removeListener;
    }, [workOrder.id]);

    const handleDownloadPdf = async () => {
        if (isDirtyRef.current) {
            await saveContent(contentHtmlRef.current, false);
        }

        setIsDownloading(true);
        const url = `/work-orders/${workOrder.id}/delivery-note/pdf`;
        window.open(url, '_blank');
        setTimeout(() => setIsDownloading(false), 1500);
    };

    const handleDeleteReport = async () => {
        setIsDeleting(true);

        try {
            const response = await fetch(
                `/work-orders/${workOrder.id}/delivery-note`,
                {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN':
                            (
                                document.querySelector(
                                    'meta[name="csrf-token"]',
                                ) as HTMLMetaElement
                            )?.content ?? '',
                    },
                },
            );

            if (response.ok) {
                isDirtyRef.current = false;
                toast.success('Nota de entrega eliminada correctamente.');
                setIsDeleteDialogOpen(false);
                router.visit(getReturnUrl());
            } else {
                toast.error('Error al eliminar la nota de entrega.');
                setIsDeleting(false);
            }
        } catch {
            toast.error('Error de conexión al eliminar la nota de entrega.');
            setIsDeleting(false);
        }
    };

    const getReturnUrl = () => {
        if (typeof window !== 'undefined') {
            const fromParam = new URLSearchParams(window.location.search).get(
                'from',
            );

            if (fromParam && fromParam.startsWith('/')) {
                return fromParam;
            }
        }

        return '/histotechnologist-work-orders';
    };

    const handleBack = () => {
        const targetUrl = getReturnUrl();

        if (isDirtyRef.current) {
            pendingNavigationRef.current = () => {
                router.visit(targetUrl);
            };
            setShowNavGuard(true);

            return;
        }

        router.visit(targetUrl);
    };

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const sequenceCode =
        workOrder.specimen?.sequence_code || `OT-${workOrder.id}`;
    const patientName =
        workOrder.specimen?.customer_relation?.name || 'No especificado';
    const orderTypesNames =
        workOrder.types?.map((t) => t.name).join(', ') || 'General';

    return (
        <EditorLayout
            breadcrumbs={[
                {
                    title: 'Órdenes de Trabajo',
                    href: getReturnUrl(),
                },
                {
                    title: sequenceCode,
                    href: `/histotechnologist-work-orders?search=${sequenceCode}`,
                },
                { title: 'Nota de Entrega', href: '#' },
            ]}
            headerRight={
                <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
                        {saveState === 'saving' && (
                            <>
                                <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                    Guardando...
                                </span>
                            </>
                        )}
                        {saveState === 'dirty' && (
                            <>
                                <div className="h-2 w-2 rounded-full bg-amber-400" />
                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                    Cambios sin guardar
                                </span>
                            </>
                        )}
                        {saveState === 'saved' && (
                            <>
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                    Guardado
                                </span>
                            </>
                        )}
                    </div>

                    <div className="h-5 w-px bg-border/80" />

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleBack}
                        className="h-8 gap-1.5"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Volver
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        onClick={handleManualSave}
                        disabled={saveState === 'saving'}
                        className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                    >
                        {saveState === 'saving' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Save className="h-3.5 w-3.5" />
                        )}
                        Guardar
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className="h-8 gap-1.5 lg:hidden"
                    >
                        {isDownloading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Download className="h-3.5 w-3.5" />
                        )}
                        PDF
                    </Button>
                </div>
            }
        >
            <Head title={`Nota de Entrega — ${sequenceCode}`} />
            <style dangerouslySetInnerHTML={{ __html: editorStyles }} />

            <div className="flex h-[calc(100vh-64px)] min-h-0 w-full overflow-hidden">
                {/* Left Pane: Editor */}
                <div className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-border bg-slate-50/50 lg:w-1/2 dark:bg-slate-900/10">
                    {/* Top sticky bar */}
                    <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b bg-white px-6 py-3">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleBack}
                                className="h-8 w-8 cursor-pointer"
                                title="Volver"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">
                                    Nota de Entrega
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    {sequenceCode} • {patientName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge
                                variant="secondary"
                                className="gap-1 text-xs"
                            >
                                <Package className="h-3 w-3" />
                                {workOrder.quantity} {orderTypesNames}
                            </Badge>
                        </div>
                    </div>

                    {/* Top sticky Toolbar */}
                    <div className="sticky top-0 z-10 shrink-0 bg-card">
                        <EditorToolbar
                            editor={activeEditor}
                            uploadUrl={`/work-orders/${workOrder.id}/delivery-note/upload-image`}
                        />
                    </div>

                    {/* Scrollable Editor Container */}
                    <div className="min-h-0 flex-1 overflow-y-auto p-6">
                        <div className="mx-auto max-w-3xl space-y-6">
                            {/* Summary Card */}
                            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-sm font-bold text-foreground">
                                                    Nota de Entrega
                                                </h2>
                                                <Badge
                                                    variant="outline"
                                                    className="font-mono text-xs"
                                                >
                                                    N° {sequenceCode}
                                                </Badge>
                                            </div>
                                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <UserIcon className="h-3.5 w-3.5" />
                                                <span>{patientName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="secondary"
                                            className="gap-1 text-xs"
                                        >
                                            <Package className="h-3 w-3" />
                                            {workOrder.quantity}{' '}
                                            {orderTypesNames}
                                        </Badge>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 cursor-pointer rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    title="Más opciones"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                className="w-56"
                                            >
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setIsSpecimenSheetOpen(
                                                            true,
                                                        )
                                                    }
                                                    className="cursor-pointer gap-2"
                                                >
                                                    <Microscope className="h-4 w-4 text-muted-foreground" />
                                                    <span>Ver Muestra</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setIsWorkOrderSheetOpen(
                                                            true,
                                                        )
                                                    }
                                                    className="cursor-pointer gap-2"
                                                >
                                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                                    <span>
                                                        Ver Orden de Trabajo
                                                    </span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setIsDeleteDialogOpen(
                                                            true,
                                                        )
                                                    }
                                                    className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span>
                                                        Eliminar Reporte
                                                    </span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>

                            {/* TipTap Rich Text Editor */}
                            <RichTextEditorArea
                                label="Editor de texto enriquecido"
                                content={contentHtml}
                                onChange={handleContentChange}
                                onEditorReady={(editor) =>
                                    setActiveEditor(editor)
                                }
                                onFocus={(editor) => setActiveEditor(editor)}
                                onBlur={() => {}}
                                field="delivery_note"
                                minHeight="min-h-[350px]"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Pane: Live PDF Preview */}
                <div className="hidden h-full min-h-0 flex-col overflow-hidden lg:flex lg:w-1/2">
                    <DeliveryNoteLivePdfPreview
                        workOrder={workOrder}
                        pages={pages}
                        onDownloadPdf={handleDownloadPdf}
                        isDownloading={isDownloading}
                    />
                </div>
            </div>

            <UnsavedChangesDialog
                open={showNavGuard}
                isSaving={isSavingForNav}
                description="Tienes cambios sin guardar en la nota de entrega. Si sales ahora, podrías perder los últimos cambios realizados."
                onCancel={() => {
                    setShowNavGuard(false);
                    pendingNavigationRef.current = null;
                }}
                onLeave={() => {
                    if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                    }

                    isDirtyRef.current = false;
                    setShowNavGuard(false);
                    pendingNavigationRef.current?.();
                    pendingNavigationRef.current = null;
                }}
                onSaveAndLeave={async () => {
                    if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                    }

                    setIsSavingForNav(true);

                    try {
                        const success = await saveContent(
                            contentHtmlRef.current,
                            true,
                        );

                        if (success) {
                            isDirtyRef.current = false;
                            setShowNavGuard(false);
                            pendingNavigationRef.current?.();
                            pendingNavigationRef.current = null;
                        }
                    } catch (err: any) {
                        toast.error(
                            err?.message ||
                                'Error al guardar la nota de entrega',
                        );
                    } finally {
                        setIsSavingForNav(false);
                    }
                }}
            />

            {/* Lazy loaded sheets */}
            <SpecimenViewSheet
                specimenId={workOrder.specimen_id}
                open={isSpecimenSheetOpen}
                onOpenChange={setIsSpecimenSheetOpen}
            />

            <WorkOrderViewSheet
                workOrderId={workOrder.id}
                open={isWorkOrderSheetOpen}
                onOpenChange={setIsWorkOrderSheetOpen}
            />

            {/* Delete confirmation dialog */}
            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Eliminar nota de entrega?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará la nota de entrega para la
                            orden de trabajo #{workOrder.id} ({sequenceCode}).
                            Se perderán el contenido redactado y el documento
                            PDF asociado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteReport}
                            disabled={isDeleting}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                'Eliminar'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </EditorLayout>
    );
}
