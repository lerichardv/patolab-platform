import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CreditForm from './credit-form';

interface Customer {
    id: number;
    name: string;
    id_number: string;
}

interface Credit {
    id: number;
    customer_id: number;
    credit_amount: string | number;
    amount_paid: string | number;
    amount_remaining: string | number;
    customer?: Customer;
    last_payment_date?: string | null;
    reminder_interval_in_seconds?: number;
}

interface Props {
    credit: Credit | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CreditSheet({ credit, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[540px]">
                <HeadingSheet
                    title="Registrar Pago de Crédito"
                    description="Ingrese el monto recibido, seleccione el tipo de pago y suba el comprobante correspondiente."
                />
                {credit && (
                    <CreditForm
                        credit={credit}
                        onSuccess={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
