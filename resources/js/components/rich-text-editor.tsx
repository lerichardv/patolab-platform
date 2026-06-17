import { ResizableNodeView } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import type { Editor } from '@tiptap/react';
import { useEditor, EditorContent, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Quote,
    ImagePlus,
    Grid3x3,
    Undo2,
    Redo2,
    Trash2,
    Highlighter,
    X,
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '@/components/ui/popover';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const editorStyles = `
  /* ── Base ── */
  .tiptap { outline: none; min-height: 160px; }

  /* ── Paragraphs ── */
  .tiptap p, .preview-content p { margin-bottom: 0.5rem; }

  /* ── Headings ── */
  .tiptap h1, .preview-content h1 { font-size: 1.4rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; color: #111827; }
  .tiptap h2, .preview-content h2 { font-size: 1.2rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.4rem; color: #1f2937; }
  .tiptap h3, .preview-content h3 { font-size: 1.05rem; font-weight: 600; margin-top: 0.6rem; margin-bottom: 0.3rem; color: #374151; }
  .tiptap h4, .preview-content h4 { font-size: 0.95rem; font-weight: 600; margin-top: 0.5rem; margin-bottom: 0.25rem; color: #4b5563; }

  /* ── Lists ── */
  .tiptap ul, .preview-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
  .tiptap ol, .preview-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
  .tiptap li, .preview-content li { margin-bottom: 0.15rem; }

  /* ── Inline marks ── */
  .tiptap u, .preview-content u { text-decoration: underline; }
  .tiptap s, .preview-content s { text-decoration: line-through; }

  .tiptap mark, .preview-content mark {
    background-color: #fef08a;
    color: inherit;
    border-radius: 2px;
    padding: 0 2px;
  }

  /* ── Blockquote ── */
  .tiptap blockquote, .preview-content blockquote {
    border-left: 3px solid #d1d5db;
    padding-left: 1rem;
    color: #6b7280;
    font-style: italic;
    margin: 0.5rem 0;
  }

  /* ── Code ── */
  .tiptap code, .preview-content code {
    background: #f3f4f6;
    border-radius: 3px;
    padding: 0.1em 0.3em;
    font-size: 0.85em;
    font-family: monospace;
  }

  /* ── Images ── */
  .tiptap img, .preview-content img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 0.5rem 0;
    display: block;
  }
  .tiptap img.ProseMirror-selectednode { outline: 2px solid #6366f1; outline-offset: 2px; }

  /* ── Image Alignment ── */
  .tiptap img[style*="text-align: center"],
  .tiptap img.align-center,
  .preview-content img[style*="text-align: center"],
  .preview-content img.align-center {
    margin-left: auto;
    margin-right: auto;
    display: block;
  }

  .tiptap img[style*="text-align: right"],
  .tiptap img.align-right,
  .preview-content img[style*="text-align: right"],
  .preview-content img.align-right {
    margin-left: auto;
    margin-right: 0;
    display: block;
  }

  .tiptap img[style*="text-align: left"],
  .tiptap img.align-left,
  .preview-content img[style*="text-align: left"],
  .preview-content img.align-left {
    margin-left: 0;
    margin-right: auto;
    display: block;
  }

  /* Alignment styling for the resizable image wrapper in the editor */
  .tiptap [data-resize-container]:has(img.align-center),
  .tiptap [data-resize-container]:has(img[data-align="center"]),
  .tiptap .image-wrapper:has(img.align-center),
  .tiptap .image-wrapper:has(img[data-align="center"]) {
    display: flex;
    justify-content: center;
  }

  .tiptap [data-resize-container]:has(img.align-right),
  .tiptap [data-resize-container]:has(img[data-align="right"]),
  .tiptap .image-wrapper:has(img.align-right),
  .tiptap .image-wrapper:has(img[data-align="right"]) {
    display: flex;
    justify-content: flex-end;
  }

  .tiptap [data-resize-container]:has(img.align-left),
  .tiptap [data-resize-container]:has(img[data-align="left"]),
  .tiptap .image-wrapper:has(img.align-left),
  .tiptap .image-wrapper:has(img[data-align="left"]) {
    display: flex;
    justify-content: flex-start;
  }

  /* ── Tables ── */
  .tiptap table, .preview-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5rem 0 0.75rem;
    font-size: 9.5px;
  }
  .tiptap table th, .tiptap table td,
  .preview-content table th, .preview-content table td {
    border: 1px solid #d1d5db;
    padding: 5px 8px;
    text-align: left;
    vertical-align: top;
    position: relative;
  }
  .tiptap table th, .preview-content table th {
    background-color: #f3f4f6;
    font-weight: 600;
  }
  .tiptap .selectedCell:after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(99, 102, 241, 0.12);
    pointer-events: none;
    z-index: 2;
  }
  .tiptap .column-resize-handle {
    position: absolute;
    right: -2px;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #818cf8;
    cursor: col-resize;
    pointer-events: all;
    z-index: 20;
  }
  .tiptap .tableWrapper { overflow-x: auto; }
  .tiptap.resize-cursor { cursor: col-resize; }

  /* ── Image Resize Handles ── */
  .tiptap [data-resize-handle] {
    position: absolute;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 2px;
    z-index: 1;
  }

  .tiptap [data-resize-handle]:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  /* Corner handles */
  .tiptap [data-resize-handle='top-left'],
  .tiptap [data-resize-handle='top-right'],
  .tiptap [data-resize-handle='bottom-left'],
  .tiptap [data-resize-handle='bottom-right'] {
    width: 8px;
    height: 8px;
  }

  .tiptap [data-resize-handle='top-left'] {
    top: -4px;
    left: -4px;
    cursor: nwse-resize;
  }

  .tiptap [data-resize-handle='top-right'] {
    top: -4px;
    right: -4px;
    cursor: nesw-resize;
  }

  .tiptap [data-resize-handle='bottom-left'] {
    bottom: -4px;
    left: -4px;
    cursor: nesw-resize;
  }

  .tiptap [data-resize-handle='bottom-right'] {
    bottom: -4px;
    right: -4px;
    cursor: nwse-resize;
  }

  /* Edge handles */
  .tiptap [data-resize-handle='top'],
  .tiptap [data-resize-handle='bottom'] {
    height: 6px;
    left: 8px;
    right: 8px;
  }

  .tiptap [data-resize-handle='top'] {
    top: -3px;
    cursor: ns-resize;
  }

  .tiptap [data-resize-handle='bottom'] {
    bottom: -3px;
    cursor: ns-resize;
  }

  .tiptap [data-resize-handle='left'],
  .tiptap [data-resize-handle='right'] {
    width: 6px;
    top: 8px;
    bottom: 8px;
  }

  .tiptap [data-resize-handle='left'] {
    left: -3px;
    cursor: ew-resize;
  }

  .tiptap [data-resize-handle='right'] {
    right: -3px;
    cursor: ew-resize;
  }

  .tiptap [data-resize-state='true'] [data-resize-wrapper] {
    outline: 1px solid rgba(0, 0, 0, 0.25);
    border-radius: 0.125rem;
  }

  /* ── Gapcursor ── */
  .tiptap .ProseMirror-gapcursor {
    display: none;
    pointer-events: none;
    position: absolute;
  }
  .tiptap .ProseMirror-gapcursor:after {
    content: "";
    display: block;
    border-top: 2px solid #3b82f6;
    width: 20px;
    animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
  }
  @keyframes ProseMirror-cursor-blink {
    to {
      visibility: hidden;
    }
  }
`;

const CustomImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            alignment: {
                default: 'center',
                parseHTML: (element) => {
                    const align = element.getAttribute('data-align');

                    if (align) {
                        return align;
                    }

                    const classes = element.getAttribute('class') || '';

                    if (classes.includes('align-left')) {
                        return 'left';
                    }

                    if (classes.includes('align-center')) {
                        return 'center';
                    }

                    if (classes.includes('align-right')) {
                        return 'right';
                    }

                    if (classes.includes('align-justify')) {
                        return 'justify';
                    }

                    const style = element.getAttribute('style') || '';

                    if (
                        style.includes('margin-left: 0') ||
                        style.includes('margin-right: auto')
                    ) {
                        return 'left';
                    }

                    if (
                        style.includes('margin-left: auto') &&
                        style.includes('margin-right: auto')
                    ) {
                        return 'center';
                    }

                    if (
                        style.includes('margin-left: auto') &&
                        style.includes('margin-right: 0')
                    ) {
                        return 'right';
                    }

                    return 'center';
                },
                renderHTML: (attributes) => {
                    const isLeft = attributes.alignment === 'left';
                    const isRight = attributes.alignment === 'right';
                    const marginLeft = isLeft ? '0' : 'auto';
                    const marginRight = isRight ? '0' : 'auto';

                    return {
                        'data-align': attributes.alignment,
                        class: `align-${attributes.alignment}`,
                        style: `display: block; margin-left: ${marginLeft}; margin-right: ${marginRight};`,
                    };
                },
            },
            width: {
                default: null,
                parseHTML: (element) => {
                    const width =
                        element.getAttribute('width') || element.style.width;

                    return width ? parseInt(width, 10) : null;
                },
            },
            height: {
                default: null,
                parseHTML: (element) => {
                    const height =
                        element.getAttribute('height') || element.style.height;

                    return height ? parseInt(height, 10) : null;
                },
            },
        };
    },

    renderHTML({ node, HTMLAttributes }) {
        const align = node?.attrs?.alignment || 'center';
        const isLeft = align === 'left';
        const isRight = align === 'right';
        const marginLeft = isLeft ? '0' : 'auto';
        const marginRight = isRight ? '0' : 'auto';

        const styles = [
            `display: block`,
            `margin-left: ${marginLeft}`,
            `margin-right: ${marginRight}`,
        ];
        const width = node?.attrs?.width;
        const height = node?.attrs?.height;

        if (width) {
            styles.push(`width: ${width}px`);
        }

        if (height) {
            styles.push(`height: ${height}px`);
        }

        return [
            'img',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                'data-align': align,
                class: `align-${align}`,
                style: styles.join('; ') + ';',
            }),
        ];
    },

    addNodeView() {
        if (
            !this.options.resize ||
            !this.options.resize.enabled ||
            typeof document === 'undefined'
        ) {
            return null;
        }

        const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } =
            this.options.resize;

        return ({ node, getPos, HTMLAttributes, editor }) => {
            const el = document.createElement('img');
            el.draggable = false;

            const mergedAttributes = mergeAttributes(
                this.options.HTMLAttributes,
                HTMLAttributes,
            );

            Object.entries(mergedAttributes).forEach(([key, value]) => {
                if (value != null) {
                    switch (key) {
                        case 'width':
                        case 'height':
                            break;
                        default:
                            el.setAttribute(key, value);
                            break;
                    }
                }
            });

            if (mergedAttributes.src !== null) {
                el.src = mergedAttributes.src;
            }

            const pill = document.createElement('div');
            pill.style.position = 'absolute';
            pill.style.bottom = '10px';
            pill.style.left = '50%';
            pill.style.transform = 'translateX(-50%)';
            pill.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
            pill.style.color = '#fff';
            pill.style.fontSize = '10px';
            pill.style.padding = '2px 8px';
            pill.style.borderRadius = '9999px';
            pill.style.pointerEvents = 'none';
            pill.style.zIndex = '50';
            pill.style.display = 'none';

            let naturalWidth = 0;
            let naturalHeight = 0;

            const nodeView = new ResizableNodeView({
                element: el,
                editor,
                node,
                getPos,
                onResize: (width, height) => {
                    el.style.width = `${width}px`;
                    el.style.height = `${height}px`;

                    pill.style.display = 'block';
                    let percentStr = '';

                    if (naturalWidth > 0) {
                        const pct = Math.round((width / naturalWidth) * 100);
                        percentStr = ` (${pct}%)`;
                    }

                    pill.innerText = `${width}px × ${height}px${percentStr}`;
                },
                onCommit: (width, height) => {
                    const pos = getPos();

                    if (pos === undefined) {
                        return;
                    }

                    editor
                        .chain()
                        .setNodeSelection(pos)
                        .updateAttributes(this.name, {
                            width,
                            height: null,
                        })
                        .run();

                    setTimeout(() => {
                        pill.style.display = 'none';
                    }, 1500);
                },
                onUpdate: (updatedNode, _decorations, _innerDecorations) => {
                    if (updatedNode.type !== node.type) {
                        return false;
                    }

                    if (updatedNode.attrs.width) {
                        el.style.width = `${updatedNode.attrs.width}px`;
                    } else {
                        el.style.width = '';
                    }

                    if (updatedNode.attrs.height) {
                        el.style.height = `${updatedNode.attrs.height}px`;
                    } else {
                        el.style.height = '';
                    }

                    const align = updatedNode.attrs.alignment || 'center';
                    el.setAttribute('data-align', align);
                    el.className = `align-${align}`;

                    const isLeft = align === 'left';
                    const isRight = align === 'right';
                    el.style.marginLeft = isLeft ? '0' : 'auto';
                    el.style.marginRight = isRight ? '0' : 'auto';

                    return true;
                },
                options: {
                    directions,
                    min: {
                        width: minWidth,
                        height: minHeight,
                    },
                    preserveAspectRatio: alwaysPreserveAspectRatio === true,
                },
            });

            const dom = nodeView.dom as HTMLElement;
            dom.appendChild(pill);

            dom.style.visibility = 'hidden';
            dom.style.pointerEvents = 'none';
            el.onload = () => {
                dom.style.visibility = '';
                dom.style.pointerEvents = '';
                naturalWidth = el.naturalWidth;
                naturalHeight = el.naturalHeight;
            };

            return nodeView;
        };
    },
});

const HIGHLIGHT_COLORS = [
    { name: 'Amarillo', color: '#ffff00' },
    { name: 'Verde brillante', color: '#00ff00' },
    { name: 'Turquesa', color: '#00ffff' },
    { name: 'Rosa', color: '#ff00ff' },
    { name: 'Azul', color: '#0000ff' },
    { name: 'Rojo', color: '#ff0000' },
    { name: 'Azul oscuro', color: '#000080' },
    { name: 'Teal', color: '#008080' },
    { name: 'Verde oscuro', color: '#008000' },
    { name: 'Morado', color: '#800080' },
    { name: 'Rojo oscuro', color: '#800000' },
    { name: 'Verde oliva', color: '#808000' },
    { name: 'Gris oscuro', color: '#808080' },
    { name: 'Gris claro', color: '#c0c0c0' },
    { name: 'Negro', color: '#000000' },
];

const sharedExtensions = [
    CustomImage.configure({
        allowBase64: false,
        resize: {
            enabled: true,
            alwaysPreserveAspectRatio: true,
        },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
    Highlight.configure({ multicolor: true }),
];

function ToolbarDivider() {
    return <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

function ToolbarBtn({
    onClick,
    active,
    title,
    disabled = false,
    children,
}: {
    onClick: () => void;
    active?: boolean;
    title: string;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={onClick}
                    disabled={disabled}
                    className={cn(
                        'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
                        active &&
                            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                    )}
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="py-1 text-xs">
                {title}
            </TooltipContent>
        </Tooltip>
    );
}

export function EditorToolbar({ editor }: { editor: Editor | null }) {
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleUpdate = () => {
            setTick((tick) => tick + 1);
        };
        editor.on('transaction', handleUpdate);

        return () => {
            editor.off('transaction', handleUpdate);
        };
    }, [editor]);

    const handleImageUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];

            if (!file || !editor) {
                return;
            }

            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch(
                    `/specimen-type-templates/upload-image`,
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
                        editor
                            .chain()
                            .focus()
                            .setImage({ src: data.url })
                            .run();
                    }
                } else {
                    toast.error('Error al subir la imagen');
                }
            } catch {
                toast.error('Error al subir la imagen');
            }
        };
        input.click();
    };

    const inTable = editor?.isActive('table');

    return (
        <TooltipProvider delayDuration={400}>
            <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1.5">
                <ToolbarBtn
                    onClick={() => editor?.chain().focus().undo().run()}
                    title="Deshacer (Ctrl+Z)"
                    disabled={!editor?.can().undo()}
                >
                    <Undo2 className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => editor?.chain().focus().redo().run()}
                    title="Rehacer (Ctrl+Y)"
                    disabled={!editor?.can().redo()}
                >
                    <Redo2 className="h-3.5 w-3.5" />
                </ToolbarBtn>

                <ToolbarDivider />

                <ToolbarBtn
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    active={editor?.isActive('bold')}
                    title="Negrita (Ctrl+B)"
                >
                    <Bold className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    active={editor?.isActive('italic')}
                    title="Cursiva (Ctrl+I)"
                >
                    <Italic className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() =>
                        editor?.chain().focus().toggleUnderline().run()
                    }
                    active={editor?.isActive('underline')}
                    title="Subrayado (Ctrl+U)"
                >
                    <UnderlineIcon className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => editor?.chain().focus().toggleStrike().run()}
                    active={editor?.isActive('strike')}
                    title="Tachado"
                >
                    <Strikethrough className="h-3.5 w-3.5" />
                </ToolbarBtn>

                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            disabled={!editor}
                            className={cn(
                                'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors',
                                'hover:bg-accent hover:text-accent-foreground',
                                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
                                editor?.isActive('highlight') &&
                                    'bg-accent text-accent-foreground',
                            )}
                            title="Color de resaltado de texto"
                        >
                            <Highlighter className="h-3.5 w-3.5" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                        <div className="grid grid-cols-5 gap-1">
                            {HIGHLIGHT_COLORS.map(({ name, color }) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .toggleHighlight({ color })
                                            .run()
                                    }
                                    className="h-6 w-6 cursor-pointer rounded border border-border transition-transform hover:scale-110 focus:outline-hidden"
                                    style={{ backgroundColor: color }}
                                    title={name}
                                />
                            ))}
                        </div>
                        <div className="mt-2 border-t pt-2">
                            <button
                                type="button"
                                onClick={() =>
                                    editor
                                        ?.chain()
                                        .focus()
                                        .unsetHighlight()
                                        .run()
                                }
                                className="flex h-7 w-full cursor-pointer items-center justify-center gap-1 rounded border border-input bg-background px-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                            >
                                <X className="h-3 w-3" />
                                Sin color
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>

                <ToolbarDivider />

                <ToolbarBtn
                    onClick={() =>
                        editor
                            ?.chain()
                            .focus()
                            .toggleHeading({ level: 1 })
                            .run()
                    }
                    active={editor?.isActive('heading', { level: 1 })}
                    title="Título 1"
                >
                    <Heading1 className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() =>
                        editor
                            ?.chain()
                            .focus()
                            .toggleHeading({ level: 2 })
                            .run()
                    }
                    active={editor?.isActive('heading', { level: 2 })}
                    title="Título 2"
                >
                    <Heading2 className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() =>
                        editor
                            ?.chain()
                            .focus()
                            .toggleHeading({ level: 3 })
                            .run()
                    }
                    active={editor?.isActive('heading', { level: 3 })}
                    title="Título 3"
                >
                    <Heading3 className="h-3.5 w-3.5" />
                </ToolbarBtn>

                <ToolbarDivider />

                <ToolbarBtn
                    onClick={() => {
                        if (editor?.isActive('image')) {
                            editor
                                .chain()
                                .focus()
                                .updateAttributes('image', {
                                    alignment: 'left',
                                })
                                .run();
                        } else {
                            editor?.chain().focus().setTextAlign('left').run();
                        }
                    }}
                    active={
                        editor?.isActive({ textAlign: 'left' }) ||
                        editor?.isActive('image', { alignment: 'left' })
                    }
                    title="Alinear a la izquierda"
                >
                    <AlignLeft className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => {
                        if (editor?.isActive('image')) {
                            editor
                                .chain()
                                .focus()
                                .updateAttributes('image', {
                                    alignment: 'center',
                                })
                                .run();
                        } else {
                            editor
                                ?.chain()
                                .focus()
                                .setTextAlign('center')
                                .run();
                        }
                    }}
                    active={
                        editor?.isActive({ textAlign: 'center' }) ||
                        editor?.isActive('image', { alignment: 'center' })
                    }
                    title="Centrar"
                >
                    <AlignCenter className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => {
                        if (editor?.isActive('image')) {
                            editor
                                .chain()
                                .focus()
                                .updateAttributes('image', {
                                    alignment: 'right',
                                })
                                .run();
                        } else {
                            editor?.chain().focus().setTextAlign('right').run();
                        }
                    }}
                    active={
                        editor?.isActive({ textAlign: 'right' }) ||
                        editor?.isActive('image', { alignment: 'right' })
                    }
                    title="Alinear a la derecha"
                >
                    <AlignRight className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => {
                        if (editor?.isActive('image')) {
                            editor
                                .chain()
                                .focus()
                                .updateAttributes('image', {
                                    alignment: 'justify',
                                })
                                .run();
                        } else {
                            editor
                                ?.chain()
                                .focus()
                                .setTextAlign('justify')
                                .run();
                        }
                    }}
                    active={
                        editor?.isActive({ textAlign: 'justify' }) ||
                        editor?.isActive('image', { alignment: 'justify' })
                    }
                    title="Justificar"
                >
                    <AlignJustify className="h-3.5 w-3.5" />
                </ToolbarBtn>

                <ToolbarDivider />

                <ToolbarBtn
                    onClick={() =>
                        editor?.chain().focus().toggleBulletList().run()
                    }
                    active={editor?.isActive('bulletList')}
                    title="Lista de viñetas"
                >
                    <List className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() =>
                        editor?.chain().focus().toggleOrderedList().run()
                    }
                    active={editor?.isActive('orderedList')}
                    title="Lista numerada"
                >
                    <ListOrdered className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() =>
                        editor?.chain().focus().toggleBlockquote().run()
                    }
                    active={editor?.isActive('blockquote')}
                    title="Cita"
                >
                    <Quote className="h-3.5 w-3.5" />
                </ToolbarBtn>

                <ToolbarDivider />

                <ToolbarBtn onClick={handleImageUpload} title="Subir imagen">
                    <ImagePlus className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() =>
                        editor
                            ?.chain()
                            .focus()
                            .insertTable({
                                rows: 3,
                                cols: 3,
                                withHeaderRow: true,
                            })
                            .run()
                    }
                    title="Insertar tabla 3×3"
                >
                    <Grid3x3 className="h-3.5 w-3.5" />
                </ToolbarBtn>

                {inTable && (
                    <>
                        <ToolbarDivider />
                        <span className="px-1 text-[10px] text-muted-foreground select-none">
                            Tabla:
                        </span>
                        <ToolbarBtn
                            onClick={() =>
                                editor?.chain().focus().addColumnAfter().run()
                            }
                            title="Añadir columna"
                        >
                            <span className="text-[9px] leading-none font-bold">
                                +C
                            </span>
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() =>
                                editor?.chain().focus().addRowAfter().run()
                            }
                            title="Añadir fila"
                        >
                            <span className="text-[9px] leading-none font-bold">
                                +F
                            </span>
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() =>
                                editor?.chain().focus().deleteColumn().run()
                            }
                            title="Eliminar columna"
                        >
                            <span className="text-[9px] leading-none font-bold text-red-500">
                                −C
                            </span>
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() =>
                                editor?.chain().focus().deleteRow().run()
                            }
                            title="Eliminar fila"
                        >
                            <span className="text-[9px] leading-none font-bold text-red-500">
                                −F
                            </span>
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() =>
                                editor?.chain().focus().deleteTable().run()
                            }
                            title="Eliminar tabla"
                        >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </ToolbarBtn>
                    </>
                )}
            </div>
        </TooltipProvider>
    );
}

interface RichTextEditorAreaProps {
    content: string;
    onChange: (html: string) => void;
    onFocus: (editor: Editor) => void;
    onBlur: () => void;
    field: 'diagnosis' | 'macroscopy' | 'microscopy';
    label: string;
    editorRef?: React.MutableRefObject<Editor | null>;
}

export function RichTextEditorArea({
    content,
    onChange,
    onFocus,
    onBlur,
    field,
    label,
    editorRef,
}: RichTextEditorAreaProps) {
    const [isFocused, setIsFocused] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            TableKit.configure({
                table: { resizable: true },
            }),
            Underline,
            ...sharedExtensions,
        ],
        content,
        editable: true,
        onUpdate({ editor }) {
            onChange(editor.getHTML());
        },
        onFocus({ editor }) {
            setIsFocused(true);
            onFocus(editor);
        },
        onBlur() {
            setIsFocused(false);
            onBlur();
        },
    });

    // Keep editor reference in sync for parent
    useEffect(() => {
        if (editorRef) {
            editorRef.current = editor;
        }

        return () => {
            if (editorRef) {
                editorRef.current = null;
            }
        };
    }, [editor, editorRef]);

    // Sync content from outside (e.g. when template loads or changes)
    useEffect(() => {
        if (editor && content !== editor.getHTML() && !editor.isFocused) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    const focusColorClass =
        field === 'diagnosis'
            ? 'border-blue-500 ring-1 ring-blue-500/20 shadow-xs'
            : field === 'macroscopy'
              ? 'border-violet-500 ring-1 ring-violet-500/20 shadow-xs'
              : 'border-fuchsia-500 ring-1 ring-fuchsia-500/20 shadow-xs';

    return (
        <div className="space-y-1">
            <label className="block text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {label}
            </label>
            <div
                className={cn(
                    'relative rounded-lg border bg-card text-card-foreground shadow-xs transition-all duration-200',
                    isFocused ? focusColorClass : 'border-border',
                )}
            >
                <EditorContent
                    editor={editor}
                    className="min-h-[160px] p-4 focus:outline-hidden"
                />
            </div>
        </div>
    );
}
