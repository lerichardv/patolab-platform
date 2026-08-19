export function paginateList(listHtml: string) {
    const tag = listHtml.startsWith('<ol') ? 'ol' : 'ul';
    const itemRegex = /<li[^>]*>(.*?)<\/li>/gis;
    const items: string[] = [];
    let match;

    while ((match = itemRegex.exec(listHtml)) !== null) {
        items.push(match[0]);
    }

    const listStyleTypeMatch = listHtml.match(
        /data-list-style-type=["']([^"']+)["']/i,
    );
    const listStyleType = listStyleTypeMatch ? listStyleTypeMatch[1] : null;

    const styleMatch = listHtml.match(/style=["']([^"']+)["']/i);
    const styleAttr = styleMatch ? styleMatch[1] : null;

    return { tag, items, listStyleType, styleAttr };
}

export function paginateTable(tableHtml: string) {
    const trRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
    const rows: { html: string; maxCellTextLen: number }[] = [];
    let match;
    let headerHtml = '';
    let colCount = 1;

    while ((match = trRegex.exec(tableHtml)) !== null) {
        const trHtml = match[0];
        const isHeader = trHtml.includes('<th') || trHtml.includes('thead');

        if (isHeader) {
            headerHtml += trHtml;
            const thCount = (trHtml.match(/<th/gi) || []).length;
            colCount = Math.max(colCount, thCount);
        } else {
            const tdCount = (trHtml.match(/<td/gi) || []).length;
            colCount = Math.max(colCount, tdCount);

            const tdRegex = /<td[^>]*>(.*?)<\/td>/gis;
            let tdMatch;
            let maxCellTextLen = 0;

            while ((tdMatch = tdRegex.exec(trHtml)) !== null) {
                const cellText = tdMatch[1].replace(/<[^>]+>/g, '').trim();
                maxCellTextLen = Math.max(maxCellTextLen, cellText.length);
            }

            rows.push({
                html: trHtml,
                maxCellTextLen,
            });
        }
    }

    return { headerHtml, rows, colCount };
}
