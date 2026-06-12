import { Mic, Square, Loader2, Check, RefreshCw, X, AlertCircle } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AIDictationSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInsert: (text: string) => void;
}

const SENDING_TEXTS = [
    'Comprimiendo archivo de audio...',
    'Optimizando señal de voz...',
    'Conectando de forma segura con el servidor...',
    'Enviando paquete de datos a Grok API...',
];

const TRANSCRIBING_TEXTS = [
    'El modelo Grok está procesando el audio...',
    'Corrigiendo errores de fonética y puntuación...',
    'Analizando términos médicos y de patología...',
    'Generando informe estructurado...',
];

export default function AIDictationSheet({
    open,
    onOpenChange,
    onInsert,
}: AIDictationSheetProps) {
    const [status, setStatus] = useState<
        'idle' | 'recording' | 'sending' | 'transcribing' | 'success' | 'error'
    >('idle');
    const [transcription, setTranscription] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [loaderText, setLoaderText] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isRecordingRef = useRef(false);

    // Reset sheet states when it is opened/closed
    useEffect(() => {
        if (open) {
            setStatus('idle');
            setTranscription('');
            setError(null);
            setRecordingTime(0);
        } else {
            // Clean up resources if closed abruptly
            cleanupRecordingResources();
        }
    }, [open]);

    // Split 'sending' state to trigger 'transcribing' after 2.5s and cycle smart texts
    useEffect(() => {
        if (status === 'sending') {
            const timer = setTimeout(() => {
                setStatus('transcribing');
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [status]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === 'sending') {
            let index = 0;
            setLoaderText(SENDING_TEXTS[0]);
            interval = setInterval(() => {
                index = (index + 1) % SENDING_TEXTS.length;
                setLoaderText(SENDING_TEXTS[index]);
            }, 1200);
        } else if (status === 'transcribing') {
            let index = 0;
            setLoaderText(TRANSCRIBING_TEXTS[0]);
            interval = setInterval(() => {
                index = (index + 1) % TRANSCRIBING_TEXTS.length;
                setLoaderText(TRANSCRIBING_TEXTS[index]);
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [status]);

    const cleanupRecordingResources = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        }
        mediaRecorderRef.current = null;
        isRecordingRef.current = false;
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = { mimeType: 'audio/webm;codecs=opus' };
            let recorder: MediaRecorder;

            try {
                recorder = new MediaRecorder(stream, options);
            } catch (e) {
                recorder = new MediaRecorder(stream);
            }

            audioChunksRef.current = [];
            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
                sendAudioToBackend(audioBlob);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            isRecordingRef.current = true;
            setStatus('recording');
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

            toast.success('Grabación iniciada. Empiece a hablar...');
        } catch (err) {
            console.error('Failed to get microphone permissions:', err);
            toast.error('No se pudo acceder al micrófono. Verifique los permisos del navegador.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        isRecordingRef.current = false;
    };

    const cancelRecording = () => {
        cleanupRecordingResources();
        setStatus('idle');
        setRecordingTime(0);
        toast.info('Grabación cancelada.');
    };

    const sendAudioToBackend = async (blob: Blob) => {
        setStatus('sending');
        setError(null);

        const formData = new FormData();
        formData.append('audio', blob, 'dictation.webm');

        try {
            const serverUrl =
                import.meta.env.VITE_COLLABORATION_SERVER_URL ||
                'http://127.0.0.1:1234';
            const response = await fetch(`${serverUrl}/api/dictate-chunk`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.details || 'Error al transcribir el audio.');
            }

            const data = await response.json();
            if (data.success && data.text) {
                setTranscription(data.text);
                setStatus('success');
            } else {
                throw new Error(data.error || 'Respuesta vacía o inválida del servidor.');
            }
        } catch (err: any) {
            setError(err.message || 'Error de red o del modelo.');
            setStatus('error');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex h-full w-full flex-col border-l bg-background/95 p-0 backdrop-blur-md sm:max-w-2xl"
            >
                <SheetHeader className="border-b border-border bg-muted/20 p-6">
                    <div className="mb-1 flex w-fit animate-pulse items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-white uppercase shadow-sm shadow-teal-500/20">
                        <Mic className="h-3 w-3 fill-current" />
                        <span>Dictado Inteligente</span>
                    </div>
                    <SheetTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                        Dictado por Voz
                    </SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground">
                        Grabe su voz para transcribir descripciones médicas con Inteligencia Artificial. Revise y edite antes de insertar.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                    {status === 'idle' && (
                        <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 hover:bg-emerald-600 focus:outline-hidden"
                                >
                                    <Mic className="h-8 w-8" />
                                </button>
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500"></span>
                                </span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">
                                    Presione el botón para iniciar grabación
                                </p>
                                <p className="text-xs text-muted-foreground max-w-sm">
                                    Asegúrese de estar en un ambiente silencioso y usar un vocabulario claro para mejores resultados de transcripción médica.
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'recording' && (
                        <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center">
                            {/* Animated Waves */}
                            <div className="flex items-center justify-center gap-1.5 py-6">
                                <span className="h-8 w-1.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:-0.4s]" />
                                <span className="h-12 w-1.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:-0.2s]" />
                                <span className="h-16 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                <span className="h-12 w-1.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:-0.2s]" />
                                <span className="h-8 w-1.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:-0.4s]" />
                            </div>

                            <div className="space-y-2">
                                <span className="text-2xl font-mono font-bold tracking-wider text-foreground">
                                    {formatTime(recordingTime)}
                                </span>
                                <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest animate-pulse">
                                    Grabando audio...
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <Button
                                    type="button"
                                    onClick={stopRecording}
                                    className="bg-red-500 text-white hover:bg-red-600 font-semibold"
                                >
                                    <Square className="h-4 w-4 mr-2" />
                                    Detener y Transcribir
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={cancelRecording}
                                    className="font-semibold"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    )}

                    {(status === 'sending' || status === 'transcribing') && (
                        <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
                            <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">
                                    Procesando transcripción
                                </p>
                                <p className="text-xs text-muted-foreground max-w-sm italic">
                                    "{loaderText}"
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-4">
                            <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Transcripción sugerida
                            </span>
                            <Textarea
                                className="text-md min-h-[200px] w-full resize-none leading-relaxed"
                                value={transcription}
                                onChange={(e) => setTranscription(e.target.value)}
                                placeholder="La transcripción de su dictado aparecerá aquí..."
                            />
                            <p className="text-[10px] text-muted-foreground italic">
                                * Puede editar el texto libremente antes de insertarlo en el reporte.
                            </p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-foreground">
                                    Error de Transcripción
                                </p>
                                <p className="text-xs text-red-500 max-w-md bg-destructive/5 border border-destructive/10 p-3 rounded-lg">
                                    {error}
                                </p>
                            </div>
                            <Button
                                type="button"
                                onClick={() => setStatus('idle')}
                                className="font-semibold"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Intentar de nuevo
                            </Button>
                        </div>
                    )}
                </div>

                <SheetFooter className="mt-auto flex flex-col gap-2 border-t border-border bg-muted/10 p-6 sm:flex-row">
                    {status === 'success' && (
                        <>
                            <Button
                                type="button"
                                onClick={() => {
                                    onInsert(transcription);
                                    onOpenChange(false);
                                }}
                                className="w-full font-semibold sm:flex-1"
                            >
                                <Check className="h-4 w-4 mr-2" />
                                Aplicar dictado
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStatus('idle')}
                                className="w-full font-semibold sm:flex-1"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Grabar de nuevo
                            </Button>
                        </>
                    )}
                    {status !== 'success' && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="w-full font-semibold"
                            disabled={status === 'recording' || status === 'sending' || status === 'transcribing'}
                        >
                            Cerrar
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
