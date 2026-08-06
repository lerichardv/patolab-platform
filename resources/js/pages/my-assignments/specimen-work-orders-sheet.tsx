import { router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClipboardList, Clock, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import WorkOrderSheet from '../my-work-orders/work-order-sheet';

interface Props {
    specimen: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workOrderTypes: any[];
    workOrderTasks: any[];
    usersList: any[];
}

export default function SpecimenWorkOrdersSheet({
    specimen,
    open,
    onOpenChange,
    workOrderTypes,
    workOrderTasks,
    usersList,
}: Props) {
    const { props } = usePage() as any;

    const [editingWorkOrder, setEditingWorkOrder] = useState<any | null>(null);
    const [isEditWorkOrderSheetOpen, setIsEditWorkOrderSheetOpen] =
        useState(false);
    const [workOrderToDelete, setWorkOrderToDelete] = useState<any | null>(
        null,
    );
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[750px] lg:max-w-[850px]">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2 text-lg font-bold text-primary">
                            <ClipboardList className="h-5 w-5 text-primary" />
                            Órdenes de Trabajo
                        </SheetTitle>
                        <p className="text-xs text-muted-foreground">
                            Detalles de las órdenes generadas para la muestra{' '}
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono font-semibold text-foreground">
                                {specimen?.sequence_code || `#${specimen?.id}`}
                            </span>
                        </p>
                    </SheetHeader>
                    <Separator className="my-2" />
                    <div className="flex flex-col gap-4 px-5 py-2 select-none">
                        {specimen?.work_orders &&
                        specimen.work_orders.length > 0 ? (
                            specimen.work_orders.map((order: any) => {
                                const priorityLabel =
                                    order.priority === 1
                                        ? 'Alta'
                                        : order.priority === 2
                                          ? 'Media'
                                          : 'Baja';

                                const priorityColor =
                                    order.priority === 1
                                        ? 'bg-orange-500 text-white animate-pulse'
                                        : order.priority === 2
                                          ? 'bg-yellow-500 text-black'
                                          : 'bg-green-500 text-white';

                                const statusColor =
                                    order.status === 'Finalizada'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                                        : order.status === 'En Proceso'
                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
                                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';

                                const isAdmin =
                                    props.auth?.user?.role?.slug === 'admin' ||
                                    props.auth?.permissions?.includes(
                                        'work_orders.admin_view',
                                    );
                                const canModify =
                                    isAdmin ||
                                    order.created_by_id ===
                                        props.auth?.user?.id;

                                return (
                                    <div
                                        key={order.id}
                                        className="flex flex-col gap-3 rounded-lg border border-border/80 bg-card p-4 transition-colors hover:bg-muted/10"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-semibold text-primary">
                                                        #{order.id}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        |
                                                    </span>
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {order.type?.name ||
                                                            'Tipo Desconocido'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        |
                                                    </span>
                                                    <span className="text-xs font-medium text-foreground">
                                                        Cantidad:{' '}
                                                        {order.quantity}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        |
                                                    </span>
                                                    <div className="flex shrink-0 flex-row items-center gap-1.5">
                                                        <span
                                                            className={cn(
                                                                'inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase',
                                                                statusColor,
                                                            )}
                                                        >
                                                            {order.status}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'inline-block rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase',
                                                                priorityColor,
                                                            )}
                                                        >
                                                            Prioridad:{' '}
                                                            {priorityLabel}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-1 rounded-md bg-muted/40 p-2.5">
                                                    <p className="text-xs font-semibold text-foreground">
                                                        Tarea:{' '}
                                                        {order.task?.name ||
                                                            'N/A'}
                                                    </p>
                                                    {order.task
                                                        ?.description && (
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {
                                                                order.task
                                                                    .description
                                                            }
                                                        </p>
                                                    )}
                                                </div>

                                                {order.due_date && (
                                                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        Vence:{' '}
                                                        {format(
                                                            new Date(
                                                                order.due_date,
                                                            ),
                                                            'dd/MM/yyyy h:mm a',
                                                            { locale: es },
                                                        )}
                                                    </p>
                                                )}
                                            </div>

                                            {canModify && (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-2.5 text-[11px]"
                                                        onClick={() => {
                                                            setEditingWorkOrder(
                                                                order,
                                                            );
                                                            setIsEditWorkOrderSheetOpen(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        <Edit className="mr-1 h-3 w-3" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        className="h-7 px-2.5 text-[11px]"
                                                        onClick={() => {
                                                            setWorkOrderToDelete(
                                                                order,
                                                            );
                                                            setIsDeleteDialogOpen(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {order.comments && (
                                            <p className="rounded bg-muted/40 p-2.5 text-xs text-muted-foreground italic">
                                                "{order.comments}"
                                            </p>
                                        )}

                                        {order.users &&
                                        order.users.length > 0 ? (
                                            <div className="flex flex-col gap-1 border-t border-border/60 pt-2">
                                                <span className="text-[10px] font-medium text-muted-foreground">
                                                    Técnicos Asignados:
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                    {order.users.map(
                                                        (u: any) => (
                                                            <span
                                                                key={u.id}
                                                                className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[9px] font-medium text-secondary-foreground"
                                                            >
                                                                {u.name}
                                                            </span>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1 border-t border-border/60 pt-2">
                                                <span className="text-[10px] font-medium text-muted-foreground">
                                                    Técnicos Asignados:
                                                </span>
                                                <div>
                                                    <span className="inline-flex items-center rounded bg-destructive/10 px-2 py-0.5 text-[9px] font-medium text-destructive">
                                                        Sin asignar
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                No hay órdenes de trabajo asignadas a esta
                                muestra.
                            </p>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Stacked Sheet to edit Work Order */}
            <WorkOrderSheet
                specimenId={null}
                workOrder={editingWorkOrder}
                workOrderTypes={workOrderTypes}
                workOrderTasks={workOrderTasks}
                usersList={usersList}
                open={isEditWorkOrderSheetOpen}
                onOpenChange={(open) => {
                    setIsEditWorkOrderSheetOpen(open);

                    if (!open) {
                        setEditingWorkOrder(null);
                    }
                }}
            />

            {/* Alert Dialog to Confirm Deletion */}
            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Está absolutamente seguro?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará la orden de trabajo #
                            {workOrderToDelete?.id}. Esta orden de trabajo ya no
                            aparecerá en el control, mis asignaciones u otros
                            listados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setWorkOrderToDelete(null)}
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (workOrderToDelete) {
                                    router.delete(
                                        `/work-order-records/${workOrderToDelete.id}`,
                                        {
                                            onSuccess: () => {
                                                toast.success(
                                                    'Orden de trabajo eliminada correctamente.',
                                                );
                                                setIsDeleteDialogOpen(false);
                                                setWorkOrderToDelete(null);
                                            },
                                            onError: () => {
                                                toast.error(
                                                    'Ocurrió un error al eliminar la orden de trabajo.',
                                                );
                                            },
                                        },
                                    );
                                }
                            }}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
