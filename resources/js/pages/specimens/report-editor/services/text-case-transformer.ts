import type { Editor } from '@tiptap/react';

export type TextTransformType =
    | 'uppercase'
    | 'lowercase'
    | 'capitalize'
    | 'sentence';

export class TextCaseTransformer {
    public static transform(
        editor: Editor | null | undefined,
        type: TextTransformType,
    ): boolean {
        if (!editor) {
            return false;
        }

        const { state, view } = editor;
        const { tr, selection } = state;
        const { from, to } = selection;

        if (from === to) {
            return false;
        }

        // 1. Resolve selected ranges (handle CellSelection vs standard TextSelection)
        const ranges: Array<{ from: number; to: number }> = [];
        if (typeof (selection as any).forEachCell === 'function') {
            (selection as any).forEachCell((cellNode: any, cellPos: number) => {
                ranges.push({
                    from: cellPos,
                    to: cellPos + cellNode.nodeSize,
                });
            });
        } else {
            ranges.push({ from, to });
        }

        if (ranges.length === 0) {
            return false;
        }

        const replacements: Array<{
            from: number;
            to: number;
            text: string;
            marks: any;
        }> = [];

        // 2. Process each range independently
        ranges.forEach((range) => {
            const originalText = state.doc.textBetween(
                range.from,
                range.to,
                '\n',
            );
            if (!originalText) {
                return;
            }

            let transformedText = '';
            if (type === 'uppercase') {
                transformedText = originalText.toUpperCase();
            } else if (type === 'lowercase') {
                transformedText = originalText.toLowerCase();
            } else if (type === 'capitalize') {
                transformedText = originalText.replace(/\b\w/g, (c) =>
                    c.toUpperCase(),
                );
            } else if (type === 'sentence') {
                transformedText = originalText
                    .toLowerCase()
                    .replace(
                        /(^\s*|[.!?]\s+)([a-z])/g,
                        (m, p1, p2) => p1 + p2.toUpperCase(),
                    );
            } else {
                return;
            }

            let strIdx = 0;
            state.doc.nodesBetween(range.from, range.to, (node, pos) => {
                if (node.isText) {
                    const nodeStart = Math.max(range.from, pos);
                    const nodeEnd = Math.min(range.to, pos + node.nodeSize);

                    if (nodeStart < nodeEnd) {
                        const localStart = nodeStart - pos;
                        const localEnd = nodeEnd - pos;
                        const nodeText = node.text || '';

                        let transformedSlice = '';
                        for (
                            let offset = localStart;
                            offset < localEnd;
                            offset++
                        ) {
                            const origChar = nodeText[offset];

                            // Advance strIdx until we match origChar
                            while (
                                strIdx < originalText.length &&
                                originalText[strIdx] !== origChar
                            ) {
                                strIdx++;
                            }

                            if (strIdx < originalText.length) {
                                transformedSlice += transformedText[strIdx];
                                strIdx++;
                            } else {
                                transformedSlice += origChar;
                            }
                        }

                        replacements.push({
                            from: nodeStart,
                            to: nodeEnd,
                            text: transformedSlice,
                            marks: node.marks,
                        });
                    }
                }
                return true;
            });
        });

        if (replacements.length === 0) {
            return false;
        }

        // Sort replacements in reverse order of from position
        replacements.sort((a, b) => b.from - a.from);

        // Apply replacements to the transaction
        replacements.forEach((rep) => {
            const textNode = state.schema.text(rep.text, rep.marks);
            tr.replaceWith(rep.from, rep.to, textNode);
        });

        // Dispatch transaction
        if (tr.docChanged) {
            view.dispatch(tr);
            return true;
        }

        return false;
    }
}
