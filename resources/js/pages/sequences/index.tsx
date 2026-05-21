import { Head, router } from '@inertiajs/react';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Edit2, Hash, Plus, Search, Trash2 } from 'lucide-react';
import SequenceSheet from './sequence-sheet';
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
import debounce from 'lodash/debounce';
import { toast } from 'sonner';
import {
    index as sequencesIndex,
    destroy as destroySequence
} from '@/actions/App/Http/Controllers/SequenceController';

interface Location {
    id: number;
    name: string;
}

interface SpecimenType {
    id: number;
    name: string;
}

interface Sequence {
    id: number;
    location_id: number;
    specimen_type: number;
    prefix: string;
    separator: string;
    fill: number;
    month: number;
    year: number;
    current_sequence: number;
    location?: Location;
    specimen_type_relation?: SpecimenType; // Laravel might rename it if I used with(['specimenType'])
}

interface Props {
    sequences: {
        data: any[];
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
    locations: Location[];
    specimenTypes: SpecimenType[];
    allSequences: any[];
    filters: {
        search?: string;
    };
}

export default function SequencesIndex({ sequences, locations, specimenTypes, allSequences = [], filters }: Props) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedSequence, setSelectedSequence] = useState<any | null>(null);
    const [sequenceToDelete, setSequenceToDelete] = useState<any | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        if (value === '') delete newFilters[key as keyof typeof filters];

        router.get(sequencesIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            handleFilterChange('search', value);
        }, 300),
        [filters]
    );

    useEffect(() => {
        if (search !== filters.search) {
            debouncedSearch(search);
        }
    }, [search]);

    const handleEdit = (sequence: any) => {
        setSelectedSequence(sequence);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedSequence(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (sequence: any) => {
        setSequenceToDelete(sequence);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (sequenceToDelete) {
            router.delete(destroySequence(sequenceToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Secuencia desactivada correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    const formatPreview = (sequence: any) => {
        const fill = sequence.fill || 4;
        const seq = String(sequence.current_sequence).padStart(fill, '0');
        const month = String(sequence.month).padStart(2, '0');
        const year = String(sequence.year); // Full 4-digit year
        return `${sequence.prefix}${sequence.separator}${seq}${sequence.separator}${month}${sequence.separator}${year}`;
    };

    return (
        <>
            <Head title="Gestión de Secuencias" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Secuencias</h1>
                        <p className="text-muted-foreground">Administre los formatos y contadores de las muestras por sucursal.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCreate} className="h-10 px-5 text-sm w-full md:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Nueva Secuencia
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2 max-w-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por prefijo, sucursal o tipo..."
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
                                <TableHead>Sucursal / Tipo</TableHead>
                                <TableHead>Prefijo</TableHead>
                                <TableHead>Siguiente secuencia</TableHead>
                                <TableHead>Formato / Preview</TableHead>
                                <TableHead>Mes / Año</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sequences.data.length > 0 ? (
                                sequences.data.map((sequence) => (
                                    <TableRow key={sequence.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">
                                                    {sequence.location?.name || 'Sucursal Desconocida'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {sequence.specimen_type_relation?.name || 'Muestra Desconocida'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="bg-primary/10 px-2 py-1 rounded inline-flex items-center font-mono text-xs font-bold text-primary">
                                                {sequence.prefix}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="bg-muted px-2.5 py-1 rounded inline-flex items-center font-mono text-xs font-bold text-muted-foreground border">
                                                {sequence.current_sequence}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                                    {formatPreview(sequence)}
                                                </code>
                                                <span className="text-[10px] text-muted-foreground italic">
                                                    Próximo correlativo: {sequence.current_sequence} (relleno de {sequence.fill})
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs">
                                                {String(sequence.month).padStart(2, '0')} / {sequence.year}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(sequence)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(sequence)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No se encontraron resultados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={sequences.links}
                    meta={{
                        from: sequences.from,
                        to: sequences.to,
                        total: sequences.total
                    }}
                />
            </div>

            <SequenceSheet
                sequence={selectedSequence}
                locations={locations}
                specimenTypes={specimenTypes}
                allSequences={allSequences}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está completamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactivará la secuencia para <strong>{sequenceToDelete?.location?.name}</strong> ({sequenceToDelete?.prefix}).
                            Ya no se utilizará para generar nuevos correlativos de muestras.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
                            Desactivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
