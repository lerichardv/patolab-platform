import { Printer } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import StickerProgressSheet from './sticker-progress-sheet';
import type {
    StickerType,
    StickerPreviewItem,
    CassettePreviewItem,
} from './types';

interface QuickStickerButtonProps {
    type?: StickerType;
    specimenId?: number;
    specimenIds?: number[];
    cuttingId?: number;
    cuttingIds?: number[];
    previewSpecimens?: StickerPreviewItem[];
    previewCuttings?: CassettePreviewItem[];
    variant?: 'default' | 'outline' | 'secondary' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    title?: string;
    label?: string;
    className?: string;
}

export default function QuickStickerButton({
    type = 'muestra',
    specimenId,
    specimenIds,
    cuttingId,
    cuttingIds,
    previewSpecimens,
    previewCuttings,
    variant = 'outline',
    size = 'sm',
    title = 'Imprimir Sticker',
    label,
    className,
}: QuickStickerButtonProps) {
    const [open, setOpen] = useState(false);

    const resolvedSpecimenIds = specimenId ? [specimenId] : specimenIds;
    const resolvedCuttingIds = cuttingId ? [cuttingId] : cuttingIds;

    return (
        <>
            <Button
                type="button"
                variant={variant}
                size={size}
                onClick={() => setOpen(true)}
                title={title}
                className={className}
            >
                <Printer className="h-3.5 w-3.5" />
                {label && <span className="ml-1.5">{label}</span>}
            </Button>

            <StickerProgressSheet
                open={open}
                onOpenChange={setOpen}
                initialType={type}
                specimenIds={resolvedSpecimenIds}
                cuttingIds={resolvedCuttingIds}
                previewSpecimens={previewSpecimens}
                previewCuttings={previewCuttings}
                autoStart={true}
            />
        </>
    );
}
