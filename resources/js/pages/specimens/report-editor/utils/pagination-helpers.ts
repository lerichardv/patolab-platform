export function paginateList(
    listHtml: string,
    maxCharsPerLine: number = 155,
    fontLineHeight: number = 3.53,
) {
    const tag = listHtml.startsWith('<ol') ? 'ol' : 'ul';
    const itemRegex = /<li[^>]*>(.*?)<\/li>/gis;
    const items: { html: string; height: number }[] = [];
    let match;

    // List has 6.35mm left padding + bullet, taking ~8 characters
    const listCharsPerLine = Math.max(20, maxCharsPerLine - 8);

    while ((match = itemRegex.exec(listHtml)) !== null) {
        const liFull = match[0];
        const liInner = match[1];

        // Split by inner paragraphs or line breaks
        const segments = liInner
            .split(/<p[^>]*>|<\/p>|<br\s*\/?>|<div[^>]*>|<\/div>/i)
            .map((s) => s.replace(/<[^>]+>/g, '').trim())
            .filter((s) => s.length > 0);

        let itemLines = 0;
        if (segments.length === 0) {
            itemLines = 1;
        } else {
            for (const seg of segments) {
                itemLines += Math.max(
                    1,
                    Math.ceil(seg.length / listCharsPerLine),
                );
            }
        }

        const itemHeight = itemLines * fontLineHeight;
        items.push({ html: liFull, height: itemHeight });
    }

    const listStyleTypeMatch = listHtml.match(
        /data-list-style-type=["']([^"']+)["']/i,
    );
    const listStyleType = listStyleTypeMatch ? listStyleTypeMatch[1] : null;

    const styleMatch = listHtml.match(/style=["']([^"']+)["']/i);
    const styleAttr = styleMatch ? styleMatch[1] : null;

    return { tag, items, listStyleType, styleAttr };
}

export function paginateTable(
    tableHtml: string,
    maxCharsPerLine: number = 155,
    fontLineHeight: number = 3.97,
) {
    const trRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
    const rows: { html: string; height: number; maxCellTextLen: number }[] = [];
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
    // Average char width for 2.51mm (7.5-8pt) table font is ~1.7mm
    const charsPerCell = Math.max(8, Math.floor(usableCellWidthMm / 1.7));
    const cellPaddingVertical = 2.64; // 1.06mm top + 1.06mm bottom + 0.52mm borders

    for (const trHtml of allMatches) {
        const isHeader = trHtml.includes('<th') || trHtml.includes('thead');
        const cellRegex = /<(?:td|th)[^>]*>(.*?)<\/(?:td|th)>/gis;
        let cellMatch;
        let maxCellHeight = fontLineHeight + cellPaddingVertical;
        let maxCellTextLen = 0;

        while ((cellMatch = cellRegex.exec(trHtml)) !== null) {
            const cellInner = cellMatch[1];
            // Split by paragraph / break tags inside the cell
            const segments = cellInner
                .split(/<p[^>]*>|<\/p>|<br\s*\/?>|<div[^>]*>|<\/div>/i)
                .map((s) => s.replace(/<[^>]+>/g, '').trim())
                .filter((s) => s.length > 0);

            let cellLines = 0;
            if (segments.length === 0) {
                cellLines = 1;
            } else {
                for (const seg of segments) {
                    maxCellTextLen = Math.max(maxCellTextLen, seg.length);
                    cellLines += Math.max(
                        1,
                        Math.ceil(seg.length / charsPerCell),
                    );
                }
            }

            const cellHeight = cellLines * fontLineHeight + cellPaddingVertical;
            maxCellHeight = Math.max(maxCellHeight, cellHeight);
        }

        if (isHeader) {
            headerHtml += trHtml;
            headerHeight += maxCellHeight;
        } else {
            rows.push({
                html: trHtml,
                height: maxCellHeight,
                maxCellTextLen,
            });
        }
    }

    return { headerHtml, headerHeight, rows, colCount };
}
