import { Head } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';

export default function TestPage() {
    return (
        <>
            <Head title="Testing Page" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-sidebar-border bg-sidebar-accent/10">
                    <h1 className="text-2xl font-bold text-foreground">
                        Welcome to the Testing Page
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        This page was created with Laravel and Inertia.
                    </p>
                </div>

                <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
        </>
    );
}

TestPage.layout = {
    breadcrumbs: [
        {
            title: 'Testing Page',
            href: '#',
        },
    ],
};
