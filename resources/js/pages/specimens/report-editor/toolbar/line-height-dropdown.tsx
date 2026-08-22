import type { Editor } from '@tiptap/react';
import { BetweenHorizontalEnd, ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function LineHeightDropdown({
    editor,
    onPopoverOpenChange,
}: {
    editor: Editor | null;
    onPopoverOpenChange?: (open: boolean) => void;
}) {
    const [customVal, setCustomVal] = useState('');
    const [open, setOpen] = useState(false);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        onPopoverOpenChange?.(newOpen);
    };

    const applyLineHeight = (val: string | null) => {
        if (!editor) {
            return;
        }

        if (val) {
            editor.chain().focus().setLineHeight(val).run();
        } else {
            editor.chain().focus().unsetLineHeight().run();
        }

        handleOpenChange(false);
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseFloat(customVal.trim());

        if (!isNaN(num) && num > 0) {
            applyLineHeight(num.toString());
            setCustomVal('');
        }
    };

    const currentLineHeight =
        editor?.getAttributes('paragraph').lineHeight ||
        editor?.getAttributes('heading').lineHeight;

    const options = [
        { label: '0.85 (Muy compacto)', value: '0.85' },
        { label: '0.95 (Compacto)', value: '0.95' },
        { label: '1.0 (Sencillo)', value: '1.0' },
        { label: '1.15 (Estándar 1.15)', value: '1.15' },
        { label: '1.25 (1.25x)', value: '1.25' },
        { label: '1.5 (1.5 líneas)', value: '1.5' },
        { label: '1.75 (1.75x)', value: '1.75' },
        { label: '2.0 (Doble)', value: '2.0' },
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
                                currentLineHeight &&
                                    'border-blue-300 bg-blue-50 font-bold text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
                            )}
                        >
                            <BetweenHorizontalEnd className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold">
                                {currentLineHeight || '1.25'}
                            </span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="py-1 text-xs">
                    Interlineado / Espaciado de párrafo (Word / Office)
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
                align="start"
                onCloseAutoFocus={(e) => e.preventDefault()}
                className="w-52 bg-popover p-1 text-popover-foreground shadow-md"
            >
                <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Interlineado
                </div>
                <div className="space-y-0.5">
                    {options.map((opt) => (
                        <DropdownMenuItem
                            key={opt.value}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyLineHeight(opt.value)}
                            className={cn(
                                'flex cursor-pointer items-center justify-between px-2 py-1 text-xs',
                                currentLineHeight === opt.value &&
                                    'bg-primary font-semibold text-primary-foreground',
                            )}
                        >
                            <span>{opt.label}</span>
                        </DropdownMenuItem>
                    ))}
                </div>
                <form
                    onSubmit={handleCustomSubmit}
                    className="mt-1 flex items-center gap-1 border-t px-1 pt-1.5"
                >
                    <input
                        type="number"
                        step="0.05"
                        min="0.5"
                        max="5.0"
                        placeholder="Personalizado (ej. 1.3)"
                        value={customVal}
                        onChange={(e) => setCustomVal(e.target.value)}
                        className="h-6 w-full rounded border border-input bg-background px-1.5 text-xs focus:ring-1 focus:ring-ring focus:outline-hidden"
                    />
                    <button
                        type="submit"
                        disabled={!customVal.trim()}
                        onMouseDown={(e) => e.preventDefault()}
                        className="h-6 shrink-0 cursor-pointer rounded bg-primary px-2 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                        OK
                    </button>
                </form>
                <div className="mt-1 border-t pt-1">
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyLineHeight(null)}
                        className="flex h-6 w-full items-center justify-center gap-1 rounded text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                        Por defecto
                    </button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default LineHeightDropdown;
