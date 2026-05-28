import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { FileQuestion, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import GuestLayout from '@/layouts/guest-layout';

export default function NotFound() {
	return (
		<GuestLayout showLogo={true} title="Página No Encontrada">
			<Head title="404 - Página No Encontrada" />
			<div className="max-w-md w-full px-4">
				<Card className="border-border/50 shadow-xl bg-card/60 backdrop-blur-md text-center py-8">
					<CardContent className="space-y-6">
						<div className="mx-auto w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
							<FileQuestion className="w-10 h-10" />
						</div>
						<div className="space-y-2">
							<h1 className="text-4xl font-extrabold tracking-tight text-foreground font-mono">404</h1>
							<h2 className="text-xl font-bold text-foreground">Página No Encontrada</h2>
							<p className="text-sm text-muted-foreground">
								Lo sentimos, el recurso que está buscando no existe o ha sido movido.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</GuestLayout>
	);
}
