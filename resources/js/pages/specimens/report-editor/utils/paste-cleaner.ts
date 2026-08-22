/**
 * Unwraps an element by moving all its child nodes before it in its parent, then removing the element.
 */
function unwrapElement(el: Element): void {
    const parent = el.parentNode;

    if (!parent) {
        return;
    }

    while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
    }

    parent.removeChild(el);
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
        }

        // Create a completely new table element matching TipTap table tool structure
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
 * Standardizes all list items into <li><p> content using the default 8pt editor font size.
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

            const alignMatch = styleAttr.match(
                /text-align:\s*(left|center|right|justify)/i,
            );
            const textAlign = alignMatch ? alignMatch[1].toLowerCase() : null;

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

            if (textAlign) {
                innerP.setAttribute('style', `text-align: ${textAlign};`);
            }

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

    // Process all lists in the document (including native <ul> and <ol>) to ensure every list line has font-size: 8pt applied using the style attribute
    const allLists = Array.from(doc.querySelectorAll('ul, ol'));

    for (const list of allLists) {
        const listItems = Array.from(list.querySelectorAll('li'));

        for (const li of listItems) {
            let innerP = li.querySelector('p');

            if (!innerP) {
                innerP = doc.createElement('p');

                while (li.firstChild) {
                    innerP.appendChild(li.firstChild);
                }

                li.appendChild(innerP);
            }

            const existingStyle =
                innerP.getAttribute('style') || li.getAttribute('style') || '';
            const alignMatch = existingStyle.match(
                /text-align:\s*(left|center|right|justify)/i,
            );
            const styleParts: string[] = [];

            if (alignMatch) {
                styleParts.push(`text-align: ${alignMatch[1].toLowerCase()}`);
            }
            styleParts.push('font-size: 8pt');

            innerP.setAttribute('style', styleParts.join('; ') + ';');
            li.setAttribute('style', 'font-size: 8pt;');
        }
    }
}

/**
 * Normalizes inline styling, converts formatting styles into semantic tags (strong, em, u, s),
 * removes all span tags to make text direct children of paragraphs, and strips non-whitelisted attributes.
 */
function cleanInlineStylesAndElements(doc: Document): void {
    // 1. Unwrap or convert disallowed block/container tags into <p>
    const disallowedContainers = Array.from(
        doc.querySelectorAll(
            'div, section, article, header, footer, main, aside, center',
        ),
    );

    for (const container of disallowedContainers) {
        if (container.closest('table, ul, ol')) {
            unwrapElement(container);
            continue;
        }

        const tagName = container.tagName.toLowerCase();
        const styleAttr = container.getAttribute('style') || '';
        const alignAttr = container.getAttribute('align') || '';
        let textAlign: string | null = null;

        if (tagName === 'center' || alignAttr.toLowerCase() === 'center') {
            textAlign = 'center';
        } else if (alignAttr) {
            textAlign = ['left', 'center', 'right', 'justify'].includes(
                alignAttr.toLowerCase(),
            )
                ? alignAttr.toLowerCase()
                : null;
        }

        if (!textAlign && styleAttr) {
            const alignMatch = styleAttr.match(
                /text-align:\s*(left|center|right|justify)/i,
            );

            if (alignMatch) {
                textAlign = alignMatch[1].toLowerCase();
            }
        }

        const hasBlockChildren = Boolean(
            container.querySelector(
                'p, h1, h2, h3, h4, h5, h6, ul, ol, table, blockquote',
            ),
        );

        if (hasBlockChildren) {
            unwrapElement(container);
        } else {
            const p = doc.createElement('p');

            if (textAlign) {
                p.setAttribute('style', `text-align: ${textAlign};`);
            }

            while (container.firstChild) {
                p.appendChild(container.firstChild);
            }

            container.parentNode?.replaceChild(p, container);
        }
    }

    // 2. Normalize deprecated or alternate formatting tags
    const bElements = Array.from(doc.querySelectorAll('b'));

    for (const b of bElements) {
        const strong = doc.createElement('strong');

        while (b.firstChild) {
            strong.appendChild(b.firstChild);
        }

        b.parentNode?.replaceChild(strong, b);
    }

    const iElements = Array.from(doc.querySelectorAll('i'));

    for (const i of iElements) {
        const em = doc.createElement('em');

        while (i.firstChild) {
            em.appendChild(i.firstChild);
        }

        i.parentNode?.replaceChild(em, i);
    }

    const insElements = Array.from(doc.querySelectorAll('ins'));

    for (const ins of insElements) {
        const u = doc.createElement('u');

        while (ins.firstChild) {
            u.appendChild(ins.firstChild);
        }

        ins.parentNode?.replaceChild(u, ins);
    }

    const strikeElements = Array.from(doc.querySelectorAll('strike, del'));

    for (const strike of strikeElements) {
        const s = doc.createElement('s');

        while (strike.firstChild) {
            s.appendChild(strike.firstChild);
        }

        strike.parentNode?.replaceChild(s, strike);
    }

    // 3. Extract formatting from inline styles (bold, italic, underline, strikethrough, text-align)
    const allElements = Array.from(doc.querySelectorAll('*'));

    for (const el of allElements) {
        const tagName = el.tagName.toLowerCase();
        const styleAttr = el.getAttribute('style') || '';
        const alignAttr = el.getAttribute('align') || '';

        // Check text-align on block elements
        if (
            ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th', 'td'].includes(
                tagName,
            )
        ) {
            let textAlign: string | null = null;

            const alignMatch = styleAttr.match(
                /text-align:\s*(left|center|right|justify)/i,
            );

            if (alignMatch) {
                textAlign = alignMatch[1].toLowerCase();
            } else if (
                alignAttr &&
                ['left', 'center', 'right', 'justify'].includes(
                    alignAttr.toLowerCase(),
                )
            ) {
                textAlign = alignAttr.toLowerCase();
            }

            if (textAlign) {
                el.setAttribute('style', `text-align: ${textAlign};`);
            } else {
                el.removeAttribute('style');
            }
        }

        if (styleAttr) {
            const isBold = /font-weight:\s*(bold|bolder|[6-9]\d\d)/i.test(
                styleAttr,
            );
            const isItalic = /font-style:\s*(italic|oblique)/i.test(styleAttr);
            const isUnderline = /text-decoration:\s*[^;]*underline/i.test(
                styleAttr,
            );
            const isStrike = /text-decoration:\s*[^;]*line-through/i.test(
                styleAttr,
            );

            if (isBold || isItalic || isUnderline || isStrike) {
                const fragment = doc.createDocumentFragment();

                while (el.firstChild) {
                    fragment.appendChild(el.firstChild);
                }

                let wrapped: Node = fragment;

                if (isStrike && tagName !== 's') {
                    const s = doc.createElement('s');
                    s.appendChild(wrapped);
                    wrapped = s;
                }

                if (isUnderline && tagName !== 'u') {
                    const u = doc.createElement('u');
                    u.appendChild(wrapped);
                    wrapped = u;
                }

                if (isItalic && tagName !== 'em') {
                    const em = doc.createElement('em');
                    em.appendChild(wrapped);
                    wrapped = em;
                }

                if (isBold && tagName !== 'strong') {
                    const strong = doc.createElement('strong');
                    strong.appendChild(wrapped);
                    wrapped = strong;
                }

                el.appendChild(wrapped);
            }
        }
    }

    // 4. Unwrap all <span>, <font>, <nobr> elements so paragraph text and semantic marks become direct children
    let inlineWrappers = Array.from(doc.querySelectorAll('span, font, nobr'));

    while (inlineWrappers.length > 0) {
        for (const wrapper of inlineWrappers) {
            unwrapElement(wrapper);
        }

        inlineWrappers = Array.from(doc.querySelectorAll('span, font, nobr'));
    }

    // 5. Strip all non-whitelisted attributes across all elements
    const allowedAttrsByTag: Record<string, string[]> = {
        p: ['style'],
        h1: ['style'],
        h2: ['style'],
        h3: ['style'],
        h4: ['style'],
        h5: ['style'],
        h6: ['style'],
        th: ['colspan', 'rowspan', 'style'],
        td: ['colspan', 'rowspan', 'style'],
        table: ['class', 'style'],
        colgroup: ['style'],
        col: ['style'],
        ul: ['data-list-style-type', 'style'],
        ol: ['start'],
        img: [
            'src',
            'alt',
            'width',
            'height',
            'data-align',
            'data-caption',
            'class',
            'style',
        ],
        a: ['href', 'target', 'rel'],
        strong: [],
        em: [],
        u: [],
        s: [],
        sub: [],
        sup: [],
        span: ['style'],
        li: ['style'],
        tbody: [],
        tr: [],
        blockquote: [],
        code: [],
        br: [],
        hr: [],
    };

    const remainingElements = Array.from(doc.querySelectorAll('*'));

    for (const el of remainingElements) {
        const tagName = el.tagName.toLowerCase();
        const allowed = allowedAttrsByTag[tagName] || [];
        const attrs = Array.from(el.attributes).map((a) => a.name);

        for (const attr of attrs) {
            if (!allowed.includes(attr)) {
                el.removeAttribute(attr);
            }
        }

        // Clean style attribute if not valid for the tag
        const styleAttr = el.getAttribute('style') || '';

        if (styleAttr) {
            if (
                ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(
                    tagName,
                )
            ) {
                const styleParts: string[] = [];
                const alignMatch = styleAttr.match(
                    /text-align:\s*(left|center|right|justify)/i,
                );

                if (alignMatch) {
                    styleParts.push(
                        `text-align: ${alignMatch[1].toLowerCase()}`,
                    );
                }

                if (styleAttr.includes('font-size') || tagName === 'li') {
                    styleParts.push('font-size: 8pt');
                }

                if (styleParts.length > 0) {
                    el.setAttribute('style', styleParts.join('; ') + ';');
                } else {
                    el.removeAttribute('style');
                }
            } else if (['th', 'td'].includes(tagName)) {
                const alignMatch = styleAttr.match(
                    /text-align:\s*(left|center|right|justify)/i,
                );

                if (alignMatch) {
                    el.setAttribute(
                        'style',
                        `text-align: ${alignMatch[1].toLowerCase()};`,
                    );
                } else {
                    el.removeAttribute('style');
                }
            } else if (tagName === 'span') {
                el.setAttribute('style', 'font-size: 8pt;');
            } else if (tagName === 'ul') {
                const listStyleMatch = styleAttr.match(
                    /list-style-type:\s*([a-z-]+)/i,
                );

                if (listStyleMatch) {
                    el.setAttribute(
                        'style',
                        `list-style-type: ${listStyleMatch[1].toLowerCase()};`,
                    );
                } else {
                    el.removeAttribute('style');
                }
            } else if (tagName === 'table') {
                const minWidthMatch = styleAttr.match(/min-width:\s*([^;]+)/i);

                if (minWidthMatch) {
                    el.setAttribute(
                        'style',
                        `min-width: ${minWidthMatch[1].trim()};`,
                    );
                } else {
                    el.removeAttribute('style');
                }
            } else if (!['img', 'colgroup', 'col'].includes(tagName)) {
                el.removeAttribute('style');
            }
        }
    }

    // 6. Clean redundant nested marks and empty formatting tags
    const formattingTags = ['strong', 'em', 'u', 's', 'sub', 'sup'];

    for (const tag of formattingTags) {
        const nestedSameTag = Array.from(doc.querySelectorAll(`${tag} ${tag}`));

        for (const inner of nestedSameTag) {
            unwrapElement(inner);
        }
    }

    // Remove empty formatting tags (e.g. <strong></strong> or <em> </em> if purely whitespace and no children)
    for (const tag of formattingTags) {
        const elems = Array.from(doc.querySelectorAll(tag));

        for (const elem of elems) {
            if (!elem.hasChildNodes() || elem.textContent?.trim() === '') {
                if (elem.querySelectorAll('img, br').length === 0) {
                    if (elem.textContent && elem.textContent.length > 0) {
                        elem.parentNode?.replaceChild(
                            doc.createTextNode(elem.textContent),
                            elem,
                        );
                    } else {
                        elem.remove();
                    }
                }
            }
        }
    }

    // 7. Ensure all text inside paragraphs (in lists, tables, and body) has font-size: 8pt and is wrapped with TipTap's textStyle mark: <span style="font-size: 8pt;">
    const paragraphs = Array.from(doc.querySelectorAll('p'));

    for (const p of paragraphs) {
        if (!p.hasChildNodes() || p.textContent?.trim() === '') {
            continue;
        }

        const existingStyle = p.getAttribute('style') || '';
        const alignMatch = existingStyle.match(
            /text-align:\s*(left|center|right|justify)/i,
        );
        const styleParts: string[] = [];

        if (alignMatch) {
            styleParts.push(`text-align: ${alignMatch[1].toLowerCase()}`);
        }
        styleParts.push('font-size: 8pt');

        p.setAttribute('style', styleParts.join('; ') + ';');

        const existingSpans = Array.from(p.querySelectorAll('span'));

        if (existingSpans.length > 0) {
            for (const sp of existingSpans) {
                sp.setAttribute('style', 'font-size: 8pt;');
            }
        } else {
            const span = doc.createElement('span');
            span.setAttribute('style', 'font-size: 8pt;');

            while (p.firstChild) {
                span.appendChild(p.firstChild);
            }

            p.appendChild(span);
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

        // Stage 5: Clean Inline Styles, Unwrap Spans & Normalize Semantic Elements
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
