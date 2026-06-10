import { router } from '@inertiajs/react';
import {
    User,
    Trash2,
    Microscope,
    UserPlus,
    Tag,
    AlertCircle,
    Clock,
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
    specimen: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pathologists: any[];
}

export default function SpecimenPathologistSheet({
    specimen,
    open,
    onOpenChange,
    pathologists = [],
}: Props) {
    const [selectedPathologistId, setSelectedPathologistId] =
        useState<string>('');

    if (!specimen) {
        return null;
    }

    // Filter pathologists that are NOT already assigned to this specimen
    const assignedUserIds = useMemo(() => {
        return specimen.users?.map((u: any) => u.id) || [];
    }, [specimen.users]);

    const availablePathologists = useMemo(() => {
        return pathologists.filter((p) => !assignedUserIds.includes(p.id));
    }, [pathologists, assignedUserIds]);

    const handleAssign = (userId: string) => {
        if (!userId) {
            return;
        }

        router.post(
            `/specimens/${specimen.id}/assign-user`,
            { user_id: userId },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Patólogo asignado correctamente');
                    setSelectedPathologistId('');
                },
                onError: (errors) => {
                    const message =
                        Object.values(errors)[0] || 'Error al asignar patólogo';
                    toast.error(message);
                },
            },
        );
    };

    const handleUnassign = (userId: number) => {
        router.post(
            `/specimens/${specimen.id}/unassign-user`,
            { user_id: userId },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Patólogo desasignado correctamente');
                },
                onError: (errors) => {
                    const message =
                        Object.values(errors)[0] ||
                        'Error al desasignar patólogo';
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
                        title="Asignar Patólogo"
                        description="Administre la asignación de patólogos encargados de diagnosticar esta muestra."
                    />
                </div>

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
                                        <Tag className="h-3.5 w-3.5" /> Código
                                        de Secuencia
                                    </span>
                                    <p className="font-mono font-bold text-primary">
                                        {specimen.sequence_code}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-1">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <User className="h-3.5 w-3.5" /> Paciente
                                </span>
                                <p className="font-medium text-foreground">
                                    {specimen.customer_relation?.name || 'N/A'}
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
                                              : specimen.status === 'processing'
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
                                                    specimen.priority.color ||
                                                    '#cbd5e1',
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
                        ) : (
                            <div className="rounded-md border border-dashed bg-muted/40 p-3.5 text-center text-xs text-muted-foreground">
                                Todos los patólogos disponibles ya están
                                asignados a esta muestra.
                            </div>
                        )}
                    </div>

                    {/* Assigned Pathologists List Table */}
                    <div className="flex min-h-0 flex-1 flex-col space-y-2.5">
                        <label className="text-sm font-semibold text-foreground">
                            Patólogos Asignados
                        </label>
                        <div className="min-h-[180px] flex-1 overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
                            {specimen.users && specimen.users.length > 0 ? (
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
                                                <th className="w-20 p-3.5 text-right">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {specimen.users.map((user: any) => (
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
                                            ))}
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
                                        Esta muestra no tiene ningún patólogo
                                        asignado actualmente. Utilice el
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
