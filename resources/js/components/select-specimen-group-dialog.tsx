import axios from 'axios';
import debounce from 'lodash/debounce';
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
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

interface SpecimenGroupListItem {
    id: number;
    name: string;
    full_invoice_number: string;
    customer_name: string;
    specimen_codes?: string[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (groupDetails: any) => void;
}

export default function SelectSpecimenGroupDialog({
    open,
    onOpenChange,
    onConfirm,
}: Props) {
    const [search, setSearch] = useState('');
    const [groups, setGroups] = useState<SpecimenGroupListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [confirming, setConfirming] = useState(false);

    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchGroups = async (query: string, pageNum: number = 1) => {
        setLoading(true);

        try {
            const response = await axios.get('/specimen-groups/search', {
                params: { q: query, page: pageNum },
            });

            setGroups(response.data.data);
            setPage(response.data.current_page);
            setLastPage(response.data.last_page);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Error fetching specimen groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const debouncedFetch = useMemo(
        () =>
            debounce((query: string) => {
                fetchGroups(query, 1);
            }, 300),
        [],
    );

    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                setSearch('');
                setSelectedGroupId(null);
                setGroups([]);
                setPage(1);
                setLastPage(1);
                setTotal(0);
                fetchGroups('', 1);
            }, 0);

            return () => clearTimeout(timer);
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            debouncedFetch(search);
        }
    }, [search, open, debouncedFetch]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= lastPage) {
            fetchGroups(search, newPage);
        }
    };

    const handleConfirm = async () => {
        if (!selectedGroupId) {
            return;
        }

        setConfirming(true);

        try {
            const response = await axios.get(
                `/specimen-groups/${selectedGroupId}/details`,
            );

            onConfirm(response.data);
            onOpenChange(false);
        } catch (error) {
            console.error('Error fetching group details:', error);
        } finally {
            setConfirming(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px]">
                <DialogHeader>
                    <DialogTitle>Seleccionar Grupo de Muestras</DialogTitle>
                    <DialogDescription>
                        Busque y seleccione el grupo de muestras existente al
                        cual desea agregar nuevas muestras. Puede buscar por
                        nombre de grupo, número de factura o por el código de
                        cualquiera de las muestras del grupo.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, nº factura o código de muestra..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="max-h-[500px] divide-y divide-border overflow-y-auto rounded-md border border-border bg-card">
                        {loading && groups.length === 0 ? (
                            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span>Cargando grupos...</span>
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                No se encontraron grupos de muestras
                            </div>
                        ) : (
                            groups.map((group) => {
                                const isSelected = selectedGroupId === group.id;

                                return (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() =>
                                            setSelectedGroupId(group.id)
                                        }
                                        className={`flex w-full items-start gap-4 p-3 text-left transition-colors ${
                                            isSelected
                                                ? 'bg-primary text-white hover:bg-primary/90'
                                                : 'hover:bg-muted/50'
                                        }`}
                                    >
                                        <div className="mt-1 flex shrink-0 items-center justify-center">
                                            <div
                                                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                                    isSelected
                                                        ? 'border-white'
                                                        : 'border-muted-foreground/60'
                                                }`}
                                            >
                                                {isSelected && (
                                                    <div className="h-2 w-2 rounded-full bg-white" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-1 flex-col gap-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <span
                                                    className={`text-sm font-semibold ${
                                                        isSelected
                                                            ? 'text-white'
                                                            : 'text-foreground'
                                                    }`}
                                                >
                                                    {group.name}
                                                </span>
                                                <span
                                                    className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] ${
                                                        isSelected
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {group.full_invoice_number}
                                                </span>
                                            </div>
                                            <span
                                                className={`text-xs ${
                                                    isSelected
                                                        ? 'text-white/80'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                Paciente principal:{' '}
                                                {group.customer_name}
                                            </span>

                                            {group.specimen_codes &&
                                                group.specimen_codes.length >
                                                    0 && (
                                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                                        {group.specimen_codes.map(
                                                            (code, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                                                                        isSelected
                                                                            ? 'border-white/30 bg-white/20 text-white'
                                                                            : 'border-primary/20 bg-primary/5 text-primary dark:bg-primary/20 dark:text-primary-foreground'
                                                                    }`}
                                                                >
                                                                    {code}
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {lastPage > 1 && (
                        <div className="flex items-center justify-between border-t border-border/50 px-1 pt-3 text-xs">
                            <span className="text-muted-foreground">
                                Mostrando {groups.length} de {total} grupos
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1 || loading}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="font-medium text-muted-foreground">
                                    Página {page} de {lastPage}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === lastPage || loading}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={confirming}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!selectedGroupId || confirming}
                        className="gap-2"
                    >
                        {confirming && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Confirmar y Continuar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
