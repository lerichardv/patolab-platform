export function isEmptyHtml(html: string | null | undefined): boolean {
    if (!html) {
        return true;
    }

    // SSR fallback since DOMParser is not available on server
    if (typeof window === 'undefined') {
        if (
            html.includes('<img') ||
            html.includes('<table') ||
            html.includes('<tr') ||
            html.includes('<td')
        ) {
            return false;
        }

        const cleanStr = html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\u00a0/g, ' ')
            .trim();

        return cleanStr === '';
    }

    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const body = doc.body;

        if (body.querySelector('img') || body.querySelector('table')) {
            return false;
        }

        const cleanStr = (body.textContent || '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\u00a0/g, ' ')
            .trim();

        return cleanStr === '';
    } catch {
        if (html.includes('<img') || html.includes('<table')) {
            return false;
        }

        const cleanStr = html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\u00a0/g, ' ')
            .trim();

        return cleanStr === '';
    }
}

export function splitHtmlIntoLines(
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
                if (
                    currentLineLength + word.length > maxCharsPerLine &&
                    currentLineLength > 0
                ) {
                    currentLineHtml += closeActiveTags();
                    lines.push(currentLineHtml);

                    currentLineHtml = openActiveTags();
                    currentLineLength = 0;
                }

                currentLineHtml += word;
                currentLineLength += word.length;
            }
        }
    }

    if (currentLineLength > 0 || currentLineHtml.trim() !== '') {
        currentLineHtml += closeActiveTags();
        lines.push(currentLineHtml);
    }

    return lines;
}

export function getInnerHtml(html: string, tag: string): string {
    const regex = new RegExp(`^<${tag}[^>]*>(.*)<\\/${tag}>$`, 'is');
    const match = html.match(regex);

    return match ? match[1] : html;
}

export function getRootElementAttributes(htmlStr: string): {
    style: string;
    extraAttrs: string;
} {
    if (typeof window === 'undefined') {
        return { style: '', extraAttrs: '' };
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlStr, 'text/html');
        const elem = doc.body.firstElementChild;

        if (!elem) {
            return { style: '', extraAttrs: '' };
        }

        const styleAttr = elem.getAttribute('style') || '';

        let extraAttrs = '';

        for (let i = 0; i < elem.attributes.length; i++) {
            const attr = elem.attributes[i];

            if (
                attr.name !== 'style' &&
                attr.name !== 'class' &&
                attr.name !== 'id'
            ) {
                extraAttrs += ` ${attr.name}="${attr.value.replace(/"/g, '&quot;')}"`;
            }
        }

        return { style: styleAttr, extraAttrs };
    } catch {
        return { style: '', extraAttrs: '' };
    }
}

export function parseHtmlToBlocks(html: string): string[] {
    if (!html) {
        return [];
    }

    if (typeof window === 'undefined') {
        return [html];
    }

    const div = document.createElement('div');
    div.innerHTML = html;

    const blocks: string[] = [];
    let currentText = '';

    Array.from(div.childNodes).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            if (currentText.trim()) {
                blocks.push(currentText);
                currentText = '';
            }

            blocks.push((node as Element).outerHTML);
        } else {
            currentText += node.textContent || '';
        }
    });

    if (currentText.trim()) {
        blocks.push(currentText);
    }

    return blocks.length > 0 ? blocks : [html];
}
