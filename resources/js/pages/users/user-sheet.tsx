import {
    Sheet,
    SheetContent,
} from '@/components/ui/sheet';
import HeadingSheet from '@/components/heading-sheet';
import UserForm from './user-form';

interface User {
    id?: number;
    name: string;
    email: string;
}

interface UserSheetProps {
    user?: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function UserSheet({ user, open, onOpenChange }: UserSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl p-0">
                <HeadingSheet 
                    title={user ? 'Editar Usuario' : 'Nuevo Usuario'}
                    description={user 
                        ? 'Actualice la información del usuario aquí.' 
                        : 'Complete los campos para registrar un nuevo usuario.'}
                />
                <UserForm 
                    user={user || undefined} 
                    onSuccess={() => onOpenChange(false)} 
                />
            </SheetContent>
        </Sheet>
    );
}
