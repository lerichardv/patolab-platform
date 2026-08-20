import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CreditExtractSpecimenForm from './credit-extract-specimen-form';

interface Customer {
    id: number;
    name: string;
    id_number: string;
}

interface CreditInvoiceSpecimen {
    id: number;
    credit_id: number;
    invoice_id: number;
    specimen_id: number;
    is_paid: boolean;
    amount: string | number;
    discount: string | number;
    subtotal: string | number;
    total: string | number;
    quantity: number;
    quantity_paid?: number;
    specimen?: {
        id: number;
        sequence_code: string;
        customer_relation?: {
            name: string;
        };
        type?: {
            name: string;
        };
        examination?: {
            name: string;
        };
    };
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
    invoice_specimens?: CreditInvoiceSpecimen[];
    credit_invoice_specimens?: CreditInvoiceSpecimen[];
    group?: {
        id: number;
        name: string;
        specimens?: any[];
    };
}

interface Props {
    credit: Credit | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CreditExtractSpecimenSheet({
    credit,
    open,
    onOpenChange,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[700px]">
                <HeadingSheet
                    title="Sacar Muestra de Grupo"
                    description="Seleccione una o más muestras para extraer del grupo de crédito. Puede generar una factura para seguro con número fiscal o un nuevo crédito."
                />
                {credit && (
                    <CreditExtractSpecimenForm
                        credit={credit}
                        onSuccess={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
