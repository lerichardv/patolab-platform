import { AlertCircle, GripVertical, Loader2, Microscope } from 'lucide-react';
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
import { ReadOnlyEditor } from '../components/read-only-editor';
import { StartMicroscopyDialog } from '../components/start-microscopy-dialog';
import type { MicroscopyEditorProps } from './types';

export function MicroscopyEditor({
    reportId,
    specimen,
    auth,
    microscopyHtml,
    setMicroscopyHtml,
    setMicroscopyUsers,
    microscopyDoc,
    microscopyProvider,
    headingsToggles,
    handleHeadingToggle,
    isAssigned,
    isFinished,
    sessionEditingEnabled,
    isMicroscopyEditable,
    isGeneratingPdf,
    onTransitionState,
    onStartMicroscopyFinalization,
    handleEditorFocus,
    handleEditorBlur,
    dragHandleProps,
}: MicroscopyEditorProps) {
    return (
        <>
            <div
                {...dragHandleProps}
                className="flex cursor-grab items-center justify-between rounded-r-md border-l-4 border-fuchsia-500/80 py-0.5 pr-2 pl-2 transition-colors select-none hover:bg-slate-100/50 active:cursor-grabbing dark:hover:bg-slate-800/30"
            >
                <div className="flex items-center gap-1.5">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
                        <Microscope className="h-4 w-4 text-fuchsia-500" />{' '}
                        Descripción Microscópica
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
                                    id="toggle-microscopy_html"
                                    checked={
                                        headingsToggles['microscopy_html'] ??
                                        true
                                    }
                                    onCheckedChange={(v) =>
                                        handleHeadingToggle(
                                            'microscopy_html',
                                            v,
                                        )
                                    }
                                    className="scale-75"
                                    disabled={!isAssigned}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {(headingsToggles['microscopy_html'] ?? true)
                                ? 'Ocultar título en PDF'
                                : 'Mostrar título en PDF'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {(specimen.status === 'received' ||
                specimen.status === 'macroscopic_review') && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center">
                    <AlertCircle className="mb-2 h-6 w-6 text-muted-foreground" />
                    <h4 className="text-xs font-semibold text-muted-foreground">
                        Fase no iniciada
                    </h4>
                    <p className="mt-1 max-w-xs text-[10px] text-muted-foreground">
                        Esta sección estará disponible una vez finalizada la
                        descripción macroscópica y completada la fase de
                        procesamiento.
                    </p>
                </div>
            )}

            {specimen.status === 'processing' && (
                <div className="relative flex min-h-[160px] flex-col items-center justify-center overflow-hidden rounded-lg border bg-muted/10 p-6 text-center">
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 p-4 backdrop-blur-xs">
                        <h4 className="mb-2 text-xs font-bold">
                            Fase de Procesamiento en Curso
                        </h4>
                        <p className="mb-4 max-w-xs text-[10px] text-muted-foreground">
                            Haga clic a continuación para pasar la muestra a
                            revisión microscópica e iniciar la redacción
                            colaborativa del reporte.
                        </p>
                        <StartMicroscopyDialog
                            onConfirm={() =>
                                onTransitionState('microscopic_review')
                            }
                        />
                    </div>
                </div>
            )}

            {(specimen.status === 'microscopic_review' ||
                specimen.status === 'finalized' ||
                specimen.status === 'delivered') && (
                <>
                    {isMicroscopyEditable ? (
                        <CollaborativeEditor
                            reportId={reportId}
                            field="microscopy"
                            userName={auth.user.name}
                            cursorColor={auth.user.cursor_color || '#d946ef'}
                            initialContent={microscopyHtml}
                            onUpdate={setMicroscopyHtml}
                            onUsersChange={setMicroscopyUsers}
                            specimenSequenceCode={specimen.sequence_code}
                            doc={microscopyDoc}
                            provider={microscopyProvider}
                            onFocus={(editor) =>
                                handleEditorFocus(editor, 'microscopy')
                            }
                            onBlur={handleEditorBlur}
                        />
                    ) : (
                        <ReadOnlyEditor content={microscopyHtml} />
                    )}

                    {(specimen.status === 'microscopic_review' ||
                        (isFinished && sessionEditingEnabled)) && (
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={onStartMicroscopyFinalization}
                                disabled={isGeneratingPdf}
                                className="cursor-pointer gap-2 bg-fuchsia-600 font-semibold text-white shadow-sm hover:bg-fuchsia-700"
                            >
                                {isGeneratingPdf ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>
                                            Generando previsualización...
                                        </span>
                                    </>
                                ) : (
                                    <span>
                                        {isFinished
                                            ? 'Finalizar Reporte'
                                            : 'Completar Microscopía'}
                                    </span>
                                )}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </>
    );
}

export default MicroscopyEditor;
