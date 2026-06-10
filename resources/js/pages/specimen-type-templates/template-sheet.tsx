import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import TemplateForm from './template-form';

interface SpecimenType {
    id: number;
    name: string;
    has_template: boolean;
}

interface Template {
    id: number;
    specimen_type_id: number;
    diagnosis_html: string | null;
    macroscopy_html: string | null;
    microscopy_html: string | null;
}

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
                <div className="mt-4 flex flex-1 flex-col overflow-hidden">
                    <TemplateForm
                        template={template}
                        specimenTypes={specimenTypes}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
