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
import { Skeleton } from '@/components/ui/skeleton';
import SpecimenQuickEditForm from './specimen-quick-edit-form';
import { useSpecimenQuickEditMetadata } from './hooks/use-specimen-quick-edit-metadata';

interface Props {
    specimen: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

function FormSkeleton() {
    return (
        <div className="mt-6 animate-pulse space-y-6">
            {/* Warning Banner Skeleton */}
            <div className="h-20 w-full rounded-lg bg-muted/60" />

            {/* Customer Section Skeleton */}
            <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-12" />
                    <Skeleton className="h-3.5 w-28" />
                </div>
                <Skeleton className="h-5 w-48" />
            </div>

            {/* Metadata Section Header */}
            <div className="space-y-4">
                <Skeleton className="h-4 w-32" />

                {/* Sequence Code Skeleton */}
                <div className="h-12 w-full rounded-md border border-dashed bg-muted/20" />

                {/* Remitente Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full" />
                </div>

                {/* Tipo de Muestra & Examenes Skeleton */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="h-20 rounded-lg border bg-muted/20" />
                    <div className="h-20 rounded-lg border bg-muted/20" />
                </div>

                {/* Categoría & Prioridad Skeleton */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>

                {/* Fecha & Estado Skeleton */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>

                {/* File Upload Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <div className="h-32 w-full rounded-lg border-2 border-dashed bg-muted/10" />
                </div>

                {/* Textareas Skeletons */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>

            {/* Save Button Skeleton */}
            <div className="flex justify-end border-t pt-4">
                <Skeleton className="h-10 w-32" />
            </div>
        </div>
    );
}

export default function SpecimenQuickEditSheet({
    specimen,
    open,
    onOpenChange,
    onSuccess,
}: Props) {
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    // Call the hook only when the sheet is open and we have a specimen
    const { metadata, loading } = useSpecimenQuickEditMetadata(
        open && !!specimen,
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
                <SheetContent className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[1000px] lg:max-w-[1100px]">
                    <HeadingSheet
                        title="Editar Muestra"
                        description="Realice cambios rápidos en la información de la muestra aquí."
                    />
                    {open &&
                        specimen &&
                        (loading ? (
                            <FormSkeleton />
                        ) : (
                            <SpecimenQuickEditForm
                                specimen={specimen}
                                metadata={metadata}
                                onSuccess={() => {
                                    setIsFormDirty(false);
                                    onSuccess?.();
                                    onOpenChange(false);
                                }}
                                setIsDirty={setIsFormDirty}
                            />
                        ))}
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
                            Se han modificado datos de la muestra. Si sale sin
                            guardar, los cambios realizados se perderán
                            permanentemente.
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
