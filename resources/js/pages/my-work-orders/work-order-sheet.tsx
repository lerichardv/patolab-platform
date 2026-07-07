import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import WorkOrderForm from './work-order-form';

interface WorkOrderType {
    id: number;
    name: string;
    duration_unit?: 'hours' | 'days';
    duration_value?: number;
    same_day_rule_enabled?: boolean;
    same_day_cutoff_start?: string | null;
    same_day_cutoff_end?: string | null;
}

interface User {
    id: number;
    name: string;
}

interface WorkOrderTask {
    id: number;
    name: string;
    duration_unit?: 'hours' | 'days';
    duration_value?: number;
    same_day_rule_enabled?: boolean;
    same_day_cutoff_start?: string | null;
    same_day_cutoff_end?: string | null;
}

interface Props {
    specimenId?: number | null;
    specimenIds?: number[] | null;
    workOrderTypes: WorkOrderType[];
    workOrderTasks: WorkOrderTask[];
    usersList: User[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function WorkOrderSheet({
    specimenId,
    specimenIds,
    workOrderTypes,
    workOrderTasks,
    usersList,
    open,
    onOpenChange,
}: Props) {
    const isBulk = specimenIds && specimenIds.length > 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[650px] lg:max-w-[750px]">
                <HeadingSheet
                    title={
                        isBulk
                            ? 'Crear Órdenes de Trabajo en Lote'
                            : 'Crear Orden de Trabajo'
                    }
                    description={
                        isBulk
                            ? `Complete el formulario para crear una orden de trabajo para cada una de las ${specimenIds.length} muestras seleccionadas.`
                            : 'Complete el formulario para crear una nueva orden de trabajo para esta muestra.'
                    }
                />
                {open && (specimenId !== null || isBulk) && (
                    <WorkOrderForm
                        specimenId={specimenId}
                        specimenIds={specimenIds}
                        workOrderTypes={workOrderTypes}
                        workOrderTasks={workOrderTasks}
                        usersList={usersList}
                        onSuccess={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
