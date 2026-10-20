import {
    AlertTriangle,
    CalendarDays,
    Clock,
    Eye,
    Pencil,
    Search,
    User,
    X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { expiredList as expiredListAction } from '@/actions/App/Http/Controllers/SpecimenBalanceController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface ExpiredSpecimensSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onViewSpecimen: (specimen: SpecimenItem) => void;
    onEditSpecimen: (specimen: SpecimenItem) => void;
}

export default function ExpiredSpecimensSheet({
    open,
    onOpenChange,
    onViewSpecimen,
    onEditSpecimen,
}: ExpiredSpecimensSheetProps) {
    const [specimens, setSpecimens] = useState<DetailedSheetSpecimenItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Fetch expired specimens when sheet opens
    useEffect(() => {
        if (!open) {
            return;
        }

        let isMounted = true;
        const fetchUrl = expiredListAction
            ? expiredListAction.url()
            : '/specimens-balance/expired-list';

        fetch(fetchUrl, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Error al cargar muestras vencidas');
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
                    console.error('Failed to load expired specimens', err);
                    toast.error('No se pudieron cargar las muestras vencidas');
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
                            <SheetTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-destructive">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                <span>Muestras Vencidas / Retrasadas</span>
                            </SheetTitle>
                            <Badge
                                variant="destructive"
                                className="font-mono text-xs"
                            >
                                {specimens.length} vencidas
                            </Badge>
                        </div>
                        <SheetDescription className="text-xs text-muted-foreground">
                            Muestras cuya fecha esperada de entrega interna o
                            cliente ya ha transcurrido. Requieren atención
                            inmediata.
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
                                className="flex flex-col gap-2 rounded-xl border border-destructive/20 bg-card p-4 shadow-2xs"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-5 w-24 rounded-md" />
                                        <Skeleton className="h-4 w-20 rounded-md" />
                                    </div>
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                </div>
                                <Skeleton className="h-4 w-3/4 rounded-md" />
                                <Skeleton className="h-3 w-1/2 rounded-md" />
                                <div className="mt-1 flex items-center justify-between border-t border-border/40 pt-2">
                                    <Skeleton className="h-3 w-28 rounded-md" />
                                    <div className="flex items-center gap-1.5">
                                        <Skeleton className="h-8 w-16 rounded-md" />
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : filteredSpecimens.length === 0 ? (
                        <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                            <Clock className="mb-2 h-10 w-10 text-emerald-500/40" />
                            <p className="text-sm font-medium">
                                {search
                                    ? 'No se encontraron muestras que coincidan con la búsqueda'
                                    : '¡Excelente! No hay muestras vencidas en este momento'}
                            </p>
                        </div>
                    ) : (
                        filteredSpecimens.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 shadow-2xs transition-all hover:border-destructive/60 hover:shadow-xs"
                            >
                                {/* Top Row: Code, Overdue Badge & Priority */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-sm font-bold tracking-tight text-destructive">
                                            {item.sequence_code}
                                        </span>
                                        <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2 py-0.5 text-xs text-muted-foreground">
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
                                        variant="destructive"
                                        className="shrink-0 text-[11px] font-bold uppercase"
                                    >
                                        {item.overdue_label}
                                    </Badge>
                                </div>

                                {/* Patient & Assigned Pathologist */}
                                <div className="text-xs">
                                    <span className="font-semibold text-foreground">
                                        Paciente:{' '}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {item.customer_name}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                    <span>Asignado a: </span>
                                    <span className="font-medium text-foreground">
                                        {item.assigned_users &&
                                        item.assigned_users.length > 0
                                            ? item.assigned_users
                                                  .map((u) => u.name)
                                                  .join(', ')
                                            : 'Sin asignar'}
                                    </span>
                                </div>

                                {/* Footer Info & Actions */}
                                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-destructive/20 pt-2 text-xs">
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <span className="flex items-center gap-1 font-mono text-destructive">
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            Vencimiento: {item.internal_date}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        {/* View Specimen */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                onViewSpecimen(
                                                    item as unknown as SpecimenItem,
                                                )
                                            }
                                            className="h-8 gap-1.5 border bg-card px-2.5 text-xs font-medium hover:bg-accent/50"
                                            title="Ver detalle de muestra"
                                        >
                                            <Eye className="h-3.5 w-3.5 text-primary" />
                                            <span>Ver detalle</span>
                                        </Button>

                                        {/* Edit Specimen */}
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() =>
                                                onEditSpecimen(
                                                    item as unknown as SpecimenItem,
                                                )
                                            }
                                            className="h-8 gap-1.5 px-2.5 text-xs font-medium"
                                            title="Reprogramar o editar fecha"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            <span>Reprogramar</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
