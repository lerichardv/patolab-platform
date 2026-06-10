import { Head, Link } from '@inertiajs/react';
import { ShieldAlert, Home } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import GuestLayout from '@/layouts/guest-layout';

export default function Forbidden() {
    return (
        <GuestLayout showLogo={true} title="Acceso Denegado">
            <Head title="403 - Acceso Denegado" />
            <div className="w-full max-w-md px-4">
                <Card className="border-border/50 bg-card/60 py-8 text-center shadow-xl backdrop-blur-md">
                    <CardContent className="space-y-6">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                            <ShieldAlert className="h-10 w-10" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="font-mono text-4xl font-extrabold tracking-tight text-foreground">
                                403
                            </h1>
                            <h2 className="text-xl font-bold text-foreground">
                                Acceso No Autorizado
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                No tiene permisos para acceder a este recurso, o
                                el token de seguridad es inválido o ha expirado.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </GuestLayout>
    );
}
