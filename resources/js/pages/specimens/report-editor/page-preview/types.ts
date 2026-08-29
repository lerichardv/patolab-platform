export type { MeasuredBlock, BlockDebugMeta } from '../types';

export interface PreviewUser {
    id: number;
    name: string;
    role?: {
        name: string;
    };
    user_signature?: string | null;
    signature_url?: string | null;
}

export interface PreviewSpecimen {
    id: number;
    sequence_code: string;
    sample_collection_date?: string;
    sample_collection_date_na?: boolean;
    anatomic_site: string;
    diagnosis: string | null;
    clinical_notes?: string | null;
    customer_relation: {
        id: number;
        name: string;
        id_number?: string;
        phone?: string;
        gender?: string;
        age: number | null;
        type?: 'cliente' | 'empresa';
    };
    referrer_relation: {
        name: string;
        notes: string | null;
    };
    type?: {
        name: string;
    };
    examination?: {
        name: string;
    };
    users?: PreviewUser[];
    report?: {
        id?: number;
        report_code?: string;
        report_validation_token?: string | null;
        report_validation_qr_code?: string | null;
        report_date?: string;
        finalization_date?: string;
    } | null;
    report_validation_qr_code?: string | null;
}
