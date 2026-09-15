import { GripVertical, Microscope, Scissors } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { CollaborativeEditor } from '../components/collaborative-editor';
import { CompleteMacroscopyDialog } from '../components/complete-macroscopy-dialog';
import { ReadOnlyEditor } from '../components/read-only-editor';
import type { SpecimenStatus } from '../types';
import type { MacroscopyEditorProps } from './types';

export function MacroscopyEditor({
    reportId,
    specimen,
    auth,
    macroscopyHtml,
    setMacroscopyHtml,
    setMacroscopyUsers,
    macroscopyDoc,
    macroscopyProvider,
    headingsToggles,
    handleHeadingToggle,
    isAssigned,
    isMacroscopyEditable,
    hasCuttingsPermission,
    onManageCuttingsClick,
    onTransitionState,
    handleEditorFocus,
    handleEditorBlur,
    dragHandleProps,
    nextStatus = null,
    availableStates = [],
}: MacroscopyEditorProps) {
    const nextStateObj = availableStates.find(
        (s: any) => (s.status ?? s) === nextStatus,
    );
    const nextStatusLabel =
        nextStateObj?.label ||
        (nextStatus === 'processing'
            ? 'Procesamiento'
            : nextStatus === 'microscopic_review'
              ? 'Microscopía'
              : nextStatus === 'finalized'
                ? 'Finalizado'
                : nextStatus || 'Siguiente Fase');

    return (
        <>
            <div
                {...dragHandleProps}
                className="flex cursor-grab items-center justify-between rounded-r-md border-l-4 border-violet-500/80 py-0.5 pr-4 pl-2 transition-colors select-none hover:bg-slate-100/50 active:cursor-grabbing dark:hover:bg-slate-800/30"
            >
                <div className="flex items-center gap-1.5">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
                        <Microscope className="h-4 w-4 text-violet-500" />{' '}
                        Descripción Macroscópica
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className="flex items-center gap-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Switch
                                        id="toggle-macroscopy_html"
                                        checked={
                                            headingsToggles[
                                                'macroscopy_html'
                                            ] ?? true
                                        }
                                        onCheckedChange={(v) =>
                                            handleHeadingToggle(
                                                'macroscopy_html',
                                                v,
                                            )
                                        }
                                        className="scale-75"
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                Mostrar u ocultar sección
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {hasCuttingsPermission && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 border-violet-200 bg-violet-50/50 text-xs font-semibold text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-300 dark:hover:bg-violet-900/40"
                            onClick={(e) => {
                                e.stopPropagation();
                                onManageCuttingsClick();
                            }}
                        >
                            <Scissors className="h-3.5 w-3.5" />
                            <span>Gestionar Cortes</span>
                        </Button>
                    )}
                </div>
            </div>

            {isMacroscopyEditable ? (
                <CollaborativeEditor
                    reportId={reportId}
                    field="macroscopy"
                    userName={auth.user.name}
                    cursorColor={auth.user.cursor_color || '#8b5cf6'}
                    initialContent={macroscopyHtml}
                    onUpdate={setMacroscopyHtml}
                    onUsersChange={setMacroscopyUsers}
                    specimenSequenceCode={specimen.sequence_code}
                    doc={macroscopyDoc}
                    provider={macroscopyProvider}
                    onFocus={(editor) =>
                        handleEditorFocus(editor, 'macroscopy')
                    }
                    onBlur={handleEditorBlur}
                />
            ) : (
                <ReadOnlyEditor content={macroscopyHtml} />
            )}

            {specimen.status === 'macroscopic_review' && nextStatus && (
                <div className="flex justify-end pt-2">
                    <CompleteMacroscopyDialog
                        targetStatusLabel={nextStatusLabel}
                        onConfirm={() =>
                            onTransitionState(nextStatus as SpecimenStatus)
                        }
                    />
                </div>
            )}
        </>
    );
}

export default MacroscopyEditor;
