import { FileText } from 'lucide-react';
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
import type { AddendumEditorProps } from './types';

export function AddendumEditor({
    reportId,
    specimen,
    auth,
    addendumHtml,
    setAddendumHtml,
    setAddendumUsers,
    addendumDoc,
    addendumProvider,
    headingsToggles,
    handleHeadingToggle,
    isAssigned,
    isFinished,
    sessionEditingEnabled,
    hasMacroAccess,
    hasMicroAccess,
    handleEditorFocus,
    handleEditorBlur,
}: AddendumEditorProps) {
    const isEditable =
        (!['finalized', 'delivered'].includes(specimen.status) ||
            (isFinished && sessionEditingEnabled)) &&
        (hasMacroAccess || hasMicroAccess);

    return (
        <div className="mt-8 space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="flex items-center justify-between py-0.5 pr-2 transition-colors select-none">
                <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 shrink-0 text-violet-500" />
                    <h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
                        Addendum
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
                                    id="toggle-addendum_html"
                                    checked={
                                        headingsToggles['addendum_html'] ?? true
                                    }
                                    onCheckedChange={(v) =>
                                        handleHeadingToggle('addendum_html', v)
                                    }
                                    className="scale-75"
                                    disabled={!isAssigned}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {(headingsToggles['addendum_html'] ?? true)
                                ? 'Ocultar título en PDF'
                                : 'Mostrar título en PDF'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {isEditable ? (
                <CollaborativeEditor
                    reportId={reportId}
                    field="addendum"
                    userName={auth.user.name}
                    cursorColor={auth.user.cursor_color || '#8b5cf6'}
                    initialContent={addendumHtml}
                    onUpdate={setAddendumHtml}
                    onFocus={(editor) => handleEditorFocus(editor, 'addendum')}
                    onBlur={handleEditorBlur}
                    onUsersChange={setAddendumUsers}
                    specimenSequenceCode={specimen.sequence_code}
                    doc={addendumDoc}
                    provider={addendumProvider}
                />
            ) : (
                <ReadOnlyEditor content={addendumHtml} />
            )}
        </div>
    );
}

export default AddendumEditor;
