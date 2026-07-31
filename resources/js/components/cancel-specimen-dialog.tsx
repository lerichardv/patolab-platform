import { router } from '@inertiajs/react';
import { AlertCircle, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CancelSpecimenDialogProps {
    isOpen: boolean;
    onClose: () => void;
    specimenToCancel: any;
    specimensInGroupToCancel: any[];
}

export default function CancelSpecimenDialog({
    isOpen,
    onClose,
    specimenToCancel,
    specimensInGroupToCancel,
}: CancelSpecimenDialogProps) {
    const [cancellationReason, setCancellationReason] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCancellationReason('');
        }
    }, [isOpen]);

    const confirmCancel = () => {
        if (!specimenToCancel) {
            return;
        }

        if (!cancellationReason.trim()) {
            toast.error('El motivo de cancelación es obligatorio.');

            return;
        }

        router.post(
            '/specimens/bulk-action',
            {
                ids: [specimenToCancel.id],
                action: 'change_status',
                value: 'cancelled',
                cancellation_reason: cancellationReason,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Muestra cancelada correctamente');
                    onClose();
                },
                onError: () => {
                    toast.error('Error al cancelar la muestra');
                },
            },
        );
    };

    return (
        <AlertDialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        ¿Cancelar muestra?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <div>
                            Esta acción cambiará el estado de la muestra{' '}
                            <span className="font-mono font-semibold text-foreground">
                                {specimenToCancel?.sequence_code ||
                                    `#${specimenToCancel?.id}`}
                            </span>{' '}
                            a cancelada.
                        </div>

                        {/* Notice about regenerated invoice (before cancel) */}
                        <div className="space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-3 text-left">
                            <h4 className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <FileText className="h-3.5 w-3.5" />
                                Factura a Regenerar
                            </h4>
                            <p className="text-[11px] leading-normal text-muted-foreground">
                                El archivo PDF de la factura se regenerará
                                automáticamente con sus importes originales y el
                                sello "CANCELADO" en la parte inferior.
                            </p>
                        </div>

                        {specimenToCancel?.group_id && (
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3 text-amber-800 dark:border-amber-900/30 dark:text-amber-400">
                                <div className="font-semibold text-amber-900 dark:text-amber-300">
                                    Muestras de Grupo Detectadas
                                </div>
                                <p className="mt-1 text-xs leading-normal">
                                    Esta muestra forma parte de un grupo de
                                    muestras. Al cancelarla,{' '}
                                    <strong className="font-semibold">
                                        todas las muestras de este grupo se
                                        cancelarán
                                    </strong>{' '}
                                    debido a que pertenecen a la misma factura:
                                </p>
                                <ul className="mt-2 space-y-1 pl-1 text-[11px]">
                                    {specimensInGroupToCancel.map(
                                        (spec: any) => (
                                            <li
                                                key={spec.id}
                                                className="flex items-center gap-1.5 font-mono"
                                            >
                                                <span className="h-1 w-1 rounded-full bg-amber-500" />
                                                <span className="font-semibold text-amber-900 dark:text-amber-300">
                                                    {spec.sequence_code ||
                                                        `#${spec.id}`}
                                                </span>
                                                <span className="text-[10px] text-amber-700 dark:text-amber-500">
                                                    ({spec.type?.name} -{' '}
                                                    {spec.examination?.name})
                                                </span>
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-2 space-y-1.5">
                    <Label
                        htmlFor="cancellation_reason"
                        className="text-xs font-medium"
                    >
                        Motivo de cancelación{' '}
                        <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        id="cancellation_reason"
                        placeholder="Escriba el motivo de la cancelación (requerido)..."
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                        rows={3}
                        className="resize-none text-xs"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={() => {
                            setCancellationReason('');
                            onClose();
                        }}
                    >
                        Volver
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={confirmCancel}
                        disabled={!cancellationReason.trim()}
                        className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
                    >
                        Cancelar muestra
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
