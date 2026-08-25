import { postJson } from './client';

export interface ApplyTemplateResponse {
    template?: {
        id: number;
        name: string;
        specimen_type_id?: number;
        clinical_details_html?: string | null;
        diagnosis_html?: string | null;
        macroscopy_html?: string | null;
        microscopy_html?: string | null;
        comments_notes_html?: string | null;
        protocols_html?: string | null;
        legend_html?: string | null;
        [key: string]: any;
    };
    error?: string;
    message?: string;
    [key: string]: any;
}

export async function applyReportTemplate(
    sequenceCode: string,
    templateIds: (number | string)[] | number | string,
): Promise<ApplyTemplateResponse> {
    const ids = Array.isArray(templateIds) ? templateIds : [templateIds];

    return postJson<ApplyTemplateResponse>(
        `/specimens/${sequenceCode}/report-editor/apply-template`,
        { template_id: ids[0], template_ids: ids },
    );
}
