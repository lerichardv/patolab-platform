export interface CalendarDay {
    date: string; // YYYY-MM-DD
    day_name: string; // Lun, Mar, etc.
    day_number: string; // 20
    month_name: string; // Oct
    formatted: string; // 20 Oct
    is_today: boolean;
    is_past: boolean;
    is_weekend: boolean;
}

export interface SpecimenItem {
    id: number;
    sequence_code: string;
    status: string;
    status_label: string;
    status_color: string;
    customer_name: string;
    type_id: number;
    type_name: string;
    requires_report: boolean;
    examination_name: string;
    examination_color: string;
    category_name?: string | null;
    internal_date: string;
    client_date: string;
    is_manual_internal: boolean;
    is_manual_client: boolean;
    duration_minutes?: number;
    points?: number;
    priority_id?: number;
    priority_name?: string;
    priority_color?: string;
    assigned_user_ids: number[];
    assigned_users: { id: number; name: string }[];
    group_id?: number | null;
    group_name?: string | null;
    created_at?: string;
}

export interface WorkloadMetric {
    total_minutes: number;
    hours: number;
    percentage: number;
    color: 'green' | 'yellow' | 'red';
    color_class: string;
    progress_class: string;
    label: string;
    specimen_count: number;
    formatted_time: string;
}

export interface PathologistRowData {
    user: {
        id: number;
        name: string;
        email: string;
    };
    total_specimens: number;
    total_hours: number;
    overall_color: 'green' | 'yellow' | 'red';
    days: Record<
        string,
        {
            specimens: SpecimenItem[];
            workload: WorkloadMetric;
        }
    >;
}

export interface UnassignedRowData {
    total_specimens: number;
    days: Record<string, SpecimenItem[]>;
}

export interface ExaminationOption {
    id: number;
    name: string;
    color: string;
    specimen_type: number;
    type?: {
        id: number;
        name: string;
    };
}

export interface FilterOptions {
    specimenTypes: { id: number; name: string }[];
    examinations: ExaminationOption[];
    categories: { id: number; name: string }[];
}

export interface BalanceFilters {
    specimen_type_id?: string | string[];
    examination_id?: string | string[];
    category_id?: string;
    pathologist_id?: string;
    search?: string;
}

export interface PathologistDistributionItem {
    id: number;
    name: string;
    count: number;
    color: string;
    percentage: number;
}

export interface UnassignedPreviewItem {
    id: number;
    sequence_code: string;
    customer_name: string;
    examination_name: string;
    examination_color: string;
    priority_name: string;
    priority_color: string;
    points: number;
    internal_date: string;
}

export interface ExpiredPreviewItem {
    id: number;
    sequence_code: string;
    customer_name: string;
    examination_name: string;
    examination_color: string;
    priority_name: string;
    priority_color: string;
    internal_date: string;
    overdue_label: string;
    days_overdue: number;
}

export interface BalanceSummary {
    total_specimens: number;
    assigned_count: number;
    unassigned_count: number;
    assigned_percentage: number;
    pathologists_distribution: PathologistDistributionItem[];
    unassigned_preview: UnassignedPreviewItem[];
    expired_count: number;
    expired_preview: ExpiredPreviewItem[];
}

export interface DetailedSheetSpecimenItem {
    id: number;
    sequence_code: string;
    customer_name: string;
    type_name: string;
    examination_name: string;
    examination_color: string;
    category_name?: string | null;
    priority_name: string;
    priority_color: string;
    duration_minutes: number;
    points: number;
    internal_date: string;
    client_date: string;
    is_expired?: boolean;
    overdue_label?: string;
    days_overdue?: number;
    assigned_users?: { id: number; name: string }[];
    status: string;
    status_label: string;
    status_color: string;
    created_at?: string;
}
