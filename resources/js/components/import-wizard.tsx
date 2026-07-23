import { router } from '@inertiajs/react';
import {
    Upload,
    Play,
    Pause,
    X,
    Check,
    ChevronRight,
    ChevronLeft,
    FileSpreadsheet,
    AlertTriangle,
    Download,
    Loader2,
    CheckCircle2,
    XCircle,
    Info,
} from 'lucide-react';
import React, {
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
} from 'react';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface FieldConfig {
    name: string;
    label: string;
    required: boolean;
    type?: 'string' | 'number' | 'select';
    options?: { value: string; label: string }[];
}

interface ImportWizardProps {
    title: string;
    description: string;
    fields: FieldConfig[];
    parseUrl: string;
    importRowUrl: string;
    redirectUrl: string;
}

interface ParsedData {
    headers: string[];
    rows: any[][];
}

interface ImportLog {
    row: number;
    data: Record<string, any>;
    status: 'success' | 'error';
    message: string;
}

export function ImportWizard({
    title,
    description,
    fields,
    parseUrl,
    importRowUrl,
    redirectUrl,
}: ImportWizardProps) {
    // Unique storage key per import type (avoids conflicts between wizards)
    const storageKey = `import_wizard_state_${importRowUrl.replace(/\//g, '_')}`;

    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    // File upload states
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string | null>(null); // used for display on restore
    const [isParsing, setIsParsing] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [dragActive, setDragActive] = useState(false);

    // Mapping states
    const [mapping, setMapping] = useState<Record<string, string>>({});

    // Import loop states
    const [isImporting, setIsImporting] = useState(false);
    const [paused, setPaused] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [successCount, setSuccessCount] = useState(0);
    const [errorCount, setErrorCount] = useState(0);
    const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
    const [filterStatus, setFilterStatus] = useState<
        'all' | 'success' | 'error'
    >('all');

    // AlertDialog state: confirm before resetting when there is progress
    const [showResetDialog, setShowResetDialog] = useState(false);
    // AlertDialog state: confirm before cancelling an in-progress import
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    // Import loop refs to allow async updates without hook violations
    const isImportingRef = useRef(false);
    const pausedRef = useRef(false);
    const cancelledRef = useRef(false);
    const currentIndexRef = useRef(0);

    // Keep refs in sync with state changes
    useEffect(() => {
        isImportingRef.current = isImporting;
    }, [isImporting]);

    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);

    useEffect(() => {
        cancelledRef.current = cancelled;
    }, [cancelled]);

    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    // ── Local Storage: restore state on mount ──────────────────────────────────
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);

            if (!raw) {
                return;
            }

            const saved = JSON.parse(raw) as {
                step: 1 | 2 | 3 | 4;
                parsedData: ParsedData;
                mapping: Record<string, string>;
                fileName: string | null;
                currentIndex: number;
                successCount: number;
                errorCount: number;
                importLogs: ImportLog[];
            };

            // Do not restore step 4 (finished) — let user start fresh
            if (!saved.step || saved.step === 4) {
                localStorage.removeItem(storageKey);

                return;
            }

            setParsedData(saved.parsedData ?? null);
            setMapping(saved.mapping ?? {});
            setFileName(saved.fileName ?? null);
            setCurrentIndex(saved.currentIndex ?? 0);
            setSuccessCount(saved.successCount ?? 0);
            setErrorCount(saved.errorCount ?? 0);
            setImportLogs(saved.importLogs ?? []);

            // If restored mid-import (step 3), put it in paused state so the
            // user explicitly decides to resume — never auto-fire network requests.
            if (saved.step === 3) {
                setIsImporting(true);
                setPaused(true);
                pausedRef.current = true;
                isImportingRef.current = true;
                currentIndexRef.current = saved.currentIndex ?? 0;
            }

            setStep(saved.step);
        } catch {
            localStorage.removeItem(storageKey);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Local Storage: persist state on every relevant change ─────────────────
    useEffect(() => {
        // Never persist step 1 (no useful data yet) or step 4 (finished)
        if (step === 1 || step === 4) {
            return;
        }

        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    step,
                    parsedData,
                    mapping,
                    fileName,
                    currentIndex,
                    successCount,
                    errorCount,
                    importLogs,
                }),
            );
        } catch {
            // Storage quota or private-mode — silently ignore
        }
    }, [
        step,
        parsedData,
        mapping,
        fileName,
        currentIndex,
        successCount,
        errorCount,
        importLogs,
        storageKey,
    ]);

    // ── Clear storage on finish / cancel / redirect ────────────────────────────
    const clearStorage = useCallback(() => {
        localStorage.removeItem(storageKey);
    }, [storageKey]);

    // Reset wizard (called after user confirms the AlertDialog, or directly if
    // there is nothing to lose, i.e. no parsedData)
    const doResetWizard = useCallback(() => {
        clearStorage();
        setStep(1);
        setFile(null);
        setFileName(null);
        setParsedData(null);
        setMapping({});
        setIsImporting(false);
        setPaused(false);
        setCancelled(false);
        setCurrentIndex(0);
        setSuccessCount(0);
        setErrorCount(0);
        setImportLogs([]);

        isImportingRef.current = false;
        pausedRef.current = false;
        cancelledRef.current = false;
        currentIndexRef.current = 0;
    }, [clearStorage]);

    // Guard: if there is any progress, show the confirmation dialog first
    const resetWizard = useCallback(() => {
        if (parsedData) {
            setShowResetDialog(true);
        } else {
            doResetWizard();
        }
    }, [parsedData, doResetWizard]);

    // File Drag & Drop Handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            const fileExtension = droppedFile.name
                .split('.')
                .pop()
                ?.toLowerCase();

            if (['csv', 'xlsx', 'xls', 'ods'].includes(fileExtension || '')) {
                setFile(droppedFile);
                setFileName(droppedFile.name);
                parseFile(droppedFile);
            } else {
                toast.error(
                    'Formato de archivo no válido. Use CSV, XLSX, XLS o ODS.',
                );
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setFileName(selectedFile.name);
            parseFile(selectedFile);
        }
    };

    // Upload & Parse File
    const parseFile = async (fileToParse: File) => {
        setIsParsing(true);
        const formData = new FormData();
        formData.append('file', fileToParse);

        const csrfToken = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');

        try {
            const response = await fetch(parseUrl, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken || '',
                    Accept: 'application/json',
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setParsedData(data);
                autoMap(data.headers);
                setStep(2);
                toast.success('Archivo cargado y procesado correctamente');
            } else {
                const errorMsg =
                    data.error ||
                    'Error al procesar el archivo. Verifique el formato.';
                toast.error(errorMsg);
                setFile(null);
            }
        } catch (error: any) {
            console.error(error);
            toast.error('Error al procesar el archivo. Verifique el formato.');
            setFile(null);
        } finally {
            setIsParsing(false);
        }
    };

    // Auto-map headers to fields based on similar names/labels
    const autoMap = (headers: string[]) => {
        const newMapping: Record<string, string> = {};
        fields.forEach((field) => {
            const labelLower = field.label.toLowerCase();
            const nameLower = field.name.toLowerCase();

            const matchIdx = headers.findIndex((header) => {
                const h = header.trim().toLowerCase();

                return (
                    h === labelLower ||
                    h === nameLower ||
                    h.replace(/\s/g, '_') === nameLower ||
                    h.includes(labelLower) ||
                    labelLower.includes(h)
                );
            });

            if (matchIdx !== -1) {
                newMapping[field.name] = String(matchIdx);
            }
        });
        setMapping(newMapping);
    };

    // Check if required fields are missing mapping
    const missingRequiredFields = useMemo(() => {
        return fields.filter(
            (field) =>
                field.required &&
                !mapping[field.name] &&
                mapping[field.name] !== '0',
        );
    }, [fields, mapping]);

    const hasMissingRequired = missingRequiredFields.length > 0;

    // Handle mapping change
    const handleMapChange = (fieldName: string, colIndexValue: string) => {
        setMapping((prev) => ({
            ...prev,
            [fieldName]: colIndexValue === 'unmapped' ? '' : colIndexValue,
        }));
    };

    // Live preview of mapped data (first 3 rows)
    const previewData = useMemo(() => {
        if (!parsedData || !parsedData.rows) {
            return [];
        }

        return parsedData.rows.slice(0, 3).map((row) => {
            const mappedRow: Record<string, any> = {};
            fields.forEach((field) => {
                const colIdx = mapping[field.name];

                if (colIdx !== undefined && colIdx !== '') {
                    mappedRow[field.name] = row[Number(colIdx)];
                } else {
                    mappedRow[field.name] = '-';
                }
            });

            return mappedRow;
        });
    }, [parsedData, mapping, fields]);

    // Start Importing
    const startImport = () => {
        if (hasMissingRequired) {
            toast.error(
                'Por favor, mapée todos los campos requeridos antes de continuar.',
            );

            return;
        }

        setStep(3);
        setIsImporting(true);
        setPaused(false);
        setCancelled(false);
        setCurrentIndex(0);
        setSuccessCount(0);
        setErrorCount(0);
        setImportLogs([]);

        isImportingRef.current = true;
        pausedRef.current = false;
        cancelledRef.current = false;
        currentIndexRef.current = 0;

        setTimeout(() => {
            processNextRow(0);
        }, 100);
    };

    const processNextRow = async (index: number) => {
        if (cancelledRef.current || !parsedData) {
            setIsImporting(false);
            clearStorage();
            setStep(4);

            return;
        }

        if (index >= parsedData.rows.length) {
            setIsImporting(false);
            clearStorage();
            setStep(4);
            toast.success('Importación finalizada');

            return;
        }

        if (pausedRef.current) {
            return;
        }

        const rowData = parsedData.rows[index];
        const payload: Record<string, any> = {};
        fields.forEach((field) => {
            const colIdx = mapping[field.name];

            if (colIdx !== undefined && colIdx !== '') {
                payload[field.name] = rowData[Number(colIdx)];
            } else {
                payload[field.name] = null;
            }
        });

        const csrfToken = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');

        try {
            const response = await fetch(importRowUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccessCount((prev) => prev + 1);
                setImportLogs((prev) => [
                    {
                        row: index + 1,
                        data: payload,
                        status: 'success',
                        message: 'Importado correctamente',
                    },
                    ...prev,
                ]);
            } else {
                setErrorCount((prev) => prev + 1);
                let errorMsg = data.error || 'Error al guardar la fila.';

                if (data.errors) {
                    errorMsg = Object.entries(data.errors)
                        .map(
                            ([key, val]) =>
                                `${key}: ${Array.isArray(val) ? val.join(', ') : val}`,
                        )
                        .join(' | ');
                }

                setImportLogs((prev) => [
                    {
                        row: index + 1,
                        data: payload,
                        status: 'error',
                        message: errorMsg,
                    },
                    ...prev,
                ]);
            }
        } catch (error: any) {
            setErrorCount((prev) => prev + 1);
            const errorMsg = error.message || 'Error al enviar la fila.';

            setImportLogs((prev) => [
                {
                    row: index + 1,
                    data: payload,
                    status: 'error',
                    message: errorMsg,
                },
                ...prev,
            ]);
        }

        const nextIdx = index + 1;
        setCurrentIndex(nextIdx);
        currentIndexRef.current = nextIdx;

        setTimeout(() => {
            processNextRow(nextIdx);
        }, 100);
    };

    const handlePause = () => {
        setPaused(true);
        pausedRef.current = true;
    };

    const handleResume = () => {
        setPaused(false);
        pausedRef.current = false;
        setTimeout(() => {
            processNextRow(currentIndexRef.current);
        }, 100);
    };

    const handleCancel = () => {
        setCancelled(true);
        cancelledRef.current = true;
        setIsImporting(false);
        clearStorage();
        setStep(4);
    };

    // Download log of errors as CSV
    const downloadErrorLog = () => {
        const errorLogs = importLogs.filter((log) => log.status === 'error');

        if (errorLogs.length === 0) {
            return;
        }

        // CSV Header
        const csvHeaders = [
            'Fila en Archivo',
            'Mensaje de Error',
            ...fields.map((f) => f.label),
        ];
        const csvRows = errorLogs.map((log) => [
            log.row,
            log.message,
            ...fields.map((f) => log.data[f.name] || ''),
        ]);

        const csvContent =
            'data:text/csv;charset=utf-8,\uFEFF' +
            [
                csvHeaders.join(','),
                ...csvRows.map((e) =>
                    e
                        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
                        .join(','),
                ),
            ].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute(
            'download',
            `errores_importacion_${new Date().toISOString().slice(0, 10)}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filter logs by selected status
    const filteredLogs = useMemo(() => {
        return importLogs.filter((log) => {
            if (filterStatus === 'all') {
                return true;
            }

            return log.status === filterStatus;
        });
    }, [importLogs, filterStatus]);

    const progressPercentage =
        parsedData && parsedData.rows.length > 0
            ? Math.round((currentIndex / parsedData.rows.length) * 100)
            : 0;

    // ── Page title: show import % during step 3, completado on step 4 ──────────
    // Capture original title once on mount so re-renders don't overwrite it.
    const originalTitleRef = useRef(
        typeof document !== 'undefined' ? document.title : '',
    );

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        if (step === 3) {
            const status = paused ? '⏸ Pausado' : '⏳ Importando';
            document.title = `${progressPercentage}% — ${status} | ${title}`;
        } else if (step === 4) {
            document.title = `✅ Completado | ${title}`;
        } else {
            document.title = originalTitleRef.current;
        }
    }, [step, progressPercentage, paused, title]);

    // Restore on unmount (e.g. user navigates away mid-import)
    useEffect(() => {
        return () => {
            document.title = originalTitleRef.current;
        };
    }, []);

    return (
        <>
            <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-1 border-b pb-4">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {title}
                    </h1>
                    <p className="text-muted-foreground">{description}</p>
                </div>

                {/* Stepper Indicator */}
                <div className="flex items-center justify-between rounded-xl border bg-muted/40 p-4">
                    {[
                        { number: 1, label: 'Subir archivo' },
                        { number: 2, label: 'Mapear columnas' },
                        { number: 3, label: 'Importando' },
                        { number: 4, label: 'Resultado' },
                    ].map((s) => (
                        <div key={s.number} className="flex items-center gap-2">
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                    step === s.number
                                        ? 'scale-110 bg-primary text-primary-foreground shadow'
                                        : step > s.number
                                          ? 'bg-green-600 text-white'
                                          : 'border bg-muted text-muted-foreground'
                                }`}
                            >
                                {step > s.number ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    s.number
                                )}
                            </div>
                            <span
                                className={`hidden text-xs font-medium sm:inline ${step === s.number ? 'font-bold text-primary' : 'text-muted-foreground'}`}
                            >
                                {s.label}
                            </span>
                            {s.number < 4 && (
                                <ChevronRight className="hidden h-4 w-4 text-muted-foreground/50 sm:block" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step 1: Upload File */}
                {step === 1 && (
                    <div
                        className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-12 transition-all"
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            id="import-file-input"
                            className="hidden"
                            accept=".csv,.xlsx,.xls,.ods"
                            onChange={handleFileSelect}
                            disabled={isParsing}
                        />

                        {isParsing ? (
                            <div className="flex flex-col items-center gap-4 text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                <h3 className="text-lg font-semibold">
                                    Procesando archivo...
                                </h3>
                                <p className="max-w-sm text-sm text-muted-foreground">
                                    Leyendo filas y columnas de su documento de
                                    Excel/CSV. Esto puede tardar unos segundos.
                                </p>
                            </div>
                        ) : (
                            <label
                                htmlFor="import-file-input"
                                className={`flex w-full max-w-md cursor-pointer flex-col items-center gap-4 rounded-lg border p-6 text-center transition-all ${
                                    dragActive
                                        ? 'scale-105 border-primary bg-primary/5'
                                        : 'border-transparent hover:bg-muted/30'
                                }`}
                            >
                                <div className="rounded-full bg-primary/10 p-4 text-primary">
                                    <Upload className="h-8 w-8 animate-bounce" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        Arrastre su archivo aquí
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        O haga clic para buscar en su equipo
                                        (.csv, .xlsx, .xls, .ods)
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="pointer-events-none mt-2"
                                >
                                    Seleccionar Archivo
                                </Button>
                            </label>
                        )}
                    </div>
                )}

                {/* Step 2: Mapping columns */}
                {step === 2 && parsedData && (
                    <div className="flex flex-col gap-6">
                        {/* Required Columns Alert */}
                        {hasMissingRequired ? (
                            <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <div>
                                    <span className="font-bold">
                                        Se requieren más columnas en su archivo:
                                    </span>
                                    <p className="mt-1">
                                        Mapee los siguientes campos obligatorios
                                        para poder iniciar la importación:{' '}
                                        <span className="font-semibold">
                                            {missingRequiredFields
                                                .map((f) => f.label)
                                                .join(', ')}
                                        </span>
                                        .
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-5 w-5 shrink-0" />
                                <div>
                                    <span className="font-bold">
                                        Mapeo completado
                                    </span>
                                    <p className="mt-1">
                                        Todos los campos requeridos han sido
                                        asignados correctamente a columnas del
                                        archivo.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            {/* Mapping List */}
                            <div className="space-y-4 rounded-xl border bg-card p-6 lg:col-span-2">
                                <h3 className="border-b pb-2 text-lg font-semibold">
                                    Asociar Campos del Sistema
                                </h3>

                                <div className="max-h-[400px] space-y-4 overflow-y-auto pr-2">
                                    {fields.map((field) => (
                                        <div
                                            key={field.name}
                                            className="flex flex-col justify-between gap-4 border-b py-2 last:border-0 sm:flex-row sm:items-center"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Label className="text-sm font-medium">
                                                    {field.label}
                                                </Label>
                                                {field.required && (
                                                    <Badge
                                                        variant="destructive"
                                                        className="px-1.5 py-0 text-[10px]"
                                                    >
                                                        Requerido
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="w-full sm:w-[300px]">
                                                <Select
                                                    value={
                                                        mapping[field.name] ||
                                                        'unmapped'
                                                    }
                                                    onValueChange={(val) =>
                                                        handleMapChange(
                                                            field.name,
                                                            val,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="No importar este campo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem
                                                            value="unmapped"
                                                            className="text-muted-foreground italic"
                                                        >
                                                            No importar este
                                                            campo
                                                        </SelectItem>
                                                        {parsedData.headers.map(
                                                            (header, idx) => (
                                                                <SelectItem
                                                                    key={idx}
                                                                    value={String(
                                                                        idx,
                                                                    )}
                                                                >
                                                                    Columna:{' '}
                                                                    {header ||
                                                                        `Columna ${idx + 1}`}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* File Details & Preview */}
                            <div className="space-y-6">
                                {/* File Info */}
                                <div className="flex items-center gap-4 rounded-xl border bg-card p-6">
                                    <div className="rounded-lg bg-primary/10 p-3 text-primary">
                                        <FileSpreadsheet className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="max-w-[200px] truncate font-medium">
                                            {file?.name ??
                                                fileName ??
                                                'Archivo cargado'}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            {parsedData.rows.length} filas
                                            encontradas
                                        </p>
                                    </div>
                                </div>

                                {/* Live preview of mapping */}
                                <div className="space-y-3 rounded-xl border bg-card p-6">
                                    <h4 className="text-sm font-semibold">
                                        Vista Previa de Mapeo (Primeras Filas)
                                    </h4>
                                    <div className="max-h-[220px] overflow-x-auto rounded-lg border">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    {fields
                                                        .slice(0, 3)
                                                        .map((f) => (
                                                            <TableHead
                                                                key={f.name}
                                                                className="px-3 py-2 text-xs"
                                                            >
                                                                {f.label}
                                                            </TableHead>
                                                        ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {previewData.map((row, idx) => (
                                                    <TableRow key={idx}>
                                                        {fields
                                                            .slice(0, 3)
                                                            .map((f) => (
                                                                <TableCell
                                                                    key={f.name}
                                                                    className="max-w-[120px] truncate px-3 py-2 text-xs"
                                                                >
                                                                    {String(
                                                                        row[
                                                                            f
                                                                                .name
                                                                        ],
                                                                    )}
                                                                </TableCell>
                                                            ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <span className="block text-center text-[11px] text-muted-foreground">
                                        Mostrando las primeras 3 filas con el
                                        mapeo actual.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between border-t pt-4">
                            <Button variant="outline" onClick={resetWizard}>
                                <ChevronLeft className="mr-2 h-4 w-4" /> Cambiar
                                Archivo
                            </Button>

                            <Button
                                onClick={startImport}
                                disabled={hasMissingRequired}
                                className="bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
                            >
                                Iniciar Importación{' '}
                                <Play className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Importing Progress */}
                {step === 3 && parsedData && (
                    <div className="flex flex-col gap-6 rounded-xl border bg-card p-6">
                        {/* Restored-from-storage banner */}
                        {paused && currentIndex > 0 && (
                            <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                                <Info className="h-4 w-4 shrink-0" />
                                <span>
                                    Se restauró el progreso anterior (
                                    {currentIndex} de {parsedData.rows.length}{' '}
                                    filas procesadas). Haga clic en{' '}
                                    <strong>Reanudar</strong> para continuar.
                                </span>
                            </div>
                        )}
                        {/* Status metrics grid */}
                        <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                            <div className="rounded-lg border bg-muted/40 p-4">
                                <span className="block text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Total Filas
                                </span>
                                <span className="text-2xl font-bold">
                                    {parsedData.rows.length}
                                </span>
                            </div>
                            <div className="rounded-lg border bg-muted/40 p-4">
                                <span className="block text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Procesados
                                </span>
                                <span className="text-2xl font-bold">
                                    {currentIndex}
                                </span>
                            </div>
                            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                                <span className="block text-xs font-bold tracking-wider text-green-600 uppercase">
                                    Exitosos
                                </span>
                                <span className="text-2xl font-bold text-green-600">
                                    {successCount}
                                </span>
                            </div>
                            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                                <span className="block text-xs font-bold tracking-wider text-destructive uppercase">
                                    Errores
                                </span>
                                <span className="text-2xl font-bold text-destructive">
                                    {errorCount}
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-semibold">
                                <span>Importando datos...</span>
                                <span>
                                    {progressPercentage}% ({currentIndex} de{' '}
                                    {parsedData.rows.length})
                                </span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full border bg-muted">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>

                        {/* Progress Control Actions */}
                        <div className="flex justify-center gap-3">
                            {isImporting ? (
                                <>
                                    {paused ? (
                                        <Button
                                            onClick={handleResume}
                                            className="bg-green-600 text-white hover:bg-green-700"
                                        >
                                            <Play className="mr-2 h-4 w-4" />{' '}
                                            Reanudar
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            onClick={handlePause}
                                        >
                                            <Pause className="mr-2 h-4 w-4" />{' '}
                                            Pausar
                                        </Button>
                                    )}
                                    <Button
                                        variant="destructive"
                                        onClick={() =>
                                            setShowCancelDialog(true)
                                        }
                                    >
                                        <X className="mr-2 h-4 w-4" /> Cancelar
                                    </Button>
                                </>
                            ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    Finalizando la importación...
                                </div>
                            )}
                        </div>

                        {/* Log Filter tabs & Logs */}
                        <div className="space-y-3 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">
                                    Historial de Importación
                                </h4>
                                <div className="flex overflow-hidden rounded-lg border text-xs">
                                    <button
                                        onClick={() => setFilterStatus('all')}
                                        className={`px-3 py-1.5 font-medium transition-colors ${filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                                    >
                                        Todos ({importLogs.length})
                                    </button>
                                    <button
                                        onClick={() =>
                                            setFilterStatus('success')
                                        }
                                        className={`border-l px-3 py-1.5 font-medium transition-colors ${filterStatus === 'success' ? 'bg-green-600 text-white' : 'hover:bg-muted'}`}
                                    >
                                        Éxito ({successCount})
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus('error')}
                                        className={`border-l px-3 py-1.5 font-medium transition-colors ${filterStatus === 'error' ? 'bg-destructive text-white' : 'hover:bg-muted'}`}
                                    >
                                        Errores ({errorCount})
                                    </button>
                                </div>
                            </div>

                            {/* Logs Console Box */}
                            <div className="h-[250px] space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-4 font-mono text-xs">
                                {filteredLogs.length === 0 ? (
                                    <div className="py-8 text-center text-muted-foreground italic">
                                        No hay registros para mostrar.
                                    </div>
                                ) : (
                                    filteredLogs.map((log, index) => (
                                        <div
                                            key={index}
                                            className={`flex items-start gap-2 border-b border-border/50 py-1.5 last:border-0 ${
                                                log.status === 'success'
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-destructive'
                                            }`}
                                        >
                                            {log.status === 'success' ? (
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                            ) : (
                                                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <span className="font-bold">
                                                    Fila {log.row}:
                                                </span>{' '}
                                                <span className="font-semibold">
                                                    {log.data[fields[0].name] ||
                                                        'Sin Nombre'}
                                                </span>
                                                <span className="mx-2 text-muted-foreground">
                                                    |
                                                </span>
                                                <span>{log.message}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Finish Results Summary */}
                {step === 4 && parsedData && (
                    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-xl border bg-card p-8 text-center shadow-md">
                        {errorCount === 0 && !cancelled ? (
                            <div className="rounded-full bg-green-500/10 p-4 text-green-600">
                                <CheckCircle2 className="h-16 w-16" />
                            </div>
                        ) : (
                            <div className="rounded-full bg-blue-500/10 p-4 text-blue-600">
                                <Info className="h-16 w-16" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">
                                {cancelled
                                    ? 'Importación Cancelada'
                                    : errorCount === 0
                                      ? '¡Importación Exitosa!'
                                      : 'Importación Finalizada con Advertencias'}
                            </h2>
                            <p className="max-w-md text-sm text-muted-foreground">
                                {cancelled
                                    ? 'El proceso se detuvo manualmente por el usuario. Las filas ya enviadas se guardaron.'
                                    : errorCount === 0
                                      ? `Se han importado todas las ${successCount} filas sin ningún error.`
                                      : `Se procesó el archivo. Se importaron correctamente ${successCount} filas, y se encontraron ${errorCount} errores.`}
                            </p>
                        </div>

                        {/* Summary metrics panel */}
                        <div className="my-2 grid w-full max-w-sm grid-cols-3 gap-6 border-t border-b py-4">
                            <div>
                                <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                    Registrados
                                </span>
                                <span className="text-xl font-bold text-green-600">
                                    {successCount}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                    Errores
                                </span>
                                <span className="text-xl font-bold text-destructive">
                                    {errorCount}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                    Total Filas
                                </span>
                                <span className="text-xl font-bold">
                                    {parsedData.rows.length}
                                </span>
                            </div>
                        </div>

                        {/* Call to Actions */}
                        <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">
                            {errorCount > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={downloadErrorLog}
                                    className="w-full sm:w-auto"
                                >
                                    <Download className="mr-2 h-4 w-4" />{' '}
                                    Descargar Registro de Errores
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => {
                                    clearStorage();
                                    router.visit(redirectUrl);
                                }}
                                className="w-full sm:w-auto"
                            >
                                Ir a la Lista
                            </Button>
                            <Button
                                onClick={() => window.close()}
                                className="w-full bg-primary px-8 text-primary-foreground sm:w-auto"
                            >
                                Cerrar Pestaña
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Alert Dialog: confirm file change when progress exists */}
            <AlertDialog
                open={showResetDialog}
                onOpenChange={setShowResetDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Cambiar archivo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tiene progreso guardado en este asistente de
                            importación
                            {currentIndex > 0 && (
                                <>
                                    {' '}
                                    ({currentIndex} de{' '}
                                    {parsedData?.rows.length ?? 0} filas
                                    procesadas)
                                </>
                            )}
                            . Si cambia el archivo,{' '}
                            <strong>
                                perderá todo el progreso y el mapeo de columnas
                            </strong>
                            . Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setShowResetDialog(false)}
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => {
                                setShowResetDialog(false);
                                doResetWizard();
                            }}
                        >
                            Sí, cambiar archivo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Alert Dialog: confirm cancel mid-import */}
            <AlertDialog
                open={showCancelDialog}
                onOpenChange={setShowCancelDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Cancelar importación?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {parsedData &&
                                currentIndex < parsedData.rows.length && (
                                    <>
                                        Quedan{' '}
                                        <strong>
                                            {parsedData.rows.length -
                                                currentIndex}{' '}
                                            filas
                                        </strong>{' '}
                                        por procesar. Si cancela ahora,{' '}
                                        <strong>
                                            esas filas no serán importadas
                                        </strong>
                                        . Las filas ya procesadas (
                                        {currentIndex}) se mantienen guardadas.
                                    </>
                                )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setShowCancelDialog(false)}
                        >
                            Continuar importando
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => {
                                setShowCancelDialog(false);
                                handleCancel();
                            }}
                        >
                            Sí, cancelar importación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
