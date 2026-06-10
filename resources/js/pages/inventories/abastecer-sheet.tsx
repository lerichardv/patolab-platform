import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import AbastecerForm from '@/pages/inventories/abastecer-form';

interface Inventory {
    id: number;
    storage_relation: { name: string };
    product_relation: { name: string; code: string };
    quantity: number;
}

interface Props {
    inventories: Inventory[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AbastecerSheet({
    inventories,
    open,
    onOpenChange,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[540px]">
                <HeadingSheet
                    title="Abastecer Inventario"
                    description="Seleccione un producto existente en bodega y sume la cantidad abastecida."
                />
                <AbastecerForm
                    inventories={inventories}
                    onSuccess={() => onOpenChange(false)}
                />
            </SheetContent>
        </Sheet>
    );
}
