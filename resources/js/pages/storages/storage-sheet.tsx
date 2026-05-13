import { Sheet, SheetContent } from '@/components/ui/sheet';
import HeadingSheet from '@/components/heading-sheet';
import StorageForm from './storage-form';

interface Storage {
    id?: number;
    name: string;
    location: string;
    description: string;
}

interface Props {
    storage?: Storage | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function StorageSheet({ storage, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
                <HeadingSheet 
                    title={storage ? 'Editar Almacén' : 'Nuevo Almacén'}
                    description={storage ? 'Actualice la información del almacén aquí.' : 'Complete los campos para registrar un nuevo almacén o bodega.'}
                />
                <StorageForm 
                    storage={storage || undefined} 
                    onSuccess={() => onOpenChange(false)} 
                />
            </SheetContent>
        </Sheet>
    );
}
