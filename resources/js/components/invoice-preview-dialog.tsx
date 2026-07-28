import { FileText, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
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

interface InvoicePreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceUrl: string | null;
    paymentInvoiceUrl?: string | null;
    isGroup?: boolean;
    zClass?: string; // e.g., z-[100] or z-[120]
}

export default function InvoicePreviewDialog({
    open,
    onOpenChange,
    invoiceUrl,
    paymentInvoiceUrl,
    isGroup = false,
    zClass = 'z-[100]',
}: InvoicePreviewDialogProps) {
    const [activePdf, setActivePdf] = useState<'invoice' | 'payment_invoice'>(
        'invoice',
    );

    useEffect(() => {
        if (!open) {
            setActivePdf('invoice');
        }
    }, [open]);

    const title = isGroup
        ? 'Factura Grupal Generada con Éxito'
        : 'Factura Generada con Éxito';
    const description = isGroup
        ? 'El grupo de muestras ha sido registrado y la factura se generó en formato PDF. Puede descargarla, imprimirla o visualizarla a continuación.'
        : 'La muestra ha sido registrada y la factura se generó en formato PDF. Puede descargarla, imprimirla o visualizarla a continuación.';

    const currentUrl = activePdf === 'invoice' ? invoiceUrl : paymentInvoiceUrl;

    const handleClose = () => {
        onOpenChange(false);
    };

    const handleOpenInNewTab = () => {
        const url = activePdf === 'invoice' ? invoiceUrl : paymentInvoiceUrl;

        if (url) {
            window.open(url, '_blank');
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent
                className={cn('w-full max-w-[700px]', zClass)}
                overlayClassName={zClass}
            >
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" /> {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {paymentInvoiceUrl && (
                    <div className="mt-2 flex gap-2">
                        <Button
                            type="button"
                            variant={
                                activePdf === 'invoice' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => setActivePdf('invoice')}
                            className="flex-1"
                        >
                            Factura de Crédito
                        </Button>
                        <Button
                            type="button"
                            variant={
                                activePdf === 'payment_invoice'
                                    ? 'default'
                                    : 'outline'
                            }
                            size="sm"
                            onClick={() => setActivePdf('payment_invoice')}
                            className="flex-1"
                        >
                            Recibo de Pago Inicial
                        </Button>
                    </div>
                )}

                {currentUrl && (
                    <div className="my-4 overflow-hidden rounded-lg border bg-muted">
                        <iframe
                            src={currentUrl}
                            className="h-[400px] w-full border-none"
                            title="Factura PDF"
                        />
                    </div>
                )}

                <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
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
