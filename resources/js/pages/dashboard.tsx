import { Head } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';

export default function Dashboard() {
    return (
        <>
            <Head title="Resumen" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 bg-sidebar">
                        <PlaceholderPattern />
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 bg-sidebar">
                        <PlaceholderPattern />
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 bg-sidebar">
                        <PlaceholderPattern />
                    </div>
                </div>
                <div className="relative min-h-[100vh] flex-1 rounded-xl border border-sidebar-border/70 bg-sidebar md:min-h-min">
                    <PlaceholderPattern />
                </div>
            </div>
        </>
    );
}
