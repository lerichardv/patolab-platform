import type { DropResult } from '@hello-pangea/dnd';
import {
    DragDropContext,
    Droppable,
    Draggable,
} from '@hello-pangea/dnd';
import { router } from '@inertiajs/react';
import { GripVertical, Save, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { updateStates as updateSpecimenTypeStates } from '@/actions/App/Http/Controllers/SpecimenTypeController';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';

export interface StateItem {
    id?: number;
    status: string;
    step_order: number;
    active: boolean;
    label: string;
    color: string;
    description: string;
}

interface Props {
    specimenTypeId: number;
    initialStates: StateItem[];
    onSuccess: () => void;
}

export default function SpecimenTypeStatesForm({
    specimenTypeId,
    initialStates,
    onSuccess,
}: Props) {
    const [states, setStates] = useState<StateItem[]>(() =>
        [...initialStates].sort((a, b) => a.step_order - b.step_order),
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleToggleActive = (status: string, checked: boolean) => {
        // Prevent disabling all states
        if (!checked) {
            const activeCount = states.filter(
                (s) => s.status !== status && s.active,
            ).length;

            if (activeCount === 0) {
                toast.error('Debe haber al menos un estado activo en el flujo.');

                return;
            }
        }

        const updated = states.map((s) =>
            s.status === status ? { ...s, active: checked } : s,
        );

        setStates(updated);
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return;
        }

        const newStates = Array.from(states);
        const [reorderedItem] = newStates.splice(result.source.index, 1);
        newStates.splice(result.destination.index, 0, reorderedItem);

        const reordered = newStates.map((item, index) => ({
            ...item,
            step_order: index + 1,
        }));

        setStates(reordered);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const activeCount = states.filter((s) => s.active).length;

        if (activeCount === 0) {
            toast.error('Debe haber al menos un estado activo en el flujo.');

            return;
        }

        setIsSaving(true);

        const payload = states.map((s, idx) => ({
            status: s.status,
            step_order: idx + 1,
            active: s.active,
        }));

        router.put(
            updateSpecimenTypeStates(specimenTypeId).url,
            { states: payload },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Flujo de estados guardado exitosamente');
                    setIsSaving(false);
                    onSuccess();
                },
                onError: (errors) => {
                    setIsSaving(false);
                    const msg =
                        typeof errors === 'object' && errors
                            ? Object.values(errors)[0]
                            : 'Error al guardar el flujo de estados';
                    toast.error(typeof msg === 'string' ? msg : 'Error al guardar');
                },
            },
        );
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 py-4">
            <div className="rounded-lg border border-primary/10 bg-primary/[0.03] p-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                        Arrastra los estados para definir la secuencia del flujo.
                        Usa el interruptor para habilitar o deshabilitar estados
                        según los requerimientos de este tipo de muestra.
                    </span>
                </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="specimen-type-states-list">
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="space-y-2"
                        >
                            {states.map((stateItem, index) => (
                                <Draggable
                                    key={stateItem.status}
                                    draggableId={stateItem.status}
                                    index={index}
                                >
                                    {(dragProvided, snapshot) => (
                                        <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            className={`flex items-center justify-between rounded-md border p-3 transition-colors ${
                                                snapshot.isDragging
                                                    ? 'z-50 scale-[1.01] border-primary bg-accent/70 shadow-lg ring-1 ring-primary/30'
                                                    : 'bg-card hover:bg-accent/20'
                                            } ${!stateItem.active ? 'opacity-60 bg-muted/20' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    {...dragProvided.dragHandleProps}
                                                    className="cursor-grab text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
                                                    title="Arrastrar para reordenar"
                                                >
                                                    <GripVertical className="h-5 w-5" />
                                                </div>

                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                                                    {index + 1}
                                                </span>

                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="h-2.5 w-2.5 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    stateItem.color,
                                                            }}
                                                        />
                                                        <span className="text-sm font-semibold tracking-tight text-foreground">
                                                            {stateItem.label}
                                                        </span>
                                                        {!stateItem.active && (
                                                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                Desactivado
                                                            </span>
                                                        )}
                                                    </div>
                                                    {stateItem.description && (
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {stateItem.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Switch
                                                    checked={stateItem.active}
                                                    onCheckedChange={(checked) =>
                                                        handleToggleActive(
                                                            stateItem.status,
                                                            checked,
                                                        )
                                                    }
                                                    aria-label={`Activar estado ${stateItem.label}`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                    type="submit"
                    disabled={isSaving}
                    className="w-full md:w-auto"
                >
                    {isSaving ? (
                        <Spinner className="mr-2" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Guardar Flujo de Estados
                </Button>
            </div>
        </form>
    );
}
