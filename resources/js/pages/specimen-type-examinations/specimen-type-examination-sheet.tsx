import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import SpecimenTypeExaminationForm from './specimen-type-examination-form';

interface SpecimenType {
    id: number;
    name: string;
}

interface Price {
    id?: number;
    amount: number | string;
}

interface Examination {
    id: number;
    specimen_type: number;
    name: string;
    description: string;
    prices?: Price[];
}

interface Props {
    examination: Examination | null;
    specimenTypes: SpecimenType[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultSpecimenTypeId?: string;
    className?: string;
    overlayClassName?: string;
}

export default function SpecimenTypeExaminationSheet({
    examination,
    specimenTypes,
    open,
    onOpenChange,
    defaultSpecimenTypeId,
    className,
    overlayClassName,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className={cn('sm:max-w-[540px]', className)}
                overlayClassName={overlayClassName}
            >
                <HeadingSheet
                    title={
                        examination
                            ? 'Editar Tipo de Análisis'
                            : 'Nuevo Tipo de Análisis'
                    }
                    description={
                        examination
                            ? 'Realice cambios en la información del tipo de análisis aquí.'
                            : 'Complete el formulario para crear un nuevo tipo de análisis asociado a una muestra.'
                    }
                />
                {open && (
                    <SpecimenTypeExaminationForm
                        examination={examination}
                        specimenTypes={specimenTypes}
                        onSuccess={() => onOpenChange(false)}
                        defaultSpecimenTypeId={defaultSpecimenTypeId}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
