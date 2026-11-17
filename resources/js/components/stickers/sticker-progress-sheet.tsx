import {
    Printer,
    Download,
    CheckCircle2,
    AlertCircle,
    Loader2,
    QrCode,
    RefreshCw,
    ExternalLink,
    Plus,
    Building2,
    Info,
    SlidersHorizontal,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import LaboratorySheet from '@/pages/laboratories/laboratory-sheet';
import StickerLivePreview from './sticker-live-preview';
import type {
    LaboratoryItem,
    StickerProgressSheetProps,
    StickerType,
} from './types';

export default function StickerProgressSheet({
    open,
    onOpenChange,
    initialType = 'muestra',
    specimenIds = [],
    cuttingIds = [],
    cuttingsAvailable = [],
    previewSpecimens = [],
    previewCuttings = [],
    title,
    description,
    autoStart = false,
}: StickerProgressSheetProps) {
    const resolvedInitialType: StickerType =
        initialType === 'frasco' || initialType === 'corte'
            ? 'muestra'
            : initialType;

    const [selectedType, setSelectedType] =
        useState<StickerType>(resolvedInitialType);
    const [selectedCuttingCode, setSelectedCuttingCode] =
        useState<string>('none');
    const [status, setStatus] = useState<
        'idle' | 'generating' | 'completed' | 'error'
    >('idle');
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const hasAutoStartedRef = useRef(false);

    // Dynamic Laboratory Management
    const [laboratories, setLaboratories] = useState<LaboratoryItem[]>([]);
    const [selectedLabId, setSelectedLabId] = useState<string>('');
    const [labsLoading, setLabsLoading] = useState(false);
    const [isAddLabOpen, setIsAddLabOpen] = useState(false);

    // Editable text fields for Specimen sticker
    const [biopsyNumber, setBiopsyNumber] = useState<string>('');
    const [markerName, setMarkerName] = useState<string>('');

    const triggerPrint = (urlToPrint?: string) => {
        const url = urlToPrint || pdfUrl;

        if (!url) {
            return;
        }

        if (iframeRef.current) {
            iframeRef.current.src = url;
            iframeRef.current.onload = () => {
                try {
                    iframeRef.current?.contentWindow?.print();
                } catch {
                    window.open(url, '_blank');
                }
            };
        } else {
            window.open(url, '_blank');
        }
    };

    const handleDownload = () => {
        if (!pdfUrl) {
            return;
        }

        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `stickers-${selectedType}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleGenerate = async (typeOverride?: StickerType) => {
        const typeToUse =
            typeof typeOverride === 'string' ? typeOverride : selectedType;
        setStatus('generating');
        setProgress(15);
        setProgressLabel('Preparando datos para la impresora Zebra...');
        setErrorMessage('');

        try {
            const progressTimer = setInterval(() => {
                setProgress((prev) => {
                    if (prev < 80) {
                        return prev + 15;
                    }

                    return prev;
                });
            }, 300);

            let endpoint = '/stickers/specimens';
            let payload: Record<string, any> = {};

            const chosenLab = laboratories.find(
                (l) => String(l.id) === String(selectedLabId),
            );
            const labName = chosenLab?.name || undefined;

            if (typeToUse === 'casette') {
                endpoint = '/stickers/cuttings';

                if (previewCuttings.length > 0) {
                    payload = {
                        preview_data: previewCuttings.map((c) => ({
                            ...c,
                            laboratory_name: labName ?? c.laboratory_name,
                        })),
                        laboratory_name: labName,
                    };
                } else if (cuttingIds.length > 0) {
                    payload = {
                        cutting_ids: cuttingIds,
                        laboratory_name: labName,
                    };
                } else if (specimenIds.length > 0) {
                    payload = {
                        specimen_ids: specimenIds,
                        laboratory_name: labName,
                    };
                }
            } else {
                endpoint = '/stickers/specimens';

                const resolvedBiopsy = biopsyNumber.trim() || undefined;
                const resolvedMarker = markerName.trim() || undefined;
                const resolvedCutting =
                    selectedCuttingCode !== 'none'
                        ? selectedCuttingCode !== 'all'
                            ? selectedCuttingCode
                            : undefined
                        : undefined;

                if (previewSpecimens.length > 0) {
                    payload = {
                        preview_data: previewSpecimens.map((p) => ({
                            ...p,
                            laboratory_name: labName ?? p.laboratory_name,
                            biopsy_number: resolvedBiopsy ?? p.biopsy_number,
                            marker_name: resolvedMarker ?? p.marker_name,
                            cutting_code:
                                selectedCuttingCode !== 'none'
                                    ? selectedCuttingCode === 'all'
                                        ? p.cutting_code
                                        : selectedCuttingCode
                                    : undefined,
                        })),
                        type: 'muestra',
                        laboratory_name: labName,
                        biopsy_number: resolvedBiopsy,
                        marker_name: resolvedMarker,
                        cutting_code: resolvedCutting,
                    };
                } else {
                    payload = {
                        specimen_ids: specimenIds,
                        type: 'muestra',
                        laboratory_name: labName,
                        biopsy_number: resolvedBiopsy,
                        marker_name: resolvedMarker,
                        cutting_code: resolvedCutting,
                    };
                }
            }

            setProgress(45);
            setProgressLabel('Generando códigos QR y fuentes en Base64...');

            const csrfToken =
                (
                    document.querySelector(
                        'meta[name="csrf-token"]',
                    ) as HTMLMetaElement
                )?.content || '';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/pdf, application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(payload),
            });

            clearInterval(progressTimer);

            if (!response.ok) {
                const text = await response.text();
                let message = 'Error al generar los stickers en PDF.';

                try {
                    const parsed = JSON.parse(text);

                    if (parsed.message) {
                        message = parsed.message;
                    }
                } catch {
                    // Ignore json parse error
                }

                throw new Error(message);
            }

            setProgress(90);
            setProgressLabel('Procesando documento PDF final...');

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            setPdfUrl(blobUrl);

            setProgress(100);
            setProgressLabel('¡Stickers generados exitosamente!');
            setStatus('completed');

            setTimeout(() => {
                triggerPrint(blobUrl);
            }, 400);
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(
                err.message || 'Ocurrió un error inesperado al generar el PDF.',
            );
        }
    };

    // Fetch laboratories from server
    const fetchLaboratories = async (selectNewestId = false) => {
        setLabsLoading(true);

        try {
            const res = await fetch('/laboratories', {
                headers: { Accept: 'application/json' },
            });

            if (res.ok) {
                const json = await res.json();
                const list: LaboratoryItem[] = json.data || [];

                if (selectNewestId) {
                    // Identify the newly created lab by comparing with existing IDs
                    const prevIds = new Set(laboratories.map((l) => l.id));
                    const newlyCreated = list.find((l) => !prevIds.has(l.id));

                    if (newlyCreated) {
                        setSelectedLabId(String(newlyCreated.id));
                    } else {
                        const defaultLab = list.find((l) => l.is_default);

                        if (defaultLab) {
                            setSelectedLabId(String(defaultLab.id));
                        }
                    }
                } else {
                    // Set default lab if none selected
                    const defaultLab =
                        list.find((l) => l.is_default) || list[0];

                    if (defaultLab) {
                        setSelectedLabId(
                            (prev) => prev || String(defaultLab.id),
                        );
                    }
                }

                setLaboratories(list);
            }
        } catch {
            // Fallback graceful degradation
        } finally {
            setLabsLoading(false);
        }
    };

    // Fetch laboratories on open
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchLaboratories();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Sync type and state when opened
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedType(resolvedInitialType);
            setStatus('idle');
            setProgress(0);
            setErrorMessage('');

            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
            }

            // Populate initial editable values
            const initialBiopsy = previewSpecimens[0]?.biopsy_number ?? '';
            const initialMarker = previewSpecimens[0]?.marker_name ?? '';
            const initialCutting =
                previewSpecimens[0]?.cutting_code ??
                (cuttingsAvailable.length > 0 ? 'all' : 'none');

            setBiopsyNumber(initialBiopsy);
            setMarkerName(initialMarker);
            setSelectedCuttingCode(initialCutting);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, resolvedInitialType]);

    // Auto-start if requested
    useEffect(() => {
        if (!open) {
            hasAutoStartedRef.current = false;

            return;
        }

        if (autoStart && !hasAutoStartedRef.current) {
            hasAutoStartedRef.current = true;
            handleGenerate(resolvedInitialType);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, autoStart, resolvedInitialType]);

    // Clean up blob URL on unmount
    useEffect(() => {
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    const totalCount =
        selectedType === 'casette'
            ? previewCuttings.length ||
              cuttingIds.length ||
              (specimenIds.length ? `${specimenIds.length} muestras` : 0)
            : previewSpecimens.length || specimenIds.length;

    const chosenLab = laboratories.find(
        (l) => String(l.id) === String(selectedLabId),
    );
    const selectedLabName = chosenLab?.name || 'Laboratorio Patolab';

    const previewSequenceCode =
        previewSpecimens[0]?.sequence_code ||
        (specimenIds[0] ? `CX-${specimenIds[0]}-11-2026` : 'CX-2682-11-2026');

    const previewPatientName =
        previewSpecimens[0]?.customer_name ||
        previewCuttings[0]?.customer_name ||
        'Ana Carlota Reyes';

    const previewCuttingCode =
        selectedType === 'casette'
            ? previewCuttings[0]?.cutting_code || 'A'
            : selectedCuttingCode !== 'none'
              ? selectedCuttingCode === 'all'
                  ? previewSpecimens[0]?.cutting_code ||
                    (cuttingsAvailable[0]
                        ? typeof cuttingsAvailable[0].code === 'object' &&
                          cuttingsAvailable[0].code !== null
                            ? cuttingsAvailable[0].code.code
                            : String(
                                  cuttingsAvailable[0].code ||
                                      cuttingsAvailable[0].id,
                              )
                        : 'A')
                  : selectedCuttingCode
              : undefined;

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    className="z-[60] flex w-full flex-col sm:max-w-[620px]"
                    overlayClassName="z-[60]"
                >
                    <SheetHeader className="pb-2">
                        <div className="flex items-center gap-2 text-primary">
                            <Printer className="h-5 w-5" />
                            <SheetTitle className="text-lg">
                                {title || 'Impresión de Stickers (Zebra ZD620)'}
                            </SheetTitle>
                        </div>
                        <SheetDescription className="text-xs">
                            {description ||
                                'Generación de etiquetas térmicas con código QR, tipografía Arial Narrow y datos editables.'}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-2">
                        {/* Template Type Selector & Form Inputs */}
                        {status === 'idle' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">
                                        Tipo de Plantilla de Sticker
                                    </Label>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedType('muestra')
                                            }
                                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                                                selectedType === 'muestra' ||
                                                selectedType === 'frasco' ||
                                                selectedType === 'corte'
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                    : 'border-border hover:bg-muted/50'
                                            }`}
                                        >
                                            <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-foreground">
                                                        1. Sticker de Muestra
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px]"
                                                    >
                                                        0.94&quot; × 0.94&quot;
                                                    </Badge>
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                    Para frasco, lámina o corte.
                                                    Incluye QR, laboratorio,
                                                    biopsia, secuencia y
                                                    marcador.
                                                </p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedType('casette')
                                            }
                                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                                                selectedType === 'casette'
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                    : 'border-border hover:bg-muted/50'
                                            }`}
                                        >
                                            <Printer className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-foreground">
                                                        2. Stickers de Casette
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px]"
                                                    >
                                                        0.75&quot; × 0.20&quot;
                                                    </Badge>
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                    Micro-etiqueta horizontal:
                                                    Letra grande, laboratorio,
                                                    código y nombre.
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Live Previsualization of the Sticker */}
                                <StickerLivePreview
                                    type={selectedType}
                                    laboratoryName={selectedLabName}
                                    biopsyNumber={biopsyNumber}
                                    markerName={markerName}
                                    cuttingCode={previewCuttingCode}
                                    sequenceCode={previewSequenceCode}
                                    patientName={previewPatientName}
                                />

                                {/* Customizable Fields for Specimen Sticker */}
                                {(selectedType === 'muestra' ||
                                    selectedType === 'frasco' ||
                                    selectedType === 'corte') && (
                                    <div className="space-y-3 rounded-lg border bg-muted/20 p-3.5">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                            <Building2 className="h-3.5 w-3.5 text-primary" />
                                            <span>
                                                Datos del Sticker (0.94&quot; ×
                                                0.94&quot;)
                                            </span>
                                        </div>

                                        {/* Line 1: Laboratorio */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-medium text-muted-foreground">
                                                    1. Nombre de Laboratorio
                                                </Label>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        setIsAddLabOpen(true)
                                                    }
                                                    className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/10"
                                                >
                                                    <Plus className="mr-0.5 h-3 w-3" />
                                                    Nuevo
                                                </Button>
                                            </div>
                                            <Select
                                                value={selectedLabId}
                                                onValueChange={setSelectedLabId}
                                                disabled={labsLoading}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Seleccione laboratorio..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {laboratories.map((lab) => (
                                                        <SelectItem
                                                            key={lab.id}
                                                            value={String(
                                                                lab.id,
                                                            )}
                                                        >
                                                            {lab.name}{' '}
                                                            {lab.is_default &&
                                                                '(Predeterminado)'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Line 2: Número de la Biopsia */}
                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-medium text-muted-foreground">
                                                2. Número de la Biopsia
                                                (Editable)
                                            </Label>
                                            <Input
                                                value={biopsyNumber}
                                                onChange={(e) =>
                                                    setBiopsyNumber(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="ej. BX-2026-0045"
                                                className="h-8 text-xs"
                                            />
                                        </div>

                                        {/* Line 4: Nombre del Marcador */}
                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-medium text-muted-foreground">
                                                4. Nombre del Marcador
                                                (Editable)
                                            </Label>
                                            <Input
                                                value={markerName}
                                                onChange={(e) =>
                                                    setMarkerName(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="ej. HER2, CK7, Ki-67 (opcional)"
                                                className="h-8 text-xs"
                                            />
                                        </div>

                                        {/* Cutting letter selector if cuttings available */}
                                        {cuttingsAvailable.length > 0 && (
                                            <div className="space-y-1 pt-1">
                                                <Label className="text-[11px] font-medium text-muted-foreground">
                                                    Letra de Corte (Esquina
                                                    Superior)
                                                </Label>
                                                <Select
                                                    value={selectedCuttingCode}
                                                    onValueChange={
                                                        setSelectedCuttingCode
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Seleccione corte..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            Sin letra de corte
                                                        </SelectItem>
                                                        <SelectItem value="all">
                                                            Primer corte
                                                            disponible
                                                        </SelectItem>
                                                        {cuttingsAvailable.map(
                                                            (c) => {
                                                                const codeLetter =
                                                                    typeof c.code ===
                                                                        'object' &&
                                                                    c.code !==
                                                                        null
                                                                        ? c.code
                                                                              .code
                                                                        : String(
                                                                              c.code ||
                                                                                  c.id,
                                                                          );

                                                                return (
                                                                    <SelectItem
                                                                        key={
                                                                            c.id
                                                                        }
                                                                        value={
                                                                            codeLetter
                                                                        }
                                                                    >
                                                                        Corte{' '}
                                                                        {
                                                                            codeLetter
                                                                        }{' '}
                                                                        (ID #
                                                                        {c.id})
                                                                    </SelectItem>
                                                                );
                                                            },
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedType === 'casette' && (
                                    <div className="space-y-3 rounded-lg border bg-muted/20 p-3.5">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                            <Building2 className="h-3.5 w-3.5 text-primary" />
                                            <span>
                                                Datos del Sticker de Casette
                                                (0.75&quot; × 0.20&quot;)
                                            </span>
                                        </div>

                                        {/* Line 1: Laboratorio */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-medium text-muted-foreground">
                                                    Nombre de Laboratorio
                                                </Label>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        setIsAddLabOpen(true)
                                                    }
                                                    className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/10"
                                                >
                                                    <Plus className="mr-0.5 h-3 w-3" />
                                                    Nuevo
                                                </Button>
                                            </div>
                                            <Select
                                                value={selectedLabId}
                                                onValueChange={setSelectedLabId}
                                                disabled={labsLoading}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Seleccione laboratorio..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {laboratories.map((lab) => (
                                                        <SelectItem
                                                            key={lab.id}
                                                            value={String(
                                                                lab.id,
                                                            )}
                                                        >
                                                            {lab.name}{' '}
                                                            {lab.is_default &&
                                                                '(Predeterminado)'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {/* Target count summary */}
                                <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-xs">
                                    <span className="text-muted-foreground">
                                        Cantidad de elementos:
                                    </span>
                                    <span className="font-mono font-bold text-foreground">
                                        {totalCount || 1}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Generating State */}
                        {status === 'generating' && (
                            <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
                                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-foreground">
                                        Generando Stickers en PDF
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {progressLabel}
                                    </p>
                                </div>

                                <div className="w-full space-y-1 pt-2">
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>Zebra ZD620</span>
                                        <span>{progress}%</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Completed State */}
                        {status === 'completed' && (
                            <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                                    <CheckCircle2 className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-foreground">
                                        ¡Documento Listo!
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        El PDF ha sido formateado a la medida
                                        exacta para la impresora Zebra.
                                    </p>
                                </div>

                                <div className="grid w-full grid-cols-2 gap-2 pt-2">
                                    <Button
                                        type="button"
                                        onClick={() => triggerPrint()}
                                        className="h-9 gap-1.5 text-xs font-semibold"
                                    >
                                        <Printer className="h-3.5 w-3.5" />{' '}
                                        Imprimir
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleDownload}
                                        className="h-9 gap-1.5 text-xs font-semibold"
                                    >
                                        <Download className="h-3.5 w-3.5" />{' '}
                                        Descargar PDF
                                    </Button>
                                </div>

                                {pdfUrl && (
                                    <a
                                        href={pdfUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                                    >
                                        <ExternalLink className="h-3 w-3" />{' '}
                                        Abrir PDF en pestaña nueva
                                    </a>
                                )}

                                {/* Instructions for printer preset selection */}
                                <div className="w-full space-y-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 text-left dark:border-amber-500/20">
                                    <div className="flex items-start gap-2">
                                        <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-semibold text-foreground">
                                                Selección del Tamaño de Papel
                                                (Preset Zebra)
                                            </p>
                                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                                En el cuadro de diálogo de
                                                impresión, asegúrese de
                                                seleccionar el preset
                                                correspondiente a esta
                                                plantilla:
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/20 bg-background/80 px-3 py-2 text-xs">
                                        <span className="font-semibold text-foreground">
                                            {selectedType === 'casette'
                                                ? 'Micro-etiqueta Casette:'
                                                : 'Sticker de Muestra:'}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="font-mono text-[11px] font-bold text-foreground"
                                        >
                                            {selectedType === 'casette'
                                                ? '0.75" × 0.20"'
                                                : '0.94" × 0.94"'}
                                        </Badge>
                                        <span className="text-[11px] text-muted-foreground">
                                            /
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className="font-mono text-[11px] font-semibold"
                                        >
                                            {selectedType === 'casette'
                                                ? '19.0 × 5.1 mm'
                                                : '23.8 × 23.8 mm'}
                                        </Badge>
                                    </div>

                                    <div className="space-y-1 rounded-md bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                                        <p className="flex items-center gap-1.5 font-medium text-foreground">
                                            <Info className="h-3.5 w-3.5 shrink-0 text-primary" />
                                            ¿No encuentra este preset en su
                                            lista de tamaños?
                                        </p>
                                        <p>
                                            Si aún no existe un preset
                                            configurado con estas medidas en su
                                            equipo, debe crear uno nuevo desde
                                            la opción{' '}
                                            <strong>
                                                &quot;Administrar tamaños
                                                personalizados&quot;
                                            </strong>{' '}
                                            en la ventana de impresión (o en las
                                            Preferencias del controlador Zebra),
                                            ingresando el tamaño en pulgadas o
                                            milímetros con{' '}
                                            <strong>márgenes en 0</strong> y{' '}
                                            <strong>escala al 100%</strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error State */}
                        {status === 'error' && (
                            <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                    <AlertCircle className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-destructive">
                                        Error en la Generación
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {errorMessage}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleGenerate(selectedType)}
                                    className="h-8 gap-1.5 text-xs"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />{' '}
                                    Reintentar
                                </Button>
                            </div>
                        )}
                    </div>

                    <SheetFooter className="border-t pt-3">
                        {status === 'idle' ? (
                            <div className="flex w-full gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    className="flex-1 text-xs"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleGenerate(selectedType)}
                                    className="flex-1 gap-1.5 text-xs font-semibold"
                                >
                                    <Printer className="h-3.5 w-3.5" /> Generar
                                    e Imprimir
                                </Button>
                            </div>
                        ) : (
                            <div className="flex w-full gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setStatus('idle');
                                    }}
                                    className="flex-1 text-xs"
                                >
                                    Modificar Datos
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => onOpenChange(false)}
                                    className="flex-1 text-xs"
                                >
                                    Cerrar
                                </Button>
                            </div>
                        )}
                    </SheetFooter>

                    {/* Hidden iframe for silent printing */}
                    <iframe
                        ref={iframeRef}
                        className="hidden"
                        title="Zebra Sticker Print Frame"
                    />
                </SheetContent>
            </Sheet>

            {/* Stacked Sheet to Add New Laboratory */}
            <LaboratorySheet
                open={isAddLabOpen}
                onOpenChange={setIsAddLabOpen}
                className="z-[70] sm:max-w-[480px]"
                overlayClassName="z-[70] bg-black/40"
                onSuccess={() => {
                    fetchLaboratories(true);
                }}
            />
        </>
    );
}
