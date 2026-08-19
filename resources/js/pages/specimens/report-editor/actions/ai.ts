import { getCollaborationServerUrl } from './client';

export interface AIChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function fixGrammarWithAI(text: string): Promise<string> {
    const serverUrl = getCollaborationServerUrl();
    const response = await fetch(`${serverUrl}/api/fix-grammar`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text,
        }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success || !data.text) {
        throw new Error(
            data.error ||
                data.details ||
                data.message ||
                'Error al procesar el texto con IA.',
        );
    }

    return data.text as string;
}

export async function suggestImprovementsWithAI(
    text: string,
    messages: AIChatMessage[],
): Promise<string> {
    const serverUrl = getCollaborationServerUrl();
    const response = await fetch(`${serverUrl}/api/suggest-improvements`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text,
            messages,
        }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success || !data.text) {
        throw new Error(
            data.error ||
                data.details ||
                data.message ||
                'Error al procesar la sugerencia con IA.',
        );
    }

    return data.text as string;
}

export async function dictateAudioChunk(blob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', blob, 'dictation.webm');

    const serverUrl = getCollaborationServerUrl();
    const response = await fetch(`${serverUrl}/api/dictate-chunk`, {
        method: 'POST',
        body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success || data.text === undefined) {
        throw new Error(
            data.error ||
                data.details ||
                data.message ||
                'Error al transcribir el audio.',
        );
    }

    return data.text as string;
}
