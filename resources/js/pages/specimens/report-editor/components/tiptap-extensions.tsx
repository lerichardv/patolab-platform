import {
    ResizableNodeView,
    Extension,
    Mark,
    Node as TiptapNode,
} from '@tiptap/core';
import BulletList from '@tiptap/extension-bullet-list';
import Highlight from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { mergeAttributes, ReactNodeViewRenderer } from '@tiptap/react';
import ImageGridComponent from '../image-grid-component';
import { cleanPastedHtml, cleanPastedText } from '../utils/paste-cleaner';

export const COLLABORATION_SERVER_URL =
    import.meta.env.VITE_COLLABORATION_SERVER_URL || 'http://127.0.0.1:1234';
export const WS_COLLABORATION_SERVER_URL = COLLABORATION_SERVER_URL.startsWith(
    'https',
)
    ? COLLABORATION_SERVER_URL.replace(/^https/, 'wss')
    : COLLABORATION_SERVER_URL.replace(/^http/, 'ws');

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (fontSize: string) => ReturnType;
            unsetFontSize: () => ReturnType;
        };
        lineHeight: {
            setLineHeight: (lineHeight: string) => ReturnType;
            unsetLineHeight: () => ReturnType;
        };
    }
}

export const TextStyle = Mark.create({
    name: 'textStyle',
    priority: 101,
    addAttributes() {
        return {
            fontSize: {
                default: null,
                parseHTML: (element) =>
                    element.style.fontSize?.replace(/['"]/g, '') || null,
                renderHTML: (attributes) => {
                    if (!attributes.fontSize) {
                        return {};
                    }

                    return { style: `font-size: ${attributes.fontSize}` };
                },
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'span',
                getAttrs: (element) =>
                    (element as HTMLElement).style.fontSize ? {} : false,
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
            0,
        ];
    },
});

export const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element) =>
                            element.style.fontSize?.replace(/['"]/g, '') ||
                            null,
                        renderHTML: (attributes) => {
                            if (!attributes.fontSize) {
                                return {};
                            }

                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize:
                (fontSize: string) =>
                ({ chain }: any) => {
                    return chain().setMark('textStyle', { fontSize }).run();
                },
            unsetFontSize:
                () =>
                ({ chain }: any) => {
                    return chain()
                        .setMark('textStyle', { fontSize: null })
                        .run();
                },
        };
    },
});

export const LineHeight = Extension.create({
    name: 'lineHeight',
    addOptions() {
        return {
            types: ['paragraph', 'heading'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    lineHeight: {
                        default: null,
                        parseHTML: (element) =>
                            element.style.lineHeight ||
                            element.getAttribute('data-line-height') ||
                            null,
                        renderHTML: (attributes) => {
                            if (!attributes.lineHeight) {
                                return {};
                            }

                            return {
                                style: `line-height: ${attributes.lineHeight}`,
                                'data-line-height': attributes.lineHeight,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setLineHeight:
                (lineHeight: string) =>
                ({ tr, state, dispatch }: any) => {
                    const { selection } = state;
                    const { from, to } = selection;
                    let applied = false;

                    state.doc.nodesBetween(
                        from,
                        to,
                        (node: any, pos: number) => {
                            if (this.options.types.includes(node.type.name)) {
                                if (dispatch) {
                                    tr.setNodeMarkup(pos, undefined, {
                                        ...node.attrs,
                                        lineHeight,
                                    });
                                }
                                applied = true;
                            }
                        },
                    );

                    return applied;
                },
            unsetLineHeight:
                () =>
                ({ tr, state, dispatch }: any) => {
                    const { selection } = state;
                    const { from, to } = selection;
                    let applied = false;

                    state.doc.nodesBetween(
                        from,
                        to,
                        (node: any, pos: number) => {
                            if (this.options.types.includes(node.type.name)) {
                                if (dispatch) {
                                    tr.setNodeMarkup(pos, undefined, {
                                        ...node.attrs,
                                        lineHeight: null,
                                    });
                                }
                                applied = true;
                            }
                        },
                    );

                    return applied;
                },
        };
    },
});

export const CustomBulletList = BulletList.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            listStyleType: {
                default: 'disc',
                parseHTML: (element) =>
                    element.getAttribute('data-list-style-type') ||
                    element.style.listStyleType ||
                    'disc',
                renderHTML: (attributes) => {
                    return {
                        style: `list-style-type: ${attributes.listStyleType}`,
                        'data-list-style-type': attributes.listStyleType,
                    };
                },
            },
        };
    },
});

export const CustomImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            caption: {
                default: '',
                parseHTML: (element) =>
                    element.getAttribute('data-caption') ||
                    element.getAttribute('alt') ||
                    '',
                renderHTML: (attributes) => {
                    if (!attributes.caption) {
                        return {};
                    }

                    return {
                        'data-caption': attributes.caption,
                        alt: attributes.caption,
                    };
                },
            },
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

        const mergedAttrs = mergeAttributes(
            this.options.HTMLAttributes,
            HTMLAttributes,
            {
                'data-align': align,
                class: `align-${align}`,
                style: styles.join('; ') + ';',
            },
        );

        if (node?.attrs?.caption) {
            mergedAttrs['data-caption'] = node.attrs.caption;
            mergedAttrs['alt'] = node.attrs.caption;
        }

        return ['img', mergedAttrs];
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

            const pos = typeof getPos === 'function' ? getPos() : undefined;
            let isInsideGrid = false;

            if (pos !== undefined) {
                try {
                    const $pos = editor.state.doc.resolve(pos);

                    if ($pos.parent && $pos.parent.type.name === 'imageGrid') {
                        isInsideGrid = true;
                    }
                } catch (e) {
                    // ignore
                }
            }

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
                            el.setAttribute(key, value as string);
                            break;
                    }
                }
            });

            if (mergedAttributes.src !== null) {
                el.src = mergedAttributes.src;
            }

            if (isInsideGrid) {
                return {
                    dom: el,
                    update: (updatedNode) => {
                        if (updatedNode.type !== node.type) {
                            return false;
                        }

                        if (updatedNode.attrs.src) {
                            el.src = updatedNode.attrs.src;
                        }

                        return true;
                    },
                };
            }

            // Create the pill overlay for dimension display
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
            pill.style.display = 'none'; // hidden by default

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

                    // Show the dimension overlay
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

                    // Hide the pill after resize ends
                    setTimeout(() => {
                        pill.style.display = 'none';
                    }, 1500);
                },
                onUpdate: (updatedNode, _decorations, _innerDecorations) => {
                    if (updatedNode.type !== node.type) {
                        return false;
                    }

                    // Update image src if the URL path changed (e.g. on crop or collaborative change)
                    if (updatedNode.attrs.src) {
                        try {
                            const currentPath = new URL(
                                el.src,
                                window.location.href,
                            ).pathname;
                            let newPath = updatedNode.attrs.src;

                            if (
                                newPath.startsWith('http://') ||
                                newPath.startsWith('https://')
                            ) {
                                newPath = new URL(newPath).pathname;
                            }

                            if (currentPath !== newPath) {
                                el.src = updatedNode.attrs.src;
                            }
                        } catch (e) {
                            // fallback
                            if (
                                el.getAttribute('src') !== updatedNode.attrs.src
                            ) {
                                el.src = updatedNode.attrs.src;
                            }
                        }
                    }

                    // Sync DOM style when updated collaboratively
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

                    if (!isInsideGrid) {
                        dom.style.display = 'block';
                        dom.style.width = 'fit-content';
                        dom.style.marginLeft = isLeft ? '0' : 'auto';
                        dom.style.marginRight = isRight ? '0' : 'auto';
                    }

                    if (captionInputRef) {
                        captionInputRef.value = updatedNode.attrs.caption || '';
                    }

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

            // Append standalone caption input under image
            let captionInputRef: HTMLInputElement | null = null;
            if (!isInsideGrid) {
                const align = node.attrs.alignment || 'center';
                const isLeft = align === 'left';
                const isRight = align === 'right';
                dom.style.display = 'block';
                dom.style.width = 'fit-content';
                dom.style.marginLeft = isLeft ? '0' : 'auto';
                dom.style.marginRight = isRight ? '0' : 'auto';
                dom.style.verticalAlign = 'middle';

                const captionWrapper = document.createElement('div');
                captionWrapper.className = 'image-caption-container';
                captionWrapper.style.marginTop = '0px';
                captionWrapper.style.width = '100%';
                captionWrapper.style.textAlign = 'center';

                const captionInput = document.createElement('input');
                captionInput.type = 'text';
                captionInput.placeholder = 'Añadir pie de foto...';
                captionInput.value = node.attrs.caption || '';
                captionInput.className = 'image-caption-input';
                captionInput.style.width = '100%';
                captionInput.style.maxWidth = '360px';
                captionInput.style.fontSize = '11px';
                captionInput.style.fontStyle = 'italic';
                captionInput.style.color = '#475569';
                captionInput.style.textAlign = 'center';
                captionInput.style.border = '1px dashed #cbd5e1';
                captionInput.style.borderRadius = '4px';
                captionInput.style.padding = '2px 6px';
                captionInput.style.backgroundColor = 'transparent';
                captionInput.style.outline = 'none';
                captionInputRef = captionInput;

                if (!editor.isEditable) {
                    captionInput.readOnly = true;
                    captionInput.style.border = 'none';
                    if (!node.attrs.caption) {
                        captionInput.style.display = 'none';
                    }
                }

                captionInput.oninput = (e) => {
                    e.stopPropagation();
                    const val = (e.target as HTMLInputElement).value;
                    const currentPos =
                        typeof getPos === 'function' ? getPos() : undefined;

                    if (currentPos !== undefined) {
                        editor.view.dispatch(
                            editor.state.tr.setNodeMarkup(
                                currentPos,
                                undefined,
                                {
                                    ...node.attrs,
                                    caption: val,
                                },
                            ),
                        );
                    }
                };

                captionInput.onkeydown = (e) => {
                    e.stopPropagation();
                };
                captionInput.onkeypress = (e) => {
                    e.stopPropagation();
                };
                captionInput.onkeyup = (e) => {
                    e.stopPropagation();
                };
                captionInput.onmousedown = (e) => {
                    e.stopPropagation();
                };
                captionInput.onmouseup = (e) => {
                    e.stopPropagation();
                };
                captionInput.onclick = (e) => {
                    e.stopPropagation();
                };
                captionInput.addEventListener('beforeinput', (e) => {
                    e.stopPropagation();
                });
                captionInput.addEventListener('selectstart', (e) => {
                    e.stopPropagation();
                });

                captionWrapper.appendChild(captionInput);
                dom.appendChild(captionWrapper);
            }

            // Append crop button to [data-resize-wrapper], but only for standalone images (not inside image-grid)
            const cropBtn = document.createElement('button');
            cropBtn.type = 'button';
            cropBtn.className = 'image-crop-btn';
            cropBtn.title = 'Recortar imagen';
            cropBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#6366f1"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>`;
            cropBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const pos = typeof getPos === 'function' ? getPos() : undefined;

                if (pos !== undefined) {
                    const customEvent = new CustomEvent('open-image-cropper', {
                        detail: {
                            src: el.src,
                            pos: pos,
                            editor: editor,
                        },
                    });
                    document.dispatchEvent(customEvent);
                }
            };

            setTimeout(() => {
                // Skip injection when this image lives inside an image-grid node view
                if (dom.closest('[data-type="image-grid"]')) {
                    return;
                }

                const wrapper = dom.querySelector('[data-resize-wrapper]');

                if (wrapper) {
                    wrapper.appendChild(cropBtn);
                } else {
                    dom.appendChild(cropBtn);
                }
            }, 0);

            // when image is loaded, show the node view to get the correct dimensions
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

interface ImageGridOptions {
    specimenSequenceCode: string;
}

export const ImageGrid = TiptapNode.create<ImageGridOptions>({
    name: 'imageGrid',
    group: 'block',
    content: 'image*',
    defining: true,

    addOptions() {
        return {
            specimenSequenceCode: '',
        };
    },

    addAttributes() {
        return {
            columns: {
                default: 2,
                parseHTML: (element: HTMLElement) => {
                    const cols = element.getAttribute('data-columns');

                    return cols ? parseInt(cols, 10) : 2;
                },
                renderHTML: (attributes: Record<string, any>) => ({
                    'data-columns': attributes.columns,
                }),
            },
            alignment: {
                default: 'center',
                parseHTML: (element: HTMLElement) => {
                    return element.getAttribute('data-align') || 'center';
                },
                renderHTML: (attributes: Record<string, any>) => ({
                    'data-align': attributes.alignment || 'center',
                }),
            },
            width: {
                default: null,
                parseHTML: (element: HTMLElement) => {
                    const w =
                        element.getAttribute('width') || element.style.width;

                    return w ? parseInt(w, 10) : null;
                },
                renderHTML: (attributes: Record<string, any>) => {
                    if (!attributes.width) {
                        return {};
                    }

                    return {
                        width: attributes.width,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-type="image-grid"]' }];
    },

    renderHTML({ node, HTMLAttributes }) {
        const align = node?.attrs?.alignment || 'center';
        const isLeft = align === 'left';
        const isRight = align === 'right';
        const marginLeft = isLeft ? '0' : 'auto';
        const marginRight = isRight ? '0' : 'auto';

        const styles = [
            `display: grid`,
            `margin-left: ${marginLeft}`,
            `margin-right: ${marginRight}`,
        ];
        const width = node?.attrs?.width;

        if (width) {
            styles.push(`width: ${width}px`);
        }

        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'image-grid',
                'data-align': align,
                class: `align-${align}`,
                style: styles.join('; ') + ';',
            }),
            0,
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ImageGridComponent);
    },
});

const dictationCursorPluginKey = new PluginKey('dictationCursor');

interface DictationCursorOptions {
    isDictating: boolean;
}

export const DictationCursor = Extension.create<DictationCursorOptions>({
    name: 'dictationCursor',

    addOptions() {
        return {
            isDictating: false,
        };
    },

    addProseMirrorPlugins() {
        const extension = this;

        return [
            new Plugin({
                key: dictationCursorPluginKey,
                state: {
                    init(config, state) {
                        return {
                            startPos: null as number | null,
                            lastIsDictating: false,
                        };
                    },
                    apply(tr, value, oldState, newState) {
                        const isDictating = extension.options.isDictating;
                        let startPos = value.startPos;

                        if (isDictating && !value.lastIsDictating) {
                            startPos = oldState.selection.head;
                        } else if (!isDictating && value.lastIsDictating) {
                            startPos = null;
                        } else if (isDictating && startPos !== null) {
                            startPos = tr.mapping.map(startPos, -1);
                        }

                        return {
                            startPos,
                            lastIsDictating: isDictating,
                        };
                    },
                },
                props: {
                    decorations(state) {
                        const pluginState = this.getState(state) as
                            | { startPos: number | null }
                            | undefined;

                        if (!pluginState || pluginState.startPos === null) {
                            return DecorationSet.empty;
                        }

                        const decs: Decoration[] = [];
                        const activePos = state.selection.head;
                        const widget = Decoration.widget(
                            activePos,
                            () => {
                                const span = document.createElement('span');
                                span.className = 'dictation-caret-indicator';

                                return span;
                            },
                            { side: 0, key: 'dictation-caret' },
                        );
                        decs.push(widget);

                        return DecorationSet.create(state.doc, decs);
                    },
                },
            }),
        ];
    },
});

export const PasteCleaner = Extension.create({
    name: 'pasteCleaner',
    priority: 1000,
    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('pasteCleaner'),
                props: {
                    transformPastedHTML(html) {
                        return cleanPastedHtml(html);
                    },
                    transformPastedText(text) {
                        return cleanPastedText(text);
                    },
                },
            }),
        ];
    },
});

export const HIGHLIGHT_COLORS = [
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

export const sharedExtensions = [
    TextStyle,
    FontSize,
    LineHeight,
    CustomImage.configure({
        allowBase64: false,
        resize: {
            enabled: true,
            alwaysPreserveAspectRatio: true,
        },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
    DictationCursor.configure({ isDictating: false }),
    Highlight.configure({ multicolor: true }),
    ImageGrid,
    PasteCleaner,
];
