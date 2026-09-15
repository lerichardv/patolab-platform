import React from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export interface StartMicroscopyDialogProps {
    onConfirm: () => void;
    targetStatusLabel?: string;
    buttonClassName?: string;
    buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
}

export function StartMicroscopyDialog({
    onConfirm,
    targetStatusLabel = 'Microscopía',
    buttonClassName,
    buttonSize,
}: StartMicroscopyDialogProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    size={buttonSize}
                    className={
                        buttonClassName ||
                        'cursor-pointer bg-fuchsia-600 font-semibold text-white shadow-sm hover:bg-fuchsia-700'
                    }
                >
                    Avanzar a {targetStatusLabel}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        ¿Avanzar a {targetStatusLabel}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción dará por finalizada la fase actual y
                        habilitará la siguiente fase ({targetStatusLabel}). El
                        estado cambiará a <strong>{targetStatusLabel}</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="cursor-pointer bg-fuchsia-600 text-white hover:bg-fuchsia-700"
                    >
                        Iniciar Microscopía
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default StartMicroscopyDialog;
