import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import InventoryForm from '@/pages/inventories/inventory-form';

interface Storage {
	id: number;
	name: string;
}

interface Product {
	id: number;
	code: string;
	name: string;
}

interface Inventory {
	id?: number;
	storage: number;
	product: number;
	quantity: number;
}

interface Props {
	inventory?: Inventory | null;
	storages: Storage[];
	products: Product[];
	existingInventories: { storage: number; product: number }[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function InventorySheet({ inventory, storages, products, existingInventories, open, onOpenChange }: Props) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
				<HeadingSheet
					title={inventory ? 'Editar Inventario' : 'Agregar Productos al Inventario'}
					description={inventory ? 'Actualice la cantidad en stock aquí.' : 'Registre una nueva entrada o ajuste de inventario.'}
				/>
				<InventoryForm
					inventory={inventory || undefined}
					storages={storages}
					products={products}
					existingInventories={existingInventories}
					onSuccess={() => onOpenChange(false)}
				/>
			</SheetContent>
		</Sheet>
	);
}
