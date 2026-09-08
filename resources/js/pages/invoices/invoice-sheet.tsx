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
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useInvoiceFormData } from '@/hooks/use-invoice-form-data';
import GroupInvoiceForm from './group-invoice-form';
import InvoiceForm from './invoice-form';
import InvoiceFormSkeleton from './invoice-form-skeleton';

interface Props {
    invoice?: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    banks?: any[];
    specimenTypes?: any[];
    settings?: Record<string, string>;
}

export default function InvoiceSheet({
    invoice = null,
    open,
    onOpenChange,
    banks,
    specimenTypes,
    settings,
}: Props) {
    const {
        specimenTypes: pageSpecimenTypes,
        settings: pageSettings,
        examinations: pageExaminations,
    } = usePage<any>().props;

    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    const {
        data: formData,
        isLoading,
        error,
        refetch,
    } = useInvoiceFormData({
        enabled: open,
        invoiceId: invoice?.id,
    });

    const isDataReady = Boolean(
        formData ||
        (banks && banks.length > 0 && (specimenTypes || pageSpecimenTypes)),
    );

    const resolvedInvoice = formData?.invoice || invoice;
    const resolvedBanks = formData?.banks || banks || [];
    const resolvedSpecimenTypes =
        formData?.specimenTypes || specimenTypes || pageSpecimenTypes || [];
    const resolvedExaminations =
        formData?.examinations || pageExaminations || [];
    const resolvedSettings =
        formData?.settings || settings || pageSettings || {};

    const isGroupInvoice = Boolean(
        resolvedInvoice &&
        (resolvedInvoice.is_group === true ||
            resolvedInvoice.is_group === 1 ||
            resolvedInvoice.is_group === '1' ||
            Boolean(resolvedInvoice.group_id) ||
            Boolean(resolvedInvoice.specimen_group_id) ||
            Boolean(resolvedInvoice.group) ||
            resolvedInvoice.specimen?.is_group === true ||
            resolvedInvoice.specimen?.is_group === 1),
    );

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
                <SheetContent className="w-full overflow-y-auto pb-12 sm:max-w-[90vw] md:max-w-[1000px] lg:max-w-[1100px]">
                    <HeadingSheet
                        title={
                            isGroupInvoice
                                ? 'Editar Factura Grupal'
                                : 'Editar Factura Individual'
                        }
                        description="Realice cambios en la información de la factura aquí. Todos los importes y datos de pago pueden ser ajustados."
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
                        <InvoiceFormSkeleton isGroupInvoice={isGroupInvoice} />
                    ) : resolvedInvoice ? (
                        isGroupInvoice ? (
                            <GroupInvoiceForm
                                key={`group_invoice_${resolvedInvoice.id}`}
                                invoice={resolvedInvoice}
                                banks={resolvedBanks}
                                specimenTypes={resolvedSpecimenTypes}
                                examinations={resolvedExaminations}
                                settings={resolvedSettings}
                                onSuccess={() => {
                                    setIsFormDirty(false);
                                    onOpenChange(false);
                                }}
                                setIsDirty={setIsFormDirty}
                            />
                        ) : (
                            <InvoiceForm
                                key={`invoice_${resolvedInvoice.id}`}
                                invoice={resolvedInvoice}
                                banks={resolvedBanks}
                                specimenTypes={resolvedSpecimenTypes}
                                examinations={resolvedExaminations}
                                settings={resolvedSettings}
                                onSuccess={() => {
                                    setIsFormDirty(false);
                                    onOpenChange(false);
                                }}
                                setIsDirty={setIsFormDirty}
                            />
                        )
                    ) : null}
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
