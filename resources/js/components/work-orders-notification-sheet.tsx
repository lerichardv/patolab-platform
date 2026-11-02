import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    BellOff,
    CheckCheck,
    Trash2,
    PlusCircle,
    RefreshCw,
    UserCheck,
    UserX,
    CheckCircle2,
    Briefcase,
} from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';
import HeadingSheet from '@/components/heading-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { RealtimeNotification } from '@/hooks/use-work-orders-notifications';
import { cn } from '@/lib/utils';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    notifications: RealtimeNotification[];
    unreadCount: number;
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onClearAll: () => void;
    onSelectOrder?: (workOrderId: number) => void;
}

export function WorkOrdersNotificationSheet({
    open,
    onOpenChange,
    notifications,
    unreadCount,
    onMarkAsRead,
    onMarkAllAsRead,
    onClearAll,
    onSelectOrder,
}: Props) {
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const filtered =
        filter === 'unread'
            ? notifications.filter((n) => !n.isRead)
            : notifications;

    const renderActionIcon = (action: RealtimeNotification['action']) => {
        switch (action) {
            case 'created':
                return (
                    <PlusCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                );
            case 'status_changed':
                return (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                );
            case 'assigned':
                return (
                    <UserCheck className="h-4 w-4 shrink-0 text-indigo-500" />
                );
            case 'unassigned':
                return <UserX className="h-4 w-4 shrink-0 text-amber-500" />;
            default:
                return <RefreshCw className="h-4 w-4 shrink-0 text-primary" />;
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
                <div className="border-b border-border pb-3">
                    <HeadingSheet
                        title={
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-primary" />
                                <span>Notificaciones</span>
                                {unreadCount > 0 && (
                                    <Badge
                                        variant="default"
                                        className="h-5 rounded-full bg-primary px-2 text-[10px] font-semibold text-primary-foreground"
                                    >
                                        {unreadCount} nuevas
                                    </Badge>
                                )}
                            </div>
                        }
                        description="Registro de eventos y órdenes de trabajo de esta sesión."
                    />

                    {/* Actions toolbar */}
                    <div className="mt-3 flex items-center justify-between px-5">
                        <div className="flex items-center gap-1 rounded-md bg-muted p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setFilter('all')}
                                className={cn(
                                    'cursor-pointer rounded-sm px-2.5 py-1 font-medium transition-colors select-none',
                                    filter === 'all'
                                        ? 'bg-card text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                Todas ({notifications.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter('unread')}
                                className={cn(
                                    'cursor-pointer rounded-sm px-2.5 py-1 font-medium transition-colors select-none',
                                    filter === 'unread'
                                        ? 'bg-card text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                No leídas ({unreadCount})
                            </button>
                        </div>

                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onMarkAllAsRead}
                                    className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    title="Marcar todas como leídas"
                                >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">
                                        Leer todas
                                    </span>
                                </Button>
                            )}
                            {notifications.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClearAll}
                                    className="h-8 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    title="Limpiar historial"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notifications list */}
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                    {filtered.length > 0 ? (
                        filtered.map((item) => {
                            let timeAgo = '';

                            try {
                                timeAgo = formatDistanceToNow(
                                    new Date(item.timestamp),
                                    {
                                        addSuffix: true,
                                        locale: es,
                                    },
                                );
                            } catch {
                                timeAgo = 'hace un momento';
                            }

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        if (!item.isRead) {
                                            onMarkAsRead(item.id);
                                        }

                                        if (onSelectOrder) {
                                            onSelectOrder(item.workOrderId);
                                        }
                                    }}
                                    className={cn(
                                        'group relative flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left transition-all',
                                        item.isRead
                                            ? 'border-border/60 bg-card hover:border-border hover:bg-muted/30'
                                            : 'border-primary/30 bg-primary/5 ring-1 ring-primary/20 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/15',
                                    )}
                                >
                                    {/* Unread indicator dot */}
                                    {!item.isRead && (
                                        <span className="absolute top-3 right-3 flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                                        </span>
                                    )}

                                    <div className="flex items-center gap-2 pr-4">
                                        {renderActionIcon(item.action)}
                                        <span
                                            className={cn(
                                                'text-xs font-semibold tracking-tight',
                                                item.isRead
                                                    ? 'text-foreground'
                                                    : 'font-bold text-primary',
                                            )}
                                        >
                                            {item.title}
                                        </span>
                                    </div>

                                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                        {item.description}
                                    </p>

                                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground/80">
                                        <div className="flex items-center gap-1.5">
                                            {item.specimenCode && (
                                                <span className="py-0.2 rounded border border-primary/20 bg-primary/5 px-1.5 font-mono text-[10px] font-semibold text-primary">
                                                    {item.specimenCode}
                                                </span>
                                            )}
                                            {item.status && (
                                                <span className="py-0.2 rounded-full bg-secondary px-2 text-[10px] font-medium text-secondary-foreground">
                                                    {item.status}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">
                                            {timeAgo}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                            <BellOff className="mb-2 h-10 w-10 stroke-1 text-muted-foreground/40" />
                            <p className="text-sm font-medium text-foreground">
                                {filter === 'unread'
                                    ? 'No hay notificaciones sin leer'
                                    : 'Sin notificaciones'}
                            </p>
                            <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                                Los eventos de órdenes creadas o actualizadas
                                durante esta sesión aparecerán aquí.
                            </p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
