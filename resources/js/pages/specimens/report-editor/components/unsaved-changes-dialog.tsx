import { Loader2, Save } from 'lucide-react';

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export interface UnsavedChangesDialogProps {
    open: boolean;
    /** Whether a save is currently in flight (disables all buttons). */
    isSaving: boolean;
    /** Close without any navigation. */
    onCancel: () => void;
    /** Navigate away immediately without saving. */
    onLeave: () => void;
    /** Save first, then navigate. Returns a promise — dialog stays open until resolved. */
    onSaveAndLeave: () => Promise<void>;
}

/**
 * Confirmation dialog shown when the user tries to navigate away from the
 * report editor while there are unsaved changes.
 *
 * Button order (left → right):
 *   1. Cancelar      — stay on the page (neutral)
 *   2. Salir sin guardar — red outline, discard changes
 *   3. Guardar y salir  — green, save then navigate (primary action)
 */
export function UnsavedChangesDialog({
    open,
    isSaving,
    onCancel,
    onLeave,
    onSaveAndLeave,
}: UnsavedChangesDialogProps) {
    return (
        <AlertDialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    onCancel();
                }
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        ¿Salir sin guardar los cambios?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Tienes cambios sin guardar en el reporte. Si sales
                        ahora, podrías perder los últimos cambios realizados.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    {/* 1. Cancelar — neutral, stay on the page */}
                    <Button
                        variant="outline"
                        disabled={isSaving}
                        onClick={onCancel}
                    >
                        Cancelar
                    </Button>

                    {/* 2. Salir sin guardar — destructive outline */}
                    <Button
                        variant="outline"
                        disabled={isSaving}
                        className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={onLeave}
                    >
                        Salir sin guardar
                    </Button>

                    {/* 3. Guardar y salir — green primary action (rightmost) */}
                    <Button
                        disabled={isSaving}
                        className="bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600"
                        onClick={onSaveAndLeave}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Guardar y salir
                            </>
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
