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
    is_group?: boolean;
    group_id?: number | null;
    customer?: Customer;
    last_payment_date?: string | null;
    reminder_interval_in_seconds?: number;
    credit_invoice_specimens?: any[];
}

interface Bank {
    id: number;
    name: string;
}

interface Props {
    credit: Credit | null;
    banks?: Bank[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CreditSheet({
    credit,
    banks = [],
    open,
    onOpenChange,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[680px]">
                <HeadingSheet
                    title="Registrar Pago de Crédito"
                    description="Seleccione el método de pago, ingrese los detalles requeridos y suba el comprobante correspondiente."
                />
                {credit && (
                    <CreditForm
                        credit={credit}
                        banks={banks}
                        onSuccess={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
