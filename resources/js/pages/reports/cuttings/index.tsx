import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import debounce from 'lodash/debounce';
import {
    Search,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    ChevronsUpDown,
    Check,
    Download,
    FileSpreadsheet,
    Microscope,
    FileText,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as React from 'react';
import { index as cuttingsReportIndex } from '@/actions/App/Http/Controllers/Reports/CuttingsReportController';
import {
    DateRangePicker,
    setCookie,
    getLast2WeeksRange,
} from '@/components/date-range-picker';

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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn, getContrastColor } from '@/lib/utils';
import SpecimenViewSheet from '../../specimens/specimen-view-sheet';

interface CuttingReportItem {
    id: number;
    created_at: string | null;
    number_of_cuttings: number;
    cuttings_description: string;
    number_of_slides: number | null;
    status: string;
    comments: string | null;
    responsible: {
        id: number;
        name: string;
        role: {
            name: string;
        } | null;
    } | null;
    specimen: {
        id: number;
        sequence_code: string;
        type: {
            name: string;
        } | null;
        examination: {
            name: string;
        } | null;
    } | null;
    number_of_cassettes: number;
    cassettes_range: string;
    cassette_color: string;
    special_stains: string;
    is_new_cut?: boolean;
    description?: string;
    prefix?: {
        id: number;
        prefix: string;
    } | null;
    code?: {
        id: number;
        code: string;
        color: string;
    } | null;
    cutting_slide_types?: number[] | null;
    macroscopy_date?: string | null;
    processing_date?: string | null;
    delivery_date?: string | null;
}

const indexToLetter = (index: number): string => {
    let letter = '';
    let idx = index;

    while (idx > 0) {
        const temp = (idx - 1) % 26;
        letter = String.fromCharCode(65 + temp) + letter;
        idx = Math.floor((idx - temp - 1) / 26);
    }

    return letter;
};

const areTwoCodesConsecutive = (code1: string, code2: string): boolean => {
    const len1 = code1.length;
    const len2 = code2.length;

    if (len1 !== len2 || len1 === 0) {
        return false;
    }

    if (len1 > 1) {
        const pref1 = code1.substring(0, len1 - 1);
        const pref2 = code2.substring(0, len2 - 1);

        if (pref1 !== pref2) {
            return false;
        }
    }

    const lastChar1 = code1.charCodeAt(len1 - 1);
    const lastChar2 = code2.charCodeAt(len2 - 1);

    return lastChar2 === lastChar1 + 1;
};

interface CuttingGroup {
    key: string;
    label: string;
    description: string;
    prefix: string;
    totalCuts: number;
    count: number;
    items: CuttingReportItem[];
    isNewCut: boolean;
}

const groupCuttings = (cuttingsList: CuttingReportItem[]): CuttingGroup[] => {
    if (cuttingsList.length === 0) {
        return [];
    }

    // Sort alphabetically (by length first, then natural comparison)
    const sorted = [...cuttingsList].sort(
        (a: CuttingReportItem, b: CuttingReportItem) => {
            const codeA = a.code?.code || '';
            const codeB = b.code?.code || '';
            const lenA = codeA.length;
            const lenB = codeB.length;

            if (lenA !== lenB) {
                return lenA - lenB;
            }

            return codeA.localeCompare(codeB, undefined, {
                numeric: true,
                sensitivity: 'base',
            });
        },
    );

    interface TempRun {
        description: string;
        prefix: string;
        isNewCut: boolean;
        items: CuttingReportItem[];
    }

    const tempRuns: TempRun[] = [];
    sorted.forEach((cutting) => {
        const desc = cutting.description || '';
        const prefix = cutting.prefix?.prefix || '';
        const isNew = !!cutting.is_new_cut;

        if (
            tempRuns.length > 0 &&
            tempRuns[tempRuns.length - 1].description === desc &&
            tempRuns[tempRuns.length - 1].prefix === prefix &&
            tempRuns[tempRuns.length - 1].isNewCut === isNew
        ) {
            tempRuns[tempRuns.length - 1].items.push(cutting);
        } else {
            tempRuns.push({
                description: desc,
                prefix,
                isNewCut: isNew,
                items: [cutting],
            });
        }
    });

    const groups: CuttingGroup[] = [];

    tempRuns.forEach((run) => {
        const subGroups: CuttingReportItem[][] = [];
        let currentSubGroup: CuttingReportItem[] = [];

        run.items.forEach((item) => {
            const globalIdx = sorted.indexOf(item);
            const code = item.code?.code || indexToLetter(globalIdx + 1);

            if (currentSubGroup.length === 0) {
                currentSubGroup.push(item);
            } else {
                const prevItem = currentSubGroup[currentSubGroup.length - 1];
                const prevGlobalIdx = sorted.indexOf(prevItem);
                const prevCode =
                    prevItem.code?.code || indexToLetter(prevGlobalIdx + 1);

                if (areTwoCodesConsecutive(prevCode, code)) {
                    currentSubGroup.push(item);
                } else {
                    subGroups.push(currentSubGroup);
                    currentSubGroup = [item];
                }
            }
        });

        if (currentSubGroup.length > 0) {
            subGroups.push(currentSubGroup);
        }

        subGroups.forEach((sub) => {
            const subCount = sub.length;
            let totalCuts = 0;
            sub.forEach((item) => {
                totalCuts += item.number_of_cuttings ?? 0;
            });

            const startCutting = sub[0];
            const endCutting = sub[subCount - 1];
            const startGlobalIdx = sorted.indexOf(startCutting);
            const endGlobalIdx = sorted.indexOf(endCutting);

            const startLetter =
                startCutting.code?.code || indexToLetter(startGlobalIdx + 1);
            const endLetter =
                endCutting.code?.code || indexToLetter(endGlobalIdx + 1);

            const label =
                subCount === 1 ? startLetter : `${startLetter}-${endLetter}`;
            const key = `${run.isNewCut ? 'new-' : 'reg-'}${run.description}-${run.prefix || ''}-${startLetter}-${endLetter}`;

            groups.push({
                key,
                label,
                description: run.description,
                prefix: run.prefix,
                totalCuts,
                count: subCount,
                items: sub,
                isNewCut: run.isNewCut,
            });
        });
    });

    return groups;
};

interface Props {
    cuttings: CuttingReportItem[];
    filters: {
        search?: string;
        responsible_id?: string;
        specimen_type_id?: string;
        examination_id?: string;
        date_from?: string;
        date_to?: string;
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
    };
    usersList: {
        id: number;
        name: string;
        role: {
            name: string;
        } | null;
    }[];
    specimenTypes: {
        id: number;
        name: string;
    }[];
    examinations: any[];
}

function FormCombobox({
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
    const [open, setOpen] = React.useState(false);
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild className="w-full">
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between text-left font-normal"
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
            >
                <Command>
                    <CommandInput placeholder={`Buscar...`} />
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

export default function CuttingsReportIndex({
    cuttings,
    filters,
    usersList = [],
    specimenTypes = [],
    examinations = [],
}: Props) {
    const { props } = usePage() as any;
    const { auth } = props;

    const [search, setSearch] = useState(filters.search || '');
    const [selectedSpecimenForView, setSelectedSpecimenForView] = useState<
        any | null
    >(null);
    const [isSpecimenViewSheetOpen, setIsSpecimenViewSheetOpen] =
        useState(false);

    const [isResponsibleFilterOpen, setIsResponsibleFilterOpen] =
        useState(false);

    const [expandedGroups, setExpandedGroups] = useState<
        Record<string, boolean>
    >({});

    const [expandedSpecimens, setExpandedSpecimens] = useState<
        Record<number, boolean>
    >({});

    const groupedBySpecimen = useMemo(() => {
        const groups: { specimen: any; cuttings: CuttingReportItem[] }[] = [];
        cuttings.forEach((cutting) => {
            const specId = cutting.specimen?.id || 0;
            let group = groups.find((g) => g.specimen?.id === specId);

            if (!group) {
                group = { specimen: cutting.specimen, cuttings: [] };
                groups.push(group);
            }

            group.cuttings.push(cutting);
        });

        return groups;
    }, [cuttings]);

    const formatStatusDate = (dateStr: string | null | undefined) => {
        if (!dateStr) {
            return (
                <span className="text-xs text-muted-foreground italic">-</span>
            );
        }

        try {
            return (
                <span className="font-mono text-xs">
                    {format(new Date(dateStr), 'dd/MM/yyyy HH:mm', {
                        locale: es,
                    })}
                </span>
            );
        } catch (e) {
            return (
                <span className="font-mono text-xs text-muted-foreground">
                    {dateStr}
                </span>
            );
        }
    };

    const containerRef = useRef<HTMLDivElement>(null);
    const [showLeftShadow, setShowLeftShadow] = useState(false);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const scrollContainer =
            container.querySelector('.relative.w-full.overflow-auto') ||
            container;

        const handleScroll = () => {
            const scrollLeft = scrollContainer.scrollLeft;

            setShowLeftShadow(scrollLeft > 2);
        };

        handleScroll();
        scrollContainer.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);

        return () => {
            scrollContainer.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [cuttings]);
    const parseInitialIds = (rawFilter: any, allItems: any[]): string[] => {
        if (
            rawFilter === 'none' ||
            (Array.isArray(rawFilter) && rawFilter.length === 0)
        ) {
            return [];
        }
        if (
            rawFilter === undefined ||
            rawFilter === null ||
            rawFilter === 'all'
        ) {
            return allItems.map((item) => item.id.toString());
        }
        if (Array.isArray(rawFilter)) {
            return rawFilter.map((id) => id.toString());
        }
        return [rawFilter.toString()];
    };

    const [selectedSpecimenTypeIds, setSelectedSpecimenTypeIds] = useState<
        string[]
    >(() => parseInitialIds(filters.specimen_type_id, specimenTypes));

    const [selectedExaminationIds, setSelectedExaminationIds] = useState<
        string[]
    >(() => parseInitialIds(filters.examination_id, examinations));

    useEffect(() => {
        if (filters.specimen_type_id !== undefined) {
            setSelectedSpecimenTypeIds(
                parseInitialIds(filters.specimen_type_id, specimenTypes),
            );
        }
        if (filters.examination_id !== undefined) {
            setSelectedExaminationIds(
                parseInitialIds(filters.examination_id, examinations),
            );
        }
    }, [
        filters.specimen_type_id,
        filters.examination_id,
        specimenTypes,
        examinations,
    ]);

    const getSpecimenTypeId = (exam: any): string | null => {
        const typeId =
            exam.specimen_type || exam.specimen_type_id || exam.type?.id;
        return typeId ? typeId.toString() : null;
    };

    const filteredExaminationsForDropdown = useMemo(() => {
        if (selectedSpecimenTypeIds.length === specimenTypes.length) {
            return examinations;
        }

        return examinations.filter((exam) => {
            const typeId = getSpecimenTypeId(exam);
            return typeId && selectedSpecimenTypeIds.includes(typeId);
        });
    }, [examinations, selectedSpecimenTypeIds, specimenTypes.length]);

    const handleSpecimenTypeSelectionChange = (nextTypeIds: string[]) => {
        setSelectedSpecimenTypeIds(nextTypeIds);

        let nextExamIds: string[];

        if (nextTypeIds.length === specimenTypes.length) {
            nextExamIds = examinations.map((e) => e.id.toString());
        } else if (nextTypeIds.length === 0) {
            nextExamIds = [];
        } else {
            const addedTypeIds = nextTypeIds.filter(
                (id) => !selectedSpecimenTypeIds.includes(id),
            );

            const validExamsForNextTypes = examinations.filter((exam) => {
                const typeId = getSpecimenTypeId(exam);
                return typeId && nextTypeIds.includes(typeId);
            });
            const validExamIdsForNextTypes = validExamsForNextTypes.map((e) =>
                e.id.toString(),
            );

            let updatedExamIds = selectedExaminationIds.filter((id) =>
                validExamIdsForNextTypes.includes(id),
            );

            if (addedTypeIds.length > 0) {
                const addedExamIds = examinations
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
            nextTypeIds.length === specimenTypes.length
                ? 'all'
                : nextTypeIds.length === 0
                  ? 'none'
                  : nextTypeIds;

        const examParam =
            nextExamIds.length === examinations.length
                ? 'all'
                : nextExamIds.length === 0
                  ? 'none'
                  : nextExamIds;

        const userId = auth?.user?.id;
        if (userId) {
            setCookie(
                `specimen_type_filter_report_cuttings_user_${userId}`,
                JSON.stringify(typeParam),
            );
        }

        const newFilters: any = {
            ...filters,
            specimen_type_id: typeParam,
            examination_id: examParam,
        };

        router.get(cuttingsReportIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const handleExaminationSelectionChange = (nextExamIds: string[]) => {
        setSelectedExaminationIds(nextExamIds);

        const typeParam =
            selectedSpecimenTypeIds.length === specimenTypes.length
                ? 'all'
                : selectedSpecimenTypeIds.length === 0
                  ? 'none'
                  : selectedSpecimenTypeIds;

        const examParam =
            nextExamIds.length === examinations.length
                ? 'all'
                : nextExamIds.length === 0
                  ? 'none'
                  : nextExamIds;

        const newFilters: any = {
            ...filters,
            specimen_type_id: typeParam,
            examination_id: examParam,
        };

        router.get(cuttingsReportIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const newFilters = { ...filters, [key]: value };

            if (value === 'all' || value === '') {
                delete newFilters[key as keyof typeof filters];
            }

            router.get(cuttingsReportIndex().url, newFilters, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    const handleExport = (format: 'csv' | 'xlsx') => {
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach((v) =>
                        queryParams.append(`${key}[]`, String(v)),
                    );
                } else {
                    queryParams.append(key, String(value));
                }
            }
        });
        queryParams.set('format', format);
        window.location.href = `/reports/cuttings/export?${queryParams.toString()}`;
    };

    const handleSort = (field: string) => {
        const isCurrentField =
            filters.sort_field === field ||
            (field === 'date' && !filters.sort_field);
        const direction =
            isCurrentField && filters.sort_direction === 'asc' ? 'desc' : 'asc';

        const newFilters = {
            ...filters,
            sort_field: field,
            sort_direction: direction,
        };

        router.get(cuttingsReportIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const renderSortHeader = (field: string, label: string) => {
        const isSorted =
            filters.sort_field === field ||
            (field === 'date' && !filters.sort_field);
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
        if (search !== filters.search) {
            debouncedSearch(search);
        }
    }, [search, filters.search, debouncedSearch]);

    const getStatusBadge = (status: string, count?: number) => {
        const suffix = count && count > 1 ? ` x${count}` : '';

        switch (status) {
            case 'macroscopy':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
                    >
                        Macroscopía{suffix}
                    </Badge>
                );
            case 'processing':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                    >
                        Procesamiento{suffix}
                    </Badge>
                );
            case 'delivered':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                    >
                        Entregado{suffix}
                    </Badge>
                );
            default:
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full px-2.5 py-0.5"
                    >
                        {status}
                        {suffix}
                    </Badge>
                );
        }
    };

    const examinationOptions = useMemo(() => {
        const selectedSpecimenType = filters.specimen_type_id || 'all';

        const filtered =
            selectedSpecimenType === 'all'
                ? examinations
                : examinations.filter(
                      (exam) =>
                          exam.specimen_type?.toString() ===
                          selectedSpecimenType,
                  );

        return [
            { label: 'Todos los exámenes', value: 'all' },
            ...filtered.map((exam) => ({
                label: exam.name,
                value: exam.id.toString(),
            })),
        ];
    }, [examinations, filters.specimen_type_id]);

    const activeUserFilter = useMemo(() => {
        if (!filters.responsible_id || filters.responsible_id === 'all') {
            return null;
        }

        return usersList.find(
            (u) => u.id.toString() === filters.responsible_id,
        );
    }, [usersList, filters.responsible_id]);

    return (
        <>
            <Head title="Reporte: Hoja de Relación de Biopsias" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Reporte: Hoja de Relación de Biopsias (Cortes)
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Consulte y exporte la relación de cortes de biopsias
                            detallada por casete, fecha, tipo de muestra y
                            médico responsable.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="h-10 gap-2"
                            onClick={() => {
                                const userId = auth?.user?.id;

                                if (userId) {
                                    const defaultRange = getLast2WeeksRange();
                                    setCookie(
                                        `date_filter_report_cuttings_user_${userId}`,
                                        JSON.stringify({
                                            range: '14_days',
                                            from: defaultRange.from,
                                            to: defaultRange.to,
                                        }),
                                    );
                                }

                                router.get(
                                    cuttingsReportIndex().url,
                                    {},
                                    { preserveState: false },
                                );
                            }}
                        >
                            Limpiar filtros
                        </Button>
                        <Button
                            variant="outline"
                            className="h-10 gap-2"
                            onClick={() => handleExport('xlsx')}
                        >
                            <Download className="h-4 w-4" />
                            <span>Exportar a Excel</span>
                        </Button>
                    </div>
                </div>

                {/* Filters Area */}
                <div className="flex w-full flex-col gap-4">
                    {/* Row 1: Search and Date Range */}
                    <div className="flex flex-row items-end justify-stretch gap-3">
                        <div className="relative w-full">
                            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por código muestra, médico responsable o comentarios..."
                                className="w-full pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex w-full max-w-[320px] flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Rango de Fechas
                            </span>
                            <DateRangePicker
                                cookieKey="date_filter_report_cuttings"
                                value={{
                                    from: filters.date_from || '',
                                    to: filters.date_to || '',
                                }}
                                onChange={(range) => {
                                    const newFilters = { ...filters };

                                    if (range.from) {
                                        newFilters.date_from = range.from;
                                    } else {
                                        delete newFilters.date_from;
                                    }

                                    if (range.to) {
                                        newFilters.date_to = range.to;
                                    } else {
                                        delete newFilters.date_to;
                                    }

                                    router.get(
                                        cuttingsReportIndex().url,
                                        newFilters,
                                        {
                                            preserveState: true,
                                            replace: true,
                                        },
                                    );
                                }}
                            />
                        </div>
                    </div>

                    {/* Row 2: Advanced filters */}
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-4">
                        {/* Responsible User Filter */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Médico Responsable
                            </span>
                            <Popover
                                open={isResponsibleFilterOpen}
                                onOpenChange={setIsResponsibleFilterOpen}
                            >
                                <PopoverTrigger asChild className="w-full">
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isResponsibleFilterOpen}
                                        className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
                                    >
                                        <span className="truncate">
                                            {(filters.responsible_id ||
                                                'all') === 'all'
                                                ? 'Todos los médicos'
                                                : activeUserFilter
                                                  ? `${activeUserFilter.name} (${activeUserFilter.role?.name || 'N/A'})`
                                                  : 'Médico seleccionado'}
                                        </span>
                                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[--radix-popover-trigger-width] p-0"
                                    align="start"
                                >
                                    <Command>
                                        <CommandInput placeholder="Buscar médico..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                No se encontraron médicos.
                                            </CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    value="todos"
                                                    onSelect={() => {
                                                        handleFilterChange(
                                                            'responsible_id',
                                                            'all',
                                                        );
                                                        setIsResponsibleFilterOpen(
                                                            false,
                                                        );
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            (filters.responsible_id ||
                                                                'all') === 'all'
                                                                ? 'opacity-100'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                    Todos los médicos
                                                </CommandItem>
                                                {usersList.map((user) => (
                                                    <CommandItem
                                                        key={user.id}
                                                        value={user.name}
                                                        onSelect={() => {
                                                            handleFilterChange(
                                                                'responsible_id',
                                                                user.id.toString(),
                                                            );
                                                            setIsResponsibleFilterOpen(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-4 w-4',
                                                                filters.responsible_id ===
                                                                    user.id.toString()
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {user.name}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {user.role
                                                                    ?.name ||
                                                                    'Sin Rol'}
                                                            </span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Specimen Type */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Tipo de Muestra
                            </span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Microscope className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span>
                                                Tipos (
                                                {selectedSpecimenTypeIds.length}
                                                )
                                            </span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-64 p-2"
                                    align="start"
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between border-b px-2 py-1 pb-1.5 text-xs text-muted-foreground">
                                            <span>Filtrar por tipo</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const areAllTypesSelected =
                                                        specimenTypes.length >
                                                            0 &&
                                                        specimenTypes.every(
                                                            (t) =>
                                                                selectedSpecimenTypeIds.includes(
                                                                    t.id.toString(),
                                                                ),
                                                        );
                                                    const nextTypes =
                                                        areAllTypesSelected
                                                            ? []
                                                            : specimenTypes.map(
                                                                  (t) =>
                                                                      t.id.toString(),
                                                              );

                                                    handleSpecimenTypeSelectionChange(
                                                        nextTypes,
                                                    );
                                                }}
                                                className="cursor-pointer font-medium transition-colors hover:text-primary"
                                            >
                                                {specimenTypes.length > 0 &&
                                                specimenTypes.every((t) =>
                                                    selectedSpecimenTypeIds.includes(
                                                        t.id.toString(),
                                                    ),
                                                )
                                                    ? 'Ninguno'
                                                    : 'Todos'}
                                            </button>
                                        </div>
                                        <div className="max-h-60 space-y-1 overflow-y-auto pt-1">
                                            {specimenTypes.map((type) => {
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
                                                            const nextTypes =
                                                                isChecked
                                                                    ? selectedSpecimenTypeIds.filter(
                                                                          (
                                                                              id,
                                                                          ) =>
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
                        </div>

                        {/* Examination */}
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Examen / Análisis
                            </span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span>
                                                Análisis (
                                                {selectedExaminationIds.length})
                                            </span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-64 p-2"
                                    align="start"
                                >
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
                                                            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none hover:bg-accent hover:text-accent-foreground"
                                                            onClick={() => {
                                                                const examIdStr =
                                                                    exam.id.toString();
                                                                const nextExams =
                                                                    isChecked
                                                                        ? selectedExaminationIds.filter(
                                                                              (
                                                                                  id,
                                                                              ) =>
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
                                                                checked={
                                                                    isChecked
                                                                }
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
                        </div>
                    </div>
                </div>

                {/* Info block for selected doctor */}
                {activeUserFilter && (
                    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Filtro de Médico Responsable Activo
                            </span>
                            <div className="flex flex-wrap items-baseline gap-x-4">
                                <span className="text-sm font-semibold text-foreground">
                                    Nombre del Médico Responsable:{' '}
                                    <span className="font-normal text-muted-foreground">
                                        {activeUserFilter.name}
                                    </span>
                                </span>
                                <span className="text-sm font-semibold text-foreground">
                                    Rol:{' '}
                                    <span className="font-normal text-muted-foreground text-primary">
                                        {activeUserFilter.role?.name || 'N/A'}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table Container */}
                <div ref={containerRef} className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[200px]">
                                    <div className="flex flex-col gap-1 py-1">
                                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase">
                                            Ordenar por
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {renderSortHeader(
                                                'specimen_code',
                                                'Muestra',
                                            )}
                                            <span className="text-muted-foreground/30">
                                                |
                                            </span>
                                            {renderSortHeader(
                                                'cutting_code',
                                                'Casete',
                                            )}
                                        </div>
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[120px]">
                                    {renderSortHeader('status', 'Estado')}
                                </TableHead>
                                <TableHead className="min-w-[120px]">
                                    <span>Nuevo Corte</span>
                                </TableHead>
                                <TableHead className="min-w-[180px]">
                                    <span>Descripción</span>
                                </TableHead>
                                <TableHead className="min-w-[100px] text-right">
                                    {renderSortHeader(
                                        'number_of_cuttings',
                                        '# Cortes',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    <span>Descripción Cortes</span>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    {renderSortHeader(
                                        'number_of_slides',
                                        '# Láminas',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[200px]">
                                    <span>T. ESPECIALES (Señalar)</span>
                                </TableHead>
                                <TableHead className="min-w-[180px]">
                                    {renderSortHeader(
                                        'responsible',
                                        'Responsables',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[160px] text-center">
                                    {renderSortHeader('date', 'F. Macroscopía')}
                                </TableHead>
                                <TableHead className="min-w-[160px] text-center">
                                    <span>F. Procesamiento</span>
                                </TableHead>
                                <TableHead className="min-w-[160px] text-center">
                                    <span>F. Entrega</span>
                                </TableHead>
                                <TableHead className="min-w-[160px] text-center">
                                    {renderSortHeader(
                                        'created_at',
                                        'F. Creación',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[200px]">
                                    <span>Comentarios</span>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <span>Acciones</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupedBySpecimen.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={15}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        No se encontraron registros que
                                        coincidan con los filtros.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                groupedBySpecimen.map(
                                    ({
                                        specimen,
                                        cuttings: specimenCuttings,
                                    }) => {
                                        const groups =
                                            groupCuttings(specimenCuttings);
                                        const specimenCode =
                                            specimen?.sequence_code || 'N/A';
                                        const specimenTypeExam = specimen
                                            ? `${specimen.type?.name || 'N/A'} - ${specimen.examination?.name || 'N/A'}`
                                            : 'N/A';
                                        const isSpecimenExpanded = specimen
                                            ? expandedSpecimens[specimen.id] !==
                                              false
                                            : true;

                                        const sortedCuttings = [
                                            ...specimenCuttings,
                                        ].sort((a, b) => {
                                            const codeA = a.code?.code || '';
                                            const codeB = b.code?.code || '';
                                            const lenA = codeA.length;
                                            const lenB = codeB.length;

                                            if (lenA !== lenB) {
                                                return lenA - lenB;
                                            }

                                            return codeA.localeCompare(
                                                codeB,
                                                undefined,
                                                {
                                                    numeric: true,
                                                    sensitivity: 'base',
                                                },
                                            );
                                        });
                                        const startCode =
                                            sortedCuttings[0]?.code?.code;
                                        const endCode =
                                            sortedCuttings[
                                                sortedCuttings.length - 1
                                            ]?.code?.code;
                                        const cuttingsRange =
                                            startCode && endCode
                                                ? startCode === endCode
                                                    ? startCode
                                                    : `${startCode}-${endCode}`
                                                : startCode || endCode || '';

                                        return (
                                            <React.Fragment
                                                key={
                                                    specimen?.id ||
                                                    Math.random()
                                                }
                                            >
                                                {/* Specimen Header Row */}
                                                <TableRow
                                                    className="cursor-pointer border-t border-border bg-slate-100/80 select-none hover:bg-slate-100/90 dark:bg-slate-900/60 dark:hover:bg-slate-900/80"
                                                    onClick={() => {
                                                        if (specimen) {
                                                            setExpandedSpecimens(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [specimen.id]:
                                                                        !isSpecimenExpanded,
                                                                }),
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <TableCell
                                                        colSpan={15}
                                                        className="border-y border-border px-4 py-2.5 font-semibold text-foreground"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {specimen &&
                                                                (isSpecimenExpanded ? (
                                                                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                                ))}
                                                            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                                Muestra:
                                                            </span>
                                                            {specimen ? (
                                                                <button
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        setSelectedSpecimenForView(
                                                                            specimen,
                                                                        );
                                                                        setIsSpecimenViewSheetOpen(
                                                                            true,
                                                                        );
                                                                    }}
                                                                    className="font-mono text-sm font-bold text-primary hover:underline"
                                                                >
                                                                    {
                                                                        specimenCode
                                                                    }
                                                                </button>
                                                            ) : (
                                                                <span className="font-mono text-sm text-muted-foreground">
                                                                    {
                                                                        specimenCode
                                                                    }
                                                                </span>
                                                            )}
                                                            <span className="text-muted-foreground">
                                                                |
                                                            </span>
                                                            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                                Tipo/Examen:
                                                            </span>
                                                            <span className="text-sm font-medium">
                                                                {
                                                                    specimenTypeExam
                                                                }
                                                            </span>
                                                            {cuttingsRange && (
                                                                <>
                                                                    <span className="text-muted-foreground">
                                                                        |
                                                                    </span>
                                                                    <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                                        Rango de
                                                                        Cortes:
                                                                    </span>
                                                                    <span className="font-mono text-sm font-medium">
                                                                        {
                                                                            cuttingsRange
                                                                        }
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>

                                                {isSpecimenExpanded &&
                                                    groups.map((group) => {
                                                        const groupKey = `${specimen?.id || 0}-${group.key}`;
                                                        const isExpanded =
                                                            !!expandedGroups[
                                                                groupKey
                                                            ];

                                                        const toggleExpand =
                                                            () => {
                                                                setExpandedGroups(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [groupKey]:
                                                                            !prev[
                                                                                groupKey
                                                                            ],
                                                                    }),
                                                                );
                                                            };

                                                        return (
                                                            <React.Fragment
                                                                key={group.key}
                                                            >
                                                                {/* Group Header Row */}
                                                                <TableRow
                                                                    className="cursor-pointer bg-slate-50/50 transition-colors hover:bg-slate-100/60 dark:bg-slate-900/20 dark:hover:bg-slate-800/40"
                                                                    onClick={
                                                                        toggleExpand
                                                                    }
                                                                >
                                                                    {/* Cassette Code Range */}
                                                                    <TableCell className="pl-4 align-middle font-bold text-slate-900 dark:text-slate-100">
                                                                        <div className="flex items-center gap-1.5 text-xs">
                                                                            {isExpanded ? (
                                                                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                                                            ) : (
                                                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                                            )}
                                                                            <span>
                                                                                {
                                                                                    group.label
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </TableCell>

                                                                    {/* Status badges */}
                                                                    <TableCell className="align-middle">
                                                                        <div className="flex flex-col gap-1">
                                                                            {(() => {
                                                                                const counts =
                                                                                    group.items.reduce(
                                                                                        (
                                                                                            acc,
                                                                                            item,
                                                                                        ) => {
                                                                                            acc[
                                                                                                item.status
                                                                                            ] =
                                                                                                (acc[
                                                                                                    item
                                                                                                        .status
                                                                                                ] ||
                                                                                                    0) +
                                                                                                1;

                                                                                            return acc;
                                                                                        },
                                                                                        {} as Record<
                                                                                            string,
                                                                                            number
                                                                                        >,
                                                                                    );

                                                                                return (
                                                                                    Object.keys(
                                                                                        counts,
                                                                                    ) as Array<string>
                                                                                ).map(
                                                                                    (
                                                                                        status,
                                                                                    ) => {
                                                                                        const count =
                                                                                            counts[
                                                                                                status
                                                                                            ];
                                                                                        const suffix =
                                                                                            count >
                                                                                            1
                                                                                                ? ` x${count}`
                                                                                                : '';

                                                                                        return (
                                                                                            <span
                                                                                                key={
                                                                                                    status
                                                                                                }
                                                                                                className="inline-block"
                                                                                            >
                                                                                                {getStatusBadge(
                                                                                                    status,
                                                                                                    count,
                                                                                                )}
                                                                                            </span>
                                                                                        );
                                                                                    },
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </TableCell>

                                                                    {/* Is New Cut */}
                                                                    <TableCell className="align-middle">
                                                                        {group.isNewCut ? (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                                            >
                                                                                Sí
                                                                                (Nuevo)
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="border-red-200 bg-red-50 text-red-700 dark:border-red-950 dark:bg-red-950/20 dark:text-red-400"
                                                                            >
                                                                                No
                                                                            </Badge>
                                                                        )}
                                                                    </TableCell>

                                                                    {/* Description */}
                                                                    <TableCell className="align-middle font-semibold text-slate-800 dark:text-slate-200">
                                                                        {group.description ||
                                                                            '-'}
                                                                    </TableCell>

                                                                    {/* Total Cuts */}
                                                                    <TableCell className="text-right align-middle font-bold text-slate-700 dark:text-slate-300">
                                                                        {group.prefix
                                                                            ? `${group.prefix} `
                                                                            : ''}
                                                                        {group.totalCuts >
                                                                            0 && (
                                                                            <span className="ml-1 rounded-sm border border-gray-200 bg-gray-100 px-1 text-gray-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                                                                                {
                                                                                    group.totalCuts
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </TableCell>

                                                                    {/* Cuts Description */}
                                                                    <TableCell className="align-middle text-xs text-muted-foreground">
                                                                        {Array.from(
                                                                            new Set(
                                                                                group.items
                                                                                    .map(
                                                                                        (
                                                                                            item,
                                                                                        ) =>
                                                                                            item.cuttings_description,
                                                                                    )
                                                                                    .filter(
                                                                                        Boolean,
                                                                                    ),
                                                                            ),
                                                                        ).join(
                                                                            ', ',
                                                                        ) ||
                                                                            '-'}
                                                                    </TableCell>

                                                                    {/* Total Slides */}
                                                                    <TableCell className="text-right align-middle font-bold text-slate-700 dark:text-slate-300">
                                                                        {group.items.reduce(
                                                                            (
                                                                                sum,
                                                                                item,
                                                                            ) =>
                                                                                sum +
                                                                                (item.number_of_slides ??
                                                                                    0),
                                                                            0,
                                                                        )}
                                                                    </TableCell>

                                                                    {/* Special Stains */}
                                                                    <TableCell className="align-middle">
                                                                        {(() => {
                                                                            const stains =
                                                                                Array.from(
                                                                                    new Set(
                                                                                        group.items
                                                                                            .map(
                                                                                                (
                                                                                                    item,
                                                                                                ) =>
                                                                                                    item.special_stains,
                                                                                            )
                                                                                            .filter(
                                                                                                Boolean,
                                                                                            )
                                                                                            .flatMap(
                                                                                                (
                                                                                                    s,
                                                                                                ) =>
                                                                                                    s.split(
                                                                                                        ', ',
                                                                                                    ),
                                                                                            ),
                                                                                    ),
                                                                                );

                                                                            if (
                                                                                stains.length >
                                                                                0
                                                                            ) {
                                                                                return (
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {stains.map(
                                                                                            (
                                                                                                stain,
                                                                                                idx,
                                                                                            ) => (
                                                                                                <Badge
                                                                                                    key={
                                                                                                        idx
                                                                                                    }
                                                                                                    variant="outline"
                                                                                                    className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-400"
                                                                                                >
                                                                                                    {
                                                                                                        stain
                                                                                                    }
                                                                                                </Badge>
                                                                                            ),
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            return (
                                                                                <span className="text-xs text-muted-foreground italic">
                                                                                    Ninguna
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </TableCell>

                                                                    {/* Responsibles */}
                                                                    <TableCell className="align-middle text-xs text-slate-700 dark:text-slate-300">
                                                                        {(() => {
                                                                            const names =
                                                                                Array.from(
                                                                                    new Set(
                                                                                        group.items
                                                                                            .map(
                                                                                                (
                                                                                                    i,
                                                                                                ) =>
                                                                                                    i
                                                                                                        .responsible
                                                                                                        ?.name,
                                                                                            )
                                                                                            .filter(
                                                                                                Boolean,
                                                                                            ),
                                                                                    ),
                                                                                );

                                                                            if (
                                                                                names.length ===
                                                                                1
                                                                            ) {
                                                                                return names[0];
                                                                            }

                                                                            if (
                                                                                names.length >
                                                                                1
                                                                            ) {
                                                                                return 'Varios';
                                                                            }

                                                                            return 'No asignado';
                                                                        })()}
                                                                    </TableCell>

                                                                    {/* Status change dates for Group (empty/dash since it aggregates multiple cuttings) */}
                                                                    <TableCell className="text-center align-middle text-xs text-muted-foreground">
                                                                        -
                                                                    </TableCell>
                                                                    <TableCell className="text-center align-middle text-xs text-muted-foreground">
                                                                        -
                                                                    </TableCell>
                                                                    <TableCell className="text-center align-middle text-xs text-muted-foreground">
                                                                        -
                                                                    </TableCell>
                                                                    <TableCell className="text-center align-middle text-xs text-muted-foreground">
                                                                        -
                                                                    </TableCell>

                                                                    {/* Comments */}
                                                                    <TableCell
                                                                        className="max-w-[200px] truncate align-middle text-xs text-muted-foreground"
                                                                        title={group.items
                                                                            .map(
                                                                                (
                                                                                    i,
                                                                                ) =>
                                                                                    i.comments,
                                                                            )
                                                                            .filter(
                                                                                Boolean,
                                                                            )
                                                                            .join(
                                                                                ' | ',
                                                                            )}
                                                                    >
                                                                        {Array.from(
                                                                            new Set(
                                                                                group.items
                                                                                    .map(
                                                                                        (
                                                                                            i,
                                                                                        ) =>
                                                                                            i.comments,
                                                                                    )
                                                                                    .filter(
                                                                                        Boolean,
                                                                                    ),
                                                                            ),
                                                                        ).join(
                                                                            ' | ',
                                                                        ) ||
                                                                            '-'}
                                                                    </TableCell>

                                                                    {/* Toggle collapse action */}
                                                                    <TableCell className="text-right align-middle">
                                                                        <Button
                                                                            variant="link"
                                                                            size="sm"
                                                                            className="h-7 text-xs font-semibold text-primary"
                                                                        >
                                                                            {isExpanded
                                                                                ? 'Colapsar ▲'
                                                                                : 'Expandir ▼'}
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>

                                                                {/* Individual Items */}
                                                                {isExpanded &&
                                                                    group.items.map(
                                                                        (c) => (
                                                                            <TableRow
                                                                                key={
                                                                                    c.id
                                                                                }
                                                                                className="group border-l-4 border-l-primary/30 bg-slate-50/20 transition-colors hover:bg-slate-50/50 dark:bg-slate-900/10 dark:hover:bg-slate-900/20"
                                                                            >
                                                                                {/* Cassette Code */}
                                                                                <TableCell className="pl-6 align-middle">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <span className="text-xs text-muted-foreground/60">
                                                                                            ↳
                                                                                        </span>
                                                                                        <span
                                                                                            className="inline-flex items-center justify-center rounded border border-slate-300/30 px-2.5 py-1 text-xs font-bold shadow-sm"
                                                                                            style={{
                                                                                                backgroundColor:
                                                                                                    c.cassette_color ||
                                                                                                    '#e2e8f0',
                                                                                                color: getContrastColor(
                                                                                                    c.cassette_color ||
                                                                                                        '#e2e8f0',
                                                                                                ),
                                                                                            }}
                                                                                        >
                                                                                            {c
                                                                                                .code
                                                                                                ?.code ||
                                                                                                '-'}
                                                                                        </span>
                                                                                    </div>
                                                                                </TableCell>

                                                                                {/* Status */}
                                                                                <TableCell className="align-middle">
                                                                                    {getStatusBadge(
                                                                                        c.status,
                                                                                    )}
                                                                                </TableCell>

                                                                                {/* New Cut */}
                                                                                <TableCell className="align-middle">
                                                                                    {c.is_new_cut ? (
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                                                        >
                                                                                            Sí
                                                                                        </Badge>
                                                                                    ) : (
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className="border-red-200 bg-red-50 text-red-700 dark:border-red-950 dark:bg-red-950/20 dark:text-red-400"
                                                                                        >
                                                                                            No
                                                                                        </Badge>
                                                                                    )}
                                                                                </TableCell>

                                                                                {/* Description */}
                                                                                <TableCell className="align-middle font-medium text-slate-700 dark:text-slate-300">
                                                                                    {c.description ||
                                                                                        '-'}
                                                                                </TableCell>

                                                                                {/* Number of Cuttings */}
                                                                                <TableCell className="text-right align-middle font-mono">
                                                                                    {c
                                                                                        .prefix
                                                                                        ?.prefix
                                                                                        ? `${c.prefix.prefix} `
                                                                                        : ''}
                                                                                    {c.number_of_cuttings >
                                                                                        0 && (
                                                                                        <span className="ml-1 rounded-sm border border-gray-200 bg-gray-100 px-1 font-bold text-gray-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                                                                                            {
                                                                                                c.number_of_cuttings
                                                                                            }
                                                                                        </span>
                                                                                    )}
                                                                                </TableCell>

                                                                                {/* Cuttings Description */}
                                                                                <TableCell className="align-middle text-slate-600 dark:text-slate-400">
                                                                                    {c.cuttings_description || (
                                                                                        <span className="text-xs text-muted-foreground italic">
                                                                                            N/A
                                                                                        </span>
                                                                                    )}
                                                                                </TableCell>

                                                                                {/* Number of Slides */}
                                                                                <TableCell className="text-right align-middle font-mono font-medium">
                                                                                    {c.number_of_slides ??
                                                                                        0}
                                                                                </TableCell>

                                                                                {/* Special Stains */}
                                                                                <TableCell className="align-middle">
                                                                                    {c.special_stains ? (
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {c.special_stains
                                                                                                .split(
                                                                                                    ', ',
                                                                                                )
                                                                                                .map(
                                                                                                    (
                                                                                                        stain,
                                                                                                        idx,
                                                                                                    ) => (
                                                                                                        <Badge
                                                                                                            key={
                                                                                                                idx
                                                                                                            }
                                                                                                            variant="outline"
                                                                                                            className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-400"
                                                                                                        >
                                                                                                            {
                                                                                                                stain
                                                                                                            }
                                                                                                        </Badge>
                                                                                                    ),
                                                                                                )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-xs text-muted-foreground italic">
                                                                                            Ninguna
                                                                                        </span>
                                                                                    )}
                                                                                </TableCell>

                                                                                {/* Responsible */}
                                                                                <TableCell className="align-middle text-xs">
                                                                                    {c.responsible ? (
                                                                                        <div className="flex flex-col">
                                                                                            <span className="font-medium text-foreground">
                                                                                                {
                                                                                                    c
                                                                                                        .responsible
                                                                                                        .name
                                                                                                }
                                                                                            </span>
                                                                                            <span className="text-[10px] text-muted-foreground">
                                                                                                {c
                                                                                                    .responsible
                                                                                                    .role
                                                                                                    ?.name ||
                                                                                                    'Sin Rol'}
                                                                                            </span>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-xs text-muted-foreground italic">
                                                                                            N/A
                                                                                        </span>
                                                                                    )}
                                                                                </TableCell>

                                                                                {/* Status change dates */}
                                                                                <TableCell className="text-center align-middle">
                                                                                    {formatStatusDate(
                                                                                        c.macroscopy_date,
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="text-center align-middle">
                                                                                    {formatStatusDate(
                                                                                        c.processing_date,
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="text-center align-middle">
                                                                                    {formatStatusDate(
                                                                                        c.delivery_date,
                                                                                    )}
                                                                                </TableCell>

                                                                                {/* Created At */}
                                                                                <TableCell className="text-center align-middle">
                                                                                    {formatStatusDate(
                                                                                        c.created_at,
                                                                                    )}
                                                                                </TableCell>

                                                                                {/* Comments */}
                                                                                <TableCell className="max-w-[200px] truncate align-middle text-xs">
                                                                                    {c.comments || (
                                                                                        <span className="text-muted-foreground italic">
                                                                                            N/A
                                                                                        </span>
                                                                                    )}
                                                                                </TableCell>

                                                                                {/* Acciones */}
                                                                                <TableCell className="text-right align-middle" />
                                                                            </TableRow>
                                                                        ),
                                                                    )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                            </React.Fragment>
                                        );
                                    },
                                )
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Specimen View Sheet */}
            {selectedSpecimenForView && (
                <SpecimenViewSheet
                    specimen={selectedSpecimenForView}
                    open={isSpecimenViewSheetOpen}
                    onOpenChange={setIsSpecimenViewSheetOpen}
                />
            )}
        </>
    );
}
