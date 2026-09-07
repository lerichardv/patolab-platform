import type React from 'react';
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

export interface UnsavedChangesAlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: React.ReactNode;
    isEditing?: boolean;
    editMessage?: string;
    createMessage?: string;
    onConfirm: () => void;
}

export function UnsavedChangesAlertDialog({
    open,
    onOpenChange,
    title = '¿Estás seguro de salir?',
    description,
    isEditing = false,
    editMessage = 'Se han modificado datos. Si sale sin guardar, los cambios realizados se perderán permanentemente.',
    createMessage = 'Todos los datos ingresados se perderán permanentemente.',
    onConfirm,
}: UnsavedChangesAlertDialogProps) {
    const defaultDescription = isEditing ? editMessage : createMessage;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-[450px]">
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description ?? defaultDescription}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-destructive text-destructive-foreground text-white hover:bg-destructive/90"
                    >
                        Sí, salir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default UnsavedChangesAlertDialog;
