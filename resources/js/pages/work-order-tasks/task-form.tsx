import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    store as storeTask,
    update as updateTask,
} from '@/actions/App/Http/Controllers/WorkOrderTaskController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

interface Task {
    id: number;
    name: string;
    description: string;
}

interface Props {
    task: Task | null;
    onSuccess: () => void;
}

export default function TaskForm({ task, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: task?.name || '',
        description: task?.description || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                toast.success(task ? 'Tarea actualizada' : 'Tarea creada');
                onSuccess();
            },
        };

        if (task) {
            put(updateTask(task.id).url, options);
        } else {
            post(storeTask().url, options);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-5 py-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Centrifugado, Tinción..."
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Ej. Centrifugar muestras a 3000 rpm durante 10 minutos..."
                />
                {errors.description && (
                    <p className="text-sm text-destructive">
                        {errors.description}
                    </p>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full md:w-auto"
                >
                    {processing && <Spinner className="mr-2" />}
                    {task ? 'Guardar Cambios' : 'Crear Tarea'}
                </Button>
            </div>
        </form>
    );
}
