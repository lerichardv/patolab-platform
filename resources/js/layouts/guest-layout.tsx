import React from 'react';
import { Badge } from '@/components/ui/badge';

interface Props {
	children: React.ReactNode;
	title?: string;
	showLogo?: boolean;
}

export default function GuestLayout({ children, title, showLogo = true }: Props) {
	return (
		<div className="relative min-h-screen bg-background text-foreground flex flex-col justify-between overflow-hidden">
			{/* Background Sleek Gradients */}
			<div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
				<div className="absolute top-[-20%] left-[-20%] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[130px]" />
				<div className="absolute bottom-[-20%] right-[-20%] h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[130px]" />
			</div>

			{/* Header */}
			{showLogo && (
				<header className="relative z-10 border-b border-border/40 bg-background/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center">
							<img src="/images/patolab-isotipo.png" alt="PatoLab Logo" className="size-8" />
						</div>
						<div>
							<h1 className="text-lg font-bold text-foreground tracking-tight">PatoLab</h1>
						</div>
					</div>
					{title && (
						<Badge variant="outline" className="text-xs py-1 px-3 bg-muted/40 font-mono">
							{title}
						</Badge>
					)}
				</header>
			)}

			{/* Main Content */}
			<main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full mx-auto px-4 py-8 md:py-12">
				{children}
			</main>

			{/* Footer */}
			<footer className="relative z-10 border-t border-border/40 py-6 px-6 text-center text-xs text-muted-foreground/60 bg-muted/10">
				&copy; {new Date().getFullYear()} PatoLab. Todos los derechos reservados.
			</footer>
		</div>
	);
}
