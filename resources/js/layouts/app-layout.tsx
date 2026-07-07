import { usePage } from '@inertiajs/react';
import AiAssistant from '@/components/ai-assistant';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const { auth } = usePage<any>().props;
    const hasAiPermission = auth?.permissions?.includes('ai_assistant.view');

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
            {hasAiPermission && <AiAssistant />}
        </AppLayoutTemplate>
    );
}
