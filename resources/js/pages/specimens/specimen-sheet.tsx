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
import SpecimenForm from './specimen-form';

interface Props {
    specimen: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    specimenTypes: any[];
    examinations: any[];
    categories: any[];
    referrers: any[];
    referrerTypes: any[];
    priorities: any[];
    locations: any[];
    sequences: any[];
    activeLocationId: number | null;
    products: any[];
    banks: any[];
}

export default function SpecimenSheet({
    specimen,
    open,
    onOpenChange,
    specimenTypes,
    examinations,
    categories,
    referrers,
    referrerTypes,
    priorities,
    locations,
    sequences,
    activeLocationId,
    products,
    banks,
}: Props) {
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (open && !specimen && isFormDirty) {
                e.preventDefault();
                e.returnValue = '';

                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [open, specimen, isFormDirty]);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            if (!specimen && isFormDirty) {
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
                        title={specimen ? 'Editar Muestra' : 'Nueva Muestra'}
                        description={
                            specimen
                                ? 'Realice cambios en la información de la muestra aquí.'
                                : 'Complete el formulario para registrar una nueva muestra en el sistema.'
                        }
                    />
                    <SpecimenForm
                        specimen={specimen}
                        onSuccess={() => onOpenChange(false)}
                        setIsDirty={setIsFormDirty}
                        specimenTypes={specimenTypes}
                        examinations={examinations}
                        categories={categories}
                        referrers={referrers}
                        referrerTypes={referrerTypes}
                        priorities={priorities}
                        locations={locations}
                        sequences={sequences}
                        activeLocationId={activeLocationId}
                        products={products}
                        banks={banks}
                    />
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
                            Todos los datos ingresados en la nueva muestra se
                            perderán permanentemente.
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
