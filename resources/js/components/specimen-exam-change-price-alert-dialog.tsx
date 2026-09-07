import { AlertCircle } from 'lucide-react';
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

export interface SpecimenExamChangePriceAlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function SpecimenExamChangePriceAlertDialog({
    open,
    onOpenChange,
    onConfirm,
}: SpecimenExamChangePriceAlertDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="z-[120] max-w-[480px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                        <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                        Actualización de Precios y Facturación Requerida
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3 pt-1 text-sm text-muted-foreground">
                            <p>
                                Ha modificado el{' '}
                                <strong>tipo de muestra</strong> o los{' '}
                                <strong>exámenes a realizar</strong> de esta
                                muestra.
                            </p>
                            <div className="space-y-1 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                                <span className="block font-semibold text-amber-900 dark:text-amber-200">
                                    Configuración requerida:
                                </span>
                                <span>
                                    Debido a este cambio, debe seleccionar los
                                    precios y configurar la facturación de la
                                    muestra. A continuación se habilitarán los
                                    pasos del formulario y avanzará al{' '}
                                    <strong>Paso 2 (Facturación)</strong> para
                                    revisar los precios y valores numéricos. La
                                    factura y el PDF serán regenerados al
                                    guardar.
                                </span>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            onOpenChange(false);
                            onConfirm();
                        }}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Continuar a Facturación
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default SpecimenExamChangePriceAlertDialog;
