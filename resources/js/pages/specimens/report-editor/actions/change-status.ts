import { changeStatus } from '@/actions/App/Http/Controllers/SpecimenController';
import { postJson } from './client';

export interface ChangeSpecimenStatusPayload {
    status: string;
    cancellation_reason?: string;
}

export interface ChangeSpecimenStatusResponse {
    success?: boolean;
    message?: string;
    specimen?: any;
    errors?: Record<string, string[]>;
}

/**
 * Update the specimen status using the centralized endpoint.
 *
 * @param specimenId - Specimen primary key ID
 * @param payload - Payload containing the new status and optional cancellation reason
 */
export async function updateSpecimenStatus(
    specimenId: number,
    payload: ChangeSpecimenStatusPayload,
): Promise<ChangeSpecimenStatusResponse> {
    const url = changeStatus.url(specimenId);

    const response = await postJson<ChangeSpecimenStatusResponse>(url, payload);

    if (response?.success && typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(
                'patolab_specimens_updated_at',
                Date.now().toString(),
            );
        } catch {
            // Ignore storage errors
        }
    }

    return response;
}
