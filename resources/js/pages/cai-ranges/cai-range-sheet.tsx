import { Sheet, SheetContent } from '@/components/ui/sheet';
import HeadingSheet from '@/components/heading-sheet';
import CaiRangeForm from './cai-range-form';

interface Location {
    id: number;
    name: string;
}

interface CaiRange {
    id?: number;
    location_id: number | string;
    cai: string;
    full_prefix: string;
    emission: string;
    establishment: string;
    document_type: string;
    start_number: number | string;
    end_number: number | string;
    last_used_number: number | string;
    deadline: string;
    status: 'active' | 'exhausted' | 'expired';
    limit_percentage_warning: number | string;
    limit_days_warning: number | string;
    warning_notifications_amount: number | string;
    warning_notifications_sent: number | string;
}

interface Props {
    caiRange?: CaiRange | null;
    locations: Location[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CaiRangeSheet({ caiRange, locations, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
                <HeadingSheet 
                    title={caiRange ? 'Editar Rango de Facturación' : 'Nuevo Rango de Facturación'}
                    description={caiRange ? 'Actualice la información del rango de facturación aquí.' : 'Complete los campos para registrar un nuevo rango de facturación y alertar a la administración.'}
                />
                <CaiRangeForm 
                    caiRange={caiRange || undefined} 
                    locations={locations}
                    onSuccess={() => onOpenChange(false)} 
                />
            </SheetContent>
        </Sheet>
    );
}
