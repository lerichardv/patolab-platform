import React from 'react';
import { Badge } from '@/components/ui/badge';

interface Props {
    children: React.ReactNode;
    title?: string;
    showLogo?: boolean;
}

export default function GuestLayout({
    children,
    title,
    showLogo = true,
}: Props) {
    return (
        <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-background text-foreground">
            {/* Background Sleek Gradients */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-20%] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[130px]" />
                <div className="absolute right-[-20%] bottom-[-20%] h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[130px]" />
            </div>

            {/* Header */}
            {showLogo && (
                <header className="relative z-10 flex items-center justify-between border-b border-border/40 bg-background/60 px-6 py-4 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center">
                            <img
                                src="/images/patolab-isotipo.png"
                                alt="PatoLab Logo"
                                className="size-8"
                            />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-foreground">
                                PatoLab
                            </h1>
                        </div>
                    </div>
                    {title && (
                        <Badge
                            variant="outline"
                            className="bg-muted/40 px-3 py-1 font-mono text-xs"
                        >
                            {title}
                        </Badge>
                    )}
                </header>
            )}

            {/* Main Content */}
            <main className="relative z-10 mx-auto flex w-full flex-1 flex-col items-center justify-center px-4 py-8 md:py-12">
                {children}
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-border/40 bg-muted/10 px-6 py-6 text-center text-xs text-muted-foreground/60">
                &copy; {new Date().getFullYear()} PatoLab. Todos los derechos
                reservados.
            </footer>
        </div>
    );
}
