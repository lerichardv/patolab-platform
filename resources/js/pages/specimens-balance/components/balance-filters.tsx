import {
    Check,
    ChevronDown,
    FileText,
    Microscope,
    RotateCcw,
    Search,
    UserCheck,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn, matchesSearch } from '@/lib/utils';
import type { BalanceFilters, FilterOptions } from '../types';

interface BalanceFiltersProps {
    filters: BalanceFilters;
    filterOptions: FilterOptions;
    pathologists: { id: number; name: string }[];
    showUnassigned: boolean;
    unassignedCount: number;
    onToggleUnassigned: (show: boolean) => void;
    onFilterChange: (key: keyof BalanceFilters, value: any) => void;
    onTypesAndExaminationsChange: (typeParam: any, examParam: any) => void;
    onResetFilters: () => void;
}

export const BalanceFiltersBar: React.FC<BalanceFiltersProps> = ({
    filters,
    filterOptions,
    pathologists,
    showUnassigned,
    unassignedCount,
    onToggleUnassigned,
    onFilterChange,
    onTypesAndExaminationsChange,
    onResetFilters,
}) => {
    // Track previous filters to adjust local state during render without useEffect
    const [prevFilters, setPrevFilters] = useState(filters);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    const parseInitialIds = (rawFilter: any, allItems: any[]) => {
        if (rawFilter === 'none') {
            return [];
        }

        if (!rawFilter || rawFilter === 'all') {
            return allItems.map((item) => item.id.toString());
        }

        if (Array.isArray(rawFilter)) {
            return rawFilter.map((id) => id.toString());
        }

        return [rawFilter.toString()];
    };

    const [selectedSpecimenTypeIds, setSelectedSpecimenTypeIds] = useState<
        string[]
    >(() =>
        parseInitialIds(filters.specimen_type_id, filterOptions.specimenTypes),
    );

    const [selectedExaminationIds, setSelectedExaminationIds] = useState<
        string[]
    >(() =>
        parseInitialIds(filters.examination_id, filterOptions.examinations),
    );

    if (prevFilters !== filters) {
        setPrevFilters(filters);
        setSearchQuery(filters.search || '');
        setSelectedSpecimenTypeIds(
            parseInitialIds(
                filters.specimen_type_id,
                filterOptions.specimenTypes,
            ),
        );
        setSelectedExaminationIds(
            parseInitialIds(filters.examination_id, filterOptions.examinations),
        );
    }

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        onFilterChange('search', value);
    };

    const getSpecimenTypeId = (exam: any): string | null => {
        const typeId =
            exam.specimen_type || exam.specimen_type_id || exam.type?.id;

        return typeId ? typeId.toString() : null;
    };

    const filteredExaminationsForDropdown = useMemo(() => {
        if (
            selectedSpecimenTypeIds.length ===
            filterOptions.specimenTypes.length
        ) {
            return filterOptions.examinations;
        }

        return filterOptions.examinations.filter((exam) => {
            const typeId = getSpecimenTypeId(exam);

            return typeId && selectedSpecimenTypeIds.includes(typeId);
        });
    }, [
        selectedSpecimenTypeIds,
        filterOptions.specimenTypes,
        filterOptions.examinations,
    ]);

    const handleSpecimenTypeSelectionChange = (nextTypeIds: string[]) => {
        setSelectedSpecimenTypeIds(nextTypeIds);

        let nextExamIds: string[];

        if (nextTypeIds.length === filterOptions.specimenTypes.length) {
            nextExamIds = filterOptions.examinations.map((e) =>
                e.id.toString(),
            );
        } else if (nextTypeIds.length === 0) {
            nextExamIds = [];
        } else {
            const addedTypeIds = nextTypeIds.filter(
                (id) => !selectedSpecimenTypeIds.includes(id),
            );

            const validExamsForNextTypes = filterOptions.examinations.filter(
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
                const addedExamIds = filterOptions.examinations
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

        const typeParam =
            nextTypeIds.length === filterOptions.specimenTypes.length
                ? 'all'
                : nextTypeIds.length === 0
                  ? 'none'
                  : nextTypeIds;

        const examParam =
            nextExamIds.length === filterOptions.examinations.length
                ? 'all'
                : nextExamIds.length === 0
                  ? 'none'
                  : nextExamIds;

        onTypesAndExaminationsChange(typeParam, examParam);
    };

    const handleExaminationSelectionChange = (nextExamIds: string[]) => {
        setSelectedExaminationIds(nextExamIds);

        const typeParam =
            selectedSpecimenTypeIds.length ===
            filterOptions.specimenTypes.length
                ? 'all'
                : selectedSpecimenTypeIds.length === 0
                  ? 'none'
                  : selectedSpecimenTypeIds;

        const examParam =
            nextExamIds.length === filterOptions.examinations.length
                ? 'all'
                : nextExamIds.length === 0
                  ? 'none'
                  : nextExamIds;

        onTypesAndExaminationsChange(typeParam, examParam);
    };

    // 3. Pathologist Popover state
    const [isPathologistFilterOpen, setIsPathologistFilterOpen] =
        useState(false);

    const selectedPathologistLabel = useMemo(() => {
        if (!filters.pathologist_id || filters.pathologist_id === 'all') {
            return 'Todos los patólogos';
        }

        if (filters.pathologist_id === 'unassigned') {
            return 'Sin Asignar';
        }

        const p = pathologists.find(
            (p) => p.id.toString() === filters.pathologist_id?.toString(),
        );

        return p ? p.name : 'Patólogo';
    }, [filters.pathologist_id, pathologists]);

    // Active filters indicator
    const isTypesFiltered =
        selectedSpecimenTypeIds.length !== filterOptions.specimenTypes.length;
    const isExamsFiltered =
        selectedExaminationIds.length !== filterOptions.examinations.length;
    const isPathologistFiltered = Boolean(
        filters.pathologist_id && filters.pathologist_id !== 'all',
    );
    const isSearchFiltered = Boolean(filters.search);

    const hasActiveFilters =
        isTypesFiltered ||
        isExamsFiltered ||
        isPathologistFiltered ||
        isSearchFiltered;

    return (
        <div className="flex w-full flex-wrap items-center gap-2">
            {/* Buscador */}
            <div className="relative w-full shrink-0 sm:w-72">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Buscar por código, cliente o RTN..."
                    className="h-10 w-full bg-card pl-9 text-sm"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                />
            </div>

            {/* Filtro de Tipo de Muestra (Popover Múltiple) */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="h-10 gap-2 border bg-card text-sm font-medium transition-colors hover:bg-accent/50"
                    >
                        <Microscope className="h-4 w-4 text-muted-foreground" />
                        <span>Tipos ({selectedSpecimenTypeIds.length})</span>
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
                                        filterOptions.specimenTypes.length >
                                            0 &&
                                        filterOptions.specimenTypes.every((t) =>
                                            selectedSpecimenTypeIds.includes(
                                                t.id.toString(),
                                            ),
                                        );
                                    const nextTypes = areAllTypesSelected
                                        ? []
                                        : filterOptions.specimenTypes.map((t) =>
                                              t.id.toString(),
                                          );

                                    handleSpecimenTypeSelectionChange(
                                        nextTypes,
                                    );
                                }}
                                className="cursor-pointer font-medium transition-colors hover:text-primary"
                            >
                                {filterOptions.specimenTypes.length > 0 &&
                                filterOptions.specimenTypes.every((t) =>
                                    selectedSpecimenTypeIds.includes(
                                        t.id.toString(),
                                    ),
                                )
                                    ? 'Ninguno'
                                    : 'Todos'}
                            </button>
                        </div>
                        <div className="max-h-60 space-y-1 overflow-y-auto pt-1">
                            {filterOptions.specimenTypes.map((type) => {
                                const isChecked =
                                    selectedSpecimenTypeIds.includes(
                                        type.id.toString(),
                                    );

                                return (
                                    <div
                                        key={type.id}
                                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none hover:bg-accent hover:text-accent-foreground"
                                        onClick={() => {
                                            const typeIdStr =
                                                type.id.toString();
                                            const nextTypes = isChecked
                                                ? selectedSpecimenTypeIds.filter(
                                                      (id) => id !== typeIdStr,
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
                        className="h-10 gap-2 border bg-card text-sm font-medium transition-colors hover:bg-accent/50"
                    >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>Análisis ({selectedExaminationIds.length})</span>
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

                                    handleExaminationSelectionChange(nextExams);
                                }}
                                className="cursor-pointer font-medium transition-colors hover:text-primary"
                            >
                                {filteredExaminationsForDropdown.length > 0 &&
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
                                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none hover:bg-accent hover:text-accent-foreground"
                                        onClick={() => {
                                            const examIdStr =
                                                exam.id.toString();
                                            const nextExams = isChecked
                                                ? selectedExaminationIds.filter(
                                                      (id) => id !== examIdStr,
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

            {/* Filtro de Patólogo (Combobox con Búsqueda) */}
            <Popover
                open={isPathologistFilterOpen}
                onOpenChange={setIsPathologistFilterOpen}
            >
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isPathologistFilterOpen}
                        className="h-10 justify-between gap-2 border bg-card text-sm font-medium transition-colors hover:bg-accent/50"
                    >
                        <div className="flex items-center gap-2 truncate">
                            <UserCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="max-w-[150px] truncate">
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
                                    value="todos"
                                    onSelect={() => {
                                        onFilterChange('pathologist_id', 'all');
                                        setIsPathologistFilterOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            !filters.pathologist_id ||
                                                filters.pathologist_id === 'all'
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    Todos los patólogos
                                </CommandItem>
                                <CommandItem
                                    value="sin asignar"
                                    onSelect={() => {
                                        onFilterChange(
                                            'pathologist_id',
                                            'unassigned',
                                        );
                                        setIsPathologistFilterOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            filters.pathologist_id ===
                                                'unassigned'
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className="font-medium text-amber-600 dark:text-amber-400">
                                        • Sin Asignar
                                    </span>
                                </CommandItem>
                                {pathologists.map((p) => (
                                    <CommandItem
                                        key={p.id}
                                        value={p.name}
                                        onSelect={() => {
                                            onFilterChange(
                                                'pathologist_id',
                                                p.id.toString(),
                                            );
                                            setIsPathologistFilterOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                filters.pathologist_id ===
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

            {/* Switch Mostrar Sin Asignar */}
            <div
                className="flex h-10 w-full shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border bg-card px-3 transition-colors select-none hover:bg-accent/50 sm:w-auto sm:justify-start"
                onClick={() => onToggleUnassigned(!showUnassigned)}
            >
                <span className="text-sm font-medium">
                    Sin Asignar
                    {unassignedCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            {unassignedCount}
                        </span>
                    )}
                </span>
                <Switch
                    checked={showUnassigned}
                    onCheckedChange={onToggleUnassigned}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            {/* Limpiar filtros */}
            {hasActiveFilters && (
                <Button
                    variant="outline"
                    className="h-10 gap-2 border bg-card px-4 text-sm transition-colors hover:bg-accent/50"
                    onClick={onResetFilters}
                >
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    <span>Limpiar filtros</span>
                </Button>
            )}
        </div>
    );
};
