import { Sheet, SheetContent } from '@/components/ui/sheet';
import HeadingSheet from '@/components/heading-sheet';
import SequenceForm from './sequence-form';

interface Location {
    id: number;
    name: string;
}

interface SpecimenType {
    id: number;
    name: string;
}

interface Sequence {
    id?: number;
    location_id: number;
    specimen_type: number;
    prefix: string;
    separator: string;
    fill: number;
    month: number;
    year: number;
    current_sequence: number;
}

interface Props {
    sequence?: Sequence | null;
    locations: Location[];
    specimenTypes: SpecimenType[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SequenceSheet({ sequence, locations, specimenTypes, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
                <HeadingSheet 
                    title={sequence ? 'Editar Secuencia' : 'Nueva Secuencia'} 
                    description={sequence 
                        ? 'Actualice la configuración de la secuencia aquí.' 
                        : 'Configure los parámetros para una nueva secuencia de muestras.'} 
                />
                
                <SequenceForm 
                    sequence={sequence || undefined}
                    locations={locations}
                    specimenTypes={specimenTypes}
                    onSuccess={() => onOpenChange(false)} 
                />
            </SheetContent>
        </Sheet>
    );
}
