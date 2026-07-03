import { usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
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
import { Sheet, SheetContent } from '@/components/ui/sheet';
import InvoiceForm from './invoice-form';

interface Props {
    invoice: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customers: any[];
    banks: any[];
    specimenTypes?: any[];
    settings?: Record<string, string>;
}

export default function InvoiceSheet({
    invoice,
    open,
    onOpenChange,
    customers,
    banks,
    specimenTypes,
    settings,
}: Props) {
    const {
        specimenTypes: pageSpecimenTypes,
        settings: pageSettings,
        examinations: pageExaminations,
    } = usePage<any>().props;
    const finalSpecimenTypes = specimenTypes || pageSpecimenTypes || [];
    const finalExaminations = pageExaminations || [];
    const finalSettings = settings || pageSettings || {};

    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (open && isFormDirty) {
                e.preventDefault();
                e.returnValue = '';

                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [open, isFormDirty]);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            if (isFormDirty) {
                setShowCloseConfirm(true);

                return;
            }
        }

        onOpenChange(newOpen);
    };

    return (
        <>
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[1000px] lg:max-w-[1100px]">
                    <HeadingSheet
                        title="Editar Factura"
                        description="Realice cambios en la información de la factura aquí. Todos los importes y datos de pago pueden ser ajustados."
                    />
                    {invoice && (
                        <InvoiceForm
                            invoice={invoice}
                            customers={customers}
                            banks={banks}
                            specimenTypes={finalSpecimenTypes}
                            examinations={finalExaminations}
                            settings={finalSettings}
                            onSuccess={() => onOpenChange(false)}
                            setIsDirty={setIsFormDirty}
                        />
                    )}
                </SheetContent>
            </Sheet>

            <AlertDialog
                open={showCloseConfirm}
                onOpenChange={setShowCloseConfirm}
            >
                <AlertDialogContent className="max-w-[450px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Estás seguro de salir?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Tiene cambios sin guardar en los datos de la
                            factura. Los cambios se perderán permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setShowCloseConfirm(false)}
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowCloseConfirm(false);
                                onOpenChange(false);
                            }}
                            className="bg-destructive text-destructive-foreground text-white hover:bg-destructive/90"
                        >
                            Sí, salir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
