import {
    Sheet,
    SheetContent,
} from '@/components/ui/sheet';
import HeadingSheet from '@/components/heading-sheet';
import ReferrerForm from './referrer-form';

interface ReferrerType {
    id: number;
    name: string;
}

interface Referrer {
    id: number;
    referrer_type: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
}

interface Props {
    referrer: Referrer | null;
    referrerTypes: ReferrerType[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ReferrerSheet({ referrer, referrerTypes, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[540px] overflow-y-auto">
                <HeadingSheet 
                    title={referrer ? 'Editar Remitente' : 'Nuevo Remitente'}
                    description={referrer 
                        ? 'Realice cambios en la información del remitente aquí.' 
                        : 'Complete el formulario para registrar un nuevo remitente en el sistema.'}
                />
                <ReferrerForm 
                    referrer={referrer} 
                    referrerTypes={referrerTypes}
                    onSuccess={() => onOpenChange(false)} 
                />
            </SheetContent>
        </Sheet>
    );
}
