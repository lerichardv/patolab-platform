import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import ProductForm from '@/pages/products/product-form';

interface Price {
    id?: number;
    amount: number | string;
}

interface Product {
    id?: number;
    code: string;
    name: string;
    description: string;
    unit: 'percentage' | 'miligrams' | 'unit';
    unit_value: number;
    purchase_price: number;
    sale_price: number;
    isv: boolean;
    prices?: Price[];
}

interface Props {
    product?: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export default function ProductSheet({ product, open, onOpenChange, onSuccess }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[540px]">
                <HeadingSheet
                    title={product ? 'Editar Producto' : 'Nuevo Producto'}
                    description={
                        product
                            ? 'Actualice la información del producto aquí.'
                            : 'Complete los campos para registrar un nuevo producto o insumo.'
                    }
                />
                <ProductForm
                    product={product || undefined}
                    onSuccess={() => {
                        onOpenChange(false);
                        if (onSuccess) onSuccess();
                    }}
                />
            </SheetContent>
        </Sheet>
    );
}
