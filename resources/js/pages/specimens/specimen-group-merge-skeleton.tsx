import { Skeleton } from '@/components/ui/skeleton';

export default function SpecimenGroupMergeSkeleton() {
    return (
        <div
            className="flex animate-pulse flex-col gap-6 py-4"
            data-testid="specimen-group-merge-skeleton"
        >
            {/* Target Group Card Skeleton */}
            <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-md" />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                </div>

                <div className="space-y-2 pt-2">
                    <Skeleton className="h-3 w-28" />
                    <div className="flex flex-wrap gap-2">
                        <Skeleton className="h-6 w-24 rounded-md" />
                        <Skeleton className="h-6 w-28 rounded-md" />
                        <Skeleton className="h-6 w-20 rounded-md" />
                    </div>
                </div>
            </div>

            {/* Candidate Search & Section Skeleton */}
            <div className="space-y-3 rounded-lg border border-border/70 bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-28" />
                </div>

                <Skeleton className="h-10 w-full rounded-md" />

                {/* Candidate list items */}
                <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-4 w-16 rounded-full" />
                            </div>
                            <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-8 w-24 rounded-md" />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-4 w-16 rounded-full" />
                            </div>
                            <Skeleton className="h-3 w-52" />
                        </div>
                        <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                </div>
            </div>

            {/* Bottom Actions Skeleton */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-36 rounded-md" />
            </div>
        </div>
    );
}
