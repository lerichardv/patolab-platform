import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export default function ManageCuttingsSkeleton() {
    return (
        <div
            className="flex animate-pulse flex-col gap-4 px-5"
            data-testid="manage-cuttings-skeleton"
        >
            {/* Actions Row Skeleton */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm flex-1">
                    <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Skeleton className="h-9 w-36 rounded-md" />
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="overflow-hidden rounded-md border border-border/60 shadow-xs">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="w-[40px]">
                                <Skeleton className="h-4 w-4 rounded-xs" />
                            </TableHead>
                            <TableHead className="w-[80px]">
                                <Skeleton className="h-4 w-12" />
                            </TableHead>
                            <TableHead>
                                <Skeleton className="h-4 w-24" />
                            </TableHead>
                            <TableHead className="w-[90px]">
                                <Skeleton className="h-4 w-14" />
                            </TableHead>
                            <TableHead className="w-[120px]">
                                <Skeleton className="h-4 w-16" />
                            </TableHead>
                            <TableHead className="w-[150px]">
                                <Skeleton className="h-4 w-24" />
                            </TableHead>
                            <TableHead className="w-[130px]">
                                <Skeleton className="h-4 w-16" />
                            </TableHead>
                            <TableHead className="w-[100px] text-right">
                                <Skeleton className="ml-auto h-4 w-16" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <TableRow
                                key={index}
                                className="border-b border-border/40"
                            >
                                <TableCell>
                                    <Skeleton className="h-4 w-4 rounded-xs" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-6 w-10 rounded-full" />
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1.5">
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-8" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-5 w-20 rounded-md" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-28" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1.5">
                                        <Skeleton className="h-7 w-7 rounded-md" />
                                        <Skeleton className="h-7 w-7 rounded-md" />
                                        <Skeleton className="h-7 w-7 rounded-md" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
