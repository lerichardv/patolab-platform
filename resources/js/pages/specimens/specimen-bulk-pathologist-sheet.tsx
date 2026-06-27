import { router } from '@inertiajs/react';
import { User, Trash2, Microscope, UserPlus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import HeadingSheet from '@/components/heading-sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

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
    const [macroscopyAccess, setMacroscopyAccess] = useState<boolean>(true);
    const [microscopyAccess, setMicroscopyAccess] = useState<boolean>(true);

    const specimenIds = useMemo(() => {
        return selectedSpecimens.map((s) => s.id);
    }, [selectedSpecimens]);

    const displayedSpecimens = useMemo(() => {
        if (selectedSpecimens.length <= 7) {
            return selectedSpecimens;
        }

        return selectedSpecimens.slice(0, 6);
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
                macroscopy_access: macroscopyAccess,
                microscopy_access: microscopyAccess,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Patólogo asignado en lote correctamente');
                    setSelectedPathologistId('');
                    setMacroscopyAccess(true);
                    setMicroscopyAccess(true);

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

    const handleToggleAccess = (
        userId: number,
        field: 'macroscopy' | 'microscopy',
        checked: boolean,
    ) => {
        const assignedSpecimens = selectedSpecimens.filter((specimen) =>
            specimen.users?.some((u: any) => u.id === userId),
        );

        const currentMacro = assignedSpecimens.every((specimen) => {
            const u = specimen.users?.find((usr: any) => usr.id === userId);

            return u?.pivot?.macroscopy_access
                ? Boolean(u.pivot.macroscopy_access)
                : false;
        });
        const currentMicro = assignedSpecimens.every((specimen) => {
            const u = specimen.users?.find((usr: any) => usr.id === userId);

            return u?.pivot?.microscopy_access
                ? Boolean(u.pivot.microscopy_access)
                : false;
        });

        const macro = field === 'macroscopy' ? checked : currentMacro;
        const micro = field === 'microscopy' ? checked : currentMicro;

        router.post(
            '/specimens/bulk-action',
            {
                ids: specimenIds,
                action: 'assign_pathologist',
                value: userId.toString(),
                macroscopy_access: macro,
                microscopy_access: micro,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success(
                        'Permisos actualizados en lote correctamente',
                    );

                    if (onSuccess) {
                        onSuccess();
                    }
                },
                onError: (errors) => {
                    const message =
                        Object.values(errors)[0] ||
                        'Error al actualizar permisos en lote';
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

                        <div className="flex flex-wrap gap-2 py-1">
                            {displayedSpecimens.map((specimen) => (
                                <div
                                    key={specimen.id}
                                    title={`${specimen.customer_relation?.name || 'Paciente N/A'} - ${specimen.type?.name || 'N/A'}`}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-primary/10"
                                >
                                    <span className="font-mono font-bold">
                                        {specimen.sequence_code ||
                                            `#${specimen.id}`}
                                    </span>
                                    <span className="max-w-[100px] truncate border-l pl-1.5 text-[10px] text-muted-foreground">
                                        {specimen.customer_relation?.name ||
                                            'Paciente N/A'}
                                    </span>
                                </div>
                            ))}

                            {selectedSpecimens.length > 4 && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="inline-flex cursor-pointer items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm transition-all hover:bg-primary/20 focus:outline-none"
                                        >
                                            +{selectedSpecimens.length - 3} más
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-80 p-4"
                                        align="start"
                                    >
                                        <div className="space-y-3">
                                            <h4 className="border-b pb-2 text-sm leading-none font-semibold text-foreground">
                                                Todas las Muestras Seleccionadas
                                                ({selectedSpecimens.length})
                                            </h4>
                                            <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                                                {selectedSpecimens.map(
                                                    (specimen) => (
                                                        <div
                                                            key={specimen.id}
                                                            className="flex items-center justify-between border-b border-border/40 pb-1.5 text-xs last:border-0 last:pb-0"
                                                        >
                                                            <span className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono font-bold text-primary">
                                                                {specimen.sequence_code ||
                                                                    `#${specimen.id}`}
                                                            </span>
                                                            <span
                                                                className="max-w-[150px] truncate font-medium text-foreground"
                                                                title={
                                                                    specimen
                                                                        .customer_relation
                                                                        ?.name
                                                                }
                                                            >
                                                                {specimen
                                                                    .customer_relation
                                                                    ?.name ||
                                                                    'Paciente N/A'}
                                                            </span>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                    </div>

                    {/* Adder Dropdown */}
                    <div className="space-y-3.5 rounded-lg border border-border/60 bg-muted/20 p-4 shadow-sm">
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <UserPlus className="h-4 w-4 text-primary" />{' '}
                            Asignar Nuevo Patólogo
                        </label>
                        {availablePathologists.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                <Select
                                    value={selectedPathologistId}
                                    onValueChange={setSelectedPathologistId}
                                >
                                    <SelectTrigger className="h-11 w-full bg-background">
                                        <SelectValue placeholder="Seleccione un patólogo para agregar a las muestras..." />
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

                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="new-macro-access"
                                                checked={macroscopyAccess}
                                                onCheckedChange={
                                                    setMacroscopyAccess
                                                }
                                            />
                                            <label
                                                htmlFor="new-macro-access"
                                                className="cursor-pointer text-sm leading-none font-medium text-muted-foreground transition-colors hover:text-foreground"
                                            >
                                                Acceso a Macroscopía
                                            </label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="new-micro-access"
                                                checked={microscopyAccess}
                                                onCheckedChange={
                                                    setMicroscopyAccess
                                                }
                                            />
                                            <label
                                                htmlFor="new-micro-access"
                                                className="cursor-pointer text-sm leading-none font-medium text-muted-foreground transition-colors hover:text-foreground"
                                            >
                                                Acceso a Microscopía
                                            </label>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={() =>
                                            handleAssign(selectedPathologistId)
                                        }
                                        disabled={!selectedPathologistId}
                                        className="h-10 px-5 font-semibold"
                                    >
                                        Asignar
                                    </Button>
                                </div>
                            </div>
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
                        <div className="max-h-[300px] w-full overflow-y-auto rounded-lg border border-border/80 bg-card shadow-sm">
                            {assignedPathologists.length > 0 ? (
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead className="sticky top-0 z-10 border-b bg-muted/95 backdrop-blur-sm">
                                            <tr className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                <th className="p-3.5">
                                                    Patólogo y accesos
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

                                                    const isMacroChecked =
                                                        assignedSpecimens.every(
                                                            (specimen) => {
                                                                const u =
                                                                    specimen.users?.find(
                                                                        (
                                                                            usr: any,
                                                                        ) =>
                                                                            usr.id ===
                                                                            user.id,
                                                                    );

                                                                return u?.pivot
                                                                    ?.macroscopy_access
                                                                    ? Boolean(
                                                                          u
                                                                              .pivot
                                                                              .macroscopy_access,
                                                                      )
                                                                    : false;
                                                            },
                                                        );

                                                    const isMicroChecked =
                                                        assignedSpecimens.every(
                                                            (specimen) => {
                                                                const u =
                                                                    specimen.users?.find(
                                                                        (
                                                                            usr: any,
                                                                        ) =>
                                                                            usr.id ===
                                                                            user.id,
                                                                    );

                                                                return u?.pivot
                                                                    ?.microscopy_access
                                                                    ? Boolean(
                                                                          u
                                                                              .pivot
                                                                              .microscopy_access,
                                                                      )
                                                                    : false;
                                                            },
                                                        );

                                                    return (
                                                        <tr
                                                            key={user.id}
                                                            className="transition-colors hover:bg-muted/20"
                                                        >
                                                            <td className="p-3.5 text-left">
                                                                <div className="flex flex-col items-start gap-2.5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm leading-tight font-semibold text-foreground">
                                                                                {
                                                                                    user.name
                                                                                }
                                                                            </span>
                                                                            <span className="text-xs font-normal text-muted-foreground">
                                                                                {
                                                                                    user.email
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-nowrap items-start gap-3">
                                                                        <div className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/30 px-2.5 py-1 text-[11px] transition-colors hover:bg-muted/50">
                                                                            <span className="font-medium text-muted-foreground">
                                                                                Macroscopía
                                                                            </span>
                                                                            <Switch
                                                                                checked={
                                                                                    isMacroChecked
                                                                                }
                                                                                onCheckedChange={(
                                                                                    checked,
                                                                                ) =>
                                                                                    handleToggleAccess(
                                                                                        user.id,
                                                                                        'macroscopy',
                                                                                        checked,
                                                                                    )
                                                                                }
                                                                                title="Alternar acceso a macroscopía en lote"
                                                                                className="scale-90"
                                                                            />
                                                                        </div>
                                                                        <div className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/30 px-2.5 py-1 text-[11px] transition-colors hover:bg-muted/50">
                                                                            <span className="font-medium text-muted-foreground">
                                                                                Microscopía
                                                                            </span>
                                                                            <Switch
                                                                                checked={
                                                                                    isMicroChecked
                                                                                }
                                                                                onCheckedChange={(
                                                                                    checked,
                                                                                ) =>
                                                                                    handleToggleAccess(
                                                                                        user.id,
                                                                                        'microscopy',
                                                                                        checked,
                                                                                    )
                                                                                }
                                                                                title="Alternar acceso a microscopía en lote"
                                                                                className="scale-90"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
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
                                                                    <div className="flex max-w-[280px] flex-wrap justify-center gap-1">
                                                                        {(assignedCount <=
                                                                        4
                                                                            ? assignedSpecimens
                                                                            : assignedSpecimens.slice(
                                                                                  0,
                                                                                  3,
                                                                              )
                                                                        ).map(
                                                                            (
                                                                                specimen,
                                                                            ) => (
                                                                                <div
                                                                                    key={
                                                                                        specimen.id
                                                                                    }
                                                                                    title={`${specimen.customer_relation?.name || 'Paciente N/A'} - ${specimen.type?.name || 'N/A'}`}
                                                                                    className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
                                                                                >
                                                                                    <span className="font-mono font-bold">
                                                                                        {specimen.sequence_code ||
                                                                                            `#${specimen.id}`}
                                                                                    </span>
                                                                                </div>
                                                                            ),
                                                                        )}
                                                                        {assignedCount >
                                                                            4 && (
                                                                            <Popover>
                                                                                <PopoverTrigger
                                                                                    asChild
                                                                                >
                                                                                    <button
                                                                                        type="button"
                                                                                        className="inline-flex cursor-pointer items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-sm transition-all hover:bg-primary/20 focus:outline-none"
                                                                                    >
                                                                                        +
                                                                                        {assignedCount -
                                                                                            3}{' '}
                                                                                        más
                                                                                    </button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent
                                                                                    className="w-80 p-4"
                                                                                    align="center"
                                                                                >
                                                                                    <div className="space-y-3">
                                                                                        <h4 className="border-b pb-2 text-sm leading-none font-semibold text-foreground">
                                                                                            Muestras
                                                                                            Asignadas
                                                                                            a{' '}
                                                                                            {
                                                                                                user.name
                                                                                            }{' '}
                                                                                            (
                                                                                            {
                                                                                                assignedCount
                                                                                            }

                                                                                            )
                                                                                        </h4>
                                                                                        <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                                                                                            {assignedSpecimens.map(
                                                                                                (
                                                                                                    specimen,
                                                                                                ) => (
                                                                                                    <div
                                                                                                        key={
                                                                                                            specimen.id
                                                                                                        }
                                                                                                        className="flex items-center justify-between border-b border-border/40 pb-1.5 text-xs last:border-0 last:pb-0"
                                                                                                    >
                                                                                                        <span className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono font-bold text-primary">
                                                                                                            {specimen.sequence_code ||
                                                                                                                `#${specimen.id}`}
                                                                                                        </span>
                                                                                                        <span
                                                                                                            className="max-w-[150px] truncate font-medium text-foreground"
                                                                                                            title={
                                                                                                                specimen
                                                                                                                    .customer_relation
                                                                                                                    ?.name
                                                                                                            }
                                                                                                        >
                                                                                                            {specimen
                                                                                                                .customer_relation
                                                                                                                ?.name ||
                                                                                                                'Paciente N/A'}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                ),
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </PopoverContent>
                                                                            </Popover>
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
