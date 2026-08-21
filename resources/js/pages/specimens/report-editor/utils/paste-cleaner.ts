// Supported font sizes in pt (points) matching report editor theme
const SUPPORTED_FONT_SIZES_PT = [
    '8pt',
    '9pt',
    '10pt',
    '11pt',
    '12pt',
    '14pt',
    '16pt',
    '18pt',
    '20pt',
    '24pt',
    '28pt',
    '36pt',
];

// Supported line heights
const SUPPORTED_LINE_HEIGHTS = ['1', '1.15', '1.25', '1.5', '1.75', '2'];

/**
 * Normalizes font size string (px, pt, rem, em, %) into standardized point (pt) values.
 */
function normalizeFontSize(val: string): string | null {
    if (!val) {
        return null;
    }

    const clean = val.trim().toLowerCase();
    let pt = 8; // Default 8pt

    if (clean.endsWith('pt')) {
        const parsed = parseFloat(clean);

        if (isNaN(parsed)) {
            return null;
        }

        pt = parsed;
    } else if (clean.endsWith('px')) {
        const px = parseFloat(clean);

        if (isNaN(px)) {
            return null;
        }

        // 1px = 0.75pt
        pt = px * 0.75;
    } else if (clean.endsWith('rem') || clean.endsWith('em')) {
        const rem = parseFloat(clean);

        if (isNaN(rem)) {
            return null;
        }

        // 1rem = 16px = 12pt
        pt = rem * 12;
    } else if (clean.endsWith('%')) {
        const pct = parseFloat(clean);

        if (isNaN(pct)) {
            return null;
        }

        pt = (pct / 100) * 8;
    } else {
        const num = parseFloat(clean);

        if (isNaN(num)) {
            return null;
        }

        pt = num;
    }

    // Find closest supported size in pt
    let closest = SUPPORTED_FONT_SIZES_PT[0]; // default 8pt
    let minDiff = Infinity;

    for (const size of SUPPORTED_FONT_SIZES_PT) {
        const sizePt = parseFloat(size);
        const diff = Math.abs(sizePt - pt);

        if (diff < minDiff) {
            minDiff = diff;
            closest = size;
        }
    }

    // Default base body size (8pt) does not need explicit style
    return closest === '8pt' ? null : closest;
}

/**
 * Normalizes line height value.
 */
function normalizeLineHeight(val: string): string | null {
    if (!val) {
        return null;
    }

    const clean = val.trim().toLowerCase();
    let num = 1.25;

    if (clean.endsWith('%')) {
        const pct = parseFloat(clean);

        if (isNaN(pct)) {
            return null;
        }

        num = pct / 100;
    } else {
        const parsed = parseFloat(clean);

        if (isNaN(parsed)) {
            return null;
        }

        num = parsed;
    }

    // Find closest supported line height
    let closest = '1.25';
    let minDiff = Infinity;

    for (const lh of SUPPORTED_LINE_HEIGHTS) {
        const lhNum = parseFloat(lh);
        const diff = Math.abs(lhNum - num);

        if (diff < minDiff) {
            minDiff = diff;
            closest = lh;
        }
    }

    return closest === '1.25' ? null : closest;
}

/**
 * Pre-sanitizes raw clipboard HTML by stripping Office comments, XML namespaces, and meta tags.
 */
function preSanitizeHtml(html: string): string {
    let clean = html;

    // Remove XML declaration and doctype
    clean = clean.replace(/<\?xml[^>]*>/gi, '');
    clean = clean.replace(/<!DOCTYPE[^>]*>/gi, '');

    // Remove conditional comments: <!--[if ...]>...<![endif]-->
    clean = clean.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '');
    // Remove standard comments: <!-- ... -->
    clean = clean.replace(/<!--[\s\S]*?-->/gi, '');

    // Remove Office specific tags: <o:p>...</o:p>, <w:...>, <m:...>, <v:...>, <xml>...</xml>
    clean = clean.replace(/<\/?(o|w|m|v|xml):[^>]*>/gi, '');

    // Remove <style>, <script>, <meta>, <link>, <title>, <head> tags and their contents
    clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
    clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
    clean = clean.replace(/<meta[^>]*>/gi, '');
    clean = clean.replace(/<link[^>]*>/gi, '');
    clean = clean.replace(/<title[\s\S]*?<\/title>/gi, '');
    clean = clean.replace(/<\/?(head|html|body)[^>]*>/gi, '');

    // Remove Google Docs wrapper element
    clean = clean.replace(
        /<b\s+id=["']docs-internal-guid-[^"']*["'][^>]*>([\s\S]*?)<\/b>/gi,
        '$1',
    );

    return clean;
}

/**
 * Reconstructs tables from scratch by iterating through rows and cells,
 * extracting only the clean cell content without any legacy formatting or styling,
 * and producing a brand new, clean, TipTap-compatible table matching the TipTap table tool.
 */
function cleanTables(doc: Document): void {
    const tables = Array.from(doc.querySelectorAll('table'));

    for (const table of tables) {
        const rows = Array.from(table.querySelectorAll('tr'));

        if (rows.length === 0) {
            table.remove();
            continue;
        }

        // Count maximum columns in table
        let maxCols = 1;

        for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('th, td'));
            let rowColCount = 0;

            for (const c of cells) {
                const span = parseInt(c.getAttribute('colspan') || '1', 10);
                rowColCount += isNaN(span) || span < 1 ? 1 : span;
            }

            if (rowColCount > maxCols) {
                maxCols = rowColCount;
            }
        } // Create a completely new table element matching TipTap table tool structure
        const newTable = doc.createElement('table');
        newTable.setAttribute('style', `min-width: ${maxCols * 25}px;`);

        const colgroup = doc.createElement('colgroup');

        for (let i = 0; i < maxCols; i++) {
            const col = doc.createElement('col');
            col.setAttribute('style', 'min-width: 25px;');
            colgroup.appendChild(col);
        }

        newTable.appendChild(colgroup);

        const tbody = doc.createElement('tbody');
        newTable.appendChild(tbody);

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const cells = Array.from(row.querySelectorAll('th, td'));

            if (cells.length === 0) {
                continue;
            }

            const newRow = doc.createElement('tr');
            // The first row is always the header row (<th>), matching TipTap tool
            const isHeaderRow = rowIndex === 0;

            for (const cell of cells) {
                const cellTag = isHeaderRow ? 'th' : 'td';
                const newCell = doc.createElement(cellTag);

                // Preserve colspan / rowspan if valid integer > 1
                const colspan = cell.getAttribute('colspan');
                const rowspan = cell.getAttribute('rowspan');

                newCell.setAttribute(
                    'colspan',
                    colspan && parseInt(colspan, 10) > 1 ? colspan : '1',
                );
                newCell.setAttribute(
                    'rowspan',
                    rowspan && parseInt(rowspan, 10) > 1 ? rowspan : '1',
                );

                // Extract clean text content of cell, discarding all legacy styles & formatting
                const cellText = cell.textContent?.trim() || '';

                if (cellText) {
                    // Check if cell had multiple lines / paragraphs
                    const paragraphs = Array.from(
                        cell.querySelectorAll('p, div'),
                    )
                        .map((p) => p.textContent?.trim())
                        .filter(Boolean) as string[];

                    if (paragraphs.length > 1) {
                        for (const pText of paragraphs) {
                            const p = doc.createElement('p');
                            p.textContent = pText;
                            newCell.appendChild(p);
                        }
                    } else {
                        const p = doc.createElement('p');
                        p.textContent = cellText;
                        newCell.appendChild(p);
                    }
                } else {
                    const p = doc.createElement('p');
                    newCell.appendChild(p);
                }

                newRow.appendChild(newCell);
            }

            tbody.appendChild(newRow);
        }

        // Replace the old dirty table with the newly constructed clean table
        if (tbody.children.length > 0) {
            table.parentNode?.replaceChild(newTable, table);
        } else {
            table.remove();
        }
    }
}

/**
 * Detects Word mso-list paragraphs and bullet/number markers, converting them into clean semantic <ul> / <ol> lists.
 */
function cleanLists(doc: Document): void {
    const paragraphs = Array.from(doc.querySelectorAll('p, div'));

    let currentList: {
        type: 'ul' | 'ol';
        element: HTMLElement;
        items: HTMLElement[];
    } | null = null;

    for (const p of paragraphs) {
        // Check if inside a table or already inside a list
        if (p.closest('table, ul, ol')) {
            currentList = null;
            continue;
        }

        const className = p.getAttribute('class') || '';
        const styleAttr = p.getAttribute('style') || '';
        const text = p.textContent?.trim() || '';

        const isWordList =
            className.includes('MsoListParagraph') ||
            styleAttr.includes('mso-list:') ||
            p.querySelector('[style*="mso-list:Ignore"]') !== null;

        // Check for bullet marker characters: •, ·, o, §, -, *
        const bulletMatch = text.match(/^([•·o§\-*])\s+(.*)$/);
        // Check for numeric/ordered markers: 1., 1), a., a), i., (1)
        const orderedMatch = text.match(
            /^(\d+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)]\s+(.*)$/,
        );

        if (isWordList || bulletMatch || orderedMatch) {
            const isOrdered = Boolean(orderedMatch);
            const listTag = isOrdered ? 'ol' : 'ul';

            // Clean leading bullet/number prefix from element
            const ignoreSpan = p.querySelector('[style*="mso-list:Ignore"]');

            if (ignoreSpan) {
                ignoreSpan.remove();
            } else if (bulletMatch) {
                // Strip literal bullet character from text
                p.innerHTML = p.innerHTML.replace(
                    /^(\s*<[^>]+>)*\s*[•·o§\-*]\s*/,
                    '',
                );
            } else if (orderedMatch) {
                // Strip literal order marker from text
                p.innerHTML = p.innerHTML.replace(
                    /^(\s*<[^>]+>)*\s*(\d+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)]\s*/,
                    '',
                );
            }

            // Create <li> containing the cleaned paragraph content
            const li = doc.createElement('li');
            const innerP = doc.createElement('p');

            while (p.firstChild) {
                innerP.appendChild(p.firstChild);
            }

            li.appendChild(innerP);

            if (!currentList || currentList.type !== listTag) {
                const listElem: HTMLElement = doc.createElement(listTag);
                p.parentNode?.insertBefore(listElem, p);
                currentList = {
                    type: listTag,
                    element: listElem,
                    items: [li],
                };
                listElem.appendChild(li);
            } else {
                currentList.element.appendChild(li);
                currentList.items.push(li);
            }

            p.remove();
        } else {
            currentList = null;
        }
    }
}

/**
 * Normalizes inline styling and strips non-whitelisted elements/attributes down to clean semantic HTML.
 */
function cleanInlineStylesAndElements(doc: Document): void {
    // 1. Unwrap disallowed block tags into <p> or inline children
    const disallowedContainers = Array.from(
        doc.querySelectorAll(
            'div, section, article, header, footer, main, aside',
        ),
    );

    for (const container of disallowedContainers) {
        if (container.closest('table, ul, ol')) {
            continue;
        }

        // Replace div with paragraph if it contains text or unwrap
        const p = doc.createElement('p');

        while (container.firstChild) {
            p.appendChild(container.firstChild);
        }

        container.parentNode?.replaceChild(p, container);
    }

    // 2. Normalize inline formatting
    const allElements = Array.from(doc.querySelectorAll('*'));

    for (const el of allElements) {
        const tagName = el.tagName.toLowerCase();

        // Convert <b> to <strong>
        if (tagName === 'b') {
            const strong = doc.createElement('strong');

            while (el.firstChild) {
                strong.appendChild(el.firstChild);
            }

            el.parentNode?.replaceChild(strong, el);
            continue;
        }

        // Convert <i> to <em>
        if (tagName === 'i') {
            const em = doc.createElement('em');

            while (el.firstChild) {
                em.appendChild(el.firstChild);
            }

            el.parentNode?.replaceChild(em, el);
            continue;
        }

        // Convert <strike>, <del> to <s>
        if (tagName === 'strike' || tagName === 'del') {
            const s = doc.createElement('s');

            while (el.firstChild) {
                s.appendChild(el.firstChild);
            }

            el.parentNode?.replaceChild(s, el);
            continue;
        }

        // Normalize style attribute
        const styleAttr = el.getAttribute('style') || '';

        if (styleAttr) {
            const stylesToKeep: string[] = [];

            // Check bold in inline style
            const isBold = /font-weight:\s*(bold|bolder|[6-9]\d\d)/i.test(
                styleAttr,
            );
            const isItalic = /font-style:\s*italic/i.test(styleAttr);
            const isUnderline = /text-decoration:\s*[^;]*underline/i.test(
                styleAttr,
            );
            const isStrike = /text-decoration:\s*[^;]*line-through/i.test(
                styleAttr,
            );

            // Check font-size
            const sizeMatch = styleAttr.match(/font-size:\s*([^;]+)/i);

            if (sizeMatch) {
                const normSize = normalizeFontSize(sizeMatch[1]);

                if (normSize) {
                    stylesToKeep.push(`font-size: ${normSize}`);
                }
            }

            // Check line-height
            const lhMatch = styleAttr.match(/line-height:\s*([^;]+)/i);

            if (lhMatch) {
                const normLh = normalizeLineHeight(lhMatch[1]);

                if (normLh) {
                    stylesToKeep.push(`line-height: ${normLh}`);
                }
            }

            // Check text-align on block elements
            if (
                ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th', 'td'].includes(
                    tagName,
                )
            ) {
                const alignMatch = styleAttr.match(
                    /text-align:\s*(left|center|right|justify)/i,
                );

                if (alignMatch) {
                    stylesToKeep.push(
                        `text-align: ${alignMatch[1].toLowerCase()}`,
                    );
                }
            }

            // Apply cleaned styles
            if (stylesToKeep.length > 0) {
                el.setAttribute('style', stylesToKeep.join('; '));
            } else {
                el.removeAttribute('style');
            }

            // Wrap element with semantic tags if styles were extracted
            if (isBold && tagName !== 'strong') {
                const strong = doc.createElement('strong');
                el.parentNode?.insertBefore(strong, el);
                strong.appendChild(el);
            }

            if (isItalic && tagName !== 'em') {
                const em = doc.createElement('em');
                el.parentNode?.insertBefore(em, el);
                em.appendChild(el);
            }

            if (isUnderline && tagName !== 'u') {
                const u = doc.createElement('u');
                el.parentNode?.insertBefore(u, el);
                u.appendChild(el);
            }

            if (isStrike && tagName !== 's') {
                const s = doc.createElement('s');
                el.parentNode?.insertBefore(s, el);
                s.appendChild(el);
            }
        }

        // Clean useless span elements without attributes
        if (el.tagName.toLowerCase() === 'span' && el.attributes.length === 0) {
            while (el.firstChild) {
                el.parentNode?.insertBefore(el.firstChild, el);
            }

            el.remove();
        }

        // Strip non-whitelisted attributes
        const allowedAttrsByTag: Record<string, string[]> = {
            table: ['class'],
            th: ['colspan', 'rowspan', 'style'],
            td: ['colspan', 'rowspan', 'style'],
            p: ['style'],
            h1: ['style'],
            h2: ['style'],
            h3: ['style'],
            h4: ['style'],
            span: ['style'],
            img: ['src', 'alt', 'width', 'height'],
        };

        const allowed = allowedAttrsByTag[tagName] || [];
        const attrs = Array.from(el.attributes).map((a) => a.name);

        for (const attr of attrs) {
            if (!allowed.includes(attr)) {
                el.removeAttribute(attr);
            }
        }
    }
}

/**
 * Main function to clean, sanitize, and convert pasted HTML.
 */
export function cleanPastedHtml(html: string): string {
    if (!html || typeof window === 'undefined') {
        return html;
    }

    try {
        // Stage 1: Pre-sanitize Office/Web comments and metadata
        const preSanitized = preSanitizeHtml(html);

        // Stage 2: Parse into DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(
            `<body>${preSanitized}</body>`,
            'text/html',
        );

        // Stage 3: Convert Tables
        cleanTables(doc);

        // Stage 4: Convert Lists
        cleanLists(doc);

        // Stage 5: Clean Inline Styles & Disallowed Elements
        cleanInlineStylesAndElements(doc);

        // Stage 6: Return clean inner HTML
        return doc.body.innerHTML.trim();
    } catch {
        return html;
    }
}

/**
 * Main function to clean pasted plain text.
 * Converts tab-separated text (e.g. copied from Excel/Sheets) into TipTap-compatible HTML tables.
 */
export function cleanPastedText(text: string): string {
    if (!text) {
        return text;
    }

    // Check if plain text is TSV (tab-separated values from Excel / Google Sheets)
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length > 0 && lines.some((line) => line.includes('\t'))) {
        let maxCols = 1;
        const parsedRows = lines.map((line) => {
            const cols = line.split('\t');
            maxCols = Math.max(maxCols, cols.length);

            return cols;
        });

        const colgroupHtml = Array.from({ length: maxCols })
            .map(() => '<col style="min-width: 25px;">')
            .join('');

        const rowsHtml = parsedRows
            .map((cols, rowIndex) => {
                const isHeader = rowIndex === 0;
                const tag = isHeader ? 'th' : 'td';
                const cellsHtml = cols
                    .map(
                        (col) =>
                            `<${tag} colspan="1" rowspan="1"><p>${col.trim()}</p></${tag}>`,
                    )
                    .join('');

                return `<tr>${cellsHtml}</tr>`;
            })
            .join('');

        return `<table style="min-width: ${maxCols * 25}px;"><colgroup>${colgroupHtml}</colgroup><tbody>${rowsHtml}</tbody></table>`;
    }

    return text;
}
