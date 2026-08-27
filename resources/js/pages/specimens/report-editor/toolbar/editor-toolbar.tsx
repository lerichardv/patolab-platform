import type { Editor } from '@tiptap/react';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    BetweenHorizontalEnd,
    BetweenVerticalEnd,
    Bold,
    CaseSensitive,
    Heading1,
    Heading2,
    Heading3,
    Highlighter,
    ImagePlus,
    Italic,
    LayoutGrid,
    List,
    ListOrdered,
    Mic,
    Quote,
    Redo2,
    Sheet as SheetIcon,
    Sparkles,
    Strikethrough,
    Trash2,
    Underline as UnderlineIcon,
    Undo2,
    X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { uploadReportImage } from '../actions';
import AIDictationSheet from '../ai-dictation-sheet';
import AIGrammarSheet from '../ai-grammar-sheet';
import { HIGHLIGHT_COLORS } from '../components/tiptap-extensions';
import { TextCaseTransformer } from '../services';
import type { TextTransformType } from '../services';
import { isSelectionInTable } from '../utils';
import { FontSizeDropdown } from './font-size-dropdown';
import { LineHeightDropdown } from './line-height-dropdown';
import { ToolbarBtn, ToolbarDivider } from './toolbar-btn';
import { ToolbarContext } from './toolbar-context';

export interface EditorToolbarProps {
    editor: Editor | null;
    specimenSequenceCode?: string;
    reportId: number;
    field: string | null;
    onDictationChange?: (isDictating: boolean) => void;
    isSheetOpen: boolean;
    onSheetOpenChange: (open: boolean) => void;
    onPopoverOpenChange?: (open: boolean) => void;
    isDictationSheetOpen: boolean;
    onDictationSheetOpenChange: (open: boolean) => void;
}

export function EditorToolbar({
    editor,
    specimenSequenceCode,
    field,
    onDictationChange,
    isSheetOpen: propsIsSheetOpen,
    onSheetOpenChange: propsOnSheetOpenChange,
    onPopoverOpenChange,
    isDictationSheetOpen,
    onDictationSheetOpenChange,
}: EditorToolbarProps) {
    const isSheetOpen = propsIsSheetOpen;
    const setIsSheetOpen = propsOnSheetOpenChange;
    const setIsDictationSheetOpen = onDictationSheetOpenChange;

    // Force update on editor transactions so button active states update reactively
    const [, setTick] = useState(0);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleUpdate = () => {
            setTick((tick) => tick + 1);
        };

        editor.on('transaction', handleUpdate);
        editor.on('selectionUpdate', handleUpdate);
        editor.on('update', handleUpdate);
        editor.on('focus', handleUpdate);
        editor.on('blur', handleUpdate);

        const dom = editor.view?.dom;

        if (dom) {
            dom.addEventListener('click', handleUpdate);
            dom.addEventListener('mouseup', handleUpdate);
            dom.addEventListener('keyup', handleUpdate);
            dom.addEventListener('pointerup', handleUpdate);
        }

        document.addEventListener('selectionchange', handleUpdate);

        // Initial sync
        handleUpdate();

        return () => {
            editor.off('transaction', handleUpdate);
            editor.off('selectionUpdate', handleUpdate);
            editor.off('update', handleUpdate);
            editor.off('focus', handleUpdate);
            editor.off('blur', handleUpdate);

            if (dom) {
                dom.removeEventListener('click', handleUpdate);
                dom.removeEventListener('mouseup', handleUpdate);
                dom.removeEventListener('keyup', handleUpdate);
                dom.removeEventListener('pointerup', handleUpdate);
            }

            document.removeEventListener('selectionchange', handleUpdate);
        };
    }, [editor]);

    const isDictating = isDictationSheetOpen;

    useEffect(() => {
        onDictationChange?.(isDictating);
    }, [isDictating, onDictationChange]);

    const [selectedText, setSelectedText] = useState('');
    const hasReplacedRef = useRef(false);

    const activeSelectionText = (() => {
        if (!editor) {
            return '';
        }

        try {
            const { from, to, empty } = editor.state.selection;

            if (!empty && from < to) {
                const text = editor.state.doc.textBetween(from, to, '\n');

                if (text.trim().length > 0) {
                    return text;
                }
            }

            // Fallback: check active DOM selection within editor
            if (typeof window !== 'undefined' && editor.view?.dom) {
                const domSelection = window.getSelection();

                if (
                    domSelection &&
                    domSelection.rangeCount > 0 &&
                    !domSelection.isCollapsed
                ) {
                    const anchorNode = domSelection.anchorNode;

                    if (anchorNode && editor.view.dom.contains(anchorNode)) {
                        const domText = domSelection.toString();

                        if (domText.trim().length > 0) {
                            return domText;
                        }
                    }
                }
            }
        } catch {
            // Safe fallback
        }

        return '';
    })();

    const hasSelection = activeSelectionText.trim().length > 0;

    const transformTextCase = (type: TextTransformType) => {
        if (!editor) {
            return;
        }

        editor.chain().focus().run();
        TextCaseTransformer.transform(editor, type);
    };

    const applyBulletListStyle = (
        style:
            | 'disc'
            | 'circle'
            | 'square'
            | 'dash'
            | 'checkmark'
            | 'arrow'
            | 'none',
    ) => {
        if (!editor) {
            return;
        }

        if (!editor.isActive('bulletList')) {
            editor.chain().focus().toggleBulletList().run();
        }

        editor
            .chain()
            .focus()
            .command(({ tr, state, dispatch }) => {
                const { $from } = state.selection;

                for (let depth = $from.depth; depth > 0; depth--) {
                    const node = $from.node(depth);

                    if (node.type.name === 'bulletList') {
                        if (dispatch) {
                            const pos = $from.before(depth);
                            tr.setNodeMarkup(pos, undefined, {
                                ...node.attrs,
                                listStyleType: style,
                            });
                        }

                        return true;
                    }
                }

                return false;
            })
            .run();
    };

    const handleOpenAISheet = () => {
        if (!editor) {
            return;
        }

        let selected = activeSelectionText;

        if (!selected.trim()) {
            selected = editor.state.doc.textBetween(
                editor.state.selection.from,
                editor.state.selection.to,
                '\n',
            );
        }

        if (!selected.trim()) {
            return;
        }

        setSelectedText(selected);
        hasReplacedRef.current = false;
        setIsSheetOpen(true);
    };

    const handleReplace = (correctedText: string, originalText?: string) => {
        if (!editor || !correctedText) {
            return;
        }

        hasReplacedRef.current = true;

        // Convert plain text with newlines into HTML paragraphs to ensure TipTap structures them correctly.
        // Split by double newlines for paragraphs, and replace single newlines with <br />.
        const htmlContent = correctedText
            .split(/\n\s*\n/)
            .map((para) => {
                const cleanPara = para.trim();

                if (!cleanPara) {
                    return '';
                }

                const withBreaks = cleanPara.replace(/\n/g, '<br />');

                return `<p>${withBreaks}</p>`;
            })
            .filter(Boolean)
            .join('');

        let chain = editor.chain().focus();

        if (originalText) {
            const { from, to } = editor.state.selection;
            const selected = editor.state.doc.textBetween(from, to, '\n');
            const index = selected.indexOf(originalText);

            if (index !== -1) {
                const replaceFrom = from + index;
                const replaceTo = replaceFrom + originalText.length;
                chain = chain.setTextSelection({
                    from: replaceFrom,
                    to: replaceTo,
                });
            }
        }

        chain.insertContent(htmlContent || correctedText).run();
        toast.success('El texto fue reemplazado con éxito.');
        setIsSheetOpen(false);
    };

    const handleOpenChange = (open: boolean) => {
        setIsSheetOpen(open);

        if (!open && !hasReplacedRef.current) {
            toast.info('El texto no fue reemplazado.');
        }
    };

    const handleInsertDictation = (text: string) => {
        if (!editor || !text) {
            return;
        }

        const htmlContent = text
            .split('\n\n')
            .map((p) => {
                const clean = p.trim();

                if (!clean) {
                    return '';
                }

                return `<p>${clean.replace(/\n/g, '<br>')}</p>`;
            })
            .filter(Boolean)
            .join('');

        editor.chain().focus().insertContent(htmlContent).run();
        toast.success('El texto dictado fue insertado con éxito.');
    };

    const handleImageUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];

            if (!file || !editor) {
                return;
            }

            try {
                const data = await uploadReportImage(
                    specimenSequenceCode,
                    file,
                    file.name,
                );

                if (data.url) {
                    editor.chain().focus().setImage({ src: data.url }).run();
                }
            } catch {
                toast.error('Error al subir la imagen');
            }
        };
        input.click();
    };

    if (!editor || editor.isDestroyed || !editor.view) {
        return null;
    }

    const inTable = isSelectionInTable(editor);
    const canUndo = Boolean(editor.can?.()?.undo?.());
    const canRedo = Boolean(editor.can?.()?.redo?.());
    const canAddColumnAfter = Boolean(editor.can?.()?.addColumnAfter?.());
    const canAddRowAfter = Boolean(editor.can?.()?.addRowAfter?.());
    const canDeleteColumn = Boolean(editor.can?.()?.deleteColumn?.());
    const canDeleteRow = Boolean(editor.can?.()?.deleteRow?.());
    const canDeleteTable = Boolean(editor.can?.()?.deleteTable?.());

    return (
        <ToolbarContext.Provider value={{ isDictating }}>
            <TooltipProvider delayDuration={400}>
                <div className="flex w-full flex-col bg-muted/40">
                    <div className="flex w-full flex-wrap items-center gap-0.5 p-1.5">
                        {/* History */}
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().undo().run()}
                            title="Deshacer (Ctrl+Z)"
                            disabled={!canUndo}
                        >
                            <Undo2 className="h-3.5 w-3.5" />
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().redo().run()}
                            title="Rehacer (Ctrl+Y)"
                            disabled={!canRedo}
                        >
                            <Redo2 className="h-3.5 w-3.5" />
                        </ToolbarBtn>

                        <ToolbarDivider />

                        {/* Formats */}
                        <ToolbarBtn
                            onClick={() =>
                                editor?.chain().focus().toggleBold().run()
                            }
                            active={editor?.isActive('bold')}
                            title="Negrita"
                        >
                            <Bold className="h-3.5 w-3.5" />
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() =>
                                editor?.chain().focus().toggleItalic().run()
                            }
                            active={editor?.isActive('italic')}
                            title="Cursiva"
                        >
                            <Italic className="h-3.5 w-3.5" />
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() =>
                                editor?.chain().focus().toggleUnderline().run()
                            }
                            active={editor?.isActive('underline')}
                            title="Subrayado"
                        >
                            <UnderlineIcon className="h-3.5 w-3.5" />
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() =>
                                editor?.chain().focus().toggleStrike().run()
                            }
                            active={editor?.isActive('strike')}
                            title="Tachado"
                        >
                            <Strikethrough className="h-3.5 w-3.5" />
                        </ToolbarBtn>

                        <Popover onOpenChange={onPopoverOpenChange}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    disabled={!editor || isDictating}
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

                        <DropdownMenu onOpenChange={onPopoverOpenChange}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={!editor || isDictating}
                                            className={cn(
                                                'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors focus:outline-hidden',
                                                'hover:bg-accent hover:text-accent-foreground',
                                                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
                                            )}
                                        >
                                            <CaseSensitive className="h-3.5 w-3.5 text-foreground" />
                                        </button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="bottom"
                                    className="py-1 text-xs"
                                >
                                    Transformar texto (mayúsculas, minúsculas,
                                    etc.)
                                </TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent
                                align="start"
                                onCloseAutoFocus={(e) => e.preventDefault()}
                                className="w-48 bg-popover text-popover-foreground"
                            >
                                <DropdownMenuItem
                                    onClick={() =>
                                        transformTextCase('uppercase')
                                    }
                                    disabled={!editor || !hasSelection}
                                    className="cursor-pointer"
                                >
                                    <span>MAYÚSCULAS</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        transformTextCase('lowercase')
                                    }
                                    disabled={!editor || !hasSelection}
                                    className="cursor-pointer"
                                >
                                    <span>minúsculas</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        transformTextCase('capitalize')
                                    }
                                    disabled={!editor || !hasSelection}
                                    className="cursor-pointer"
                                >
                                    <span>Capitalizar palabras</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        transformTextCase('sentence')
                                    }
                                    disabled={!editor || !hasSelection}
                                    className="cursor-pointer"
                                >
                                    <span>Tipo oración</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <FontSizeDropdown
                            editor={editor}
                            onPopoverOpenChange={onPopoverOpenChange}
                        />
                        <LineHeightDropdown
                            editor={editor}
                            onPopoverOpenChange={onPopoverOpenChange}
                        />

                        <ToolbarDivider />

                        {/* Headings */}
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

                        {/* Alignments */}
                        <ToolbarBtn
                            onClick={() => {
                                if (editor?.isActive('imageGrid')) {
                                    editor
                                        .chain()
                                        .focus()
                                        .updateAttributes('imageGrid', {
                                            alignment: 'left',
                                        })
                                        .run();
                                } else if (editor?.isActive('image')) {
                                    editor
                                        .chain()
                                        .focus()
                                        .updateAttributes('image', {
                                            alignment: 'left',
                                        })
                                        .run();
                                } else {
                                    editor
                                        ?.chain()
                                        .focus()
                                        .setTextAlign('left')
                                        .run();
                                }
                            }}
                            active={
                                editor?.isActive('imageGrid')
                                    ? editor?.isActive('imageGrid', {
                                          alignment: 'left',
                                      })
                                    : editor?.isActive('image')
                                      ? editor?.isActive('image', {
                                            alignment: 'left',
                                        })
                                      : editor?.isActive({ textAlign: 'left' })
                            }
                            title="Alinear a la izquierda"
                        >
                            <AlignLeft className="h-3.5 w-3.5" />
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => {
                                if (editor?.isActive('imageGrid')) {
                                    editor
                                        .chain()
                                        .focus()
                                        .updateAttributes('imageGrid', {
                                            alignment: 'center',
                                        })
                                        .run();
                                } else if (editor?.isActive('image')) {
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
                                editor?.isActive('imageGrid')
                                    ? editor?.isActive('imageGrid', {
                                          alignment: 'center',
                                      })
                                    : editor?.isActive('image')
                                      ? editor?.isActive('image', {
                                            alignment: 'center',
                                        })
                                      : editor?.isActive({
                                            textAlign: 'center',
                                        })
                            }
                            title="Centrar"
                        >
                            <AlignCenter className="h-3.5 w-3.5" />
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => {
                                if (editor?.isActive('imageGrid')) {
                                    editor
                                        .chain()
                                        .focus()
                                        .updateAttributes('imageGrid', {
                                            alignment: 'right',
                                        })
                                        .run();
                                } else if (editor?.isActive('image')) {
                                    editor
                                        .chain()
                                        .focus()
                                        .updateAttributes('image', {
                                            alignment: 'right',
                                        })
                                        .run();
                                } else {
                                    editor
                                        ?.chain()
                                        .focus()
                                        .setTextAlign('right')
                                        .run();
                                }
                            }}
                            active={
                                editor?.isActive('imageGrid')
                                    ? editor?.isActive('imageGrid', {
                                          alignment: 'right',
                                      })
                                    : editor?.isActive('image')
                                      ? editor?.isActive('image', {
                                            alignment: 'right',
                                        })
                                      : editor?.isActive({ textAlign: 'right' })
                            }
                            title="Alinear a la derecha"
                        >
                            <AlignRight className="h-3.5 w-3.5" />
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => {
                                if (editor?.isActive('imageGrid')) {
                                    editor
                                        .chain()
                                        .focus()
                                        .updateAttributes('imageGrid', {
                                            alignment: 'justify',
                                        })
                                        .run();
                                } else if (editor?.isActive('image')) {
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
                                editor?.isActive('imageGrid')
                                    ? editor?.isActive('imageGrid', {
                                          alignment: 'justify',
                                      })
                                    : editor?.isActive('image')
                                      ? editor?.isActive('image', {
                                            alignment: 'justify',
                                        })
                                      : editor?.isActive({
                                            textAlign: 'justify',
                                        })
                            }
                            title="Justificar"
                        >
                            <AlignJustify className="h-3.5 w-3.5" />
                        </ToolbarBtn>

                        <ToolbarDivider />

                        {/* Lists & quote */}
                        <DropdownMenu onOpenChange={onPopoverOpenChange}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={!editor || isDictating}
                                            className={cn(
                                                'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors focus:outline-hidden',
                                                editor?.isActive('bulletList')
                                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                                                    : 'hover:bg-accent hover:text-accent-foreground',
                                                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
                                            )}
                                        >
                                            <List className="h-3.5 w-3.5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="bottom"
                                    className="py-1 text-xs"
                                >
                                    Lista de viñetas
                                </TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent
                                align="start"
                                onCloseAutoFocus={(e) => e.preventDefault()}
                                className="w-44 bg-popover text-popover-foreground"
                            >
                                <DropdownMenuItem
                                    onClick={() => applyBulletListStyle('disc')}
                                    className="flex cursor-pointer items-center justify-between"
                                >
                                    <span>Puntos (Disc)</span>
                                    <span className="text-xs text-muted-foreground">
                                        •
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        applyBulletListStyle('circle')
                                    }
                                    className="flex cursor-pointer items-center justify-between"
                                >
                                    <span>Círculos (Circle)</span>
                                    <span className="text-xs text-muted-foreground">
                                        ○
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        applyBulletListStyle('square')
                                    }
                                    className="flex cursor-pointer items-center justify-between"
                                >
                                    <span>Cuadrados (Square)</span>
                                    <span className="text-xs text-muted-foreground">
                                        ■
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => applyBulletListStyle('dash')}
                                    className="flex cursor-pointer items-center justify-between"
                                >
                                    <span>Guiones (Dash)</span>
                                    <span className="text-xs text-muted-foreground">
                                        –
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        applyBulletListStyle('checkmark')
                                    }
                                    className="flex cursor-pointer items-center justify-between"
                                >
                                    <span>Checkmarks (Check)</span>
                                    <span className="text-xs text-muted-foreground">
                                        ✓
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        applyBulletListStyle('arrow')
                                    }
                                    className="flex cursor-pointer items-center justify-between"
                                >
                                    <span>Flechas (Arrow)</span>
                                    <span className="text-xs text-muted-foreground">
                                        ➢
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => applyBulletListStyle('none')}
                                    className="flex cursor-pointer items-center justify-between"
                                >
                                    <span>Ninguno (None)</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        Ninguno
                                    </span>
                                </DropdownMenuItem>
                                {editor?.isActive('bulletList') && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            editor
                                                ?.chain()
                                                .focus()
                                                .toggleBulletList()
                                                .run();
                                        }}
                                        className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                        Quitar lista
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <ToolbarBtn
                            onClick={() =>
                                editor
                                    ?.chain()
                                    .focus()
                                    .toggleOrderedList()
                                    .run()
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

                        {/* Dictation */}
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        disabled={!field}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() =>
                                            setIsDictationSheetOpen(true)
                                        }
                                        className={cn(
                                            'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors',
                                            'hover:bg-accent hover:text-accent-foreground',
                                            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
                                            'bg-transparent text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        <Mic className="h-3.5 w-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="bottom"
                                    className="py-1 text-xs"
                                >
                                    Dictar por voz con IA
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* AI Grammar Correction */}
                        <ToolbarBtn
                            onClick={handleOpenAISheet}
                            title="Corregir gramática con IA"
                            disabled={!hasSelection}
                            onMouseDown={(e: React.MouseEvent) =>
                                e.preventDefault()
                            }
                        >
                            <Sparkles
                                className={cn(
                                    'h-3.5 w-3.5',
                                    hasSelection
                                        ? 'animate-pulse text-indigo-500'
                                        : 'text-muted-foreground/60',
                                )}
                            />
                        </ToolbarBtn>

                        {/* Insert */}
                        {specimenSequenceCode && (
                            <>
                                <ToolbarBtn
                                    onClick={handleImageUpload}
                                    title="Subir imagen individual"
                                >
                                    <ImagePlus className="h-3.5 w-3.5" />
                                </ToolbarBtn>
                                <ToolbarBtn
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .insertContent({
                                                type: 'imageGrid',
                                                attrs: { columns: 2 },
                                                content: [],
                                            })
                                            .run()
                                    }
                                    title="Insertar cuadrícula de imágenes"
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                </ToolbarBtn>
                            </>
                        )}
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
                            <SheetIcon className="h-3.5 w-3.5" />
                        </ToolbarBtn>

                        {/* Table controls – only visible when cursor is inside a table */}
                        {inTable && (
                            <>
                                <ToolbarDivider />
                                <span className="px-1 text-[10px] text-muted-foreground select-none">
                                    Tabla:
                                </span>
                                <ToolbarBtn
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .addColumnAfter()
                                            .run()
                                    }
                                    title="Añadir columna a la derecha"
                                    disabled={!canAddColumnAfter}
                                >
                                    <BetweenVerticalEnd className="h-3.5 w-3.5" />
                                </ToolbarBtn>
                                <ToolbarBtn
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .addRowAfter()
                                            .run()
                                    }
                                    title="Añadir fila abajo"
                                    disabled={!canAddRowAfter}
                                >
                                    <BetweenHorizontalEnd className="h-3.5 w-3.5" />
                                </ToolbarBtn>
                                <ToolbarBtn
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .deleteColumn()
                                            .run()
                                    }
                                    title="Eliminar columna actual"
                                    disabled={!canDeleteColumn}
                                >
                                    <BetweenVerticalEnd className="h-3.5 w-3.5 text-red-500" />
                                </ToolbarBtn>
                                <ToolbarBtn
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .deleteRow()
                                            .run()
                                    }
                                    title="Eliminar fila actual"
                                    disabled={!canDeleteRow}
                                >
                                    <BetweenHorizontalEnd className="h-3.5 w-3.5 text-red-500" />
                                </ToolbarBtn>
                                <ToolbarBtn
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .deleteTable()
                                            .run()
                                    }
                                    title="Eliminar tabla completa"
                                    disabled={!canDeleteTable}
                                >
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </ToolbarBtn>
                            </>
                        )}
                    </div>
                    {hasSelection && (
                        <div className="flex items-center gap-2 border-t border-border/20 px-3 pt-1 pb-2">
                            <span
                                className={cn(
                                    'rounded-sm px-1.5 py-0.5 font-mono text-[10px] select-none',
                                    activeSelectionText.length > 3000
                                        ? 'border border-red-500/20 bg-red-500/10 font-semibold text-red-600'
                                        : 'border border-indigo-500/10 bg-indigo-500/10 font-medium text-indigo-600',
                                )}
                            >
                                {activeSelectionText.length} caracteres
                            </span>
                            <span className="text-[10px] text-muted-foreground select-none">
                                máx. 3000 para la corrección de gramática con IA
                            </span>
                        </div>
                    )}
                </div>
            </TooltipProvider>

            <AIGrammarSheet
                open={isSheetOpen}
                onOpenChange={handleOpenChange}
                selectedText={selectedText}
                onReplace={handleReplace}
            />

            <AIDictationSheet
                open={isDictationSheetOpen}
                onOpenChange={setIsDictationSheetOpen}
                onInsert={handleInsertDictation}
            />
        </ToolbarContext.Provider>
    );
}

export default EditorToolbar;
