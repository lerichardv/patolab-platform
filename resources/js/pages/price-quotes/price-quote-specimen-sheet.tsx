import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { FormQuoteSpecimen } from './price-quote-form';
import type { FormQuoteSpecimenGroup } from './price-quote-specimen-form';
import PriceQuoteSpecimenForm from './price-quote-specimen-form';

export interface PriceQuoteSpecimenSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingSpecimen?: FormQuoteSpecimenGroup | null;
    specimenTypes: any[];
    specimenCategories: any[];
    examinations: any[];
    onSave: (items: FormQuoteSpecimen[]) => void;
}

export default function PriceQuoteSpecimenSheet({
    open,
    onOpenChange,
    editingSpecimen = null,
    specimenTypes = [],
    specimenCategories = [],
    examinations = [],
    onSave,
}: PriceQuoteSpecimenSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="z-[90] w-full max-w-[550px] overflow-y-auto sm:max-w-[750px]"
            >
                <HeadingSheet
                    title={
                        editingSpecimen
                            ? 'Editar Muestra de la Cotización'
                            : 'Agregar Muestra a la Cotización'
                    }
                    description="Ingrese los datos requeridos para registrar este espécimen en la cotización."
                />

                {open && (
                    <PriceQuoteSpecimenForm
                        key={
                            editingSpecimen
                                ? `edit_${editingSpecimen.specimen}`
                                : 'new_specimen'
                        }
                        editingSpecimen={editingSpecimen}
                        specimenTypes={specimenTypes}
                        specimenCategories={specimenCategories}
                        examinations={examinations}
                        onSave={(items) => {
                            onSave(items);
                            onOpenChange(false);
                        }}
                        onCancel={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
