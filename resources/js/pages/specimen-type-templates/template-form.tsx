import { useForm } from '@inertiajs/react';
import type { Editor } from '@tiptap/react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import {
    store as storeTemplate,
    update as updateTemplate,
} from '@/actions/App/Http/Controllers/SpecimenTypeTemplateController';
import {
    RichTextEditorArea,
    EditorToolbar,
    editorStyles,
} from '@/components/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

interface SpecimenType {
    id: number;
    name: string;
    has_template: boolean;
}

interface Template {
    id: number;
    specimen_type_id: number;
    diagnosis_html: string | null;
    macroscopy_html: string | null;
    microscopy_html: string | null;
}

interface Props {
    template: Template | null;
    specimenTypes: SpecimenType[];
    onSuccess: () => void;
}

export default function TemplateForm({
    template,
    specimenTypes,
    onSuccess,
}: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        specimen_type_id: template?.specimen_type_id || '',
        diagnosis_html: template?.diagnosis_html || '',
        macroscopy_html: template?.macroscopy_html || '',
        microscopy_html: template?.microscopy_html || '',
    });

    const [activeEditor, setActiveEditor] = useState<Editor | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                toast.success(
                    template ? 'Plantilla actualizada' : 'Plantilla creada',
                );
                onSuccess();
            },
            onError: (err: any) => {
                console.error(err);
                toast.error('Ocurrió un error al guardar la plantilla');
            },
        };

        if (template) {
            put(updateTemplate(template.id).url, options);
        } else {
            post(storeTemplate().url, options);
        }
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: editorStyles }} />
            <form
                onSubmit={handleSubmit}
                className="flex h-full min-h-0 flex-1 flex-col"
            >
                {/* Header selection */}
                <div className="shrink-0 space-y-4 border-b border-border bg-card px-6 py-4">
                    <div className="grid max-w-md gap-2">
                        <Label htmlFor="specimen_type_id">
                            Tipo de Muestra
                        </Label>
                        <Select
                            value={
                                data.specimen_type_id
                                    ? data.specimen_type_id.toString()
                                    : ''
                            }
                            onValueChange={(v) =>
                                setData(
                                    'specimen_type_id',
                                    v ? parseInt(v, 10) : '',
                                )
                            }
                            disabled={!!template}
                        >
                            <SelectTrigger id="specimen_type_id">
                                <SelectValue placeholder="Seleccione un tipo de muestra" />
                            </SelectTrigger>
                            <SelectContent>
                                {specimenTypes.map((type) => {
                                    const isDisabled =
                                        type.has_template &&
                                        (!template ||
                                            template.specimen_type_id !==
                                                type.id);

                                    return (
                                        <SelectItem
                                            key={type.id}
                                            value={type.id.toString()}
                                            disabled={isDisabled}
                                        >
                                            {type.name}{' '}
                                            {isDisabled
                                                ? '— (Ya tiene plantilla)'
                                                : ''}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        {errors.specimen_type_id && (
                            <p className="text-sm text-destructive">
                                {errors.specimen_type_id}
                            </p>
                        )}
                    </div>
                </div>

                {/* Shared Toolbar */}
                <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-card">
                    <EditorToolbar editor={activeEditor} />
                </div>

                {/* Stacked Rich Text Editors */}
                <div className="min-h-0 flex-1 space-y-8 overflow-y-auto bg-muted/10 px-6 py-6">
                    <RichTextEditorArea
                        content={data.diagnosis_html}
                        onChange={(html) => setData('diagnosis_html', html)}
                        onFocus={(editor) => setActiveEditor(editor)}
                        onBlur={() => {}}
                        field="diagnosis"
                        label="Plantilla de Diagnóstico"
                    />

                    <RichTextEditorArea
                        content={data.macroscopy_html}
                        onChange={(html) => setData('macroscopy_html', html)}
                        onFocus={(editor) => setActiveEditor(editor)}
                        onBlur={() => {}}
                        field="macroscopy"
                        label="Plantilla de Macroscopía"
                    />

                    <RichTextEditorArea
                        content={data.microscopy_html}
                        onChange={(html) => setData('microscopy_html', html)}
                        onFocus={(editor) => setActiveEditor(editor)}
                        onBlur={() => {}}
                        field="microscopy"
                        label="Plantilla de Microscopía"
                    />
                </div>

                {/* Footer submit action */}
                <div className="flex shrink-0 justify-end gap-3 border-t border-border bg-card px-6 py-4">
                    <Button
                        type="submit"
                        disabled={processing}
                        className="w-full cursor-pointer md:w-auto"
                    >
                        {processing && <Spinner className="mr-2" />}
                        {template ? 'Guardar Cambios' : 'Crear Plantilla'}
                    </Button>
                </div>
            </form>
        </>
    );
}
