import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { editorStyles } from '@/pages/specimens/report-editor/components/editor-styles';
import type {
    DeliveryNoteMeasuredBlock,
    DeliveryNoteWorkOrder,
} from '../types';
import DeliveryNoteBody from './body';
import DeliveryNoteFooter from './footer';
import DeliveryNoteHeader from './header';

export function ShadowRoot({
    children,
    className,
    style,
}: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

    useEffect(() => {
        if (containerRef.current) {
            let root = containerRef.current.shadowRoot;

            if (!root) {
                root = containerRef.current.attachShadow({ mode: 'open' });
            }

            let styleContainer = root.querySelector('#shadow-style-container');

            if (!styleContainer) {
                styleContainer = document.createElement('div');
                styleContainer.id = 'shadow-style-container';
                (styleContainer as HTMLDivElement).style.display = 'none';
                root.appendChild(styleContainer);
            }

            const copyStyles = () => {
                if (!styleContainer) {
                    return;
                }

                styleContainer.innerHTML = '';

                const links = document.querySelectorAll(
                    'link[rel="stylesheet"]',
                );
                links.forEach((link) => {
                    styleContainer.appendChild(link.cloneNode(true));
                });

                const styles = document.querySelectorAll('style');
                styles.forEach((style) => {
                    styleContainer.appendChild(style.cloneNode(true));
                });
            };

            copyStyles();

            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;

                for (const mutation of mutations) {
                    for (const node of Array.from(mutation.addedNodes)) {
                        if (
                            node.nodeName === 'STYLE' ||
                            (node.nodeName === 'LINK' &&
                                (node as HTMLLinkElement).rel === 'stylesheet')
                        ) {
                            shouldUpdate = true;
                            break;
                        }
                    }

                    if (shouldUpdate) {
                        break;
                    }
                }

                if (shouldUpdate) {
                    copyStyles();
                }
            });

            observer.observe(document.head, { childList: true, subtree: true });
            setShadowRoot(root);

            return () => {
                observer.disconnect();
            };
        }
    }, []);

    return (
        <div ref={containerRef} className={className} style={style}>
            {shadowRoot && createPortal(children, shadowRoot)}
        </div>
    );
}

export interface DeliveryNotePageProps {
    pageNum: number;
    totalPages: number;
    pageBlocks: DeliveryNoteMeasuredBlock[];
    workOrder: DeliveryNoteWorkOrder;
}

export default function DeliveryNotePage({
    pageNum,
    totalPages,
    pageBlocks,
    workOrder,
}: DeliveryNotePageProps) {
    return (
        <ShadowRoot
            className="relative mb-6 flex shrink-0 origin-top-left flex-col overflow-hidden border bg-white text-left text-slate-800 shadow-2xl select-none"
            style={{
                width: '215.9mm',
                height: '279.4mm',
                padding: '12mm 15mm 12mm 15mm',
                aspectRatio: '8.5/11',
                fontFamily: 'Arial, Helvetica, sans-serif',
            }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html: editorStyles,
                }}
            />

            <DeliveryNoteHeader workOrder={workOrder} pageNum={pageNum} />

            <DeliveryNoteBody pageBlocks={pageBlocks} />

            <DeliveryNoteFooter pageNum={pageNum} totalPages={totalPages} />
        </ShadowRoot>
    );
}
