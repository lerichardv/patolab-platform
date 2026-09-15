import React from 'react';
import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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

export default function SpecimenTypeStatesSheet({ specimenType, open, onOpenChange }: Props) {
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

                {open && specimenType && (
                    <SpecimenTypeStatesForm
                        specimenTypeId={specimenType.id}
                        onSuccess={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
