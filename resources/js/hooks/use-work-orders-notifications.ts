import { useState, useEffect, useCallback } from 'react';

export interface RealtimeNotification {
    id: string;
    workOrderId: number;
    action:
        | 'created'
        | 'status_changed'
        | 'assigned'
        | 'unassigned'
        | 'updated'
        | 'deleted';
    title: string;
    description: string;
    status?: string;
    specimenCode?: string;
    timestamp: string;
    isRead: boolean;
}

const MAX_STORED_NOTIFICATIONS = 50;

function loadStoredNotifications(key: string): RealtimeNotification[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const stored = localStorage.getItem(key);

        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.warn('Failed to parse notifications from localStorage:', e);

        return [];
    }
}

export function useWorkOrdersNotifications(userId?: number | string) {
    const storageKey = `work_orders_notifications_user_${userId || 'default'}`;

    const [prevKey, setPrevKey] = useState(storageKey);
    const [notifications, setNotifications] = useState<RealtimeNotification[]>(
        () => loadStoredNotifications(storageKey),
    );

    if (prevKey !== storageKey) {
        setPrevKey(storageKey);
        setNotifications(loadStoredNotifications(storageKey));
    }

    // Save to localStorage whenever notifications change
    const persistNotifications = useCallback(
        (updated: RealtimeNotification[]) => {
            setNotifications(updated);

            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(updated));
                } catch (e) {
                    console.warn(
                        'Failed to save notifications to localStorage:',
                        e,
                    );
                }
            }
        },
        [storageKey],
    );

    // Sync across browser tabs or external storage updates
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handleStorage = (event: StorageEvent) => {
            if (event.key === storageKey && event.newValue) {
                try {
                    setNotifications(JSON.parse(event.newValue));
                } catch {
                    // ignore malformed storage update
                }
            }
        };

        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, [storageKey]);

    const addNotification = useCallback(
        (data: {
            workOrderId: number;
            action: RealtimeNotification['action'];
            title?: string;
            description?: string;
            status?: string;
            specimenCode?: string;
            timestamp?: string;
        }) => {
            const timestamp = data.timestamp || new Date().toISOString();
            const action = data.action || 'updated';

            setNotifications((prev) => {
                // Deduplicate: if an event for the same workOrderId and action arrived within 3s, skip it
                const recentDuplicate = prev.find((n) => {
                    if (
                        n.workOrderId !== data.workOrderId ||
                        n.action !== action
                    ) {
                        return false;
                    }

                    const timeDiff = Math.abs(
                        new Date(n.timestamp).getTime() -
                            new Date(timestamp).getTime(),
                    );

                    return timeDiff < 3000;
                });

                if (recentDuplicate) {
                    return prev;
                }

                const newNotification: RealtimeNotification = {
                    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    workOrderId: data.workOrderId,
                    action,
                    title:
                        data.title || `Orden #${data.workOrderId} actualizada`,
                    description:
                        data.description ||
                        `Se registraron cambios en la orden de trabajo #${data.workOrderId}`,
                    status: data.status,
                    specimenCode: data.specimenCode,
                    timestamp,
                    isRead: false,
                };

                const next = [newNotification, ...prev].slice(
                    0,
                    MAX_STORED_NOTIFICATIONS,
                );

                if (typeof window !== 'undefined') {
                    try {
                        localStorage.setItem(storageKey, JSON.stringify(next));
                    } catch (e) {
                        console.warn('Failed to store notification:', e);
                    }
                }

                return next;
            });
        },
        [storageKey],
    );

    const markAsRead = useCallback(
        (id: string) => {
            setNotifications((prev) => {
                const updated = prev.map((n) =>
                    n.id === id ? { ...n, isRead: true } : n,
                );

                persistNotifications(updated);

                return updated;
            });
        },
        [persistNotifications],
    );

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => {
            const updated = prev.map((n) => ({ ...n, isRead: true }));

            persistNotifications(updated);

            return updated;
        });
    }, [persistNotifications]);

    const clearAll = useCallback(() => {
        persistNotifications([]);
    }, [persistNotifications]);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
    };
}
