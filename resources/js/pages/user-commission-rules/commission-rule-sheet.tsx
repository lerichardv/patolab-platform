import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CommissionRuleForm from './commission-rule-form';

interface User {
    id: number;
    name: string;
    email: string;
}

interface SpecimenType {
    id: number;
    name: string;
}

interface SpecimenTypeExamination {
    id: number;
    specimen_type: number;
    name: string;
}

interface Rule {
    id?: number;
    user_id: number;
    specimen_type_id: number;
    specimen_type_examination_id: number;
    macroscopy_commission_enabled: boolean;
    macroscopy_calculation_type?: string | null;
    macroscopy_commission_value: string | number;
    microscopy_commission_enabled: boolean;
    microscopy_calculation_type?: string | null;
    microscopy_commission_value: string | number;
}

interface CommissionRuleSheetProps {
    rule?: Rule | null;
    users: User[];
    specimenTypes: SpecimenType[];
    examinations: SpecimenTypeExamination[];
    isDuplicate?: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CommissionRuleSheet({
    rule,
    users,
    specimenTypes,
    examinations,
    isDuplicate = false,
    open,
    onOpenChange,
}: CommissionRuleSheetProps) {
    let title = 'Nueva Regla de Comisión';
    let description =
        'Complete los campos para registrar una nueva regla de comisión.';

    if (rule) {
        if (isDuplicate) {
            title = 'Duplicar Regla de Comisión';
            description =
                'Configure los nuevos campos de destino para la regla copiada.';
        } else {
            title = 'Editar Regla de Comisión';
            description =
                'Actualice los valores o estados de la regla de comisión seleccionada.';
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="h-full overflow-y-auto p-0 sm:max-w-xl">
                <HeadingSheet title={title} description={description} />
                <CommissionRuleForm
                    rule={rule}
                    users={users}
                    specimenTypes={specimenTypes}
                    examinations={examinations}
                    isDuplicate={isDuplicate}
                    onSuccess={() => onOpenChange(false)}
                />
            </SheetContent>
        </Sheet>
    );
}
