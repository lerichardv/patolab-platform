import {
    Sheet,
    SheetContent,
    SheetHeader,
	SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';
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
                <SheetHeader>
                    <SheetTitle className='text-2xl'>
                        {user ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </SheetTitle>
					<SheetDescription>
                        {user 
                            ? 'Actualice la información del usuario aquí.' 
                            : 'Complete los campos para registrar un nuevo usuario.'}
                    </SheetDescription>
                </SheetHeader>
                <UserForm 
                    user={user || undefined} 
                    onSuccess={() => onOpenChange(false)} 
                />
            </SheetContent>
        </Sheet>
    );
}
