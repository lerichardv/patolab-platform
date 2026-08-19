import { postJson } from './client';

export interface GenerateTempPdfResponse {
    url: string;
    total_pages?: number;
    error?: string;
    message?: string;
    [key: string]: any;
}

export async function generateTempPdf(
    sequenceCode: string,
): Promise<GenerateTempPdfResponse> {
    return postJson<GenerateTempPdfResponse>(
        `/specimens/${sequenceCode}/report-editor/generate-temp-pdf`,
    );
}
