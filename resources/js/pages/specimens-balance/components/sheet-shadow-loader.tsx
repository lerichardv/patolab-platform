import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

interface SheetShadowLoaderProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
}

export function SheetShadowLoader({
    open,
    onOpenChange,
    title,
    description = 'Cargando información detallada...',
}: SheetShadowLoaderProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex h-full w-full flex-col p-0 sm:max-w-xl"
            >
                {/* Header */}
                <div className="border-b border-border/80 p-6 pb-4">
                    <SheetHeader>
                        <SheetTitle className="text-xl font-bold tracking-tight">
                            {title}
                        </SheetTitle>
                        <SheetDescription className="text-xs text-muted-foreground">
                            {description}
                        </SheetDescription>
                    </SheetHeader>

                    {/* Search bar skeleton */}
                    <div className="mt-4">
                        <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                </div>

                {/* Skeletons List Body */}
                <div className="flex-1 space-y-3 overflow-y-auto p-6">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                        <div
                            key={idx}
                            className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-4 shadow-2xs"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-24 rounded-md" />
                                    <Skeleton className="h-4 w-16 rounded-md" />
                                </div>
                                <Skeleton className="h-5 w-14 rounded-full" />
                            </div>

                            <Skeleton className="h-4 w-3/4 rounded-md" />
                            <Skeleton className="h-3 w-1/2 rounded-md" />

                            <div className="mt-1 flex items-center justify-between border-t border-border/40 pt-2">
                                <Skeleton className="h-3 w-28 rounded-md" />
                                <div className="flex items-center gap-1.5">
                                    <Skeleton className="h-8 w-20 rounded-md" />
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    );
}

export default SheetShadowLoader;
