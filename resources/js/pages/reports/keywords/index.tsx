import { Head } from '@inertiajs/react';
import {
    FileSearch,
    Search,
    X,
    RotateCcw,
    Download,
    Copy,
    Eye,
    Loader2,
    Sparkles,
    Check,
    Microscope,
    FileText,
    ChevronDown,
} from 'lucide-react';
import React, {
    useState,
    useRef,
    useCallback,
    useEffect,
    useMemo,
} from 'react';
import { toast } from 'sonner';
import { DateRangePicker } from '@/components/date-range-picker';
import { Pagination } from '@/components/pagination';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ReportPreviewSheet } from './components/report-preview-sheet';

interface CatalogItem {
    id: number;
    name: string;
    specimen_type?: number;
    specimen_type_id?: number;
}

interface KeywordSearchResult {
    id: number;
    sequence_code: string;
    patient_name: string;
    patient_id: string;
    specimen_type: string;
    examination: string;
    keyword_context: string;
    keyword_context_clean: string;
    matched_field: string;
    report_date: string;
    pathologists: string;
    status: string;
    status_label: string;
    status_color: string;
    has_report: boolean;
}

interface KeywordSearchReportPageProps {
    filters: {
        search?: string;
        date_from?: string;
        date_to?: string;
        specimen_type_id?: string | string[];
        examination_id?: string | string[];
        pathologist_id?: string;
    };
    specimenTypes: CatalogItem[];
    examinations: CatalogItem[];
    pathologists: CatalogItem[];
}

const parseInitialIds = (rawFilter: any, allItems: CatalogItem[]): string[] => {
    if (
        rawFilter === 'none' ||
        (Array.isArray(rawFilter) && rawFilter.length === 0)
    ) {
        return [];
    }

    if (rawFilter === undefined || rawFilter === null || rawFilter === 'all') {
        return allItems.map((item) => item.id.toString());
    }

    if (Array.isArray(rawFilter)) {
        return rawFilter.map((id) => id.toString());
    }

    return [rawFilter.toString()];
};

const getSpecimenTypeId = (exam: any): string | null => {
    const typeId = exam.specimen_type || exam.specimen_type_id || exam.type?.id;

    return typeId ? typeId.toString() : null;
};

const HighlightKeyword: React.FC<{ text: string; term: string }> = ({
    text,
    term,
}) => {
    if (!term || !term.trim()) {
        return <span>{text}</span>;
    }

    const trimmedTerm = term.trim();
    const escapedTerm = trimmedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark
                        key={i}
                        className="rounded bg-amber-200/90 px-1 py-0.5 font-semibold text-amber-950 dark:bg-amber-900/60 dark:text-amber-200"
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                ),
            )}
        </span>
    );
};

export default function KeywordSearchReportPage({
    filters: initialFilters,
    specimenTypes = [],
    examinations = [],
    pathologists = [],
}: KeywordSearchReportPageProps) {
    const [search, setSearch] = useState(initialFilters.search || '');
    const [activeSearchTerm, setActiveSearchTerm] = useState(
        initialFilters.search || '',
    );
    const [dateFrom, setDateFrom] = useState(initialFilters.date_from || '');
    const [dateTo, setDateTo] = useState(initialFilters.date_to || '');

    const [selectedSpecimenTypeIds, setSelectedSpecimenTypeIds] = useState<
        string[]
    >(() => parseInitialIds(initialFilters.specimen_type_id, specimenTypes));
    const [selectedExaminationIds, setSelectedExaminationIds] = useState<
        string[]
    >(() => parseInitialIds(initialFilters.examination_id, examinations));
    const [selectedPathologist, setSelectedPathologist] = useState(
        initialFilters.pathologist_id || 'all',
    );

    const [results, setResults] = useState<KeywordSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [copiedRowId, setCopiedRowId] = useState<number | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Preview Sheet State
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewSpecimenCode, setPreviewSpecimenCode] = useState<
        string | null
    >(null);
    const [previewPatientName, setPreviewPatientName] = useState<
        string | undefined
    >(undefined);

    const abortControllerRef = useRef<AbortController | null>(null);

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
    };

    const handleExaminationSelectionChange = (nextExamIds: string[]) => {
        setSelectedExaminationIds(nextExamIds);
    };

    const totalPages = Math.max(1, Math.ceil(results.length / itemsPerPage));

    const paginatedResults = useMemo<KeywordSearchResult[]>(() => {
        const start = (currentPage - 1) * itemsPerPage;

        return results.slice(start, start + itemsPerPage);
    }, [results, currentPage, itemsPerPage]);

    const paginationLinks = useMemo(() => {
        if (results.length === 0) {
            return [];
        }

        const links: { url: string | null; label: string; active: boolean }[] =
            [];

        // Previous
        links.push({
            url: currentPage > 1 ? String(currentPage - 1) : null,
            label: '&laquo; Previous',
            active: false,
        });

        // Window of pages around currentPage
        const delta = 2;
        const start = Math.max(1, currentPage - delta);
        const end = Math.min(totalPages, currentPage + delta);

        if (start > 1) {
            links.push({ url: '1', label: '1', active: currentPage === 1 });

            if (start > 2) {
                links.push({ url: null, label: '...', active: false });
            }
        }

        for (let p = start; p <= end; p++) {
            links.push({
                url: String(p),
                label: String(p),
                active: p === currentPage,
            });
        }

        if (end < totalPages) {
            if (end < totalPages - 1) {
                links.push({ url: null, label: '...', active: false });
            }

            links.push({
                url: String(totalPages),
                label: String(totalPages),
                active: currentPage === totalPages,
            });
        }

        // Next
        links.push({
            url: currentPage < totalPages ? String(currentPage + 1) : null,
            label: 'Next &raquo;',
            active: false,
        });

        return links;
    }, [results.length, currentPage, totalPages]);

    const meta = useMemo(() => {
        if (results.length === 0) {
            return { from: 0, to: 0, total: 0 };
        }

        return {
            from: (currentPage - 1) * itemsPerPage + 1,
            to: Math.min(currentPage * itemsPerPage, results.length),
            total: results.length,
        };
    }, [results.length, currentPage, itemsPerPage]);

    const runSearch = useCallback(
        async (customParams?: {
            search?: string;
            date_from?: string;
            date_to?: string;
            specimen_type_ids?: string[];
            examination_ids?: string[];
            pathologist_id?: string;
        }) => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;

            const currentSearch =
                customParams?.search !== undefined
                    ? customParams.search
                    : search;
            const currentDateFrom =
                customParams?.date_from !== undefined
                    ? customParams.date_from
                    : dateFrom;
            const currentDateTo =
                customParams?.date_to !== undefined
                    ? customParams.date_to
                    : dateTo;
            const currentTypes =
                customParams?.specimen_type_ids !== undefined
                    ? customParams.specimen_type_ids
                    : selectedSpecimenTypeIds;
            const currentExams =
                customParams?.examination_ids !== undefined
                    ? customParams.examination_ids
                    : selectedExaminationIds;
            const currentPathologist =
                customParams?.pathologist_id !== undefined
                    ? customParams.pathologist_id
                    : selectedPathologist;

            setActiveSearchTerm(currentSearch);
            setResults([]);
            setCurrentPage(1);
            setIsSearching(true);
            setHasSearched(true);

            const queryParams = new URLSearchParams();

            if (currentSearch.trim()) {
                queryParams.set('search', currentSearch.trim());
            }

            if (currentDateFrom) {
                queryParams.set('date_from', currentDateFrom);
            }

            if (currentDateTo) {
                queryParams.set('date_to', currentDateTo);
            }

            if (currentTypes.length === 0) {
                queryParams.set('specimen_type_id', 'none');
            } else if (currentTypes.length < specimenTypes.length) {
                currentTypes.forEach((id) =>
                    queryParams.append('specimen_type_id[]', id),
                );
            }

            if (currentExams.length === 0) {
                queryParams.set('examination_id', 'none');
            } else if (currentExams.length < examinations.length) {
                currentExams.forEach((id) =>
                    queryParams.append('examination_id[]', id),
                );
            }

            if (currentPathologist && currentPathologist !== 'all') {
                queryParams.set('pathologist_id', currentPathologist);
            }

            try {
                const response = await fetch(
                    `/reports/keywords/stream?${queryParams.toString()}`,
                    {
                        signal: controller.signal,
                        headers: {
                            Accept: 'application/x-ndjson',
                        },
                    },
                );

                if (!response.ok) {
                    throw new Error(
                        `Error en el servidor (${response.status})`,
                    );
                }

                const reader = response.body?.getReader();

                if (!reader) {
                    setIsSearching(false);

                    return;
                }

                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    const batch: KeywordSearchResult[] = [];

                    for (const line of lines) {
                        const trimmed = line.trim();

                        if (!trimmed) {
                            continue;
                        }

                        try {
                            const parsed = JSON.parse(trimmed);

                            if (parsed.type === 'result' && parsed.data) {
                                batch.push(parsed.data);
                            } else if (parsed.type === 'done') {
                                setIsSearching(false);
                            }
                        } catch {
                            // Ignore line fragment JSON errors
                        }
                    }

                    if (batch.length > 0) {
                        setResults((prev) => [...prev, ...batch]);
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Error in keyword stream search:', err);
                    toast.error(
                        'Ocurrió un error al buscar los informes patológicos.',
                    );
                }
            } finally {
                if (abortControllerRef.current === controller) {
                    setIsSearching(false);
                }
            }
        },
        [
            search,
            dateFrom,
            dateTo,
            selectedSpecimenTypeIds,
            selectedExaminationIds,
            selectedPathologist,
            specimenTypes.length,
            examinations.length,
        ],
    );

    // Initial search if query param provided
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        if (initialFilters.search) {
            timer = setTimeout(() => {
                runSearch({ search: initialFilters.search });
            }, 0);
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }

            abortControllerRef.current?.abort();
        };
    }, [initialFilters.search, runSearch]);

    const handleClearFilters = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        setSearch('');
        setActiveSearchTerm('');
        setSelectedSpecimenTypeIds(specimenTypes.map((t) => t.id.toString()));
        setSelectedExaminationIds(examinations.map((e) => e.id.toString()));
        setSelectedPathologist('all');
        setResults([]);
        setCurrentPage(1);
        setIsSearching(false);
        setHasSearched(false);
    };

    const handleExportExcel = () => {
        const queryParams = new URLSearchParams();

        if (search.trim()) {
            queryParams.set('search', search.trim());
        }

        if (dateFrom) {
            queryParams.set('date_from', dateFrom);
        }

        if (dateTo) {
            queryParams.set('date_to', dateTo);
        }

        if (selectedSpecimenTypeIds.length === 0) {
            queryParams.set('specimen_type_id', 'none');
        } else if (selectedSpecimenTypeIds.length < specimenTypes.length) {
            selectedSpecimenTypeIds.forEach((id) =>
                queryParams.append('specimen_type_id[]', id),
            );
        }

        if (selectedExaminationIds.length === 0) {
            queryParams.set('examination_id', 'none');
        } else if (selectedExaminationIds.length < examinations.length) {
            selectedExaminationIds.forEach((id) =>
                queryParams.append('examination_id[]', id),
            );
        }

        if (selectedPathologist && selectedPathologist !== 'all') {
            queryParams.set('pathologist_id', selectedPathologist);
        }

        window.location.href = `/reports/keywords/export?${queryParams.toString()}`;
    };

    const handleCopySnippet = (rowId: number, textToCopy: string) => {
        navigator.clipboard.writeText(textToCopy);
        setCopiedRowId(rowId);
        toast.success('Fragmento copiado al portapapeles');
        setTimeout(() => setCopiedRowId(null), 2000);
    };

    const handleOpenPreview = (item: KeywordSearchResult) => {
        setPreviewSpecimenCode(item.sequence_code);
        setPreviewPatientName(item.patient_name);
        setPreviewOpen(true);
    };

    return (
        <>
            <Head title="Reporte de Palabras Clave" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* 1. Page Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <FileSearch className="h-5 w-5" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Reporte de Palabras Claves
                            </h1>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Consulte los informes patológicos que contienen la
                            palabra clave o comentario específico dentro del
                            texto del informe.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleClearFilters}
                            className="h-10 px-4 text-sm"
                            disabled={isSearching}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" /> Limpiar
                            filtros
                        </Button>
                        <Button
                            onClick={handleExportExcel}
                            className="h-10 px-4 text-sm"
                        >
                            <Download className="mr-2 h-4 w-4" /> Exportar a
                            Excel
                        </Button>
                    </div>
                </div>

                {/* 2. Filter Bar (Search Engine Like) */}
                <div className="flex flex-col gap-4">
                    {/* Top Row: Search Input + Date Range Picker */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        {/* Search Input (Takes 7 cols on lg) */}
                        <div className="flex flex-col gap-1.5 lg:col-span-7">
                            <label className="text-xs font-semibold text-muted-foreground">
                                Buscar palabra clave
                            </label>
                            <div className="relative w-full">
                                <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            runSearch();
                                        }
                                    }}
                                    placeholder="ej. márgenes, adenocarcinoma, positivo, necrosis, atipia..."
                                    className="h-10 pr-9 pl-9"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute top-2.5 right-3 text-muted-foreground transition-colors hover:text-foreground"
                                        title="Limpiar texto"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Date Range Picker (Takes 5 cols on lg) */}
                        <div className="flex flex-col gap-1.5 lg:col-span-5">
                            <label className="text-xs font-semibold text-muted-foreground">
                                Rango de fechas del informe
                            </label>
                            <DateRangePicker
                                cookieKey="date_filter_report_keywords"
                                value={{
                                    from: dateFrom,
                                    to: dateTo,
                                }}
                                onChange={(range) => {
                                    setDateFrom(range.from || '');
                                    setDateTo(range.to || '');
                                }}
                            />
                        </div>
                    </div>

                    {/* Bottom Row: Specimen Type + Examination + Pathologist + Search Button */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* 1. Tipo de Muestra */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Tipo de Muestra
                            </span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Microscope className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="truncate">
                                                Tipos (
                                                {selectedSpecimenTypeIds.length}
                                                )
                                            </span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[--radix-popover-trigger-width] min-w-[240px] p-0"
                                    align="start"
                                >
                                    <Command
                                        filter={(value, search) => {
                                            const v = value
                                                .toLowerCase()
                                                .normalize('NFD')
                                                .replace(
                                                    /[\u0300-\u036f]/g,
                                                    '',
                                                );
                                            const s = search
                                                .toLowerCase()
                                                .normalize('NFD')
                                                .replace(
                                                    /[\u0300-\u036f]/g,
                                                    '',
                                                );

                                            return v.includes(s) ? 1 : 0;
                                        }}
                                    >
                                        <CommandInput placeholder="Buscar tipo de muestra..." />
                                        <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground">
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
                                        <CommandList>
                                            <CommandEmpty>
                                                No se encontraron resultados.
                                            </CommandEmpty>
                                            <CommandGroup className="max-h-60 overflow-y-auto">
                                                {specimenTypes.map((type) => {
                                                    const isChecked =
                                                        selectedSpecimenTypeIds.includes(
                                                            type.id.toString(),
                                                        );

                                                    return (
                                                        <CommandItem
                                                            key={type.id}
                                                            value={type.name}
                                                            onSelect={() => {
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
                                                            className="flex cursor-pointer items-center gap-2"
                                                        >
                                                            <Checkbox
                                                                checked={
                                                                    isChecked
                                                                }
                                                                className="pointer-events-none"
                                                                onCheckedChange={() => {}}
                                                            />
                                                            <span className="truncate">
                                                                {type.name}
                                                            </span>
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* 2. Examen / Análisis */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Examen / Análisis
                            </span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="truncate">
                                                Análisis (
                                                {selectedExaminationIds.length})
                                            </span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[--radix-popover-trigger-width] min-w-[240px] p-0"
                                    align="start"
                                >
                                    <Command
                                        filter={(value, search) => {
                                            const v = value
                                                .toLowerCase()
                                                .normalize('NFD')
                                                .replace(
                                                    /[\u0300-\u036f]/g,
                                                    '',
                                                );
                                            const s = search
                                                .toLowerCase()
                                                .normalize('NFD')
                                                .replace(
                                                    /[\u0300-\u036f]/g,
                                                    '',
                                                );

                                            return v.includes(s) ? 1 : 0;
                                        }}
                                    >
                                        <CommandInput placeholder="Buscar análisis / examen..." />
                                        <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground">
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
                                        <CommandList>
                                            <CommandEmpty>
                                                {selectedSpecimenTypeIds.length ===
                                                0
                                                    ? 'Seleccione un tipo de muestra primero.'
                                                    : 'No se encontraron resultados.'}
                                            </CommandEmpty>
                                            <CommandGroup className="max-h-60 overflow-y-auto">
                                                {filteredExaminationsForDropdown.map(
                                                    (exam) => {
                                                        const isChecked =
                                                            selectedExaminationIds.includes(
                                                                exam.id.toString(),
                                                            );

                                                        return (
                                                            <CommandItem
                                                                key={exam.id}
                                                                value={
                                                                    exam.name
                                                                }
                                                                onSelect={() => {
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
                                                                className="flex cursor-pointer items-center gap-2"
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
                                                            </CommandItem>
                                                        );
                                                    },
                                                )}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* 3. Patólogo */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Patólogo
                            </span>
                            <Select
                                value={selectedPathologist}
                                onValueChange={setSelectedPathologist}
                            >
                                <SelectTrigger className="h-10 w-full">
                                    <SelectValue placeholder="Todos los patólogos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los patólogos
                                    </SelectItem>
                                    {pathologists.map((p) => (
                                        <SelectItem
                                            key={p.id}
                                            value={p.id.toString()}
                                        >
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Buscar Button */}
                        <div className="flex items-end">
                            <Button
                                onClick={() => runSearch()}
                                className="h-10 w-full px-6 text-sm font-semibold shadow-xs"
                                disabled={isSearching}
                            >
                                {isSearching ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Buscando...
                                    </>
                                ) : (
                                    <>
                                        <Search className="mr-2 h-4 w-4" />
                                        Buscar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 3. Results Section */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold tracking-tight">
                                    Resultados ({results.length})
                                </h2>
                                {isSearching && (
                                    <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
                                        Buscando en tiempo real...
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Informes patológicos que contienen la palabra
                                clave buscada.
                            </p>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="relative overflow-x-auto rounded-md border bg-card">
                        {/* Active Progress Bar when searching */}
                        {isSearching && (
                            <div className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary/20">
                                <div className="h-full w-full animate-pulse bg-primary" />
                            </div>
                        )}

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">
                                        Paciente
                                    </TableHead>
                                    <TableHead className="w-[130px]">
                                        ID/RTN
                                    </TableHead>
                                    <TableHead className="w-[160px] min-w-[160px] whitespace-nowrap">
                                        Código de la Muestra
                                    </TableHead>
                                    <TableHead className="w-[140px]">
                                        Tipo de Muestra
                                    </TableHead>
                                    <TableHead className="w-[160px]">
                                        Análisis
                                    </TableHead>
                                    <TableHead className="min-w-[280px]">
                                        Palabras Clave (contexto)
                                    </TableHead>
                                    <TableHead className="w-[120px] text-center">
                                        Fecha del Informe
                                    </TableHead>
                                    <TableHead className="w-[150px]">
                                        Patólogo
                                    </TableHead>
                                    <TableHead className="w-[100px] text-center">
                                        Estado
                                    </TableHead>
                                    <TableHead className="z-10 w-[80px] min-w-[80px] border-l border-border bg-card text-right md:sticky md:right-0">
                                        Ver
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Streamed Results */}
                                {paginatedResults.length > 0 &&
                                    paginatedResults.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            className="group transition-colors"
                                        >
                                            <TableCell className="font-medium text-foreground">
                                                {row.patient_name}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {row.patient_id}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <span className="inline-block rounded border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-mono text-xs font-bold tracking-wide whitespace-nowrap text-primary">
                                                    {row.sequence_code}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {row.specimen_type}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {row.examination}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5 py-1">
                                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                                        <HighlightKeyword
                                                            text={
                                                                row.keyword_context
                                                            }
                                                            term={
                                                                activeSearchTerm
                                                            }
                                                        />
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 gap-1 px-2 text-[11px]"
                                                            onClick={() =>
                                                                handleCopySnippet(
                                                                    row.id,
                                                                    row.keyword_context_clean ||
                                                                        row.keyword_context,
                                                                )
                                                            }
                                                        >
                                                            {copiedRowId ===
                                                            row.id ? (
                                                                <>
                                                                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                                                    <span className="text-emerald-600 dark:text-emerald-400">
                                                                        Copiado
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="h-3 w-3" />
                                                                    Copiar
                                                                </>
                                                            )}
                                                        </Button>
                                                        {row.matched_field && (
                                                            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                                {
                                                                    row.matched_field
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-xs text-muted-foreground">
                                                {row.report_date}
                                            </TableCell>
                                            <TableCell className="text-xs font-medium">
                                                {row.pathologists}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span
                                                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow-xs"
                                                    style={{
                                                        backgroundColor:
                                                            row.status_color,
                                                    }}
                                                >
                                                    {row.status_label}
                                                </span>
                                            </TableCell>
                                            <TableCell className="z-10 w-[80px] min-w-[80px] border-l border-border bg-card text-right transition-colors group-hover:bg-muted md:sticky md:right-0">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleOpenPreview(row)
                                                    }
                                                    className="h-8 gap-1.5 px-2.5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Ver
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                {/* Shadow Loader Skeleton Rows (While searching) */}
                                {isSearching && (
                                    <>
                                        {Array.from({
                                            length:
                                                results.length === 0 ? 5 : 3,
                                        }).map((_, i) => (
                                            <TableRow
                                                key={`skeleton-${i}`}
                                                className="group opacity-70"
                                            >
                                                <TableCell>
                                                    <Skeleton className="h-4 w-32" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-24" />
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <Skeleton className="h-5 w-28 rounded" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-24" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-28" />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1.5">
                                                        <Skeleton className="h-4 w-full" />
                                                        <Skeleton className="h-4 w-3/4" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Skeleton className="mx-auto h-4 w-16" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-24" />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Skeleton className="mx-auto h-5 w-16 rounded-full" />
                                                </TableCell>
                                                <TableCell className="z-10 w-[80px] min-w-[80px] border-l border-border bg-card text-right md:sticky md:right-0">
                                                    <Skeleton className="ml-auto h-8 w-14 rounded" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                )}

                                {/* Empty State: Initial (Before first search) */}
                                {!hasSearched &&
                                    !isSearching &&
                                    results.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={10}
                                                className="h-48 text-center"
                                            >
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                        <Sparkles className="h-6 w-6" />
                                                    </div>
                                                    <h3 className="text-base font-semibold">
                                                        Buscador de Informes
                                                        Patológicos
                                                    </h3>
                                                    <p className="max-w-md text-xs text-muted-foreground">
                                                        Ingrese una palabra
                                                        clave (por ejemplo:
                                                        diagnósticos, márgenes,
                                                        necrosis) o seleccione
                                                        filtros y haga clic en{' '}
                                                        <strong>Buscar</strong>{' '}
                                                        para consultar los
                                                        informes.
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}

                                {/* Empty State: No results after search */}
                                {hasSearched &&
                                    !isSearching &&
                                    results.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={10}
                                                className="h-48 text-center text-muted-foreground"
                                            >
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Search className="h-10 w-10 text-muted-foreground/50" />
                                                    <h3 className="text-base font-semibold text-foreground">
                                                        No se encontraron
                                                        resultados
                                                    </h3>
                                                    <p className="max-w-md text-xs text-muted-foreground">
                                                        No se encontraron
                                                        informes patológicos que
                                                        contengan el término
                                                        especificado con los
                                                        filtros aplicados.
                                                        Intente con otra palabra
                                                        clave o amplíe el rango
                                                        de fechas.
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                            </TableBody>
                        </Table>
                    </div>

                    {results.length > 0 && (
                        <Pagination
                            links={paginationLinks}
                            meta={meta}
                            perPageOptions={[15, 30, 50]}
                            currentPerPage={itemsPerPage}
                            onPerPageChange={(perPage) => {
                                setItemsPerPage(perPage);
                                setCurrentPage(1);
                            }}
                            onPageChange={(target) => {
                                const pageNum = Number(target);

                                if (
                                    !isNaN(pageNum) &&
                                    pageNum >= 1 &&
                                    pageNum <= totalPages
                                ) {
                                    setCurrentPage(pageNum);
                                }
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Independent PDF Preview Sheet */}
            <ReportPreviewSheet
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                specimenCode={previewSpecimenCode}
                patientName={previewPatientName}
            />
        </>
    );
}
