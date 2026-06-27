import { Transition } from '@headlessui/react';
import { Link, useForm, usePage, router } from '@inertiajs/react';
import Signature from '@uiw/react-signature/canvas';
import type { SignatureCanvasRef } from '@uiw/react-signature/canvas';
import {
    Check,
    Eraser,
    Image as ImageIcon,
    PenTool,
    Upload,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { update } from '@/routes/profile';
import { update as updateSignature } from '@/routes/profile/signature';

function trimCanvas(canvas: HTMLCanvasElement): string | null {
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alphaIndex = (y * width + x) * 4 + 3;
            const alpha = data[alphaIndex];

            if (alpha > 0) {
                if (x < minX) {
                    minX = x;
                }

                if (x > maxX) {
                    maxX = x;
                }

                if (y < minY) {
                    minY = y;
                }

                if (y > maxY) {
                    maxY = y;
                }
            }
        }
    }

    if (maxX === -1 || maxY === -1) {
        return null;
    }

    const padding = 4;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;

    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
        return null;
    }

    tempCtx.drawImage(
        canvas,
        minX,
        minY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight,
    );

    return tempCanvas.toDataURL('image/png');
}

export default function UpdateProfileInformationForm({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const [sheetOpen, setSheetOpen] = useState(false);
    const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>(
        'draw',
    );
    const [isCanvasDirty, setIsCanvasDirty] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [sigProcessing, setSigProcessing] = useState(false);

    const sigRef = useRef<SignatureCanvasRef>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [canvasWidth, setCanvasWidth] = useState(600);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    const [history, setHistory] = useState<number[][][]>([]);
    const [canvasKey, setCanvasKey] = useState(0);

    const defaultPoints = useMemo(() => {
        const points: Record<string, number[][]> = {};
        history.forEach((stroke, index) => {
            points[`stroke-${index}`] = stroke;
        });

        return points;
    }, [history]);

    const canvasContainerRef = useCallback((node: HTMLDivElement | null) => {
        if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
            resizeObserverRef.current = null;
        }

        if (node) {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.contentRect.width > 0) {
                        setCanvasWidth(entry.contentRect.width);
                    }
                }
            });
            observer.observe(node);
            resizeObserverRef.current = observer;
        }
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(update().url);
    };

    const handleOpenSheet = () => {
        setSheetOpen(true);
        setSignatureMode('draw');
        setIsCanvasDirty(false);
        setSelectedFile(null);
        setFilePreview(null);
        setHistory([]);
        setCanvasKey((prev) => prev + 1);
    };

    const handleClearCanvas = () => {
        setIsCanvasDirty(false);
        setHistory([]);
        setCanvasKey((prev) => prev + 1);
    };

    const handleCanvasPointer = (points: number[][]) => {
        setIsCanvasDirty(true);
        setHistory((prev) => [...prev, points]);
    };

    const handleFileChange = (file: File | null) => {
        if (!file) {
            return;
        }

        if (file.type !== 'image/png') {
            toast.error('Solo se permiten archivos PNG');

            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('El tamaño de la imagen no debe superar los 2MB');

            return;
        }

        setSelectedFile(file);
        setFilePreview(URL.createObjectURL(file));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleSaveSignature = () => {
        if (signatureMode === 'draw') {
            if (!isCanvasDirty || !sigRef.current?.canvas) {
                toast.error('Por favor, dibuje su firma antes de guardar.');

                return;
            }

            const base64 = trimCanvas(sigRef.current.canvas);

            if (!base64) {
                toast.error('No se pudo generar la imagen de la firma.');

                return;
            }

            setSigProcessing(true);
            router.post(
                updateSignature().url,
                { signature_base64: base64 },
                {
                    onFinish: () => setSigProcessing(false),
                    onSuccess: () => {
                        setSheetOpen(false);
                        toast.success('Firma dibujada guardada correctamente');
                    },
                    onError: (err) => {
                        const errorMsg =
                            err.signature_base64 || 'Error al guardar la firma';
                        toast.error(errorMsg);
                    },
                },
            );
        } else {
            if (!selectedFile) {
                toast.error('Por favor, seleccione o arrastre un archivo PNG.');

                return;
            }

            setSigProcessing(true);
            router.post(
                updateSignature().url,
                { signature_file: selectedFile },
                {
                    onFinish: () => setSigProcessing(false),
                    onSuccess: () => {
                        setSheetOpen(false);
                        setSelectedFile(null);
                        setFilePreview(null);
                        toast.success('Archivo de firma cargado correctamente');
                    },
                    onError: (err) => {
                        const errorMsg =
                            err.signature_file ||
                            'Error al cargar el archivo de firma';
                        toast.error(errorMsg);
                    },
                },
            );
        }
    };

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-lg font-medium text-foreground">
                    Información del perfil
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Actualice la información de su cuenta y su dirección de
                    correo electrónico.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div className="grid gap-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        autoComplete="name"
                    />
                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />
                    <InputError className="mt-2" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-foreground">
                            Su dirección de correo electrónico no está
                            verificada.
                            <Link
                                href="/email/verification-notification"
                                method="post"
                                as="button"
                                className="rounded-md text-sm text-muted-foreground underline hover:text-foreground focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
                            >
                                Haga clic aquí para volver a enviar el correo de
                                verificación.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-green-600">
                                Se ha enviado un nuevo enlace de verificación a
                                su dirección de correo electrónico.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <Button disabled={processing}>Guardar</Button>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-muted-foreground">
                            Guardado.
                        </p>
                    </Transition>
                </div>
            </form>

            <Separator className="my-6" />

            <section className="space-y-6">
                <header>
                    <h2 className="text-lg font-medium text-foreground">
                        Mi Firma
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Administre la firma digital que se utilizará para firmar
                        los informes y reportes PDF.
                    </p>
                </header>

                <div className="flex flex-col items-center gap-6 rounded-lg border bg-card p-6 text-card-foreground shadow-xs md:flex-row">
                    {user.signature_url ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex min-h-[120px] w-[220px] items-center justify-center rounded-md border bg-white p-4 shadow-inner">
                                <img
                                    src={user.signature_url as string}
                                    alt="Firma actual"
                                    className="max-h-[100px] max-w-[200px] object-contain"
                                />
                            </div>
                            <span className="text-xs text-muted-foreground">
                                Firma registrada
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex min-h-[120px] w-[220px] items-center justify-center rounded-md border border-dashed bg-muted p-4 text-sm font-medium text-muted-foreground">
                                Sin firma registrada
                            </div>
                            <span className="text-xs text-muted-foreground">
                                Sin firma
                            </span>
                        </div>
                    )}

                    <div className="flex flex-1 flex-col items-start gap-3">
                        <p className="text-sm text-muted-foreground">
                            Puede dibujar su firma digital directamente en la
                            pantalla o cargar una imagen PNG transparente.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleOpenSheet}
                        >
                            {user.signature_url
                                ? 'Actualizar firma'
                                : 'Crear firma'}
                        </Button>
                    </div>
                </div>
            </section>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    className="flex h-full flex-col gap-4 sm:max-w-2xl"
                >
                    <SheetHeader>
                        <SheetTitle>Firma Digital</SheetTitle>
                        <SheetDescription>
                            Dibuje su firma o suba un archivo PNG para su uso en
                            reportes.
                        </SheetDescription>
                    </SheetHeader>

                    {/* Mode Selector Tabs */}
                    <div className="mx-5 grid grid-cols-2 gap-2 rounded-md border bg-muted p-1">
                        <Button
                            type="button"
                            variant={
                                signatureMode === 'draw' ? 'secondary' : 'ghost'
                            }
                            size="sm"
                            className={cn(
                                'w-full gap-2',
                                signatureMode === 'draw' &&
                                    'bg-background shadow-xs',
                            )}
                            onClick={() => setSignatureMode('draw')}
                        >
                            <PenTool className="h-4 w-4" />
                            Dibujar
                        </Button>
                        <Button
                            type="button"
                            variant={
                                signatureMode === 'upload'
                                    ? 'secondary'
                                    : 'ghost'
                            }
                            size="sm"
                            className={cn(
                                'w-full gap-2',
                                signatureMode === 'upload' &&
                                    'bg-background shadow-xs',
                            )}
                            onClick={() => setSignatureMode('upload')}
                        >
                            <Upload className="h-4 w-4" />
                            Subir PNG
                        </Button>
                    </div>

                    {/* Content Body */}
                    <div className="flex flex-1 flex-col gap-4 px-5 py-4">
                        {signatureMode === 'draw' ? (
                            <div className="flex flex-1 flex-col gap-2">
                                <span className="text-sm font-medium text-foreground">
                                    Dibuje su firma:
                                </span>
                                <div className="relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden">
                                    <div
                                        ref={canvasContainerRef}
                                        className="h-[280px] w-full overflow-hidden rounded-md border border-input bg-white shadow-inner"
                                    >
                                        <Signature
                                            key={canvasKey}
                                            ref={sigRef}
                                            defaultPoints={defaultPoints}
                                            options={{
                                                size: 5,
                                                smoothing: 0.6,
                                                thinning: 0.7,
                                            }}
                                            width={canvasWidth}
                                            height={280}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                            }}
                                            className="cursor-crosshair"
                                            onPointer={handleCanvasPointer}
                                        />
                                    </div>
                                    <div className="flex items-center justify-center gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="gap-1.5 text-muted-foreground hover:fill-white hover:text-foreground hover:text-white"
                                            onClick={handleClearCanvas}
                                            disabled={!isCanvasDirty}
                                            title="Limpiar firma"
                                        >
                                            <Eraser className="h-4 w-4" />{' '}
                                            Limpiar
                                        </Button>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    Use su mouse o pantalla táctil para firmar
                                    en el recuadro blanco de arriba.
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-1 flex-col gap-2">
                                <span className="text-sm font-medium text-foreground">
                                    Suba su firma en formato PNG:
                                </span>
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    className={cn(
                                        'flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-4 rounded-md border-2 border-dashed p-8 text-center transition-all select-none',
                                        dragOver
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted-foreground/30 hover:border-primary hover:bg-accent/30',
                                    )}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/png"
                                        onChange={(e) => {
                                            if (
                                                e.target.files &&
                                                e.target.files[0]
                                            ) {
                                                handleFileChange(
                                                    e.target.files[0],
                                                );
                                            }
                                        }}
                                    />

                                    {filePreview ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="group relative flex min-h-[100px] max-w-[220px] items-center justify-center rounded-md border bg-white p-4 shadow-xs">
                                                <img
                                                    src={filePreview}
                                                    alt="Vista previa de firma subida"
                                                    className="max-h-[80px] object-contain"
                                                />
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="max-w-[240px] truncate text-xs font-semibold text-foreground">
                                                    {selectedFile?.name}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {(
                                                        selectedFile!.size /
                                                        1024
                                                    ).toFixed(1)}{' '}
                                                    KB
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFile(null);
                                                    setFilePreview(null);
                                                }}
                                            >
                                                Remover archivo
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="rounded-full bg-muted p-3 text-muted-foreground">
                                                <ImageIcon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Haga clic o arrastre un
                                                    archivo PNG aquí
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Solo formato PNG (fondo
                                                    transparente recomendado)
                                                </p>
                                                <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                                                    Tamaño máximo de 2MB
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <SheetFooter className="mt-auto flex flex-row items-center justify-end gap-2 border-t pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSheetOpen(false)}
                            disabled={sigProcessing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveSignature}
                            disabled={sigProcessing}
                            className="gap-2"
                        >
                            {sigProcessing ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                            Guardar
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </section>
    );
}
