import { getCollaborationServerUrl } from './client';

export interface RefreshInsumosPayload {
    reportId?: number | string | null;
}

export async function notifyCollaborationRefreshInsumos(
    reportId?: number | string | null,
): Promise<void> {
    const serverUrl = getCollaborationServerUrl();
    const response = await fetch(`${serverUrl}/api/refresh-insumos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            reportId,
        }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
            data.message ||
                data.error ||
                `Failed to notify collaboration server (status ${response.status})`,
        );
    }
}
