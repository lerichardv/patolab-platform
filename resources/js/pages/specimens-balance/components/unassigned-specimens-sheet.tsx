import { router } from '@inertiajs/react';
import {
    CalendarDays,
    Clock,
    Eye,
    Inbox,
    Pencil,
    Search,
    UserCheck,
    X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { unassignedList as unassignedListAction } from '@/actions/App/Http/Controllers/SpecimenBalanceController';
import { reschedule as rescheduleAction } from '@/actions/App/Http/Controllers/SpecimenBalanceController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import type { DetailedSheetSpecimenItem, SpecimenItem } from '../types';

interface UnassignedSpecimensSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pathologists: { id: number; name: string; email: string }[];
    canManage: boolean;
    onViewSpecimen: (specimen: SpecimenItem) => void;
    onEditSpecimen: (specimen: SpecimenItem) => void;
}

export default function UnassignedSpecimensSheet({
    open,
    onOpenChange,
    pathologists,
    canManage,
    onViewSpecimen,
    onEditSpecimen,
}: UnassignedSpecimensSheetProps) {
    const [specimens, setSpecimens] = useState<DetailedSheetSpecimenItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [assigningId, setAssigningId] = useState<number | null>(null);

    // Fetch unassigned specimens when sheet opens
    useEffect(() => {
        if (!open) {
            return;
        }

        let isMounted = true;
        const fetchUrl = unassignedListAction
            ? unassignedListAction.url()
            : '/specimens-balance/unassigned-list';

        fetch(fetchUrl, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Error al cargar muestras sin asignar');
                }

                return res.json();
            })
            .then((data) => {
                if (isMounted) {
                    setSpecimens(data.specimens || []);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    console.error('Failed to load unassigned specimens', err);
                    toast.error(
                        'No se pudieron cargar las muestras sin asignar',
                    );
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [open]);

    // Client-side search filtering
    const filteredSpecimens = useMemo(() => {
        if (!search.trim()) {
            return specimens;
        }

        const q = search.toLowerCase();

        return specimens.filter(
            (s) =>
                s.sequence_code?.toLowerCase().includes(q) ||
                s.customer_name?.toLowerCase().includes(q) ||
                s.examination_name?.toLowerCase().includes(q) ||
                s.type_name?.toLowerCase().includes(q),
        );
    }, [specimens, search]);

    // Handle direct assignment to a pathologist
    const handleAssign = async (
        specimenId: number,
        targetUserId: number,
        pathologistName: string,
    ) => {
        if (!canManage) {
            return;
        }

        setAssigningId(specimenId);

        try {
            const url = rescheduleAction
                ? rescheduleAction.url(specimenId)
                : `/specimens-balance/${specimenId}/reschedule`;
            const csrfToken =
                (
                    document.querySelector(
                        'meta[name="csrf-token"]',
                    ) as HTMLMetaElement
                )?.content || '';

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    target_user_id: targetUserId,
                }),
            });

            if (!res.ok) {
                throw new Error('Error al asignar patólogo');
            }

            toast.success(`Muestra asignada a ${pathologistName}`);

            // Remove from local list
            setSpecimens((prev) => prev.filter((s) => s.id !== specimenId));

            // Reload Inertia props to sync the board and summary cards
            router.reload({
                only: [
                    'calendarDays',
                    'unassignedRow',
                    'pathologistRows',
                    'summary',
                ],
            });
        } catch (error) {
            console.error('Error assigning specimen', error);
            toast.error('Ocurrió un error al asignar la muestra');
        } finally {
            setAssigningId(null);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex h-full w-full flex-col p-0 sm:max-w-xl md:max-w-2xl"
            >
                {/* Header */}
                <div className="border-b border-border/80 p-6 pb-4">
                    <SheetHeader>
                        <div className="flex items-center justify-between">
                            <SheetTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                                <Inbox className="h-5 w-5 text-primary" />
                                <span>Muestras Sin Asignar</span>
                            </SheetTitle>
                            <Badge
                                variant="secondary"
                                className="font-mono text-xs"
                            >
                                {specimens.length} pendientes
                            </Badge>
                        </div>
                        <SheetDescription className="text-xs text-muted-foreground">
                            Lista completa de muestras que aún no tienen
                            patólogo asignado. Puedes asignarlas directamente
                            desde aquí.
                        </SheetDescription>
                    </SheetHeader>

                    {/* Search Input */}
                    <div className="relative mt-4">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por código, paciente, estudio..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10 pr-9 pl-9 text-sm"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Body List with Shadow Loader while loading */}
                <div className="flex-1 space-y-3 overflow-y-auto p-6">
                    {loading ? (
                        /* Shadow skeleton loader */
                        [1, 2, 3, 4, 5, 6].map((idx) => (
                            <div
                                key={idx}
                                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-4 shadow-2xs"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-5 w-24 rounded-md" />
                                        <Skeleton className="h-4 w-20 rounded-md" />
                                    </div>
                                    <Skeleton className="h-5 w-14 rounded-full" />
                                </div>
                                <Skeleton className="h-4 w-3/4 rounded-md" />
                                <Skeleton className="h-3 w-1/2 rounded-md" />
                                <div className="mt-1 flex items-center justify-between border-t border-border/40 pt-2">
                                    <Skeleton className="h-3 w-28 rounded-md" />
                                    <div className="flex items-center gap-1.5">
                                        <Skeleton className="h-8 w-24 rounded-md" />
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : filteredSpecimens.length === 0 ? (
                        <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                            <Inbox className="mb-2 h-10 w-10 text-muted-foreground/40" />
                            <p className="text-sm font-medium">
                                {search
                                    ? 'No se encontraron muestras que coincidan con la búsqueda'
                                    : '¡Excelente! No hay muestras pendientes por asignar'}
                            </p>
                        </div>
                    ) : (
                        filteredSpecimens.map((item) => {
                            const isStat =
                                item.priority_name
                                    ?.toLowerCase()
                                    .includes('stat') ||
                                item.priority_name
                                    ?.toLowerCase()
                                    .includes('urgente');
                            const isHigh =
                                item.priority_name
                                    ?.toLowerCase()
                                    .includes('alta') ||
                                item.priority_name
                                    ?.toLowerCase()
                                    .includes('prioritari');

                            return (
                                <div
                                    key={item.id}
                                    className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4 shadow-2xs transition-all hover:border-border hover:shadow-xs"
                                >
                                    {/* Top Row: Code, Examination & Priority */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-sm font-bold tracking-tight text-foreground">
                                                {item.sequence_code}
                                            </span>
                                            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
                                                <span
                                                    className="h-2 w-2 shrink-0 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            item.examination_color,
                                                    }}
                                                />
                                                <span className="max-w-[180px] truncate">
                                                    {item.examination_name}
                                                </span>
                                            </div>
                                        </div>

                                        <Badge
                                            variant={
                                                isStat
                                                    ? 'destructive'
                                                    : isHigh
                                                      ? 'default'
                                                      : 'secondary'
                                            }
                                            className="shrink-0 text-[11px] font-bold uppercase"
                                        >
                                            {item.priority_name}
                                        </Badge>
                                    </div>

                                    {/* Patient & Details */}
                                    <div className="text-xs">
                                        <span className="font-semibold text-foreground">
                                            Paciente:{' '}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {item.customer_name}
                                        </span>
                                        {item.category_name && (
                                            <span className="ml-2 text-muted-foreground/80">
                                                • {item.category_name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Footer Info & Actions */}
                                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-xs">
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <span className="flex items-center gap-1 font-mono">
                                                <Clock className="h-3.5 w-3.5" />
                                                {item.duration_minutes} min (
                                                {item.points} pts)
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                Entrega: {item.internal_date}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {/* Quick Assign Dropdown */}
                                            {canManage && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={
                                                                assigningId ===
                                                                item.id
                                                            }
                                                            className="h-8 gap-1.5 border bg-card px-2.5 text-xs font-medium hover:bg-accent/50"
                                                        >
                                                            <UserCheck className="h-3.5 w-3.5 text-primary" />
                                                            <span>
                                                                {assigningId ===
                                                                item.id
                                                                    ? 'Asignando...'
                                                                    : 'Asignar a'}
                                                            </span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        className="w-56"
                                                    >
                                                        <DropdownMenuLabel className="text-xs">
                                                            Seleccionar patólogo
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {pathologists.map(
                                                            (p) => (
                                                                <DropdownMenuItem
                                                                    key={p.id}
                                                                    onClick={() =>
                                                                        handleAssign(
                                                                            item.id,
                                                                            p.id,
                                                                            p.name,
                                                                        )
                                                                    }
                                                                    className="flex cursor-pointer items-center justify-between text-xs"
                                                                >
                                                                    <span>
                                                                        {p.name}
                                                                    </span>
                                                                </DropdownMenuItem>
                                                            ),
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}

                                            {/* View Specimen */}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    onViewSpecimen(
                                                        item as unknown as SpecimenItem,
                                                    )
                                                }
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                title="Ver detalle de muestra"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>

                                            {/* Edit Specimen */}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    onEditSpecimen(
                                                        item as unknown as SpecimenItem,
                                                    )
                                                }
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                title="Editar muestra"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
