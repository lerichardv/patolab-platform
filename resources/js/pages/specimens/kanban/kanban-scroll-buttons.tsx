import { ChevronLeft, ChevronRight } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export interface KanbanScrollButtonsProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    dependencies?: any[];
}

export function KanbanScrollButtons({
    containerRef,
    dependencies = [],
}: KanbanScrollButtonsProps) {
    const isMobile = useIsMobile();
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [mouseY, setMouseY] = useState(0);
    const [isNearLeft, setIsNearLeft] = useState(false);
    const [isNearRight, setIsNearRight] = useState(false);

    const updateScrollState = () => {
        const el = containerRef.current;

        if (el) {
            setCanScrollLeft(el.scrollLeft > 5);
            setCanScrollRight(
                el.scrollLeft + el.clientWidth < el.scrollWidth - 5,
            );
        }
    };

    useEffect(() => {
        updateScrollState();
        window.addEventListener('resize', updateScrollState);

        return () => window.removeEventListener('resize', updateScrollState);
    }, dependencies);

    useEffect(() => {
        const el = containerRef.current;

        if (!el) {
            return;
        }

        const handleScroll = () => {
            updateScrollState();
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();

            const relativeY = e.clientY - rect.top;
            setMouseY(relativeY);

            const relativeX = e.clientX - rect.left;
            const threshold = 80;
            setIsNearLeft(relativeX >= 0 && relativeX < threshold);
            setIsNearRight(
                relativeX > rect.width - threshold && relativeX <= rect.width,
            );
        };

        const handleMouseLeave = () => {
            setIsNearLeft(false);
            setIsNearRight(false);
        };

        el.addEventListener('scroll', handleScroll);
        const parent = el.parentElement;

        if (parent) {
            parent.addEventListener('mousemove', handleMouseMove);
            parent.addEventListener('mouseleave', handleMouseLeave);
        }

        return () => {
            el.removeEventListener('scroll', handleScroll);

            if (parent) {
                parent.removeEventListener('mousemove', handleMouseMove);
                parent.removeEventListener('mouseleave', handleMouseLeave);
            }
        };
    }, [containerRef]);

    const scrollLeftFn = (e: React.MouseEvent) => {
        e.stopPropagation();
        const el = containerRef.current;

        if (el) {
            el.scrollBy({ left: -350, behavior: 'smooth' });
        }
    };

    const scrollRightFn = (e: React.MouseEvent) => {
        e.stopPropagation();
        const el = containerRef.current;

        if (el) {
            el.scrollBy({ left: 350, behavior: 'smooth' });
        }
    };

    if (isMobile) {
        return null;
    }

    return (
        <>
            {canScrollLeft && isNearLeft && (
                <button
                    type="button"
                    onClick={scrollLeftFn}
                    className="absolute left-2 z-[60] flex items-center justify-center rounded-full border border-primary/20 bg-background/80 p-3 text-foreground shadow-lg transition-[transform,background-color,border-color,box-shadow] duration-150 hover:scale-110 hover:border-primary/50 hover:bg-background active:scale-95"
                    style={{
                        top: `${mouseY}px`,
                        transform: 'translateY(-50%)',
                    }}
                >
                    <ChevronLeft className="h-5 w-5 text-primary" />
                </button>
            )}

            {canScrollRight && isNearRight && (
                <button
                    type="button"
                    onClick={scrollRightFn}
                    className="absolute right-2 z-[60] flex items-center justify-center rounded-full border border-primary/20 bg-background/80 p-3 text-foreground shadow-lg transition-[transform,background-color,border-color,box-shadow] duration-150 hover:scale-110 hover:border-primary/50 hover:bg-background active:scale-95"
                    style={{
                        top: `${mouseY}px`,
                        transform: 'translateY(-50%)',
                    }}
                >
                    <ChevronRight className="h-5 w-5 text-primary" />
                </button>
            )}
        </>
    );
}

export default KanbanScrollButtons;
