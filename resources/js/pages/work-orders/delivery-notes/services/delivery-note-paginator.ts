import type { DeliveryNoteMeasuredBlock } from '../types';

export class DeliveryNotePaginator {
    public static readonly PAGE_CONTENT_HEIGHT = 208.0; // mm (Letter 279.4 - top margin 12 - header ~20.5 - gap 4 - footer 24 - gap ~5 - bottom margin 5)
    public static readonly LINE_HEIGHT = 3.53; // mm (8pt * 1.25)
    public static readonly LIST_ITEM_SPACING = 0.8; // mm
    public static readonly MAX_CHARS_PER_LINE = 144;
    public static readonly SIGNATURES_HEIGHT = 24.0; // mm

    /**
     * Main entry point to paginate HTML content of a Delivery Note into pages.
     */
    public static paginate(
        contentHtml: string | null | undefined,
    ): DeliveryNoteMeasuredBlock[][] {
        if (
            !contentHtml ||
            contentHtml.trim() === '' ||
            contentHtml === '<p></p>'
        ) {
            return [
                [
                    {
                        id: 'signatures-1',
                        type: 'signatures',
                        height: DeliveryNotePaginator.SIGNATURES_HEIGHT,
                    },
                ],
            ];
        }

        const rawBlocks = DeliveryNotePaginator.parseHtmlToBlocks(contentHtml);
        const classifiedBlocks: DeliveryNoteMeasuredBlock[] = [];

        rawBlocks.forEach((bHtml, idx) => {
            const block = DeliveryNotePaginator.classifyBlock(
                bHtml,
                DeliveryNotePaginator.MAX_CHARS_PER_LINE,
            );
            block.id = `block-${idx}`;
            classifiedBlocks.push(block);
        });

        const pages = DeliveryNotePaginator.paginateBlocks(
            classifiedBlocks,
            DeliveryNotePaginator.PAGE_CONTENT_HEIGHT,
            DeliveryNotePaginator.LINE_HEIGHT,
            DeliveryNotePaginator.MAX_CHARS_PER_LINE,
        );

        if (pages.length === 0) {
            pages.push([]);
        }

        // Add signatures on the last page
        const lastPageIndex = pages.length - 1;
        let lastPageHeight = 0.0;
        pages[lastPageIndex].forEach((b) => {
            lastPageHeight += b.height;
        });

        const sigBlock: DeliveryNoteMeasuredBlock = {
            id: 'signatures-block',
            type: 'signatures',
            height: DeliveryNotePaginator.SIGNATURES_HEIGHT,
        };

        if (
            lastPageHeight + DeliveryNotePaginator.SIGNATURES_HEIGHT <=
            DeliveryNotePaginator.PAGE_CONTENT_HEIGHT
        ) {
            pages[lastPageIndex].push(sigBlock);
        } else {
            // Push to new page if not enough room
            pages.push([sigBlock]);
        }

        return pages;
    }

    /**
     * Parses raw HTML into top-level blocks.
     */
    public static parseHtmlToBlocks(html: string): string[] {
        if (!html || html.trim() === '') {
            return [];
        }

        if (typeof window === 'undefined') {
            return [html];
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const blocks: string[] = [];

            Array.from(doc.body.children).forEach((child) => {
                blocks.push(child.outerHTML);
            });

            if (blocks.length === 0 && doc.body.innerHTML.trim() !== '') {
                blocks.push(`<p>${doc.body.innerHTML}</p>`);
            }

            return blocks;
        } catch {
            return [html];
        }
    }

    /**
     * Classifies a block and estimates its height.
     */
    public static classifyBlock(
        blockHtml: string,
        maxCharsPerLine: number,
    ): DeliveryNoteMeasuredBlock {
        const match = blockHtml.match(/^<([a-zA-Z0-9]+)/i);
        const tag = match ? match[1].toLowerCase() : 'p';

        if (blockHtml.includes('data-type="image-grid"')) {
            const colMatch = blockHtml.match(/data-columns=["'](\d+)["']/i);
            const columns = colMatch ? parseInt(colMatch[1], 10) || 2 : 2;

            let align = 'center';
            const alignMatch = blockHtml.match(/data-align=["']([^"']+)["']/i);

            if (alignMatch) {
                align = alignMatch[1];
            }

            let width: number | null = null;
            const widthMatch = blockHtml.match(
                /(?:width|data-width)=["'](\d+)["']/i,
            );
            const styleWidthMatch = blockHtml.match(/width:\s*(\d+)px/i);

            if (widthMatch) {
                width = parseInt(widthMatch[1], 10);
            } else if (styleWidthMatch) {
                width = parseInt(styleWidthMatch[1], 10);
            }

            const imgMatches = blockHtml.match(/<img[^>]+>/gi) || [];
            const imgTags = imgMatches.slice(0, 4);
            const N = Math.max(1, imgTags.length);

            const usableWidth = width ? 185.9 * (width / 704.0) : 185.9;
            const gap = 1.5;
            let gridHeight = 2.0;

            let aspectSum = 0.0;
            imgTags.forEach((imgTag) => {
                const ar = DeliveryNotePaginator.getImageAspectRatio(imgTag);
                aspectSum += ar > 0.0 ? 1.0 / ar : 1.0;
            });

            if (aspectSum <= 0.0) {
                aspectSum = 1.0;
            }

            if (N > 0) {
                const calculatedHeight =
                    (usableWidth - (N - 1) * gap) / aspectSum;
                const maxRowHeight =
                    N === 1 ? Math.min(120.0, usableWidth) : usableWidth * 1.5;
                gridHeight += Math.min(calculatedHeight, maxRowHeight);
            }

            return {
                id: '',
                type: 'image-grid',
                html: blockHtml,
                columns: Math.max(1, imgTags.length) || columns,
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
                id: '',
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
                id: '',
                type: 'heading',
                tag,
                html: blockHtml,
                height,
            };
        }

        if (tag === 'ul' || tag === 'ol') {
            return {
                id: '',
                type: 'list',
                tag,
                html: blockHtml,
                height: 0.0, // Dynamic during pagination
            };
        }

        if (tag === 'table' || blockHtml.includes('<table')) {
            return {
                id: '',
                type: 'table',
                html: blockHtml,
                height: 0.0, // Dynamic during pagination
            };
        }

        if (
            tag === 'img' ||
            (blockHtml.includes('<img') && !blockHtml.includes('<p'))
        ) {
            const height = DeliveryNotePaginator.getImageHeight(blockHtml);

            return {
                id: '',
                type: 'image',
                html: blockHtml,
                height,
            };
        }

        if (tag === 'blockquote') {
            const lines = DeliveryNotePaginator.splitHtmlIntoLines(
                blockHtml,
                maxCharsPerLine,
            );
            const count = Math.max(1, lines.length);

            return {
                id: '',
                type: 'blockquote',
                html: blockHtml,
                height: count * DeliveryNotePaginator.LINE_HEIGHT + 2.0,
            };
        }

        // Paragraph default
        const fontLineHeight =
            DeliveryNotePaginator.getBlockLineHeight(blockHtml);
        const lines = DeliveryNotePaginator.splitHtmlIntoLines(
            blockHtml,
            maxCharsPerLine,
        );
        const count = Math.max(1, lines.length);
        const height = count * fontLineHeight + 1.5;

        return {
            id: '',
            type: 'paragraph',
            html: blockHtml,
            height,
        };
    }

    /**
     * Slices and paginates blocks into pages.
     */
    public static paginateBlocks(
        blocksList: DeliveryNoteMeasuredBlock[],
        pageContentHeight: number,
        lineHeight: number,
        maxCharsPerLine: number,
    ): DeliveryNoteMeasuredBlock[][] {
        const pagesList: DeliveryNoteMeasuredBlock[][] = [];
        let currentPage: DeliveryNoteMeasuredBlock[] = [];
        let currentHeight = 0.0;

        for (let bIndex = 0; bIndex < blocksList.length; bIndex++) {
            const block = blocksList[bIndex];

            if (block.type === 'page-break') {
                if (currentPage.length > 0) {
                    pagesList.push(currentPage);
                    currentPage = [];
                    currentHeight = 0.0;
                }

                continue;
            }

            // List splitting
            if (block.type === 'list') {
                const listData = DeliveryNotePaginator.parseListItems(
                    block.html || '',
                    maxCharsPerLine,
                    lineHeight,
                    DeliveryNotePaginator.LIST_ITEM_SPACING,
                );
                const tag = listData.tag;
                const items = listData.items;
                let olStartIndex = 1;
                if (tag === 'ol') {
                    const startMatch = (block.html || '').match(
                        /start=["'](\d+)["']/i,
                    );
                    if (startMatch) {
                        olStartIndex = parseInt(startMatch[1], 10);
                    }
                }

                const tagClose = `</${tag}>`;

                let pendingItems = [...items];

                while (pendingItems.length > 0) {
                    const available = pageContentHeight - currentHeight;
                    let fitCount = 0;
                    let accumHeight = 0.0;

                    for (const item of pendingItems) {
                        if (accumHeight + item.height <= available) {
                            accumHeight += item.height;
                            fitCount++;
                        } else {
                            break;
                        }
                    }

                    if (fitCount === 0 && currentPage.length === 0) {
                        fitCount = 1;
                        accumHeight = pendingItems[0].height;
                    }

                    if (fitCount > 0) {
                        const slice = pendingItems.slice(0, fitCount);

                        let tagOpen = `<${tag}`;
                        if (tag === 'ol' && olStartIndex > 1) {
                            tagOpen += ` start="${olStartIndex}"`;
                        }
                        if (listData.listStyleType) {
                            tagOpen += ` data-list-style-type="${listData.listStyleType}"`;
                        }
                        if (listData.styleAttr) {
                            tagOpen += ` style="${listData.styleAttr}"`;
                        }
                        tagOpen += '>';

                        const sliceHtml =
                            tagOpen +
                            slice.map((s) => s.html).join('') +
                            tagClose;

                        currentPage.push({
                            id: `list-${bIndex}-${pagesList.length}`,
                            type: 'list',
                            tag,
                            html: sliceHtml,
                            height: accumHeight,
                        });
                        currentHeight += accumHeight;
                        pendingItems = pendingItems.slice(fitCount);
                        olStartIndex += fitCount;
                    }

                    if (pendingItems.length > 0) {
                        pagesList.push(currentPage);
                        currentPage = [];
                        currentHeight = 0.0;
                    }
                }

                continue;
            }

            // Table splitting
            if (block.type === 'table') {
                const tableData = DeliveryNotePaginator.paginateTable(
                    block.html || '',
                    maxCharsPerLine,
                    lineHeight,
                );
                const headerHtml = tableData.headerHtml;
                const headerHeight = tableData.headerHeight;
                const rows = tableData.rows;

                let pendingRows = [...rows];

                while (pendingRows.length > 0) {
                    const available = pageContentHeight - currentHeight;
                    let fitCount = 0;
                    let accumHeight = headerHeight;

                    for (const row of pendingRows) {
                        if (accumHeight + row.height <= available) {
                            accumHeight += row.height;
                            fitCount++;
                        } else {
                            break;
                        }
                    }

                    if (fitCount > 0) {
                        const slice = pendingRows.slice(0, fitCount);
                        const tableRowsHtml = slice.map((r) => r.html).join('');
                        const sliceTableHtml = `<table class="tiptap-table">${headerHtml}<tbody>${tableRowsHtml}</tbody></table>`;

                        currentPage.push({
                            id: `table-${bIndex}-${pagesList.length}`,
                            type: 'table',
                            html: sliceTableHtml,
                            height: accumHeight,
                        });
                        currentHeight += accumHeight;
                        pendingRows = pendingRows.slice(fitCount);
                    }

                    if (pendingRows.length > 0) {
                        pagesList.push(currentPage);
                        currentPage = [];
                        currentHeight = 0.0;
                    }
                }

                continue;
            }

            // Paragraph line-by-line splitting
            if (block.type === 'paragraph') {
                const cost = block.height;

                if (currentHeight + cost <= pageContentHeight) {
                    currentPage.push(block);
                    currentHeight += cost;
                    continue;
                }

                const fontLineHeight = DeliveryNotePaginator.getBlockLineHeight(
                    block.html || '',
                );
                const lines = DeliveryNotePaginator.splitHtmlIntoLines(
                    block.html || '',
                    maxCharsPerLine,
                );

                let pendingLines = [...lines];

                while (pendingLines.length > 0) {
                    const available = pageContentHeight - currentHeight;
                    const fitCount = Math.floor(available / fontLineHeight);

                    if (fitCount > 0 && pendingLines.length > 0) {
                        const sliceCount = Math.min(
                            fitCount,
                            pendingLines.length,
                        );
                        const slice = pendingLines.slice(0, sliceCount);
                        const sliceHtml = `<p>${slice.join(' ')}</p>`;
                        const sliceHeight = sliceCount * fontLineHeight + 1.0;

                        currentPage.push({
                            id: `p-${bIndex}-${pagesList.length}`,
                            type: 'paragraph',
                            html: sliceHtml,
                            height: sliceHeight,
                        });
                        currentHeight += sliceHeight;
                        pendingLines = pendingLines.slice(sliceCount);
                    }

                    if (pendingLines.length > 0) {
                        pagesList.push(currentPage);
                        currentPage = [];
                        currentHeight = 0.0;
                    }
                }

                continue;
            }

            // Image Grid
            if (block.type === 'image-grid') {
                const columns = block.columns || 2;
                const images = block.images;

                if (!images || images.length === 0) {
                    const fallbackBlock: DeliveryNoteMeasuredBlock = {
                        id: `${block.id}-fallback`,
                        type: 'image-grid',
                        html: block.html || '',
                        height: 5.3,
                    };

                    if (
                        currentHeight + 5.3 > pageContentHeight &&
                        currentPage.length > 0
                    ) {
                        pagesList.push(currentPage);
                        currentPage = [];
                        currentHeight = 0.0;
                    }

                    currentPage.push(fallbackBlock);
                    currentHeight += 5.3;
                    continue;
                }

                let width = block.width || null;

                if (!width && block.html) {
                    const wMatch = block.html.match(
                        /(?:width|data-width)=["'](\d+)["']/i,
                    );
                    const swMatch = block.html.match(/width:\s*(\d+)px/i);

                    if (wMatch) {
                        width = parseInt(wMatch[1], 10);
                    } else if (swMatch) {
                        width = parseInt(swMatch[1], 10);
                    }
                }

                const usableWidth = width ? 185.9 * (width / 704.0) : 185.9;
                const gap = 1.5; // mm
                const slicedImages = images.slice(0, 4);
                let rowsRemaining: string[][] = [slicedImages];

                const rowHeights = rowsRemaining.map((rowImages) => {
                    let aspectSum = 0.0;
                    rowImages.forEach((imgTag: string) => {
                        const aspect =
                            DeliveryNotePaginator.getImageAspectRatio(imgTag);

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
                        N === 1
                            ? Math.min(120.0, usableWidth)
                            : usableWidth * 1.5;
                    const calculatedHeight =
                        (usableWidth - (N - 1) * gap) / aspectSum;

                    return Math.min(calculatedHeight, maxRowHeight);
                });

                const rowCaptionHeights = rowsRemaining.map((rowImages) => {
                    let maxCaptionHeight = 0.0;
                    const N = rowImages.length;
                    const colWidthMm = (usableWidth - (N - 1) * gap) / N;
                    const maxCharsForCaption = Math.max(
                        12,
                        Math.floor(colWidthMm / 1.5),
                    );

                    rowImages.forEach((imgTag: string) => {
                        const captionMatch =
                            imgTag.match(/data-caption=["']([^"']*)["']/i) ||
                            imgTag.match(/alt=["']([^"']*)["']/i);
                        const caption = captionMatch ? captionMatch[1] : '';

                        if (caption) {
                            const captionLines = Math.max(
                                1,
                                Math.ceil(caption.length / maxCharsForCaption),
                            );
                            const captionHeight = captionLines * 3.6 + 1.06;

                            if (captionHeight > maxCaptionHeight) {
                                maxCaptionHeight = captionHeight;
                            }
                        }
                    });

                    return maxCaptionHeight;
                });

                while (rowsRemaining.length > 0) {
                    const remaining = pageContentHeight - currentHeight;
                    const totalRows = rowHeights.length;
                    const currentIndex = totalRows - rowsRemaining.length;

                    const minGridHeight =
                        rowHeights[currentIndex] +
                        rowCaptionHeights[currentIndex] +
                        2.0;

                    if (remaining < minGridHeight && currentPage.length > 0) {
                        pagesList.push(currentPage);
                        currentPage = [];
                        currentHeight = 0.0;
                        continue;
                    }

                    let r = 0;

                    for (
                        let tempR = 1;
                        tempR <= rowsRemaining.length;
                        tempR++
                    ) {
                        let cost = 2.0;

                        for (let i = 0; i < tempR; i++) {
                            cost +=
                                rowHeights[currentIndex + i] +
                                rowCaptionHeights[currentIndex + i];

                            if (i > 0) {
                                cost += 1.5;
                            }
                        }

                        if (cost <= remaining) {
                            r = tempR;
                        } else {
                            break;
                        }
                    }

                    if (r === 0) {
                        if (currentPage.length > 0) {
                            pagesList.push(currentPage);
                            currentPage = [];
                            currentHeight = 0.0;
                            continue;
                        } else {
                            r = 1;
                        }
                    }

                    const sliceImages: string[] = [];

                    for (let i = 0; i < r; i++) {
                        const rowIdx = currentIndex + i;
                        const rowImages = rowsRemaining[i];
                        const H_j = rowHeights[rowIdx];

                        rowImages.forEach((imgTag) => {
                            const aspect =
                                DeliveryNotePaginator.getImageAspectRatio(
                                    imgTag,
                                );
                            const widthMm = aspect > 0.0 ? H_j / aspect : H_j;
                            const styleRule = `height: ${H_j}mm; width: 100%; object-fit: cover; border-radius: 1.06mm;`;

                            let processedTag = imgTag;
                            const styleMatch = processedTag.match(
                                /style=["']([^"']*)["']/i,
                            );

                            if (styleMatch) {
                                processedTag = processedTag.replace(
                                    /style=["']([^"']*)["']/i,
                                    `style="${styleRule}"`,
                                );
                            } else {
                                processedTag = processedTag.replace(
                                    '<img',
                                    `<img style="${styleRule}"`,
                                );
                            }

                            let caption = '';
                            const capMatch =
                                imgTag.match(
                                    /data-caption=["']([^"']*)["']/i,
                                ) || imgTag.match(/alt=["']([^"']*)["']/i);

                            if (capMatch) {
                                caption = capMatch[1];
                            }

                            const captionHtml = caption
                                ? `<div class="gallery-image-caption" style="text-align: center; margin-top: 1.06mm; font-style: italic; font-size: 8.5pt; color: #64748b; line-height: 1.2; width: 100%; word-break: break-word;">${caption}</div>`
                                : '';

                            const wrappedImg = `<div class="grid-image-container" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: ${widthMm}mm; max-width: 100%;">${processedTag}${captionHtml}</div>`;
                            sliceImages.push(wrappedImg);
                        });
                    }

                    const align = block.alignment || 'center';
                    const isLeft = align === 'left';
                    const isRight = align === 'right';
                    const marginLeft = isLeft ? '0' : 'auto';
                    const marginRight = isRight ? '0' : 'auto';
                    const styles = [
                        'display: flex',
                        'flex-wrap: nowrap',
                        `gap: ${gap}mm`,
                        `margin-left: ${marginLeft}`,
                        `margin-right: ${marginRight}`,
                    ];

                    if (width) {
                        styles.push(`width: ${width}px`);
                    }

                    const styleStr = styles.join('; ') + ';';
                    const widthAttr = width ? ` width="${width}"` : '';

                    const sliceHtml = `<div data-type="image-grid" class="align-${align}" data-columns="${columns}" data-align="${align}"${widthAttr} style="${styleStr}">${sliceImages.join('')}</div>`;

                    let cost = 2.0;

                    for (let i = 0; i < r; i++) {
                        cost +=
                            rowHeights[currentIndex + i] +
                            rowCaptionHeights[currentIndex + i];

                        if (i > 0) {
                            cost += 1.5;
                        }
                    }

                    currentPage.push({
                        id: `${block.id}-row-${currentIndex}-slice-${r}`,
                        type: 'image-grid',
                        html: sliceHtml,
                        height: cost,
                    });
                    currentHeight += cost;
                    rowsRemaining = rowsRemaining.slice(r);
                }

                continue;
            }

            // Headings / Images

            const cost = block.height;

            if (
                currentHeight + cost > pageContentHeight &&
                currentPage.length > 0
            ) {
                pagesList.push(currentPage);
                currentPage = [];
                currentHeight = 0.0;
            }

            currentPage.push(block);
            currentHeight += cost;
        }

        if (currentPage.length > 0) {
            pagesList.push(currentPage);
        }

        return pagesList;
    }

    /**
     * Splits an HTML string into text lines respecting max character length.
     */
    public static splitHtmlIntoLines(
        html: string,
        maxCharsPerLine: number = 155,
    ): string[] {
        if (!html) {
            return [];
        }

        const tokenRegex = /(<\/?[a-zA-Z0-9]+(?:\s+[^>]*)?>|[^<]+)/g;
        const tokens = html.match(tokenRegex) || [];

        const lines: string[] = [];
        let currentLineHtml = '';
        let currentLineLength = 0;
        const activeTagsStack: string[] = [];

        const closeActiveTags = () => {
            let closing = '';

            for (let i = activeTagsStack.length - 1; i >= 0; i--) {
                const tagMatch = activeTagsStack[i].match(/<([a-zA-Z0-9]+)/);

                if (tagMatch) {
                    closing += `</${tagMatch[1]}>`;
                }
            }

            return closing;
        };

        const openActiveTags = () => {
            return activeTagsStack.join('');
        };

        for (const token of tokens) {
            if (token.startsWith('<')) {
                if (token.startsWith('</')) {
                    activeTagsStack.pop();
                    currentLineHtml += token;
                } else if (token.endsWith('/>') || /^<br\b/i.test(token)) {
                    if (/^<br\b/i.test(token)) {
                        currentLineHtml += token;
                        currentLineHtml += closeActiveTags();
                        lines.push(currentLineHtml);
                        currentLineHtml = openActiveTags();
                        currentLineLength = 0;
                    } else {
                        currentLineHtml += token;
                    }
                } else {
                    activeTagsStack.push(token);
                    currentLineHtml += token;
                }
            } else {
                const words = token.match(/(\s+|\S+)/g) || [];

                for (const word of words) {
                    const wordLen = word.length;

                    if (
                        currentLineLength + wordLen > maxCharsPerLine &&
                        currentLineLength > 0
                    ) {
                        currentLineHtml += closeActiveTags();
                        lines.push(currentLineHtml);
                        currentLineHtml = openActiveTags();
                        currentLineLength = 0;
                    }

                    currentLineHtml += word;
                    currentLineLength += wordLen;
                }
            }
        }

        if (currentLineLength > 0 || currentLineHtml.trim() !== '') {
            currentLineHtml += closeActiveTags();
            lines.push(currentLineHtml);
        }

        return lines;
    }

    /**
     * Resolves effective line height in mm from HTML style attributes.
     */
    public static getBlockLineHeight(blockHtml: string): number {
        let fontSize = DeliveryNotePaginator.LINE_HEIGHT;
        const fsMatch = blockHtml.match(/font-size:\s*([\d.]+)pt/i);

        if (fsMatch) {
            fontSize = (parseFloat(fsMatch[1]) * 25.4) / 72.0;
        }

        let multiplier = 1.25;
        const lhMatch = blockHtml.match(/line-height:\s*([\d.]+)/i);

        if (lhMatch) {
            multiplier = parseFloat(lhMatch[1]);
        }

        return fontSize * multiplier;
    }

    /**
     * Estimates image height in mm.
     */
    public static getImageHeight(blockHtml: string): number {
        const wAttrMatch = blockHtml.match(/<img[^>]+width=["'](\d+)["']/i);
        const swMatch = blockHtml.match(/width:\s*(\d+)px/i);
        let attrWidth = wAttrMatch
            ? parseInt(wAttrMatch[1], 10)
            : swMatch
              ? parseInt(swMatch[1], 10)
              : null;

        const hAttrMatch = blockHtml.match(/<img[^>]+height=["'](\d+)["']/i);
        const shMatch = blockHtml.match(/height:\s*(\d+)px/i);
        let attrHeight = hAttrMatch
            ? parseInt(hAttrMatch[1], 10)
            : shMatch
              ? parseInt(shMatch[1], 10)
              : null;

        if ((!attrWidth || !attrHeight) && typeof document !== 'undefined') {
            const srcMatch = blockHtml.match(/src=["']([^"']+)["']/i);

            if (srcMatch && srcMatch[1]) {
                const src = srcMatch[1];
                const cleanUrl = (u: string) => {
                    try {
                        return new URL(u, window.location.origin).pathname;
                    } catch {
                        return u;
                    }
                };
                const targetPath = cleanUrl(src);
                const imgs = document.getElementsByTagName('img');

                for (let i = 0; i < imgs.length; i++) {
                    const imgEl = imgs[i];
                    const elPath = cleanUrl(
                        imgEl.currentSrc ||
                            imgEl.src ||
                            imgEl.getAttribute('src') ||
                            '',
                    );

                    if (
                        imgEl.src === src ||
                        imgEl.getAttribute('src') === src ||
                        (targetPath && elPath === targetPath)
                    ) {
                        if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
                            if (!attrWidth && !attrHeight) {
                                attrWidth = imgEl.naturalWidth;
                                attrHeight = imgEl.naturalHeight;
                            } else if (attrWidth && !attrHeight) {
                                attrHeight = Math.round(
                                    attrWidth *
                                        (imgEl.naturalHeight /
                                            imgEl.naturalWidth),
                                );
                            } else if (!attrWidth && attrHeight) {
                                attrWidth = Math.round(
                                    attrHeight *
                                        (imgEl.naturalWidth /
                                            imgEl.naturalHeight),
                                );
                            }

                            break;
                        }
                    }
                }
            }
        }

        const width = attrWidth ?? 704;
        let height = attrHeight;

        if (!height) {
            height = width; // 1:1 default fallback
        }

        if (width > 704) {
            height = Math.round(height * (704 / width));
        }

        const heightMm = (height * 25.4) / 96;

        return heightMm + 1.0;
    }

    /**
     * Resolves aspect ratio (height / width) of an image tag.
     */
    public static getImageAspectRatio(imgTag: string): number {
        const wAttrMatch = imgTag.match(/width=["'](\d+)["']/i);
        const swMatch = imgTag.match(/width:\s*(\d+)px/i);
        const attrWidth = wAttrMatch
            ? parseInt(wAttrMatch[1], 10)
            : swMatch
              ? parseInt(swMatch[1], 10)
              : null;

        const hAttrMatch = imgTag.match(/height=["'](\d+)["']/i);
        const shMatch = imgTag.match(/height:\s*(\d+)px/i);
        const attrHeight = hAttrMatch
            ? parseInt(hAttrMatch[1], 10)
            : shMatch
              ? parseInt(shMatch[1], 10)
              : null;

        if (attrHeight && attrWidth && attrWidth > 0) {
            return attrHeight / attrWidth;
        }

        if (typeof document !== 'undefined') {
            const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);

            if (srcMatch && srcMatch[1]) {
                const src = srcMatch[1];
                const cleanUrl = (u: string) => {
                    try {
                        return new URL(u, window.location.origin).pathname;
                    } catch {
                        return u;
                    }
                };
                const targetPath = cleanUrl(src);
                const imgs = document.getElementsByTagName('img');

                for (let i = 0; i < imgs.length; i++) {
                    const imgEl = imgs[i];
                    const elPath = cleanUrl(
                        imgEl.currentSrc ||
                            imgEl.src ||
                            imgEl.getAttribute('src') ||
                            '',
                    );

                    if (
                        imgEl.src === src ||
                        imgEl.getAttribute('src') === src ||
                        (targetPath && elPath === targetPath)
                    ) {
                        if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
                            return imgEl.naturalHeight / imgEl.naturalWidth;
                        }
                    }
                }
            }
        }

        return 1.0;
    }

    /**
     * Parses list items and estimates each item height.
     */
    public static parseListItems(
        listHtml: string,
        maxCharsPerLine: number,
        fontLineHeight: number,
        itemSpacing: number,
    ): {
        tag: string;
        items: { html: string; height: number }[];
        listStyleType: string | null;
        styleAttr: string | null;
    } {
        if (typeof window === 'undefined') {
            return {
                tag: 'ul',
                items: [],
                listStyleType: null,
                styleAttr: null,
            };
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(listHtml, 'text/html');
        const listElement = doc.body.querySelector('ul, ol');

        if (!listElement) {
            return {
                tag: 'ul',
                items: [],
                listStyleType: null,
                styleAttr: null,
            };
        }

        const tag = listElement.nodeName.toLowerCase();
        const listStyleType = listElement.getAttribute('data-list-style-type');
        const styleAttr = listElement.getAttribute('style');

        const items: { html: string; height: number }[] = [];
        const rawLiNodes = Array.from(
            listElement.querySelectorAll(':scope > li'),
        );
        const liNodes =
            rawLiNodes.length > 0
                ? rawLiNodes
                : Array.from(listElement.querySelectorAll('li'));
        const listCharsPerLine = Math.max(10, maxCharsPerLine - 15);

        liNodes.forEach((li, idx) => {
            const isLast = idx === liNodes.length - 1;
            const liFull = li.outerHTML;
            const text = (li.textContent || '').trim();
            const lines = Math.max(
                1,
                Math.ceil(text.length / listCharsPerLine),
            );
            const height =
                lines * fontLineHeight + (isLast ? 0.0 : itemSpacing);

            items.push({
                html: liFull,
                height,
            });
        });

        return {
            tag,
            items,
            listStyleType,
            styleAttr,
        };
    }

    /**
     * Parses table and estimates row heights.
     */
    public static paginateTable(
        tableHtml: string,
        maxCharsPerLine: number,
        fontLineHeight: number,
    ): {
        headerHtml: string;
        headerHeight: number;
        rows: { html: string; height: number }[];
        colCount: number;
    } {
        if (typeof window === 'undefined') {
            return { headerHtml: '', headerHeight: 0.0, rows: [], colCount: 1 };
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(tableHtml, 'text/html');
        const table = doc.body.querySelector('table');

        if (!table) {
            return { headerHtml: '', headerHeight: 0.0, rows: [], colCount: 1 };
        }

        let headerHtml = '';
        let headerHeight = 0.0;
        const rows: { html: string; height: number }[] = [];

        const trList = Array.from(table.querySelectorAll('tr'));
        let colCount = 1;
        trList.forEach((tr) => {
            const ths = tr.querySelectorAll('th').length;
            const tds = tr.querySelectorAll('td').length;
            colCount = Math.max(colCount, ths, tds);
        });

        const cellPaddingVertical = 2.64;

        trList.forEach((tr) => {
            const isHeader =
                tr.parentElement?.nodeName.toLowerCase() === 'thead' ||
                tr.querySelector('th') !== null;
            const trHtml = tr.outerHTML;
            const cells = Array.from(tr.querySelectorAll('th, td'));

            let maxCellHeight = fontLineHeight + cellPaddingVertical;
            const cellChars = Math.max(
                8,
                Math.floor(maxCharsPerLine / Math.max(1, colCount)),
            );

            cells.forEach((cell) => {
                const text = (cell.textContent || '').trim();
                const lines = Math.max(1, Math.ceil(text.length / cellChars));
                const cellHeight = lines * fontLineHeight + cellPaddingVertical;
                maxCellHeight = Math.max(maxCellHeight, cellHeight);
            });

            if (isHeader) {
                headerHtml += trHtml;
                headerHeight += maxCellHeight;
            } else {
                rows.push({
                    html: trHtml,
                    height: maxCellHeight,
                });
            }
        });

        return {
            headerHtml,
            headerHeight,
            rows,
            colCount,
        };
    }
}
