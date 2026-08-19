import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { Editor } from '@tiptap/react';
import type * as Y from 'yjs';
import type { ReportEditorAuth, Specimen, SpecimenStatus } from '../types';

export type EditorField =
    | 'diagnosis'
    | 'macroscopy'
    | 'microscopy'
    | 'clinical_details'
    | 'comments_notes'
    | 'protocols'
    | 'legend'
    | 'open_text'
    | 'addendum';

export interface BaseRichTextEditorProps {
    reportId: number;
    specimen: Specimen;
    auth: ReportEditorAuth;
    headingsToggles: Record<string, boolean>;
    handleHeadingToggle: (fieldKey: string, value: boolean) => void;
    isAssigned: boolean;
    isFinished: boolean;
    sessionEditingEnabled: boolean;
    hasMacroAccess: boolean;
    hasMicroAccess: boolean;
    handleEditorFocus: (editor: Editor, field: EditorField) => void;
    handleEditorBlur: () => void;
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export interface ClinicalDetailsEditorProps extends BaseRichTextEditorProps {
    clinicalDetailsHtml: string;
    setClinicalDetailsHtml: (html: string) => void;
    setClinicalDetailsUsers: (
        users: Array<{ name: string; color: string }>,
    ) => void;
    clinicalDetailsDoc: Y.Doc | null;
    clinicalDetailsProvider: HocuspocusProvider | null;
}

export interface DiagnosisEditorProps extends BaseRichTextEditorProps {
    diagnosisHtml: string;
    setDiagnosisHtml: (html: string) => void;
    setDiagnosisUsers: (users: Array<{ name: string; color: string }>) => void;
    diagnosisDoc: Y.Doc | null;
    diagnosisProvider: HocuspocusProvider | null;
}

export interface MacroscopyEditorProps extends BaseRichTextEditorProps {
    macroscopyHtml: string;
    setMacroscopyHtml: (html: string) => void;
    setMacroscopyUsers: (users: Array<{ name: string; color: string }>) => void;
    macroscopyDoc: Y.Doc | null;
    macroscopyProvider: HocuspocusProvider | null;
    isMacroscopyEditable: boolean;
    hasCuttingsPermission?: boolean;
    onManageCuttingsClick: () => void;
    onTransitionState: (state: SpecimenStatus) => void;
}

export interface MicroscopyEditorProps extends BaseRichTextEditorProps {
    microscopyHtml: string;
    setMicroscopyHtml: (html: string) => void;
    setMicroscopyUsers: (users: Array<{ name: string; color: string }>) => void;
    microscopyDoc: Y.Doc | null;
    microscopyProvider: HocuspocusProvider | null;
    isMicroscopyEditable: boolean;
    isGeneratingPdf: boolean;
    onTransitionState: (state: SpecimenStatus) => void;
    onStartMicroscopyFinalization: () => void;
}

export interface CommentsNotesEditorProps extends BaseRichTextEditorProps {
    commentsNotesHtml: string;
    setCommentsNotesHtml: (html: string) => void;
    setCommentsNotesUsers: (
        users: Array<{ name: string; color: string }>,
    ) => void;
    commentsNotesDoc: Y.Doc | null;
    commentsNotesProvider: HocuspocusProvider | null;
}

export interface ProtocolsEditorProps extends BaseRichTextEditorProps {
    protocolsHtml: string;
    setProtocolsHtml: (html: string) => void;
    setProtocolsUsers: (users: Array<{ name: string; color: string }>) => void;
    protocolsDoc: Y.Doc | null;
    protocolsProvider: HocuspocusProvider | null;
}

export interface LegendEditorProps extends BaseRichTextEditorProps {
    legendHtml: string;
    setLegendHtml: (html: string) => void;
    setLegendUsers: (users: Array<{ name: string; color: string }>) => void;
    legendDoc: Y.Doc | null;
    legendProvider: HocuspocusProvider | null;
}

export interface OpenTextEditorProps extends BaseRichTextEditorProps {
    openTextHtml: string;
    setOpenTextHtml: (html: string) => void;
    setOpenTextUsers: (users: Array<{ name: string; color: string }>) => void;
    openTextDoc: Y.Doc | null;
    openTextProvider: HocuspocusProvider | null;
    openTextLabel: string;
    onOpenTextLabelChange: (label: string) => void;
}

export interface AddendumEditorProps extends Omit<
    BaseRichTextEditorProps,
    'dragHandleProps'
> {
    addendumHtml: string;
    setAddendumHtml: (html: string) => void;
    setAddendumUsers: (users: Array<{ name: string; color: string }>) => void;
    addendumDoc: Y.Doc | null;
    addendumProvider: HocuspocusProvider | null;
}
