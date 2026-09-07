import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    User,
    Trash2,
    Microscope,
    Share2,
    Tag,
    AlertCircle,
    Clock,
} from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { usePathologistFormData } from '@/hooks/use-pathologist-form-data';
import SpecimenPathologistSkeleton from './specimen-pathologist-skeleton';

interface Props {
    specimen: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pathologists?: any[];
    usersList?: any[];
}

export default function SpecimenCollaboratorSheet({
    specimen: initialSpecimen,
    open,
    onOpenChange,
    pathologists = [],
    usersList = [],
}: Props) {
    const { data: formData, isLoading } = usePathologistFormData({
        enabled: open,
        specimenId: initialSpecimen?.id,
    });

    const [localCollaborators, setLocalCollaborators] = useState<any[] | null>(
        null,
    );
    const [localUsers, setLocalUsers] = useState<any[] | null>(null);
    const [prevSpecimenId, setPrevSpecimenId] = useState<number | undefined>(
        initialSpecimen?.id,
    );
    const [isAssigning, setIsAssigning] = useState(false);
    const hasMutatedRef = useRef(false);

    if (initialSpecimen?.id !== prevSpecimenId) {
        setPrevSpecimenId(initialSpecimen?.id);
        setLocalCollaborators(null);
        setLocalUsers(null);
    }

    const users = useMemo(() => {
        return (
            localUsers ??
            formData?.specimen?.users ??
            initialSpecimen?.users ??
            []
        );
    }, [localUsers, formData?.specimen?.users, initialSpecimen?.users]);

    const collaborators = useMemo(() => {
        return (
            localCollaborators ??
            formData?.specimen?.collaborators ??
            initialSpecimen?.collaborators ??
            []
        );
    }, [
        localCollaborators,
        formData?.specimen?.collaborators,
        initialSpecimen?.collaborators,
    ]);

    const specimen = useMemo(() => {
        const base = formData?.specimen || initialSpecimen;

        if (!base) {
            return null;
        }

        return {
            ...base,
            users,
            collaborators,
        };
    }, [formData?.specimen, initialSpecimen, users, collaborators]);

    const resolvedUsers = useMemo(() => {
        if (formData?.usersList && formData.usersList.length > 0) {
            return formData.usersList;
        }

        if (usersList && usersList.length > 0) {
            return usersList;
        }

        if (pathologists && pathologists.length > 0) {
            return pathologists;
        }

        return formData?.pathologists || [];
    }, [formData, usersList, pathologists]);

    const [selectedCollaboratorId, setSelectedCollaboratorId] =
        useState<string>('');
    const [collabMacroscopyAccess, setCollabMacroscopyAccess] =
        useState<boolean>(true);
    const [collabMicroscopyAccess, setCollabMicroscopyAccess] =
        useState<boolean>(true);

    const assignedCollaboratorIds = useMemo(() => {
        return specimen?.collaborators?.map((c: any) => c.id) || [];
    }, [specimen?.collaborators]);

    const availableCollaborators = useMemo(() => {
        return resolvedUsers.filter(
            (u: any) => !assignedCollaboratorIds.includes(u.id),
        );
    }, [resolvedUsers, assignedCollaboratorIds]);

    const handleAssignCollaborator = async (userId: string) => {
        if (!userId || !specimen?.id || isAssigning) {
            return;
        }

        setIsAssigning(true);

        try {
            const response = await axios.post(
                `/specimens/${specimen.id}/assign-collaborator`,
                {
                    user_id: userId,
                    macroscopy_access: collabMacroscopyAccess,
                    microscopy_access: collabMicroscopyAccess,
                },
                {
                    headers: { Accept: 'application/json' },
                },
            );

            if (response.data.users) {
                setLocalUsers(response.data.users);
            }

            if (response.data.collaborators) {
                setLocalCollaborators(response.data.collaborators);
            }

            hasMutatedRef.current = true;
            toast.success(
                response.data.message || 'Colaborador asignado correctamente',
            );
            setSelectedCollaboratorId('');
            setCollabMacroscopyAccess(true);
            setCollabMicroscopyAccess(true);
        } catch (error: any) {
            const message =
                error.response?.data?.message || 'Error al asignar colaborador';
            toast.error(message);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleToggleCollaboratorAccess = async (
        userId: number,
        field: 'macroscopy' | 'microscopy',
        checked: boolean,
    ) => {
        const targetCollab = specimen?.collaborators?.find(
            (c: any) => c.id === userId,
        );

        if (!targetCollab || !specimen?.id) {
            return;
        }

        const currentMacro =
            targetCollab.pivot?.macroscopy_access !== undefined
                ? Boolean(targetCollab.pivot.macroscopy_access)
                : false;
        const currentMicro =
            targetCollab.pivot?.microscopy_access !== undefined
                ? Boolean(targetCollab.pivot.microscopy_access)
                : false;

        const macro = field === 'macroscopy' ? checked : currentMacro;
        const micro = field === 'microscopy' ? checked : currentMicro;

        // Optimistic update
        setLocalCollaborators((prev) =>
            (prev || collaborators).map((c: any) =>
                c.id === userId
                    ? {
                          ...c,
                          pivot: {
                              ...c.pivot,
                              macroscopy_access: macro,
                              microscopy_access: micro,
                          },
                      }
                    : c,
            ),
        );

        try {
            const response = await axios.post(
                `/specimens/${specimen.id}/assign-collaborator`,
                {
                    user_id: userId,
                    macroscopy_access: macro,
                    microscopy_access: micro,
                },
                {
                    headers: { Accept: 'application/json' },
                },
            );

            if (response.data.users) {
                setLocalUsers(response.data.users);
            }

            if (response.data.collaborators) {
                setLocalCollaborators(response.data.collaborators);
            }

            hasMutatedRef.current = true;
            toast.success(
                response.data.message || 'Permisos de colaborador actualizados',
            );
        } catch (error: any) {
            // Revert optimistic update
            setLocalCollaborators((prev) =>
                (prev || collaborators).map((c: any) =>
                    c.id === userId
                        ? {
                              ...c,
                              pivot: {
                                  ...c.pivot,
                                  macroscopy_access: currentMacro,
                                  microscopy_access: currentMicro,
                              },
                          }
                        : c,
                ),
            );
            const message =
                error.response?.data?.message || 'Error al actualizar permisos';
            toast.error(message);
        }
    };

    const handleUnassignCollaborator = async (userId: number) => {
        if (!specimen?.id) {
            return;
        }

        try {
            const response = await axios.post(
                `/specimens/${specimen.id}/unassign-collaborator`,
                { user_id: userId },
                {
                    headers: { Accept: 'application/json' },
                },
            );

            if (response.data.users) {
                setLocalUsers(response.data.users);
            }

            if (response.data.collaborators) {
                setLocalCollaborators(response.data.collaborators);
            }

            hasMutatedRef.current = true;
            toast.success(
                response.data.message ||
                    'Colaborador desasignado correctamente',
            );
        } catch (error: any) {
            const message =
                error.response?.data?.message ||
                'Error al desasignar colaborador';
            toast.error(message);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && hasMutatedRef.current) {
            hasMutatedRef.current = false;
            router.reload({
                only: ['assignments', 'priorities', 'specimen', 'specimens'],
            });
        }

        onOpenChange(newOpen);
    };

    if (!initialSpecimen && !open) {
        return null;
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[650px] lg:max-w-[750px]">
                {/* Header */}
                <div className="border-b pr-12 pb-4">
                    <HeadingSheet
                        title="Asignar Colaboradores"
                        description="Administre la asignación de colaboradores y asistentes para esta muestra."
                    />
                </div>

                {isLoading && !formData && pathologists.length === 0 ? (
                    <SpecimenPathologistSkeleton />
                ) : !specimen ? null : (
                    <div className="flex h-full flex-col gap-6 px-5 pr-2 pb-8">
                        {/* Specimen Resume */}
                        <div className="space-y-4 rounded-lg border border-border/80 bg-muted/30 p-5 shadow-sm">
                            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-primary uppercase">
                                <Microscope className="h-4 w-4 text-primary" />{' '}
                                Resumen de la Muestra
                            </h3>
                            <Separator className="opacity-60" />

                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                                {specimen.sequence_code && (
                                    <div className="space-y-1">
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Tag className="h-3.5 w-3.5" />{' '}
                                            Código de Secuencia
                                        </span>
                                        <p className="font-mono font-bold text-primary">
                                            {specimen.sequence_code}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <User className="h-3.5 w-3.5" />{' '}
                                        Paciente
                                    </span>
                                    <p className="font-medium text-foreground">
                                        {specimen.customer_relation?.name ||
                                            'N/A'}
                                    </p>
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <span className="text-xs text-muted-foreground">
                                        Examen
                                    </span>
                                    <p className="font-medium text-foreground">
                                        {specimen.type?.name} -{' '}
                                        {specimen.examination?.name}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5" /> Estado
                                    </span>
                                    <div>
                                        <span
                                            className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                                            style={{
                                                backgroundColor:
                                                    specimen.status_color ||
                                                    '#cbd5e1',
                                            }}
                                        >
                                            {specimen.status === 'received'
                                                ? 'Recibida'
                                                : specimen.status ===
                                                    'macroscopic_review'
                                                  ? 'Rev. Macroscópica'
                                                  : specimen.status ===
                                                      'processing'
                                                    ? 'En Proceso'
                                                    : specimen.status ===
                                                        'microscopic_review'
                                                      ? 'Rev. Microscópica'
                                                      : specimen.status ===
                                                          'finalized'
                                                        ? 'Finalizada'
                                                        : specimen.status ===
                                                            'delivered'
                                                          ? 'Entregada'
                                                          : specimen.status ===
                                                              'cancelled'
                                                            ? 'Cancelada'
                                                            : specimen.status}
                                        </span>
                                    </div>
                                </div>

                                {specimen.priority && (
                                    <div className="space-y-1">
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <AlertCircle className="h-3.5 w-3.5" />{' '}
                                            Prioridad
                                        </span>
                                        <div className="mt-0.5 flex items-center gap-2">
                                            <div
                                                className="h-3 w-3 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        specimen.priority
                                                            .color || '#cbd5e1',
                                                }}
                                            />
                                            <span className="font-medium">
                                                {specimen.priority.name}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Collaborator Section */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    Los colaboradores pueden visualizar y editar
                                    el reporte de la muestra según los accesos
                                    otorgados, pero no generarán comisión por el
                                    diagnóstico.
                                </p>
                            </div>

                            {/* Collaborator Dropdown & switches */}
                            <div className="space-y-3.5 rounded-lg border border-border/60 bg-muted/20 p-4 shadow-sm">
                                <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <Share2 className="h-4 w-4 text-primary" />{' '}
                                    Asignar Nuevo Colaborador
                                </label>
                                {availableCollaborators.length > 0 ? (
                                    <div className="flex flex-col gap-4">
                                        <Select
                                            value={selectedCollaboratorId}
                                            onValueChange={
                                                setSelectedCollaboratorId
                                            }
                                        >
                                            <SelectTrigger className="h-11 w-full bg-background">
                                                <SelectValue placeholder="Seleccione un colaborador para agregar a la muestra..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableCollaborators.map(
                                                    (p) => (
                                                        <SelectItem
                                                            key={p.id}
                                                            value={p.id.toString()}
                                                        >
                                                            {p.name} ({p.email})
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>

                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="new-collab-macro-access-sheet"
                                                        checked={
                                                            collabMacroscopyAccess
                                                        }
                                                        onCheckedChange={
                                                            setCollabMacroscopyAccess
                                                        }
                                                    />
                                                    <label
                                                        htmlFor="new-collab-macro-access-sheet"
                                                        className="cursor-pointer text-sm leading-none font-medium text-muted-foreground transition-colors hover:text-foreground"
                                                    >
                                                        Acceso a Macroscopía
                                                    </label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="new-collab-micro-access-sheet"
                                                        checked={
                                                            collabMicroscopyAccess
                                                        }
                                                        onCheckedChange={
                                                            setCollabMicroscopyAccess
                                                        }
                                                    />
                                                    <label
                                                        htmlFor="new-collab-micro-access-sheet"
                                                        className="cursor-pointer text-sm leading-none font-medium text-muted-foreground transition-colors hover:text-foreground"
                                                    >
                                                        Acceso a Microscopía
                                                    </label>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    handleAssignCollaborator(
                                                        selectedCollaboratorId,
                                                    )
                                                }
                                                disabled={
                                                    !selectedCollaboratorId ||
                                                    isAssigning
                                                }
                                                className="h-10 px-5 font-semibold"
                                            >
                                                {isAssigning
                                                    ? 'Asignando...'
                                                    : 'Asignar'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-md border border-dashed bg-muted/40 p-3.5 text-center text-xs text-muted-foreground">
                                        No hay colaboradores disponibles para
                                        asignar.
                                    </div>
                                )}
                            </div>

                            {/* Assigned Collaborators List Table */}
                            <div className="max-h-[300px] w-full overflow-y-auto rounded-lg border border-border/80 bg-card shadow-sm">
                                {specimen.collaborators &&
                                specimen.collaborators.length > 0 ? (
                                    <div className="w-full overflow-x-auto">
                                        <table className="w-full border-collapse text-left text-sm">
                                            <thead className="sticky top-0 z-10 border-b bg-muted/95 backdrop-blur-sm">
                                                <tr className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                    <th className="p-3.5">
                                                        Colaborador
                                                    </th>
                                                    <th className="p-3.5 pl-0">
                                                        Accesos
                                                    </th>
                                                    <th className="w-20 p-3.5 text-right">
                                                        Acciones
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60">
                                                {specimen.collaborators.map(
                                                    (user: any) => (
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
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="flex flex-nowrap items-start gap-3">
                                                                    <div className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/30 px-2.5 py-1 text-[11px] transition-colors hover:bg-muted/50">
                                                                        <span className="font-medium text-muted-foreground">
                                                                            Macroscopía
                                                                        </span>
                                                                        <Switch
                                                                            checked={
                                                                                user
                                                                                    .pivot
                                                                                    ?.macroscopy_access !==
                                                                                undefined
                                                                                    ? Boolean(
                                                                                          user
                                                                                              .pivot
                                                                                              .macroscopy_access,
                                                                                      )
                                                                                    : false
                                                                            }
                                                                            onCheckedChange={(
                                                                                checked,
                                                                            ) =>
                                                                                handleToggleCollaboratorAccess(
                                                                                    user.id,
                                                                                    'macroscopy',
                                                                                    checked,
                                                                                )
                                                                            }
                                                                            title="Alternar acceso a macroscopía"
                                                                            className="scale-90"
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/30 px-2.5 py-1 text-[11px] transition-colors hover:bg-muted/50">
                                                                        <span className="font-medium text-muted-foreground">
                                                                            Microscopía
                                                                        </span>
                                                                        <Switch
                                                                            checked={
                                                                                user
                                                                                    .pivot
                                                                                    ?.microscopy_access !==
                                                                                undefined
                                                                                    ? Boolean(
                                                                                          user
                                                                                              .pivot
                                                                                              .microscopy_access,
                                                                                      )
                                                                                    : false
                                                                            }
                                                                            onCheckedChange={(
                                                                                checked,
                                                                            ) =>
                                                                                handleToggleCollaboratorAccess(
                                                                                    user.id,
                                                                                    'microscopy',
                                                                                    checked,
                                                                                )
                                                                            }
                                                                            title="Alternar acceso a microscopía"
                                                                            className="scale-90"
                                                                        />
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
                                                                        handleUnassignCollaborator(
                                                                            user.id,
                                                                        )
                                                                    }
                                                                    title="Eliminar asignación"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ),
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
                                            Sin colaboradores asignados
                                        </h4>
                                        <p className="max-w-xs text-xs text-muted-foreground">
                                            Esta muestra no tiene ningún
                                            colaborador asignado actualmente.
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
                                onClick={() => handleOpenChange(false)}
                                className="h-10 px-6 font-medium"
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
