import { Microscope, UserPlus, Share2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export default function SpecimenPathologistSkeleton() {
    return (
        <div
            className="flex animate-pulse flex-col gap-6 px-5 pr-2 pb-8"
            data-testid="specimen-pathologist-skeleton"
        >
            {/* Specimen Resume Card Skeleton */}
            <div className="space-y-4 rounded-lg border border-border/80 bg-muted/30 p-5 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    <Microscope className="h-4 w-4 text-muted-foreground/60" />
                    <Skeleton className="h-4 w-44" />
                </h3>
                <Separator className="opacity-60" />

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                    {/* Sequence Code */}
                    <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-5 w-36" />
                    </div>

                    {/* Patient */}
                    <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-20" />
                        <Skeleton className="h-5 w-48" />
                    </div>

                    {/* Examination */}
                    <div className="space-y-1.5 sm:col-span-2">
                        <Skeleton className="h-3.5 w-16" />
                        <Skeleton className="h-5 w-64" />
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-16" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                    </div>

                    {/* Priority */}
                    <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-20" />
                        <div className="flex items-center gap-2 pt-0.5">
                            <Skeleton className="h-3 w-3 rounded-full" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Pathologist Assignment Box Skeleton */}
            <div className="space-y-3.5 rounded-lg border border-border/60 bg-muted/20 p-4 shadow-sm">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <UserPlus className="h-4 w-4 text-muted-foreground/60" />
                    <Skeleton className="h-4 w-40" />
                </div>

                <div className="flex flex-col gap-4">
                    <Skeleton className="h-11 w-full rounded-md" />

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            <div className="flex items-center space-x-2">
                                <Skeleton className="h-5 w-9 rounded-full" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Skeleton className="h-5 w-9 rounded-full" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </div>
                        <Skeleton className="h-9 w-24 rounded-md" />
                    </div>
                </div>
            </div>

            {/* Assigned Pathologists Table Skeleton */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Microscope className="h-4 w-4 text-muted-foreground/60" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                </div>

                <div className="overflow-hidden rounded-md border border-border/60">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead className="w-[200px]">
                                    <Skeleton className="h-4 w-20" />
                                </TableHead>
                                <TableHead className="text-center">
                                    <Skeleton className="mx-auto h-4 w-24" />
                                </TableHead>
                                <TableHead className="text-center">
                                    <Skeleton className="mx-auto h-4 w-24" />
                                </TableHead>
                                <TableHead className="w-[80px] text-right">
                                    <Skeleton className="ml-auto h-4 w-12" />
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 2 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <div className="flex items-center gap-2.5">
                                            <Skeleton className="h-8 w-8 rounded-full" />
                                            <div className="space-y-1">
                                                <Skeleton className="h-4 w-28" />
                                                <Skeleton className="h-3 w-36" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="mx-auto h-5 w-9 rounded-full" />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="mx-auto h-5 w-9 rounded-full" />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Collaborators Assignment Box Skeleton */}
            <div className="space-y-3.5 rounded-lg border border-border/60 bg-muted/20 p-4 shadow-sm">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <Share2 className="h-4 w-4 text-muted-foreground/60" />
                    <Skeleton className="h-4 w-44" />
                </div>

                <div className="flex flex-col gap-4">
                    <Skeleton className="h-11 w-full rounded-md" />

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            <div className="flex items-center space-x-2">
                                <Skeleton className="h-5 w-9 rounded-full" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Skeleton className="h-5 w-9 rounded-full" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </div>
                        <Skeleton className="h-9 w-24 rounded-md" />
                    </div>
                </div>
            </div>
        </div>
    );
}
