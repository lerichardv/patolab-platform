import type { Editor } from '@tiptap/react';

export function isSelectionInTable(editor: Editor | null): boolean {
    if (!editor) {
        return false;
    }

    try {
        if (
            editor.isActive('table') ||
            editor.isActive('tableCell') ||
            editor.isActive('tableRow') ||
            editor.isActive('tableHeader')
        ) {
            return true;
        }

        const selection = editor.state?.selection;

        if (!selection) {
            return false;
        }

        if (
            '$anchorCell' in selection ||
            'isCellSelection' in selection ||
            (selection as unknown as Record<string, unknown>).jsonID ===
                'cell' ||
            (
                selection as unknown as { constructor?: { name?: string } }
            ).constructor?.name?.includes('Cell')
        ) {
            return true;
        }

        if (
            'node' in selection &&
            (selection as unknown as { node?: { type?: { name?: string } } })
                .node?.type?.name === 'table'
        ) {
            return true;
        }

        const { $anchor, $head } = selection;

        if ($anchor) {
            for (let d = $anchor.depth; d >= 0; d--) {
                const nodeName = $anchor.node(d)?.type?.name;

                if (
                    nodeName === 'table' ||
                    nodeName === 'tableCell' ||
                    nodeName === 'tableRow' ||
                    nodeName === 'tableHeader'
                ) {
                    return true;
                }
            }
        }

        if ($head) {
            for (let d = $head.depth; d >= 0; d--) {
                const nodeName = $head.node(d)?.type?.name;

                if (
                    nodeName === 'table' ||
                    nodeName === 'tableCell' ||
                    nodeName === 'tableRow' ||
                    nodeName === 'tableHeader'
                ) {
                    return true;
                }
            }
        }

        if (
            editor.can().addColumnAfter() ||
            editor.can().addRowAfter() ||
            editor.can().deleteTable() ||
            editor.can().deleteColumn() ||
            editor.can().deleteRow()
        ) {
            return true;
        }

        if (typeof window !== 'undefined' && editor.view?.dom) {
            const domSel = window.getSelection();

            if (domSel && domSel.anchorNode) {
                const element =
                    domSel.anchorNode instanceof Element
                        ? domSel.anchorNode
                        : domSel.anchorNode.parentElement;
                const parentTable = element?.closest('table');

                if (parentTable && editor.view.dom.contains(parentTable)) {
                    return true;
                }
            }
        }
    } catch {
        // Fallback safely if doc or selection is transient
    }

    return false;
}
