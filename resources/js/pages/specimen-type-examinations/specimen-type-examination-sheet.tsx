import HeadingSheet from '@/components/heading-sheet';
import {
    Sheet,
    SheetContent,
} from '@/components/ui/sheet';
import SpecimenTypeExaminationForm from './specimen-type-examination-form';

interface SpecimenType {
    id: number;
    name: string;
}

interface Examination {
    id: number;
    specimen_type: number;
    name: string;
    description: string;
}

interface Props {
    examination: Examination | null;
    specimenTypes: SpecimenType[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SpecimenTypeExaminationSheet({ examination, specimenTypes, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[540px]">
                <HeadingSheet 
                    title={examination ? 'Editar Tipo de Análisis' : 'Nuevo Tipo de Análisis'}
                    description={examination 
                        ? 'Realice cambios en la información del tipo de análisis aquí.' 
                        : 'Complete el formulario para crear un nuevo tipo de análisis asociado a una muestra.'}
                />
                <SpecimenTypeExaminationForm 
                    examination={examination} 
                    specimenTypes={specimenTypes}
                    onSuccess={() => onOpenChange(false)} 
                />
            </SheetContent>
        </Sheet>
    );
}
