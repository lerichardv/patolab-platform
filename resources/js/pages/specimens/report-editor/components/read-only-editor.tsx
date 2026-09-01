import { TableKit } from '@tiptap/extension-table';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Lock } from 'lucide-react';
import React from 'react';
import { CustomBulletList, sharedExtensions } from './tiptap-extensions';

interface ReadOnlyEditorProps {
    content: string;
}

export function ReadOnlyEditor({ content }: ReadOnlyEditorProps) {
    const editor = useEditor(
        {
            extensions: [
                StarterKit.configure({
                    bulletList: false,
                }),
                CustomBulletList,
                TableKit.configure({
                    table: { resizable: false },
                }),
                ...sharedExtensions,
            ],
            content,
            editable: false,
        },
        [content],
    );

    const characterCount =
        editor?.storage.characterCount?.characters() ?? 0;

    return (
        <div className="space-y-1">
            <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Editor de texto enriquecido
            </span>
            <div className="overflow-hidden rounded-lg border bg-muted/10 text-card-foreground shadow-xs">
                <EditorContent
                    editor={editor}
                    className="min-h-[160px] p-4 focus:outline-hidden"
                />
            </div>
            <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-medium tracking-tight text-muted-foreground">
                    {characterCount.toLocaleString()} / 65,535 caracteres
                </span>
                <span className="flex items-center gap-1 rounded border border-slate-500/10 bg-slate-500/5 px-2 py-0.5 text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                    <Lock className="h-3.5 w-3.5" /> Solo lectura
                </span>
            </div>
        </div>
    );
}

export default ReadOnlyEditor;
