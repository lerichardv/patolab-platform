export interface MeasuredBlock {
    id: string;
    type:
        | 'patient-card'
        | 'section-header'
        | 'html'
        | 'page-break'
        | 'signature'
        | 'heading'
        | 'image'
        | 'cuttings-summary'
        | 'new-cuttings-summary';
    height: number;
    title?: string;
    html?: string;
    className?: string;
    text?: string;
}

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
        report_date?: string;
        finalization_date?: string;
    } | null;
}
