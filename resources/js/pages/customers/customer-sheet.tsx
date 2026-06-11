import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CustomerForm from './customer-form';
import { cn } from '@/lib/utils';

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
    className?: string;
    overlayClassName?: string;
}

export default function CustomerSheet({
    customer,
    open,
    onOpenChange,
    className,
    overlayClassName,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className={cn(
                    'w-full overflow-y-auto sm:max-w-[540px]',
                    className,
                )}
                overlayClassName={overlayClassName}
            >
                <HeadingSheet
                    title={customer ? 'Editar Cliente' : 'Nuevo Cliente'}
                    description={
                        customer
                            ? 'Actualice la información del cliente aquí.'
                            : 'Complete los campos para registrar un nuevo cliente.'
                    }
                />
                <CustomerForm
                    customer={customer || undefined}
                    onSuccess={() => onOpenChange(false)}
                />
            </SheetContent>
        </Sheet>
    );
}
