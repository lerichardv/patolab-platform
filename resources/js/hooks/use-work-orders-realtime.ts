import { router } from '@inertiajs/react';
import { useConnectionStatus, useEcho, echo } from '@laravel/echo-react';
import { useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { playNotificationDing } from '@/lib/sound';

export type RealtimeConnectionStatus =
    | 'connected'
    | 'connecting'
    | 'disconnected';

export interface WorkOrderEventPayload {
    work_order_id: number;
    action:
        | 'created'
        | 'status_changed'
        | 'assigned'
        | 'unassigned'
        | 'updated'
        | 'deleted';
    title?: string;
    description?: string;
    status?: string;
    specimen_code?: string;
    timestamp?: string;
}

interface UseWorkOrdersRealtimeOptions {
    onNewWorkOrder?: (workOrderId: number) => void;
    onNotification?: (payload: WorkOrderEventPayload) => void;
}

export function useWorkOrdersRealtime(
    options: UseWorkOrdersRealtimeOptions = {},
) {
    const rawStatus = useConnectionStatus();
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastActionRef = useRef<string | null>(null);
    const optionsRef = useRef(options);

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    const reloadData = useCallback((action?: string) => {
        if (action === 'created') {
            lastActionRef.current = 'created';
        }

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            const wasCreated = lastActionRef.current === 'created';
            lastActionRef.current = null;

            router.reload({
                only: ['workOrders'],
                onSuccess: () => {
                    if (wasCreated) {
                        toast.success('Nueva orden de trabajo recibida', {
                            id: 'work-orders-new-order',
                            duration: 4000,
                        });
                    }
                },
            });
        }, 400);
    }, []);

    useEcho(
        'work-orders',
        '.WorkOrderUpdated',
        (payload: WorkOrderEventPayload) => {
            console.log('[Realtime] WorkOrderUpdated event received:', payload);

            if (payload?.action === 'created') {
                playNotificationDing();

                if (payload.work_order_id) {
                    optionsRef.current.onNewWorkOrder?.(payload.work_order_id);
                }
            }

            if (payload?.work_order_id) {
                optionsRef.current.onNotification?.(payload);
            }

            reloadData(payload?.action);
        },
    );

    const reconnect = useCallback(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const instance = echo();

            if (instance && (instance as any).connector?.pusher) {
                (instance as any).connector.pusher.connect();
            }
        } catch (e) {
            console.error('Failed to reconnect Echo', e);
        }
    }, []);

    let status: RealtimeConnectionStatus = 'connecting';

    if (typeof window === 'undefined') {
        status = 'disconnected';
    } else if (rawStatus === 'connected') {
        status = 'connected';
    } else if (rawStatus === 'connecting') {
        status = 'connecting';
    } else {
        status = 'disconnected';
    }

    return {
        status,
        rawStatus,
        reconnect,
    };
}
