import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    User,
    Trash2,
    Microscope,
    UserPlus,
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

export default function SpecimenPathologistSheet({
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

    const [localUsers, setLocalUsers] = useState<any[] | null>(null);
    const [localCollaborators, setLocalCollaborators] = useState<any[] | null>(
        null,
    );
    const [prevSpecimenId, setPrevSpecimenId] = useState<number | undefined>(
        initialSpecimen?.id,
    );
    const hasMutatedRef = useRef(false);

    if (initialSpecimen?.id !== prevSpecimenId) {
        setPrevSpecimenId(initialSpecimen?.id);
        setLocalUsers(null);
        setLocalCollaborators(null);
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

    const resolvedPathologists = formData?.pathologists || pathologists;
    const resolvedUsersList = formData?.usersList || usersList;

    const [selectedPathologistId, setSelectedPathologistId] =
        useState<string>('');
    const [macroscopyAccess, setMacroscopyAccess] = useState<boolean>(false);
    const [microscopyAccess, setMicroscopyAccess] = useState<boolean>(true);

    const [selectedCollaboratorId, setSelectedCollaboratorId] =
        useState<string>('');
    const [collabMacroscopyAccess, setCollabMacroscopyAccess] =
        useState<boolean>(true);
    const [collabMicroscopyAccess, setCollabMicroscopyAccess] =
        useState<boolean>(true);

    const [isAssigningPathologist, setIsAssigningPathologist] = useState(false);
    const [isAssigningCollaborator, setIsAssigningCollaborator] =
        useState(false);

    // Filter pathologists that are NOT already assigned to this specimen
    const assignedUserIds = useMemo(() => {
        return users?.map((u: any) => u.id) || [];
    }, [users]);

    const assignedCollaboratorIds = useMemo(() => {
        return collaborators?.map((c: any) => c.id) || [];
    }, [collaborators]);

    const availablePathologists = useMemo(() => {
        return resolvedPathologists.filter(
            (p) =>
                !assignedUserIds.includes(p.id) &&
                !assignedCollaboratorIds.includes(p.id),
        );
    }, [resolvedPathologists, assignedUserIds, assignedCollaboratorIds]);

    const availableCollaborators = useMemo(() => {
        const sourceList =
            resolvedUsersList.length > 0
                ? resolvedUsersList
                : resolvedPathologists;

        return sourceList.filter(
            (p) =>
                !assignedCollaboratorIds.includes(p.id) &&
                !assignedUserIds.includes(p.id),
        );
    }, [
        resolvedPathologists,
        resolvedUsersList,
        assignedCollaboratorIds,
        assignedUserIds,
    ]);

    const handleAssign = async (userId: string) => {
        if (!userId || !specimen?.id || isAssigningPathologist) {
            return;
        }

        setIsAssigningPathologist(true);

        try {
            const response = await axios.post(
                `/specimens/${specimen.id}/assign-user`,
                {
                    user_id: userId,
                    macroscopy_access: macroscopyAccess,
                    microscopy_access: microscopyAccess,
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
                response.data.message || 'Patólogo asignado correctamente',
            );
            setSelectedPathologistId('');
            setMacroscopyAccess(false);
            setMicroscopyAccess(true);
        } catch (error: any) {
            const message =
                error.response?.data?.message || 'Error al asignar patólogo';
            toast.error(message);
        } finally {
            setIsAssigningPathologist(false);
        }
    };

    const handleToggleAccess = async (
        userId: number,
        field: 'macroscopy' | 'microscopy',
        checked: boolean,
    ) => {
        const targetUser = users?.find((u: any) => u.id === userId);

        if (!targetUser || !specimen?.id) {
            return;
        }

        const currentMacro =
            targetUser.pivot?.macroscopy_access !== undefined
                ? Boolean(targetUser.pivot.macroscopy_access)
                : false;
        const currentMicro =
            targetUser.pivot?.microscopy_access !== undefined
                ? Boolean(targetUser.pivot.microscopy_access)
                : false;

        const macro = field === 'macroscopy' ? checked : currentMacro;
        const micro = field === 'microscopy' ? checked : currentMicro;

        setLocalUsers((prev) =>
            (prev || []).map((u: any) =>
                u.id === userId
                    ? {
                          ...u,
                          pivot: {
                              ...u.pivot,
                              macroscopy_access: macro,
                              microscopy_access: micro,
                          },
                      }
                    : u,
            ),
        );

        try {
            const response = await axios.post(
                `/specimens/${specimen.id}/assign-user`,
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
            toast.success('Permisos actualizados correctamente');
        } catch (error: any) {
            setLocalUsers((prev) =>
                (prev || []).map((u: any) =>
                    u.id === userId
                        ? {
                              ...u,
                              pivot: {
                                  ...u.pivot,
                                  macroscopy_access: currentMacro,
                                  microscopy_access: currentMicro,
                              },
                          }
                        : u,
                ),
            );
            const message =
                error.response?.data?.message || 'Error al actualizar permisos';
            toast.error(message);
        }
    };

    const handleUnassign = async (userId: number) => {
        if (!specimen?.id) {
            return;
        }

        try {
            const response = await axios.post(
                `/specimens/${specimen.id}/unassign-user`,
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
                response.data.message || 'Patólogo desasignado correctamente',
            );
        } catch (error: any) {
            const message =
                error.response?.data?.message || 'Error al desasignar patólogo';
            toast.error(message);
        }
    };

    const handleAssignCollaborator = async (userId: string) => {
        if (!userId || !specimen?.id || isAssigningCollaborator) {
            return;
        }

        setIsAssigningCollaborator(true);

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
            setIsAssigningCollaborator(false);
        }
    };

    const handleToggleCollaboratorAccess = async (
        userId: number,
        field: 'macroscopy' | 'microscopy',
        checked: boolean,
    ) => {
        const targetCollab = collaborators?.find((c: any) => c.id === userId);

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

        setLocalCollaborators((prev) =>
            (prev || []).map((c: any) =>
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
            toast.success('Permisos de colaborador actualizados');
        } catch (error: any) {
            setLocalCollaborators((prev) =>
                (prev || []).map((c: any) =>
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
                only: ['priorities', 'specimen'],
            });
        }

        onOpenChange(newOpen);
    };

    if (!specimen && !open) {
        return null;
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[650px] lg:max-w-[750px]">
                {/* Header */}
                <div className="border-b pr-12 pb-4">
                    <HeadingSheet
                        title="Asignar Patólogo"
                        description="Administre la asignación de patólogos encargados de diagnosticar esta muestra."
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
                                            specimen.customerRelation?.name ||
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
                                            <SelectValue placeholder="Seleccione un patólogo para agregar a la muestra..." />
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
                                                handleAssign(
                                                    selectedPathologistId,
                                                )
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
                                    asignados a esta muestra.
                                </div>
                            )}
                        </div>

                        {/* Assigned Pathologists List Table */}
                        <div className="space-y-2.5">
                            <label className="text-sm font-semibold text-foreground">
                                Patólogos Asignados
                            </label>
                            <div className="max-h-[300px] w-full overflow-y-auto rounded-lg border border-border/80 bg-card shadow-sm">
                                {specimen.users && specimen.users.length > 0 ? (
                                    <div className="w-full overflow-x-auto">
                                        <table className="w-full border-collapse text-left text-sm">
                                            <thead className="sticky top-0 z-10 border-b bg-muted/95 backdrop-blur-sm">
                                                <tr className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                    <th className="p-3.5">
                                                        Patólogo
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
                                                {specimen.users.map(
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
                                                                                handleToggleAccess(
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
                                                                                handleToggleAccess(
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
                                                                        handleUnassign(
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
                                            Sin patólogos asignados
                                        </h4>
                                        <p className="max-w-xs text-xs text-muted-foreground">
                                            Esta muestra no tiene ningún
                                            patólogo asignado actualmente.
                                            Utilice el selector de arriba para
                                            añadir uno.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator className="my-2" />

                        {/* Collaborator Section */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                                    <Share2 className="h-5 w-5 text-primary" />
                                    Colaboradores Asignados
                                </h3>
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
                                                        id="new-collab-macro-access"
                                                        checked={
                                                            collabMacroscopyAccess
                                                        }
                                                        onCheckedChange={
                                                            setCollabMacroscopyAccess
                                                        }
                                                    />
                                                    <label
                                                        htmlFor="new-collab-macro-access"
                                                        className="cursor-pointer text-sm leading-none font-medium text-muted-foreground transition-colors hover:text-foreground"
                                                    >
                                                        Acceso a Macroscopía
                                                    </label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="new-collab-micro-access"
                                                        checked={
                                                            collabMicroscopyAccess
                                                        }
                                                        onCheckedChange={
                                                            setCollabMicroscopyAccess
                                                        }
                                                    />
                                                    <label
                                                        htmlFor="new-collab-micro-access"
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
                                                    !selectedCollaboratorId
                                                }
                                                className="h-10 px-5 font-semibold"
                                            >
                                                Asignar
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
