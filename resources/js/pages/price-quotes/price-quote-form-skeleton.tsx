import { Skeleton } from '@/components/ui/skeleton';

export default function PriceQuoteFormSkeleton() {
    return (
        <div
            className="flex animate-pulse flex-col gap-6 px-5 py-4 pt-0"
            data-testid="price-quote-form-skeleton"
        >
            {/* Step indicator */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                </div>
                <Skeleton className="h-8 w-28 rounded-md" />
            </div>

            {/* General Info Card */}
            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4">
                <div className="space-y-1.5 border-b border-border/40 pb-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                </div>
            </div>

            {/* Items Card */}
            <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-52" />
                    </div>
                    <Skeleton className="h-9 w-36 rounded-md" />
                </div>

                <div className="space-y-2.5 pt-2">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between rounded-lg border bg-muted/20 p-3.5"
                        >
                            <div className="space-y-1.5">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-28" />
                            </div>
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-32 rounded-md" />
            </div>
        </div>
    );
}
