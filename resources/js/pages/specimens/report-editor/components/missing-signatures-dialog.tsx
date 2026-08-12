import { AlertCircle } from 'lucide-react';
import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MissingSignaturesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unsignedPathologists: Array<{ id: number; name: string }>;
}

export const MissingSignaturesDialog: React.FC<
    MissingSignaturesDialogProps
> = ({ open, onOpenChange, unsignedPathologists }) => {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader className="flex flex-col items-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <AlertDialogTitle className="mt-3 text-center text-lg font-bold text-slate-900 dark:text-slate-100">
                        {'Firmas Requeridas Faltantes'}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                        {
                            'No se puede finalizar el reporte porque algunos patólogos asignados aún no han configurado su firma en su perfil de usuario:'
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-4 max-h-[150px] overflow-y-auto rounded-md border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <ul className="space-y-2">
                        {unsignedPathologists.map((pathologist) => (
                            <li
                                key={pathologist.id}
                                className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                {pathologist.name}
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="mb-2 text-center text-xs text-muted-foreground">
                    {
                        'Por favor, asegúrese de que todos los patólogos agreguen su firma dibujándola o subiendo un archivo PNG transparente en su sección de Ajustes de Perfil antes de intentar finalizar.'
                    }
                </p>
                <AlertDialogFooter className="sm:justify-center">
                    <AlertDialogAction
                        onClick={() => onOpenChange(false)}
                        className="w-full cursor-pointer bg-amber-600 font-semibold text-white hover:bg-amber-700 sm:w-auto"
                    >
                        {'Entendido'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
