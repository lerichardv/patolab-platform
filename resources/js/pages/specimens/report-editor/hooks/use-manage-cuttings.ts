import { useCallback, useState } from 'react';
import type React from 'react';

export interface UseManageCuttingsOptions {
    editorRefs: React.MutableRefObject<Record<string, any>>;
}

export function useManageCuttings({ editorRefs }: UseManageCuttingsOptions) {
    const [isManageCuttingsOpen, setIsManageCuttingsOpen] = useState(false);

    const openManageCuttings = useCallback(() => {
        setIsManageCuttingsOpen(true);
    }, []);

    const closeManageCuttings = useCallback(() => {
        setIsManageCuttingsOpen(false);
    }, []);

    const handleInsertConcatenatedString = useCallback(
        (text: string) => {
            const editor = editorRefs.current['macroscopy'];

            if (editor) {
                setTimeout(() => {
                    const container = document.getElementById(
                        'editor-container-macroscopy',
                    );

                    if (container) {
                        container.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                        });
                    }

                    editor.commands.focus();
                    const from = editor.state.selection.from;

                    editor.chain().insertContent(`<p>${text}</p>`).run();

                    const startPos = from;
                    const endPos = startPos + text.length;

                    editor
                        .chain()
                        .setTextSelection({ from: startPos, to: endPos })
                        .run();
                }, 50);
            }
        },
        [editorRefs],
    );

    return {
        isManageCuttingsOpen,
        setIsManageCuttingsOpen,
        openManageCuttings,
        closeManageCuttings,
        handleInsertConcatenatedString,
    };
}

export default useManageCuttings;
