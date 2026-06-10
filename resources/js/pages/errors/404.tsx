import { Head, Link } from '@inertiajs/react';
import { FileQuestion, Home } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import GuestLayout from '@/layouts/guest-layout';

export default function NotFound() {
    return (
        <GuestLayout showLogo={true} title="Página No Encontrada">
            <Head title="404 - Página No Encontrada" />
            <div className="w-full max-w-md px-4">
                <Card className="border-border/50 bg-card/60 py-8 text-center shadow-xl backdrop-blur-md">
                    <CardContent className="space-y-6">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                            <FileQuestion className="h-10 w-10" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="font-mono text-4xl font-extrabold tracking-tight text-foreground">
                                404
                            </h1>
                            <h2 className="text-xl font-bold text-foreground">
                                Página No Encontrada
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Lo sentimos, el recurso que está buscando no
                                existe o ha sido movido.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </GuestLayout>
    );
}
