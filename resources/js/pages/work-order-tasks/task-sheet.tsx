import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import TaskForm from './task-form';

interface Task {
    id: number;
    name: string;
    description: string;
    duration_unit: 'hours' | 'days';
    duration_value: number;
    same_day_rule_enabled: boolean;
    same_day_cutoff_start: string | null;
    same_day_cutoff_end: string | null;
}

interface Props {
    task: Task | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function TaskSheet({ task, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[600px]">
                <HeadingSheet
                    title={task ? 'Editar Tarea' : 'Nueva Tarea'}
                    description={
                        task
                            ? 'Realice cambios en la información de la tarea aquí.'
                            : 'Complete el formulario para crear una nueva tarea.'
                    }
                />
                {open && (
                    <TaskForm
                        task={task}
                        onSuccess={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
