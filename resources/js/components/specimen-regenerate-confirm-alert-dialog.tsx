import { Info, Loader2 } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface TemplateOption {
    id: number | string;
    user?: {
        name?: string | null;
    } | null;
    specimen_type?: {
        name?: string | null;
    } | null;
    specimen_type_examination?: {
        name?: string | null;
    } | null;
}

export interface SpecimenRegenerateConfirmAlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isGroupSpecimen: boolean;
    isSpecimenTypeChanged: boolean;
    hasReport: boolean;
    isLoadingTemplates?: boolean;
    availableTemplates?: TemplateOption[];
    selectedTemplateId?: string;
    onTemplateChange?: (templateId: string) => void;
    isSubmitDisabled?: boolean;
    onConfirm: () => void;
}

export function SpecimenRegenerateConfirmAlertDialog({
    open,
    onOpenChange,
    isGroupSpecimen,
    isSpecimenTypeChanged,
    hasReport,
    isLoadingTemplates = false,
    availableTemplates = [],
    selectedTemplateId,
    onTemplateChange,
    isSubmitDisabled = false,
    onConfirm,
}: SpecimenRegenerateConfirmAlertDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="z-[120] max-w-[450px]">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {isGroupSpecimen
                            ? '¿Actualizar muestra y regenerar factura del grupo?'
                            : '¿Actualizar muestra y regenerar factura?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3 text-sm text-muted-foreground">
                            {isGroupSpecimen ? (
                                <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs text-blue-900 dark:text-blue-200">
                                    <span className="mb-1 flex items-center justify-start font-semibold">
                                        <Info className="mr-1 h-4 w-4" />{' '}
                                        Factura de Grupo de Muestras:
                                    </span>
                                    Debido a que esta muestra pertenece a un
                                    grupo de muestras, al guardar los cambios se
                                    regenerará la factura PDF de todo el grupo
                                    para asegurar que contenga los datos más
                                    recientes y actualizados.
                                </div>
                            ) : (
                                <p>
                                    Se guardarán los cambios de la muestra y se
                                    regenerará la factura PDF correspondiente
                                    con los nuevos datos.
                                </p>
                            )}
                            {isSpecimenTypeChanged && (
                                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                                    <span className="mb-1 block font-semibold">
                                        ⚠️ Advertencia de cambio de Tipo/Examen:
                                    </span>
                                    Al cambiar el tipo de muestra o examen, el
                                    código de secuencia será actualizado.
                                    Además, se cargará la plantilla
                                    correspondiente al nuevo examen en el
                                    reporte, lo que significa que{' '}
                                    <strong>
                                        todos los cambios previos realizados en
                                        el reporte se perderán permanentemente.
                                    </strong>
                                </div>
                            )}
                            {isSpecimenTypeChanged && hasReport && (
                                <div className="mt-4 space-y-3 text-left">
                                    <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Seleccionar Nueva Plantilla de Reporte
                                    </label>
                                    {isLoadingTemplates ? (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            <span>Cargando plantillas...</span>
                                        </div>
                                    ) : availableTemplates.length > 0 ? (
                                        <Select
                                            value={selectedTemplateId}
                                            onValueChange={(val) =>
                                                onTemplateChange?.(val)
                                            }
                                        >
                                            <SelectTrigger className="w-full text-foreground">
                                                <SelectValue placeholder="Seleccione una plantilla..." />
                                            </SelectTrigger>
                                            <SelectContent className="z-[200] max-h-[250px]">
                                                {availableTemplates.map(
                                                    (temp) => (
                                                        <SelectItem
                                                            key={temp.id}
                                                            value={String(
                                                                temp.id,
                                                            )}
                                                            className="group"
                                                        >
                                                            <div className="flex flex-row flex-nowrap gap-3 py-1 text-left">
                                                                <span className="text-sm font-medium text-foreground group-focus:text-white group-data-[highlighted]:text-white">
                                                                    {temp.user
                                                                        ?.name ||
                                                                        'Sin propietario'}
                                                                </span>
                                                                <span className="mt-0.5 text-xs text-muted-foreground group-focus:text-white/80 group-data-[highlighted]:text-white/80">
                                                                    {
                                                                        temp
                                                                            .specimen_type
                                                                            ?.name
                                                                    }{' '}
                                                                    -{' '}
                                                                    {
                                                                        temp
                                                                            .specimen_type_examination
                                                                            ?.name
                                                                    }
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-left text-xs text-muted-foreground">
                                            <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
                                            <div>
                                                <span className="mb-0.5 block font-semibold text-foreground">
                                                    Sin plantillas disponibles
                                                </span>
                                                No se encontraron plantillas
                                                para este tipo de muestra y
                                                examen. Se creará un reporte en
                                                blanco.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            onOpenChange(false);
                            onConfirm();
                        }}
                        disabled={isSubmitDisabled}
                    >
                        Actualizar y Regenerar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default SpecimenRegenerateConfirmAlertDialog;
