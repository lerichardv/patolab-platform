import { FileText, ExternalLink } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PriceQuotePreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quoteUrl: string | null;
    quoteId?: string | null;
    zClass?: string;
}

export default function PriceQuotePreviewDialog({
    open,
    onOpenChange,
    quoteUrl,
    quoteId,
    zClass = 'z-[120]',
}: PriceQuotePreviewDialogProps) {
    const handleClose = () => {
        onOpenChange(false);
    };

    const handleOpenInNewTab = () => {
        if (quoteUrl) {
            window.open(quoteUrl, '_blank');
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent
                className={cn('w-full max-w-[750px]', zClass)}
                overlayClassName={zClass}
            >
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                        <FileText className="h-5 w-5 text-primary" /> Cotización
                        Generada con Éxito {quoteId ? `(#${quoteId})` : ''}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        La cotización ha sido registrada y el documento en
                        formato PDF se compiló exitosamente. Puede visualizarlo,
                        descargarlo o imprimirlo a continuación.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {quoteUrl && (
                    <div className="my-3 overflow-hidden rounded-lg border bg-muted">
                        <iframe
                            src={quoteUrl}
                            className="h-[460px] w-full border-none"
                            title="Cotización PDF"
                        />
                    </div>
                )}

                <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        className="sm:order-1"
                    >
                        Cerrar
                    </Button>
                    <Button onClick={handleOpenInNewTab} className="sm:order-2">
                        <ExternalLink className="mr-2 h-4 w-4" /> Abrir en
                        pestaña nueva
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
