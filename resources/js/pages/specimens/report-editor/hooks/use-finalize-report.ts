import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { generateTempPdf } from '../actions';
import type { SpecimenStatus } from '../types';

export interface UseFinalizeReportOptions {
    specimenSequenceCode: string;
    onUpdateFinalizationDate: (dateVal: string) => Promise<any>;
    onTransitionState: (targetStatus: SpecimenStatus) => void;
    /** Called before the temp PDF is generated so the latest content is persisted first. */
    onBeforeSave?: () => Promise<void>;
}

export function useFinalizeReport({
    specimenSequenceCode,
    onUpdateFinalizationDate,
    onTransitionState,
    onBeforeSave,
}: UseFinalizeReportOptions) {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [showCompleteMicroscopyDialog, setShowCompleteMicroscopyDialog] =
        useState(false);
    const [tempPdfUrl, setTempPdfUrl] = useState<string | null>(null);
    const [tempPdfTotalPages, setTempPdfTotalPages] = useState(1);

    const handleStartMicroscopyFinalization = useCallback(async () => {
        setIsGeneratingPdf(true);

        // Flush pending editor changes to the DB before generating the PDF
        if (onBeforeSave) {
            try {
                await onBeforeSave();
            } catch (err) {
                console.error(
                    '[finalize] Save failed before PDF generation:',
                    err,
                );
                toast.error(
                    'No se pudo guardar el reporte antes de generar el PDF.',
                );
                setIsGeneratingPdf(false);

                return;
            }
        }

        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        await onUpdateFinalizationDate(todayStr);

        try {
            const data = await generateTempPdf(specimenSequenceCode);
            let pdfUrl = data.url;

            if (pdfUrl && pdfUrl.startsWith('http')) {
                try {
                    const parsed = new URL(pdfUrl);
                    pdfUrl = parsed.pathname + parsed.search + parsed.hash;
                } catch (e) {
                    console.error(e);
                }
            }

            setTempPdfUrl(pdfUrl);
            setTempPdfTotalPages(data.total_pages || 1);
            setShowCompleteMicroscopyDialog(true);
        } catch (error: any) {
            toast.error(
                error.message || 'Error al generar el PDF de previsualización.',
            );
        } finally {
            setIsGeneratingPdf(false);
        }
    }, [specimenSequenceCode, onUpdateFinalizationDate, onBeforeSave]);

    const handleConfirmFinalization = useCallback(() => {
        onTransitionState('finalized');
    }, [onTransitionState]);

    return {
        isGeneratingPdf,
        showCompleteMicroscopyDialog,
        setShowCompleteMicroscopyDialog,
        tempPdfUrl,
        tempPdfTotalPages,
        handleStartMicroscopyFinalization,
        handleConfirmFinalization,
    };
}

export default useFinalizeReport;
