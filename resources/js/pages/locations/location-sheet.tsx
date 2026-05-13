import { Sheet, SheetContent } from '@/components/ui/sheet';
import HeadingSheet from '@/components/heading-sheet';
import LocationForm from './location-form';

interface Location {
    id?: number;
    name: string;
    rtn: string;
    address: string;
    phone: string;
    email: string;
}

interface Props {
    location?: Location | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function LocationSheet({ location, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
                <HeadingSheet 
                    title={location ? 'Editar Sucursal' : 'Nueva Sucursal'} 
                    description={location 
                        ? 'Actualice la información de la sucursal aquí.' 
                        : 'Complete los campos para registrar una nueva sucursal.'} 
                />
                
                <LocationForm 
                    location={location || undefined} 
                    onSuccess={() => onOpenChange(false)} 
                />
            </SheetContent>
        </Sheet>
    );
}
