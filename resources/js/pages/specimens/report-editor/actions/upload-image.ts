import { getCsrfToken } from './client';

export interface UploadImageResponse {
    url: string;
    error?: string;
    message?: string;
    [key: string]: any;
}

export async function uploadImageToEndpoint(
    uploadUrl: string,
    fileOrBlob: File | Blob,
    fileName = 'image.jpg',
): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append(
        'image',
        fileOrBlob,
        fileOrBlob instanceof File ? fileOrBlob.name : fileName,
    );

    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': getCsrfToken(),
            Accept: 'application/json',
        },
        body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.url) {
        throw new Error(
            data.message || data.error || 'Error al subir la imagen.',
        );
    }

    return data as UploadImageResponse;
}

export async function uploadReportImage(
    specimenSequenceCode?: string,
    fileOrBlob: File | Blob = new Blob(),
    fileName = 'image.jpg',
): Promise<UploadImageResponse> {
    const endpoint = specimenSequenceCode
        ? `/specimens/${specimenSequenceCode}/report-editor/upload-image`
        : `/specimen-type-templates/upload-image`;

    return uploadImageToEndpoint(endpoint, fileOrBlob, fileName);
}
