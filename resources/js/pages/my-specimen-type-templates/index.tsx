import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import {
    Edit2,
    FileSpreadsheet,
    Plus,
    Search,
    Trash2,
    Share2,
    ChevronDown,
} from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    index as myTemplatesIndex,
    destroy as destroyMyTemplate,
} from '@/actions/App/Http/Controllers/MySpecimenTypeTemplateController';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import ShareTemplatesSheet from './share-templates-sheet';
import SharedTemplatesListSheet from './shared-templates-list-sheet';
import TemplateSheet from './template-sheet';

interface User {
    id: number;
    name: string;
    email: string;
}

interface SpecimenTypeExamination {
    id: number;
    specimen_type: number;
    name: string;
}

interface SpecimenType {
    id: number;
    name: string;
    examinations: any[];
}

interface SectionsOrderElement {
    key: string;
    order: number;
    active: boolean;
}

interface Template {
    id: number;
    user_id: number;
    user?: User | null;
    specimen_type_id: number;
    specimen_type: {
        id: number;
        name: string;
    } | null;
    specimen_type_examination_id: number;
    specimen_type_examination: {
        id: number;
        name: string;
    } | null;
    clinical_details_html: string | null;
    diagnosis_html: string | null;
    macroscopy_html: string | null;
    microscopy_html: string | null;
    comments_notes_html: string | null;
    protocols_html: string | null;
    legend_html: string | null;
    sections_order?: SectionsOrderElement[] | null;
    created_at: string;
}

interface SharedPermission {
    id: number;
    owner_id: number;
    specimen_type_id: number;
    specimen_type: SpecimenType | null;
    specimen_type_examination_id: number;
    specimen_type_examination: { id: number; name: string } | null;
    template_id: number;
    shared_with_id: number;
    shared_with: User | null;
    created_at: string;
}

interface Props {
    templates: {
        data: Template[];
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
    users: User[];
    examinations: SpecimenTypeExamination[];
    sharedPermissions: SharedPermission[];
    filters: {
        search?: string;
    };
}

export default function MyTemplatesIndex({
    templates,
    specimenTypes,
    users,
    examinations,
    sharedPermissions,
    filters,
}: Props) {
    const { auth } = usePage<any>().props;
    const canManage = auth.permissions?.includes(
        'my_specimen_type_templates.manage',
    );

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
    const [isShareListSheetOpen, setIsShareListSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
        null,
    );
    const [templateToDelete, setTemplateToDelete] = useState<Template | null>(
        null,
    );
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const newFilters = { ...filters, [key]: value };

            if (value === '') {
                delete newFilters[key as keyof typeof filters];
            }

            router.get(myTemplatesIndex().url, newFilters, {
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
    }, [search, filters.search, debouncedSearch]);

    const handleEdit = (template: Template) => {
        setSelectedTemplate(template);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedTemplate(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (template: Template) => {
        setTemplateToDelete(template);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (templateToDelete) {
            router.delete(destroyMyTemplate(templateToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Plantilla eliminada correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    const stripHtml = (html: string | null) => {
        if (!html) {
            return '—';
        }

        const clean = html.replace(/<\/?[^>]+(>|$)/g, ' ').trim();

        return clean.length > 50
            ? clean.substring(0, 50) + '...'
            : clean || '—';
    };

    return (
        <>
            <Head title="Mis Plantillas" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Mis Plantillas
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Gestione sus plantillas de diagnóstico predefinidas
                            para sus reportes.
                        </p>
                    </div>
                    {canManage && (
                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-10 w-full cursor-pointer px-5 text-sm md:w-auto"
                                    >
                                        <Share2 className="mr-2 h-4 w-4" />{' '}
                                        Compartir{' '}
                                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-56"
                                >
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setIsShareSheetOpen(true)
                                        }
                                        className="cursor-pointer"
                                    >
                                        Compartir Plantillas
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setIsShareListSheetOpen(true)
                                        }
                                        className="cursor-pointer"
                                    >
                                        Ver Plantillas Compartidas
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                                onClick={handleCreate}
                                className="h-10 w-full cursor-pointer px-5 text-sm md:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nueva
                                Plantilla
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por tipo de muestra, examen..."
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
                                <TableHead>Usuario</TableHead>
                                <TableHead>Tipo de Muestra</TableHead>
                                <TableHead>Examen</TableHead>
                                <TableHead>Diagnóstico</TableHead>
                                <TableHead>Macroscopía</TableHead>
                                <TableHead>Microscopía</TableHead>
                                <TableHead className="text-right">
                                    {canManage && 'Acciones'}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.data.length > 0 ? (
                                templates.data.map((template) => (
                                    <TableRow key={template.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>
                                                    {template.user?.name ||
                                                        'Desconocido'}
                                                </span>
                                                {template.user_id !==
                                                    auth.user.id && (
                                                    <span className="mt-1 inline-flex w-max items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset dark:bg-blue-900/30 dark:text-blue-300">
                                                        Compartido
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {template.specimen_type?.name ||
                                                'Desconocido'}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {template.specimen_type_examination
                                                ?.name || 'Desconocido'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {stripHtml(template.diagnosis_html)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {stripHtml(
                                                template.macroscopy_html,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {stripHtml(
                                                template.microscopy_html,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {canManage && (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="cursor-pointer"
                                                        onClick={() =>
                                                            handleEdit(template)
                                                        }
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    {template.user_id ===
                                                        auth.user.id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="cursor-pointer text-destructive"
                                                            onClick={() =>
                                                                handleDeleteClick(
                                                                    template,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="h-24 text-center"
                                    >
                                        No se encontraron resultados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={templates.links}
                    meta={{
                        from: templates.from,
                        to: templates.to,
                        total: templates.total,
                    }}
                />
            </div>

            <TemplateSheet
                template={selectedTemplate}
                specimenTypes={specimenTypes}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            <ShareTemplatesSheet
                open={isShareSheetOpen}
                onOpenChange={setIsShareSheetOpen}
                users={users}
                specimenTypes={specimenTypes}
                examinations={examinations}
            />

            <SharedTemplatesListSheet
                open={isShareListSheetOpen}
                onOpenChange={setIsShareListSheetOpen}
                sharedPermissions={sharedPermissions}
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
                            Esta acción eliminará de forma permanente la
                            plantilla para{' '}
                            <strong>
                                {templateToDelete?.specimen_type?.name} -{' '}
                                {
                                    templateToDelete?.specimen_type_examination
                                        ?.name
                                }
                            </strong>
                            . No se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
