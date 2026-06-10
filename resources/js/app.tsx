import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Head } from '@inertiajs/react';

// Silence noisy warnings from browser extensions (e.g., MetaMask)
if (typeof window !== 'undefined') {
	const filterWarning = (msg: string) => {
		return (
			msg.includes('MaxListenersExceededWarning') ||
			msg.includes('ObjectMultiplex') ||
			msg.includes('orphaned data for stream') ||
			msg.includes('malformed chunk')
		);
	};

	const originalWarn = console.warn;
	console.warn = (...args) => {
		const msg = args
			.map((arg) =>
				typeof arg === 'object' ? JSON.stringify(arg) : String(arg),
			)
			.join(' ');

		if (filterWarning(msg)) {
			return;
		}

		originalWarn(...args);
	};

	const originalError = console.error;
	console.error = (...args) => {
		const msg = args
			.map((arg) =>
				typeof arg === 'object' ? JSON.stringify(arg) : String(arg),
			)
			.join(' ');

		if (filterWarning(msg)) {
			return;
		}

		originalError(...args);
	};
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
	title: (title) => (title ? `${title} - ${appName}` : appName),
	layout: (name) => {
		switch (true) {
			case name === 'welcome':
			case name === 'specimens/public-progress':
			case name === 'specimens/public-group-progress':
			case name === 'specimens/report-editor':
			case name.startsWith('errors/'):
				return null;
			case name.startsWith('auth/'):
				return AuthLayout;
			case name.startsWith('settings/'):
				return [AppLayout, SettingsLayout];
			default:
				return AppLayout;
		}
	},
	strictMode: true,
	withApp(app) {
		return (
			<>
				<Head>
					<meta name="robots" content="noindex, nofollow" />
				</Head>
				<TooltipProvider delayDuration={0}>
					{app}
					<Toaster />
				</TooltipProvider>
			</>
		);
	},
	progress: {
		color: '#1A3A8A',
	},
});

// This will set light / dark mode on load...
initializeTheme();
