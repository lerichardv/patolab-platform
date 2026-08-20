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
}

export function StartMicroscopyDialog({
    onConfirm,
}: StartMicroscopyDialogProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="cursor-pointer bg-fuchsia-600 font-semibold text-white shadow-sm hover:bg-fuchsia-700">
                    Iniciar Fase de Microscopía
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        ¿Iniciar fase de microscopía?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción dará por finalizado el procesamiento
                        físico/químico en laboratorio y habilitará la edición de
                        la descripción microscópica y el diagnóstico de forma
                        colaborativa. El estado cambiará a{' '}
                        <strong>Microscopía</strong>.
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
