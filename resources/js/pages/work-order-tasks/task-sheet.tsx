import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import TaskForm from './task-form';

interface Task {
    id: number;
    name: string;
    description: string;
}

interface Props {
    task: Task | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function TaskSheet({ task, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[540px]">
                <HeadingSheet
                    title={task ? 'Editar Tarea' : 'Nueva Tarea'}
                    description={
                        task
                            ? 'Realice cambios en la información de la tarea aquí.'
                            : 'Complete el formulario para crear una nueva tarea.'
                    }
                />
                <TaskForm task={task} onSuccess={() => onOpenChange(false)} />
            </SheetContent>
        </Sheet>
    );
}
