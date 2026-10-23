import { router, usePage } from '@inertiajs/react';
import {
    Check,
    CheckCheck,
    ChevronDown,
    Clock,
    FileText,
    Microscope,
    RotateCcw,
    Save,
    Search,
    Tag,
    X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { saveDurations as saveDurationsAction } from '@/actions/App/Http/Controllers/SpecimenBalanceController';
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
import { Input } from '@/components/ui/input';
import { NumberPicker } from '@/components/ui/number-picker';
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
import { SheetFooter } from '@/components/ui/sheet';
import { cn, matchesSearch } from '@/lib/utils';
import type { ExaminationOption, FilterOptions } from '../types';

export type DurationUnit = 'minutes' | 'hours' | 'days';

export interface PresetDuration {
    label: string;
    minutes: number;
    value: number;
    unit: DurationUnit;
}

export const PRESET_DURATIONS: PresetDuration[] = [
    { label: '15m', minutes: 15, value: 15, unit: 'minutes' },
    { label: '30m', minutes: 30, value: 30, unit: 'minutes' },
    { label: '45m', minutes: 45, value: 45, unit: 'minutes' },
    { label: '1h', minutes: 60, value: 1, unit: 'hours' },
    { label: '2h', minutes: 120, value: 2, unit: 'hours' },
    { label: '4h', minutes: 240, value: 4, unit: 'hours' },
    { label: '1d', minutes: 1440, value: 1, unit: 'days' },
    { label: '2d', minutes: 2880, value: 2, unit: 'days' },
    { label: '3d', minutes: 4320, value: 3, unit: 'days' },
];

export const UNIT_CONFIG: Record<
    DurationUnit,
    {
        label: string;
        short: string;
        multiplier: number;
        step: number;
        min: number;
        max: number;
    }
> = {
    minutes: {
        label: 'Minutos',
        short: 'min',
        multiplier: 1,
        step: 5,
        min: 1,
        max: 43200,
    },
    hours: {
        label: 'Horas',
        short: 'hrs',
        multiplier: 60,
        step: 1,
        min: 1,
        max: 720,
    },
    days: {
        label: 'Días',
        short: 'días',
        multiplier: 1440,
        step: 1,
        min: 1,
        max: 30,
    },
};

function calculateMinutes(value: number, unit: DurationUnit): number {
    const mult = UNIT_CONFIG[unit].multiplier;
    const mins = Math.round(value * mult);

    return Math.max(1, Math.min(43200, mins));
}

function resolveUnitAndValue(
    totalMinutes: number,
    preferredUnit?: DurationUnit,
): { unit: DurationUnit; value: number } {
    let unit = preferredUnit;

    if (!unit) {
        if (totalMinutes >= 1440 && totalMinutes % 1440 === 0) {
            unit = 'days';
        } else if (totalMinutes >= 60 && totalMinutes % 60 === 0) {
            unit = 'hours';
        } else {
            unit = 'minutes';
        }
    }

    const mult = UNIT_CONFIG[unit].multiplier;
    const rawVal = totalMinutes / mult;
    const value = Math.round(rawVal * 100) / 100;

    return { unit, value };
}

interface DurationSettingsFormProps {
    onClose: () => void;
    pathologists?: { id: number; name: string; email?: string }[];
    currentUserId?: number;
    canManage?: boolean;
    filterOptions?: FilterOptions;
    durationsMap?: Record<number, Record<number, number>>;
}

export const DurationSettingsForm: React.FC<DurationSettingsFormProps> = ({
    onClose,
    pathologists: propPathologists,
    currentUserId: propCurrentUserId,
    canManage: propCanManage,
    filterOptions: propFilterOptions,
    durationsMap: propDurationsMap,
}) => {
    const pageProps = usePage<{
        auth?: { user?: { id: number }; permissions?: string[] };
        pathologists?: { id: number; name: string; email: string }[];
        filterOptions?: FilterOptions;
        durationsMap?: Record<number, Record<number, number>>;
    }>().props;

    const pathologists: { id: number; name: string; email?: string }[] =
        propPathologists || pageProps.pathologists || [];
    const currentUserId: number =
        propCurrentUserId !== undefined
            ? propCurrentUserId
            : pageProps.auth?.user?.id || 0;
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
    const durationsMap: Record<
        number,
        Record<number, number>
    > = propDurationsMap || pageProps.durationsMap || {};

    // Selected pathologist for durations (defaults to current user if pathologist, else first pathologist)
    const [selectedPathologistId, setSelectedPathologistId] = useState<number>(
        () => {
            const hasCurrentUser = pathologists.some(
                (p: any) => p.id === currentUserId,
            );

            return hasCurrentUser
                ? currentUserId
                : pathologists[0]?.id || currentUserId;
        },
    );

    // Popover states for filters
    const [isPathologistFilterOpen, setIsPathologistFilterOpen] =
        useState(false);
    const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);

    // Filters matching balance-filters.tsx
    const [selectedSpecimenTypeIds, setSelectedSpecimenTypeIds] = useState<
        string[]
    >(() => filterOptions.specimenTypes.map((t) => t.id.toString()));
    const [selectedExaminationIds, setSelectedExaminationIds] = useState<
        string[]
    >(() => filterOptions.examinations.map((e) => e.id.toString()));
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [search, setSearch] = useState('');

    // Bulk selection state
    const [selectedExamIds, setSelectedExamIds] = useState<number[]>([]);
    const [bulkValue, setBulkValue] = useState<number>(30);
    const [bulkUnit, setBulkUnit] = useState<DurationUnit>('minutes');

    const [isSaving, setIsSaving] = useState(false);

    // Overrides for durations: [ examId => duration_minutes ]
    const [customDurations, setCustomDurations] = useState<
        Record<number, number>
    >({});
    // Overrides for preferred units: [ examId => unit ]
    const [examUnits, setExamUnits] = useState<Record<number, DurationUnit>>(
        {},
    );
    // Overrides for exam colors: [ examId => hexColor ]
    const [customColors, setCustomColors] = useState<Record<number, string>>(
        {},
    );

    // Tracking unsaved changes across custom durations and colors
    const modifiedExamCount = useMemo(() => {
        const ids = new Set([
            ...Object.keys(customDurations).map(Number),
            ...Object.keys(customColors).map(Number),
        ]);

        return ids.size;
    }, [customDurations, customColors]);

    const hasChanges = modifiedExamCount > 0;

    const handleDiscardChanges = () => {
        setCustomDurations({});
        setCustomColors({});
        setExamUnits({});
        toast.info('Se descartaron los cambios no guardados');
    };

    const handleExamUnitChange = (examId: number, nextUnit: DurationUnit) => {
        const pathDurations = durationsMap[selectedPathologistId] || {};
        const curMins = customDurations[examId] ?? pathDurations[examId] ?? 30;

        let nextValue: number;

        if (nextUnit === 'days') {
            nextValue =
                curMins >= 1440 ? Math.round((curMins / 1440) * 10) / 10 : 1;
        } else if (nextUnit === 'hours') {
            nextValue =
                curMins >= 60
                    ? Math.round((curMins / 60) * 10) / 10
                    : curMins === 30
                      ? 0.5
                      : 1;
        } else {
            nextValue = curMins <= 43200 ? curMins : 60;
        }

        const nextMins = calculateMinutes(nextValue, nextUnit);
        setExamUnits((prev) => ({ ...prev, [examId]: nextUnit }));
        setCustomDurations((prev) => ({ ...prev, [examId]: nextMins }));
    };

    const handleExamPresetClick = (examId: number, preset: PresetDuration) => {
        setExamUnits((prev) => ({ ...prev, [examId]: preset.unit }));
        setCustomDurations((prev) => ({
            ...prev,
            [examId]: preset.minutes,
        }));
    };

    const handleColorChange = (examId: number, color: string) => {
        setCustomColors((prev) => ({
            ...prev,
            [examId]: color,
        }));
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
    };

    const handleExaminationSelectionChange = (nextExamIds: string[]) => {
        setSelectedExaminationIds(nextExamIds);
    };

    const isTypesFiltered =
        selectedSpecimenTypeIds.length !== filterOptions.specimenTypes.length;
    const isExamsFiltered =
        selectedExaminationIds.length !== filterOptions.examinations.length;
    const isCategoryFiltered = selectedCategory !== 'all';
    const isSearchFiltered = Boolean(search.trim());

    const isFiltered =
        isTypesFiltered ||
        isExamsFiltered ||
        isCategoryFiltered ||
        isSearchFiltered;

    const handleResetFilters = () => {
        setSelectedSpecimenTypeIds(
            filterOptions.specimenTypes.map((t) => t.id.toString()),
        );
        setSelectedExaminationIds(
            filterOptions.examinations.map((e) => e.id.toString()),
        );
        setSelectedCategory('all');
        setSearch('');
    };

    const selectedCategoryLabel = useMemo(() => {
        if (selectedCategory === 'all') {
            return 'Todas las categorías';
        }

        const c = filterOptions.categories.find(
            (cat) => cat.id.toString() === selectedCategory,
        );

        return c ? c.name : 'Categoría';
    }, [selectedCategory, filterOptions.categories]);

    // Filter examinations by specimen type, examinations, category, and search query
    const filteredExaminations = useMemo(() => {
        const searchLower = search.toLowerCase().trim();

        return filterOptions.examinations.filter((exam) => {
            const typeIdStr = getSpecimenTypeId(exam);

            // Specimen Type filter
            if (typeIdStr && !selectedSpecimenTypeIds.includes(typeIdStr)) {
                return false;
            }

            // Examination filter
            if (!selectedExaminationIds.includes(exam.id.toString())) {
                return false;
            }

            // Category filter
            if (selectedCategory !== 'all') {
                const catId = parseInt(selectedCategory);
                const examCatIds = exam.category_ids || [];

                if (!examCatIds.includes(catId)) {
                    return false;
                }
            }

            // Search filter (by name or specimen type name)
            if (searchLower) {
                const matchesName = exam.name
                    .toLowerCase()
                    .includes(searchLower);
                const matchesType = exam.type?.name
                    ?.toLowerCase()
                    .includes(searchLower);

                if (!matchesName && !matchesType) {
                    return false;
                }
            }

            return true;
        });
    }, [
        filterOptions.examinations,
        selectedSpecimenTypeIds,
        selectedExaminationIds,
        selectedCategory,
        search,
    ]);

    // Group filtered examinations by Specimen Type
    const groupedExaminations = useMemo(() => {
        const groups: Record<
            number,
            { typeName: string; exams: ExaminationOption[] }
        > = {};

        filterOptions.specimenTypes.forEach((type) => {
            groups[type.id] = { typeName: type.name, exams: [] };
        });

        filteredExaminations.forEach((exam) => {
            if (!groups[exam.specimen_type]) {
                groups[exam.specimen_type] = {
                    typeName: exam.type?.name || 'Otro',
                    exams: [],
                };
            }

            groups[exam.specimen_type].exams.push(exam);
        });

        return Object.entries(groups).filter(
            ([, group]) => group.exams.length > 0,
        );
    }, [filterOptions.specimenTypes, filteredExaminations]);

    // Selection helpers for visible examinations
    const allVisibleExamIds = useMemo(
        () => filteredExaminations.map((e) => e.id),
        [filteredExaminations],
    );

    const isAllVisibleSelected =
        allVisibleExamIds.length > 0 &&
        allVisibleExamIds.every((id) => selectedExamIds.includes(id));

    const isSomeVisibleSelected =
        allVisibleExamIds.some((id) => selectedExamIds.includes(id)) &&
        !isAllVisibleSelected;

    const handleToggleSelectAllVisible = () => {
        if (isAllVisibleSelected) {
            // Deselect visible
            setSelectedExamIds((prev) =>
                prev.filter((id) => !allVisibleExamIds.includes(id)),
            );
        } else {
            // Select all visible
            setSelectedExamIds((prev) =>
                Array.from(new Set([...prev, ...allVisibleExamIds])),
            );
        }
    };

    const handleSelectAllVisible = () => {
        setSelectedExamIds((prev) =>
            Array.from(new Set([...prev, ...allVisibleExamIds])),
        );
    };

    const handleUnselectAll = () => {
        setSelectedExamIds([]);
    };

    const handleToggleExam = (examId: number) => {
        setSelectedExamIds((prev) =>
            prev.includes(examId)
                ? prev.filter((id) => id !== examId)
                : [...prev, examId],
        );
    };

    const handleSelectGroup = (examIds: number[]) => {
        setSelectedExamIds((prev) =>
            Array.from(new Set([...prev, ...examIds])),
        );
    };

    // Bulk apply duration to all selected examinations
    const handleApplyBulkDuration = () => {
        if (selectedExamIds.length === 0) {
            toast.error('Seleccione al menos un examen');

            return;
        }

        if (bulkValue <= 0) {
            toast.error('Ingrese un valor de duración válido');

            return;
        }

        const totalMinutes = calculateMinutes(bulkValue, bulkUnit);

        setCustomDurations((prev) => {
            const next = { ...prev };
            selectedExamIds.forEach((id) => {
                next[id] = totalMinutes;
            });

            return next;
        });

        setExamUnits((prev) => {
            const next = { ...prev };
            selectedExamIds.forEach((id) => {
                next[id] = bulkUnit;
            });

            return next;
        });

        const unitShort = UNIT_CONFIG[bulkUnit].short;
        toast.success(
            `Se aplicaron ${bulkValue} ${unitShort} (${totalMinutes} min) a ${selectedExamIds.length} exámenes seleccionados`,
        );
    };

    const handleSave = () => {
        setIsSaving(true);

        const pathDurations = durationsMap[selectedPathologistId] || {};
        const payloadDurations = filterOptions.examinations.map((exam) => ({
            specimen_type_examination_id: exam.id,
            duration_minutes:
                customDurations[exam.id] ?? pathDurations[exam.id] ?? 30,
            color: customColors[exam.id] ?? exam.color ?? '#3b82f6',
        }));

        router.post(
            saveDurationsAction().url,
            {
                user_id: selectedPathologistId,
                durations: payloadDurations,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                    toast.success(
                        'Configuración de tiempos guardada correctamente',
                    );
                    onClose();
                },
                onError: (errors) => {
                    setIsSaving(false);
                    const msg =
                        Object.values(errors)[0] ||
                        'Ocurrió un error al guardar';
                    toast.error(String(msg));
                },
            },
        );
    };

    const currentPathologist = pathologists.find(
        (p) => p.id === selectedPathologistId,
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                {/* Pathologist selector - unboxed style matching specimens page */}
                {canManage && pathologists.length > 1 ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">
                            Patólogo:
                        </span>
                        <Popover
                            open={isPathologistFilterOpen}
                            onOpenChange={setIsPathologistFilterOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isPathologistFilterOpen}
                                    className="h-9 w-full justify-between gap-2 border bg-card text-xs font-medium transition-colors hover:bg-accent/50 sm:w-[260px]"
                                >
                                    <span className="truncate">
                                        {currentPathologist?.name ||
                                            'Seleccione patólogo'}
                                    </span>
                                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-[260px] p-0"
                                align="start"
                            >
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
                                            {pathologists.map((p) => (
                                                <CommandItem
                                                    key={p.id}
                                                    value={p.name}
                                                    onSelect={() => {
                                                        setSelectedPathologistId(
                                                            p.id,
                                                        );
                                                        setCustomDurations({});
                                                        setCustomColors({});
                                                        setExamUnits({});
                                                        setSelectedExamIds([]);
                                                        setIsPathologistFilterOpen(
                                                            false,
                                                        );
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            selectedPathologistId ===
                                                                p.id
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
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-foreground">
                            Patólogo:
                        </span>
                        <span className="text-muted-foreground">
                            {currentPathologist?.name || 'Usuario Actual'}
                        </span>
                    </div>
                )}

                {/* Filters Bar: Unboxed without wrapper, using specimens/index.tsx components */}
                <div className="flex w-full flex-wrap items-center gap-2">
                    {/* Buscador de Examen */}
                    <div className="relative w-full shrink-0 sm:w-64">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Buscar examen o tipo..."
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
                                                filterOptions.specimenTypes
                                                    .length > 0 &&
                                                filterOptions.specimenTypes.every(
                                                    (t) =>
                                                        selectedSpecimenTypeIds.includes(
                                                            t.id.toString(),
                                                        ),
                                                );
                                            const nextTypes =
                                                areAllTypesSelected
                                                    ? []
                                                    : filterOptions.specimenTypes.map(
                                                          (t) =>
                                                              t.id.toString(),
                                                      );

                                            handleSpecimenTypeSelectionChange(
                                                nextTypes,
                                            );
                                        }}
                                        className="cursor-pointer font-medium transition-colors hover:text-primary"
                                    >
                                        {filterOptions.specimenTypes.length >
                                            0 &&
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
                                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none hover:bg-accent hover:text-accent-foreground"
                                                onClick={() => {
                                                    const typeIdStr =
                                                        type.id.toString();
                                                    const nextTypes = isChecked
                                                        ? selectedSpecimenTypeIds.filter(
                                                              (id) =>
                                                                  id !==
                                                                  typeIdStr,
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
                                            const nextExams =
                                                areAllExamsSelected
                                                    ? []
                                                    : filteredExaminationsForDropdown.map(
                                                          (e) =>
                                                              e.id.toString(),
                                                      );

                                            handleExaminationSelectionChange(
                                                nextExams,
                                            );
                                        }}
                                        className="cursor-pointer font-medium transition-colors hover:text-primary"
                                    >
                                        {filteredExaminationsForDropdown.length >
                                            0 &&
                                        filteredExaminationsForDropdown.every(
                                            (e) =>
                                                selectedExaminationIds.includes(
                                                    e.id.toString(),
                                                ),
                                        )
                                            ? 'Ninguno'
                                            : 'Todos'}
                                    </button>
                                </div>
                                <div className="max-h-60 space-y-1 overflow-y-auto pt-1">
                                    {filteredExaminationsForDropdown.map(
                                        (exam) => {
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
                                                        const nextExams =
                                                            isChecked
                                                                ? selectedExaminationIds.filter(
                                                                      (id) =>
                                                                          id !==
                                                                          examIdStr,
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
                                        },
                                    )}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Filtro de Categoría (Popover Combobox) */}
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
                                    selectedCategory !== 'all' &&
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
                                        {filterOptions.categories.map((cat) => (
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

                    {/* Botón Limpiar filtros */}
                    {isFiltered && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResetFilters}
                            className="h-9 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Limpiar filtros</span>
                        </Button>
                    )}
                </div>

                {/* Bulk Action & Selection Toolbar */}
                <div
                    className={`space-y-3 rounded-lg border p-3 transition-colors ${
                        selectedExamIds.length > 0
                            ? 'border-primary/40 bg-primary/5 shadow-xs'
                            : 'border-border bg-card'
                    }`}
                >
                    {/* Top row: Selection status & Select All / Unselect All */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={
                                    isAllVisibleSelected
                                        ? true
                                        : isSomeVisibleSelected
                                          ? 'indeterminate'
                                          : false
                                }
                                onCheckedChange={handleToggleSelectAllVisible}
                                aria-label="Seleccionar todos los exámenes visibles"
                            />
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                <span>
                                    {selectedExamIds.length} seleccionados
                                </span>
                                <span className="text-muted-foreground">
                                    (de {filteredExaminations.length} visibles)
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAllVisible}
                                disabled={
                                    filteredExaminations.length === 0 ||
                                    isAllVisibleSelected
                                }
                                className="h-7 px-2.5 text-xs font-medium"
                            >
                                Seleccionar todos ({filteredExaminations.length}
                                )
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleUnselectAll}
                                disabled={selectedExamIds.length === 0}
                                className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                            >
                                Deseleccionar todos
                            </Button>
                        </div>
                    </div>

                    {/* Bottom row: Bulk duration assignment */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="text-xs font-medium text-foreground">
                                Asignar duración a seleccionados:
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <NumberPicker
                                    size="sm"
                                    value={bulkValue}
                                    onChange={(val) => setBulkValue(val)}
                                    min={UNIT_CONFIG[bulkUnit].min}
                                    max={UNIT_CONFIG[bulkUnit].max}
                                    step={UNIT_CONFIG[bulkUnit].step}
                                />
                                <Select
                                    value={bulkUnit}
                                    onValueChange={(val: DurationUnit) => {
                                        setBulkUnit(val);

                                        if (val === 'days' && bulkValue > 30) {
                                            setBulkValue(1);
                                        } else if (
                                            val === 'hours' &&
                                            bulkValue > 720
                                        ) {
                                            setBulkValue(1);
                                        } else if (
                                            val === 'minutes' &&
                                            bulkValue < 5
                                        ) {
                                            setBulkValue(30);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-7 w-[76px] px-2 text-xs font-medium">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="minutes">
                                            min
                                        </SelectItem>
                                        <SelectItem value="hours">
                                            hrs
                                        </SelectItem>
                                        <SelectItem value="days">
                                            días
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-wrap items-center gap-1">
                                {PRESET_DURATIONS.map((preset) => {
                                    const isPresetActive =
                                        bulkUnit === preset.unit &&
                                        bulkValue === preset.value;

                                    return (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => {
                                                setBulkValue(preset.value);
                                                setBulkUnit(preset.unit);
                                            }}
                                            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                                                isPresetActive
                                                    ? 'border-primary bg-primary font-bold text-primary-foreground shadow-xs'
                                                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <Button
                                type="button"
                                size="sm"
                                className="h-7 gap-1.5 px-3 text-xs"
                                disabled={
                                    selectedExamIds.length === 0 ||
                                    bulkValue <= 0
                                }
                                onClick={handleApplyBulkDuration}
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                <span>Aplicar</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Examinations grouped by Specimen Type */}
                <div className="space-y-5">
                    {groupedExaminations.map(([typeId, group]) => {
                        const groupExamIds = group.exams.map((e) => e.id);
                        const isAllGroupSelected =
                            groupExamIds.length > 0 &&
                            groupExamIds.every((id) =>
                                selectedExamIds.includes(id),
                            );

                        return (
                            <div key={typeId} className="space-y-2.5">
                                <div className="flex items-center justify-between border-b pb-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold tracking-wider text-primary uppercase">
                                            {group.typeName}
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className="h-4 px-1.5 text-[9px]"
                                        >
                                            {group.exams.length}
                                        </Badge>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleSelectGroup(groupExamIds)
                                        }
                                        disabled={isAllGroupSelected}
                                        className="text-[11px] font-medium text-muted-foreground hover:text-primary disabled:opacity-40"
                                    >
                                        {isAllGroupSelected
                                            ? 'Grupo seleccionado'
                                            : `Seleccionar grupo (${group.exams.length})`}
                                    </button>
                                </div>

                                {/* 2-column grid of examination cards for wide sheet */}
                                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                                    {group.exams.map((exam) => {
                                        const pathDurations =
                                            durationsMap[
                                                selectedPathologistId
                                            ] || {};
                                        const currentMins =
                                            customDurations[exam.id] ??
                                            pathDurations[exam.id] ??
                                            30;
                                        const currentColor =
                                            customColors[exam.id] ??
                                            (exam.color || '#3b82f6');
                                        const isSelected =
                                            selectedExamIds.includes(exam.id);

                                        const {
                                            unit: currentUnit,
                                            value: resolvedValue,
                                        } = resolveUnitAndValue(
                                            currentMins,
                                            examUnits[exam.id],
                                        );

                                        return (
                                            <div
                                                key={exam.id}
                                                className={`space-y-2 rounded-md border p-2.5 shadow-xs transition-colors ${
                                                    isSelected
                                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                                        : 'border-border bg-card hover:border-border/80'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        {/* Checkbox for selection */}
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() =>
                                                                handleToggleExam(
                                                                    exam.id,
                                                                )
                                                            }
                                                            aria-label={`Seleccionar ${exam.name}`}
                                                        />

                                                        {/* Color picker circle */}
                                                        <label
                                                            className="relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 shadow-xs transition-transform hover:scale-110"
                                                            style={{
                                                                backgroundColor:
                                                                    currentColor,
                                                            }}
                                                            title="Cambiar color del examen"
                                                        >
                                                            <input
                                                                type="color"
                                                                value={
                                                                    currentColor
                                                                }
                                                                onChange={(e) =>
                                                                    handleColorChange(
                                                                        exam.id,
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                                            />
                                                        </label>

                                                        <span
                                                            className="truncate text-xs font-medium text-foreground"
                                                            title={exam.name}
                                                        >
                                                            {exam.name}
                                                        </span>
                                                    </div>

                                                    {/* Duration input and unit select */}
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        <NumberPicker
                                                            size="sm"
                                                            value={
                                                                resolvedValue
                                                            }
                                                            onChange={(
                                                                nextVal,
                                                            ) => {
                                                                const mins =
                                                                    calculateMinutes(
                                                                        nextVal,
                                                                        currentUnit,
                                                                    );
                                                                setCustomDurations(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [exam.id]:
                                                                            mins,
                                                                    }),
                                                                );
                                                            }}
                                                            min={
                                                                UNIT_CONFIG[
                                                                    currentUnit
                                                                ].min
                                                            }
                                                            max={
                                                                UNIT_CONFIG[
                                                                    currentUnit
                                                                ].max
                                                            }
                                                            step={
                                                                UNIT_CONFIG[
                                                                    currentUnit
                                                                ].step
                                                            }
                                                        />
                                                        <Select
                                                            value={currentUnit}
                                                            onValueChange={(
                                                                nextUnit: DurationUnit,
                                                            ) =>
                                                                handleExamUnitChange(
                                                                    exam.id,
                                                                    nextUnit,
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger className="h-7 w-[68px] px-1.5 text-xs font-medium">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="minutes">
                                                                    min
                                                                </SelectItem>
                                                                <SelectItem value="hours">
                                                                    hrs
                                                                </SelectItem>
                                                                <SelectItem value="days">
                                                                    días
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                {/* Preset Pills */}
                                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                                    {PRESET_DURATIONS.map(
                                                        (preset) => {
                                                            const isPresetSelected =
                                                                currentMins ===
                                                                preset.minutes;

                                                            return (
                                                                <button
                                                                    key={
                                                                        preset.label
                                                                    }
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleExamPresetClick(
                                                                            exam.id,
                                                                            preset,
                                                                        )
                                                                    }
                                                                    className={`rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                                                                        isPresetSelected
                                                                            ? 'border-primary bg-primary font-bold text-primary-foreground shadow-xs'
                                                                            : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                                                                    }`}
                                                                >
                                                                    {
                                                                        preset.label
                                                                    }
                                                                </button>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {groupedExaminations.length === 0 && (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                            No se encontraron exámenes que coincidan con los
                            filtros seleccionados.
                        </div>
                    )}
                </div>
            </div>

            <SheetFooter className="shrink-0 flex-row items-center justify-between gap-3 border-t bg-card/95 px-6 py-3 shadow-md backdrop-blur-xs">
                <div className="flex items-center gap-2">
                    {hasChanges ? (
                        <div className="flex items-center gap-2">
                            <Badge
                                variant="secondary"
                                className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            >
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                                {modifiedExamCount}{' '}
                                {modifiedExamCount === 1
                                    ? 'examen modificado'
                                    : 'exámenes modificados'}
                            </Badge>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleDiscardChanges}
                                disabled={isSaving}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                                Descartar
                            </Button>
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground">
                            Sin cambios pendientes
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="gap-1.5 shadow-xs"
                    >
                        <Save className="h-3.5 w-3.5" />
                        <span>
                            {isSaving
                                ? 'Guardando...'
                                : 'Guardar Configuración'}
                        </span>
                    </Button>
                </div>
            </SheetFooter>
        </div>
    );
};

export default DurationSettingsForm;
