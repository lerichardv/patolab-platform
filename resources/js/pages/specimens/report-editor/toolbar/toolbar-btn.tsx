import React from 'react';

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { ToolbarContext } from './toolbar-context';

export function ToolbarDivider() {
    return <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

export function ToolbarBtn({
    onClick,
    active,
    title,
    disabled = false,
    onMouseDown,
    children,
}: {
    onClick: () => void;
    active?: boolean;
    title: string;
    disabled?: boolean;
    onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    children: React.ReactNode;
}) {
    const { isDictating } = React.useContext(ToolbarContext);

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        onMouseDown?.(e);
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={onClick}
                    onMouseDown={handleMouseDown}
                    disabled={disabled || isDictating}
                    className={cn(
                        'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
                        active &&
                            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                    )}
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="py-1 text-xs">
                {title}
            </TooltipContent>
        </Tooltip>
    );
}
