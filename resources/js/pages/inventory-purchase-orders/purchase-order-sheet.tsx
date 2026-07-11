import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import PurchaseOrderForm from './purchase-order-form';

interface Provider {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    code: string;
}

interface PurchaseOrderProduct {
    id?: number;
    product_id: string | number;
    specification: string;
    quantity: number;
    unit_price: number;
}

interface PurchaseOrder {
    id?: number;
    provider_id: string | number;
    date_requested: string;
    date_delivered?: string | null;
    status: 'pending' | 'received';
    products: PurchaseOrderProduct[];
}

interface Props {
    purchaseOrder?: PurchaseOrder | null;
    providers?: Provider[];
    products: Product[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    className?: string;
    overlayClassName?: string;
}

export default function PurchaseOrderSheet({
    purchaseOrder,
    providers = [],
    products,
    open,
    onOpenChange,
    className,
    overlayClassName,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className={cn(
                    'w-full overflow-y-auto sm:max-w-[720px]',
                    className,
                )}
                overlayClassName={overlayClassName}
            >
                <HeadingSheet
                    title={purchaseOrder ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
                    description={
                        purchaseOrder
                            ? 'Actualice la información de la orden de compra aquí.'
                            : 'Complete los campos para registrar una nueva orden de compra.'
                    }
                />
                <PurchaseOrderForm
                    purchaseOrder={purchaseOrder || undefined}
                    providers={providers}
                    products={products}
                    onSuccess={() => onOpenChange(false)}
                />
            </SheetContent>
        </Sheet>
    );
}
