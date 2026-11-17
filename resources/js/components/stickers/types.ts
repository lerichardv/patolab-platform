export type StickerType = 'muestra' | 'casette' | 'frasco' | 'corte';

export interface StickerPreviewItem {
    sequence_code: string;
    customer_name?: string;
    cutting_code?: string;
    laboratory_name?: string;
    biopsy_number?: string;
    marker_name?: string;
}

export interface CassettePreviewItem {
    cutting_code: string;
    specimen_code: string;
    customer_name?: string;
    laboratory_name?: string;
}

export interface LaboratoryItem {
    id: number;
    name: string;
    is_default: boolean;
    is_active: boolean;
}

export interface StickerProgressSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialType?: StickerType;
    specimenIds?: number[];
    cuttingIds?: number[];
    cuttingsAvailable?: Array<{ id: number; code?: { code: string } | string }>;
    previewSpecimens?: StickerPreviewItem[];
    previewCuttings?: CassettePreviewItem[];
    title?: string;
    description?: string;
    autoStart?: boolean;
}
