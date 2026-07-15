import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
    index as cuttingCodesIndex,
    destroy as destroyCuttingCode,
} from '@/actions/App/Http/Controllers/CuttingCodeController';
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
import CuttingCodeSheet from './cutting-code-sheet';

interface CuttingCode {
    id: number;
    code: string;
    color: string;
    created_at: string;
    updated_at: string;
}

interface Props {
    cuttingCodes: {
        data: CuttingCode[];
        links: {
            url: string | null;
            label: string;
            active: boolean;
        }[];
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

export default function CuttingCodesIndex({ cuttingCodes, filters }: Props) {
    const { auth } = usePage<any>().props;
    const canCreate = auth.permissions?.includes('cutting_codes.create');
    const canEdit = auth.permissions?.includes('cutting_codes.edit');
    const canDelete = auth.permissions?.includes('cutting_codes.delete');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCuttingCode, setSelectedCuttingCode] =
        useState<CuttingCode | null>(null);
    const [cuttingCodeToDelete, setCuttingCodeToDelete] =
        useState<CuttingCode | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const newFilters = { ...filters, [key]: value };

            if (value === '') {
                delete newFilters[key as keyof typeof filters];
            }

            router.get(cuttingCodesIndex().url, newFilters, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                handleFilterChange('search', value);
            }, 300),
        [handleFilterChange],
    );

    useEffect(() => {
        if (search !== filters.search) {
            debouncedSearch(search);
        }
    }, [search, debouncedSearch, filters.search]);

    const handleEdit = (cuttingCode: CuttingCode) => {
        setSelectedCuttingCode(cuttingCode);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedCuttingCode(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (cuttingCode: CuttingCode) => {
        setCuttingCodeToDelete(cuttingCode);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (cuttingCodeToDelete) {
            router.delete(destroyCuttingCode(cuttingCodeToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Código de casete eliminado correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Códigos de Casete" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Códigos de Casete
                        </h1>
                        <p className="text-muted-foreground">
                            Administre los códigos identificadores y colores de
                            los casetes de cortes.
                        </p>
                    </div>
                    {canCreate && (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleCreate}
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Código
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex max-w-sm items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por código..."
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
                                <TableHead className="w-[120px]">
                                    Código
                                </TableHead>
                                <TableHead>Color Asociado</TableHead>
                                <TableHead className="text-right">
                                    {(canEdit || canDelete) && 'Acciones'}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cuttingCodes.data.length > 0 ? (
                                cuttingCodes.data.map((cuttingCode) => (
                                    <TableRow key={cuttingCode.id}>
                                        <TableCell className="font-mono text-sm font-bold">
                                            <span className="inline-block rounded border bg-muted px-2 py-0.5">
                                                {cuttingCode.code}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-5 w-5 rounded-full border shadow-sm"
                                                    style={{
                                                        backgroundColor:
                                                            cuttingCode.color,
                                                    }}
                                                />
                                                <span className="font-mono text-xs text-muted-foreground uppercase">
                                                    {cuttingCode.color}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {canEdit && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleEdit(
                                                                cuttingCode,
                                                            )
                                                        }
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() =>
                                                            handleDeleteClick(
                                                                cuttingCode,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No se encontraron resultados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={cuttingCodes.links}
                    meta={{
                        from: cuttingCodes.from,
                        to: cuttingCodes.to,
                        total: cuttingCodes.total,
                    }}
                />
            </div>

            <CuttingCodeSheet
                cuttingCode={selectedCuttingCode}
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
                            ¿Está completamente seguro?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el código de casete{' '}
                            <strong>{cuttingCodeToDelete?.code}</strong>. Esto
                            eliminará de forma permanente todos los registros y
                            cortes asociados a este código.
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
