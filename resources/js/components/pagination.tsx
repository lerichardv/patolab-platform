import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Link {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationProps {
    links: Link[];
    meta?: {
        from: number;
        to: number;
        total: number;
    };
    perPageOptions?: number[];
    currentPerPage?: number;
    onPerPageChange?: (perPage: number) => void;
    only?: string[];
    onPageChange?: (url: string) => void;
    className?: string;
}

export function Pagination({
    links,
    meta,
    perPageOptions,
    currentPerPage,
    onPerPageChange,
    only,
    onPageChange,
    className,
}: PaginationProps) {
    const hasMultiplePages = links && links.length > 3;

    if (!hasMultiplePages && (!meta || meta.total === 0) && !perPageOptions) {
        return null;
    }

    const handlePageChange = (url: string | null) => {
        if (!url) {
            return;
        }

        if (onPageChange) {
            onPageChange(url);

            return;
        }

        router.get(
            url,
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                ...(only ? { only } : {}),
            },
        );
    };

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-between gap-4 py-4 md:flex-row',
                className,
            )}
        >
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {meta && (
                    <p>
                        Mostrando{' '}
                        <span className="font-medium">{meta.from || 0}</span> a{' '}
                        <span className="font-medium">{meta.to || 0}</span> de{' '}
                        <span className="font-medium">{meta.total}</span>{' '}
                        resultados
                    </p>
                )}

                {perPageOptions && onPerPageChange && currentPerPage && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs">Mostrar:</span>
                        <Select
                            value={String(currentPerPage)}
                            onValueChange={(val) =>
                                onPerPageChange(Number(val))
                            }
                        >
                            <SelectTrigger className="h-8 w-[100px] text-xs">
                                <SelectValue
                                    placeholder={`${currentPerPage} / pág.`}
                                />
                            </SelectTrigger>
                            <SelectContent align="start">
                                {perPageOptions.map((opt) => (
                                    <SelectItem
                                        key={opt}
                                        value={String(opt)}
                                        className="text-xs"
                                    >
                                        {opt} / pág.
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {hasMultiplePages && (
                <div className="flex items-center gap-2">
                    {links.map((link, index) => {
                        // Translate labels
                        let label = link.label;

                        if (label.includes('Previous')) {
                            label = 'Anterior';
                        }

                        if (label.includes('Next')) {
                            label = 'Siguiente';
                        }

                        // Determine variant
                        const isPageNumber = !isNaN(Number(label));
                        const variant = link.active ? 'default' : 'outline';

                        return (
                            <Button
                                key={index}
                                variant={variant}
                                size={isPageNumber ? 'icon' : 'sm'}
                                className={cn(
                                    !isPageNumber && 'px-3',
                                    isPageNumber && 'w-9',
                                )}
                                disabled={!link.url}
                                onClick={() => handlePageChange(link.url)}
                                dangerouslySetInnerHTML={{ __html: label }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
