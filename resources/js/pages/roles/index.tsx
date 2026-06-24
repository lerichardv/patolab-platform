import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ShieldCheck, Plus, Edit2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    index as rolesIndex,
    store as storeRole,
    update as updateRole,
    destroy as destroyRole,
} from '@/actions/App/Http/Controllers/RoleController';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface Permission {
    id: number;
    name: string;
    slug: string;
}

interface Role {
    id: number;
    name: string;
    slug: string;
    permissions: Permission[];
}

interface Props {
    roles: Role[];
    selectedRoleId: number | null;
    selectedRole: Role | null;
    permissions: Permission[];
}

interface PermissionRow {
    label: string;
    description: string;
    slugs: {
        view?: string;
        create?: string;
        edit?: string;
        delete?: string;
        manage?: string;
    };
}

const permissionRows: PermissionRow[] = [
    {
        label: 'Usuarios del Sistema',
        description: 'Gestión de cuentas de colaboradores y acceso.',
        slugs: {
            view: 'users.view',
            create: 'users.create',
            edit: 'users.edit',
            delete: 'users.delete',
        },
    },
    {
        label: 'Roles y Permisos',
        description: 'Administración de roles y asignación de permisos.',
        slugs: {
            view: 'roles.view',
            create: 'roles.create',
            edit: 'roles.edit',
            delete: 'roles.delete',
        },
    },
    {
        label: 'Comisiones de Usuarios',
        description: 'Reglas y gestión de comisiones de patólogos.',
        slugs: {
            view: 'user_commission_rules.view',
            create: 'user_commission_rules.create',
            edit: 'user_commission_rules.edit',
            delete: 'user_commission_rules.delete',
        },
    },
    {
        label: 'Pacientes',
        description: 'Visualización y gestión de expedientes de pacientes.',
        slugs: {
            view: 'patients.view',
            create: 'patients.create',
            edit: 'patients.edit',
            delete: 'patients.delete',
        },
    },
    {
        label: 'Muestras Médicas',
        description:
            'Recepción, análisis, diagnóstico y asignación de patólogos.',
        slugs: {
            view: 'specimens.view',
            create: 'specimens.create',
            edit: 'specimens.edit',
            delete: 'specimens.delete',
            manage: 'specimens.manage',
        },
    },
    {
        label: 'Reportes y Estadísticas',
        description: 'Consulta y exportación de reportes operativos.',
        slugs: {
            view: 'reports.view',
            manage: 'reports.export',
        },
    },
    {
        label: 'Otros Cobros',
        description: 'Gestión de cobros de equipos, espacios o servicios.',
        slugs: {
            view: 'rentals.view',
            create: 'rentals.create',
            edit: 'rentals.edit',
            delete: 'rentals.delete',
        },
    },
    {
        label: 'Configuración del Sistema',
        description: 'Parámetros generales de la plataforma y del laboratorio.',
        slugs: {
            view: 'settings.view',
            edit: 'settings.edit',
            manage: 'settings.manage',
        },
    },
    {
        label: 'Productos de Inventario',
        description: 'Catálogo de reactivos, insumos y materiales.',
        slugs: {
            view: 'products.view',
            create: 'products.create',
            edit: 'products.edit',
            delete: 'products.delete',
        },
    },
    {
        label: 'Inventario (Carga y Abastecimiento)',
        description: 'Ingresos, egresos y control de stock de insumos.',
        slugs: {
            view: 'inventory.view',
            create: 'inventory.add',
            manage: 'inventory.manage',
        },
    },
    {
        label: 'Movimientos de Inventario',
        description: 'Historial de transacciones de almacén.',
        slugs: {
            view: 'inventory.movements.view',
        },
    },
    {
        label: 'Almacenes (Bodegas)',
        description: 'Registro y asignación física de productos.',
        slugs: {
            view: 'storages.view',
            create: 'storages.create',
            edit: 'storages.edit',
            delete: 'storages.delete',
        },
    },
    {
        label: 'Tipos de Muestra',
        description: 'Configuración de tipos de tejidos y fluidos admitidos.',
        slugs: {
            view: 'specimen_types.view',
            create: 'specimen_types.create',
            edit: 'specimen_types.edit',
            delete: 'specimen_types.delete',
        },
    },
    {
        label: 'Plantillas de Muestra',
        description:
            'Plantillas prediseñadas para diagnósticos rápidos de muestras.',
        slugs: {
            view: 'specimen_type_templates.view',
            create: 'specimen_type_templates.create',
            edit: 'specimen_type_templates.edit',
            delete: 'specimen_type_templates.delete',
        },
    },
    {
        label: 'Análisis y Exámenes',
        description: 'Configuración de pruebas médicas específicas.',
        slugs: {
            view: 'specimen_type_examinations.view',
            create: 'specimen_type_examinations.create',
            edit: 'specimen_type_examinations.edit',
            delete: 'specimen_type_examinations.delete',
        },
    },
    {
        label: 'Categorías de Muestra',
        description: 'Clasificaciones y agrupaciones para muestras.',
        slugs: {
            view: 'specimen_categories.view',
            create: 'specimen_categories.create',
            edit: 'specimen_categories.edit',
            delete: 'specimen_categories.delete',
        },
    },
    {
        label: 'Secuencias y Numeración',
        description: 'Rangos de correlativos y folios internos.',
        slugs: {
            view: 'sequences.view',
            create: 'sequences.create',
            edit: 'sequences.edit',
            delete: 'sequences.delete',
        },
    },
    {
        label: 'Remitentes (Médicos/Clínicas)',
        description: 'Médicos referentes y orígenes de muestras.',
        slugs: {
            view: 'referrers.view',
            create: 'referrers.create',
            edit: 'referrers.edit',
            delete: 'referrers.delete',
        },
    },
    {
        label: 'Tipos de Remitente',
        description:
            'Clasificación de orígenes (ej. Hospital, Consulta Privada).',
        slugs: {
            view: 'referrer_types.view',
            create: 'referrer_types.create',
            edit: 'referrer_types.edit',
            delete: 'referrer_types.delete',
        },
    },
    {
        label: 'Sucursales / Laboratorios',
        description: 'Sedes y ubicaciones de recolección de Patolab.',
        slugs: {
            view: 'locations.view',
            create: 'locations.create',
            edit: 'locations.edit',
            delete: 'locations.delete',
        },
    },
    {
        label: 'Rangos de Facturación (SAR/CAI)',
        description: 'Autorizaciones tributarias y límites de facturas.',
        slugs: {
            view: 'cai_ranges.view',
            create: 'cai_ranges.create',
            edit: 'cai_ranges.edit',
            delete: 'cai_ranges.delete',
        },
    },
    {
        label: 'Facturas Emitidas',
        description: 'Visualización de comprobantes fiscales generados.',
        slugs: {
            view: 'invoices.view',
            manage: 'invoices.manage',
        },
    },
    {
        label: 'Créditos y Cuentas por Cobrar',
        description: 'Estados de cuenta de clientes corporativos y abonos.',
        slugs: {
            view: 'credits.view',
            manage: 'credits.manage',
        },
    },
];

export default function RolesIndex({
    roles,
    selectedRoleId,
    selectedRole,
    permissions,
}: Props) {
    const { auth } = usePage<any>().props;
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const createForm = useForm({
        name: '',
    });

    const editForm = useForm({
        name: selectedRole?.name || '',
    });

    // Sync edit form name when selected role changes
    useEffect(() => {
        if (selectedRole) {
            editForm.setData('name', selectedRole.name);
        }
    }, [selectedRole]);

    const handleRoleChange = (value: string) => {
        router.get(
            rolesIndex().url,
            { role_id: value },
            { preserveState: true },
        );
    };

    const handleCreateRole = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(storeRole().url, {
            onSuccess: () => {
                toast.success('Rol creado correctamente');
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const handleRenameRole = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedRole) {
            return;
        }

        editForm.put(updateRole(selectedRole.id).url, {
            onSuccess: () => {
                toast.success('Rol renombrado correctamente');
                setIsEditOpen(false);
            },
        });
    };

    const handleDeleteRole = () => {
        if (!selectedRole) {
            return;
        }

        router.delete(destroyRole(selectedRole.id).url, {
            onSuccess: () => {
                toast.success('Rol eliminado correctamente');
                setIsDeleteOpen(false);
            },
            onError: (errors: any) => {
                if (errors.error) {
                    toast.error(errors.error);
                }

                setIsDeleteOpen(false);
            },
        });
    };

    const handleTogglePermission = (permissionId: number) => {
        if (!selectedRole) {
            return;
        }

        const isAssigned = selectedRole.permissions.some(
            (p) => p.id === permissionId,
        );
        let newPermissionIds: number[] = [];

        if (isAssigned) {
            newPermissionIds = selectedRole.permissions
                .filter((p) => p.id !== permissionId)
                .map((p) => p.id);
        } else {
            newPermissionIds = [
                ...selectedRole.permissions.map((p) => p.id),
                permissionId,
            ];
        }

        router.put(
            updateRole(selectedRole.id).url,
            {
                name: selectedRole.name,
                permission_ids: newPermissionIds,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Permisos del rol actualizados');
                },
            },
        );
    };

    // Helper to find a permission in the database by slug
    const findPermissionBySlug = (slug?: string) => {
        if (!slug) {
            return null;
        }

        return permissions.find((p) => p.slug === slug) || null;
    };

    // Helper to check if the selected role has a permission
    const hasPermission = (permissionId: number) => {
        if (!selectedRole) {
            return false;
        }

        return selectedRole.permissions.some((p) => p.id === permissionId);
    };

    return (
        <>
            <Head title="Roles y Permisos" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <ShieldCheck className="h-6 w-6 text-primary" />{' '}
                            Roles y Permisos
                        </h1>
                        <p className="text-muted-foreground">
                            Configure los roles del sistema y asigne los accesos
                            y permisos correspondientes.
                        </p>
                    </div>
                    {auth.permissions?.includes('roles.create') && (
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="h-10 w-full px-5 text-sm md:w-auto"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Rol
                        </Button>
                    )}
                </div>

                <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                        <div className="w-full max-w-sm space-y-2">
                            <Label
                                htmlFor="role-select"
                                className="text-sm font-semibold"
                            >
                                Seleccionar Rol a Gestionar
                            </Label>
                            {roles.length > 0 && selectedRoleId && (
                                <Select
                                    value={selectedRoleId.toString()}
                                    onValueChange={handleRoleChange}
                                >
                                    <SelectTrigger id="role-select">
                                        <SelectValue placeholder="Seleccione un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem
                                                key={role.id}
                                                value={role.id.toString()}
                                            >
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {selectedRole && (
                            <div className="flex w-full gap-2 sm:w-auto">
                                {auth.permissions?.includes('roles.edit') && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsEditOpen(true)}
                                        disabled={
                                            selectedRole.id === 1 ||
                                            selectedRole.id === 2
                                        }
                                        className="flex-1 sm:flex-none"
                                    >
                                        <Edit2 className="mr-2 h-4 w-4" />{' '}
                                        Renombrar
                                    </Button>
                                )}
                                {auth.permissions?.includes('roles.delete') && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => setIsDeleteOpen(true)}
                                        disabled={
                                            selectedRole.id === 1 ||
                                            selectedRole.id === 2
                                        }
                                        className="flex-1 sm:flex-none"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />{' '}
                                        Eliminar
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {selectedRole ? (
                    <div className="overflow-hidden rounded-md border bg-card">
                        <Table>
                            <TableHeader className="bg-muted/55">
                                <TableRow>
                                    <TableHead className="w-[30%]">
                                        Módulo / Sección
                                    </TableHead>
                                    <TableHead className="w-[14%] text-center">
                                        Ver
                                    </TableHead>
                                    <TableHead className="w-[14%] text-center">
                                        Crear
                                    </TableHead>
                                    <TableHead className="w-[14%] text-center">
                                        Editar
                                    </TableHead>
                                    <TableHead className="w-[14%] text-center">
                                        Eliminar
                                    </TableHead>
                                    <TableHead className="w-[14%] text-center">
                                        Gestionar
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {permissionRows.map((row) => (
                                    <TableRow
                                        key={row.label}
                                        className="hover:bg-muted/20"
                                    >
                                        <TableCell className="py-4 font-medium">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold">
                                                    {row.label}
                                                </span>
                                                <span className="mt-0.5 text-xs leading-relaxed font-normal text-muted-foreground">
                                                    {row.description}
                                                </span>
                                            </div>
                                        </TableCell>
                                        {(
                                            [
                                                'view',
                                                'create',
                                                'edit',
                                                'delete',
                                                'manage',
                                            ] as const
                                        ).map((action) => {
                                            const permSlug = row.slugs[action];
                                            const perm =
                                                findPermissionBySlug(permSlug);

                                            return (
                                                <TableCell
                                                    key={action}
                                                    className="py-4 text-center"
                                                >
                                                    {perm ? (
                                                        <div className="flex items-center justify-center">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        asChild
                                                                    >
                                                                        <div>
                                                                            <Switch
                                                                                checked={hasPermission(
                                                                                    perm.id,
                                                                                )}
                                                                                onCheckedChange={() =>
                                                                                    handleTogglePermission(
                                                                                        perm.id,
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    selectedRole.id ===
                                                                                        1 ||
                                                                                    !auth.permissions?.includes(
                                                                                        'roles.edit',
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="text-xs">
                                                                            {
                                                                                perm.name
                                                                            }
                                                                        </p>
                                                                        <p className="font-mono text-[10px] text-muted-foreground">
                                                                            {
                                                                                perm.slug
                                                                            }
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    ) : (
                                                        <span className="font-light text-muted-foreground/35 select-none">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {selectedRole.id === 1 && (
                            <div className="border-t bg-muted/30 p-4 text-center text-xs text-muted-foreground italic">
                                El rol de Administrador tiene acceso total a
                                todos los módulos y no se puede modificar.
                            </div>
                        )}
                        {selectedRole.id === 2 && (
                            <div className="border-t bg-muted/30 p-4 text-center text-xs text-muted-foreground italic">
                                El rol de Patólogo es un rol principal del
                                sistema y no puede ser renombrado ni eliminado.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-md border bg-card p-12 text-center">
                        <ShieldCheck className="h-10 w-10 text-muted-foreground/50" />
                        <h3 className="text-lg font-semibold">
                            No hay rol seleccionado
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Por favor, cree un rol para comenzar a administrar
                            los permisos.
                        </p>
                    </div>
                )}
            </div>

            {/* Create Role Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleCreateRole}>
                        <DialogHeader>
                            <DialogTitle>Nuevo Rol</DialogTitle>
                            <DialogDescription>
                                Ingrese el nombre para el nuevo rol de usuario.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="new-role-name">
                                    Nombre del Rol
                                </Label>
                                <Input
                                    id="new-role-name"
                                    value={createForm.data.name}
                                    onChange={(e) =>
                                        createForm.setData(
                                            'name',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Ej. Secretaria"
                                    required
                                />
                                {createForm.errors.name && (
                                    <p className="text-sm text-destructive">
                                        {createForm.errors.name}
                                    </p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                            >
                                Crear Rol
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Role Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleRenameRole}>
                        <DialogHeader>
                            <DialogTitle>Renombrar Rol</DialogTitle>
                            <DialogDescription>
                                Modifique el nombre del rol seleccionado.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-role-name">
                                    Nombre del Rol
                                </Label>
                                <Input
                                    id="edit-role-name"
                                    value={editForm.data.name}
                                    onChange={(e) =>
                                        editForm.setData('name', e.target.value)
                                    }
                                    required
                                />
                                {editForm.errors.name && (
                                    <p className="text-sm text-destructive">
                                        {editForm.errors.name}
                                    </p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={editForm.processing}
                            >
                                Guardar Cambios
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Role AlertDialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Está seguro de que desea eliminar este rol?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará de forma permanente el rol{' '}
                            <strong>{selectedRole?.name}</strong>. No podrá
                            revertir esta acción. Asegúrese de que no haya
                            usuarios asignados a este rol antes de continuar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteRole}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Eliminar Rol
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
