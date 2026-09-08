import { Skeleton } from '@/components/ui/skeleton';

export default function InvoiceFormSkeleton({
    isGroupInvoice = false,
}: {
    isGroupInvoice?: boolean;
}) {
    return (
        <div
            className="flex animate-pulse flex-col gap-6 px-5 py-4 pt-0"
            data-testid="invoice-form-skeleton"
        >
            {/* Customer Information Card */}
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-3 w-56" />
                    </div>
                    {isGroupInvoice && (
                        <Skeleton className="h-6 w-28 rounded-full" />
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-8 w-full rounded-md" />
                    </div>
                    <div className="space-y-1.5">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-8 w-full rounded-md" />
                    </div>
                    <div className="space-y-1.5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-full rounded-md" />
                    </div>
                </div>
            </div>

            {/* Concepts / Items Table Skeleton */}
            <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-7 w-24 rounded-md" />
                </div>

                <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Method Skeleton */}
            <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                <Skeleton className="h-4 w-36" />
                <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
                    <Skeleton className="h-10 rounded-md" />
                    <Skeleton className="h-10 rounded-md" />
                    <Skeleton className="h-10 rounded-md" />
                    <Skeleton className="h-10 rounded-md" />
                </div>
                <div className="pt-2">
                    <Skeleton className="h-9 w-full rounded-md" />
                </div>
            </div>

            {/* Billing Summary Skeleton */}
            <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                <Skeleton className="h-4 w-40" />
                <div className="space-y-2 pt-1">
                    <div className="flex justify-between">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3.5 w-20" />
                    </div>
                    <div className="flex justify-between">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3.5 w-16" />
                    </div>
                    <div className="flex justify-between">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3.5 w-16" />
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-5 w-28" />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
                <Skeleton className="h-10 w-28 rounded-md" />
                <Skeleton className="h-10 w-44 rounded-md" />
            </div>
        </div>
    );
}
