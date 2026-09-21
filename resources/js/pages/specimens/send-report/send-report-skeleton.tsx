import { FileText, Mail } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export default function SendReportSkeleton() {
    return (
        <div
            className="flex animate-pulse flex-col gap-6 px-5 pr-2 pb-8"
            data-testid="send-report-skeleton"
        >
            {/* Specimen Summary Card Skeleton */}
            <div className="space-y-4 rounded-lg border border-border/80 bg-muted/30 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        <FileText className="h-4 w-4 text-muted-foreground/60" />
                        <Skeleton className="h-4 w-36" />
                    </h3>
                    <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Separator className="opacity-60" />

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                    {/* Sequence Code */}
                    <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-5 w-36 rounded" />
                    </div>

                    {/* Patient */}
                    <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-20" />
                        <Skeleton className="h-5 w-44" />
                    </div>

                    {/* Examination / Specimen Type */}
                    <div className="space-y-1.5 sm:col-span-2">
                        <Skeleton className="h-3.5 w-16" />
                        <Skeleton className="h-5 w-60" />
                    </div>

                    {/* PDF Attachment status */}
                    <div className="space-y-1.5 sm:col-span-2">
                        <Skeleton className="h-8 w-full rounded-md" />
                    </div>
                </div>
            </div>

            {/* Email Recipients Section Skeleton */}
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <Mail className="h-4 w-4 text-muted-foreground/60" />
                    <Skeleton className="h-4 w-40" />
                </div>

                <div className="space-y-3">
                    {/* Suggested emails skeleton */}
                    <div className="flex items-center gap-2 pt-1">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-6 w-32 rounded-full" />
                        <Skeleton className="h-6 w-32 rounded-full" />
                    </div>

                    {/* Tags input container */}
                    <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-md border border-input bg-background/50 p-2">
                        <Skeleton className="h-6 w-44 rounded-full" />
                        <Skeleton className="h-6 w-36 rounded-full" />
                    </div>

                    {/* Add email input row */}
                    <div className="flex gap-2">
                        <Skeleton className="h-9 flex-1 rounded-md" />
                        <Skeleton className="h-9 w-24 rounded-md" />
                    </div>
                </div>
            </div>

            {/* Subject Skeleton */}
            <div className="space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-9 w-full rounded-md" />
            </div>

            {/* Custom Message Skeleton */}
            <div className="space-y-2">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-24 w-full rounded-md" />
            </div>

            {/* Bottom Actions Skeleton */}
            <div className="flex items-center justify-end gap-3 border-t pt-4">
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-36 rounded-md" />
            </div>
        </div>
    );
}
