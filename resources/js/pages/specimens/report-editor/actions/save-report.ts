import { postJson } from './client';

export interface ReportEditorSavePayload {
    report_date?: string | null;
    sample_collection_date?: string | null;
    finalization_date?: string | null;
    macroscopy_html?: string;
    microscopy_html?: string;
    diagnosis_html?: string;
    clinical_details_html?: string;
    comments_notes_html?: string;
    protocols_html?: string;
    legend_html?: string;
    yjs_macroscopy_state?: string | null;
    yjs_microscopy_state?: string | null;
    yjs_diagnosis_state?: string | null;
    yjs_clinical_details_state?: string | null;
    yjs_comments_notes_state?: string | null;
    yjs_protocols_state?: string | null;
    yjs_legend_state?: string | null;
    yjs_report_date_state?: string | null;
    sections_order?: any[];
    headings_toggles?: Record<string, boolean>;
    [key: string]: any;
}

export interface SaveReportResponse {
    success?: boolean;
    message?: string;
    [key: string]: any;
}

export async function saveReportEditor(
    sequenceCode: string,
    payload: ReportEditorSavePayload,
): Promise<SaveReportResponse> {
    return postJson<SaveReportResponse>(
        `/specimens/${sequenceCode}/report-editor/save`,
        payload,
    );
}
