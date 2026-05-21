import { Link } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-6 md:p-10">
            {/* Background Gradients */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-600/20 blur-[120px]" />
                <div className="absolute top-[10%] right-[10%] h-[400px] w-[400px] rounded-full bg-sky-500/15 blur-[100px]" />
                <div className="absolute bottom-[20%] left-[10%] h-[400px] w-[400px] rounded-full bg-violet-500/15 blur-[100px]" />
                <div className="absolute top-[40%] left-[30%] h-[300px] w-[300px] rounded-full bg-cyan-400/10 blur-[80px]" />
            </div>

            <div className="relative z-10 w-full max-w-sm">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-2">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-2xl bg-background shadow-md ring-1 ring-border">
                                <img src="/images/patolab-isotipo.png" alt="PatoLab Logo" className="size-14" />
                            </div>
                        </Link>
                    </div>

                    <Card className="border-border/40 bg-background/60 backdrop-blur-xl shadow-xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-xl font-semibold tracking-tight">{title}</CardTitle>
                            <CardDescription className="text-balance text-sm text-muted-foreground">
                                {description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {children}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
