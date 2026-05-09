import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import CustomerForm from './customer-form';

interface Customer {
    id?: number;
    name: string;
    id_number: string;
    type: 'cliente' | 'empresa';
    age: number | string;
    phone: string;
    secondary_phone: string;
    gender: string;
    state: string;
    city: string;
    address: string;
    email: string;
}

interface Props {
    customer?: Customer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CustomerSheet({ customer, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className='text-2xl'>{customer ? 'Editar Cliente' : 'Nuevo Cliente'}</SheetTitle>
                    <SheetDescription>
                        {customer 
                            ? 'Actualice la información del cliente aquí.' 
                            : 'Complete los campos para registrar un nuevo cliente.'}
                    </SheetDescription>
                </SheetHeader>
                <CustomerForm 
                    customer={customer || undefined} 
                    onSuccess={() => onOpenChange(false)} 
                />
            </SheetContent>
        </Sheet>
    );
}
