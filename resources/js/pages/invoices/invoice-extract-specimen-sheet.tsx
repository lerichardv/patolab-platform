import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import InvoiceExtractSpecimenForm from './invoice-extract-specimen-form';

interface Customer {
    id: number;
    name: string;
    id_number: string;
}

interface Invoice {
    id: number;
    full_invoice_number?: string | null;
    invoice_number?: string | number | null;
    customer_id: number;
    customer?: Customer;
    payment_type: string;
    amount: string | number;
    discount: string | number;
    subtotal: string | number;
    total: string | number;
    is_group?: boolean;
    group_id?: number | null;
    invoice_specimens?: any[];
    invoiceSpecimens?: any[];
    group?: {
        id: number;
        name: string;
        specimens?: any[];
    };
}

interface Props {
    invoice: Invoice | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export default function InvoiceExtractSpecimenSheet({
    invoice,
    open,
    onOpenChange,
    onSuccess,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[700px]">
                <HeadingSheet
                    title="Separar Muestra de Grupo"
                    description="Seleccione una o más muestras para separar del grupo. Se generará una nueva factura fiscal (CAI) y se actualizará la factura original con las muestras restantes."
                />
                {invoice && (
                    <InvoiceExtractSpecimenForm
                        invoice={invoice}
                        onSuccess={() => {
                            onOpenChange(false);
                            onSuccess?.();
                        }}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
