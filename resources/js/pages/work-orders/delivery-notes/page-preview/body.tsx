import React from 'react';
import type { DeliveryNoteMeasuredBlock } from '../types';
import Signatures from './signatures';

export interface DeliveryNoteBodyProps {
    pageBlocks: DeliveryNoteMeasuredBlock[];
}

export default function DeliveryNoteBody({
    pageBlocks,
}: DeliveryNoteBodyProps) {
    return (
        <div
            style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
            }}
        >
            {pageBlocks.map((block, idx) => {
                if (block.type === 'signatures') {
                    return <Signatures key={block.id || `sig-${idx}`} />;
                }

                return (
                    <div
                        key={block.id || `b-${idx}`}
                        className="section-content preview-content shrink-0"
                        dangerouslySetInnerHTML={{ __html: block.html || '' }}
                    />
                );
            })}
        </div>
    );
}
