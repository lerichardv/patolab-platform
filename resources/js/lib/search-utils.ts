/**
 * Utilities for accent-insensitive, case-insensitive, and punctuation-insensitive search.
 */

/**
 * Normalizes a string for search comparison:
 * - Converts to lowercase
 * - Strips accents/diacritics (tildes) using Unicode NFD decomposition
 * - Strips punctuation marks (keeps letters, numbers, and whitespace)
 * - Collapses consecutive whitespace and trims
 */
export function normalizeSearchText(
    text: string | number | null | undefined,
): string {
    if (text === null || text === undefined) {
        return '';
    }

    return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics / tildes
        .replace(/[^\p{L}\p{N}\s]/gu, '') // remove punctuation marks
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Strips all accents, punctuation marks, and whitespace for compact alphanumeric matching:
 * e.g., "0801-1990-12345" -> "0801199012345"
 * e.g., "B-24-001" -> "b24001"
 * e.g., "000-001-01-00000001" -> "0000010100000001"
 */
export function stripSearchPunctuationAndWhitespace(
    text: string | number | null | undefined,
): string {
    if (text === null || text === undefined) {
        return '';
    }

    return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Determines if a target text matches a search query:
 * - Case-insensitive
 * - Accent-insensitive (with or without tildes)
 * - Punctuation-insensitive (with or without hyphens, dots, spaces, etc.)
 * - Supports tokenized multi-word search (all words must appear in target)
 */
export function matchesSearch(
    target: string | number | null | undefined,
    query: string | null | undefined,
): boolean {
    if (!query || !query.trim()) {
        return true;
    }
    if (target === null || target === undefined) {
        return false;
    }

    const normQuery = normalizeSearchText(query);
    if (!normQuery) {
        return true;
    }

    const normTarget = normalizeSearchText(target);

    // 1. Direct normalized substring match (e.g. "perez" in "dr juan perez")
    if (normTarget.includes(normQuery)) {
        return true;
    }

    // 2. Compact match (ignoring dashes, slashes, dots, spaces, etc.)
    const compactQuery = stripSearchPunctuationAndWhitespace(query);
    const compactTarget = stripSearchPunctuationAndWhitespace(target);
    if (compactQuery && compactTarget.includes(compactQuery)) {
        return true;
    }

    // 3. Multi-word token match (all words in query must appear in target)
    const tokens = normQuery.split(' ').filter(Boolean);
    if (
        tokens.length > 1 &&
        tokens.every((token) => normTarget.includes(token))
    ) {
        return true;
    }

    return false;
}

/**
 * Checks whether any of the target candidates (or their combined text) matches the query.
 */
export function matchesAnySearch(
    targets: (string | number | null | undefined)[],
    query: string | null | undefined,
): boolean {
    if (!query || !query.trim()) {
        return true;
    }

    // Check individual targets
    for (const target of targets) {
        if (matchesSearch(target, query)) {
            return true;
        }
    }

    // Check combined text for multi-token cross-field queries (e.g. "B-24 Carlos" or "0801 Perez")
    const combined = targets
        .filter((t) => t !== null && t !== undefined && t !== '')
        .map(String)
        .join(' ');

    return matchesSearch(combined, query);
}
