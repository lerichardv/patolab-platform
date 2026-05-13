import { Head, router } from '@inertiajs/react';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Edit2, FlaskConical, Plus, Search, Trash2 } from 'lucide-react';
import SpecimenTypeExaminationSheet from './specimen-type-examination-sheet';
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
    index as examinationsIndex, 
    destroy as destroyExamination 
} from '@/actions/App/Http/Controllers/SpecimenTypeExaminationController';

interface SpecimenType {
    id: number;
    name: string;
}

interface Examination {
    id: number;
    specimen_type: number;
    name: string;
    description: string;
    type?: SpecimenType;
    created_at: string;
}

interface Props {
    examinations: {
        data: Examination[];
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
    specimenTypes: SpecimenType[];
    filters: {
        search?: string;
        specimen_type?: string;
    };
}

export default function SpecimenTypeExaminationsIndex({ examinations, specimenTypes, filters }: Props) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedExamination, setSelectedExamination] = useState<Examination | null>(null);
    const [examinationToDelete, setExaminationToDelete] = useState<Examination | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        if (value === 'all' || value === '') delete newFilters[key as keyof typeof filters];
        
        router.get(examinationsIndex().url, newFilters, {
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

    const handleEdit = (examination: Examination) => {
        setSelectedExamination(examination);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedExamination(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (examination: Examination) => {
        setExaminationToDelete(examination);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (examinationToDelete) {
            router.delete(destroyExamination(examinationToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Tipo de análisis eliminado correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Tipos de Análisis" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FlaskConical className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">Tipos de Análisis</h1>
                        </div>
                        <p className="text-muted-foreground">Administre los diferentes análisis disponibles por tipo de muestra.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCreate} className="h-10 px-5 text-sm w-full md:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Análisis
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={filters.specimen_type || 'all'} onValueChange={(v) => handleFilterChange('specimen_type', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Tipo de Muestra" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los tipos de muestra</SelectItem>
                            {specimenTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id.toString()}>
                                    {type.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tipo de Muestra</TableHead>
                                <TableHead>Análisis</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Fecha Creación</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {examinations.data.length > 0 ? (
                                examinations.data.map((exam) => (
                                    <TableRow key={exam.id}>
                                        <TableCell>
                                            <span className="font-semibold text-primary">
                                                {exam.type?.name || 'Cargando...'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-medium">{exam.name}</TableCell>
                                        <TableCell className="max-w-xs truncate text-muted-foreground">
                                            {exam.description}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(exam.created_at).toLocaleDateString('es-ES', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(exam)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(exam)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No se encontraron resultados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination 
                    links={examinations.links} 
                    meta={{
                        from: examinations.from,
                        to: examinations.to,
                        total: examinations.total
                    }} 
                />
            </div>

            <SpecimenTypeExaminationSheet
                examination={selectedExamination}
                specimenTypes={specimenTypes}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está completamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactivará el tipo de análisis <strong>{examinationToDelete?.name}</strong>. 
                            Ya no aparecerá en la lista activa.
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
