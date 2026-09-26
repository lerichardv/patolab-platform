import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
    count?: number;
}

export default function ShadowTableSkeleton({ count = 2 }: Props) {
    return (
        <div className="animate-in space-y-8 duration-300 fade-in-50">
            {Array.from({ length: count }).map((_, tableIdx) => (
                <Card
                    key={tableIdx}
                    className="overflow-hidden border-border/60 bg-card shadow-sm"
                >
                    {/* Header banner skeleton */}
                    <CardHeader className="border-b border-border/50 bg-muted/40 px-4 py-3.5 sm:px-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-6 w-6 rounded-md bg-muted-foreground/20" />
                                <Skeleton className="h-6 w-72 animate-pulse rounded bg-muted-foreground/25 sm:w-96" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-24 rounded-full bg-muted-foreground/20" />
                                <Skeleton className="h-5 w-28 rounded-full bg-muted-foreground/20" />
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {/* Table skeleton */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-border/40 bg-muted/30 text-xs">
                                    <tr>
                                        <th className="w-12 px-3 py-2.5 text-center">
                                            <Skeleton className="mx-auto h-4 w-6" />
                                        </th>
                                        <th className="w-24 px-3 py-2.5 text-center">
                                            <Skeleton className="mx-auto h-4 w-14" />
                                        </th>
                                        <th className="px-3 py-2.5 text-left">
                                            <Skeleton className="h-4 w-28" />
                                        </th>
                                        <th className="w-16 px-3 py-2.5 text-center">
                                            <Skeleton className="mx-auto h-4 w-8" />
                                        </th>
                                        <th className="w-28 px-3 py-2.5 text-center">
                                            <Skeleton className="mx-auto h-4 w-20" />
                                        </th>
                                        <th className="w-28 px-3 py-2.5 text-right">
                                            <Skeleton className="ml-auto h-4 w-16" />
                                        </th>
                                        <th className="w-24 px-3 py-2.5 text-right">
                                            <Skeleton className="ml-auto h-4 w-14" />
                                        </th>
                                        <th className="w-28 px-3 py-2.5 text-right">
                                            <Skeleton className="ml-auto h-4 w-16" />
                                        </th>
                                        <th className="w-36 px-3 py-2.5 text-left">
                                            <Skeleton className="h-4 w-20" />
                                        </th>
                                        <th className="w-36 px-3 py-2.5 text-center">
                                            <Skeleton className="mx-auto h-4 w-20" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {Array.from({ length: 5 }).map(
                                        (_, rowIdx) => (
                                            <tr
                                                key={rowIdx}
                                                className="transition-colors hover:bg-muted/10"
                                            >
                                                <td className="px-3 py-2.5 text-center">
                                                    <Skeleton className="mx-auto h-3.5 w-4" />
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <Skeleton className="mx-auto h-3.5 w-16" />
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <Skeleton
                                                        className="h-4 rounded"
                                                        style={{
                                                            width: `${Math.min(180 + rowIdx * 35, 280)}px`,
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <Skeleton className="mx-auto h-3.5 w-4" />
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <Skeleton className="mx-auto h-5 w-20 rounded-full" />
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <Skeleton className="ml-auto h-4 w-16" />
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <Skeleton className="ml-auto h-4 w-10" />
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <Skeleton className="ml-auto h-4 w-16" />
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <Skeleton className="h-3.5 w-16" />
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <Skeleton className="mx-auto h-3.5 w-24" />
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                                        <td
                                            colSpan={5}
                                            className="px-3 py-2.5 text-right text-xs uppercase"
                                        >
                                            <Skeleton className="ml-auto h-4 w-16" />
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <Skeleton className="ml-auto h-4 w-20" />
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <Skeleton className="ml-auto h-4 w-14" />
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <Skeleton className="ml-auto h-4 w-20" />
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Settlement block skeleton */}
                        <div className="border-t border-border/50 bg-muted/10 p-4 sm:p-6">
                            <div className="ml-auto max-w-md space-y-2.5 rounded-lg border bg-card p-4 shadow-sm">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                                {Array.from({ length: 5 }).map((_, pIdx) => (
                                    <div
                                        key={pIdx}
                                        className="flex items-center justify-between py-1 text-xs"
                                    >
                                        <Skeleton className="h-3.5 w-44" />
                                        <Skeleton className="h-3.5 w-16" />
                                    </div>
                                ))}
                                <div className="flex items-center justify-between border-t-2 border-border pt-2.5 font-bold">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
