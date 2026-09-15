import axios from 'axios';
import { Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getStates as getSpecimenTypeStates } from '@/actions/App/Http/Controllers/SpecimenTypeController';
import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { StateItem } from './specimen-type-states-form';
import SpecimenTypeStatesForm from './specimen-type-states-form';

interface SpecimenType {
    id: number;
    name: string;
    description: string | null;
}

interface Props {
    specimenType: SpecimenType | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SpecimenTypeStatesSheet({
    specimenType,
    open,
    onOpenChange,
}: Props) {
    const [states, setStates] = useState<StateItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;

        if (open && specimenType) {
            axios
                .get(getSpecimenTypeStates(specimenType.id).url)
                .then((res) => {
                    if (isMounted) {
                        setStates(res.data.states || []);
                    }
                })
                .catch((err) => {
                    if (isMounted) {
                        console.error('Error fetching specimen type states:', err);
                        toast.error('Error al cargar los estados del tipo de muestra');
                    }
                })
                .finally(() => {
                    if (isMounted) {
                        setLoading(false);
                    }
                });
        }

        return () => {
            isMounted = false;
        };
    }, [open, specimenType]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="overflow-y-auto sm:max-w-[620px]">
                <HeadingSheet
                    title={
                        specimenType
                            ? `Flujo de Estados: ${specimenType.name}`
                            : 'Gestionar Flujo de Estados'
                    }
                    description="Configure qué fases aplican para este tipo de muestra y ordene la secuencia de progreso."
                />

                {loading ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        <span className="text-sm">Cargando estados...</span>
                    </div>
                ) : specimenType && states.length > 0 ? (
                    <SpecimenTypeStatesForm
                        specimenTypeId={specimenType.id}
                        initialStates={states}
                        onSuccess={() => onOpenChange(false)}
                    />
                ) : (
                    <div className="p-5 text-center text-sm text-muted-foreground">
                        No se encontraron estados para configurar.
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
