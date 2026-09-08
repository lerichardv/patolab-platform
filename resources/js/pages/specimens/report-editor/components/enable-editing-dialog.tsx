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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface EnableEditingDialogProps {
    onConfirm: () => void;
    disabled?: boolean;
}

export function EnableEditingDialog({
    onConfirm,
    disabled = false,
}: EnableEditingDialogProps) {
    const triggerButton = (
        <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
                'border-amber-500/50 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400',
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            )}
        >
            Activar edición
        </Button>
    );

    if (disabled) {
        return (
            <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span
                            tabIndex={0}
                            className="inline-block cursor-not-allowed"
                        >
                            {triggerButton}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                        <p>
                            Solo el administrador o los patólogos asignados a la
                            muestra pueden habilitar la edición.
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{triggerButton}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Activar edición?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción permitirá modificar el diagnóstico, la
                        macroscopía y la microscopía de este reporte finalizado
                        únicamente durante esta sesión.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer">
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="cursor-pointer bg-amber-600 text-white hover:bg-amber-700"
                    >
                        Activar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default EnableEditingDialog;
