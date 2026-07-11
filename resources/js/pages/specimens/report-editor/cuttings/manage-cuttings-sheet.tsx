import { router } from '@inertiajs/react';
import {
    Copy,
    Edit2,
    Loader2,
    Plus,
    Scissors,
    Search,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    destroy as destroyCutting,
    updateStatus as updateStatusCutting,
} from '@/actions/App/Http/Controllers/Editor/CuttingController';
import HeadingSheet from '@/components/heading-sheet';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import CuttingSheet from './cutting-sheet';

interface Cutting {
    id: number;
    code_id: number;
    specimen_id: number;
    description: string;
    number_of_cuttings: number;
    cuttings_description: string;
    number_of_slides: number | null;
    cutting_slide_types: number[] | null;
    status: 'processing' | 'macroscopy' | 'delivered';
    comments: string | null;
    responsible_id: number;
    code?: {
        id: number;
        code: string;
        color: string;
    };
    responsible?: {
        id: number;
        name: string;
    };
}

interface CuttingCode {
    id: number;
    code: string;
    color: string;
}

interface CuttingSlideType {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
}

interface Props {
    specimen: {
        id: number;
        sequence_code: string;
        cuttings?: Cutting[];
    };
    cuttingCodes: CuttingCode[];
    cuttingSlideTypes: CuttingSlideType[];
    users: User[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ManageCuttingsSheet({
    specimen,
    cuttingCodes,
    cuttingSlideTypes,
    users,
    open,
    onOpenChange,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCutting, setSelectedCutting] = useState<Cutting | null>(
        null,
    );
    const [isDuplicateMode, setIsDuplicateMode] = useState(false);
    const [cuttingToDelete, setCuttingToDelete] = useState<Cutting | null>(
        null,
    );
    const [loadingCuttingId, setLoadingCuttingId] = useState<number | null>(
        null,
    );

    const cuttings = specimen.cuttings || [];

    // Filter cuttings locally
    const filteredCuttings = cuttings.filter((c) => {
        const query = searchQuery.toLowerCase();

        return (
            c.description.toLowerCase().includes(query) ||
            (c.comments && c.comments.toLowerCase().includes(query)) ||
            (c.responsible?.name &&
                c.responsible.name.toLowerCase().includes(query)) ||
            (c.code?.code && c.code.code.toLowerCase().includes(query))
        );
    });

    const handleCreate = () => {
        setSelectedCutting(null);
        setIsDuplicateMode(false);
        setIsFormOpen(true);
    };

    const handleEdit = (cutting: Cutting) => {
        setSelectedCutting(cutting);
        setIsDuplicateMode(false);
        setIsFormOpen(true);
    };

    const handleDuplicate = (cutting: Cutting) => {
        setSelectedCutting(cutting);
        setIsDuplicateMode(true);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (cutting: Cutting) => {
        setCuttingToDelete(cutting);
    };

    const confirmDelete = () => {
        if (cuttingToDelete) {
            router.delete(destroyCutting(cuttingToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Corte eliminado correctamente');
                    setCuttingToDelete(null);
                },
            });
        }
    };

    const handleStatusChange = (
        cutting: Cutting,
        nextStatus: 'processing' | 'macroscopy' | 'delivered',
    ) => {
        setLoadingCuttingId(cutting.id);
        router.put(
            updateStatusCutting(cutting.id).url,
            { status: nextStatus },
            {
                onSuccess: () => {
                    toast.success(
                        `Estado del corte "${cutting.description}" cambiado a ${
                            nextStatus === 'processing'
                                ? 'Procesamiento'
                                : nextStatus === 'macroscopy'
                                  ? 'Macroscopía'
                                  : 'Entregado'
                        }`,
                    );
                },
                onFinish: () => {
                    setLoadingCuttingId(null);
                },
            },
        );
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-[1150px]">
                    <div className="flex h-full flex-col gap-5">
                        <div className="flex flex-col gap-1">
                            <HeadingSheet
                                title={`Gestionar Cortes — Muestra ${specimen.sequence_code}`}
                                description="Administre los bloques de casetes, cortes generados, láminas y sus respectivos estados de procesamiento."
                            />
                        </div>

                        <div className="px-5">
                            {/* Actions Row */}
                            <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative max-w-sm flex-1">
                                    <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar cortes por descripción, código o responsable..."
                                        className="h-9 pl-9"
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                    />
                                </div>
                                <Button
                                    onClick={handleCreate}
                                    className="h-9 gap-1.5 self-end sm:self-auto"
                                >
                                    <Plus className="h-4 w-4" /> Registrar Corte
                                </Button>
                            </div>

                            {/* Table */}
                            <div className="flex-1 overflow-x-auto rounded-md border border-slate-200 bg-card dark:border-slate-800">
                                <Table className="min-w-[1000px]">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                                            <TableHead className="w-[130px] min-w-[130px] font-semibold text-slate-800 dark:text-slate-200">
                                                Casete Código
                                            </TableHead>
                                            <TableHead className="w-[120px] min-w-[120px] font-semibold text-slate-800 dark:text-slate-200">
                                                Estado
                                            </TableHead>
                                            <TableHead className="min-w-[180px] font-semibold text-slate-800 dark:text-slate-200">
                                                Descripción
                                            </TableHead>
                                            <TableHead className="w-[100px] min-w-[100px] text-center font-semibold text-slate-800 dark:text-slate-200">
                                                # Cortes
                                            </TableHead>
                                            <TableHead className="min-w-[150px] font-semibold text-slate-800 dark:text-slate-200">
                                                Desc. Cortes
                                            </TableHead>
                                            <TableHead className="w-[150px] min-w-[150px] text-center font-semibold text-slate-800 dark:text-slate-200">
                                                # Láminas Rutina
                                            </TableHead>
                                            <TableHead className="min-w-[160px] font-semibold text-slate-800 dark:text-slate-200">
                                                T. Especiales
                                            </TableHead>
                                            <TableHead className="min-w-[200px] font-semibold text-slate-800 dark:text-slate-200">
                                                Comentarios
                                            </TableHead>
                                            <TableHead className="min-w-[150px] font-semibold text-slate-800 dark:text-slate-200">
                                                Responsable
                                            </TableHead>
                                            <TableHead className="z-10 w-[220px] min-w-[220px] bg-card text-right font-semibold text-slate-800 md:sticky md:right-0 dark:text-slate-200">
                                                Acciones
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCuttings.length > 0 ? (
                                            filteredCuttings.map((c) => (
                                                <TableRow
                                                    key={c.id}
                                                    className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                                                >
                                                    {/* Cassette Code with Custom Color Badge */}
                                                    <TableCell className="w-[130px] min-w-[130px] align-middle">
                                                        <span
                                                            className="inline-flex items-center justify-center rounded border border-slate-300/30 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm"
                                                            style={{
                                                                backgroundColor:
                                                                    c.code
                                                                        ?.color ||
                                                                    '#e2e8f0',
                                                            }}
                                                        >
                                                            {c.code?.code ||
                                                                '-'}
                                                        </span>
                                                    </TableCell>

                                                    {/* Status (Badge only) */}
                                                    <TableCell className="w-[120px] min-w-[120px] align-middle">
                                                        <div>
                                                            {c.status ===
                                                                'processing' && (
                                                                <Badge className="border-emerald-200/40 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                                                                    Procesamiento
                                                                </Badge>
                                                            )}
                                                            {c.status ===
                                                                'macroscopy' && (
                                                                <Badge className="border-orange-200/40 bg-orange-50 px-2 py-0.5 font-semibold text-orange-700 hover:bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-400">
                                                                    Macroscopía
                                                                </Badge>
                                                            )}
                                                            {c.status ===
                                                                'delivered' && (
                                                                <Badge className="border-yellow-200/40 bg-yellow-50 px-2 py-0.5 font-semibold text-yellow-700 hover:bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-400">
                                                                    Entregado
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    {/* Description */}
                                                    <TableCell className="min-w-[180px] align-middle font-medium text-slate-700 dark:text-slate-300">
                                                        {c.description}
                                                    </TableCell>

                                                    {/* Number of Cuttings */}
                                                    <TableCell className="w-[100px] min-w-[100px] text-center align-middle font-bold text-slate-600 dark:text-slate-400">
                                                        {c.number_of_cuttings}
                                                    </TableCell>

                                                    {/* Cuttings Description */}
                                                    <TableCell className="min-w-[150px] align-middle text-slate-600 dark:text-slate-400">
                                                        {c.cuttings_description || (
                                                            <span className="text-muted-foreground/45">
                                                                -
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    {/* Number of Slides (Routine) */}
                                                    <TableCell className="w-[150px] min-w-[150px] text-center align-middle font-bold text-slate-600 dark:text-slate-400">
                                                        {c.number_of_slides ??
                                                            0}
                                                    </TableCell>

                                                    {/* Special stain slide types */}
                                                    <TableCell className="min-w-[160px] align-middle">
                                                        {c.cutting_slide_types &&
                                                        c.cutting_slide_types
                                                            .length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {c.cutting_slide_types.map(
                                                                    (
                                                                        stId,
                                                                        i,
                                                                    ) => {
                                                                        const typeName =
                                                                            cuttingSlideTypes.find(
                                                                                (
                                                                                    t,
                                                                                ) =>
                                                                                    String(
                                                                                        t.id,
                                                                                    ) ===
                                                                                    String(
                                                                                        stId,
                                                                                    ),
                                                                            )
                                                                                ?.name ||
                                                                            `ID: ${stId}`;

                                                                        return (
                                                                            <Badge
                                                                                key={
                                                                                    i
                                                                                }
                                                                                variant="outline"
                                                                                className="border-violet-200/50 bg-violet-50/50 px-1.5 py-0 text-[10px] font-normal text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-400"
                                                                            >
                                                                                {
                                                                                    typeName
                                                                                }
                                                                            </Badge>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground/45">
                                                                -
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    {/* Comments */}
                                                    <TableCell
                                                        className="max-w-[200px] min-w-[200px] truncate align-middle text-slate-600 dark:text-slate-400"
                                                        title={c.comments || ''}
                                                    >
                                                        {c.comments || (
                                                            <span className="text-muted-foreground/45">
                                                                -
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    {/* Responsible */}
                                                    <TableCell className="min-w-[150px] align-middle text-slate-700 dark:text-slate-300">
                                                        {c.responsible?.name ||
                                                            'No asignado'}
                                                    </TableCell>

                                                    {/* Actions (Transition / Edit / Delete) */}
                                                    <TableCell className="z-10 w-[220px] min-w-[220px] bg-card text-right align-middle transition-colors group-hover:bg-muted md:sticky md:right-0">
                                                        <div className="flex items-center justify-end gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
                                                            {loadingCuttingId ===
                                                            c.id ? (
                                                                <Loader2 className="mr-1 h-4 w-4 animate-spin text-slate-500" />
                                                            ) : (
                                                                <Select
                                                                    value={
                                                                        c.status
                                                                    }
                                                                    onValueChange={(
                                                                        val: any,
                                                                    ) =>
                                                                        handleStatusChange(
                                                                            c,
                                                                            val,
                                                                        )
                                                                    }
                                                                >
                                                                    <SelectTrigger className="h-7 w-[125px] text-xs">
                                                                        <SelectValue placeholder="Estado" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem
                                                                            value="macroscopy"
                                                                            className="text-xs"
                                                                        >
                                                                            Macroscopía
                                                                        </SelectItem>
                                                                        <SelectItem
                                                                            value="processing"
                                                                            className="text-xs"
                                                                        >
                                                                            Procesamiento
                                                                        </SelectItem>
                                                                        <SelectItem
                                                                            value="delivered"
                                                                            className="text-xs"
                                                                        >
                                                                            Entregado
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                                                onClick={() =>
                                                                    handleDuplicate(
                                                                        c,
                                                                    )
                                                                }
                                                                title="Duplicar corte"
                                                            >
                                                                <Copy className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                                                onClick={() =>
                                                                    handleEdit(
                                                                        c,
                                                                    )
                                                                }
                                                                title="Editar corte"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                onClick={() =>
                                                                    handleDeleteClick(
                                                                        c,
                                                                    )
                                                                }
                                                                title="Eliminar corte"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={10}
                                                    className="h-32 text-center text-slate-400 dark:text-slate-500"
                                                >
                                                    <Scissors className="mx-auto mb-2 h-8 w-8 stroke-1 text-slate-300 dark:text-slate-700" />
                                                    No se han registrado cortes
                                                    para esta muestra.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Inner Creation / Editing Sheet */}
            <CuttingSheet
                cutting={selectedCutting}
                specimen={specimen}
                cuttingCodes={cuttingCodes}
                cuttingSlideTypes={cuttingSlideTypes}
                users={users}
                isDuplicate={isDuplicateMode}
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
            />

            {/* Deletion Dialog */}
            <AlertDialog
                open={cuttingToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setCuttingToDelete(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Corte?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción es permanente y eliminará el corte{' '}
                            <strong>{cuttingToDelete?.description}</strong> y
                            todas las láminas asociadas en el sistema.
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
