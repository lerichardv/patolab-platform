import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditorRegistryContext } from './editor-registry-context';
import { ImageCropperDialog } from '../image-grid-component';
import { CustomBulletList, sharedExtensions } from './tiptap-extensions';

interface CollaborativeEditorProps {
    reportId: number;
    field: string;
    userName: string;
    cursorColor: string;
    initialContent: string;
    onUpdate: (html: string) => void;
    onUsersChange: (users: Array<{ name: string; color: string }>) => void;
    specimenSequenceCode: string;
    doc: Y.Doc | null;
    provider: HocuspocusProvider | null;
    onFocus?: (editor: Editor) => void;
    onBlur?: () => void;
    onEditorReady?: (editor: Editor | null) => void;
}

function CollaborativeEditorInner({
    reportId,
    field,
    userName,
    cursorColor,
    initialContent,
    onUpdate,
    onUsersChange,
    specimenSequenceCode,
    doc,
    provider,
    onFocus,
    onBlur,
    onEditorReady,
}: {
    reportId: number;
    field: string;
    userName: string;
    cursorColor: string;
    initialContent: string;
    onUpdate: (html: string) => void;
    onUsersChange: (users: Array<{ name: string; color: string }>) => void;
    specimenSequenceCode: string;
    doc: Y.Doc;
    provider: HocuspocusProvider;
    onFocus?: (editor: Editor) => void;
    onBlur?: () => void;
    onEditorReady?: (editor: Editor | null) => void;
}) {
    const registry = React.useContext(EditorRegistryContext);

    useEffect(() => {
        provider.awareness?.setLocalStateField('user', {
            name: userName,
            color: cursorColor,
        });
    }, [provider, userName, cursorColor]);

    useEffect(() => {
        const handleAwarenessUpdate = () => {
            const states = provider.awareness?.getStates() || new Map();
            const activeUsers: Array<{ name: string; color: string }> = [];
            states.forEach((state: any) => {
                if (state.user) {
                    activeUsers.push({
                        name: state.user.name,
                        color: state.user.color,
                    });
                }
            });
            onUsersChange(activeUsers);
        };
        provider.awareness?.on('update', handleAwarenessUpdate);
        handleAwarenessUpdate();

        return () => {
            provider.awareness?.off('update', handleAwarenessUpdate);
            onUsersChange([]);
        };
    }, [provider, onUsersChange]);

    const [isSynced, setIsSynced] = useState(provider.isSynced);

    useEffect(() => {
        const handleSynced = () => {
            setIsSynced(provider.isSynced);
        };

        provider.on('synced', handleSynced);

        if (provider.isSynced) {
            setIsSynced(true);
        }

        return () => {
            provider.off('synced', handleSynced);
        };
    }, [provider]);

    const [isFocused, setIsFocused] = useState(false);
    const [individualCroppingImage, setIndividualCroppingImage] = useState<{
        src: string;
        pos: number;
    } | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                undoRedo: false,
                bulletList: false,
            }),
            CustomBulletList,
            TableKit.configure({
                table: { resizable: true },
            }),
            ...sharedExtensions.map((ext) => {
                if (ext.name === 'imageGrid') {
                    return ext.configure({ specimenSequenceCode });
                }

                return ext;
            }),
            Collaboration.configure({ document: doc, field: 'content' }),
            CollaborationCursor.configure({
                provider: provider,
                user: {
                    name: userName,
                    color: cursorColor,
                },
                render: (user) => {
                    const cursor = document.createElement('span');
                    cursor.classList.add('collaboration-cursor__caret');
                    cursor.style.borderColor = user.color || '#3b82f6';

                    const label = document.createElement('div');
                    label.classList.add('collaboration-cursor__label');
                    label.style.backgroundColor = user.color || '#3b82f6';
                    label.style.borderColor = user.color || '#3b82f6';
                    label.textContent = user.name || 'Invitado';

                    cursor.appendChild(label);

                    return cursor;
                },
                selectionRender: (user) => {
                    return {
                        nodeName: 'span',
                        class: 'collaboration-cursor__selection',
                        style: `background-color: ${user.color || '#3b82f6'}25`,
                    };
                },
            }),
        ],
        editable: true,
        onUpdate({ editor }) {
            setTimeout(() => {
                onUpdate(editor.getHTML());
            }, 0);

            const isDictating = editor.extensionManager.extensions.find(
                (ext) => ext.name === 'dictationCursor',
            )?.options.isDictating;

            if (isDictating) {
                setTimeout(() => {
                    editor.commands.focus('end');
                }, 50);
            }
        },
        onFocus({ editor }) {
            setIsFocused(true);
            onFocus?.(editor);
        },
        onBlur() {
            setIsFocused(false);
            onBlur?.();
        },
    });

    useEffect(() => {
        if (editor) {
            if (onEditorReady) {
                onEditorReady(editor);
            }

            if (registry) {
                registry.registerEditor(field, editor);
            }

            return () => {
                if (onEditorReady) {
                    onEditorReady(null);
                }

                if (registry) {
                    registry.registerEditor(field, null);
                }
            };
        }
    }, [editor, onEditorReady, registry, field]);

    useEffect(() => {
        if (!editor || !provider) {
            return;
        }

        const updateState = () => {
            if (!provider.isSynced) {
                return;
            }

            setTimeout(() => {
                onUpdate(editor.getHTML());
            }, 50);
        };

        // Listen to synced event
        provider.on('synced', updateState);

        // Listen to transactions to capture both local & remote collaborative edits
        const handleTransaction = () => {
            if (!provider.isSynced) {
                return;
            }

            onUpdate(editor.getHTML());
        };
        editor.on('transaction', handleTransaction);

        // If it's already synced, trigger a deferred pull of the content
        if (provider.isSynced) {
            updateState();
        }

        return () => {
            provider.off('synced', updateState);
            editor.off('transaction', handleTransaction);
        };
    }, [editor, provider, onUpdate]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleOpenCropper = (e: Event) => {
            const customEvent = e as CustomEvent<{
                src: string;
                pos: number;
                editor: any;
            }>;

            if (customEvent.detail.editor === editor) {
                setIndividualCroppingImage({
                    src: customEvent.detail.src,
                    pos: customEvent.detail.pos,
                });
            }
        };

        document.addEventListener('open-image-cropper', handleOpenCropper);

        return () => {
            document.removeEventListener(
                'open-image-cropper',
                handleOpenCropper,
            );
        };
    }, [editor]);

    const handleCropIndividualImage = async (croppedBlob: Blob) => {
        if (!individualCroppingImage || !editor) {
            return;
        }

        const uploadToast = toast.loading('Guardando imagen recortada...');
        const file = new File([croppedBlob], 'cropped.jpg', {
            type: 'image/jpeg',
        });
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(
                `/specimens/${specimenSequenceCode}/report-editor/upload-image`,
                {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN':
                            (
                                document.querySelector(
                                    'meta[name="csrf-token"]',
                                ) as HTMLMetaElement
                            )?.content ?? '',
                    },
                    body: formData,
                },
            );

            if (response.ok) {
                const data = await response.json();

                if (data.url) {
                    const pos = individualCroppingImage.pos;

                    // Update the image src and reset width/height attributes atomically
                    editor
                        .chain()
                        .focus()
                        .command(({ tr }: any) => {
                            const node = tr.doc.nodeAt(pos);

                            if (node && node.type.name === 'image') {
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    src: data.url,
                                    width: null,
                                    height: null,
                                });
                            }

                            return true;
                        })
                        .run();

                    toast.dismiss(uploadToast);
                    toast.success('Imagen recortada con éxito');
                    setIndividualCroppingImage(null);

                    return;
                }
            }
        } catch (err) {
            console.error(err);
        }

        toast.dismiss(uploadToast);
        toast.error('Error al guardar la imagen recortada');
    };

    const focusColorClass =
        field === 'diagnosis'
            ? 'border-blue-500 ring-1 ring-blue-500/20 shadow-md'
            : field === 'macroscopy'
              ? 'border-violet-500 ring-1 ring-violet-500/20 shadow-md'
              : field === 'microscopy'
                ? 'border-fuchsia-500 ring-1 ring-fuchsia-500/20 shadow-md'
                : 'border-primary ring-1 ring-primary/20 shadow-md';

    return (
        <div className="space-y-1">
            <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Editor de texto enriquecido
            </span>
            <div
                id={`editor-container-${field}`}
                className={cn(
                    'relative rounded-lg border bg-card text-card-foreground shadow-xs transition-all duration-200',
                    isFocused ? focusColorClass : 'border-border',
                )}
            >
                {!isSynced && (
                    <div className="absolute inset-0 z-50 flex animate-in flex-col items-center justify-center rounded-lg bg-background/85 backdrop-blur-xs duration-200 select-none fade-in">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="animate-pulse text-xs font-semibold text-muted-foreground">
                                Obteniendo datos...
                            </span>
                        </div>
                    </div>
                )}
                <EditorContent
                    editor={editor}
                    className="min-h-[160px] p-4 focus:outline-hidden"
                />
            </div>
            <div className="flex justify-end pt-1">
                <span className="flex items-center gap-1 rounded border border-emerald-500/10 bg-emerald-500/5 px-2 py-0.5 text-[9px] font-bold tracking-wider text-emerald-600 uppercase">
                    <Check className="h-3.5 w-3.5" /> Editable colaborativo
                </span>
            </div>

            {individualCroppingImage && (
                <ImageCropperDialog
                    src={individualCroppingImage.src}
                    isOpen={individualCroppingImage !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setIndividualCroppingImage(null);
                        }
                    }}
                    onCrop={handleCropIndividualImage}
                />
            )}
        </div>
    );
}

export function CollaborativeEditor(props: CollaborativeEditorProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (
        !isMounted ||
        typeof window === 'undefined' ||
        !props.doc ||
        !props.provider
    ) {
        return (
            <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-xs">
                <div className="h-10 border-b border-border bg-muted/40" />
                <div className="flex min-h-[160px] items-center justify-center p-4">
                    <span className="animate-pulse text-xs text-muted-foreground">
                        Cargando editor colaborativo...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <CollaborativeEditorInner
            {...props}
            doc={props.doc}
            provider={props.provider}
            onEditorReady={props.onEditorReady}
        />
    );
}
export default CollaborativeEditor;
