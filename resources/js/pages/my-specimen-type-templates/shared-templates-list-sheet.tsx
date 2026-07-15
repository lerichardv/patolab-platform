import { router } from '@inertiajs/react';
import {
    Trash2,
    FileSpreadsheet,
    Search,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
    revokeShare as revokeShareAction,
    bulkRevokeShare as bulkRevokeShareAction,
} from '@/actions/App/Http/Controllers/MySpecimenTypeTemplateController';
import HeadingSheet from '@/components/heading-sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface User {
    id: number;
    name: string;
    email: string;
}

interface SpecimenType {
    id: number;
    name: string;
}

interface SpecimenTypeExamination {
    id: number;
    name: string;
}

interface SharedPermission {
    id: number;
    owner_id: number;
    specimen_type_id: number;
    specimen_type: SpecimenType | null;
    specimen_type_examination_id: number;
    specimen_type_examination: SpecimenTypeExamination | null;
    template_id: number;
    shared_with_id: number;
    shared_with: User | null;
    created_at: string;
}

interface SharedTemplatesListSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sharedPermissions: SharedPermission[];
}

const ITEMS_PER_PAGE = 10;

export default function SharedTemplatesListSheet({
    open,
    onOpenChange,
    sharedPermissions,
}: SharedTemplatesListSheetProps) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const handleRevoke = (permissionId: number) => {
        router.delete(revokeShareAction(permissionId).url, {
            onSuccess: () => {
                toast.success('Permiso de compartir revocado correctamente');
                setSelectedIds((prev) =>
                    prev.filter((id) => id !== permissionId),
                );
            },
        });
    };

    const handleBulkRevoke = () => {
        if (selectedIds.length === 0) {
            return;
        }

        router.post(
            bulkRevokeShareAction().url,
            { ids: selectedIds },
            {
                onSuccess: () => {
                    toast.success(
                        'Accesos de compartir revocados correctamente',
                    );
                    setSelectedIds([]);
                },
            },
        );
    };

    // Client-side filtering
    const filteredPermissions = useMemo(() => {
        const query = search.toLowerCase().trim();

        if (!query) {
            return sharedPermissions;
        }

        return sharedPermissions.filter((permission) => {
            const userName = permission.shared_with?.name?.toLowerCase() || '';
            const userEmail =
                permission.shared_with?.email?.toLowerCase() || '';
            const specName =
                permission.specimen_type?.name?.toLowerCase() || '';
            const examName =
                permission.specimen_type_examination?.name?.toLowerCase() || '';

            return (
                userName.includes(query) ||
                userEmail.includes(query) ||
                specName.includes(query) ||
                examName.includes(query)
            );
        });
    }, [sharedPermissions, search]);

    // Reset pagination when search changes
    useMemo(() => {
        setCurrentPage(1);
        setSelectedIds([]);
    }, [search]);

    // Client-side pagination
    const totalPages = Math.max(
        1,
        Math.ceil(filteredPermissions.length / ITEMS_PER_PAGE),
    );
    const paginatedPermissions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;

        return filteredPermissions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredPermissions, currentPage]);

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const toggleAll = () => {
        const paginatedIds = paginatedPermissions.map((x) => x.id);
        const allSelected = paginatedIds.every((id) =>
            selectedIds.includes(id),
        );

        if (allSelected) {
            setSelectedIds((prev) =>
                prev.filter((id) => !paginatedIds.includes(id)),
            );
        } else {
            setSelectedIds((prev) => {
                const newSelection = [...prev];
                paginatedIds.forEach((id) => {
                    if (!newSelection.includes(id)) {
                        newSelection.push(id);
                    }
                });

                return newSelection;
            });
        }
    };

    const isAllSelectedOnPage =
        paginatedPermissions.length > 0 &&
        paginatedPermissions
            .map((x) => x.id)
            .every((id) => selectedIds.includes(id));

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex h-full flex-col overflow-hidden p-0 sm:max-w-[900px]">
                <HeadingSheet
                    title="Plantillas Compartidas"
                    description="Historial de plantillas que ha compartido con otros patólogos/usuarios y administración de sus accesos."
                />
                <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6">
                    {/* Search filter input */}
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por usuario, tipo de muestra, examen..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive dark:border-destructive/30 dark:bg-destructive/10">
                            <span className="font-medium">
                                {selectedIds.length}{' '}
                                {selectedIds.length === 1
                                    ? 'plantilla seleccionada'
                                    : 'plantillas seleccionadas'}
                            </span>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkRevoke}
                                className="cursor-pointer"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Revocar
                                Accesos
                            </Button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px] text-center">
                                        <Checkbox
                                            checked={isAllSelectedOnPage}
                                            onCheckedChange={toggleAll}
                                        />
                                    </TableHead>
                                    <TableHead>Compartido con</TableHead>
                                    <TableHead>Tipo de Muestra</TableHead>
                                    <TableHead>Examen</TableHead>
                                    <TableHead className="text-right">
                                        Acciones
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedPermissions.length > 0 ? (
                                    paginatedPermissions.map((permission) => (
                                        <TableRow key={permission.id}>
                                            <TableCell className="w-[50px] text-center">
                                                <Checkbox
                                                    checked={selectedIds.includes(
                                                        permission.id,
                                                    )}
                                                    onCheckedChange={() =>
                                                        toggleSelect(
                                                            permission.id,
                                                        )
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground">
                                                        {permission.shared_with
                                                            ?.name ||
                                                            'Desconocido'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {permission.shared_with
                                                            ?.email || ''}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {permission.specimen_type
                                                    ?.name || 'Desconocido'}
                                            </TableCell>
                                            <TableCell>
                                                {permission
                                                    .specimen_type_examination
                                                    ?.name || 'Desconocido'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="cursor-pointer text-destructive hover:bg-destructive/10"
                                                    onClick={() =>
                                                        handleRevoke(
                                                            permission.id,
                                                        )
                                                    }
                                                    title="Revocar acceso"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="h-24 text-center"
                                        >
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <FileSpreadsheet className="h-8 w-8 opacity-40" />
                                                <span>
                                                    {search
                                                        ? 'No se encontraron resultados para la búsqueda.'
                                                        : 'No ha compartido ninguna plantilla todavía.'}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination controls */}
                    {filteredPermissions.length > ITEMS_PER_PAGE && (
                        <div className="flex items-center justify-between border-t border-border/60 pt-4">
                            <span className="text-xs text-muted-foreground">
                                Mostrando{' '}
                                {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{' '}
                                {Math.min(
                                    currentPage * ITEMS_PER_PAGE,
                                    filteredPermissions.length,
                                )}{' '}
                                de {filteredPermissions.length} resultados
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                    className="h-8 cursor-pointer px-3"
                                >
                                    <ChevronLeft className="mr-1 h-4 w-4" />{' '}
                                    Anterior
                                </Button>
                                <span className="px-2 text-xs font-medium">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                    className="h-8 cursor-pointer px-3"
                                >
                                    Siguiente{' '}
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
