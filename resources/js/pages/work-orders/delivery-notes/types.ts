export interface DeliveryNoteMeasuredBlock {
    id: string;
    type:
        | 'heading'
        | 'image'
        | 'image-grid'
        | 'list'
        | 'table'
        | 'paragraph'
        | 'blockquote'
        | 'page-break'
        | 'signatures';
    height: number;
    html?: string;
    tag?: string;
    columns?: number;
    alignment?: string;
    width?: number | null;
    images?: string[];
}

export interface DeliveryNoteRecord {
    id: number;
    work_order_id: number;
    specimen_id: number;
    content_html: string | null;
    pdf_path: string | null;
    created_by_id?: number | null;
    updated_by_id?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface DeliveryNoteWorkOrder {
    id: number;
    specimen_id: number;
    work_order_type_id: number[];
    work_order_task_id: number | null;
    quantity: number;
    user_id: number;
    completed_by_id: number | null;
    status: 'Enviada' | 'En Proceso' | 'Finalizada';
    priority: number;
    comments: string | null;
    due_date: string | null;
    completed_at: string | null;
    created_at: string;
    types?: { id: number; name: string }[];
    type?: { id: number; name: string };
    task?: { id: number; name: string } | null;
    assigned_technician?: { id: number; name: string } | null;
    specimen?: {
        id: number;
        sequence_code: string;
        sample_collection_date?: string | null;
        customer_relation?: {
            id: number;
            name: string;
            id_number?: string;
            gender?: string;
            age?: number | null;
            phone?: string;
        };
        referrer_relation?: {
            name: string;
            notes?: string | null;
        };
        type?: {
            name: string;
        };
        examination?: {
            name: string;
        };
    };
    delivery_note?: DeliveryNoteRecord | null;
}
