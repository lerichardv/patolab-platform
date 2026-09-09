import { useState } from 'react';
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
import { usePriceQuoteFormData } from '@/hooks/use-price-quote-form-data';
import PriceQuoteForm from './price-quote-form';
import PriceQuoteFormSkeleton from './price-quote-form-skeleton';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    priceQuoteId?: number | string | null;
    onSuccess?: () => void;
}

export default function PriceQuoteSheet({
    open,
    onOpenChange,
    priceQuoteId = null,
    onSuccess,
}: Props) {
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    const {
        data: formData,
        isLoading,
        error,
        refetch,
    } = usePriceQuoteFormData({
        enabled: open,
        priceQuoteId,
    });

    const isDataReady = Boolean(
        formData && formData.specimenTypes && formData.specimenCategories,
    );

    const handleAttemptClose = () => {
        if (isFormDirty) {
            setShowCloseConfirm(true);
        } else {
            onOpenChange(false);
        }
    };

    const isEdit = Boolean(priceQuoteId);

    return (
        <>
            <Sheet
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        handleAttemptClose();
                    } else {
                        onOpenChange(true);
                    }
                }}
            >
                <SheetContent
                    side="right"
                    className="w-full overflow-y-auto sm:max-w-6xl"
                >
                    <HeadingSheet
                        title={
                            isEdit ? 'Editar Cotización' : 'Nueva Cotización'
                        }
                        description={
                            isEdit
                                ? 'Modifique los datos, análisis o valores monetarios de la cotización.'
                                : 'Complete los datos del cliente, exámenes y calcule los importes para generar un presupuesto formal.'
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
                        <PriceQuoteFormSkeleton />
                    ) : (
                        <PriceQuoteForm
                            key={
                                priceQuoteId
                                    ? `edit_quote_${priceQuoteId}`
                                    : 'new_quote'
                            }
                            initialQuote={formData?.priceQuote || null}
                            specimenTypes={formData?.specimenTypes || []}
                            specimenCategories={
                                formData?.specimenCategories || []
                            }
                            examinations={formData?.examinations || []}
                            settings={formData?.settings || {}}
                            onSuccess={() => {
                                setIsFormDirty(false);
                                onOpenChange(false);
                                onSuccess?.();
                            }}
                            setIsDirty={setIsFormDirty}
                        />
                    )}
                </SheetContent>
            </Sheet>

            {/* Dirty Form Confirmation Dialog */}
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
                            Tiene cambios sin guardar en la cotización. Si sale
                            ahora, los cambios se perderán.
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
                                setIsFormDirty(false);
                                onOpenChange(false);
                            }}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Descartar cambios
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
