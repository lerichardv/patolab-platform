import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import UserForm from './user-form';

interface User {
    id?: number;
    name: string;
    email: string;
    role_id?: number;
}

interface UserSheetProps {
    user?: User | null;
    roles: Array<{ id: number; name: string; slug: string }>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function UserSheet({
    user,
    roles,
    open,
    onOpenChange,
}: UserSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="p-0 sm:max-w-xl">
                <HeadingSheet
                    title={user ? 'Editar Usuario' : 'Nuevo Usuario'}
                    description={
                        user
                            ? 'Actualice la información del usuario aquí.'
                            : 'Complete los campos para registrar un nuevo usuario.'
                    }
                />
                <UserForm
                    user={user || undefined}
                    roles={roles}
                    onSuccess={() => onOpenChange(false)}
                />
            </SheetContent>
        </Sheet>
    );
}
