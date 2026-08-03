import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import TemplateForm, {
    Template,
    SpecimenType,
} from '@/components/template-form';
import {
    store as storeTemplate,
    update as updateTemplate,
} from '@/actions/App/Http/Controllers/MySpecimenTypeTemplateController';

interface Props {
    template: Template | null;
    specimenTypes: SpecimenType[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function TemplateSheet({
    template,
    specimenTypes,
    open,
    onOpenChange,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex h-full flex-col overflow-hidden p-0 sm:max-w-[800px]">
                <HeadingSheet
                    title={template ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    description={
                        template
                            ? 'Realice cambios en la información de la plantilla aquí.'
                            : 'Complete el formulario para crear una nueva plantilla.'
                    }
                />
                <div className="flex flex-1 flex-col overflow-hidden">
                    <TemplateForm
                        template={template}
                        specimenTypes={specimenTypes}
                        onSuccess={() => onOpenChange(false)}
                        storeAction={storeTemplate}
                        updateAction={updateTemplate}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
