import { lazy, Suspense, useEffect, useState } from 'react';
import HeadingSheet from '@/components/heading-sheet';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import UnsavedChangesAlertDialog from '@/components/unsaved-changes-alert-dialog';
import {
    SpecimenFormDataContext,
    useSpecimenFormData,
} from '@/hooks/use-specimen-form-data';
import SpecimenFormSkeleton from './specimen-form-skeleton';

const SpecimenForm = lazy(() => import('./specimen-form'));

interface Props {
    specimen?: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    showPaymentMethodEdition?: boolean;
    readOnlySampleCollectionDate?: boolean;
}

export default function SpecimenSheet({
    specimen = null,
    open,
    onOpenChange,
    onSuccess,
    showPaymentMethodEdition,
    readOnlySampleCollectionDate,
}: Props) {
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    const {
        data: formData,
        isLoading,
        error,
        refetch,
    } = useSpecimenFormData({
        enabled: open,
        specimenId: specimen?.id,
    });

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

    const isDataReady = Boolean(formData);
    const resolvedSpecimen = formData?.specimen || specimen || null;

    return (
        <>
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[1000px] lg:max-w-[1100px]">
                    <HeadingSheet
                        title={
                            resolvedSpecimen || specimen
                                ? 'Editar Muestra'
                                : 'Nueva Muestra'
                        }
                        description={
                            resolvedSpecimen || specimen
                                ? 'Realice cambios en la información de la muestra aquí.'
                                : 'Complete el formulario para registrar una nueva muestra en el sistema.'
                        }
                    />

                    {error && !isDataReady ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                            <p className="text-sm font-medium text-destructive">
                                {error}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                            >
                                Reintentar
                            </Button>
                        </div>
                    ) : !isDataReady || isLoading ? (
                        <SpecimenFormSkeleton
                            isEditing={!!(resolvedSpecimen || specimen)}
                        />
                    ) : (
                        <SpecimenFormDataContext.Provider value={formData}>
                            <Suspense
                                fallback={
                                    <SpecimenFormSkeleton
                                        isEditing={
                                            !!(resolvedSpecimen || specimen)
                                        }
                                    />
                                }
                            >
                                <SpecimenForm
                                    key={
                                        resolvedSpecimen
                                            ? `specimen_form_${resolvedSpecimen.id}_${resolvedSpecimen.sample_collection_date || ''}`
                                            : 'new_specimen_form'
                                    }
                                    specimen={resolvedSpecimen}
                                    onSuccess={() => {
                                        setIsFormDirty(false);
                                        onSuccess?.();
                                        onOpenChange(false);
                                    }}
                                    setIsDirty={setIsFormDirty}
                                    showPaymentMethodEdition={
                                        showPaymentMethodEdition
                                    }
                                    readOnlySampleCollectionDate={
                                        readOnlySampleCollectionDate
                                    }
                                />
                            </Suspense>
                        </SpecimenFormDataContext.Provider>
                    )}
                </SheetContent>
            </Sheet>

            <UnsavedChangesAlertDialog
                open={showCloseConfirm}
                onOpenChange={setShowCloseConfirm}
                isEditing={!!(resolvedSpecimen || specimen)}
                editMessage="Se han modificado datos o los exámenes de la muestra. Si sale sin guardar, los cambios realizados se perderán permanentemente."
                createMessage="Todos los datos ingresados en la nueva muestra se perderán permanentemente."
                onConfirm={() => {
                    setShowCloseConfirm(false);
                    setIsFormDirty(false);
                    onOpenChange(false);
                }}
            />
        </>
    );
}
