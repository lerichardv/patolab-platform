import { router, usePage } from '@inertiajs/react';
import {
    Check,
    Copy,
    Edit2,
    Loader2,
    Plus,
    Scissors,
    Search,
    Trash2,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { useState, Fragment } from 'react';
import { toast } from 'sonner';
import {
    destroy as destroyCutting,
    updateStatus as updateStatusCutting,
    bulkUpdate as bulkUpdateCutting,
    bulkDestroy as bulkDestroyCutting,
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
import { cn, getContrastColor } from '@/lib/utils';
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
    is_new_cut: boolean;
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
    canEdit?: boolean;
}
const indexToLetter = (index: number): string => {
    let letter = '';
    let idx = index;
    while (idx > 0) {
        const temp = (idx - 1) % 26;
        letter = String.fromCharCode(65 + temp) + letter;
        idx = Math.floor((idx - temp - 1) / 26);
    }
    return letter;
};

const areTwoCodesConsecutive = (code1: string, code2: string): boolean => {
    const len1 = code1.length;
    const len2 = code2.length;
    if (len1 !== len2 || len1 === 0) {
        return false;
    }
    if (len1 > 1) {
        const pref1 = code1.substring(0, len1 - 1);
        const pref2 = code2.substring(0, len2 - 1);
        if (pref1 !== pref2) {
            return false;
        }
    }
    const lastChar1 = code1.charCodeAt(len1 - 1);
    const lastChar2 = code2.charCodeAt(len2 - 1);
    return lastChar2 === lastChar1 + 1;
};

interface CuttingGroup {
    key: string;
    label: string;
    description: string;
    totalCuts: number;
    count: number;
    items: Cutting[];
    isNewCut: boolean;
}

const groupCuttings = (cuttingsList: Cutting[]): CuttingGroup[] => {
    if (cuttingsList.length === 0) {
        return [];
    }

    // Sort alphabetically (by length first, then natural comparison)
    const sorted = [...cuttingsList].sort((a: Cutting, b: Cutting) => {
        const codeA = a.code?.code || '';
        const codeB = b.code?.code || '';
        const lenA = codeA.length;
        const lenB = codeB.length;
        if (lenA !== lenB) {
            return lenA - lenB;
        }
        return codeA.localeCompare(codeB, undefined, {
            numeric: true,
            sensitivity: 'base',
        });
    });

    interface TempRun {
        description: string;
        isNewCut: boolean;
        items: Cutting[];
    }

    const tempRuns: TempRun[] = [];
    sorted.forEach((cutting) => {
        const desc = cutting.description || '';
        const isNew = !!cutting.is_new_cut;

        if (
            tempRuns.length > 0 &&
            tempRuns[tempRuns.length - 1].description === desc &&
            tempRuns[tempRuns.length - 1].isNewCut === isNew
        ) {
            tempRuns[tempRuns.length - 1].items.push(cutting);
        } else {
            tempRuns.push({
                description: desc,
                isNewCut: isNew,
                items: [cutting],
            });
        }
    });

    const groups: CuttingGroup[] = [];

    tempRuns.forEach((run) => {
        const subGroups: Cutting[][] = [];
        let currentSubGroup: Cutting[] = [];

        run.items.forEach((item) => {
            const globalIdx = sorted.indexOf(item);
            const code = item.code?.code || indexToLetter(globalIdx + 1);

            if (currentSubGroup.length === 0) {
                currentSubGroup.push(item);
            } else {
                const prevItem = currentSubGroup[currentSubGroup.length - 1];
                const prevGlobalIdx = sorted.indexOf(prevItem);
                const prevCode =
                    prevItem.code?.code || indexToLetter(prevGlobalIdx + 1);

                if (areTwoCodesConsecutive(prevCode, code)) {
                    currentSubGroup.push(item);
                } else {
                    subGroups.push(currentSubGroup);
                    currentSubGroup = [item];
                }
            }
        });

        if (currentSubGroup.length > 0) {
            subGroups.push(currentSubGroup);
        }

        subGroups.forEach((sub) => {
            const subCount = sub.length;
            let totalCuts = 0;
            sub.forEach((item) => {
                totalCuts += item.number_of_cuttings ?? 0;
            });

            const startCutting = sub[0];
            const endCutting = sub[subCount - 1];
            const startGlobalIdx = sorted.indexOf(startCutting);
            const endGlobalIdx = sorted.indexOf(endCutting);

            const startLetter =
                startCutting.code?.code || indexToLetter(startGlobalIdx + 1);
            const endLetter =
                endCutting.code?.code || indexToLetter(endGlobalIdx + 1);

            const label =
                subCount === 1 ? startLetter : `${startLetter}-${endLetter}`;
            const key = `${run.isNewCut ? 'new-' : 'reg-'}${run.description}-${startLetter}-${endLetter}`;

            groups.push({
                key,
                label,
                description: run.description,
                totalCuts,
                count: subCount,
                items: sub,
                isNewCut: run.isNewCut,
            });
        });
    });

    return groups;
};

export default function ManageCuttingsSheet({
    specimen,
    cuttingCodes,
    cuttingSlideTypes,
    users,
    open,
    onOpenChange,
    canEdit = true,
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
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

    const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
    const [prevOpen, setPrevOpen] = useState(open);

    if (searchQuery !== prevSearchQuery || open !== prevOpen) {
        setPrevSearchQuery(searchQuery);
        setPrevOpen(open);
        setSelectedIds([]);
    }

    const { props } = usePage() as any;
    const hasCuttingsPermission =
        props.auth?.user?.role?.slug === 'admin' ||
        props.auth?.permissions?.includes('cuttings.manage');

    if (!hasCuttingsPermission) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-[500px]">
                    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                            <Scissors className="h-10 w-10 animate-pulse" />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">
                            No autorizado
                        </h2>
                        <p className="max-w-xs text-sm text-muted-foreground">
                            No tiene los permisos necesarios para gestionar los
                            cortes de las muestras.
                        </p>
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    const [expandedGroups, setExpandedGroups] = useState<
        Record<string, boolean>
    >({});

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

    const groups = groupCuttings(filteredCuttings);
    const suffixMap: Record<number, string> = {};
    groups.forEach((g) => {
        const suffix = `${g.totalCuts}x${g.count}`;
        g.items.forEach((item) => {
            suffixMap[item.id] = suffix;
        });
    });

    const toggleSelect = (id: number) => {
        if (!canEdit) {
            return;
        }

        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const toggleAll = () => {
        if (!canEdit) {
            return;
        }

        const filteredIds = filteredCuttings.map((c) => c.id);
        const allSelected =
            filteredIds.length > 0 &&
            filteredIds.every((id) => selectedIds.includes(id));

        if (allSelected) {
            setSelectedIds((prev) =>
                prev.filter((id) => !filteredIds.includes(id)),
            );
        } else {
            setSelectedIds((prev) => {
                const newSelection = [...prev];
                filteredIds.forEach((id) => {
                    if (!newSelection.includes(id)) {
                        newSelection.push(id);
                    }
                });

                return newSelection;
            });
        }
    };

    const isAllSelected =
        filteredCuttings.length > 0 &&
        filteredCuttings.every((c) => selectedIds.includes(c.id));

    const handleBulkStatusChange = (
        nextStatus: 'processing' | 'macroscopy' | 'delivered',
    ) => {
        if (!canEdit) {
            return;
        }

        if (selectedIds.length === 0) {
            return;
        }

        setIsBulkUpdating(true);
        router.put(
            bulkUpdateCutting().url,
            { ids: selectedIds, status: nextStatus },
            {
                onSuccess: () => {
                    toast.success(
                        'Estado actualizado para los cortes seleccionados',
                    );
                    setSelectedIds([]);
                },
                onFinish: () => {
                    setIsBulkUpdating(false);
                },
            },
        );
    };

    const handleBulkResponsibleChange = (nextResponsibleId: string) => {
        if (!canEdit) {
            return;
        }

        if (selectedIds.length === 0) {
            return;
        }

        setIsBulkUpdating(true);
        router.put(
            bulkUpdateCutting().url,
            {
                ids: selectedIds,
                responsible_id: parseInt(nextResponsibleId, 10),
            },
            {
                onSuccess: () => {
                    toast.success(
                        'Responsable actualizado para los cortes seleccionados',
                    );
                    setSelectedIds([]);
                },
                onFinish: () => {
                    setIsBulkUpdating(false);
                },
            },
        );
    };

    const confirmBulkDelete = () => {
        if (!canEdit) {
            return;
        }

        if (selectedIds.length === 0) {
            return;
        }

        setIsBulkUpdating(true);
        router.delete(bulkDestroyCutting().url, {
            data: { ids: selectedIds },
            onSuccess: () => {
                toast.success('Cortes seleccionados eliminados correctamente');
                setSelectedIds([]);
                setIsBulkDeleteDialogOpen(false);
            },
            onFinish: () => {
                setIsBulkUpdating(false);
            },
        });
    };

    const handleCreate = () => {
        if (!canEdit) {
            return;
        }

        setSelectedCutting(null);
        setIsDuplicateMode(false);
        setIsFormOpen(true);
    };

    const handleEdit = (cutting: Cutting) => {
        if (!canEdit) {
            return;
        }

        setSelectedCutting(cutting);
        setIsDuplicateMode(false);
        setIsFormOpen(true);
    };

    const handleDuplicate = (cutting: Cutting) => {
        if (!canEdit) {
            return;
        }

        setSelectedCutting(cutting);
        setIsDuplicateMode(true);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (cutting: Cutting) => {
        if (!canEdit) {
            return;
        }

        setCuttingToDelete(cutting);
    };

    const confirmDelete = () => {
        if (!canEdit) {
            return;
        }

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
        if (!canEdit) {
            return;
        }

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
                <SheetContent className="w-full overflow-y-auto sm:max-w-[90vw]">
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
                                    disabled={!canEdit}
                                    className="h-9 gap-1.5 self-end sm:self-auto"
                                >
                                    <Plus className="h-4 w-4" /> Registrar Corte
                                </Button>
                            </div>

                            {/* Bulk Actions Bar */}
                            {selectedIds.length > 0 && (
                                <div className="mb-3 flex animate-in flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm duration-200 fade-in sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/50">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {selectedIds.length}{' '}
                                            {selectedIds.length === 1
                                                ? 'corte seleccionado'
                                                : 'cortes seleccionados'}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={isBulkUpdating}
                                            onClick={() => setSelectedIds([])}
                                            className="h-8 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            Limpiar selección
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {/* Bulk Edit Status */}
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-muted-foreground">
                                                Estado:
                                            </span>
                                            <Select
                                                disabled={isBulkUpdating}
                                                onValueChange={(val: any) =>
                                                    handleBulkStatusChange(val)
                                                }
                                                value=""
                                            >
                                                <SelectTrigger className="h-8 w-[140px] text-xs">
                                                    <SelectValue placeholder="Cambiar estado..." />
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
                                        </div>

                                        {/* Bulk Edit Responsible */}
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-muted-foreground">
                                                Responsable:
                                            </span>
                                            <Select
                                                disabled={isBulkUpdating}
                                                onValueChange={(val: any) =>
                                                    handleBulkResponsibleChange(
                                                        val,
                                                    )
                                                }
                                                value=""
                                            >
                                                <SelectTrigger className="h-8 w-[180px] text-xs">
                                                    <SelectValue placeholder="Asignar responsable..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users.map((u) => (
                                                        <SelectItem
                                                            key={u.id}
                                                            value={u.id.toString()}
                                                            className="text-xs"
                                                        >
                                                            {u.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Bulk Delete */}
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={isBulkUpdating}
                                            onClick={() =>
                                                setIsBulkDeleteDialogOpen(true)
                                            }
                                            className="h-8 cursor-pointer gap-1.5 text-xs"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Eliminar seleccionados
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Table */}
                            <div className="flex-1 overflow-x-auto rounded-md border border-slate-200 bg-card dark:border-slate-800">
                                <Table className="min-w-[1000px]">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                                            <TableHead className="w-[50px] text-center">
                                                <div
                                                    className={cn(
                                                        'mx-auto flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-all',
                                                        canEdit
                                                            ? 'cursor-pointer'
                                                            : 'pointer-events-none opacity-40',
                                                        isAllSelected
                                                            ? 'border-primary bg-primary text-primary-foreground'
                                                            : 'opacity-50 hover:opacity-80',
                                                    )}
                                                    onClick={
                                                        canEdit
                                                            ? toggleAll
                                                            : undefined
                                                    }
                                                >
                                                    <Check className="h-3 w-3 stroke-[3]" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="w-[130px] min-w-[130px] font-semibold text-slate-800 dark:text-slate-200">
                                                Casete Código
                                            </TableHead>
                                            <TableHead className="w-[120px] min-w-[120px] font-semibold text-slate-800 dark:text-slate-200">
                                                Estado
                                            </TableHead>
                                            <TableHead className="w-[120px] min-w-[120px] font-semibold text-slate-800 dark:text-slate-200">
                                                Nuevo Corte
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
                                        {groups.length > 0 ? (
                                            groups.map((group) => {
                                                const isExpanded = !!(
                                                    expandedGroups[group.key] ||
                                                    searchQuery.length > 0
                                                );
                                                const allGroupItemsSelected =
                                                    group.items.every((item) =>
                                                        selectedIds.includes(
                                                            item.id,
                                                        ),
                                                    );
                                                const someGroupItemsSelected =
                                                    group.items.some((item) =>
                                                        selectedIds.includes(
                                                            item.id,
                                                        ),
                                                    );

                                                return (
                                                    <Fragment key={group.key}>
                                                        {/* Group Header Row */}
                                                        <TableRow
                                                            className="cursor-pointer bg-slate-100/60 transition-colors hover:bg-slate-100/90 dark:bg-slate-800/40 dark:hover:bg-slate-800/60"
                                                            onClick={() => {
                                                                setExpandedGroups(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [group.key]:
                                                                            !prev[
                                                                                group
                                                                                    .key
                                                                            ],
                                                                    }),
                                                                );
                                                            }}
                                                        >
                                                            {/* Group Checkbox */}
                                                            <TableCell
                                                                className="w-[50px] text-center align-middle"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                <div
                                                                    className={cn(
                                                                        'mx-auto flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-all',
                                                                        canEdit
                                                                            ? 'cursor-pointer'
                                                                            : 'pointer-events-none opacity-40',
                                                                        allGroupItemsSelected
                                                                            ? 'border-primary bg-primary text-primary-foreground'
                                                                            : someGroupItemsSelected
                                                                              ? 'border-primary bg-primary/30 text-primary-foreground'
                                                                              : 'opacity-50 hover:opacity-80',
                                                                    )}
                                                                    onClick={() => {
                                                                        if (
                                                                            !canEdit
                                                                        )
                                                                            return;
                                                                        const groupItemIds =
                                                                            group.items.map(
                                                                                (
                                                                                    item,
                                                                                ) =>
                                                                                    item.id,
                                                                            );
                                                                        if (
                                                                            allGroupItemsSelected
                                                                        ) {
                                                                            setSelectedIds(
                                                                                (
                                                                                    prev,
                                                                                ) =>
                                                                                    prev.filter(
                                                                                        (
                                                                                            id,
                                                                                        ) =>
                                                                                            !groupItemIds.includes(
                                                                                                id,
                                                                                            ),
                                                                                    ),
                                                                            );
                                                                        } else {
                                                                            setSelectedIds(
                                                                                (
                                                                                    prev,
                                                                                ) => {
                                                                                    const next =
                                                                                        [
                                                                                            ...prev,
                                                                                        ];
                                                                                    groupItemIds.forEach(
                                                                                        (
                                                                                            id,
                                                                                        ) => {
                                                                                            if (
                                                                                                !next.includes(
                                                                                                    id,
                                                                                                )
                                                                                            )
                                                                                                next.push(
                                                                                                    id,
                                                                                                );
                                                                                        },
                                                                                    );
                                                                                    return next;
                                                                                },
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    <Check className="h-3 w-3 stroke-[3]" />
                                                                </div>
                                                            </TableCell>

                                                            {/* Cassette Code Range */}
                                                            <TableCell className="w-[130px] min-w-[130px] align-middle font-bold text-slate-900 dark:text-slate-100">
                                                                <div className="flex items-center gap-1 text-xs">
                                                                    {isExpanded ? (
                                                                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                                                    ) : (
                                                                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                                    )}
                                                                    <span>
                                                                        {
                                                                            group.label
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </TableCell>

                                                            {/* Status (Group Status Summary) */}
                                                            <TableCell className="w-[120px] min-w-[120px] align-middle">
                                                                <div className="flex flex-col gap-1">
                                                                    {(() => {
                                                                        const counts =
                                                                            group.items.reduce(
                                                                                (
                                                                                    acc,
                                                                                    item,
                                                                                ) => {
                                                                                    acc[
                                                                                        item.status
                                                                                    ] =
                                                                                        (acc[
                                                                                            item
                                                                                                .status
                                                                                        ] ||
                                                                                            0) +
                                                                                        1;
                                                                                    return acc;
                                                                                },
                                                                                {} as Record<
                                                                                    string,
                                                                                    number
                                                                                >,
                                                                            );

                                                                        return (
                                                                            Object.keys(
                                                                                counts,
                                                                            ) as Array<
                                                                                | 'processing'
                                                                                | 'macroscopy'
                                                                                | 'delivered'
                                                                            >
                                                                        ).map(
                                                                            (
                                                                                status,
                                                                            ) => {
                                                                                const count =
                                                                                    counts[
                                                                                        status
                                                                                    ];
                                                                                const suffix =
                                                                                    count >
                                                                                    1
                                                                                        ? ` x${count}`
                                                                                        : '';
                                                                                if (
                                                                                    status ===
                                                                                    'processing'
                                                                                ) {
                                                                                    return (
                                                                                        <Badge
                                                                                            key={
                                                                                                status
                                                                                            }
                                                                                            className="border-emerald-200/40 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                                                        >
                                                                                            Procesamiento
                                                                                            {
                                                                                                suffix
                                                                                            }
                                                                                        </Badge>
                                                                                    );
                                                                                }
                                                                                if (
                                                                                    status ===
                                                                                    'macroscopy'
                                                                                ) {
                                                                                    return (
                                                                                        <Badge
                                                                                            key={
                                                                                                status
                                                                                            }
                                                                                            className="border-orange-200/40 bg-orange-50 px-2 py-0.5 font-semibold text-orange-700 hover:bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-400"
                                                                                        >
                                                                                            Macroscopía
                                                                                            {
                                                                                                suffix
                                                                                            }
                                                                                        </Badge>
                                                                                    );
                                                                                }
                                                                                if (
                                                                                    status ===
                                                                                    'delivered'
                                                                                ) {
                                                                                    return (
                                                                                        <Badge
                                                                                            key={
                                                                                                status
                                                                                            }
                                                                                            className="border-yellow-200/40 bg-yellow-50 px-2 py-0.5 font-semibold text-yellow-700 hover:bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-400"
                                                                                        >
                                                                                            Entregado
                                                                                            {
                                                                                                suffix
                                                                                            }
                                                                                        </Badge>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            },
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </TableCell>

                                                            {/* Is New Cut */}
                                                            <TableCell className="w-[120px] min-w-[120px] align-middle">
                                                                {group.isNewCut ? (
                                                                    <Badge className="border-emerald-200/40 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                                                                        Sí
                                                                        (Nuevo)
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge className="border-red-200/40 bg-red-50 px-2 py-0.5 font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                                                                        No
                                                                    </Badge>
                                                                )}
                                                            </TableCell>

                                                            {/* Description */}
                                                            <TableCell className="min-w-[180px] align-middle font-semibold text-slate-800 dark:text-slate-200">
                                                                <div className="flex items-center gap-2">
                                                                    <span>
                                                                        {
                                                                            group.description
                                                                        }
                                                                    </span>
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="px-1.5 py-0 font-mono text-[10px] font-semibold text-primary"
                                                                    >
                                                                        {
                                                                            group.totalCuts
                                                                        }
                                                                        x
                                                                        {
                                                                            group.count
                                                                        }
                                                                    </Badge>
                                                                </div>
                                                            </TableCell>

                                                            {/* Total number of cuts */}
                                                            <TableCell className="w-[100px] min-w-[100px] text-center align-middle font-bold text-slate-700 dark:text-slate-300">
                                                                {
                                                                    group.totalCuts
                                                                }
                                                            </TableCell>

                                                            {/* Cuts Description (unique combination) */}
                                                            <TableCell className="min-w-[150px] align-middle text-xs text-muted-foreground">
                                                                {Array.from(
                                                                    new Set(
                                                                        group.items
                                                                            .map(
                                                                                (
                                                                                    item,
                                                                                ) =>
                                                                                    item.cuttings_description,
                                                                            )
                                                                            .filter(
                                                                                Boolean,
                                                                            ),
                                                                    ),
                                                                ).join(', ') ||
                                                                    '-'}
                                                            </TableCell>

                                                            {/* Number of slides (Routine) */}
                                                            <TableCell className="w-[150px] min-w-[150px] text-center align-middle font-bold text-slate-700 dark:text-slate-300">
                                                                {group.items.reduce(
                                                                    (
                                                                        sum,
                                                                        item,
                                                                    ) =>
                                                                        sum +
                                                                        (item.number_of_slides ??
                                                                            0),
                                                                    0,
                                                                )}
                                                            </TableCell>

                                                            {/* Special stain slide types */}
                                                            <TableCell className="min-w-[160px] align-middle">
                                                                {(() => {
                                                                    const allTypes =
                                                                        Array.from(
                                                                            new Set(
                                                                                group.items.flatMap(
                                                                                    (
                                                                                        item,
                                                                                    ) =>
                                                                                        item.cutting_slide_types ||
                                                                                        [],
                                                                                ),
                                                                            ),
                                                                        );
                                                                    if (
                                                                        allTypes.length >
                                                                        0
                                                                    ) {
                                                                        return (
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {allTypes
                                                                                    .slice(
                                                                                        0,
                                                                                        3,
                                                                                    )
                                                                                    .map(
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
                                                                                {allTypes.length >
                                                                                    3 && (
                                                                                    <span className="text-[10px] text-muted-foreground">
                                                                                        +
                                                                                        {allTypes.length -
                                                                                            3}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return '-';
                                                                })()}
                                                            </TableCell>

                                                            {/* Comments */}
                                                            <TableCell
                                                                className="max-w-[200px] min-w-[200px] truncate align-middle text-xs text-muted-foreground"
                                                                title={group.items
                                                                    .map(
                                                                        (
                                                                            item,
                                                                        ) =>
                                                                            item.comments,
                                                                    )
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        ' | ',
                                                                    )}
                                                            >
                                                                {Array.from(
                                                                    new Set(
                                                                        group.items
                                                                            .map(
                                                                                (
                                                                                    item,
                                                                                ) =>
                                                                                    item.comments,
                                                                            )
                                                                            .filter(
                                                                                Boolean,
                                                                            ),
                                                                    ),
                                                                ).join(' | ') ||
                                                                    '-'}
                                                            </TableCell>

                                                            {/* Responsible */}
                                                            <TableCell className="min-w-[150px] align-middle text-xs text-slate-700 dark:text-slate-300">
                                                                {(() => {
                                                                    const responsibles =
                                                                        Array.from(
                                                                            new Set(
                                                                                group.items
                                                                                    .map(
                                                                                        (
                                                                                            item,
                                                                                        ) =>
                                                                                            item
                                                                                                .responsible
                                                                                                ?.name,
                                                                                    )
                                                                                    .filter(
                                                                                        Boolean,
                                                                                    ),
                                                                            ),
                                                                        );
                                                                    if (
                                                                        responsibles.length ===
                                                                        1
                                                                    )
                                                                        return responsibles[0];
                                                                    if (
                                                                        responsibles.length >
                                                                        1
                                                                    )
                                                                        return 'Varios';
                                                                    return 'No asignado';
                                                                })()}
                                                            </TableCell>

                                                            {/* Toggle collapse action */}
                                                            <TableCell className="z-10 w-[220px] min-w-[220px] text-right align-middle">
                                                                <Button
                                                                    variant="link"
                                                                    size="sm"
                                                                    className="h-7 text-xs font-semibold text-primary"
                                                                >
                                                                    {isExpanded
                                                                        ? 'Colapsar ▲'
                                                                        : 'Expandir ▼'}
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>

                                                        {/* Individual Items Under Group (When Expanded) */}
                                                        {isExpanded &&
                                                            group.items.map(
                                                                (c) => (
                                                                    <TableRow
                                                                        key={
                                                                            c.id
                                                                        }
                                                                        className="group border-l-4 border-l-primary/30 bg-slate-50/30 transition-colors hover:bg-slate-50/70 dark:bg-slate-900/10 dark:hover:bg-slate-900/20"
                                                                    >
                                                                        {/* Selection Checkbox */}
                                                                        <TableCell className="w-[50px] text-center align-middle">
                                                                            <div
                                                                                className={cn(
                                                                                    'mx-auto flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-all',
                                                                                    canEdit
                                                                                        ? 'cursor-pointer'
                                                                                        : 'pointer-events-none opacity-40',
                                                                                    selectedIds.includes(
                                                                                        c.id,
                                                                                    )
                                                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                                                        : 'opacity-50 hover:opacity-80',
                                                                                )}
                                                                                onClick={
                                                                                    canEdit
                                                                                        ? () =>
                                                                                              toggleSelect(
                                                                                                  c.id,
                                                                                              )
                                                                                        : undefined
                                                                                }
                                                                            >
                                                                                <Check className="h-3 w-3 stroke-[3]" />
                                                                            </div>
                                                                        </TableCell>

                                                                        {/* Cassette Code */}
                                                                        <TableCell className="w-[130px] min-w-[130px] pl-6 align-middle">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-xs text-muted-foreground/60">
                                                                                    ↳
                                                                                </span>
                                                                                <span
                                                                                    className="inline-flex items-center justify-center rounded border border-slate-300/30 px-2.5 py-1 text-xs font-bold shadow-sm"
                                                                                    style={{
                                                                                        backgroundColor:
                                                                                            c
                                                                                                .code
                                                                                                ?.color ||
                                                                                            '#e2e8f0',
                                                                                        color: getContrastColor(
                                                                                            c
                                                                                                .code
                                                                                                ?.color ||
                                                                                                '#e2e8f0',
                                                                                        ),
                                                                                    }}
                                                                                >
                                                                                    {c
                                                                                        .code
                                                                                        ?.code ||
                                                                                        '-'}
                                                                                </span>
                                                                            </div>
                                                                        </TableCell>

                                                                        {/* Status */}
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

                                                                        {/* New Cut */}
                                                                        <TableCell className="w-[120px] min-w-[120px] align-middle">
                                                                            {c.is_new_cut ? (
                                                                                <Badge className="border-emerald-200/40 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                                                                                    Sí
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge className="border-red-200/40 bg-red-50 px-2 py-0.5 font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                                                                                    No
                                                                                </Badge>
                                                                            )}
                                                                        </TableCell>

                                                                        {/* Description */}
                                                                        <TableCell className="min-w-[180px] align-middle font-medium text-slate-700 dark:text-slate-300">
                                                                            <div className="flex items-center gap-2">
                                                                                <span>
                                                                                    {
                                                                                        c.description
                                                                                    }
                                                                                </span>
                                                                                {suffixMap[
                                                                                    c
                                                                                        .id
                                                                                ] && (
                                                                                    <Badge
                                                                                        variant="secondary"
                                                                                        className="px-1.5 py-0 font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-400"
                                                                                    >
                                                                                        {
                                                                                            suffixMap[
                                                                                                c
                                                                                                    .id
                                                                                            ]
                                                                                        }
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                        </TableCell>

                                                                        {/* Number of Cuttings */}
                                                                        <TableCell className="w-[100px] min-w-[100px] text-center align-middle font-bold text-slate-600 dark:text-slate-400">
                                                                            {
                                                                                c.number_of_cuttings
                                                                            }
                                                                        </TableCell>

                                                                        {/* Cuttings Description */}
                                                                        <TableCell className="min-w-[150px] align-middle text-slate-600 dark:text-slate-400">
                                                                            {c.cuttings_description || (
                                                                                <span className="text-muted-foreground/45">
                                                                                    -
                                                                                </span>
                                                                            )}
                                                                        </TableCell>

                                                                        {/* Number of Slides */}
                                                                        <TableCell className="w-[150px] min-w-[150px] text-center align-middle font-bold text-slate-600 dark:text-slate-400">
                                                                            {c.number_of_slides ??
                                                                                0}
                                                                        </TableCell>

                                                                        {/* Special slide types */}
                                                                        <TableCell className="min-w-[160px] align-middle">
                                                                            {c.cutting_slide_types &&
                                                                            c
                                                                                .cutting_slide_types
                                                                                .length >
                                                                                0 ? (
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
                                                                            title={
                                                                                c.comments ||
                                                                                ''
                                                                            }
                                                                        >
                                                                            {c.comments || (
                                                                                <span className="text-muted-foreground/45">
                                                                                    -
                                                                                </span>
                                                                            )}
                                                                        </TableCell>

                                                                        {/* Responsible */}
                                                                        <TableCell className="min-w-[150px] align-middle text-slate-700 dark:text-slate-300">
                                                                            {c
                                                                                .responsible
                                                                                ?.name ||
                                                                                'No asignado'}
                                                                        </TableCell>

                                                                        {/* Actions */}
                                                                        <TableCell className="z-10 w-[220px] min-w-[220px] bg-card text-right align-middle transition-colors group-hover:bg-muted md:sticky md:right-0">
                                                                            <div className="flex items-center justify-end gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
                                                                                {loadingCuttingId ===
                                                                                c.id ? (
                                                                                    <Loader2 className="mr-1 h-4 w-4 animate-spin text-slate-500" />
                                                                                ) : (
                                                                                    <Select
                                                                                        disabled={
                                                                                            !canEdit
                                                                                        }
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
                                                                                    disabled={
                                                                                        !canEdit
                                                                                    }
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
                                                                                    disabled={
                                                                                        !canEdit
                                                                                    }
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
                                                                                    disabled={
                                                                                        !canEdit
                                                                                    }
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
                                                                ),
                                                            )}
                                                    </Fragment>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={12}
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

            {/* Bulk Deletion Dialog */}
            <AlertDialog
                open={isBulkDeleteDialogOpen}
                onOpenChange={setIsBulkDeleteDialogOpen}
            >
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Eliminar cortes seleccionados?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>
                                Esta acción es permanente y eliminará los{' '}
                                <strong>{selectedIds.length}</strong> cortes
                                seleccionados y todas sus láminas asociadas en
                                el sistema.
                            </p>
                            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                                <p className="mb-1 text-xs font-semibold text-slate-500">
                                    Cortes afectados:
                                </p>
                                <ul className="max-h-36 space-y-1 overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
                                    {cuttings
                                        .filter((c) =>
                                            selectedIds.includes(c.id),
                                        )
                                        .map((c) => (
                                            <li
                                                key={c.id}
                                                className="flex items-center gap-2"
                                            >
                                                <span
                                                    className="inline-flex h-4 items-center justify-center rounded px-1.5 text-[10px] font-bold"
                                                    style={{
                                                        backgroundColor:
                                                            c.code?.color ||
                                                            '#e2e8f0',
                                                        color: getContrastColor(
                                                            c.code?.color ||
                                                                '#e2e8f0',
                                                        ),
                                                    }}
                                                >
                                                    {c.code?.code || '-'}
                                                </span>
                                                <span className="truncate">
                                                    {c.description} (
                                                    {c.number_of_cuttings}{' '}
                                                    {c.number_of_cuttings === 1
                                                        ? 'corte'
                                                        : 'cortes'}
                                                    )
                                                </span>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmBulkDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Eliminar todos
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
