import { router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar,
    Check,
    Layers,
    Loader2,
    User,
    UserPlus,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { bulkReschedule as bulkRescheduleAction } from '@/actions/App/Http/Controllers/SpecimenBalanceController';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { CalendarDay, SpecimenItem } from '../types';

export interface BalanceBulkActionFormProps {
    onClose: () => void;
    selectedSpecimens: SpecimenItem[];
    initialAction?: 'move_date' | 'assign_pathologist';
    onSuccess?: () => void;
    pathologists?: { id: number; name: string; email: string }[];
    calendarDays?: CalendarDay[];
}

export const BalanceBulkActionForm: React.FC<BalanceBulkActionFormProps> = ({
    onClose,
    selectedSpecimens = [],
    initialAction = 'move_date',
    onSuccess,
    pathologists: propPathologists,
    calendarDays: propCalendarDays,
}) => {
    const pageProps = usePage<any>().props;
    const pathologists: { id: number; name: string; email: string }[] =
        propPathologists || pageProps.pathologists || [];
    const calendarDays: CalendarDay[] =
        propCalendarDays || pageProps.calendarDays || [];

    const [action, setAction] = useState<
        'move_date' | 'assign_pathologist' | 'both'
    >(initialAction);
    const [targetDate, setTargetDate] = useState<string>('');
    const [targetUserId, setTargetUserId] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Multi-assigned specimens warning
    const multiAssignedCount = useMemo(() => {
        return selectedSpecimens.filter(
            (s) => (s.assigned_user_ids?.length || 0) > 1,
        ).length;
    }, [selectedSpecimens]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        if (selectedSpecimens.length === 0) {
            setValidationError('No hay muestras seleccionadas.');

            return;
        }

        const trimmedReason = reason.trim();

        if (!trimmedReason) {
            setValidationError('El motivo del movimiento es obligatorio.');

            return;
        }

        if ((action === 'move_date' || action === 'both') && !targetDate) {
            setValidationError('Debe seleccionar una fecha de destino.');

            return;
        }

        if (
            (action === 'assign_pathologist' || action === 'both') &&
            !targetUserId
        ) {
            setValidationError(
                'Debe seleccionar un patólogo de destino o la opción sin asignar.',
            );

            return;
        }

        setIsSubmitting(true);

        const ids = selectedSpecimens.map((s) => s.id);

        router.post(
            bulkRescheduleAction().url,
            {
                ids,
                action,
                target_date:
                    action === 'move_date' || action === 'both'
                        ? targetDate
                        : null,
                target_user_id:
                    action === 'assign_pathologist' || action === 'both'
                        ? targetUserId
                        : null,
                reason: trimmedReason,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    toast.success(
                        ids.length === 1
                            ? 'Muestra reprogramada correctamente.'
                            : `Se han actualizado ${ids.length} muestras correctamente.`,
                    );
                    onClose();
                    onSuccess?.();
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    const msg =
                        Object.values(errors)[0] ||
                        'Error al actualizar las muestras en lote.';
                    setValidationError(String(msg));
                    toast.error(String(msg));
                },
            },
        );
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden"
        >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4 text-xs">
                {/* Selector de Acción */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                        {selectedSpecimens.length === 1
                            ? 'Tipo de reprogramación'
                            : 'Tipo de acción en lote'}
                    </Label>
                    <Tabs
                        value={action}
                        onValueChange={(val) =>
                            setAction(
                                val as
                                    | 'move_date'
                                    | 'assign_pathologist'
                                    | 'both',
                            )
                        }
                        className="w-full"
                    >
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger
                                value="move_date"
                                className="flex items-center gap-1.5 text-xs"
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Fecha</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="assign_pathologist"
                                className="flex items-center gap-1.5 text-xs"
                            >
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>Patólogo</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="both"
                                className="flex items-center gap-1.5 text-xs"
                            >
                                <Layers className="h-3.5 w-3.5" />
                                <span>Ambas</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Campo: Fecha de Destino (sin wrappers pesados) */}
                {(action === 'move_date' || action === 'both') && (
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="target_date"
                            className="flex items-center gap-1.5 text-xs font-semibold"
                        >
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span>Nueva fecha de entrega interna</span>
                            <span className="text-destructive">*</span>
                        </Label>
                        <DatePicker
                            value={targetDate}
                            onChange={(val) => setTargetDate(val)}
                            placeholder="Seleccione nueva fecha..."
                            className="h-9 w-full text-xs"
                        />

                        {/* Días rápidos sugeridos del calendario */}
                        {calendarDays.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                                <span className="text-[10px] text-muted-foreground">
                                    Rápidos:
                                </span>
                                {calendarDays.slice(0, 5).map((d) => (
                                    <Button
                                        key={d.date}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setTargetDate(d.date)}
                                        className={`h-6 px-2 text-[10px] ${
                                            targetDate === d.date
                                                ? 'border-primary bg-primary/10 font-bold text-primary'
                                                : ''
                                        }`}
                                    >
                                        {d.formatted}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Campo: Reasignar Patólogo (sin wrappers pesados) */}
                {(action === 'assign_pathologist' || action === 'both') && (
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="target_user_id"
                            className="flex items-center gap-1.5 text-xs font-semibold"
                        >
                            <User className="h-3.5 w-3.5 text-amber-500" />
                            <span>Reasignar a patólogo</span>
                            <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={targetUserId}
                            onValueChange={setTargetUserId}
                        >
                            <SelectTrigger
                                id="target_user_id"
                                className="h-9 text-xs"
                            >
                                <SelectValue placeholder="Seleccione patólogo de destino..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">
                                    <span className="font-semibold text-muted-foreground">
                                        Sin asignar (Mover a No Asignados)
                                    </span>
                                </SelectItem>
                                {pathologists.map((p) => (
                                    <SelectItem
                                        key={p.id}
                                        value={p.id.toString()}
                                    >
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {multiAssignedCount > 0 && (
                            <div className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>
                                    {multiAssignedCount}{' '}
                                    {multiAssignedCount === 1
                                        ? 'muestra tiene'
                                        : 'muestras tienen'}{' '}
                                    múltiples patólogos asignados y conservarán
                                    sus asignaciones por seguridad.
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Resumen de muestras seleccionadas */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {selectedSpecimens.length === 1
                            ? 'Muestra a reprogramar:'
                            : `Muestras que serán afectadas (${selectedSpecimens.length}):`}
                    </Label>
                    <div className="max-h-36 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                        <div className="space-y-1.5">
                            {selectedSpecimens.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center justify-between gap-2 rounded bg-card px-2 py-1 text-[11px] shadow-2xs"
                                >
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <span className="font-mono font-bold text-primary">
                                            {s.sequence_code}
                                        </span>
                                        <span className="truncate text-muted-foreground">
                                            {s.customer_name}
                                        </span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                                        <span>{s.internal_date}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Motivo Obligatorio */}
                <div className="space-y-1.5">
                    <Label
                        htmlFor="bulk_move_reason"
                        className="text-xs font-medium"
                    >
                        {selectedSpecimens.length === 1
                            ? 'Motivo de la reprogramación'
                            : 'Motivo del movimiento en lote'}{' '}
                        <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        id="bulk_move_reason"
                        placeholder={
                            selectedSpecimens.length === 1
                                ? 'Indique el motivo por el cual se reprograma esta muestra (ej. retraso de reactivos, solicitud del médico, etc.)...'
                                : 'Indique el motivo por el cual se actualizan estas muestras en lote (ej. redistribución por carga, reasignación por guardia, reprogramación masiva, etc.)...'
                        }
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);

                            if (validationError && e.target.value.trim()) {
                                setValidationError(null);
                            }
                        }}
                        rows={3}
                        className="resize-none text-xs"
                        required
                    />
                    <p className="text-[11px] text-muted-foreground">
                        Este motivo quedará registrado individualmente en el
                        historial de auditoría de cada muestra seleccionada.
                    </p>
                </div>

                {/* Errores de Validación */}
                {validationError && (
                    <div className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{validationError}</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t bg-card/95 px-6 py-3 shadow-md backdrop-blur-xs">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    disabled={isSubmitting}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    size="sm"
                    disabled={
                        isSubmitting ||
                        !reason.trim() ||
                        selectedSpecimens.length === 0 ||
                        ((action === 'move_date' || action === 'both') &&
                            !targetDate) ||
                        ((action === 'assign_pathologist' ||
                            action === 'both') &&
                            !targetUserId)
                    }
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            <span>
                                {selectedSpecimens.length === 1
                                    ? 'Reprogramando...'
                                    : 'Aplicando cambios...'}
                            </span>
                        </>
                    ) : (
                        <>
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            <span>
                                {selectedSpecimens.length === 1
                                    ? 'Reprogramar Muestra'
                                    : `Aplicar a ${selectedSpecimens.length} muestras`}
                            </span>
                        </>
                    )}
                </Button>
            </SheetFooter>
        </form>
    );
};

export default BalanceBulkActionForm;
