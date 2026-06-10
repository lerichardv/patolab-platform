import { Menu, X } from 'lucide-react';
import React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

function EditorLayoutContent({
    breadcrumbs,
    headerRight,
    children,
}: {
    breadcrumbs: BreadcrumbItem[];
    headerRight?: React.ReactNode;
    children: React.ReactNode;
}) {
    const { open, setOpen } = useSidebar();

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background pt-16">
            {/* Top Header */}
            <header className="fixed top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-border/50 bg-background/95 px-6 backdrop-blur-xs transition-[width,height] ease-linear">
                <div className="flex items-center gap-4">
                    {/* Custom Menu Toggle Trigger */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpen(!open)}
                        className="h-9 w-9 cursor-pointer rounded-md border border-border bg-card shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                        title="Abrir menú"
                    >
                        <Menu className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
                {headerRight && (
                    <div className="flex items-center gap-2">{headerRight}</div>
                )}
            </header>

            {/* Overlay Dimmed Backdrop */}
            <div
                className={cn(
                    'pointer-events-none fixed inset-0 z-50 bg-black/40 transition-opacity duration-300',
                    open ? 'pointer-events-auto opacity-100' : 'opacity-0',
                )}
                onClick={() => setOpen(false)}
            />

            {/* Sliding Drawer Sidebar Container */}
            <div
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-[280px] border-r border-sidebar-border bg-sidebar shadow-2xl transition-transform duration-300 ease-in-out',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                {/* Close button inside sidebar */}
                <div className="absolute top-4 right-4 z-50">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpen(false)}
                        className="h-8 w-8 cursor-pointer rounded-full border bg-background transition-colors hover:bg-accent"
                        title="Cerrar menú"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <AppSidebar collapsible="none" />
            </div>

            {/* Main Content Pane */}
            <main className="flex w-full flex-1 flex-col">{children}</main>
        </div>
    );
}

export default function EditorLayout({
    breadcrumbs = [],
    headerRight,
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    headerRight?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider defaultOpen={false}>
            <EditorLayoutContent
                breadcrumbs={breadcrumbs}
                headerRight={headerRight}
            >
                {children}
            </EditorLayoutContent>
        </SidebarProvider>
    );
}
