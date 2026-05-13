import {
    Sheet,
    SheetContent,
} from '@/components/ui/sheet';
import HeadingSheet from '@/components/heading-sheet';
import ReferrerTypeForm from './referrer-type-form';

interface ReferrerType {
    id: number;
    name: string;
}

interface Props {
    referrerType: ReferrerType | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ReferrerTypeSheet({ referrerType, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[540px]">
                <HeadingSheet 
                    title={referrerType ? 'Editar Tipo de Remitente' : 'Nuevo Tipo de Remitente'}
                    description={referrerType 
                        ? 'Actualice el nombre del tipo de remitente aquí.' 
                        : 'Defina un nuevo tipo de remitente para organizar a sus remitentes.'}
                />
                <ReferrerTypeForm 
                    referrerType={referrerType} 
                    onSuccess={() => onOpenChange(false)} 
                />
            </SheetContent>
        </Sheet>
    );
}
