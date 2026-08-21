export type SpecimenStatus =
    | 'received'
    | 'macroscopic_review'
    | 'processing'
    | 'microscopic_review'
    | 'finalized'
    | 'delivered'
    | 'cancelled';

export interface SectionOrderItem {
    key: string;
    order: number;
    active: boolean;
    [key: string]: any;
}

export interface SpecimenReport {
    id: number;
    report_date: string;
    finalization_date?: string;
    macroscopy_html: string | null;
    microscopy_html: string | null;
    diagnosis_html: string | null;
    clinical_details_html: string | null;
    comments_notes_html: string | null;
    protocols_html: string | null;
    legend_html: string | null;
    open_text_html: string | null;
    open_text_label: string | null;
    addendum_html: string | null;
    macroscopy_finalization_datetime: string | null;
    microscopy_finalization_datetime: string | null;
    report_finalization_datetime: string | null;
    sections_order: SectionOrderItem[] | null;
    headings_toggles: Record<string, boolean> | null;
}

export interface SpecimenUserRelation {
    id: number;
    name: string;
    role?: {
        name: string;
        slug?: string;
    };
    user_signature?: string | null;
    signature_url?: string | null;
    pivot?: {
        macroscopy_access: boolean;
        microscopy_access: boolean;
    };
}

export interface SpecimenCustomerRelation {
    id: number;
    name: string;
    id_number: string;
    phone: string;
    gender: string;
    age: number | null;
    type?: 'cliente' | 'empresa';
}

export interface Specimen {
    id: number;
    sequence_code: string;
    sample_collection_date?: string;
    anatomic_site: string;
    diagnosis: string | null;
    clinical_notes: string | null;
    status: SpecimenStatus;
    created_at: string;
    customer_relation: SpecimenCustomerRelation;
    type: {
        name: string;
    };
    examination: {
        name: string;
    };
    category: {
        name: string;
    };
    referrer_relation: {
        name: string;
        notes: string | null;
    };
    report: SpecimenReport | null;
    users?: SpecimenUserRelation[];
    collaborators?: SpecimenUserRelation[];
    products?: any[];
    cuttings?: any[];
}

export interface ReportEditorAuthUser {
    id: number;
    name: string;
    cursor_color?: string;
    role?: {
        slug: string;
    };
}

export interface ReportEditorAuth {
    user: ReportEditorAuthUser;
    permissions?: string[];
}

export interface ReportEditorProps {
    specimen: Specimen;
    report: SpecimenReport | null;
    auth: ReportEditorAuth;
    pathologists?: any[];
    products?: any[];
    cutting_codes: any[];
    cutting_prefixes: any[];
    cutting_slide_types: any[];
    users: any[];
    templates?: any[];
    specimenTypes?: any[];
    examinations?: any[];
    categories?: any[];
    referrers?: any[];
    referrerTypes?: any[];
    priorities?: any[];
    locations?: any[];
    sequences?: any[];
    activeLocationId?: number | null;
    banks?: any[];
}

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
        | 'image-grid'
        | 'list'
        | 'table'
        | 'paragraph'
        | 'cuttings-summary'
        | 'new-cuttings-summary';
    height: number;
    title?: string;
    html?: string;
    className?: string;
    text?: string;
    tag?: string;
    class?: string;
    columns?: number;
    alignment?: string;
    width?: number | null;
    images?: string[];
}
