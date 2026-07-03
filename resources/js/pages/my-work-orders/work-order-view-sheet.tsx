import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Briefcase,
    User,
    Calendar,
    Clock,
    Tag,
    AlertCircle,
    MessageSquare,
    ClipboardList,
    Hash,
} from 'lucide-react';
import HeadingSheet from '@/components/heading-sheet';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface Specimen {
    id: number;
    sequence_code?: string;
    customer_relation?: {
        name: string;
    };
}

interface WorkOrderType {
    id: number;
    name: string;
}

interface WorkOrder {
    id: number;
    specimen_id: number;
    work_order_type_id: number;
    work_order_task_id: number | null;
    quantity: number;
    user_id: number;
    completed_by_id: number | null;
    status: 'Enviada' | 'En Proceso' | 'Finalizada';
    priority: number; // 1 = Alta, 2 = Media, 3 = Baja
    comments: string | null;
    due_date: string | null;
    completed_at: string | null;
    created_at: string;
    specimen?: Specimen;
    type?: WorkOrderType;
    task?: {
        name: string;
        description: string;
    } | null;
    completed_by?: {
        name: string;
    };
}

interface Props {
    workOrder: WorkOrder | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const PRIORITY_METADATA: Record<number, { label: string; color: string }> = {
    1: { label: 'Alta', color: '#f97316' },
    2: { label: 'Media', color: '#eab308' },
    3: { label: 'Baja', color: '#22c55e' },
};

export default function WorkOrderViewSheet({ workOrder, open, onOpenChange }: Props) {
    if (!workOrder) {
        return null;
    }

    const pMeta = PRIORITY_METADATA[workOrder.priority] || PRIORITY_METADATA[3];

    const formattedCreatedAt = workOrder.created_at
        ? format(new Date(workOrder.created_at), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })
        : 'N/A';

    const formattedDueDate = workOrder.due_date
        ? format(new Date(workOrder.due_date), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })
        : 'N/A';

    const formattedCompletedAt = workOrder.completed_at
        ? format(new Date(workOrder.completed_at), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })
        : 'N/A';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[650px] lg:max-w-[750px]">
                <div className="flex h-full flex-col gap-6 pb-8">
                    {/* Header */}
                    <div className="flex flex-col gap-4 border-b pr-12 pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <HeadingSheet
                            title="Detalles de la Orden de Trabajo"
                            description={`Asignada el ${formattedCreatedAt}`}
                        />
                    </div>

                    {/* Content */}
                    <div className="space-y-6 px-5">
                        {/* Info General Card */}
                        <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                <Briefcase className="h-5 w-5" /> Información de la Orden
                            </h3>
                            <Separator />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Hash className="h-3.5 w-3.5" /> Número de Orden
                                    </span>
                                    <p className="text-sm font-semibold text-primary">
                                        #{workOrder.id}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Tag className="h-3.5 w-3.5" /> Código de Muestra
                                    </span>
                                    <p className="font-mono text-sm font-bold text-primary">
                                        {workOrder.specimen?.sequence_code || 'N/A'}
                                    </p>
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <User className="h-3.5 w-3.5" /> Paciente
                                    </span>
                                    <p className="text-sm font-medium">
                                        {workOrder.specimen?.customer_relation?.name || 'N/A'}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <ClipboardList className="h-3.5 w-3.5" /> Tarea
                                    </span>
                                    <p className="text-sm font-medium">
                                        {workOrder.task?.name || 'N/A'}
                                    </p>
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <ClipboardList className="h-3.5 w-3.5" /> Descripción de la Tarea
                                    </span>
                                    <p className="text-sm font-medium">
                                        {workOrder.task?.description || 'N/A'}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Tag className="h-3.5 w-3.5" /> Tipo de Orden
                                    </span>
                                    <p className="text-sm font-medium">
                                        {workOrder.type?.name || 'N/A'}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Hash className="h-3.5 w-3.5" /> Cantidad
                                    </span>
                                    <p className="text-sm font-medium">
                                        {workOrder.quantity}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <AlertCircle className="h-3.5 w-3.5" /> Prioridad
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-3 w-3 rounded-full"
                                            style={{ backgroundColor: pMeta.color }}
                                        />
                                        <span className="text-sm font-medium">
                                            {pMeta.label}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status & Dates Card */}
                        <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                <Clock className="h-5 w-5" /> Estado y Tiempos
                            </h3>
                            <Separator />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5" /> Estado Actual
                                    </span>
                                    <div>
                                        <span
                                            className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                                            style={{
                                                backgroundColor:
                                                    workOrder.status === 'Finalizada'
                                                        ? '#22c55e'
                                                        : workOrder.status === 'En Proceso'
                                                          ? '#3b82f6'
                                                          : '#cbd5e1',
                                            }}
                                        >
                                            {workOrder.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5" /> Fecha Límite
                                    </span>
                                    <p className="text-sm font-medium">
                                        {formattedDueDate}
                                    </p>
                                </div>

                                {workOrder.status === 'Finalizada' && (
                                    <>
                                        <div className="space-y-1">
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <User className="h-3.5 w-3.5" /> Completado Por
                                            </span>
                                            <p className="text-sm font-medium">
                                                {workOrder.completed_by?.name || 'N/A'}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Calendar className="h-3.5 w-3.5" /> Completado El
                                            </span>
                                            <p className="text-sm font-medium">
                                                {formattedCompletedAt}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Comments Card */}
                        <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                <MessageSquare className="h-5 w-5" /> Comentarios
                            </h3>
                            <Separator />
                            <p className="min-h-[60px] rounded bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                                {workOrder.comments || 'Sin comentarios u observaciones.'}
                            </p>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
