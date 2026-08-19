export function getCsrfToken(): string {
    return (
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content ?? ''
    );
}

export function getCollaborationServerUrl(): string {
    return (
        import.meta.env.VITE_COLLABORATION_SERVER_URL || 'http://127.0.0.1:1234'
    );
}

export async function postJson<T>(
    url: string,
    body?: unknown,
    customHeaders?: Record<string, string>,
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': getCsrfToken(),
        Accept: 'application/json',
        ...customHeaders,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message ||
                data.error ||
                data.details ||
                `HTTP Error ${response.status}: ${response.statusText}`,
        );
    }

    return data as T;
}
