import {
    Sparkles,
    Eye,
    EyeOff,
    FileText,
    Loader2,
    Check,
    Send,
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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

function RenderDiffText({
    original,
    modified,
}: {
    original: string;
    modified: string;
}) {
    return (
        <div className="space-y-1">
            {diffWords(original, modified).map((part, pIdx) => {
                if (part.type === 'added') {
                    return (
                        <span
                            key={pIdx}
                            className="rounded border border-emerald-500/20 bg-emerald-500/15 px-0.5 font-medium text-emerald-700 dark:text-emerald-400"
                        >
                            {part.text}
                        </span>
                    );
                }

                if (part.type === 'removed') {
                    return (
                        <span
                            key={pIdx}
                            className="rounded border border-red-500/20 bg-red-500/15 px-0.5 text-red-700 line-through decoration-red-500 dark:text-red-400"
                        >
                            {part.text}
                        </span>
                    );
                }

                return <span key={pIdx}>{part.text}</span>;
            })}
        </div>
    );
}

export default function AIGrammarSheet({
    open,
    onOpenChange,
    selectedText,
    onReplace,
}: AIGrammarSheetProps) {
    const [originalText, setOriginalText] = useState('');
    const [activeTab, setActiveTab] = useState<'grammar' | 'suggestions'>(
        'grammar',
    );

    // Grammar Correction states
    const [tempCorrectedText, setTempCorrectedText] = useState('');
    const [isCorrecting, setIsCorrecting] = useState(false);
    const [correctionError, setCorrectionError] = useState<string | null>(null);
    const [aiViewMode, setAiViewMode] = useState<'diff' | 'edit'>('diff');

    // AI Suggestions Chat states
    const [chatMessages, setChatMessages] = useState<
        Array<{ role: 'user' | 'assistant'; content: string }>
    >([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);
    const [chatInputValue, setChatInputValue] = useState('');
    const [diffActiveIndex, setDiffActiveIndex] = useState<number | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);

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

            const timer = setTimeout(() => {
                setOriginalText(text);
                setActiveTab('grammar');

                // Reset grammar states
                setTempCorrectedText('');
                setIsCorrecting(false);
                setCorrectionError(null);
                setAiViewMode('diff');

                // Reset suggestions states
                setChatMessages([]);
                setIsSuggesting(false);
                setSuggestionError(null);
                setChatInputValue('');
                setDiffActiveIndex(null);
            }, 0);

            return () => clearTimeout(timer);
        }
    }, [open, selectedText]);

    // Auto-scroll chat history to bottom
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isSuggesting]);

    const fetchGrammarCorrection = async (textToCorrect: string) => {
        setIsCorrecting(true);
        setCorrectionError(null);

        try {
            const serverUrl =
                import.meta.env.VITE_COLLABORATION_SERVER_URL ||
                'http://127.0.0.1:1234';
            const response = await fetch(`${serverUrl}/api/fix-grammar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: textToCorrect,
                }),
            });

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

    const fetchAISuggestionChat = useCallback(
        async (
            nextMessages: Array<{
                role: 'user' | 'assistant';
                content: string;
            }>,
        ) => {
            setIsSuggesting(true);
            setSuggestionError(null);
            setChatMessages(nextMessages);

            try {
                const serverUrl =
                    import.meta.env.VITE_COLLABORATION_SERVER_URL ||
                    'http://127.0.0.1:1234';
                const response = await fetch(
                    `${serverUrl}/api/suggest-improvements`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            text: originalText,
                            messages: nextMessages,
                        }),
                    },
                );

                if (!response.ok) {
                    throw new Error('Error al procesar la sugerencia.');
                }

                const data = await response.json();

                if (data.success && data.text) {
                    setChatMessages([
                        ...nextMessages,
                        { role: 'assistant', content: data.text },
                    ]);
                } else {
                    throw new Error(
                        data.error || 'Respuesta inválida del servidor.',
                    );
                }
            } catch (err: any) {
                setSuggestionError(err.message || 'Error de red o del modelo.');
            } finally {
                setIsSuggesting(false);
            }
        },
        [originalText],
    );

    // Auto-generate initial suggestion when opening Suggestions tab
    useEffect(() => {
        if (
            activeTab === 'suggestions' &&
            chatMessages.length === 0 &&
            originalText
        ) {
            const initialPrompt = [
                {
                    role: 'user' as const,
                    content:
                        'Por favor, analiza el texto seleccionado y genera una propuesta inicial de optimización, corrigiendo posibles errores de concepto y puliendo la redacción.',
                },
            ];

            const timer = setTimeout(() => {
                fetchAISuggestionChat(initialPrompt);
            }, 0);

            return () => clearTimeout(timer);
        }
    }, [activeTab, chatMessages, originalText, fetchAISuggestionChat]);

    const handleSendChatMessage = () => {
        if (!chatInputValue.trim() || isSuggesting) {
            return;
        }

        const updatedHistory = [
            ...chatMessages,
            { role: 'user' as const, content: chatInputValue.trim() },
        ];
        setChatInputValue('');
        fetchAISuggestionChat(updatedHistory);
    };

    const handleChatInputKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSendChatMessage();
        }
    };

    // Find the latest suggestion from assistant to display in the main apply action
    const latestAssistantMessage = [...chatMessages]
        .reverse()
        .find((m) => m.role === 'assistant');

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
                        Asistente de Redacción IA
                    </SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground">
                        Optimice y refine el texto de su informe médico. Revise
                        y acepte las correcciones de gramática o sugerencias de
                        conceptos.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-5 overflow-y-auto p-6">
                    <div className="space-y-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Texto original
                        </span>
                        <div className="text-md max-h-[120px] overflow-y-auto rounded-xl border border-border/80 bg-muted/40 p-4 leading-relaxed whitespace-pre-wrap text-gray-800 shadow-inner">
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
                            Herramientas de optimización
                        </span>

                        <Tabs
                            value={activeTab}
                            onValueChange={(val) =>
                                setActiveTab(val as 'grammar' | 'suggestions')
                            }
                            className="w-full"
                        >
                            <TabsList className="mb-4 grid w-full grid-cols-2">
                                <TabsTrigger
                                    value="grammar"
                                    className="cursor-pointer text-xs font-semibold"
                                >
                                    Corrección Gramatical
                                </TabsTrigger>
                                <TabsTrigger
                                    value="suggestions"
                                    className="cursor-pointer text-xs font-semibold"
                                >
                                    Sugerencias Chat (OpenAI)
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent
                                value="grammar"
                                className="space-y-4 focus-visible:outline-none"
                            >
                                {tempCorrectedText ? (
                                    <div className="space-y-3">
                                        <div className="flex rounded-lg bg-muted p-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setAiViewMode('diff')
                                                }
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
                                                onClick={() =>
                                                    setAiViewMode('edit')
                                                }
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

                                                    if (
                                                        part.type === 'removed'
                                                    ) {
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
                                                    setTempCorrectedText(
                                                        e.target.value,
                                                    )
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
                                                    isCorrecting &&
                                                        'animate-pulse',
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-foreground">
                                                Corrector de Gramática y
                                                Ortografía
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Analiza el texto seleccionado
                                                para corregir errores de
                                                ortografía, puntuación y
                                                coherencia técnica en español.
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
                                                fetchGrammarCorrection(
                                                    originalText,
                                                )
                                            }
                                            disabled={isCorrecting}
                                            className="w-full cursor-pointer"
                                        >
                                            {isCorrecting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>
                                                        Generando corrección...
                                                    </span>
                                                </>
                                            ) : correctionError ? (
                                                <>
                                                    <Sparkles className="h-4 w-4" />
                                                    <span>
                                                        Reintentar corrección
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-4 w-4" />
                                                    <span>
                                                        Generar corrección con
                                                        IA
                                                    </span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent
                                value="suggestions"
                                className="space-y-4 focus-visible:outline-none"
                            >
                                <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-muted/10 shadow-inner">
                                    {/* Chat Messages Log */}
                                    <div className="flex h-[280px] flex-col space-y-4 overflow-y-auto p-4">
                                        {chatMessages
                                            .filter((m) => m.content !== '')
                                            .map((msg, index) => {
                                                const isUser =
                                                    msg.role === 'user';
                                                const isDiffActive =
                                                    diffActiveIndex === index;

                                                // Only show action triggers for assistant messages that aren't the system prompt or greeting placeholders
                                                const showActions =
                                                    !isUser && index > 0;

                                                return (
                                                    <div
                                                        key={index}
                                                        className={cn(
                                                            'flex max-w-[85%] flex-col space-y-1',
                                                            isUser
                                                                ? 'ml-auto items-end self-end'
                                                                : 'mr-auto items-start self-start',
                                                        )}
                                                    >
                                                        <span className="px-1 text-[9px] font-bold text-muted-foreground uppercase">
                                                            {isUser
                                                                ? 'Tú'
                                                                : 'Asistente IA'}
                                                        </span>
                                                        <div
                                                            className={cn(
                                                                'rounded-2xl border px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm',
                                                                isUser
                                                                    ? 'rounded-tr-none border-indigo-700 bg-indigo-600 text-white'
                                                                    : 'rounded-tl-none border-border/80 bg-background text-foreground',
                                                            )}
                                                        >
                                                            {isDiffActive ? (
                                                                <RenderDiffText
                                                                    original={
                                                                        originalText
                                                                    }
                                                                    modified={
                                                                        msg.content
                                                                    }
                                                                />
                                                            ) : (
                                                                msg.content
                                                            )}
                                                        </div>

                                                        {showActions && (
                                                            <div className="flex items-center gap-3 px-1 pt-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setDiffActiveIndex(
                                                                            isDiffActive
                                                                                ? null
                                                                                : index,
                                                                        )
                                                                    }
                                                                    className="flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                                                                >
                                                                    {isDiffActive ? (
                                                                        <>
                                                                            <EyeOff className="h-3 w-3" />
                                                                            <span>
                                                                                Ver
                                                                                texto
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Eye className="h-3 w-3" />
                                                                            <span>
                                                                                Ver
                                                                                cambios
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        onReplace(
                                                                            msg.content,
                                                                            originalText,
                                                                        )
                                                                    }
                                                                    className="flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
                                                                >
                                                                    <Check className="h-3 w-3" />
                                                                    <span>
                                                                        Aplicar
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                        {isSuggesting && (
                                            <div className="mr-auto flex max-w-[85%] flex-col items-start space-y-1 self-start">
                                                <span className="px-1 text-[9px] font-bold text-muted-foreground uppercase">
                                                    Asistente IA
                                                </span>
                                                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-none border border-border/80 bg-background px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-sm">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    <span>
                                                        Generando propuesta...
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {suggestionError && (
                                            <div className="self-center rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
                                                {suggestionError}
                                            </div>
                                        )}

                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Chat Input Bar */}
                                    <div className="flex items-center gap-2 border-t border-border bg-muted/40 p-2">
                                        <input
                                            type="text"
                                            value={chatInputValue}
                                            onChange={(e) =>
                                                setChatInputValue(
                                                    e.target.value,
                                                )
                                            }
                                            onKeyDown={handleChatInputKeyDown}
                                            placeholder={
                                                isSuggesting
                                                    ? 'Esperando respuesta...'
                                                    : 'Dime qué cambiar (ej. "hazlo más conciso")...'
                                            }
                                            className="flex-1 border-none bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-0 focus-visible:outline-none"
                                            disabled={isSuggesting}
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleSendChatMessage}
                                            disabled={
                                                isSuggesting ||
                                                !chatInputValue.trim()
                                            }
                                            size="icon"
                                            className="h-8 w-8 shrink-0 cursor-pointer rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                        >
                                            <Send className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                <SheetFooter className="mt-auto flex flex-col gap-2 border-t border-border bg-muted/10 p-6 sm:flex-row">
                    {activeTab === 'grammar' &&
                    !isCorrecting &&
                    !correctionError &&
                    tempCorrectedText ? (
                        <>
                            <Button
                                type="button"
                                onClick={() =>
                                    onReplace(tempCorrectedText, originalText)
                                }
                                className="w-full cursor-pointer font-semibold sm:flex-1"
                            >
                                <Check className="h-4 w-4" />
                                <span>Aplicar corrección</span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="w-full cursor-pointer font-semibold sm:flex-1"
                            >
                                Descartar
                            </Button>
                        </>
                    ) : activeTab === 'suggestions' &&
                      !isSuggesting &&
                      !suggestionError &&
                      latestAssistantMessage ? (
                        <>
                            <Button
                                type="button"
                                onClick={() =>
                                    onReplace(
                                        latestAssistantMessage.content,
                                        originalText,
                                    )
                                }
                                className="w-full cursor-pointer font-semibold sm:flex-1"
                            >
                                <Check className="h-4 w-4" />
                                <span>Aplicar última sugerencia</span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="w-full cursor-pointer font-semibold sm:flex-1"
                            >
                                Descartar
                            </Button>
                        </>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="w-full cursor-pointer font-semibold"
                            disabled={
                                activeTab === 'grammar'
                                    ? isCorrecting
                                    : isSuggesting
                            }
                        >
                            Cerrar
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
