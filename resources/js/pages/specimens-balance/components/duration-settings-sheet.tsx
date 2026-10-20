import { router } from '@inertiajs/react';
import { Clock, Search, Sparkles } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { saveDurations as saveDurationsAction } from '@/actions/App/Http/Controllers/SpecimenBalanceController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import type { ExaminationOption, FilterOptions } from '../types';

interface DurationSettingsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pathologists: { id: number; name: string; email: string }[];
    currentUserId: number;
    canManage: boolean;
    filterOptions: FilterOptions;
    durationsMap: Record<number, Record<number, number>>;
}

const PRESET_DURATIONS = [
    { label: '15m', minutes: 15 },
    { label: '30m', minutes: 30 },
    { label: '45m', minutes: 45 },
    { label: '1h', minutes: 60 },
    { label: '1.5h', minutes: 90 },
    { label: '2h', minutes: 120 },
];

export const DurationSettingsSheet: React.FC<DurationSettingsSheetProps> = ({
    open,
    onOpenChange,
    pathologists,
    currentUserId,
    canManage,
    filterOptions,
    durationsMap,
}) => {
    // Selected pathologist for durations (defaults to current user if pathologist, else first pathologist)
    const [selectedPathologistId, setSelectedPathologistId] = useState<number>(
        () => {
            const hasCurrentUser = pathologists.some(
                (p) => p.id === currentUserId,
            );

            return hasCurrentUser
                ? currentUserId
                : pathologists[0]?.id || currentUserId;
        },
    );

    const [search, setSearch] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Overrides for durations: [ examId => duration_minutes ]
    const [customDurations, setCustomDurations] = useState<
        Record<number, number>
    >({});
    // Overrides for exam colors: [ examId => hexColor ]
    const [customColors, setCustomColors] = useState<Record<number, string>>(
        {},
    );

    const handleDurationChange = (examId: number, minutes: number) => {
        setCustomDurations((prev) => ({
            ...prev,
            [examId]: Math.max(1, minutes),
        }));
    };

    const handleColorChange = (examId: number, color: string) => {
        setCustomColors((prev) => ({
            ...prev,
            [examId]: color,
        }));
    };

    // Filter examinations by search and group by specimen type
    const groupedExaminations = useMemo(() => {
        const searchLower = search.toLowerCase().trim();
        const filtered = filterOptions.examinations.filter((exam) => {
            if (!searchLower) {
                return true;
            }

            return (
                exam.name.toLowerCase().includes(searchLower) ||
                (exam.type?.name &&
                    exam.type.name.toLowerCase().includes(searchLower))
            );
        });

        const groups: Record<
            number,
            { typeName: string; exams: ExaminationOption[] }
        > = {};

        filterOptions.specimenTypes.forEach((type) => {
            groups[type.id] = { typeName: type.name, exams: [] };
        });

        filtered.forEach((exam) => {
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
    }, [filterOptions, search]);

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
                    onOpenChange(false);
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
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex w-full flex-col p-0 sm:max-w-lg"
            >
                <SheetHeader className="border-b px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <SheetTitle className="text-base font-bold">
                            Configuración de Tiempos de Examen
                        </SheetTitle>
                    </div>
                    <SheetDescription className="text-xs">
                        Defina la duración estimada de cada análisis para el
                        cálculo de capacidad y carga de 8 horas.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    {/* Pathologist selector for Admin or display name */}
                    {canManage && pathologists.length > 1 ? (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">
                                Patólogo a configurar
                            </Label>
                            <Select
                                value={selectedPathologistId.toString()}
                                onValueChange={(val) =>
                                    setSelectedPathologistId(parseInt(val))
                                }
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Seleccione patólogo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {pathologists.map((p) => (
                                        <SelectItem
                                            key={p.id}
                                            value={p.id.toString()}
                                            className="text-xs"
                                        >
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="rounded-md border bg-muted/30 p-2.5 text-xs">
                            <span className="font-semibold text-foreground">
                                Patólogo:{' '}
                            </span>
                            <span className="text-muted-foreground">
                                {currentPathologist?.name || 'Usuario Actual'}
                            </span>
                        </div>
                    )}

                    {/* Search bar */}
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar tipo de examen..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 pl-8 text-xs"
                        />
                    </div>

                    {/* Examinations grouped by Specimen Type */}
                    <div className="space-y-5">
                        {groupedExaminations.map(([typeId, group]) => (
                            <div key={typeId} className="space-y-2">
                                <div className="flex items-center gap-2 border-b pb-1">
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

                                <div className="space-y-3 pt-1">
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

                                        return (
                                            <div
                                                key={exam.id}
                                                className="space-y-2 rounded-md border bg-card p-2.5 shadow-xs"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        {/* Color picker circle */}
                                                        <label
                                                            className="relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 shadow-xs transition-transform hover:scale-110"
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

                                                        <span className="truncate text-xs font-medium text-foreground">
                                                            {exam.name}
                                                        </span>
                                                    </div>

                                                    {/* Minutes input */}
                                                    <div className="flex shrink-0 items-center gap-1.5">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={1440}
                                                            value={currentMins}
                                                            onChange={(e) =>
                                                                handleDurationChange(
                                                                    exam.id,
                                                                    parseInt(
                                                                        e.target
                                                                            .value,
                                                                    ) || 0,
                                                                )
                                                            }
                                                            className="h-7 w-16 text-center text-xs font-semibold"
                                                        />
                                                        <span className="text-[11px] text-muted-foreground">
                                                            min
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Preset Pills */}
                                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                                    {PRESET_DURATIONS.map(
                                                        (preset) => {
                                                            const isSelected =
                                                                currentMins ===
                                                                preset.minutes;

                                                            return (
                                                                <button
                                                                    key={
                                                                        preset.minutes
                                                                    }
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleDurationChange(
                                                                            exam.id,
                                                                            preset.minutes,
                                                                        )
                                                                    }
                                                                    className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                                                        isSelected
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
                        ))}

                        {groupedExaminations.length === 0 && (
                            <div className="py-8 text-center text-xs text-muted-foreground">
                                No se encontraron exámenes que coincidan con la
                                búsqueda.
                            </div>
                        )}
                    </div>
                </div>

                <SheetFooter className="flex-row justify-end gap-2 border-t bg-background px-6 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="gap-1.5"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                            {isSaving
                                ? 'Guardando...'
                                : 'Guardar Configuración'}
                        </span>
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};
