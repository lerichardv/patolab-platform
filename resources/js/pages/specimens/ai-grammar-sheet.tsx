import React, { useState, useEffect } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Eye, FileText, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AIGrammarSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedText: string;
    onReplace: (correctedText: string, originalText: string) => void;
}

function diffWords(original: string, modified: string) {
    const origWords = original.split(/(\s+)/).filter(Boolean);
    const modWords = modified.split(/(\s+)/).filter(Boolean);

    const dp: number[][] = Array(origWords.length + 1)
        .fill(0)
        .map(() => Array(modWords.length + 1).fill(0));

    for (let i = 1; i <= origWords.length; i++) {
        for (let j = 1; j <= modWords.length; j++) {
            if (origWords[i - 1] === modWords[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    const result: Array<{ type: 'added' | 'removed' | 'equal'; text: string }> =
        [];
    let i = origWords.length;
    let j = modWords.length;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && origWords[i - 1] === modWords[j - 1]) {
            result.unshift({ type: 'equal', text: origWords[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ type: 'added', text: modWords[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || dp[i - 1][j] > dp[i][j - 1])) {
            result.unshift({ type: 'removed', text: origWords[i - 1] });
            i--;
        }
    }

    return result;
}

export default function AIGrammarSheet({
    open,
    onOpenChange,
    selectedText,
    onReplace,
}: AIGrammarSheetProps) {
    const [originalText, setOriginalText] = useState('');
    const [tempCorrectedText, setTempCorrectedText] = useState('');
    const [isCorrecting, setIsCorrecting] = useState(false);
    const [correctionError, setCorrectionError] = useState<string | null>(null);
    const [aiViewMode, setAiViewMode] = useState<'diff' | 'edit'>('diff');

    // Reset sheet states when it is opened/closed or selected text changes
    useEffect(() => {
        if (open) {
            let text = selectedText || '';
            if (text.length > 3000) {
                text = text.slice(0, 3000);
                toast.warning(
                    'El texto seleccionado supera el límite. Se han recortado los primeros 3000 caracteres.',
                );
            }
            setOriginalText(text);
            setTempCorrectedText('');
            setIsCorrecting(false);
            setCorrectionError(null);
            setAiViewMode('diff');
        }
    }, [open, selectedText]);

    const fetchGrammarCorrection = async (textToCorrect: string) => {
        setIsCorrecting(true);
        setCorrectionError(null);

        try {
            const response = await fetch(
                'http://127.0.0.1:1234/api/fix-grammar',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: textToCorrect,
                    }),
                },
            );

            if (!response.ok) {
                throw new Error('Error al procesar el texto.');
            }

            const data = await response.json();

            if (data.success && data.text) {
                setTempCorrectedText(data.text);
            } else {
                throw new Error(
                    data.error || 'Respuesta inválida del servidor.',
                );
            }
        } catch (err: any) {
            setCorrectionError(err.message || 'Error de red o del modelo.');
        } finally {
            setIsCorrecting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex h-full w-full flex-col border-l bg-background/95 p-0 backdrop-blur-md sm:max-w-2xl"
            >
                <SheetHeader className="border-b border-border bg-muted/20 p-6">
                    <div className="mb-1 flex w-fit animate-pulse items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-white uppercase shadow-sm shadow-indigo-500/20">
                        <Sparkles className="h-3 w-3 fill-current" />
                        <span>Asistente IA</span>
                    </div>
                    <SheetTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                        Corrección Gramatical
                    </SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground">
                        Optimice la redacción de su informe médico. Revise y
                        acepte los cambios sugeridos.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                    <div className="space-y-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Texto original
                        </span>
                        <div className="text-md max-h-[200px] overflow-y-auto rounded-xl border border-border/80 bg-muted/40 p-4 leading-relaxed whitespace-pre-wrap text-gray-800 shadow-inner">
                            {originalText}
                        </div>
                        <div className="mt-1 flex items-center justify-between px-1 text-xs">
                            <span className="text-muted-foreground">
                                Máximo 3000 caracteres
                            </span>
                            <span
                                className={cn(
                                    'font-medium transition-colors',
                                    (selectedText?.length || 0) > 3000
                                        ? 'font-semibold text-red-500'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {selectedText?.length || 0} / 3000
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Sugerencia del Asistente
                        </span>

                        {tempCorrectedText ? (
                            <div className="space-y-3">
                                <div className="flex rounded-lg bg-muted p-1">
                                    <button
                                        type="button"
                                        onClick={() => setAiViewMode('diff')}
                                        className={cn(
                                            'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                                            aiViewMode === 'diff'
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:bg-background/40 hover:text-foreground',
                                        )}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>Ver cambios</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAiViewMode('edit')}
                                        className={cn(
                                            'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                                            aiViewMode === 'edit'
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:bg-background/40 hover:text-foreground',
                                        )}
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        <span>Editar sugerencia</span>
                                    </button>
                                </div>

                                {aiViewMode === 'diff' ? (
                                    <div className="text-md min-h-[180px] w-full overflow-y-auto rounded-xl border border-border bg-muted/10 p-4 leading-relaxed whitespace-pre-wrap shadow-inner">
                                        {diffWords(
                                            originalText,
                                            tempCorrectedText,
                                        ).map((part, index) => {
                                            if (part.type === 'added') {
                                                return (
                                                    <span
                                                        key={index}
                                                        className="rounded border border-emerald-500/20 bg-emerald-500/15 px-0.5 font-medium text-emerald-700 dark:text-emerald-400"
                                                    >
                                                        {part.text}
                                                    </span>
                                                );
                                            }
                                            if (part.type === 'removed') {
                                                return (
                                                    <span
                                                        key={index}
                                                        className="rounded border border-red-500/20 bg-red-500/15 px-0.5 text-red-700 line-through decoration-red-500 dark:text-red-400"
                                                    >
                                                        {part.text}
                                                    </span>
                                                );
                                            }
                                            return (
                                                <span key={index}>
                                                    {part.text}
                                                </span>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <Textarea
                                        className="text-md min-h-[180px] w-full resize-none"
                                        value={tempCorrectedText}
                                        onChange={(e) =>
                                            setTempCorrectedText(e.target.value)
                                        }
                                        placeholder="La corrección aparecerá aquí..."
                                    />
                                )}
                                <p className="text-[10px] text-muted-foreground italic">
                                    {aiViewMode === 'diff'
                                        ? '* Las adiciones están en verde y las eliminaciones están en rojo tachado.'
                                        : '* Puede editar la sugerencia directamente en este cuadro antes de aplicar los cambios.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
                                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <Sparkles
                                        className={cn(
                                            'h-5 w-5',
                                            isCorrecting && 'animate-pulse',
                                        )}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-foreground">
                                        Asistente de Redacción IA
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Analiza el texto seleccionado para
                                        corregir ortografía, gramática y
                                        coherencia clínica.
                                    </p>
                                </div>

                                {correctionError && (
                                    <p className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
                                        {correctionError}
                                    </p>
                                )}

                                <Button
                                    type="button"
                                    onClick={() =>
                                        fetchGrammarCorrection(originalText)
                                    }
                                    disabled={isCorrecting}
                                    className="w-full"
                                >
                                    {isCorrecting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Generando corrección...</span>
                                        </>
                                    ) : correctionError ? (
                                        <>
                                            <Sparkles className="h-4 w-4" />
                                            <span>Reintentar corrección</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4" />
                                            <span>
                                                Generar corrección con IA
                                            </span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <SheetFooter className="mt-auto flex flex-col gap-2 border-t border-border bg-muted/10 p-6 sm:flex-row">
                    {!isCorrecting && !correctionError && tempCorrectedText ? (
                        <>
                            <Button
                                type="button"
                                onClick={() =>
                                    onReplace(tempCorrectedText, originalText)
                                }
                                className="w-full font-semibold sm:flex-1"
                            >
                                <Check className="h-4 w-4" />
                                <span>Aplicar corrección</span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="w-full font-semibold sm:flex-1"
                            >
                                Descartar
                            </Button>
                        </>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="w-full font-semibold"
                            disabled={isCorrecting}
                        >
                            Cerrar
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
