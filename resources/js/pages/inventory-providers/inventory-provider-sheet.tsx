import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import InventoryProviderForm from './inventory-provider-form';

interface Provider {
    id?: number;
    name: string;
    phone: string;
    phone2?: string | null;
    email: string;
    address: string;
}

interface Props {
    provider?: Provider | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    className?: string;
    overlayClassName?: string;
}

export default function InventoryProviderSheet({
    provider,
    open,
    onOpenChange,
    onSuccess,
    className,
    overlayClassName,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className={cn(
                    'w-full overflow-y-auto sm:max-w-[540px]',
                    className,
                )}
                overlayClassName={overlayClassName}
            >
                <HeadingSheet
                    title={provider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    description={
                        provider
                            ? 'Actualice la información del proveedor aquí.'
                            : 'Complete los campos para registrar un nuevo proveedor.'
                    }
                />
                <InventoryProviderForm
                    provider={provider || undefined}
                    onSuccess={() => {
                        if (onSuccess) {
                            onSuccess();
                        }

                        onOpenChange(false);
                    }}
                />
            </SheetContent>
        </Sheet>
    );
}
