import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import WorkOrderTypeForm from './work-order-type-form';

interface WorkOrderType {
    id: number;
    name: string;
    duration_unit: 'hours' | 'days';
    duration_value: number;
    same_day_rule_enabled: boolean;
    same_day_cutoff_start: string | null;
    same_day_cutoff_end: string | null;
}

interface Props {
    workOrderType: WorkOrderType | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function WorkOrderTypeSheet({
    workOrderType,
    open,
    onOpenChange,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[540px]">
                <HeadingSheet
                    title={
                        workOrderType
                            ? 'Editar Tipo de Orden de Trabajo'
                            : 'Nuevo Tipo de Orden de Trabajo'
                    }
                    description={
                        workOrderType
                            ? 'Realice cambios en la configuración del tipo de orden de trabajo aquí.'
                            : 'Complete el formulario para definir un nuevo tipo de orden de trabajo.'
                    }
                />
                {open && (
                    <WorkOrderTypeForm
                        workOrderType={workOrderType}
                        onSuccess={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
