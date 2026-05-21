import HeadingSheet from '@/components/heading-sheet';
import {
    Sheet,
    SheetContent,
} from '@/components/ui/sheet';
import SpecimenTypeForm from './specimen-type-form';

interface Price {
    id?: number;
    amount: number | string;
}

interface SpecimenType {
    id: number;
    name: string;
    description: string | null;
    prices?: Price[];
}

interface Props {
    specimenType: SpecimenType | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SpecimenTypeSheet({ specimenType, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[540px]">
                <HeadingSheet 
                    title={specimenType ? 'Editar Tipo de Muestra' : 'Nuevo Tipo de Muestra'}
                    description={specimenType 
                        ? 'Realice cambios en la información del tipo de muestra aquí.' 
                        : 'Complete el formulario para crear un nuevo tipo de muestra.'}
                />
                <SpecimenTypeForm 
                    specimenType={specimenType} 
                    onSuccess={() => onOpenChange(false)} 
                />
            </SheetContent>
        </Sheet>
    );
}
