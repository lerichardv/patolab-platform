import axios from 'axios';
import { AlertCircle, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import HeadingSheet from '@/components/heading-sheet';
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
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { ReportEmailData } from './send-report-form';
import SendReportForm from './send-report-form';
import SendReportSkeleton from './send-report-skeleton';

export interface SendReportSheetProps {
    specimen: {
        id: number;
        sequence_code?: string;
        status?: string;
        [key: string]: any;
    } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export default function SendReportSheet({
    specimen,
    open,
    onOpenChange,
    onSuccess,
}: SendReportSheetProps) {
    const [data, setData] = useState<ReportEmailData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);
    const specimenId = specimen?.id;

    const fetchData = useCallback(() => {
        if (!specimenId) {
            return;
        }

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setError(null);

        axios
            .get(`/specimens/${specimenId}/report-email-data`, {
                signal: controller.signal,
            })
            .then((response) => {
                if (!controller.signal.aborted) {
                    setData(response.data);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (axios.isCancel(err) || err.name === 'CanceledError') {
                    return;
                }

                if (!controller.signal.aborted) {
                    console.error('Error fetching report email data:', err);
                    setError(
                        err.response?.data?.message ||
                            'No se pudo cargar la información para el envío del reporte.',
                    );
                    setIsLoading(false);
                }
            });
    }, [specimenId]);

    useEffect(() => {
        if (open && specimenId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchData();
        } else {
            setData(null);
            setError(null);
            setIsDirty(false);
            abortControllerRef.current?.abort();
        }

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [open, specimenId, fetchData]);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && isDirty) {
            setShowCloseConfirm(true);

            return;
        }

        onOpenChange(newOpen);
    };

    const handleSuccess = () => {
        setIsDirty(false);
        onSuccess?.();
        onOpenChange(false);
    };

    return (
        <>
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetContent
                    side="right"
                    className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[650px] lg:max-w-[700px]"
                >
                    <HeadingSheet
                        title="Enviar Reporte por Correo"
                        description={`Envía el reporte oficial ${specimen?.sequence_code ? `de la muestra ${specimen.sequence_code}` : ''} a uno o múltiples destinatarios.`}
                    />

                    {open && (
                        <>
                            {isLoading ? (
                                <SendReportSkeleton />
                            ) : error ? (
                                <div className="mx-5 my-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
                                    <AlertCircle className="h-8 w-8 text-destructive" />
                                    <p className="text-xs font-medium text-destructive">
                                        {error}
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={fetchData}
                                        className="mt-1 gap-1.5 text-xs"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        Reintentar
                                    </Button>
                                </div>
                            ) : data ? (
                                <SendReportForm
                                    data={data}
                                    onSuccess={handleSuccess}
                                    onCancel={() => handleOpenChange(false)}
                                    setIsDirty={setIsDirty}
                                />
                            ) : null}
                        </>
                    )}
                </SheetContent>
            </Sheet>

            <AlertDialog
                open={showCloseConfirm}
                onOpenChange={setShowCloseConfirm}
            >
                <AlertDialogContent className="max-w-[420px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Deseas cerrar el formulario?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Tienes cambios sin enviar. Si sales ahora, los
                            correos ingresados y mensajes se perderán.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setShowCloseConfirm(false)}
                        >
                            Continuar editando
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowCloseConfirm(false);
                                setIsDirty(false);
                                onOpenChange(false);
                            }}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Sí, salir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
