export const LIST_ITEM_SPACING = 0.8; // mm between list items

export function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
}

export function parseColumnPercentages(
    tableHtml: string,
    colCount: number,
): number[] {
    const colWidths: (number | null)[] = [];
    const colgroupMatch = tableHtml.match(/<colgroup[^>]*>(.*?)<\/colgroup>/is);

    if (colgroupMatch) {
        const colgroupHtml = colgroupMatch[1];
        const colRegex = /<col[^>]*>/gi;
        let colMatch;

        while ((colMatch = colRegex.exec(colgroupHtml)) !== null) {
            const colHtml = colMatch[0];
            let width: number | null = null;

            const styleWidthMatch = colHtml.match(
                /style=["'][^"']*width:\s*([\d.]+)(px|%)?[^"']*["']/i,
            );

            if (styleWidthMatch) {
                width = parseFloat(styleWidthMatch[1]);
            } else {
                const widthAttrMatch = colHtml.match(
                    /width=["']([\d.]+)%?["']/i,
                );

                if (widthAttrMatch) {
                    width = parseFloat(widthAttrMatch[1]);
                }
            }

            colWidths.push(width);
        }
    }

    while (colWidths.length < colCount) {
        colWidths.push(null);
    }

    const finalColWidths = colWidths.slice(0, colCount);

    const hasExplicitWidth = finalColWidths.some((w) => w !== null && w > 0);

    if (!hasExplicitWidth) {
        return Array(colCount).fill(100.0 / colCount);
    }

    const explicitWidths = finalColWidths.filter(
        (w) => w !== null && w > 0,
    ) as number[];
    const avgWidth =
        explicitWidths.reduce((a, b) => a + b, 0) / explicitWidths.length;

    const filledWidths = finalColWidths.map((w) =>
        w !== null && w > 0 ? w : avgWidth,
    );
    const totalWidth = filledWidths.reduce((a, b) => a + b, 0);

    return totalWidth > 0
        ? filledWidths.map((w) => (w / totalWidth) * 100.0)
        : Array(colCount).fill(100.0 / colCount);
}

export function paginateList(
    listHtml: string,
    maxCharsPerLine: number = 130,
    fontLineHeight: number = 3.53,
    itemSpacing: number = LIST_ITEM_SPACING,
) {
    const tag = listHtml.startsWith('<ol') ? 'ol' : 'ul';
    const itemRegex = /<li[^>]*>(.*?)<\/li>/gis;
    const items: {
        html: string;
        height: number;
        lineCount: number;
        textLength: number;
    }[] = [];
    let match;

    // List has 6.35mm left padding + bullet, taking ~15 characters equivalent
    const listCharsPerLine = Math.max(20, maxCharsPerLine - 15);

    const matches: { full: string; inner: string }[] = [];

    while ((match = itemRegex.exec(listHtml)) !== null) {
        matches.push({ full: match[0], inner: match[1] });
    }

    matches.forEach((m, idx) => {
        const isLast = idx === matches.length - 1;
        const liFull = m.full;
        const liInner = m.inner;

        // Split by inner paragraphs or line breaks
        const segments = liInner
            .split(/<p[^>]*>|<\/p>|<br\s*\/?>|<div[^>]*>|<\/div>/i)
            .map((s) => decodeHtmlEntities(s.replace(/<[^>]+>/g, '')).trim())
            .filter((s) => s.length > 0);

        let itemLines = 0;
        let totalTextLen = 0;

        if (segments.length === 0) {
            itemLines = 1;
            totalTextLen = decodeHtmlEntities(
                liInner.replace(/<[^>]+>/g, '').trim(),
            ).length;
        } else {
            for (const seg of segments) {
                totalTextLen += seg.length;
                itemLines += Math.max(
                    1,
                    Math.ceil(seg.length / listCharsPerLine),
                );
            }
        }

        const itemHeight =
            itemLines * fontLineHeight + (isLast ? 0.0 : itemSpacing);

        items.push({
            html: liFull,
            height: itemHeight,
            lineCount: itemLines,
            textLength: totalTextLen,
        });
    });

    const listStyleTypeMatch = listHtml.match(
        /data-list-style-type=["']([^"']+)["']/i,
    );
    const listStyleType = listStyleTypeMatch ? listStyleTypeMatch[1] : null;

    const styleMatch = listHtml.match(/style=["']([^"']+)["']/i);
    const styleAttr = styleMatch ? styleMatch[1] : null;

    return { tag, items, listStyleType, styleAttr, listCharsPerLine };
}

export function paginateTable(
    tableHtml: string,
    maxCharsPerLine: number = 155,
    fontLineHeight: number = 3.97,
) {
    const trRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
    const rows: {
        html: string;
        height: number;
        maxCellTextLen: number;
        isHeader?: boolean;
    }[] = [];
    let match;
    let headerHtml = '';
    let headerHeight = 0.0;
    let colCount = 1;

    // First pass to determine colCount
    const allMatches: string[] = [];

    while ((match = trRegex.exec(tableHtml)) !== null) {
        allMatches.push(match[0]);
        const thCount = (match[0].match(/<th/gi) || []).length;
        const tdCount = (match[0].match(/<td/gi) || []).length;
        colCount = Math.max(colCount, thCount, tdCount);
    }

    // Available page width = 185.9mm
    // Cell horizontal padding = 1.59mm * 2 = 3.18mm
    const colWidthMm = 185.9 / Math.max(1, colCount);
    const usableCellWidthMm = Math.max(10, colWidthMm - 3.18);
    // Average char width for 2.51mm (7.5-8pt) table font is ~1.15mm
    const charsPerCell = Math.min(
        maxCharsPerLine,
        Math.max(8, Math.floor(usableCellWidthMm / 1.15)),
    );
    const cellPaddingVertical = 2.64; // 1.06mm top + 1.06mm bottom + 0.52mm borders
    const colPcts = parseColumnPercentages(tableHtml, colCount);

    for (const trHtml of allMatches) {
        const isHeader = trHtml.includes('<th') || trHtml.includes('thead');
        const cellRegex = /<(?:td|th)[^>]*>(.*?)<\/(?:td|th)>/gis;
        let cellMatch;
        let maxCellHeight = fontLineHeight + cellPaddingVertical;
        let maxCellTextLen = 0;

        let cellIndex = 0;

        while ((cellMatch = cellRegex.exec(trHtml)) !== null) {
            const cellTagHtml = cellMatch[0];
            const cellInner = cellMatch[1];

            const colspanMatch = cellTagHtml.match(/colspan=["'](\d+)["']/i);
            const colSpan = colspanMatch ? parseInt(colspanMatch[1], 10) : 1;

            let colPct = 0;

            for (let c = 0; c < colSpan; c++) {
                colPct += colPcts[cellIndex + c] || 0;
            }

            if (colPct <= 0) {
                colPct = 100.0 / Math.max(1, colCount);
            }

            const colWidthMm = (185.9 * colPct) / 100.0;
            const usableCellWidthMm = Math.max(10, colWidthMm - 3.18);
            const dynamicCharsPerCell = Math.min(
                maxCharsPerLine,
                Math.max(8, Math.floor(usableCellWidthMm / 1.33)),
            );

            const decodedInner = decodeHtmlEntities(cellInner)
                .replace(/\u00A0/g, ' ')
                .replace(/\u2007/g, ' ')
                .replace(/\u202F/g, ' ');
            const isListCell =
                /<(?:ul|ol|li)[^>]*>/i.test(decodedInner) ||
                /[–-]\s{2,}/.test(decodedInner);
            const cellChars = isListCell
                ? Math.max(8, dynamicCharsPerCell - 15)
                : dynamicCharsPerCell;

            // Split by paragraph / break / list item tags inside the cell
            const segments = cellInner
                .split(
                    /<p[^>]*>|<\/p>|<br\s*\/?>|<div[^>]*>|<\/div>|<li[^>]*>|<\/li>/i,
                )
                .map((s: string) =>
                    decodeHtmlEntities(s.replace(/<[^>]+>/g, '')).trim(),
                )
                .filter((s: string) => s.length > 0);

            let cellLines = 0;

            if (segments.length === 0) {
                cellLines = 1;
            } else {
                for (const seg of segments) {
                    maxCellTextLen = Math.max(maxCellTextLen, seg.length);
                    cellLines += Math.max(1, Math.ceil(seg.length / cellChars));
                }
            }

            const cellHeight = cellLines * fontLineHeight + cellPaddingVertical;
            maxCellHeight = Math.max(maxCellHeight, cellHeight);
            cellIndex++;
        }

        if (isHeader) {
            headerHtml += trHtml;
            headerHeight += maxCellHeight;
        } else {
            rows.push({
                html: trHtml,
                height: maxCellHeight,
                maxCellTextLen,
                isHeader: false,
            });
        }
    }

    return {
        headerHtml,
        headerHeight,
        rows,
        colCount,
        colWidthMm,
        charsPerCell,
    };
}
