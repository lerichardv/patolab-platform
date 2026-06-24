import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import TemplateForm from './template-form';

interface User {
    id: number;
    name: string;
    email: string;
}

interface SpecimenTypeExamination {
    id: number;
    name: string;
}

interface SpecimenType {
    id: number;
    name: string;
    examinations: SpecimenTypeExamination[];
}

interface SectionsOrderElement {
    key: string;
    order: number;
    active: boolean;
}

interface Template {
    id: number;
    user_id: number;
    specimen_type_id: number;
    specimen_type_examination_id: number;
    clinical_details_html: string | null;
    diagnosis_html: string | null;
    macroscopy_html: string | null;
    microscopy_html: string | null;
    comments_notes_html: string | null;
    protocols_html: string | null;
    legend_html: string | null;
    sections_order?: SectionsOrderElement[] | null;
}

interface Props {
    template: Template | null;
    specimenTypes: SpecimenType[];
    users: User[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function TemplateSheet({
    template,
    specimenTypes,
    users,
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
                        users={users}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
