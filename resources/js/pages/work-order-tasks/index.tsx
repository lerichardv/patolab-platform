import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import { Edit2, ClipboardList, Plus, Search, Trash2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
    index as workOrderTasksIndex,
    destroy as destroyWorkOrderTask,
} from '@/actions/App/Http/Controllers/WorkOrderTaskController';
import { Pagination } from '@/components/pagination';
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
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import TaskSheet from './task-sheet';

interface Task {
    id: number;
    name: string;
    description: string;
    created_at: string;
}

interface Props {
    tasks: {
        data: Task[];
        links: {
            url: string | null;
            label: string;
            active: boolean;
        }[];
        current_page: number;
        last_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters: {
        search?: string;
    };
}

export default function TasksIndex({ tasks, filters }: Props) {
    const { auth } = usePage<any>().props;
    const canCreate = auth.permissions?.includes('work_order_tasks.create');
    const canEdit = auth.permissions?.includes('work_order_tasks.edit');
    const canDelete = auth.permissions?.includes('work_order_tasks.delete');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        router.get(workOrderTasksIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                handleFilterChange('search', value);
            }, 300),
        [filters, handleFilterChange],
    );

    useEffect(() => {
        if (search !== filters.search) {
            debouncedSearch(search);
        }
    }, [search, filters.search, debouncedSearch]);

    const handleEdit = (task: Task) => {
        setSelectedTask(task);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedTask(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (task: Task) => {
        setTaskToDelete(task);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (taskToDelete) {
            router.delete(destroyWorkOrderTask(taskToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Tarea eliminada correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Tareas" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <ClipboardList className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Tareas
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Administre las tareas para las órdenes de trabajo.
                        </p>
                    </div>
                    {canCreate && (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleCreate}
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nueva Tarea
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o descripción..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-right">
                                    {(canEdit || canDelete) && 'Acciones'}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.data.length > 0 ? (
                                tasks.data.map((task) => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">
                                            {task.name}
                                        </TableCell>
                                        <TableCell>
                                            {task.description}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(canEdit || canDelete) && (
                                                <div className="flex justify-end gap-2">
                                                    {canEdit && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleEdit(task)
                                                            }
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {canDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive"
                                                            onClick={() =>
                                                                handleDeleteClick(
                                                                    task,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
                                        className="h-24 text-center"
                                    >
                                        No se encontraron resultados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={tasks.links}
                    meta={{
                        from: tasks.from,
                        to: tasks.to,
                        total: tasks.total,
                    }}
                />
            </div>

            <TaskSheet
                task={selectedTask}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Está completamente seguro?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará la tarea{' '}
                            <strong>{taskToDelete?.name}</strong> de forma
                            permanente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
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
