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
import type { OpenTextEditorProps } from './types';

export function OpenTextEditor({
    reportId,
    specimen,
    auth,
    openTextHtml,
    setOpenTextHtml,
    setOpenTextUsers,
    openTextDoc,
    openTextProvider,
    openTextLabel,
    onOpenTextLabelChange,
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
}: OpenTextEditorProps) {
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
                <div className="mr-4 flex w-full items-center gap-1.5">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <FileText className="h-4 w-4 shrink-0 text-amber-500" />
                    {isEditable ? (
                        <input
                            type="text"
                            value={openTextLabel}
                            onChange={(e) =>
                                onOpenTextLabelChange(e.target.value)
                            }
                            maxLength={255}
                            className="w-full border-b border-transparent bg-transparent px-1 py-0.5 text-base font-bold tracking-tight text-slate-800 hover:border-slate-300 focus:border-primary focus:outline-hidden dark:text-slate-200"
                            placeholder="Texto Libre"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
                            {openTextLabel}
                        </h3>
                    )}
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className="flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Switch
                                    id="toggle-open_text_html"
                                    checked={
                                        headingsToggles['open_text_html'] ??
                                        true
                                    }
                                    onCheckedChange={(v) =>
                                        handleHeadingToggle('open_text_html', v)
                                    }
                                    className="scale-75"
                                    disabled={!isAssigned}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {(headingsToggles['open_text_html'] ?? true)
                                ? 'Ocultar título en PDF'
                                : 'Mostrar título en PDF'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {isEditable ? (
                <CollaborativeEditor
                    reportId={reportId}
                    field="open_text"
                    userName={auth.user.name}
                    cursorColor={auth.user.cursor_color || '#d97706'}
                    initialContent={openTextHtml}
                    onUpdate={setOpenTextHtml}
                    onUsersChange={setOpenTextUsers}
                    specimenSequenceCode={specimen.sequence_code}
                    doc={openTextDoc}
                    provider={openTextProvider}
                    onFocus={(editor) => handleEditorFocus(editor, 'open_text')}
                    onBlur={handleEditorBlur}
                />
            ) : (
                <ReadOnlyEditor content={openTextHtml} />
            )}
        </>
    );
}

export default OpenTextEditor;
