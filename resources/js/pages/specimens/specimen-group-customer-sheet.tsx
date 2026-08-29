import { useEffect, useState } from 'react';
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
import SpecimenGroupCustomerForm from './specimen-group-customer-form';

interface Props {
    groupId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export default function SpecimenGroupCustomerSheet({
    groupId,
    open,
    onOpenChange,
    onSuccess,
}: Props) {
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
                <SheetContent className="w-full overflow-y-auto sm:max-w-[600px] md:max-w-[700px] lg:max-w-[750px]">
                    <HeadingSheet
                        title="Cambiar Cliente del Grupo"
                        description="Actualice el cliente principal asignado al grupo de muestras, su factura y crédito asociados."
                    />
                    {open && groupId && (
                        <SpecimenGroupCustomerForm
                            groupId={groupId}
                            onSuccess={() => {
                                setIsFormDirty(false);
                                onSuccess?.();
                                onOpenChange(false);
                            }}
                            onCancel={() => handleOpenChange(false)}
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
                            Ha seleccionado un cliente diferente para el grupo. Si sale sin guardar, los cambios se perderán.
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
                                setIsFormDirty(false);
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
