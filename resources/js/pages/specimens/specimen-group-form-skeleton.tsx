import { Skeleton } from '@/components/ui/skeleton';

export default function SpecimenGroupFormSkeleton({
    isEditing = false,
}: {
    isEditing?: boolean;
}) {
    return (
        <div
            className="flex animate-pulse flex-col gap-6 px-5 py-4 pt-0"
            data-testid="specimen-group-form-skeleton"
        >
            {/* Top Container / Customer Section */}
            <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-64" />
                    </div>
                    {isEditing && <Skeleton className="h-7 w-32 rounded-md" />}
                </div>

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

            {/* Specimen Items Section */}
            <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="h-8 w-36 rounded-md" />
                </div>

                {/* Simulated 2 Specimen Item Cards */}
                <div className="space-y-3">
                    <div className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-4">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Skeleton className="h-9 w-full rounded-md" />
                            <Skeleton className="h-9 w-full rounded-md" />
                            <Skeleton className="h-9 w-full rounded-md" />
                        </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-4">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Skeleton className="h-9 w-full rounded-md" />
                            <Skeleton className="h-9 w-full rounded-md" />
                            <Skeleton className="h-9 w-full rounded-md" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Consolidated Totals Card */}
            <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                <Skeleton className="h-4 w-44" />
                <div className="space-y-2 pt-2">
                    <div className="flex justify-between">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3.5 w-16" />
                    </div>
                    <div className="flex justify-between">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3.5 w-16" />
                    </div>
                    <div className="flex justify-between border-t pt-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
                <Skeleton className="h-10 w-28 rounded-md" />
                <Skeleton className="h-10 w-48 rounded-md" />
            </div>
        </div>
    );
}
