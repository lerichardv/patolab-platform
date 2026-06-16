import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import { Edit2, Plus, Search, Tag, Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
    index as typesIndex,
    destroy as destroyType,
} from '@/actions/App/Http/Controllers/ReferrerTypeController';
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
import ReferrerTypeSheet from './referrer-type-sheet';

interface ReferrerType {
    id: number;
    name: string;
    created_at: string;
}

interface Props {
    referrerTypes: {
        data: ReferrerType[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters: {
        search?: string;
    };
}

export default function ReferrerTypesIndex({ referrerTypes, filters }: Props) {
    const { auth } = usePage<any>().props;
    const canCreate = auth.permissions?.includes('referrer_types.create');
    const canEdit = auth.permissions?.includes('referrer_types.edit');
    const canDelete = auth.permissions?.includes('referrer_types.delete');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<ReferrerType | null>(null);
    const [typeToDelete, setTypeToDelete] = useState<ReferrerType | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        router.get(typesIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            handleFilterChange('search', value);
        }, 300),
        [filters],
    );

    useEffect(() => {
        if (search !== filters.search) {
            debouncedSearch(search);
        }
    }, [search]);

    const handleEdit = (type: ReferrerType) => {
        setSelectedType(type);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedType(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (type: ReferrerType) => {
        setTypeToDelete(type);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (typeToDelete) {
            router.delete(destroyType(typeToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Tipo de remitente eliminado correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Tipos de Remitentes" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Tag className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Tipos de Remitentes
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Gestione las categorías para organizar sus
                            remitentes.
                        </p>
                    </div>
                    {canCreate && (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleCreate}
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Tipo
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar tipo..."
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
                                <TableHead>Fecha Creación</TableHead>
                                <TableHead className="text-right">
                                    {(canEdit || canDelete) && 'Acciones'}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {referrerTypes.data.length > 0 ? (
                                referrerTypes.data.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-medium">
                                            {type.name}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(
                                                type.created_at,
                                            ).toLocaleDateString('es-ES')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(canEdit || canDelete) && (
                                                <div className="flex justify-end gap-2">
                                                    {canEdit && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleEdit(type)
                                                            }
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {canDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive"
                                                            onClick={() =>
                                                                handleDeleteClick(
                                                                    type,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
                                        className="h-24 text-center"
                                    >
                                        No se encontraron resultados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={referrerTypes.links}
                    meta={{
                        from: referrerTypes.from,
                        to: referrerTypes.to,
                        total: referrerTypes.total,
                    }}
                />
            </div>

            <ReferrerTypeSheet
                referrerType={selectedType}
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
                            ¿Eliminar tipo de remitente?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactivará el tipo{' '}
                            <strong>{typeToDelete?.name}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
