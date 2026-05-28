import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ShieldAlert, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import GuestLayout from '@/layouts/guest-layout';

export default function Forbidden() {
	return (
		<GuestLayout showLogo={true} title="Acceso Denegado">
			<Head title="403 - Acceso Denegado" />
			<div className="max-w-md w-full px-4">
				<Card className="border-border/50 shadow-xl bg-card/60 backdrop-blur-md text-center py-8">
					<CardContent className="space-y-6">
						<div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
							<ShieldAlert className="w-10 h-10" />
						</div>
						<div className="space-y-2">
							<h1 className="text-4xl font-extrabold tracking-tight text-foreground font-mono">403</h1>
							<h2 className="text-xl font-bold text-foreground">Acceso No Autorizado</h2>
							<p className="text-sm text-muted-foreground">
								No tiene permisos para acceder a este recurso, o el token de seguridad es inválido o ha expirado.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</GuestLayout>
	);
}
