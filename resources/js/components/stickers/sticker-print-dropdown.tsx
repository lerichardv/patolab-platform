import { Printer, QrCode, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import StickerProgressSheet from './sticker-progress-sheet';
import type {
    StickerType,
    StickerPreviewItem,
    CassettePreviewItem,
} from './types';

interface StickerPrintDropdownProps {
    specimenId?: number;
    specimenIds?: number[];
    cuttingId?: number;
    cuttingIds?: number[];
    cuttingsAvailable?: Array<{ id: number; code?: { code: string } | string }>;
    previewSpecimens?: StickerPreviewItem[];
    previewCuttings?: CassettePreviewItem[];
    variant?: 'default' | 'outline' | 'secondary' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    label?: string;
    showLabel?: boolean;
    className?: string;
}

export default function StickerPrintDropdown({
    specimenId,
    specimenIds,
    cuttingId,
    cuttingIds,
    cuttingsAvailable = [],
    previewSpecimens,
    previewCuttings,
    variant = 'outline',
    size = 'sm',
    label = 'Imprimir Stickers',
    showLabel = true,
    className,
}: StickerPrintDropdownProps) {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<StickerType>('muestra');

    const handleSelectType = (type: StickerType) => {
        setSelectedType(type);
        setSheetOpen(true);
    };

    const resolvedSpecimenIds = specimenId ? [specimenId] : specimenIds;
    const resolvedCuttingIds = cuttingId ? [cuttingId] : cuttingIds;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant={variant} size={size} className={className}>
                        <Printer className="h-4 w-4" />
                        {showLabel && <span className="ml-1.5">{label}</span>}
                        {showLabel && (
                            <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="text-xs font-bold text-muted-foreground">
                        Stickers Zebra ZD620
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                        onClick={() => handleSelectType('muestra')}
                        className="cursor-pointer gap-2.5 py-2 text-xs"
                    >
                        <QrCode className="h-4 w-4 shrink-0 text-primary" />
                        <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                                1. Sticker de Muestra
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                0.94&quot; × 0.94&quot; (Frasco, lámina y corte)
                            </span>
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => handleSelectType('casette')}
                        className="cursor-pointer gap-2.5 py-2 text-xs"
                    >
                        <Printer className="h-4 w-4 shrink-0 text-primary" />
                        <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                                2. Stickers de Casette
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                0.75&quot; × 0.20&quot; para bloques
                            </span>
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <StickerProgressSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                initialType={selectedType}
                specimenIds={resolvedSpecimenIds}
                cuttingIds={resolvedCuttingIds}
                cuttingsAvailable={cuttingsAvailable}
                previewSpecimens={previewSpecimens}
                previewCuttings={previewCuttings}
                autoStart={false}
            />
        </>
    );
}
