import { FileText, GripVertical } from 'lucide-react';
import React from 'react';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { CollaborativeEditor } from '../components/collaborative-editor';
import { ReadOnlyEditor } from '../components/read-only-editor';
import type { CommentsNotesEditorProps } from './types';

export function CommentsNotesEditor({
    reportId,
    specimen,
    auth,
    commentsNotesHtml,
    setCommentsNotesHtml,
    setCommentsNotesUsers,
    commentsNotesDoc,
    commentsNotesProvider,
    headingsToggles,
    handleHeadingToggle,
    isAssigned,
    isFinished,
    sessionEditingEnabled,
    hasMacroAccess,
    hasMicroAccess,
    handleEditorFocus,
    handleEditorBlur,
    dragHandleProps,
}: CommentsNotesEditorProps) {
    const isEditable =
        (!['finalized', 'delivered'].includes(specimen.status) ||
            (isFinished && sessionEditingEnabled)) &&
        (hasMacroAccess || hasMicroAccess);

    return (
        <>
            <div
                {...dragHandleProps}
                className="flex cursor-grab items-center justify-between rounded-r-md border-l-4 border-amber-500/85 py-0.5 pr-2 pl-2 transition-colors select-none hover:bg-slate-100/50 active:cursor-grabbing dark:hover:bg-slate-800/30"
            >
                <div className="flex items-center gap-1.5">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
                        <FileText className="h-4 w-4 text-amber-500" />{' '}
                        Comentarios y Notas
                    </h3>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className="flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Switch
                                    id="toggle-comments_notes_html"
                                    checked={
                                        headingsToggles[
                                            'comments_notes_html'
                                        ] ?? true
                                    }
                                    onCheckedChange={(v) =>
                                        handleHeadingToggle(
                                            'comments_notes_html',
                                            v,
                                        )
                                    }
                                    className="scale-75"
                                    disabled={!isAssigned}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {(headingsToggles['comments_notes_html'] ?? true)
                                ? 'Ocultar título en PDF'
                                : 'Mostrar título en PDF'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {isEditable ? (
                <CollaborativeEditor
                    reportId={reportId}
                    field="comments_notes"
                    userName={auth.user.name}
                    cursorColor={auth.user.cursor_color || '#f59e0b'}
                    initialContent={commentsNotesHtml}
                    onUpdate={setCommentsNotesHtml}
                    onUsersChange={setCommentsNotesUsers}
                    specimenSequenceCode={specimen.sequence_code}
                    doc={commentsNotesDoc}
                    provider={commentsNotesProvider}
                    onFocus={(editor) =>
                        handleEditorFocus(editor, 'comments_notes')
                    }
                    onBlur={handleEditorBlur}
                />
            ) : (
                <ReadOnlyEditor content={commentsNotesHtml} />
            )}
        </>
    );
}

export default CommentsNotesEditor;
