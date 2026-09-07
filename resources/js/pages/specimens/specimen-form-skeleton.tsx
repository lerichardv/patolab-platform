import { Skeleton } from '@/components/ui/skeleton';

export default function SpecimenFormSkeleton({
    isEditing = false,
}: {
    isEditing?: boolean;
}) {
    return (
        <div
            className="flex animate-pulse flex-col gap-6 px-5 py-4 pt-0"
            data-testid="specimen-form-skeleton"
        >
            {/* Top Container / Stepper Header */}
            <div className="mb-2 flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/30 p-4">
                {!isEditing ? (
                    <div className="mx-auto flex w-full max-w-lg items-center justify-center gap-6 border-b border-border/40 pb-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3.5 w-24" />
                            </div>
                        </div>
                        <div className="h-0.5 w-12 bg-muted" />
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3.5 w-24" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-7 w-28 rounded-md" />
                    </div>
                )}

                {/* Patient Search Section */}
                <div className="space-y-2 pt-1">
                    <div className="flex justify-between">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 flex-1 rounded-md" />
                        <Skeleton className="h-10 w-36 rounded-md" />
                    </div>
                </div>
            </div>

            {/* Specimen Main Details Grid */}
            <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                <Skeleton className="h-4 w-44" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Tipo de Muestra */}
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-28" />
                        <div className="flex gap-1.5">
                            <Skeleton className="h-9 flex-1 rounded-md" />
                            <Skeleton className="h-9 w-9 rounded-md" />
                        </div>
                    </div>

                    {/* Examen */}
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-24" />
                        <div className="flex gap-1.5">
                            <Skeleton className="h-9 flex-1 rounded-md" />
                            <Skeleton className="h-9 w-9 rounded-md" />
                        </div>
                    </div>

                    {/* Categoría */}
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-24" />
                        <div className="flex gap-1.5">
                            <Skeleton className="h-9 flex-1 rounded-md" />
                            <Skeleton className="h-9 w-9 rounded-md" />
                        </div>
                    </div>

                    {/* Médico Referidor */}
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-32" />
                        <div className="flex gap-1.5">
                            <Skeleton className="h-9 flex-1 rounded-md" />
                            <Skeleton className="h-9 w-9 rounded-md" />
                        </div>
                    </div>

                    {/* Prioridad */}
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-20" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>

                    {/* Sede / Ubicación */}
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-20" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                </div>

                {/* Dates & Sequence Row */}
                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-36" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-40" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                </div>
            </div>

            {/* Clinical Information Section */}
            <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                <Skeleton className="h-4 w-40" />
                <div className="space-y-3">
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-20 w-full rounded-md" />
                    </div>
                </div>
            </div>

            {/* Bottom Footer Actions */}
            <div className="flex justify-end gap-3 pt-2">
                <Skeleton className="h-10 w-28 rounded-md" />
                <Skeleton className="h-10 w-44 rounded-md" />
            </div>
        </div>
    );
}
