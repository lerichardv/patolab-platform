import React from 'react';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/breadcrumbs';
import type { BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';

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
		<div className="relative h-screen w-full flex flex-col bg-background pt-16 overflow-hidden">

			{/* Top Header */}
			<header className="fixed w-full top-0 z-40 bg-background/95 backdrop-blur-xs flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-6 transition-[width,height] ease-linear">
				<div className="flex items-center gap-4">
					{/* Custom Menu Toggle Trigger */}
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setOpen(!open)}
						className="h-9 w-9 rounded-md border border-border bg-card cursor-pointer shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors"
						title="Abrir menú"
					>
						<Menu className="h-5 w-5 text-muted-foreground" />
					</Button>
					<Breadcrumbs breadcrumbs={breadcrumbs} />
				</div>
				{headerRight && (
					<div className="flex items-center gap-2">
						{headerRight}
					</div>
				)}
			</header>

			{/* Overlay Dimmed Backdrop */}
			<div
				className={cn(
					"fixed inset-0 z-50 transition-opacity duration-300 pointer-events-none bg-black/40",
					open ? "opacity-100 pointer-events-auto" : "opacity-0"
				)}
				onClick={() => setOpen(false)}
			/>

			{/* Sliding Drawer Sidebar Container */}
			<div
				className={cn(
					"fixed inset-y-0 left-0 z-50 w-[280px] bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out shadow-2xl",
					open ? "translate-x-0" : "-translate-x-full"
				)}
			>
				{/* Close button inside sidebar */}
				<div className="absolute right-4 top-4 z-50">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setOpen(false)}
						className="h-8 w-8 rounded-full border bg-background hover:bg-accent cursor-pointer transition-colors"
						title="Cerrar menú"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
				<AppSidebar collapsible="none" />
			</div>

			{/* Main Content Pane */}
			<main className="flex-1 w-full flex flex-col">
				{children}
			</main>
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
			<EditorLayoutContent breadcrumbs={breadcrumbs} headerRight={headerRight}>
				{children}
			</EditorLayoutContent>
		</SidebarProvider>
	);
}
