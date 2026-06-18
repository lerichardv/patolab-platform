import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import {
    Edit2,
    Plus,
    Search,
    Trash2,
    Copy,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    Check,
    X,
} from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
    index as rulesIndex,
    destroy as destroyRule,
} from '@/actions/App/Http/Controllers/UserCommissionRuleController';
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
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import CommissionRuleSheet from './commission-rule-sheet';

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
    specimen_type: number;
    name: string;
}

interface CommissionRule {
    id: number;
    user_id: number;
    specimen_type_id: number;
    specimen_type_examination_id: number;
    macroscopy_commission_enabled: boolean;
    macroscopy_calculation_type: 'fixed' | 'percentage' | null;
    macroscopy_commission_value: string;
    microscopy_commission_enabled: boolean;
    microscopy_calculation_type: 'fixed' | 'percentage' | null;
    microscopy_commission_value: string;
    user?: User;
    specimen_type?: SpecimenType;
    specimen_type_examination?: SpecimenTypeExamination;
}

interface Props {
    rules: {
        data: CommissionRule[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
        from: number;
        to: number;
    };
    users: User[];
    specimenTypes: SpecimenType[];
    examinations: SpecimenTypeExamination[];
    filters: {
        search?: string;
        user_id?: string;
        specimen_type_id?: string;
        specimen_type_examination_id?: string;
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
    };
}
function FilterCombobox({
    options,
    value,
    onChange,
    placeholder,
    emptyMessage = 'No se encontraron resultados.',
    disabled = false,
}: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    emptyMessage?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild className="w-full">
                <button
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm font-normal whitespace-nowrap text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50"
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="z-[120] w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
            >
                <Command>
                    <CommandInput placeholder="Buscar..." />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4 shrink-0',
                                            value === option.value
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate">
                                        {option.label}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default function CommissionRulesIndex({
    rules,
    users,
    specimenTypes,
    examinations,
    filters,
}: Props) {
    const { auth } = usePage<any>().props;
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRule, setSelectedRule] = useState<CommissionRule | null>(
        null,
    );
    const [isDuplicateMode, setIsDuplicateMode] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState<CommissionRule | null>(
        null,
    );
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const newFilters: Record<string, any> = {
                ...filters,
                [key]: value,
            };

            if (value === 'all' || value === '') {
                delete newFilters[key];
            }

            router.get(rulesIndex().url, newFilters, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    const handleSpecimenTypeFilterChange = useCallback(
        (val: string) => {
            const newFilters: Record<string, any> = {
                ...filters,
                specimen_type_id: val,
            };
            // Reset examination filter on specimen type change
            delete newFilters.specimen_type_examination_id;

            if (val === 'all' || val === '') {
                delete newFilters.specimen_type_id;
            }

            router.get(rulesIndex().url, newFilters, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    const handleSort = useCallback(
        (field: string) => {
            const isCurrentField = filters.sort_field === field;
            const direction =
                isCurrentField && filters.sort_direction === 'asc'
                    ? 'desc'
                    : 'asc';

            const newFilters: Record<string, any> = {
                ...filters,
                sort_field: field,
                sort_direction: direction,
            };

            router.get(rulesIndex().url, newFilters, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    const hasActiveFilters = useMemo(() => {
        return !!(
            filters.search ||
            filters.user_id ||
            filters.specimen_type_id ||
            filters.specimen_type_examination_id
        );
    }, [filters]);

    const handleClearFilters = useCallback(() => {
        setSearch('');
        const newFilters: Record<string, any> = { ...filters };
        delete newFilters.search;
        delete newFilters.user_id;
        delete newFilters.specimen_type_id;
        delete newFilters.specimen_type_examination_id;

        router.get(rulesIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    const renderSortHeader = (field: string, label: string) => {
        const isSorted = filters.sort_field === field;
        const direction = isSorted ? filters.sort_direction || 'desc' : null;

        return (
            <button
                onClick={() => handleSort(field)}
                className="group/btn flex items-center gap-1.5 text-left font-semibold transition-colors hover:text-foreground"
            >
                <span>{label}</span>
                {direction === 'asc' ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
                ) : direction === 'desc' ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover/btn:opacity-100" />
                )}
            </button>
        );
    };

    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                handleFilterChange('search', value);
            }, 300),
        [handleFilterChange],
    );

    useEffect(() => {
        if (search !== (filters.search || '')) {
            debouncedSearch(search);
        }

        return () => {
            debouncedSearch.cancel();
        };
    }, [search, debouncedSearch, filters.search]);

    const handleCreate = () => {
        setSelectedRule(null);
        setIsDuplicateMode(false);
        setIsSheetOpen(true);
    };

    const handleEdit = (rule: CommissionRule) => {
        setSelectedRule(rule);
        setIsDuplicateMode(false);
        setIsSheetOpen(true);
    };

    const handleDuplicate = (rule: CommissionRule) => {
        setSelectedRule(rule);
        setIsDuplicateMode(true);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (rule: CommissionRule) => {
        setRuleToDelete(rule);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (ruleToDelete) {
            router.delete(destroyRule(ruleToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Regla de comisión eliminada correctamente');
                    setIsDeleteDialogOpen(false);
                },
                onError: (errors: any) => {
                    if (errors.error) {
                        toast.error(errors.error);
                    }

                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    const renderCommissionCell = (
        enabled: boolean,
        type: string | null,
        value: string,
    ) => {
        if (!enabled) {
            return (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800/30 dark:text-gray-400">
                    Deshabilitado
                </span>
            );
        }

        const formattedValue = parseFloat(value).toLocaleString('es-HN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        return (
            <div className="flex flex-col items-start gap-1">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Habilitado
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                    {type === 'fixed'
                        ? `Fijo: L. ${formattedValue}`
                        : `Porcentaje: ${formattedValue}%`}
                </span>
            </div>
        );
    };

    // Filter lists
    const userOptions = [
        { label: 'Todos los usuarios', value: 'all' },
        ...users.map((u) => ({
            label: `${u.name} (${u.email})`,
            value: u.id.toString(),
        })),
    ];

    const specimenTypeOptions = [
        { label: 'Todos los tipos de muestra', value: 'all' },
        ...specimenTypes.map((st) => ({
            label: st.name,
            value: st.id.toString(),
        })),
    ];

    const filteredExaminations = filters.specimen_type_id
        ? examinations.filter(
              (e) => e.specimen_type.toString() === filters.specimen_type_id,
          )
        : [];

    const examinationOptions = [
        { label: 'Todos los exámenes', value: 'all' },
        ...filteredExaminations.map((e) => ({
            label: e.name,
            value: e.id.toString(),
        })),
    ];

    return (
        <>
            <Head title="Comisiones de Usuarios" />
            <div className="flex h-full flex-1 flex-col gap-4 p-6 md:p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Comisiones de Usuarios
                        </h1>
                        <p className="text-muted-foreground">
                            Configure las reglas de comisión para patólogos por
                            tipos de muestras y exámenes.
                        </p>
                    </div>
                    {auth.permissions?.includes(
                        'user_commission_rules.create',
                    ) && (
                        <Button
                            onClick={handleCreate}
                            className="h-10 w-full px-5 text-sm md:w-auto"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Nueva Regla
                        </Button>
                    )}
                </div>

                {/* Advanced Filters Area */}
                <div className="flex w-full flex-col gap-4">
                    {/* Row 1: Search */}
                    <div className="relative w-full">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por usuario, muestra o examen en texto libre..."
                            className="max-w-[500px] pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Row 2: Select/Combobox filters */}
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {/* User Filter */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Filtrar por Usuario
                            </span>
                            <FilterCombobox
                                placeholder="Todos los usuarios"
                                value={filters.user_id || 'all'}
                                onChange={(val) =>
                                    handleFilterChange('user_id', val)
                                }
                                options={userOptions}
                            />
                        </div>

                        {/* Specimen Type Filter */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Tipo de Muestra
                            </span>
                            <FilterCombobox
                                placeholder="Todos los tipos"
                                value={filters.specimen_type_id || 'all'}
                                onChange={handleSpecimenTypeFilterChange}
                                options={specimenTypeOptions}
                            />
                        </div>

                        {/* Examination Filter */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Examen
                            </span>
                            <FilterCombobox
                                placeholder="Todos los exámenes"
                                value={
                                    filters.specimen_type_examination_id ||
                                    'all'
                                }
                                onChange={(val) =>
                                    handleFilterChange(
                                        'specimen_type_examination_id',
                                        val,
                                    )
                                }
                                options={examinationOptions}
                                disabled={!filters.specimen_type_id}
                            />
                        </div>

                        {/* Clear Filters Button */}
                        {hasActiveFilters && (
                            <div className="flex w-full">
                                <Button
                                    variant="outline"
                                    onClick={handleClearFilters}
                                    className="h-10 w-full gap-2 border-dashed text-muted-foreground hover:border-solid hover:bg-background hover:text-foreground"
                                >
                                    <X className="h-4 w-4" /> Limpiar Filtros
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    {renderSortHeader('name', 'Usuario')}
                                </TableHead>
                                <TableHead>
                                    {renderSortHeader(
                                        'specimen_type',
                                        'Tipo de Muestra',
                                    )}
                                </TableHead>
                                <TableHead>
                                    {renderSortHeader('examination', 'Examen')}
                                </TableHead>
                                <TableHead>Comisión Macroscopía</TableHead>
                                <TableHead>Comisión Microscopía</TableHead>
                                <TableHead className="text-right">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rules.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-24 text-center"
                                    >
                                        No se encontraron reglas de comisión.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rules.data.map((rule) => (
                                    <TableRow key={rule.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">
                                                    {rule.user?.name ||
                                                        'Desconocido'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {rule.user?.email || ''}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {rule.specimen_type?.name ||
                                                'Desconocido'}
                                        </TableCell>
                                        <TableCell>
                                            {rule.specimen_type_examination
                                                ?.name || 'Desconocido'}
                                        </TableCell>
                                        <TableCell>
                                            {renderCommissionCell(
                                                rule.macroscopy_commission_enabled,
                                                rule.macroscopy_calculation_type,
                                                rule.macroscopy_commission_value,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {renderCommissionCell(
                                                rule.microscopy_commission_enabled,
                                                rule.microscopy_calculation_type,
                                                rule.microscopy_commission_value,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {auth.permissions?.includes(
                                                    'user_commission_rules.create',
                                                ) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleDuplicate(
                                                                rule,
                                                            )
                                                        }
                                                        title="Duplicar regla"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {auth.permissions?.includes(
                                                    'user_commission_rules.edit',
                                                ) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleEdit(rule)
                                                        }
                                                        title="Editar regla"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {auth.permissions?.includes(
                                                    'user_commission_rules.delete',
                                                ) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() =>
                                                            handleDeleteClick(
                                                                rule,
                                                            )
                                                        }
                                                        title="Eliminar regla"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={rules.links}
                    meta={{
                        from: rules.from,
                        to: rules.to,
                        total: rules.total,
                    }}
                />
            </div>

            <CommissionRuleSheet
                rule={selectedRule}
                users={users}
                specimenTypes={specimenTypes}
                examinations={examinations}
                isDuplicate={isDuplicateMode}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Eliminar regla de comisión?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará de forma permanente la regla
                            de comisión asignada al usuario{' '}
                            <strong>{ruleToDelete?.user?.name}</strong> para la
                            muestra{' '}
                            <strong>{ruleToDelete?.specimen_type?.name}</strong>{' '}
                            y examen{' '}
                            <strong>
                                {ruleToDelete?.specimen_type_examination?.name}
                            </strong>
                            . Esta acción no se puede deshacer.
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
