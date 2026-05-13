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
import { Edit2, Microscope, Plus, Search, Trash2 } from 'lucide-react';
import SpecimenTypeSheet from './specimen-type-sheet';
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
    index as specimenTypesIndex, 
    destroy as destroySpecimenType 
} from '@/actions/App/Http/Controllers/SpecimenTypeController';

interface SpecimenType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
}

interface Props {
    specimenTypes: {
        data: SpecimenType[];
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

export default function SpecimenTypesIndex({ specimenTypes, filters }: Props) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedSpecimenType, setSelectedSpecimenType] = useState<SpecimenType | null>(null);
    const [specimenTypeToDelete, setSpecimenTypeToDelete] = useState<SpecimenType | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        if (value === '') delete newFilters[key as keyof typeof filters];
        
        router.get(specimenTypesIndex().url, newFilters, {
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

    const handleEdit = (specimenType: SpecimenType) => {
        setSelectedSpecimenType(specimenType);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedSpecimenType(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (specimenType: SpecimenType) => {
        setSpecimenTypeToDelete(specimenType);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (specimenTypeToDelete) {
            router.delete(destroySpecimenType(specimenTypeToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Tipo de muestra eliminado correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Tipos de Muestras" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Microscope className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">Tipos de Muestras</h1>
                        </div>
                        <p className="text-muted-foreground">Administre los diferentes tipos de muestras para los análisis.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCreate} className="h-10 px-5 text-sm w-full md:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Tipo
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o descripción..."
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
                                <TableHead>Descripción</TableHead>
                                <TableHead>Fecha Creación</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {specimenTypes.data.length > 0 ? (
                                specimenTypes.data.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-medium">{type.name}</TableCell>
                                        <TableCell className="max-w-md truncate text-muted-foreground">
                                            {type.description || 'Sin descripción'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(type.created_at).toLocaleDateString('es-ES', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(type)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No se encontraron resultados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination 
                    links={specimenTypes.links} 
                    meta={{
                        from: specimenTypes.from,
                        to: specimenTypes.to,
                        total: specimenTypes.total
                    }} 
                />
            </div>

            <SpecimenTypeSheet
                specimenType={selectedSpecimenType}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está completamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactivará el tipo de muestra <strong>{specimenTypeToDelete?.name}</strong>. 
                            Ya no aparecerá en la lista activa ni estará disponible para nuevos análisis.
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
