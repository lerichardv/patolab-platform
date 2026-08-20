import { getImageAspectRatio, getImageHeight } from './image-measurer';

export function getBlockLineHeight(
    block: { html?: string },
    baseLineHeight: number,
): number {
    if (!block.html) {
        return baseLineHeight;
    }

    const html = block.html;
    let fontSize = 2.82; // Default 8pt in mm

    let hasPt = false;
    let hasPx = false;
    let maxPt = 8.0;
    let maxPx = 10.66;

    const ptRegex = /font-size:\s*([\d.]+)pt/gi;
    let match;

    while ((match = ptRegex.exec(html)) !== null) {
        const val = parseFloat(match[1]);

        if (val > maxPt) {
            maxPt = val;
        }

        hasPt = true;
    }

    if (!hasPt) {
        const pxRegex = /font-size:\s*([\d.]+)px/gi;

        while ((match = pxRegex.exec(html)) !== null) {
            const val = parseFloat(match[1]);

            if (val > maxPx) {
                maxPx = val;
            }

            hasPx = true;
        }
    }

    if (hasPt) {
        fontSize = maxPt * 0.352777;
    } else if (hasPx) {
        fontSize = maxPx * 0.264583;
    }

    let multiplier = 1.25; // Default multiplier
    const lhMatch = html.match(/line-height:\s*([\d.]+)/i);

    if (lhMatch) {
        multiplier = parseFloat(lhMatch[1]);
    }

    return fontSize * multiplier;
}

export function classifyBlock(blockHtml: string, maxCharsPerLine: number): any {
    const tagMatch = blockHtml.match(/^<([a-zA-Z0-9]+)/);
    const tag = tagMatch ? tagMatch[1].toLowerCase() : 'p';

    if (blockHtml.includes('data-type="image-grid"')) {
        let columns = 2;
        const colMatch = blockHtml.match(/data-columns=["'](\d+)["']/i);

        if (colMatch) {
            columns = parseInt(colMatch[1], 10);
        }

        if (columns < 1) {
            columns = 2;
        }

        let align = 'center';
        const alignMatch = blockHtml.match(/data-align=["']([^"']+)["']/i);

        if (alignMatch) {
            align = alignMatch[1];
        }

        let width: number | null = null;
        const widthMatch = blockHtml.match(
            /(?:width|data-width)=["'](\d+)["']/i,
        );

        if (widthMatch) {
            width = parseInt(widthMatch[1], 10);
        }

        const imgRegex = /<img[^>]+>/gi;
        const imgTags: string[] = [];
        let match;

        while ((match = imgRegex.exec(blockHtml)) !== null) {
            imgTags.push(match[0]);
        }

        const usableWidth = width ? 185.9 * (width / 704) : 185.9;
        const gap = 1.5; // mm

        // Group images into a single row of up to 4 images
        const slicedTags = imgTags.slice(0, 4);
        const rowsOfImages: string[][] = [slicedTags];

        let gridHeight = 2.0;
        rowsOfImages.forEach((rowImages, i) => {
            let aspectSum = 0.0;
            rowImages.forEach((imgTag) => {
                const aspect = getImageAspectRatio(imgTag);

                if (aspect > 0.0) {
                    aspectSum += 1.0 / aspect;
                } else {
                    aspectSum += 1.0;
                }
            });

            if (aspectSum <= 0.0) {
                aspectSum = 1.0;
            }

            const N = rowImages.length;
            const maxRowHeight =
                N === 1 ? Math.min(120.0, usableWidth) : usableWidth * 1.5;
            let rowHeight = 0.0;

            if (N > 0) {
                const calculatedHeight =
                    (usableWidth - (N - 1) * gap) / aspectSum;
                rowHeight = Math.min(calculatedHeight, maxRowHeight);
            }

            gridHeight += rowHeight;

            if (i > 0) {
                gridHeight += 1.5;
            }
        });

        return {
            type: 'image-grid',
            html: blockHtml,
            columns,
            alignment: align,
            width,
            images: imgTags,
            height: gridHeight,
        };
    }

    if (
        blockHtml.includes('page-break') ||
        blockHtml.includes('page-break-after') ||
        blockHtml.includes('break-after')
    ) {
        return {
            type: 'page-break',
            html: blockHtml,
            height: 0.0,
        };
    }

    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        let height = 7.94;

        if (tag === 'h1') {
            height = 11.91;
        } else if (tag === 'h2') {
            height = 9.925;
        }

        return {
            type: 'heading',
            tag,
            html: blockHtml,
            height,
        };
    }

    if (tag === 'ul' || tag === 'ol') {
        return {
            type: 'list',
            tag,
            html: blockHtml,
            height: 0.0,
        };
    }

    if (tag === 'table') {
        return {
            type: 'table',
            html: blockHtml,
            height: 0.0,
        };
    }

    if (tag === 'img' || blockHtml.includes('<img')) {
        const srcMatch = blockHtml.match(/src=["']([^"']+)["']/i);
        const src = srcMatch ? srcMatch[1] : '';

        const widthMatch =
            blockHtml.match(/width=["'](\d+)["']/i) ||
            blockHtml.match(/width:\s*(\d+)px/i);
        const width = widthMatch ? `${widthMatch[1]}px` : 'auto';

        const heightMatch =
            blockHtml.match(/height=["'](\d+)["']/i) ||
            blockHtml.match(/height:\s*(\d+)px/i);
        const height = heightMatch ? `${heightMatch[1]}px` : 'auto';

        const alignMatch =
            blockHtml.match(/data-align=["']([^"']+)["']/i) ||
            blockHtml.match(/class=["']([^"']*align-[^"']*)["']/i);
        let align = 'center';

        if (alignMatch) {
            const alignVal = alignMatch[1];

            if (alignVal.includes('left')) {
                align = 'left';
            } else if (alignVal.includes('right')) {
                align = 'right';
            } else if (alignVal.includes('justify')) {
                align = 'justify';
            }
        }

        const captionMatch =
            blockHtml.match(/data-caption=["']([^"']+)["']/i) ||
            blockHtml.match(/alt=["']([^"']+)["']/i);
        const caption = captionMatch ? captionMatch[1] : '';

        const isLeft = align === 'left';
        const isRight = align === 'right';
        const marginLeft = isLeft ? '0' : 'auto';
        const marginRight = isRight ? '0' : 'auto';

        const imgStyles = [
            `display: block`,
            `max-width: 100%`,
            `height: ${height}`,
        ];

        if (width !== 'auto') {
            imgStyles.push(`width: ${width}`);
        } else {
            imgStyles.push(`width: auto`);
        }

        let captionHtml = '';

        if (caption) {
            captionHtml = `<div class="image-caption" style="text-align: center; margin-top: 1.06mm; font-style: italic; font-size: 8.5pt; color: #64748b; line-height: 1.2;">${caption}</div>`;
        }

        const wrappedHtml = `<div class="image-wrapper align-${align}" style="display: block; margin-left: ${marginLeft}; margin-right: ${marginRight}; width: fit-content; max-width: 100%;">
            <img src="${src}" class="align-${align}" style="${imgStyles.join('; ')};" />
            ${captionHtml}
        </div>`;

        const widthPx = widthMatch ? parseInt(widthMatch[1], 10) : 360;
        let captionHeight = 0.0;

        if (caption) {
            const maxCharsForCaption = Math.max(
                15,
                Math.floor(widthPx * 0.176),
            );
            const captionLines = Math.max(
                1,
                Math.ceil(caption.length / maxCharsForCaption),
            );
            captionHeight = captionLines * 3.6 + 1.06;
        }

        return {
            type: 'image',
            html: wrappedHtml,
            height: getImageHeight(blockHtml) + captionHeight,
        };
    }

    const classMatch = blockHtml.match(/class=["']([^"']+)["']/i);
    const className = classMatch ? classMatch[1] : '';

    const plainText = blockHtml.replace(/<[^>]+>/g, '').trim();
    const lines = Math.max(1, Math.ceil(plainText.length / maxCharsPerLine));

    return {
        type: 'paragraph',
        tag,
        html: blockHtml,
        className,
        height: lines * getBlockLineHeight({ html: blockHtml }, 3.53),
    };
}
