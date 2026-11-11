import { usePage } from '@inertiajs/react';
import {
    Calendar,
    CalendarDays,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronsUpDown,
    Clock,
    FileText,
    Microscope,
    RotateCcw,
    Search,
    Tag,
    User,
    UserPlus,
    X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { expiredList as expiredListAction } from '@/actions/App/Http/Controllers/SpecimenBalanceController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn, matchesSearch } from '@/lib/utils';
import type {
    DetailedSheetSpecimenItem,
    ExaminationOption,
    FilterOptions,
    SpecimenItem,
} from '../types';

export interface ExpiredSpecimensContentProps {
    onClose?: () => void;
    pathologists?: { id: number; name: string; email: string }[];
    canManage?: boolean;
    filterOptions?: FilterOptions;
    onReprogramSpecimen: (specimen: SpecimenItem) => void;
    onBulkAction?: (
        action: 'move_date' | 'assign_pathologist',
        specimens: SpecimenItem[],
    ) => void;
}

const toSpecimenItem = (d: DetailedSheetSpecimenItem): SpecimenItem => ({
    id: d.id,
    sequence_code: d.sequence_code,
    status: d.status,
    status_label: d.status_label,
    status_color: d.status_color,
    customer_name: d.customer_name,
    type_id: d.type_id || 0,
    type_name: d.type_name,
    requires_report: false,
    examination_name: d.examination_name,
    examination_color: d.examination_color,
    category_name: d.category_name,
    internal_date: d.internal_date,
    client_date: d.client_date,
    is_manual_internal: false,
    is_manual_client: false,
    duration_minutes: d.duration_minutes,
    points: d.points,
    priority_name: d.priority_name,
    priority_color: d.priority_color,
    assigned_user_ids: d.assigned_users?.map((u) => u.id) || [],
    assigned_users: d.assigned_users || [],
    created_at: d.created_at,
});

export const ExpiredSpecimensContent: React.FC<
    ExpiredSpecimensContentProps
> = ({
    pathologists: propPathologists,
    canManage: propCanManage,
    filterOptions: propFilterOptions,
    onReprogramSpecimen,
    onBulkAction,
}) => {
    const pageProps = usePage<{
        auth?: { permissions?: string[] };
        pathologists?: { id: number; name: string; email: string }[];
        filterOptions?: FilterOptions;
    }>().props;

    const pathologists = useMemo(
        () => propPathologists || pageProps.pathologists || [],
        [propPathologists, pageProps.pathologists],
    );

    const permissions: string[] = pageProps.auth?.permissions || [];
    const canManage: boolean =
        propCanManage !== undefined
            ? propCanManage
            : permissions.includes('specimens_balance.manage') ||
              permissions.includes('specimens.edit');
    const filterOptions: FilterOptions = useMemo(
        () =>
            propFilterOptions ||
            pageProps.filterOptions || {
                specimenTypes: [],
                examinations: [],
                categories: [],
            },
        [propFilterOptions, pageProps.filterOptions],
    );

    const [specimens, setSpecimens] = useState<DetailedSheetSpecimenItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Derived effective filter options
    const effectiveSpecimenTypes = useMemo(() => {
        if (
            filterOptions.specimenTypes &&
            filterOptions.specimenTypes.length > 0
        ) {
            return filterOptions.specimenTypes;
        }

        const map = new Map<number, string>();
        specimens.forEach((s) => {
            if (s.type_id && s.type_name) {
                map.set(s.type_id, s.type_name);
            }
        });

        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [filterOptions.specimenTypes, specimens]);

    const effectiveExaminations = useMemo(() => {
        if (
            filterOptions.examinations &&
            filterOptions.examinations.length > 0
        ) {
            return filterOptions.examinations;
        }

        const map = new Map<number, ExaminationOption>();
        specimens.forEach((s) => {
            if (s.examination_ids && s.examination_ids.length > 0) {
                s.examination_ids.forEach((id) => {
                    if (!map.has(id)) {
                        map.set(id, {
                            id,
                            name: s.examination_name,
                            color: s.examination_color,
                            specimen_type: s.type_id || 0,
                        });
                    }
                });
            }
        });

        return Array.from(map.values());
    }, [filterOptions.examinations, specimens]);

    const effectiveCategories = useMemo(() => {
        if (filterOptions.categories && filterOptions.categories.length > 0) {
            return filterOptions.categories;
        }

        const map = new Map<number, string>();
        specimens.forEach((s) => {
            if (s.category_id && s.category_name) {
                map.set(s.category_id, s.category_name);
            }
        });

        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [filterOptions.categories, specimens]);

    const effectivePathologists = useMemo(() => {
        if (pathologists && pathologists.length > 0) {
            return pathologists;
        }

        const map = new Map<
            number,
            { id: number; name: string; email?: string }
        >();
        specimens.forEach((s) => {
            s.assigned_users?.forEach((u) => {
                if (!map.has(u.id)) {
                    map.set(u.id, { id: u.id, name: u.name });
                }
            });
        });

        return Array.from(map.values());
    }, [pathologists, specimens]);

    // Filters: specimen type, examination, category, pathologist, search
    const [search, setSearch] = useState('');
    const [selectedSpecimenTypeIds, setSelectedSpecimenTypeIds] = useState<
        string[]
    >(() => filterOptions.specimenTypes.map((t) => t.id.toString()));
    const [selectedExaminationIds, setSelectedExaminationIds] = useState<
        string[]
    >(() => filterOptions.examinations.map((e) => e.id.toString()));
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedPathologistId, setSelectedPathologistId] =
        useState<string>('all');

    // Popover states
    const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
    const [isPathologistFilterOpen, setIsPathologistFilterOpen] =
        useState(false);

    // Sort states (pattern from Cuttings Report / Hoja de Relación de Biopsias)
    const [sortField, setSortField] = useState<string>('internal_date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (field: string) => {
        const isCurrentField = sortField === field;
        const direction =
            isCurrentField && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDirection(direction);
    };

    const renderSortHeader = (
        field: string,
        label: string,
        className?: string,
    ) => {
        const isSorted = sortField === field;
        const direction = isSorted ? sortDirection : null;

        return (
            <button
                type="button"
                onClick={() => handleSort(field)}
                className={cn(
                    'group/btn inline-flex cursor-pointer items-center gap-1.5 text-left font-semibold transition-colors select-none hover:text-foreground',
                    className,
                )}
            >
                <span>{label}</span>
                {direction === 'asc' ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : direction === 'desc' ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover/btn:opacity-100" />
                )}
            </button>
        );
    };

    // Multi-selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Fetch expired specimens when mounted
    useEffect(() => {
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
                    const loadedSpecimens: DetailedSheetSpecimenItem[] =
                        data.specimens || [];
                    setSpecimens(loadedSpecimens);
                    setLoading(false);

                    if (
                        filterOptions.specimenTypes.length === 0 &&
                        loadedSpecimens.length > 0
                    ) {
                        const typesMap = new Map<number, string>();
                        const examsMap = new Map<number, string>();
                        loadedSpecimens.forEach((s) => {
                            if (s.type_id && s.type_name) {
                                typesMap.set(s.type_id, s.type_name);
                            }

                            if (s.examination_ids) {
                                s.examination_ids.forEach((id) => {
                                    examsMap.set(id, s.examination_name);
                                });
                            }
                        });
                        setSelectedSpecimenTypeIds(
                            Array.from(typesMap.keys()).map(String),
                        );
                        setSelectedExaminationIds(
                            Array.from(examsMap.keys()).map(String),
                        );
                    }
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
    }, [filterOptions.specimenTypes.length]);

    const getSpecimenTypeId = (exam: any): string | null => {
        const typeId =
            exam.specimen_type || exam.specimen_type_id || exam.type?.id;

        return typeId ? typeId.toString() : null;
    };

    const filteredExaminationsForDropdown = useMemo(() => {
        if (selectedSpecimenTypeIds.length === effectiveSpecimenTypes.length) {
            return effectiveExaminations;
        }

        return effectiveExaminations.filter((exam) => {
            const typeId = getSpecimenTypeId(exam);

            return typeId && selectedSpecimenTypeIds.includes(typeId);
        });
    }, [
        selectedSpecimenTypeIds,
        effectiveSpecimenTypes,
        effectiveExaminations,
    ]);

    const handleSpecimenTypeSelectionChange = (nextTypeIds: string[]) => {
        setSelectedSpecimenTypeIds(nextTypeIds);

        let nextExamIds: string[];

        if (nextTypeIds.length === effectiveSpecimenTypes.length) {
            nextExamIds = effectiveExaminations.map((e) => e.id.toString());
        } else if (nextTypeIds.length === 0) {
            nextExamIds = [];
        } else {
            const addedTypeIds = nextTypeIds.filter(
                (id) => !selectedSpecimenTypeIds.includes(id),
            );

            const validExamsForNextTypes = effectiveExaminations.filter(
                (exam) => {
                    const typeId = getSpecimenTypeId(exam);

                    return typeId && nextTypeIds.includes(typeId);
                },
            );
            const validExamIdsForNextTypes = validExamsForNextTypes.map((e) =>
                e.id.toString(),
            );

            let updatedExamIds = selectedExaminationIds.filter((id) =>
                validExamIdsForNextTypes.includes(id),
            );

            if (addedTypeIds.length > 0) {
                const addedExamIds = effectiveExaminations
                    .filter((exam) => {
                        const typeId = getSpecimenTypeId(exam);

                        return typeId && addedTypeIds.includes(typeId);
                    })
                    .map((e) => e.id.toString());

                updatedExamIds = Array.from(
                    new Set([...updatedExamIds, ...addedExamIds]),
                );
            }

            nextExamIds = updatedExamIds;
        }

        setSelectedExaminationIds(nextExamIds);
    };

    const handleExaminationSelectionChange = (nextExamIds: string[]) => {
        setSelectedExaminationIds(nextExamIds);
    };

    const selectedCategoryLabel = useMemo(() => {
        if (selectedCategory === 'all') {
            return 'Todas las categorías';
        }

        const c = effectiveCategories.find(
            (cat) => cat.id.toString() === selectedCategory,
        );

        return c ? c.name : 'Categoría';
    }, [selectedCategory, effectiveCategories]);

    const selectedPathologistLabel = useMemo(() => {
        if (selectedPathologistId === 'all') {
            return 'Todos los patólogos';
        }

        if (selectedPathologistId === 'unassigned') {
            return 'Sin Asignar';
        }

        const p = effectivePathologists.find(
            (p) => p.id.toString() === selectedPathologistId,
        );

        return p ? p.name : 'Patólogo';
    }, [selectedPathologistId, effectivePathologists]);

    const isTypesFiltered =
        effectiveSpecimenTypes.length > 0 &&
        selectedSpecimenTypeIds.length !== effectiveSpecimenTypes.length;
    const isExamsFiltered =
        effectiveExaminations.length > 0 &&
        selectedExaminationIds.length !== effectiveExaminations.length;
    const isCategoryFiltered = selectedCategory !== 'all';
    const isPathologistFiltered = selectedPathologistId !== 'all';
    const isSearchFiltered = Boolean(search.trim());

    const isFiltersActive =
        isTypesFiltered ||
        isExamsFiltered ||
        isCategoryFiltered ||
        isPathologistFiltered ||
        isSearchFiltered;

    const handleClearFilters = () => {
        setSelectedSpecimenTypeIds(
            effectiveSpecimenTypes.map((t) => t.id.toString()),
        );
        setSelectedExaminationIds(
            effectiveExaminations.map((e) => e.id.toString()),
        );
        setSelectedCategory('all');
        setSelectedPathologistId('all');
        setSearch('');
    };

    // Client-side filtering
    const filteredSpecimens = useMemo(() => {
        const searchLower = search.toLowerCase().trim();

        return specimens.filter((s) => {
            // Search
            if (searchLower) {
                const matches =
                    s.sequence_code?.toLowerCase().includes(searchLower) ||
                    s.customer_name?.toLowerCase().includes(searchLower) ||
                    s.examination_name?.toLowerCase().includes(searchLower) ||
                    s.type_name?.toLowerCase().includes(searchLower);

                if (!matches) {
                    return false;
                }
            }

            // Specimen Type filter
            if (isTypesFiltered) {
                const sTypeId = s.type_id
                    ? s.type_id.toString()
                    : effectiveSpecimenTypes
                          .find((t) => t.name === s.type_name)
                          ?.id.toString();

                if (!sTypeId || !selectedSpecimenTypeIds.includes(sTypeId)) {
                    return false;
                }
            }

            // Examination filter
            if (isExamsFiltered) {
                const hasExamMatch =
                    s.examination_ids && s.examination_ids.length > 0
                        ? s.examination_ids.some((id) =>
                              selectedExaminationIds.includes(id.toString()),
                          )
                        : effectiveExaminations.some(
                              (e) =>
                                  selectedExaminationIds.includes(
                                      e.id.toString(),
                                  ) &&
                                  s.examination_name
                                      ?.toLowerCase()
                                      .includes(e.name.toLowerCase()),
                          );

                if (!hasExamMatch) {
                    return false;
                }
            }

            // Category filter
            if (selectedCategory !== 'all') {
                const catId = parseInt(selectedCategory);
                const matchCategory =
                    s.category_id === catId ||
                    effectiveCategories.find((c) => c.id === catId)?.name ===
                        s.category_name;

                if (!matchCategory) {
                    return false;
                }
            }

            // Pathologist filter
            if (isPathologistFiltered) {
                if (selectedPathologistId === 'unassigned') {
                    if (s.assigned_users && s.assigned_users.length > 0) {
                        return false;
                    }
                } else {
                    const hasUser = s.assigned_users?.some(
                        (u) => u.id.toString() === selectedPathologistId,
                    );

                    if (!hasUser) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [
        specimens,
        search,
        isTypesFiltered,
        selectedSpecimenTypeIds,
        effectiveSpecimenTypes,
        isExamsFiltered,
        selectedExaminationIds,
        effectiveExaminations,
        selectedCategory,
        effectiveCategories,
        isPathologistFiltered,
        selectedPathologistId,
    ]);

    // Client-side sorting (asc / desc) matching Cuttings Report pattern
    const sortedSpecimens = useMemo(() => {
        if (!sortField) {
            return filteredSpecimens;
        }

        return [...filteredSpecimens].sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'sequence_code':
                    comparison = (a.sequence_code || '').localeCompare(
                        b.sequence_code || '',
                        undefined,
                        { numeric: true, sensitivity: 'base' },
                    );
                    break;
                case 'customer_name':
                    comparison = (a.customer_name || '').localeCompare(
                        b.customer_name || '',
                        undefined,
                        { sensitivity: 'base' },
                    );
                    break;
                case 'examination_name':
                    comparison = (a.examination_name || '').localeCompare(
                        b.examination_name || '',
                        undefined,
                        { sensitivity: 'base' },
                    );
                    break;
                case 'category_name':
                    comparison = (a.category_name || '').localeCompare(
                        b.category_name || '',
                        undefined,
                        { sensitivity: 'base' },
                    );
                    break;
                case 'priority_name':
                    comparison = (a.priority_name || '').localeCompare(
                        b.priority_name || '',
                        undefined,
                        { sensitivity: 'base' },
                    );
                    break;
                case 'internal_date': {
                    const dateA = a.internal_date
                        ? new Date(a.internal_date).getTime()
                        : 0;
                    const dateB = b.internal_date
                        ? new Date(b.internal_date).getTime()
                        : 0;
                    comparison = dateA - dateB;
                    break;
                }
                case 'assigned_to': {
                    const nameA = a.assigned_users?.[0]?.name || '';
                    const nameB = b.assigned_users?.[0]?.name || '';
                    comparison = nameA.localeCompare(nameB, undefined, {
                        sensitivity: 'base',
                    });
                    break;
                }
                default:
                    comparison = 0;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [filteredSpecimens, sortField, sortDirection]);

    // Adjust page to 1 during render when filters or page size change
    const [prevFiltersKey, setPrevFiltersKey] = useState('');
    const currentFiltersKey = `${search}|${selectedSpecimenTypeIds.join(',')}|${selectedExaminationIds.join(',')}|${selectedCategory}|${selectedPathologistId}|${sortField}|${sortDirection}|${pageSize}`;

    if (prevFiltersKey !== currentFiltersKey) {
        setPrevFiltersKey(currentFiltersKey);
        setCurrentPage(1);
    }

    // Pagination calculations
    const totalPages = Math.max(
        1,
        Math.ceil(sortedSpecimens.length / pageSize),
    );
    const paginatedSpecimens = useMemo(() => {
        const start = (currentPage - 1) * pageSize;

        return sortedSpecimens.slice(start, start + pageSize);
    }, [sortedSpecimens, currentPage, pageSize]);

    // Selection logic
    const isAllFilteredSelected = useMemo(() => {
        if (filteredSpecimens.length === 0) {
            return false;
        }

        return filteredSpecimens.every((s) => selectedIds.includes(s.id));
    }, [filteredSpecimens, selectedIds]);

    const isSomeFilteredSelected = useMemo(() => {
        return (
            filteredSpecimens.some((s) => selectedIds.includes(s.id)) &&
            !isAllFilteredSelected
        );
    }, [filteredSpecimens, selectedIds, isAllFilteredSelected]);

    const handleToggleSelectAll = () => {
        if (isAllFilteredSelected) {
            const filteredIdSet = new Set(filteredSpecimens.map((s) => s.id));
            setSelectedIds((prev) =>
                prev.filter((id) => !filteredIdSet.has(id)),
            );
        } else {
            const newIds = new Set([
                ...selectedIds,
                ...filteredSpecimens.map((s) => s.id),
            ]);
            setSelectedIds(Array.from(newIds));
        }
    };

    const handleToggleSelectOne = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
        );
    };

    const handleClearSelection = () => {
        setSelectedIds([]);
    };

    const selectedSpecimensList = useMemo(() => {
        const idSet = new Set(selectedIds);

        return specimens.filter((s) => idSet.has(s.id)).map(toSpecimenItem);
    }, [specimens, selectedIds]);

    return (
        <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
            {/* Filter Toolbar: unboxed, matching duration-settings-form.tsx line 549 */}
            <div className="flex w-full flex-wrap items-center gap-2 border-b px-6 py-3">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar por código, paciente, estudio..."
                        className="h-9 w-full bg-card pr-8 pl-9 text-xs"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Filtro de Tipo de Muestra (Popover Múltiple) */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'h-9 gap-2 border bg-card text-xs font-medium transition-colors hover:bg-accent/50',
                                isTypesFiltered &&
                                    'border-primary/50 text-primary',
                            )}
                        >
                            <Microscope className="h-4 w-4 text-muted-foreground" />
                            <span>
                                Tipos ({selectedSpecimenTypeIds.length})
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between border-b px-2 py-1 pb-1.5 text-xs text-muted-foreground">
                                <span>Filtrar por tipo</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const areAllTypesSelected =
                                            effectiveSpecimenTypes.length > 0 &&
                                            effectiveSpecimenTypes.every((t) =>
                                                selectedSpecimenTypeIds.includes(
                                                    t.id.toString(),
                                                ),
                                            );
                                        const nextTypes = areAllTypesSelected
                                            ? []
                                            : effectiveSpecimenTypes.map((t) =>
                                                  t.id.toString(),
                                              );

                                        handleSpecimenTypeSelectionChange(
                                            nextTypes,
                                        );
                                    }}
                                    className="cursor-pointer font-medium transition-colors hover:text-primary"
                                >
                                    {effectiveSpecimenTypes.length > 0 &&
                                    effectiveSpecimenTypes.every((t) =>
                                        selectedSpecimenTypeIds.includes(
                                            t.id.toString(),
                                        ),
                                    )
                                        ? 'Ninguno'
                                        : 'Todos'}
                                </button>
                            </div>
                            <div className="max-h-60 space-y-1 overflow-y-auto pt-1">
                                {effectiveSpecimenTypes.map((type) => {
                                    const isChecked =
                                        selectedSpecimenTypeIds.includes(
                                            type.id.toString(),
                                        );

                                    return (
                                        <div
                                            key={type.id}
                                            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none hover:bg-accent hover:text-accent-foreground"
                                            onClick={() => {
                                                const typeIdStr =
                                                    type.id.toString();
                                                const nextTypes = isChecked
                                                    ? selectedSpecimenTypeIds.filter(
                                                          (id) =>
                                                              id !== typeIdStr,
                                                      )
                                                    : [
                                                          ...selectedSpecimenTypeIds,
                                                          typeIdStr,
                                                      ];

                                                handleSpecimenTypeSelectionChange(
                                                    nextTypes,
                                                );
                                            }}
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                className="pointer-events-none"
                                                onCheckedChange={() => {}}
                                            />
                                            <span className="truncate">
                                                {type.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Filtro de Análisis/Examen (Popover Múltiple) */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'h-9 gap-2 border bg-card text-xs font-medium transition-colors hover:bg-accent/50',
                                isExamsFiltered &&
                                    'border-primary/50 text-primary',
                            )}
                        >
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>
                                Análisis ({selectedExaminationIds.length})
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between border-b px-2 py-1 pb-1.5 text-xs text-muted-foreground">
                                <span>Filtrar por análisis</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const areAllExamsSelected =
                                            filteredExaminationsForDropdown.length >
                                                0 &&
                                            filteredExaminationsForDropdown.every(
                                                (e) =>
                                                    selectedExaminationIds.includes(
                                                        e.id.toString(),
                                                    ),
                                            );
                                        const nextExams = areAllExamsSelected
                                            ? []
                                            : filteredExaminationsForDropdown.map(
                                                  (e) => e.id.toString(),
                                              );

                                        handleExaminationSelectionChange(
                                            nextExams,
                                        );
                                    }}
                                    className="cursor-pointer font-medium transition-colors hover:text-primary"
                                >
                                    {filteredExaminationsForDropdown.length >
                                        0 &&
                                    filteredExaminationsForDropdown.every((e) =>
                                        selectedExaminationIds.includes(
                                            e.id.toString(),
                                        ),
                                    )
                                        ? 'Ninguno'
                                        : 'Todos'}
                                </button>
                            </div>
                            <div className="max-h-60 space-y-1 overflow-y-auto pt-1">
                                {filteredExaminationsForDropdown.map((exam) => {
                                    const isChecked =
                                        selectedExaminationIds.includes(
                                            exam.id.toString(),
                                        );

                                    return (
                                        <div
                                            key={exam.id}
                                            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none hover:bg-accent hover:text-accent-foreground"
                                            onClick={() => {
                                                const examIdStr =
                                                    exam.id.toString();
                                                const nextExams = isChecked
                                                    ? selectedExaminationIds.filter(
                                                          (id) =>
                                                              id !== examIdStr,
                                                      )
                                                    : [
                                                          ...selectedExaminationIds,
                                                          examIdStr,
                                                      ];

                                                handleExaminationSelectionChange(
                                                    nextExams,
                                                );
                                            }}
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                className="pointer-events-none"
                                                onCheckedChange={() => {}}
                                            />
                                            <span className="truncate">
                                                {exam.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Filtro de Categoría (Popover Combobox) */}
                {effectiveCategories.length > 0 && (
                    <Popover
                        open={isCategoryFilterOpen}
                        onOpenChange={setIsCategoryFilterOpen}
                    >
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isCategoryFilterOpen}
                                className={cn(
                                    'h-9 justify-between gap-2 border bg-card text-xs font-medium transition-colors hover:bg-accent/50',
                                    isCategoryFiltered &&
                                        'border-primary/50 text-primary',
                                )}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate">
                                        {selectedCategoryLabel}
                                    </span>
                                </div>
                                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                            <Command
                                filter={(value, search) =>
                                    matchesSearch(value, search) ? 1 : 0
                                }
                            >
                                <CommandInput placeholder="Buscar categoría..." />
                                <CommandList>
                                    <CommandEmpty>
                                        No se encontraron categorías.
                                    </CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="todas las categorias"
                                            onSelect={() => {
                                                setSelectedCategory('all');
                                                setIsCategoryFilterOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    'mr-2 h-4 w-4',
                                                    selectedCategory === 'all'
                                                        ? 'opacity-100'
                                                        : 'opacity-0',
                                                )}
                                            />
                                            Todas las categorías
                                        </CommandItem>
                                        {effectiveCategories.map((cat) => (
                                            <CommandItem
                                                key={cat.id}
                                                value={cat.name}
                                                onSelect={() => {
                                                    setSelectedCategory(
                                                        cat.id.toString(),
                                                    );
                                                    setIsCategoryFilterOpen(
                                                        false,
                                                    );
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        'mr-2 h-4 w-4',
                                                        selectedCategory ===
                                                            cat.id.toString()
                                                            ? 'opacity-100'
                                                            : 'opacity-0',
                                                    )}
                                                />
                                                {cat.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                )}

                {/* Filtro de Patólogo (Popover Combobox) */}
                <Popover
                    open={isPathologistFilterOpen}
                    onOpenChange={setIsPathologistFilterOpen}
                >
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isPathologistFilterOpen}
                            className={cn(
                                'h-9 justify-between gap-2 border bg-card text-xs font-medium transition-colors hover:bg-accent/50',
                                isPathologistFiltered &&
                                    'border-primary/50 text-primary',
                            )}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate">
                                    {selectedPathologistLabel}
                                </span>
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0" align="start">
                        <Command
                            filter={(value, search) =>
                                matchesSearch(value, search) ? 1 : 0
                            }
                        >
                            <CommandInput placeholder="Buscar patólogo..." />
                            <CommandList>
                                <CommandEmpty>
                                    No se encontraron patólogos.
                                </CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        value="todos los patologos"
                                        onSelect={() => {
                                            setSelectedPathologistId('all');
                                            setIsPathologistFilterOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                selectedPathologistId === 'all'
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                        Todos los patólogos
                                    </CommandItem>
                                    <CommandItem
                                        value="sin asignar"
                                        onSelect={() => {
                                            setSelectedPathologistId(
                                                'unassigned',
                                            );
                                            setIsPathologistFilterOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                selectedPathologistId ===
                                                    'unassigned'
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                        <span className="font-medium text-amber-600 dark:text-amber-400">
                                            • Sin Asignar
                                        </span>
                                    </CommandItem>
                                    {effectivePathologists.map((p) => (
                                        <CommandItem
                                            key={p.id}
                                            value={p.name}
                                            onSelect={() => {
                                                setSelectedPathologistId(
                                                    p.id.toString(),
                                                );
                                                setIsPathologistFilterOpen(
                                                    false,
                                                );
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    'mr-2 h-4 w-4',
                                                    selectedPathologistId ===
                                                        p.id.toString()
                                                        ? 'opacity-100'
                                                        : 'opacity-0',
                                                )}
                                            />
                                            {p.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                {/* Botón Limpiar filtros */}
                {isFiltersActive && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-9 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Limpiar filtros</span>
                    </Button>
                )}

                {!loading && (
                    <Badge
                        variant="destructive"
                        className="ml-auto shrink-0 font-mono text-xs font-semibold"
                    >
                        {filteredSpecimens.length}{' '}
                        {filteredSpecimens.length === 1
                            ? 'vencida'
                            : 'vencidas'}
                    </Badge>
                )}
            </div>

            {/* Bulk Selection Bar */}
            {selectedIds.length > 0 && (
                <div className="flex animate-in items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/5 px-6 py-2.5 text-xs fade-in-50">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                            {selectedIds.length} seleccionada(s)
                        </span>
                        <span className="text-muted-foreground">
                            de {filteredSpecimens.length} filtradas
                        </span>
                        <span className="mx-1 text-muted-foreground/40">|</span>
                        <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={handleClearSelection}
                            className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                            Deseleccionar todas
                        </Button>
                        {!isAllFilteredSelected && (
                            <>
                                <span className="mx-1 text-muted-foreground/40">
                                    |
                                </span>
                                <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    onClick={handleToggleSelectAll}
                                    className="h-auto p-0 text-xs font-semibold text-destructive hover:underline"
                                >
                                    Seleccionar todas (
                                    {filteredSpecimens.length})
                                </Button>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {canManage && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        size="sm"
                                        className="h-7.5 gap-1.5 px-3 text-xs shadow-xs"
                                    >
                                        <span>Acciones en Lote</span>
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-52"
                                >
                                    <DropdownMenuLabel className="text-xs">
                                        Acción para {selectedIds.length}{' '}
                                        muestra(s)
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => {
                                            if (onBulkAction) {
                                                onBulkAction(
                                                    'move_date',
                                                    selectedSpecimensList,
                                                );
                                            }
                                        }}
                                        className="cursor-pointer text-xs"
                                    >
                                        <Calendar className="mr-2 h-4 w-4 text-primary" />
                                        <span>Mover a Fecha</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                        onClick={() => {
                                            if (onBulkAction) {
                                                onBulkAction(
                                                    'assign_pathologist',
                                                    selectedSpecimensList,
                                                );
                                            }
                                        }}
                                        className="cursor-pointer text-xs"
                                    >
                                        <UserPlus className="mr-2 h-4 w-4 text-primary" />
                                        <span>Asignar a Patólogo</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            )}

            {/* Table Container */}
            <div className="flex-1 overflow-auto px-6 py-4">
                {loading ? (
                    <div className="space-y-2">
                        <div className="flex h-10 items-center justify-between rounded-md border bg-muted/30 px-4">
                            <Skeleton className="h-4 w-6 rounded" />
                            <Skeleton className="h-4 w-36 rounded" />
                            <Skeleton className="h-4 w-32 rounded" />
                            <Skeleton className="h-4 w-28 rounded" />
                            <Skeleton className="h-4 w-20 rounded" />
                            <Skeleton className="h-4 w-24 rounded" />
                        </div>
                        {[1, 2, 3, 4, 5, 6, 7].map((idx) => (
                            <div
                                key={idx}
                                className="flex h-12 items-center justify-between rounded-md border bg-card px-4"
                            >
                                <Skeleton className="h-4 w-4 rounded" />
                                <Skeleton className="h-4 w-36 rounded" />
                                <Skeleton className="h-4 w-40 rounded" />
                                <Skeleton className="h-4 w-32 rounded" />
                                <Skeleton className="h-4 w-24 rounded" />
                                <Skeleton className="h-7 w-20 rounded-md" />
                            </div>
                        ))}
                    </div>
                ) : filteredSpecimens.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                        <Clock className="mb-2 h-10 w-10 text-emerald-500/40" />
                        <p className="text-sm font-medium">
                            {isFiltersActive
                                ? 'No se encontraron muestras vencidas que coincidan con los filtros aplicados.'
                                : '¡Excelente! No hay muestras vencidas en este momento.'}
                        </p>
                        {isFiltersActive && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearFilters}
                                className="mt-3 text-xs"
                            >
                                Restablecer filtros
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="rounded-lg border bg-card shadow-2xs">
                        <Table className="text-xs">
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-10 text-center">
                                        <Checkbox
                                            checked={
                                                isAllFilteredSelected ||
                                                (isSomeFilteredSelected
                                                    ? 'indeterminate'
                                                    : false)
                                            }
                                            onCheckedChange={
                                                handleToggleSelectAll
                                            }
                                            aria-label="Seleccionar todas"
                                        />
                                    </TableHead>
                                    <TableHead className="w-36 min-w-[140px] whitespace-nowrap">
                                        {renderSortHeader(
                                            'sequence_code',
                                            'Código',
                                        )}
                                    </TableHead>
                                    <TableHead className="min-w-[160px]">
                                        {renderSortHeader(
                                            'customer_name',
                                            'Paciente',
                                        )}
                                    </TableHead>
                                    <TableHead className="min-w-[180px]">
                                        {renderSortHeader(
                                            'examination_name',
                                            'Estudio / Examen',
                                        )}
                                    </TableHead>
                                    <TableHead className="w-28 whitespace-nowrap">
                                        {renderSortHeader(
                                            'category_name',
                                            'Categoría',
                                        )}
                                    </TableHead>
                                    <TableHead className="w-24 whitespace-nowrap">
                                        {renderSortHeader(
                                            'priority_name',
                                            'Prioridad',
                                        )}
                                    </TableHead>
                                    <TableHead className="w-40 whitespace-nowrap">
                                        {renderSortHeader(
                                            'internal_date',
                                            'Fecha Vencimiento',
                                        )}
                                    </TableHead>
                                    <TableHead className="min-w-[140px]">
                                        {renderSortHeader(
                                            'assigned_to',
                                            'Asignado a',
                                        )}
                                    </TableHead>
                                    <TableHead className="w-28 text-right font-semibold whitespace-nowrap">
                                        Acción
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedSpecimens.map((item) => {
                                    const isSelected = selectedIds.includes(
                                        item.id,
                                    );

                                    return (
                                        <TableRow
                                            key={item.id}
                                            data-state={
                                                isSelected
                                                    ? 'selected'
                                                    : undefined
                                            }
                                            className={`transition-colors ${
                                                isSelected
                                                    ? 'bg-destructive/10 hover:bg-destructive/15'
                                                    : 'hover:bg-muted/40'
                                            }`}
                                        >
                                            {/* Checkbox */}
                                            <TableCell className="w-10 text-center">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() =>
                                                        handleToggleSelectOne(
                                                            item.id,
                                                        )
                                                    }
                                                    aria-label={`Seleccionar muestra ${item.sequence_code}`}
                                                />
                                            </TableCell>

                                            {/* Código */}
                                            <TableCell className="w-36 min-w-[140px] font-mono font-bold whitespace-nowrap text-destructive">
                                                {item.sequence_code}
                                            </TableCell>

                                            {/* Paciente */}
                                            <TableCell className="font-medium text-foreground">
                                                <span className="truncate">
                                                    {item.customer_name}
                                                </span>
                                            </TableCell>

                                            {/* Estudio con viñeta de color */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <span
                                                        className="h-2 w-2 shrink-0 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                item.examination_color,
                                                        }}
                                                    />
                                                    <span
                                                        className="max-w-[200px] truncate font-medium"
                                                        title={
                                                            item.examination_name
                                                        }
                                                    >
                                                        {item.examination_name}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Categoría */}
                                            <TableCell className="text-muted-foreground">
                                                {item.category_name || (
                                                    <span className="text-muted-foreground/40">
                                                        -
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Prioridad */}
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] font-bold uppercase"
                                                >
                                                    {item.priority_name}
                                                </Badge>
                                            </TableCell>

                                            {/* Vencimiento */}
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1 font-mono text-[11px] text-destructive">
                                                        <Clock className="h-3 w-3" />
                                                        <span>
                                                            {item.internal_date}
                                                        </span>
                                                    </div>
                                                    {item.overdue_label && (
                                                        <Badge
                                                            variant="destructive"
                                                            className="w-fit px-1.5 py-0 text-[9px] font-bold uppercase"
                                                        >
                                                            {item.overdue_label}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Asignado a */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <User className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                    <span className="max-w-[130px] truncate font-medium text-foreground">
                                                        {item.assigned_users &&
                                                        item.assigned_users
                                                            .length > 0
                                                            ? item.assigned_users
                                                                  .map(
                                                                      (u) =>
                                                                          u.name,
                                                                  )
                                                                  .join(', ')
                                                            : 'Sin asignar'}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Acción: Reprogramar */}
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() =>
                                                        onReprogramSpecimen(
                                                            toSpecimenItem(
                                                                item,
                                                            ),
                                                        )
                                                    }
                                                    className="h-7.5 gap-1.5 px-2.5 text-xs font-medium shadow-xs"
                                                    title="Reprogramar fecha de entrega o reasignar patólogo"
                                                >
                                                    <CalendarDays className="h-3.5 w-3.5" />
                                                    <span>Reprogramar</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Pagination Footer */}
            {!loading && filteredSpecimens.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-background px-6 py-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <span>
                            Mostrando{' '}
                            <strong className="text-foreground">
                                {(currentPage - 1) * pageSize + 1}
                            </strong>{' '}
                            -{' '}
                            <strong className="text-foreground">
                                {Math.min(
                                    currentPage * pageSize,
                                    filteredSpecimens.length,
                                )}
                            </strong>{' '}
                            de{' '}
                            <strong className="text-foreground">
                                {filteredSpecimens.length}
                            </strong>{' '}
                            muestras
                        </span>

                        <span className="mx-1 text-muted-foreground/40">•</span>

                        <div className="flex items-center gap-1.5">
                            <span>Filas:</span>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(val) =>
                                    setPageSize(Number(val))
                                }
                            >
                                <SelectTrigger className="h-7 w-[68px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                            Página {currentPage} de {totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setCurrentPage((prev) =>
                                        Math.max(1, prev - 1),
                                    )
                                }
                                disabled={currentPage === 1}
                                className="h-7.5 w-7.5 p-0"
                                title="Página anterior"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setCurrentPage((prev) =>
                                        Math.min(totalPages, prev + 1),
                                    )
                                }
                                disabled={currentPage >= totalPages}
                                className="h-7.5 w-7.5 p-0"
                                title="Página siguiente"
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpiredSpecimensContent;
