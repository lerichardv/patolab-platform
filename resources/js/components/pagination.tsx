import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
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
    className?: string;
}

export function Pagination({ links, meta, className }: PaginationProps) {
    if (links.length <= 3) {
        return null;
    } // Don't show if there's only one page

    const handlePageChange = (url: string | null) => {
        if (url) {
            router.get(
                url,
                {},
                {
                    preserveState: true,
                    replace: true,
                },
            );
        }
    };

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-between gap-4 py-4 md:flex-row',
                className,
            )}
        >
            {meta && (
                <p className="text-sm text-muted-foreground">
                    Mostrando{' '}
                    <span className="font-medium">{meta.from || 0}</span> a{' '}
                    <span className="font-medium">{meta.to || 0}</span> de{' '}
                    <span className="font-medium">{meta.total}</span> resultados
                </p>
            )}

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

                    // Filter which links to show for page numbers to keep it clean
                    // We show Previous, Next, and all page numbers that Laravel provides
                    // Laravel already handles the "..." if there are too many pages

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
        </div>
    );
}
