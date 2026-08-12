import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CreditFinalPaymentForm from './credit-final-payment-form';

interface Customer {
    id: number;
    name: string;
    id_number: string;
}

interface Invoice {
    id: number;
    invoice_number?: string | null;
    full_invoice_number?: string | null;
    cai_range_id?: number | null;
    payment_type?: string;
}

interface Credit {
    id: number;
    customer_id: number;
    credit_amount: string | number;
    amount_paid: string | number;
    amount_remaining: string | number;
    status?: string;
    is_group?: boolean;
    group_id?: number | null;
    customer?: Customer;
    last_payment_date?: string | null;
    reminder_interval_in_seconds?: number;
    credit_invoice_specimens?: any[];
    invoices?: Invoice[];
    invoice?: Invoice;
    group?: {
        id: number;
        invoice?: Invoice;
    };
    specimen?: any;
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

export default function CreditFinalPaymentSheet({
    credit,
    banks = [],
    open,
    onOpenChange,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[680px]">
                <HeadingSheet
                    title="Generar Factura Final de Crédito"
                    description="Revise los detalles del crédito y las muestras a liquidar para emitir la factura fiscal correspondiente."
                />
                {credit && (
                    <CreditFinalPaymentForm
                        credit={credit}
                        banks={banks}
                        onSuccess={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
