import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CategoryForm from './category-form';

interface Category {
    id: number;
    name: string;
    unit: string | null;
    quantity: number | null;
}

interface Props {
    category: Category | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CategorySheet({ category, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[540px]">
                <HeadingSheet
                    title={category ? 'Editar Categoría' : 'Nueva Categoría'}
                    description={
                        category
                            ? 'Realice cambios en la información de la categoría aquí.'
                            : 'Complete el formulario para crear una nueva categoría.'
                    }
                />
                <CategoryForm
                    category={category}
                    onSuccess={() => onOpenChange(false)}
                />
            </SheetContent>
        </Sheet>
    );
}
