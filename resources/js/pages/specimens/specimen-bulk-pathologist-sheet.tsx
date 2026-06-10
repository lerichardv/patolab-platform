import { router } from '@inertiajs/react';
import {
    User,
    Trash2,
    Microscope,
    UserPlus,
    Tag,
    AlertCircle,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import HeadingSheet from '@/components/heading-sheet';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface Props {
    selectedSpecimens: any[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pathologists: any[];
    onSuccess?: () => void;
}

export default function SpecimenBulkPathologistSheet({
    selectedSpecimens = [],
    open,
    onOpenChange,
    pathologists = [],
    onSuccess,
}: Props) {
    const [selectedPathologistId, setSelectedPathologistId] =
        useState<string>('');

    const specimenIds = useMemo(() => {
        return selectedSpecimens.map((s) => s.id);
    }, [selectedSpecimens]);

    // Pathologists that are assigned to at least one of the selected specimens
    const assignedPathologists = useMemo(() => {
        const assignedIds = new Set<number>();
        selectedSpecimens.forEach((specimen) => {
            specimen.users?.forEach((u: any) => {
                assignedIds.add(u.id);
            });
        });

        return pathologists.filter((p) => assignedIds.has(p.id));
    }, [pathologists, selectedSpecimens]);

    // Pathologists that are NOT assigned to all of the selected specimens
    const availablePathologists = useMemo(() => {
        return pathologists.filter((p) => {
            // If not assigned to at least one specimen, or if we want to show it to add to the rest
            // Let's show all pathologists that are not already assigned to *every* selected specimen
            const assignedCount = selectedSpecimens.filter((specimen) =>
                specimen.users?.some((u: any) => u.id === p.id),
            ).length;

            return assignedCount < selectedSpecimens.length;
        });
    }, [pathologists, selectedSpecimens]);

    const handleAssign = (userId: string) => {
        if (!userId || specimenIds.length === 0) {
            return;
        }

        router.post(
            '/specimens/bulk-action',
            {
                ids: specimenIds,
                action: 'assign_pathologist',
                value: userId,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Patólogo asignado en lote correctamente');
                    setSelectedPathologistId('');

                    if (onSuccess) {
                        onSuccess();
                    }
                },
                onError: (errors) => {
                    const message =
                        Object.values(errors)[0] ||
                        'Error al asignar patólogo en lote';
                    toast.error(message);
                },
            },
        );
    };

    const handleUnassign = (userId: number) => {
        if (specimenIds.length === 0) {
            return;
        }

        router.post(
            '/specimens/bulk-action',
            {
                ids: specimenIds,
                action: 'unassign_pathologist',
                value: userId,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Patólogo desasignado en lote correctamente');

                    if (onSuccess) {
                        onSuccess();
                    }
                },
                onError: (errors) => {
                    const message =
                        Object.values(errors)[0] ||
                        'Error al desasignar patólogo en lote';
                    toast.error(message);
                },
            },
        );
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[650px] lg:max-w-[750px]">
                {/* Header */}
                <div className="border-b pr-12 pb-4">
                    <HeadingSheet
                        title="Asignar Patólogo en Bulk"
                        description="Asigne o desasigne patólogos en lote para las muestras seleccionadas."
                    />
                </div>

                <div className="mt-4 flex h-full flex-col gap-6 px-5 pr-2 pb-8">
                    {/* Selected Specimens Summary */}
                    <div className="space-y-4 rounded-lg border border-border/80 bg-muted/30 p-5 shadow-sm">
                        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-primary uppercase">
                            <Microscope className="h-4 w-4 text-primary" />{' '}
                            Muestras Seleccionadas ({selectedSpecimens.length})
                        </h3>
                        <Separator className="opacity-60" />

                        <div className="max-h-[150px] space-y-2 overflow-y-auto pr-2">
                            {selectedSpecimens.map((specimen) => (
                                <div
                                    key={specimen.id}
                                    className="flex items-center justify-between border-b border-border/40 pb-1.5 text-sm last:border-0 last:pb-0"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-xs font-bold text-primary">
                                            {specimen.sequence_code ||
                                                `#${specimen.id}`}
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {specimen.customer_relation?.name ||
                                                'Paciente N/A'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {specimen.type?.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Adder Dropdown */}
                    <div className="space-y-2.5">
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <UserPlus className="h-4 w-4 text-primary" />{' '}
                            Asignar Nuevo Patólogo
                        </label>
                        {availablePathologists.length > 0 ? (
                            <Select
                                value={selectedPathologistId}
                                onValueChange={(val) => {
                                    setSelectedPathologistId(val);
                                    handleAssign(val);
                                }}
                            >
                                <SelectTrigger className="h-11 w-full">
                                    <SelectValue placeholder="Seleccione un patólogo para asignar a las muestras..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availablePathologists.map((p) => (
                                        <SelectItem
                                            key={p.id}
                                            value={p.id.toString()}
                                        >
                                            {p.name} ({p.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="rounded-md border border-dashed bg-muted/40 p-3.5 text-center text-xs text-muted-foreground">
                                Todos los patólogos disponibles ya están
                                asignados a todas las muestras seleccionadas.
                            </div>
                        )}
                    </div>

                    {/* Assigned Pathologists List Table */}
                    <div className="flex min-h-0 flex-1 flex-col space-y-2.5">
                        <label className="text-sm font-semibold text-foreground">
                            Patólogos Asignados (a una o más de las muestras
                            seleccionadas)
                        </label>
                        <div className="min-h-[180px] flex-1 overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
                            {assignedPathologists.length > 0 ? (
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                <th className="p-3.5">
                                                    Nombre
                                                </th>
                                                <th className="p-3.5">
                                                    Correo Electrónico
                                                </th>
                                                <th className="p-3.5 text-center">
                                                    Asignaciones
                                                </th>
                                                <th className="w-20 p-3.5 text-right">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {assignedPathologists.map(
                                                (user: any) => {
                                                    const assignedSpecimens =
                                                        selectedSpecimens.filter(
                                                            (specimen) =>
                                                                specimen.users?.some(
                                                                    (u: any) =>
                                                                        u.id ===
                                                                        user.id,
                                                                ),
                                                        );
                                                    const assignedCount =
                                                        assignedSpecimens.length;

                                                    return (
                                                        <tr
                                                            key={user.id}
                                                            className="transition-colors hover:bg-muted/20"
                                                        >
                                                            <td className="p-3.5 font-medium text-foreground">
                                                                {user.name}
                                                            </td>
                                                            <td className="p-3.5 text-muted-foreground">
                                                                {user.email}
                                                            </td>
                                                            <td className="p-3.5 text-center font-medium">
                                                                <div className="flex flex-col items-center gap-1.5">
                                                                    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                                                        {
                                                                            assignedCount
                                                                        }{' '}
                                                                        /{' '}
                                                                        {
                                                                            selectedSpecimens.length
                                                                        }
                                                                    </span>
                                                                    <div className="flex max-w-[220px] flex-wrap justify-center gap-1">
                                                                        {assignedSpecimens.map(
                                                                            (
                                                                                specimen,
                                                                            ) => (
                                                                                <span
                                                                                    key={
                                                                                        specimen.id
                                                                                    }
                                                                                    title={`${specimen.sequence_code || `#${specimen.id}`} - ${specimen.customer_relation?.name || 'Paciente N/A'}`}
                                                                                    className="inline-flex cursor-help items-center rounded border border-border/60 bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground transition-colors hover:bg-secondary/80"
                                                                                >
                                                                                    {specimen.sequence_code ||
                                                                                        `#${specimen.id}`}
                                                                                </span>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-3.5 text-right">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                                    onClick={() =>
                                                                        handleUnassign(
                                                                            user.id,
                                                                        )
                                                                    }
                                                                    title="Eliminar asignación en todas las seleccionadas"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    );
                                                },
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center space-y-2 px-4 py-12 text-center">
                                    <div className="rounded-full bg-muted/60 p-3">
                                        <User className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <h4 className="text-sm font-semibold text-foreground">
                                        Sin patólogos asignados
                                    </h4>
                                    <p className="max-w-xs text-xs text-muted-foreground">
                                        Ninguno de las muestras seleccionadas
                                        tiene patólogos asignados. Utilice el
                                        selector de arriba para añadir uno.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Close Button */}
                    <div className="flex justify-end border-t pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => onOpenChange(false)}
                            className="h-10 px-6 font-medium"
                        >
                            Cerrar
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
