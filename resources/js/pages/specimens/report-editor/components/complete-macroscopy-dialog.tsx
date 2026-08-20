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

export interface CompleteMacroscopyDialogProps {
    onConfirm: () => void;
}

export function CompleteMacroscopyDialog({
    onConfirm,
}: CompleteMacroscopyDialogProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="cursor-pointer bg-violet-600 font-semibold text-white shadow-sm hover:bg-violet-700">
                    Completar Macroscopía y Enviar a Procesamiento
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        ¿Confirmar completado de macroscopía?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción marcará la descripción macroscópica como
                        completada y enviará la muestra a la fase de
                        procesamiento en laboratorio. El estado de la muestra
                        cambiará a <strong>Procesando</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="cursor-pointer bg-violet-600 text-white hover:bg-violet-700"
                    >
                        Confirmar y Enviar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default CompleteMacroscopyDialog;
