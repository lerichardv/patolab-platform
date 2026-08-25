import type { Editor } from '@tiptap/react';
import { ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function FontSizeDropdown({
    editor,
    onPopoverOpenChange,
}: {
    editor: Editor | null;
    onPopoverOpenChange?: (open: boolean) => void;
}) {
    const [customPt, setCustomPt] = useState('');
    const [open, setOpen] = useState(false);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        onPopoverOpenChange?.(newOpen);
    };

    const applyFontSize = (size: string | null) => {
        if (!editor) {
            return;
        }

        if (size) {
            editor
                .chain()
                .focus()
                .setMark('textStyle', { fontSize: size })
                .run();
        } else {
            editor
                .chain()
                .focus()
                .setMark('textStyle', { fontSize: null })
                .run();
        }

        handleOpenChange(false);
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseFloat(customPt.trim());

        if (!isNaN(num) && num > 0) {
            applyFontSize(`${num}pt`);
            setCustomPt('');
        }
    };

    const currentFontSize =
        editor && !editor.isDestroyed && editor.view
            ? editor.getAttributes('textStyle').fontSize
            : undefined;
    const displaySize = currentFontSize
        ? currentFontSize.replace(/pt|px/g, '')
        : '8';

    const ptPresets = [
        '8',
        '9',
        '10',
        '11',
        '12',
        '14',
        '16',
        '18',
        '20',
        '24',
        '28',
        '36',
    ];

    return (
        <DropdownMenu open={open} onOpenChange={handleOpenChange}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            disabled={!editor}
                            onMouseDown={(e) => e.preventDefault()}
                            className={cn(
                                'inline-flex h-7 items-center gap-1 rounded border border-input bg-background px-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-hidden',
                                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
                                currentFontSize &&
                                    'border-blue-300 bg-blue-50 font-bold text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
                            )}
                        >
                            <span className="text-[11px] font-bold text-muted-foreground">
                                Aa
                            </span>
                            <span className="w-7 text-center text-xs font-semibold">
                                {displaySize}pt
                            </span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="py-1 text-xs">
                    Tamaño de fuente (pt)
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
                align="start"
                onCloseAutoFocus={(e) => e.preventDefault()}
                className="w-48 bg-popover p-1 text-popover-foreground shadow-md"
            >
                <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Tamaño de Fuente (pt)
                </div>
                <div className="grid grid-cols-4 gap-1 p-1">
                    {ptPresets.map((sz) => {
                        const val = `${sz}pt`;
                        const isSelected =
                            currentFontSize === val || displaySize === sz;

                        return (
                            <button
                                key={sz}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => applyFontSize(val)}
                                className={cn(
                                    'flex h-7 items-center justify-center rounded text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                                    isSelected &&
                                        'bg-primary font-bold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                                )}
                            >
                                {sz}pt
                            </button>
                        );
                    })}
                </div>
                <form
                    onSubmit={handleCustomSubmit}
                    className="mt-1 flex items-center gap-1 border-t px-1 pt-1.5"
                >
                    <input
                        type="number"
                        step="0.5"
                        min="5"
                        max="120"
                        placeholder="Valor pt"
                        value={customPt}
                        onChange={(e) => setCustomPt(e.target.value)}
                        className="h-6 w-full rounded border border-input bg-background px-1.5 text-xs focus:ring-1 focus:ring-ring focus:outline-hidden"
                    />
                    <button
                        type="submit"
                        disabled={!customPt.trim()}
                        onMouseDown={(e) => e.preventDefault()}
                        className="h-6 shrink-0 cursor-pointer rounded bg-primary px-2 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                        pt
                    </button>
                </form>
                <div className="mt-1 border-t pt-1">
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFontSize(null)}
                        className="flex h-6 w-full items-center justify-center gap-1 rounded text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                        Por defecto
                    </button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default FontSizeDropdown;
