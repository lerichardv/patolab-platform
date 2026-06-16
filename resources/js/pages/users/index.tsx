import { Head, router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import {
    Edit2,
    Plus,
    Search,
    Trash2,
    Users,
    FileSpreadsheet,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
    index as usersIndex,
    destroy as destroyUser,
} from '@/actions/App/Http/Controllers/UserController';
import { Pagination } from '@/components/pagination';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import UserSheet from './user-sheet';

interface User {
    id: number;
    name: string;
    email: string;
    active: boolean;
    role_id?: number;
    role?: {
        id: number;
        name: string;
        slug: string;
    };
}

interface Props {
    users: {
        data: User[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
        from: number;
        to: number;
    };
    roles: Array<{ id: number; name: string; slug: string }>;
    filters: {
        search?: string;
    };
}

export default function UsersIndex({ users, roles, filters }: Props) {
    const { auth } = usePage<any>().props;
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        router.get(
            usersIndex().url,
            { ...filters, [key]: value, page: 1 },
            { preserveState: true, replace: true },
        );
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            handleFilterChange('search', value);
        }, 300),
        [filters],
    );

    useEffect(() => {
        if (search !== (filters.search || '')) {
            debouncedSearch(search);
        }
    }, [search]);

    const handleCreate = () => {
        setSelectedUser(null);
        setIsSheetOpen(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (userToDelete) {
            router.delete(destroyUser(userToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Usuario desactivado correctamente');
                    setIsDeleteDialogOpen(false);
                },
                onError: (errors: any) => {
                    if (errors.error) {
                        toast.error(errors.error);
                    }

                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Usuarios" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Usuarios
                        </h1>
                        <p className="text-muted-foreground">
                            Administre el acceso de los colaboradores a la
                            plataforma.
                        </p>
                    </div>
                    {auth.permissions?.includes('users.create') && (
                        <Button
                            onClick={handleCreate}
                            className="h-10 w-full px-5 text-sm md:w-auto"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o correo..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Correo</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="h-24 text-center"
                                    >
                                        No se encontraron usuarios.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.name}
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            {user.role?.name || (
                                                <span className="text-xs text-muted-foreground italic">
                                                    Sin Rol
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                Activo
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {user.id !== auth.user.id ? (
                                                <div className="flex justify-end gap-2">
                                                    {auth.permissions?.includes(
                                                        'users.edit',
                                                    ) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleEdit(user)
                                                            }
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {auth.permissions?.includes(
                                                        'users.delete',
                                                    ) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive"
                                                            onClick={() =>
                                                                handleDeleteClick(
                                                                    user,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="pr-2 text-xs text-muted-foreground italic">
                                                    Tú
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={users.links}
                    meta={{
                        from: users.from,
                        to: users.to,
                        total: users.total,
                    }}
                />
            </div>

            <UserSheet
                user={selectedUser}
                roles={roles}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Desactivar usuario?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactivará al usuario{' '}
                            <strong>{userToDelete?.name}</strong>. Ya no podrá
                            iniciar sesión en la plataforma.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Desactivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
