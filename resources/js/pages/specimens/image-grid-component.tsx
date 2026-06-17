import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { LayoutGrid, Plus, Trash2, Settings2, Columns, Image as ImageIcon, X, Crop } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ImageGridProps {
    editor: any;
    node: any;
    getPos: () => number | undefined;
    updateAttributes: (attrs: any) => void;
}

export default function ImageGridComponent({
    editor,
    node,
    getPos,
    updateAttributes,
}: ImageGridProps) {
    const columns = node.attrs.columns || 2;
    const isEditable = editor.isEditable;
    const [isOpen, setIsOpen] = useState(false);
    const [croppingImage, setCroppingImage] = useState<{ src: string; offset: number; nodeSize: number } | null>(null);

    // Fetch the specimenSequenceCode from the extension options
    const extOptions = editor.extensionManager.extensions.find(
        (ext: any) => ext.name === 'imageGrid'
    )?.options;
    const specimenSequenceCode = extOptions?.specimenSequenceCode || '';

    // Collect current images reactively
    const currentImages: Array<{ src: string; offset: number; nodeSize: number }> = [];
    node.content.forEach((childNode: any, offset: number) => {
        if (childNode.type.name === 'image') {
            currentImages.push({
                src: childNode.attrs.src,
                offset,
                nodeSize: childNode.nodeSize,
            });
        }
    });

    const updateColumns = (cols: number) => {
        updateAttributes({ columns: cols });
    };

    const handleDeleteGrid = () => {
        const pos = getPos();
        if (pos !== undefined) {
            editor.commands.deleteRange({
                from: pos,
                to: pos + node.nodeSize,
            });
            setIsOpen(false);
            toast.success('Cuadrícula de imágenes eliminada');
        }
    };

    const handleDeleteImage = (offset: number, size: number) => {
        const pos = getPos();
        if (pos !== undefined) {
            editor.commands.deleteRange({
                from: pos + 1 + offset,
                to: pos + 1 + offset + size,
            });
            toast.success('Imagen eliminada de la galería');
        }
    };

    const handleCropImage = async (imgOffset: number, imgNodeSize: number, croppedBlob: Blob) => {
        const uploadToast = toast.loading('Guardando imagen recortada...');

        const file = new File([croppedBlob], 'cropped.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(
                `/specimens/${specimenSequenceCode}/report-editor/upload-image`,
                {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN':
                            (
                                document.querySelector(
                                    'meta[name="csrf-token"]',
                                ) as HTMLMetaElement
                            )?.content ?? '',
                    },
                    body: formData,
                },
            );

            if (response.ok) {
                const data = await response.json();
                if (data.url) {
                    const pos = getPos();
                    if (pos !== undefined) {
                        const targetPos = pos + 1 + imgOffset;

                        // Replace the old image attributes with the new cropped ones atomically
                        editor.chain().focus()
                            .command(({ tr }: any) => {
                                const node = tr.doc.nodeAt(targetPos);
                                if (node) {
                                    tr.setNodeMarkup(targetPos, undefined, {
                                        ...node.attrs,
                                        src: data.url,
                                        width: null,
                                        height: null,
                                    });
                                }
                                return true;
                            })
                            .run();

                        toast.dismiss(uploadToast);
                        toast.success('Imagen recortada con éxito');
                        return;
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }

        toast.dismiss(uploadToast);
        toast.error('Error al guardar la imagen recortada');
    };

    const handleAddImage = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length === 0) return;

            const uploadToast = toast.loading('Subiendo imágenes...');

            let successCount = 0;
            for (const file of files) {
                const formData = new FormData();
                formData.append('image', file);

                try {
                    const response = await fetch(
                        `/specimens/${specimenSequenceCode}/report-editor/upload-image`,
                        {
                            method: 'POST',
                            headers: {
                                'X-CSRF-TOKEN':
                                    (
                                        document.querySelector(
                                            'meta[name="csrf-token"]',
                                        ) as HTMLMetaElement
                                    )?.content ?? '',
                            },
                            body: formData,
                        },
                    );

                    if (response.ok) {
                        const data = await response.json();
                        if (data.url) {
                            const pos = getPos();
                            if (pos !== undefined) {
                                // Insert image at the end of the grid node
                                const insertPos = pos + node.nodeSize - 1;
                                editor.chain().focus().insertContentAt(insertPos, {
                                    type: 'image',
                                    attrs: {
                                        src: data.url,
                                        alignment: 'center',
                                    },
                                }).run();
                                successCount++;
                            }
                        }
                    }
                } catch (err) {
                    console.error(err);
                }
            }

            toast.dismiss(uploadToast);
            if (successCount > 0) {
                toast.success(`${successCount} imagen(es) subida(s) con éxito`);
            } else {
                toast.error('Error al subir las imágenes');
            }
        };
        input.click();
    };

    return (
        <NodeViewWrapper
            data-type="image-grid"
            data-columns={columns}
            className="image-grid-container border border-slate-200 dark:border-slate-800/80 rounded-lg p-1.5 my-4 bg-slate-50/10 dark:bg-slate-950/5 group relative transition-all duration-200"
        >
            {/* Gallery settings trigger button (visible on hover) */}
            {isEditable && currentImages.length > 0 && (
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <button
                                type="button"
                                className="flex h-7 items-center gap-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs px-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <Settings2 className="h-3.5 w-3.5 text-indigo-500" />
                                <span>Configurar Galería</span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <LayoutGrid className="h-5 w-5 text-indigo-500" />
                                    <span>Configurar Galería de Imágenes</span>
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-5 py-3">
                                {/* Columns Selector */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                        Distribución de Columnas
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[1, 2, 3, 4].map((cols) => (
                                            <button
                                                key={cols}
                                                type="button"
                                                onClick={() => updateColumns(cols)}
                                                className={cn(
                                                    'flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-200 cursor-pointer',
                                                    columns === cols
                                                        ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20'
                                                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                )}
                                            >
                                                <Columns className="h-4 w-4 mb-1" />
                                                <span className="text-xs font-semibold">
                                                    {cols} {cols === 1 ? 'Columna' : 'Columnas'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Images Manager */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            Imágenes en Galería ({currentImages.length})
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleAddImage}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Subir imágenes</span>
                                        </button>
                                    </div>

                                    {currentImages.length === 0 ? (
                                        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center bg-slate-50/50 dark:bg-slate-950/20">
                                            <ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                No hay imágenes añadidas
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAddImage}
                                                className="mt-3 cursor-pointer"
                                            >
                                                Añadir primera imagen
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1 border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-950/10">
                                            {currentImages.map((img, idx) => (
                                                <div
                                                    key={idx}
                                                    className="group/img relative aspect-square rounded-md overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                                                >
                                                    <img
                                                        src={img.src}
                                                        alt={`Thumbnail ${idx + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setCroppingImage(img)}
                                                        className="absolute top-1 right-8 h-6 w-6 rounded-md bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-md opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 cursor-pointer"
                                                        title="Recortar imagen"
                                                    >
                                                        <Crop className="h-3.5 w-3.5 text-indigo-500" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDeleteImage(img.offset, img.nodeSize)
                                                        }
                                                        className="absolute top-1 right-1 h-6 w-6 rounded-md bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 cursor-pointer"
                                                        title="Eliminar de la galería"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="flex justify-between sm:justify-between items-center border-t border-slate-100 dark:border-slate-900 pt-3 mt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleDeleteGrid}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5 h-9 cursor-pointer"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Eliminar Galería</span>
                                </Button>
                                <DialogClose asChild>
                                    <Button type="button" className="h-9 cursor-pointer">
                                        Listo
                                    </Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            {/* Empty state card (triggers the setup dialog immediately) */}
            {isEditable && currentImages.length === 0 && (
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-800 rounded-lg p-8 cursor-pointer bg-background hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors my-2 select-none">
                            <LayoutGrid className="h-8 w-8 text-slate-400 dark:text-slate-600 mb-2" />
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Galería de Imágenes Vacía
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                Haga clic aquí para configurar, elegir columnas y añadir imágenes.
                            </p>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <LayoutGrid className="h-5 w-5 text-indigo-500" />
                                <span>Configurar Galería de Imágenes</span>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-5 py-3">
                            {/* Columns Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                    Distribución de Columnas
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 2, 3, 4].map((cols) => (
                                        <button
                                            key={cols}
                                            type="button"
                                            onClick={() => updateColumns(cols)}
                                            className={cn(
                                                'flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-200 cursor-pointer',
                                                columns === cols
                                                    ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20'
                                                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                            )}
                                        >
                                            <Columns className="h-4 w-4 mb-1" />
                                            <span className="text-xs font-semibold">
                                                {cols} {cols === 1 ? 'Columna' : 'Columnas'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Images Manager */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        Imágenes en Galería (0)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddImage}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Subir imágenes</span>
                                    </button>
                                </div>

                                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center bg-slate-50/50 dark:bg-slate-950/20">
                                    <ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        No hay imágenes añadidas
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddImage}
                                        className="mt-3 cursor-pointer"
                                    >
                                        Añadir imágenes
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex justify-between sm:justify-between items-center border-t border-slate-100 dark:border-slate-900 pt-3 mt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleDeleteGrid}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5 h-9 cursor-pointer"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span>Eliminar Galería</span>
                            </Button>
                            <DialogClose asChild>
                                <Button type="button" className="h-9 cursor-pointer">
                                    Listo
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Grid display layout */}
            <NodeViewContent
                className={cn(
                    'w-full transition-all duration-300 p-1',
                    isEditable && currentImages.length === 0 && 'hidden'
                )}
            />
            {/* Image Cropper Modal */}
            {croppingImage && (
                <ImageCropperDialog
                    src={croppingImage.src}
                    isOpen={croppingImage !== null}
                    onOpenChange={(open) => {
                        if (!open) setCroppingImage(null);
                    }}
                    onCrop={async (blob) => {
                        await handleCropImage(
                            croppingImage.offset,
                            croppingImage.nodeSize,
                            blob
                        );
                        setCroppingImage(null);
                    }}
                />
            )}
        </NodeViewWrapper>
    );
}

export interface ImageCropperDialogProps {
    src: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCrop: (croppedBlob: Blob) => Promise<void>;
}

export function ImageCropperDialog({
    src,
    isOpen,
    onOpenChange,
    onCrop,
}: ImageCropperDialogProps) {
    const [crop, setCrop] = useState({ x: 10, y: 10, w: 80, h: 80 });
    const [aspectRatio, setAspectRatio] = useState<string>('free');
    const [imageRect, setImageRect] = useState<{ width: number; height: number } | null>(null);
    const [naturalWidth, setNaturalWidth] = useState<number>(0);
    const [naturalHeight, setNaturalHeight] = useState<number>(0);
    const [isCropping, setIsCropping] = useState(false);

    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [dragState, setDragState] = useState<{
        action: string | null;
        startX: number;
        startY: number;
        startCrop: { x: number; y: number; w: number; h: number };
        rectWidth: number;
        rectHeight: number;
    }>({
        action: null,
        startX: 0,
        startY: 0,
        startCrop: { x: 0, y: 0, w: 0, h: 0 },
        rectWidth: 0,
        rectHeight: 0,
    });

    // Reset crop state on open/src change
    useEffect(() => {
        if (isOpen) {
            setCrop({ x: 10, y: 10, w: 80, h: 80 });
            setAspectRatio('free');
            setImageRect(null);
        }
    }, [isOpen, src]);

    const handleImageLoad = () => {
        if (imageRef.current) {
            setImageRect({
                width: imageRef.current.clientWidth,
                height: imageRef.current.clientHeight,
            });
            setNaturalWidth(imageRef.current.naturalWidth);
            setNaturalHeight(imageRef.current.naturalHeight);
        }
    };

    const handleAspectRatioChange = (ratio: string) => {
        setAspectRatio(ratio);
        if (ratio === 'free') return;

        const ratioValue = ratio === '1:1' ? 1 : ratio === '4:3' ? 4 / 3 : 16 / 9;
        const imgRatio = naturalWidth / naturalHeight;
        const targetWToHRatio = ratioValue / imgRatio;

        let w = 80;
        let h = 80 / targetWToHRatio;
        if (h > 80) {
            h = 80;
            w = 80 * targetWToHRatio;
        }

        setCrop({
            x: (100 - w) / 2,
            y: (100 - h) / 2,
            w,
            h,
        });
    };

    const handlePointerDown = (e: React.PointerEvent, action: string) => {
        e.preventDefault();
        e.stopPropagation();
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        setDragState({
            action,
            startX: e.clientX,
            startY: e.clientY,
            startCrop: { ...crop },
            rectWidth: rect.width,
            rectHeight: rect.height,
        });

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragState.action) return;
        const dx = ((e.clientX - dragState.startX) / dragState.rectWidth) * 100;
        const dy = ((e.clientY - dragState.startY) / dragState.rectHeight) * 100;

        let newCrop = { ...dragState.startCrop };

        if (dragState.action === 'move') {
            newCrop.x = Math.max(0, Math.min(100 - newCrop.w, newCrop.x + dx));
            newCrop.y = Math.max(0, Math.min(100 - newCrop.h, newCrop.y + dy));
        } else {
            let left = newCrop.x;
            let top = newCrop.y;
            let right = newCrop.x + newCrop.w;
            let bottom = newCrop.y + newCrop.h;

            if (dragState.action.includes('w')) {
                left = Math.max(0, Math.min(right - 10, left + dx));
            }
            if (dragState.action.includes('e')) {
                right = Math.max(left + 10, Math.min(100, right + dx));
            }
            if (dragState.action.includes('n')) {
                top = Math.max(0, Math.min(bottom - 10, top + dy));
            }
            if (dragState.action.includes('s')) {
                bottom = Math.max(top + 10, Math.min(100, bottom + dy));
            }

            newCrop.x = left;
            newCrop.y = top;
            newCrop.w = right - left;
            newCrop.h = bottom - top;

            if (aspectRatio !== 'free') {
                const ratioValue = aspectRatio === '1:1' ? 1 : aspectRatio === '4:3' ? 4 / 3 : 16 / 9;
                const imgRatio = naturalWidth / naturalHeight;
                const targetWToHRatio = ratioValue / imgRatio;

                if (dragState.action.includes('e') || dragState.action.includes('w')) {
                    newCrop.h = newCrop.w / targetWToHRatio;
                    if (top + newCrop.h > 100) {
                        newCrop.h = 100 - top;
                        newCrop.w = newCrop.h * targetWToHRatio;
                    }
                } else {
                    newCrop.w = newCrop.h * targetWToHRatio;
                    if (left + newCrop.w > 100) {
                        newCrop.w = 100 - left;
                        newCrop.h = newCrop.w / targetWToHRatio;
                    }
                }
            }
        }

        setCrop(newCrop);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!dragState.action) return;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        setDragState({
            action: null,
            startX: 0,
            startY: 0,
            startCrop: { x: 0, y: 0, w: 0, h: 0 },
            rectWidth: 0,
            rectHeight: 0,
        });
    };

    const handleCropConfirm = async () => {
        setIsCropping(true);
        try {
            const image = new Image();
            image.crossOrigin = 'anonymous';

            let finalSrc = src;
            try {
                if (src.startsWith('http://') || src.startsWith('https://')) {
                    const urlObj = new URL(src);
                    finalSrc = urlObj.pathname + urlObj.search + urlObj.hash;
                }
            } catch (e) {
                console.error('Failed to parse src URL', e);
            }

            image.src = finalSrc;
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });

            const canvas = document.createElement('canvas');
            const cropX = (crop.x / 100) * image.naturalWidth;
            const cropY = (crop.y / 100) * image.naturalHeight;
            const cropW = (crop.w / 100) * image.naturalWidth;
            const cropH = (crop.h / 100) * image.naturalHeight;

            canvas.width = cropW;
            canvas.height = cropH;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');

            ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    toast.error('Error al generar el recorte');
                    setIsCropping(false);
                    return;
                }

                await onCrop(blob);
                setIsCropping(false);
                onOpenChange(false);
            }, 'image/jpeg', 0.9);
        } catch (err) {
            console.error(err);
            toast.error('Error al procesar el recorte de la imagen');
            setIsCropping(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Crop className="h-5 w-5 text-indigo-500" />
                        <span>Recortar Imagen</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col min-h-0 py-4 items-center justify-center">
                    {/* Aspect Ratio Presets */}
                    <div className="flex gap-2 justify-center mb-4 w-full">
                        {[
                            { label: 'Libre', value: 'free' },
                            { label: '1:1 (Cuadrado)', value: '1:1' },
                            { label: '4:3', value: '4:3' },
                            { label: '16:9', value: '16:9' },
                        ].map((preset) => (
                            <Button
                                key={preset.value}
                                type="button"
                                variant={aspectRatio === preset.value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleAspectRatioChange(preset.value)}
                                className="cursor-pointer h-8 text-xs font-semibold"
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>

                    {/* Work Canvas Container */}
                    <div className="relative max-w-full flex-1 bg-slate-950/5 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center p-4 min-h-[300px]">
                        <div className="relative inline-block select-none overflow-hidden max-h-[50vh]">
                            <img
                                ref={imageRef}
                                src={src}
                                onLoad={handleImageLoad}
                                alt="To crop"
                                className="max-w-full max-h-[50vh] object-contain select-none pointer-events-none"
                            />
                            {imageRect && (
                                <div
                                    ref={containerRef}
                                    className="absolute top-0 left-0 select-none touch-none"
                                    style={{ width: imageRect.width, height: imageRect.height }}
                                    onPointerMove={handlePointerMove}
                                >
                                    {/* Shaded boundaries */}
                                    <div
                                        className="absolute bg-black/50 pointer-events-none z-10"
                                        style={{ top: 0, left: 0, right: 0, height: `${crop.y}%` }}
                                    />
                                    <div
                                        className="absolute bg-black/50 pointer-events-none z-10"
                                        style={{ bottom: 0, left: 0, right: 0, top: `${crop.y + crop.h}%` }}
                                    />
                                    <div
                                        className="absolute bg-black/50 pointer-events-none z-10"
                                        style={{ left: 0, top: `${crop.y}%`, height: `${crop.h}%`, width: `${crop.x}%` }}
                                    />
                                    <div
                                        className="absolute bg-black/50 pointer-events-none z-10"
                                        style={{ right: 0, top: `${crop.y}%`, height: `${crop.h}%`, left: `${crop.x + crop.w}%` }}
                                    />

                                    {/* Crop Box Selector */}
                                    <div
                                        className="absolute border-2 border-dashed border-white cursor-move z-20"
                                        style={{
                                            left: `${crop.x}%`,
                                            top: `${crop.y}%`,
                                            width: `${crop.w}%`,
                                            height: `${crop.h}%`,
                                        }}
                                        onPointerDown={(e) => handlePointerDown(e, 'move')}
                                        onPointerUp={handlePointerUp}
                                    >
                                        {/* Grid gridlines */}
                                        <div className="absolute inset-0 border border-white/20 pointer-events-none">
                                            <div className="absolute inset-y-0 left-1/3 right-1/3 border-x border-dashed border-white/30" />
                                            <div className="absolute inset-x-0 top-1/3 bottom-1/3 border-y border-dashed border-white/30" />
                                        </div>

                                        {/* Corners */}
                                        <div
                                            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-indigo-500 border border-white rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
                                            onPointerDown={(e) => handlePointerDown(e, 'nw')}
                                            onPointerUp={handlePointerUp}
                                        />
                                        <div
                                            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-indigo-500 border border-white rounded-full cursor-nesw-resize hover:scale-125 transition-transform"
                                            onPointerDown={(e) => handlePointerDown(e, 'ne')}
                                            onPointerUp={handlePointerUp}
                                        />
                                        <div
                                            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-indigo-500 border border-white rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
                                            onPointerDown={(e) => handlePointerDown(e, 'se')}
                                            onPointerUp={handlePointerUp}
                                        />
                                        <div
                                            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-indigo-500 border border-white rounded-full cursor-nesw-resize hover:scale-125 transition-transform"
                                            onPointerDown={(e) => handlePointerDown(e, 'sw')}
                                            onPointerUp={handlePointerUp}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-900 pt-3">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isCropping}
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer h-9"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        disabled={isCropping}
                        onClick={handleCropConfirm}
                        className="cursor-pointer h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isCropping ? 'Procesando...' : 'Aplicar Recorte'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
