import {
    Sheet,
    SheetContent,
} from '@/components/ui/sheet';
import HeadingSheet from '@/components/heading-sheet';
import SpecimenForm from './specimen-form';

interface Props {
    specimen: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customers: any[];
    specimenTypes: any[];
    examinations: any[];
    categories: any[];
    referrers: any[];
    priorities: any[];
}

export default function SpecimenSheet({ 
    specimen, 
    open, 
    onOpenChange, 
    customers, 
    specimenTypes, 
    examinations, 
    categories, 
    referrers, 
    priorities 
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[800px] overflow-y-auto">
                <HeadingSheet 
                    title={specimen ? 'Editar Muestra' : 'Nueva Muestra'}
                    description={specimen 
                        ? 'Realice cambios en la información de la muestra aquí.' 
                        : 'Complete el formulario para registrar una nueva muestra en el sistema.'}
                />
                <SpecimenForm 
                    specimen={specimen} 
                    onSuccess={() => onOpenChange(false)} 
                    customers={customers}
                    specimenTypes={specimenTypes}
                    examinations={examinations}
                    categories={categories}
                    referrers={referrers}
                    priorities={priorities}
                />
            </SheetContent>
        </Sheet>
    );
}
