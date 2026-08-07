import {
    store as storeTemplate,
    update as updateTemplate,
} from '@/actions/App/Http/Controllers/SpecimenTypeTemplateController';
import HeadingSheet from '@/components/heading-sheet';
import type { Template, SpecimenType, User } from './template-form';
import TemplateForm from './template-form';
import { Sheet, SheetContent } from '@/components/ui/sheet';

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
                        storeAction={storeTemplate}
                        updateAction={updateTemplate}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
