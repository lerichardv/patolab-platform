import { Head, router } from '@inertiajs/react';
import React, { useState, useEffect, useRef, Fragment } from 'react';
import { toast } from 'sonner';
import {
	Microscope,
	Calendar,
	Check,
	FileText,
	ArrowLeft,
	Download,
	UserRound,
	Tag,
	MapPin,
	Clock,
	AlertCircle,
	Eye,
	Save,
	Loader2,
	// Toolbar icons
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
	Info,
} from 'lucide-react';
import EditorLayout from '@/layouts/editor-layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useEditor, EditorContent, type Editor, mergeAttributes } from '@tiptap/react';
import { ResizableNodeView } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import SpecimenViewSheet from './specimen-view-sheet';

interface Collaborator {
	name: string;
	color: string;
}

interface SpecimenReport {
	id: number;
	report_date: string;
	macroscopy_html: string | null;
	microscopy_html: string | null;
	diagnosis_html: string | null;
	macroscopy_finalization_datetime: string | null;
	microscopy_finalization_datetime: string | null;
	report_finalization_datetime: string | null;
}

interface Specimen {
	id: number;
	sequence_code: string;
	anatomic_site: string;
	diagnosis: string | null;
	clinical_notes: string | null;
	status: 'received' | 'macroscopic_review' | 'processing' | 'microscopic_review' | 'finalized' | 'delivered' | 'cancelled';
	created_at: string;
	customer_relation: {
		id: number;
		name: string;
		id_number: string;
		phone: string;
		gender: string;
		age: number | null;
		type?: 'cliente' | 'empresa';
	};
	type: {
		name: string;
	};
	examination: {
		name: string;
	};
	category: {
		name: string;
	};
	referrer_relation: {
		name: string;
		notes: string | null;
	};
	report: SpecimenReport | null;
	users?: Array<{
		name: string;
		role?: {
			name: string;
		};
	}>;
}

interface Props {
	specimen: Specimen;
	report: SpecimenReport | null;
	auth: {
		user: {
			name: string;
			cursor_color?: string;
		};
	};
}

const editorStyles = `
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
  /* Cell selection highlight */
  .tiptap .selectedCell:after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(99, 102, 241, 0.12);
    pointer-events: none;
    z-index: 2;
  }
  /* Column resize handle */
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

  /* ── Collaborative Cursors ── */
  .collaboration-cursor__caret {
    position: relative;
    border-left: 2px solid;
    border-right: 0;
    margin-left: -1px;
    margin-right: -1px;
    pointer-events: none;
    line-height: normal;
    display: inline-block;
    height: 1.25em;
    z-index: 10;
  }

  .collaboration-cursor__label {
    position: absolute;
    top: -1.5rem;
    left: -2px;
    font-size: 10px;
    font-weight: 600;
    line-height: normal;
    user-select: none;
    color: #fff;
    padding: 1px 6px;
    border-radius: 4px 4px 4px 0;
    white-space: nowrap;
    pointer-events: none;
    z-index: 50;
    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
  }

  /* Triangle Arrow */
  .collaboration-cursor__label::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    border-width: 4px 4px 0;
    border-style: solid;
    border-color: inherit;
    border-left-color: transparent;
    border-right-color: transparent;
  }

  .collaboration-cursor__selection {
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }

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
				parseHTML: element => {
					const align = element.getAttribute('data-align');
					if (align) return align;

					const classes = element.getAttribute('class') || '';
					if (classes.includes('align-left')) return 'left';
					if (classes.includes('align-center')) return 'center';
					if (classes.includes('align-right')) return 'right';
					if (classes.includes('align-justify')) return 'justify';

					const style = element.getAttribute('style') || '';
					if (style.includes('margin-left: 0') || style.includes('margin-right: auto')) return 'left';
					if (style.includes('margin-left: auto') && style.includes('margin-right: auto')) return 'center';
					if (style.includes('margin-left: auto') && style.includes('margin-right: 0')) return 'right';

					return 'center';
				},
				renderHTML: attributes => {
					const isLeft = attributes.alignment === 'left';
					const isRight = attributes.alignment === 'right';
					const marginLeft = isLeft ? '0' : 'auto';
					const marginRight = isRight ? '0' : 'auto';

					return {
						'data-align': attributes.alignment,
						class: `align-${attributes.alignment}`,
						style: `display: block; margin-left: ${marginLeft}; margin-right: ${marginRight};`
					};
				},
			},
			width: {
				default: null,
				parseHTML: element => {
					const width = element.getAttribute('width') || element.style.width;
					return width ? parseInt(width, 10) : null;
				},
			},
			height: {
				default: null,
				parseHTML: element => {
					const height = element.getAttribute('height') || element.style.height;
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

		const styles = [`display: block`, `margin-left: ${marginLeft}`, `margin-right: ${marginRight}`];
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
				style: styles.join('; ') + ';'
			})
		];
	},

	addNodeView() {
		if (!this.options.resize || !this.options.resize.enabled || typeof document === 'undefined') {
			return null;
		}

		const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = this.options.resize;

		return ({ node, getPos, HTMLAttributes, editor }) => {
			const el = document.createElement('img');
			el.draggable = false;

			const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);

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
					if (pos === undefined) return;

					editor
						.chain()
						.setNodeSelection(pos)
						.updateAttributes(this.name, {
							width,
							height,
						})
						.run();

					// Hide the pill after resize ends
					setTimeout(() => {
						pill.style.display = 'none';
					}, 1500);
				},
				onUpdate: (updatedNode, _decorations, _innerDecorations) => {
					if (updatedNode.type !== node.type) return false;

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

const sharedExtensions = [
	CustomImage.configure({
		allowBase64: false,
		resize: {
			enabled: true,
			alwaysPreserveAspectRatio: true,
		},
	}),
	TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
];

// ─────────────────────────────────────────────────────────────
// Toolbar helpers
// ─────────────────────────────────────────────────────────────
function ToolbarDivider() {
	return <div className="h-5 w-px bg-border mx-0.5 shrink-0" />;
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
						'inline-flex items-center justify-center h-7 w-7 rounded text-sm transition-colors cursor-pointer',
						'hover:bg-accent hover:text-accent-foreground',
						'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
						active && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
					)}
				>
					{children}
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom" className="text-xs py-1">{title}</TooltipContent>
		</Tooltip>
	);
}

function EditorToolbar({
	editor,
	specimenSequenceCode,
}: {
	editor: Editor | null;
	specimenSequenceCode?: string;
}) {
	// Force update on editor transactions so button active states update reactively
	const [, setTick] = useState(0);
	useEffect(() => {
		if (!editor) return;
		const handleUpdate = () => {
			setTick(tick => tick + 1);
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
			if (!file || !editor) return;

			const formData = new FormData();
			formData.append('image', file);

			try {
				const response = await fetch(
					`/specimens/${specimenSequenceCode}/report-editor/upload-image`,
					{
						method: 'POST',
						headers: {
							'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
						},
						body: formData,
					},
				);
				if (response.ok) {
					const data = await response.json();
					if (data.url) editor.chain().focus().setImage({ src: data.url }).run();
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
			<div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-muted/40">

				{/* History */}
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

				{/* Text formatting */}
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
					onClick={() => editor?.chain().focus().toggleUnderline().run()}
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

				<ToolbarDivider />

				{/* Headings */}
				<ToolbarBtn
					onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
					active={editor?.isActive('heading', { level: 1 })}
					title="Título 1"
				>
					<Heading1 className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
					active={editor?.isActive('heading', { level: 2 })}
					title="Título 2"
				>
					<Heading2 className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
					active={editor?.isActive('heading', { level: 3 })}
					title="Título 3"
				>
					<Heading3 className="h-3.5 w-3.5" />
				</ToolbarBtn>

				<ToolbarDivider />

				{/* Alignment */}
				<ToolbarBtn
					onClick={() => {
						if (editor?.isActive('image')) {
							editor.chain().focus().updateAttributes('image', { alignment: 'left' }).run();
						} else {
							editor?.chain().focus().setTextAlign('left').run();
						}
					}}
					active={editor?.isActive({ textAlign: 'left' }) || editor?.isActive('image', { alignment: 'left' })}
					title="Alinear a la izquierda"
				>
					<AlignLeft className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => {
						if (editor?.isActive('image')) {
							editor.chain().focus().updateAttributes('image', { alignment: 'center' }).run();
						} else {
							editor?.chain().focus().setTextAlign('center').run();
						}
					}}
					active={editor?.isActive({ textAlign: 'center' }) || editor?.isActive('image', { alignment: 'center' })}
					title="Centrar"
				>
					<AlignCenter className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => {
						if (editor?.isActive('image')) {
							editor.chain().focus().updateAttributes('image', { alignment: 'right' }).run();
						} else {
							editor?.chain().focus().setTextAlign('right').run();
						}
					}}
					active={editor?.isActive({ textAlign: 'right' }) || editor?.isActive('image', { alignment: 'right' })}
					title="Alinear a la derecha"
				>
					<AlignRight className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => {
						if (editor?.isActive('image')) {
							editor.chain().focus().updateAttributes('image', { alignment: 'justify' }).run();
						} else {
							editor?.chain().focus().setTextAlign('justify').run();
						}
					}}
					active={editor?.isActive({ textAlign: 'justify' }) || editor?.isActive('image', { alignment: 'justify' })}
					title="Justificar"
				>
					<AlignJustify className="h-3.5 w-3.5" />
				</ToolbarBtn>

				<ToolbarDivider />

				{/* Lists & quote */}
				<ToolbarBtn
					onClick={() => editor?.chain().focus().toggleBulletList().run()}
					active={editor?.isActive('bulletList')}
					title="Lista de viñetas"
				>
					<List className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor?.chain().focus().toggleOrderedList().run()}
					active={editor?.isActive('orderedList')}
					title="Lista numerada"
				>
					<ListOrdered className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor?.chain().focus().toggleBlockquote().run()}
					active={editor?.isActive('blockquote')}
					title="Cita"
				>
					<Quote className="h-3.5 w-3.5" />
				</ToolbarBtn>

				<ToolbarDivider />

				{/* Insert */}
				{specimenSequenceCode && (
					<ToolbarBtn onClick={handleImageUpload} title="Subir imagen">
						<ImagePlus className="h-3.5 w-3.5" />
					</ToolbarBtn>
				)}
				<ToolbarBtn
					onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
					title="Insertar tabla 3×3"
				>
					<Grid3x3 className="h-3.5 w-3.5" />
				</ToolbarBtn>

				{/* Table controls – only visible when cursor is inside a table */}
				{inTable && (
					<>
						<ToolbarDivider />
						<span className="text-[10px] text-muted-foreground select-none px-1">Tabla:</span>
						<ToolbarBtn
							onClick={() => editor?.chain().focus().addColumnAfter().run()}
							title="Añadir columna"
						>
							<span className="text-[9px] font-bold leading-none">+C</span>
						</ToolbarBtn>
						<ToolbarBtn
							onClick={() => editor?.chain().focus().addRowAfter().run()}
							title="Añadir fila"
						>
							<span className="text-[9px] font-bold leading-none">+F</span>
						</ToolbarBtn>
						<ToolbarBtn
							onClick={() => editor?.chain().focus().deleteColumn().run()}
							title="Eliminar columna"
						>
							<span className="text-[9px] font-bold leading-none text-red-500">−C</span>
						</ToolbarBtn>
						<ToolbarBtn
							onClick={() => editor?.chain().focus().deleteRow().run()}
							title="Eliminar fila"
						>
							<span className="text-[9px] font-bold leading-none text-red-500">−F</span>
						</ToolbarBtn>
						<ToolbarBtn
							onClick={() => editor?.chain().focus().deleteTable().run()}
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

// ─────────────────────────────────────────────────────────────
// Read-only preview editor (no collaboration, no toolbar)
// ─────────────────────────────────────────────────────────────
function ReadOnlyEditor({ content }: { content: string }) {
	const editor = useEditor({
		extensions: [
			StarterKit,
			TableKit.configure({
				table: { resizable: false },
			}),
			...sharedExtensions,
		],
		content,
		editable: false,
	}, [content]);

	return (
		<div className="space-y-1">
			<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Editor de texto enriquecido</span>
			<div className="border rounded-lg bg-muted/10 text-card-foreground shadow-xs overflow-hidden">
				<EditorContent editor={editor} className="p-4 min-h-[160px] focus:outline-hidden" />
			</div>
		</div>
	);
}
// ─────────────────────────────────────────────────────────────
// Inner collaborative editor (mounts only after hydration)
// ─────────────────────────────────────────────────────────────
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
}) {
	useEffect(() => {
		provider.awareness?.setLocalStateField('user', { name: userName, color: cursorColor });
	}, [provider, userName, cursorColor]);

	useEffect(() => {
		const handleAwarenessUpdate = () => {
			const states = provider.awareness?.getStates() || new Map();
			const activeUsers: Array<{ name: string; color: string }> = [];
			states.forEach((state: any) => {
				if (state.user) activeUsers.push({ name: state.user.name, color: state.user.color });
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

	const [isFocused, setIsFocused] = useState(false);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({ undoRedo: false }),
			TableKit.configure({
				table: { resizable: true },
			}),
			...sharedExtensions,
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
						style: `background-color: ${(user.color || '#3b82f6')}25`,
					};
				},
			}),
		],
		editable: true,
		onUpdate({ editor }) {
			setTimeout(() => { onUpdate(editor.getHTML()); }, 0);
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

	const focusColorClass =
		field === 'diagnosis' ? 'border-blue-500 ring-1 ring-blue-500/20 shadow-md' :
			field === 'macroscopy' ? 'border-violet-500 ring-1 ring-violet-500/20 shadow-md' :
				field === 'microscopy' ? 'border-fuchsia-500 ring-1 ring-fuchsia-500/20 shadow-md' :
					'border-primary ring-1 ring-primary/20 shadow-md';

	return (
		<div className="space-y-1">
			<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Editor de texto enriquecido</span>
			<div className={cn(
				"border rounded-lg bg-card text-card-foreground shadow-xs transition-all duration-200 relative",
				isFocused ? focusColorClass : "border-border"
			)}>
				<EditorContent editor={editor} className="p-4 min-h-[160px] focus:outline-hidden" />
			</div>
			<div className="flex justify-end pt-1">
				<span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
					<Check className="h-3.5 w-3.5" /> Editable colaborativo
				</span>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
// SSR guard wrapper – defers mounting to avoid hydration mismatch
// ─────────────────────────────────────────────────────────────
function CollaborativeEditor(props: {
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
}) {
	const [isMounted, setIsMounted] = useState(false);
	useEffect(() => { setIsMounted(true); }, []);

	if (!isMounted || typeof window === 'undefined' || !props.doc || !props.provider) {
		return (
			<div className="border rounded-lg bg-card text-card-foreground shadow-xs overflow-hidden">
				<div className="h-10 bg-muted/40 border-b border-border" />
				<div className="p-4 min-h-[160px] flex items-center justify-center">
					<span className="text-xs text-muted-foreground animate-pulse">Cargando editor colaborativo...</span>
				</div>
			</div>
		);
	}

	return <CollaborativeEditorInner {...props} doc={props.doc} provider={props.provider} />;
}


const getInitials = (name: string) => {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0) return '';
	if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Shows connected users as Google-style overlapping avatar bubbles.
function CollaboratorsList({ users }: { users: Collaborator[] }) {
	if (users.length === 0) return null;

	const uniqueUsersMap = new Map<string, Collaborator>();
	users.forEach(u => { if (u.name) uniqueUsersMap.set(u.name, u); });
	const uniqueUsers = Array.from(uniqueUsersMap.values());

	return (
		<div className="flex items-center -space-x-2 mr-2">
			{uniqueUsers.map((user, idx) => {
				const initials = getInitials(user.name);
				return (
					<div key={`${user.name}-${idx}`} className="relative group">
						<div
							className="relative flex items-center justify-center h-8 w-8 rounded-full border-2 border-background text-white font-bold select-none text-[11px] shadow-xs cursor-default hover:z-10 hover:scale-110 transition-all duration-200"
							style={{ backgroundColor: user.color || '#3b82f6' }}
						>
							{initials}
						</div>
						{/* Custom Traditional Tooltip - Bottom Left, No Arrow */}
						<div className="absolute top-full right-0 mt-1.5 hidden group-hover:block z-50 whitespace-nowrap bg-slate-900 text-white text-[10px] font-semibold py-1 px-2 rounded-md shadow-md border border-slate-800/80 pointer-events-none select-none">
							{user.name}
						</div>
					</div>
				);
			})}
		</div>
	);
}

interface MeasuredBlock {
	id: string;
	type: 'patient-card' | 'section-header' | 'html' | 'page-break' | 'signature';
	height: number;
	title?: string;
	html?: string;
	className?: string;
}

function parseHtmlToBlocks(html: string): string[] {
	if (!html) return [];
	if (typeof window === 'undefined') return [html];
	
	const div = document.createElement('div');
	div.innerHTML = html;
	
	const blocks: string[] = [];
	let currentText = '';
	
	Array.from(div.childNodes).forEach(node => {
		if (node.nodeType === Node.ELEMENT_NODE) {
			if (currentText.trim()) {
				blocks.push(currentText);
				currentText = '';
			}
			blocks.push((node as Element).outerHTML);
		} else {
			currentText += node.textContent || '';
		}
	});
	
	if (currentText.trim()) {
		blocks.push(currentText);
	}
	
	return blocks.length > 0 ? blocks : [html];
}

function PatientMetadataCard({ specimen }: { specimen: Specimen }) {
	return (
		<div className="border border-blue-200 bg-blue-50/50 rounded p-3 mb-4 text-[9px] grid grid-cols-2 gap-4 shrink-0">
			<div className="space-y-1">
				<p><strong className="text-blue-900 font-semibold">Nombre:</strong> {specimen.customer_relation.name}</p>
				<p><strong className="text-blue-900 font-semibold">Edad / Sexo:</strong> {specimen.customer_relation.age ?? 'N/A'} años / {specimen.customer_relation.gender}</p>
				<p><strong className="text-blue-900 font-semibold">Médico Remitente:</strong> {specimen.referrer_relation.name}</p>
				<p><strong className="text-blue-900 font-semibold">Diagnóstico Clínico:</strong> {specimen.diagnosis || 'N/A'}</p>
			</div>
			<div className="space-y-1">
				<p><strong className="text-blue-900 font-semibold">Hospital/Clínica:</strong> {specimen.referrer_relation.notes || 'HDV'}</p>
				<p><strong className="text-blue-900 font-semibold">Sitio Preciso de la Muestra:</strong> {specimen.anatomic_site}</p>
				<p><strong className="text-blue-900 font-semibold">Fecha de la Toma:</strong> {new Date(specimen.created_at).toLocaleDateString('es-HN')}</p>
				<p><strong className="text-blue-900 font-semibold">Fecha de Recibo:</strong> {new Date(specimen.created_at).toLocaleDateString('es-HN')}</p>
			</div>
		</div>
	);
}

function SectionHeader({ title }: { title: string }) {
	return (
		<div className="text-[9.5px] font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1.5 uppercase shrink-0">
			{title}
		</div>
	);
}

function SignatureBlock({
	pathologistName,
	pathologistTitle,
	reportDate,
	isLastPage = false,
}: {
	pathologistName: string;
	pathologistTitle: string;
	reportDate: string;
	isLastPage?: boolean;
}) {
	return (
		<div className={cn("pt-6 text-center shrink-0", isLastPage && "mt-auto")}>
			<div className="w-[180px] border-t border-gray-400 mx-auto mb-1" />
			<div className="text-[9px] font-bold text-gray-800 uppercase">{pathologistName}</div>
			<div className="text-[7.5px] text-gray-500 font-medium uppercase tracking-wide">{pathologistTitle}</div>
			<div className="text-[8px] font-bold text-gray-600 mt-2">
				FECHA: {reportDate ? new Date(reportDate).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : new Date().toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
			</div>
		</div>
	);
}

export default function ReportWorkspace({ specimen, report, auth }: Props) {
	const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
	const [activeField, setActiveField] = useState<'diagnosis' | 'macroscopy' | 'microscopy' | null>(null);
	const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleEditorFocus = (editor: Editor, field: 'diagnosis' | 'macroscopy' | 'microscopy') => {
		if (focusTimeoutRef.current) {
			clearTimeout(focusTimeoutRef.current);
		}
		setActiveEditor(editor);
		setActiveField(field);
	};

	const handleEditorBlur = () => {
		if (focusTimeoutRef.current) {
			clearTimeout(focusTimeoutRef.current);
		}
		focusTimeoutRef.current = setTimeout(() => {
			setActiveEditor(null);
			setActiveField(null);
		}, 200);
	};

	const [reportDate, setReportDate] = useState(report?.report_date ? report.report_date.split('T')[0] : new Date().toISOString().split('T')[0]);
	const [macroscopyHtml, setMacroscopyHtml] = useState(report?.macroscopy_html || '');
	const [microscopyHtml, setMicroscopyHtml] = useState(report?.microscopy_html || '');
	const [diagnosisHtml, setDiagnosisHtml] = useState(report?.diagnosis_html || '');
	const [macroscopyUsers, setMacroscopyUsers] = useState<Collaborator[]>([]);

	// Derived visibility flags — declared early so they can be used in layout hooks below
	const isMicroscopyVisible = ['microscopic_review', 'finalized', 'delivered'].includes(specimen.status);
	const isFinished = ['finalized', 'delivered'].includes(specimen.status);
	const [microscopyUsers, setMicroscopyUsers] = useState<Collaborator[]>([]);
	const [diagnosisUsers, setDiagnosisUsers] = useState<Collaborator[]>([]);

	const [isManualSaving, setIsManualSaving] = useState(false);
	const [isSavedRecently, setIsSavedRecently] = useState(false);
	const [isAutosaving, setIsAutosaving] = useState(false);
	const [lastSaved, setLastSaved] = useState<Date | null>(new Date());
	const [timeString, setTimeString] = useState('Justo ahora');

	const hasMounted = useRef(false);
	const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [pages, setPages] = useState<MeasuredBlock[][]>([]);
	const hiddenContainerRef = useRef<HTMLDivElement>(null);
	const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

	const calculateLayout = () => {
		if (!hiddenContainerRef.current) return;

		const children = Array.from(hiddenContainerRef.current.children);
		const computedPageBlocks: MeasuredBlock[] = [];
		let headerHeight = 125;
		let footerHeight = 65;

		children.forEach((child, index) => {
			const type = child.getAttribute('data-block-type') || 'html';
			const height = child.getBoundingClientRect().height;

			if (type === 'header-measure') {
				headerHeight = height;
			} else if (type === 'footer-measure') {
				footerHeight = height;
			} else {
				const blockType = type as MeasuredBlock['type'];
				if (blockType === 'patient-card') {
					computedPageBlocks.push({ id: `patient-card-${index}`, type: blockType, height });
				} else if (blockType === 'section-header') {
					const title = child.getAttribute('data-block-title') || '';
					computedPageBlocks.push({ id: `section-header-${index}`, type: blockType, height, title });
				} else if (blockType === 'html') {
					const html = child.innerHTML;
					const className = child.className || '';
					computedPageBlocks.push({ id: `html-${index}`, type: blockType, height, html, className });
				} else if (blockType === 'page-break') {
					computedPageBlocks.push({ id: `page-break-${index}`, type: blockType, height: 0 });
				} else if (blockType === 'signature') {
					computedPageBlocks.push({ id: `signature-${index}`, type: blockType, height });
				}
			}
		});

		const maxContentHeight = 1035 - 96 - headerHeight - footerHeight;

		const computedPages: MeasuredBlock[][] = [];
		let currentPage: MeasuredBlock[] = [];
		let currentHeight = 0;

		computedPageBlocks.forEach((block) => {
			if (block.type === 'page-break') {
				if (currentPage.length > 0) {
					computedPages.push(currentPage);
					currentPage = [];
					currentHeight = 0;
				}
				return;
			}

			if (currentPage.length > 0 && currentHeight + block.height > maxContentHeight) {
				computedPages.push(currentPage);
				currentPage = [block];
				currentHeight = block.height;
			} else {
				currentPage.push(block);
				currentHeight += block.height;
			}
		});

		if (currentPage.length > 0) {
			computedPages.push(currentPage);
		}

		setPages(computedPages);
	};

	useIsomorphicLayoutEffect(() => {
		calculateLayout();
	}, [diagnosisHtml, macroscopyHtml, microscopyHtml, reportDate, specimen, isMicroscopyVisible]);

	useEffect(() => {
		const container = hiddenContainerRef.current;
		if (!container) return;

		const handleLoad = () => {
			calculateLayout();
		};

		container.addEventListener('load', handleLoad, true);
		return () => {
			container.removeEventListener('load', handleLoad, true);
		};
	}, []);

	// Detect typing activity and trigger autosave feedback
	useEffect(() => {
		if (!hasMounted.current) {
			hasMounted.current = true;
			return;
		}

		setIsAutosaving(true);
		setIsSavedRecently(false);

		if (autosaveTimeoutRef.current) {
			clearTimeout(autosaveTimeoutRef.current);
		}

		autosaveTimeoutRef.current = setTimeout(() => {
			setIsAutosaving(false);
			setLastSaved(new Date());
			setIsSavedRecently(true);
			setTimeout(() => {
				setIsSavedRecently(false);
			}, 1300);
		}, 2500);

		return () => {
			if (autosaveTimeoutRef.current) {
				clearTimeout(autosaveTimeoutRef.current);
			}
		};
	}, [macroscopyHtml, microscopyHtml, diagnosisHtml, reportDate]);

	// Format relative time passed since last saved
	const getRelativeTimeString = (date: Date | null) => {
		if (!date) return 'Sin guardar';
		const diffMs = Date.now() - date.getTime();
		const diffSec = Math.floor(diffMs / 1000);
		if (diffSec < 5) return 'Justo ahora';
		if (diffSec < 60) return 'Hace unos segundos';
		const diffMin = Math.floor(diffSec / 60);
		if (diffMin === 1) return 'Hace 1 minuto';
		return `Hace ${diffMin} minutos`;
	};

	// Recalculate relative time every 10 seconds
	useEffect(() => {
		if (!lastSaved) return;
		setTimeString(getRelativeTimeString(lastSaved));

		const interval = setInterval(() => {
			setTimeString(getRelativeTimeString(lastSaved));
		}, 10000);

		return () => clearInterval(interval);
	}, [lastSaved]);

	const uint8ToBase64 = (arr: Uint8Array): string => {
		let binary = '';
		const len = arr.byteLength;
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(arr[i]);
		}
		return window.btoa(binary);
	};

	const [dateDoc, setDateDoc] = useState<Y.Doc | null>(null);
	const [dateProvider, setDateProvider] = useState<HocuspocusProvider | null>(null);
	const [macroscopyDoc, setMacroscopyDoc] = useState<Y.Doc | null>(null);
	const [macroscopyProvider, setMacroscopyProvider] = useState<HocuspocusProvider | null>(null);
	const [microscopyDoc, setMicroscopyDoc] = useState<Y.Doc | null>(null);
	const [microscopyProvider, setMicroscopyProvider] = useState<HocuspocusProvider | null>(null);
	const [diagnosisDoc, setDiagnosisDoc] = useState<Y.Doc | null>(null);
	const [diagnosisProvider, setDiagnosisProvider] = useState<HocuspocusProvider | null>(null);
	const [saveStatusDoc, setSaveStatusDoc] = useState<Y.Doc | null>(null);
	const [saveStatusProvider, setSaveStatusProvider] = useState<HocuspocusProvider | null>(null);
	const [globalSaveState, setGlobalSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

	const reportDateRef = useRef(reportDate);

	useEffect(() => {
		reportDateRef.current = reportDate;
	}, [reportDate]);

	const handleManualSave = () => {
		if (saveStatusDoc) {
			const ytext = saveStatusDoc.getText('content');
			saveStatusDoc.transact(() => {
				ytext.delete(0, ytext.length);
				ytext.insert(0, 'saving');
			});
		} else {
			setIsManualSaving(true);
		}
		const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

		const macroscopyBase64 = macroscopyDoc ? uint8ToBase64(Y.encodeStateAsUpdate(macroscopyDoc)) : null;
		const microscopyBase64 = microscopyDoc ? uint8ToBase64(Y.encodeStateAsUpdate(microscopyDoc)) : null;
		const diagnosisBase64 = diagnosisDoc ? uint8ToBase64(Y.encodeStateAsUpdate(diagnosisDoc)) : null;
		const dateBase64 = dateDoc ? uint8ToBase64(Y.encodeStateAsUpdate(dateDoc)) : null;

		fetch(`/specimens/${specimen.sequence_code}/report-editor/save`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRF-TOKEN': csrfToken,
				'Accept': 'application/json',
			},
			body: JSON.stringify({
				report_date: reportDate,
				macroscopy_html: macroscopyHtml,
				microscopy_html: microscopyHtml,
				diagnosis_html: diagnosisHtml,
				yjs_macroscopy_state: macroscopyBase64,
				yjs_microscopy_state: microscopyBase64,
				yjs_diagnosis_state: diagnosisBase64,
				yjs_report_date_state: dateBase64,
			}),
		})
			.then(async (res) => {
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.message || 'Error al guardar el reporte');
				}
				return data;
			})
			.then(() => {
				if (saveStatusDoc) {
					const ytext = saveStatusDoc.getText('content');
					saveStatusDoc.transact(() => {
						ytext.delete(0, ytext.length);
						ytext.insert(0, 'saved');
					});
					setTimeout(() => {
						saveStatusDoc.transact(() => {
							ytext.delete(0, ytext.length);
							ytext.insert(0, 'idle');
						});
					}, 1300);
				} else {
					setLastSaved(new Date());
					setIsSavedRecently(true);
					setTimeout(() => {
						setIsSavedRecently(false);
					}, 1300);
				}
				toast.success('Reporte guardado con éxito');
				router.reload({
					only: ['report'],
				});
			})
			.catch((err) => {
				console.error(err);
				toast.error(err.message || 'Error al guardar el reporte');
				if (saveStatusDoc) {
					const ytext = saveStatusDoc.getText('content');
					saveStatusDoc.transact(() => {
						ytext.delete(0, ytext.length);
						ytext.insert(0, 'idle');
					});
				}
			})
			.finally(() => {
				setIsManualSaving(false);
			});
	};

	useEffect(() => {
		if (!report) return;

		// 1. Date room
		const dDoc = new Y.Doc();
		const dProvider = new HocuspocusProvider({
			url: 'ws://127.0.0.1:1234',
			name: `report-${report.id}-report_date`,
			document: dDoc,
			token: 'secure-token-or-session-id',
		});

		setDateDoc(dDoc);
		setDateProvider(dProvider);

		const ytext = dDoc.getText('content');
		const handleYjsChange = () => {
			const val = ytext.toString();
			if (val && val !== reportDateRef.current) {
				setReportDate(val.split('T')[0]);
			}
		};
		ytext.observe(handleYjsChange);

		// 2. Macroscopy room
		const macDoc = new Y.Doc();
		const macProvider = new HocuspocusProvider({
			url: 'ws://127.0.0.1:1234',
			name: `report-${report.id}-macroscopy`,
			document: macDoc,
			token: 'secure-token-or-session-id',
		});
		macProvider.awareness?.setLocalStateField('user', { name: auth.user.name, color: auth.user.cursor_color || '#8b5cf6' });

		setMacroscopyDoc(macDoc);
		setMacroscopyProvider(macProvider);

		// 3. Microscopy room
		const micDoc = new Y.Doc();
		const micProvider = new HocuspocusProvider({
			url: 'ws://127.0.0.1:1234',
			name: `report-${report.id}-microscopy`,
			document: micDoc,
			token: 'secure-token-or-session-id',
		});
		micProvider.awareness?.setLocalStateField('user', { name: auth.user.name, color: auth.user.cursor_color || '#d946ef' });

		setMicroscopyDoc(micDoc);
		setMicroscopyProvider(micProvider);

		// 4. Diagnosis room
		const diagDoc = new Y.Doc();
		const diagProvider = new HocuspocusProvider({
			url: 'ws://127.0.0.1:1234',
			name: `report-${report.id}-diagnosis`,
			document: diagDoc,
			token: 'secure-token-or-session-id',
		});
		diagProvider.awareness?.setLocalStateField('user', { name: auth.user.name, color: auth.user.cursor_color || '#3b82f6' });

		setDiagnosisDoc(diagDoc);
		setDiagnosisProvider(diagProvider);

		// 5. Save Status room
		const saveDoc = new Y.Doc();
		const saveProvider = new HocuspocusProvider({
			url: 'ws://127.0.0.1:1234',
			name: `report-${report.id}-save-status`,
			document: saveDoc,
			token: 'secure-token-or-session-id',
		});

		setSaveStatusDoc(saveDoc);
		setSaveStatusProvider(saveProvider);

		const ytextSave = saveDoc.getText('content');
		const handleSaveYjsChange = () => {
			const val = ytextSave.toString();
			if (val === 'saving') {
				setGlobalSaveState('saving');
			} else if (val === 'saved') {
				setGlobalSaveState('saved');
				setLastSaved(new Date());
			} else {
				setGlobalSaveState('idle');
			}
		};
		ytextSave.observe(handleSaveYjsChange);

		return () => {
			ytext.unobserve(handleYjsChange);
			ytextSave.unobserve(handleSaveYjsChange);
			dProvider.destroy();
			dDoc.destroy();
			macProvider.destroy();
			macDoc.destroy();
			micProvider.destroy();
			micDoc.destroy();
			diagProvider.destroy();
			diagDoc.destroy();
			saveProvider.destroy();
			saveDoc.destroy();
			setDateDoc(null);
			setDateProvider(null);
			setMacroscopyDoc(null);
			setMacroscopyProvider(null);
			setMicroscopyDoc(null);
			setMicroscopyProvider(null);
			setDiagnosisDoc(null);
			setDiagnosisProvider(null);
			setSaveStatusDoc(null);
			setSaveStatusProvider(null);
		};
	}, [report?.id]);

	const [statusDoc, setStatusDoc] = useState<Y.Doc | null>(null);
	const [statusProvider, setStatusProvider] = useState<HocuspocusProvider | null>(null);
	const specimenStatusRef = useRef(specimen.status);

	useEffect(() => {
		specimenStatusRef.current = specimen.status;
	}, [specimen.status]);

	useEffect(() => {
		if (!report) return;

		const doc = new Y.Doc();
		const provider = new HocuspocusProvider({
			url: 'ws://127.0.0.1:1234',
			name: `report-${report.id}-status`,
			document: doc,
			token: 'secure-token-or-session-id',
		});

		setStatusDoc(doc);
		setStatusProvider(provider);

		const ytext = doc.getText('content');
		const handleYjsChange = () => {
			const val = ytext.toString();
			if (val && val !== specimenStatusRef.current) {
				console.log(`Status changed via collaboration: ${val}`);
				const statusLabels: Record<string, string> = {
					received: 'Recibido',
					macroscopic_review: 'Revisión Macroscópica',
					processing: 'Procesamiento',
					microscopic_review: 'Revisión Microscópica',
					finalized: 'Finalizado',
					delivered: 'Entregado',
					cancelled: 'Cancelado',
				};
				const statusName = statusLabels[val] || val;
				toast.info(`El estado de la muestra ha cambiado a: ${statusName}`);
				router.reload();
			}
		};
		ytext.observe(handleYjsChange);

		return () => {
			ytext.unobserve(handleYjsChange);
			provider.destroy();
			doc.destroy();
			setStatusDoc(null);
			setStatusProvider(null);
		};
	}, [report?.id]);

	const allCollaborators = [
		{ name: auth.user.name, color: auth.user.cursor_color || '#3b82f6' },
		...macroscopyUsers,
		...microscopyUsers,
		...diagnosisUsers,
	];
	const [zoomScale, setZoomScale] = useState(1);
	const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
	const containerRef = useRef<HTMLDivElement>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSpecimenSheetOpen, setIsSpecimenSheetOpen] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 300);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!containerRef.current || zoomMode !== 'fit') return;
		const handleResize = () => {
			const parent = containerRef.current;
			if (parent) {
				const parentWidth = parent.clientWidth;
				// Subtract padding from the container width
				const scale = (parentWidth - 32) / 800;
				setZoomScale(Math.min(scale, 1.2));
			}
		};

		handleResize();
		const observer = new ResizeObserver(handleResize);
		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, [zoomMode, isLoading]);


	useEffect(() => {
		if (report) {
			setReportDate(report.report_date ? report.report_date.split('T')[0] : '');
			setMacroscopyHtml(report.macroscopy_html || '');
			setMicroscopyHtml(report.microscopy_html || '');
			setDiagnosisHtml(report.diagnosis_html || '');
		}
	}, [report]);

	const handleCreateReport = () => {
		router.post(`/specimens/${specimen.sequence_code}/report-editor`, {}, {
			onSuccess: () => {
				toast.success('Reporte creado y estado actualizado a revisión macroscópica');
			},
			onError: (errors) => {
				toast.error('Error al crear el reporte');
				console.error(errors);
			}
		});
	};

	const handleUpdateDate = (dateVal: string) => {
		setReportDate(dateVal);
		if (dateDoc) {
			const ytext = dateDoc.getText('content');
			dateDoc.transact(() => {
				ytext.delete(0, ytext.length);
				ytext.insert(0, dateVal);
			});
		}
	};

	const handleTransitionState = (targetStatus: Specimen['status']) => {
		router.post(`/specimens/${specimen.sequence_code}/report-editor/transition-state`, {
			status: targetStatus
		}, {
			preserveScroll: true,
			onSuccess: () => {
				toast.success('Estado del proceso actualizado');
				if (statusDoc) {
					const ytext = statusDoc.getText('content');
					specimenStatusRef.current = targetStatus;
					statusDoc.transact(() => {
						ytext.delete(0, ytext.length);
						ytext.insert(0, targetStatus);
					});
				}
			},
			onError: () => {
				toast.error('Error al actualizar el estado del proceso');
			}
		});
	};

	// Loader for 300ms
	if (isLoading) {
		return (
			<EditorLayout breadcrumbs={[
				{ title: 'Muestras', href: '/specimens' },
				{ title: specimen.sequence_code, href: `/specimens?specimen=${specimen.sequence_code}&action=view` },
				{ title: 'Editor de Informe', href: '#' }
			]}>
				<Head title={`Cargando Editor - ${specimen.sequence_code}`} />
				<div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
					<div className="relative flex items-center justify-center">
						<div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
						<div className="absolute h-6 w-6 rounded-full bg-primary/10" />
					</div>
					<p className="text-sm font-semibold text-muted-foreground animate-pulse">Cargando editor de informe...</p>
				</div>
			</EditorLayout>
		);
	}

	// Blank screen when report does not exist
	if (!report) {
		return (
			<EditorLayout breadcrumbs={[{ title: 'Mis Asignaciones', href: '/my-assignments' }, { title: 'Editor de Informe', href: '#' }]}>
				<Head title={`Crear Reporte - ${specimen.sequence_code}`} />
				<div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
					<div className="max-w-md p-8 bg-card border border-border/80 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden">
						<div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
						<div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto mb-6">
							<FileText className="h-8 w-8" />
						</div>
						<h2 className="text-2xl font-bold tracking-tight mb-3">Reporte no iniciado</h2>
						<p className="text-muted-foreground text-sm mb-6 leading-relaxed">
							Esta muestra aún no posee un registro de reporte. Al iniciar el reporte se creará la plantilla del documento y el estado cambiará de <span className="font-semibold text-primary">Recibido</span> a <span className="font-semibold text-violet-500">Revisión Macroscópica</span>.
						</p>
						<Button
							size="lg"
							onClick={handleCreateReport}
							className="w-full font-semibold shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer"
						>
							Crear Reporte
						</Button>
					</div>
				</div>
			</EditorLayout>
		);
	}

	const isMacroscopyEditable = ['macroscopic_review', 'processing', 'microscopic_review'].includes(specimen.status);
	const isMicroscopyEditable = specimen.status === 'microscopic_review';
	const isDiagnosisEditable = !['finalized', 'delivered'].includes(specimen.status);

	// Pathologist information logic
	const pathologist = specimen.users?.[0];
	const pathologistName = pathologist ? pathologist.name : 'DRA. ESTEFANY LAGOS';
	const pathologistTitle = pathologist ? (pathologist.role?.name || 'PATOLOGÍA ONCOLÓGICA') : 'PATOLOGÍA ONCOLÓGICA';

	const totalPages = pages.length > 0 ? pages.length : 1;

	const renderPreviewPage = (pageNum: number) => {
		const pageBlocks = pages[pageNum - 1] || [];
		const totalNumPages = pages.length > 0 ? pages.length : 1;

		return (
			<div
				className="w-[800px] h-[1035px] bg-white text-slate-800 p-12 border shadow-2xl relative flex flex-col font-sans select-none origin-top-left shrink-0 mb-6 text-left overflow-hidden"
				style={{
					aspectRatio: '8.5/11'
				}}
			>
				{/* Header preview */}
				<div className="border-b-2 border-slate-800 pb-3 mb-4 shrink-0">
					<div className="flex justify-between items-start">
						<div>
							<img
								className="max-h-[52px] w-auto mb-1"
								src="/images/patolab-logo-horizontal.png"
								alt="Logo PatoLab"
								onError={(e) => {
									e.currentTarget.style.display = 'none';
									const fallback = document.getElementById(`preview-logo-text-fallback-${pageNum}`);
									if (fallback) fallback.style.display = 'block';
								}}
							/>
							<div id={`preview-logo-text-fallback-${pageNum}`} style={{ display: 'none' }}>
								<h2 className="text-xl font-bold text-blue-900 tracking-tight">PatoLab</h2>
								<span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-wider block">Laboratorio de Patología & Citología</span>
							</div>
							<span className="text-[8px] italic text-gray-600 block mt-0.5">Calidad Diagnóstica a su Servicio</span>
						</div>
						<div className="text-right">
							<div className="bg-slate-100 border border-slate-300 text-slate-800 font-mono font-bold text-[9.5px] px-2.5 py-1 rounded">
								Biopsia N° {specimen.sequence_code}
							</div>
						</div>
					</div>
					<h3 className="text-center text-xs font-bold tracking-wider mt-3 uppercase text-slate-800">Informe de Anatomía Patológica</h3>
				</div>

				{/* Page Content */}
				<div className="flex-1 flex flex-col overflow-hidden text-left gap-0">
					{pageBlocks.map((block) => {
						if (block.type === 'patient-card') {
							return <PatientMetadataCard key={block.id} specimen={specimen} />;
						}
						if (block.type === 'section-header') {
							return <SectionHeader key={block.id} title={block.title || ''} />;
						}
						if (block.type === 'signature') {
							return (
								<SignatureBlock
									key={block.id}
									pathologistName={pathologistName}
									pathologistTitle={pathologistTitle}
									reportDate={reportDate}
									isLastPage={true}
								/>
							);
						}
						if (block.type === 'html') {
							return (
								<div
									key={block.id}
									className={cn(block.className, "shrink-0")}
									dangerouslySetInnerHTML={{ __html: block.html || '' }}
								/>
							);
						}
						return null;
					})}
				</div>

				{/* Footer preview */}
				<div className="border-t border-slate-800 pt-3 mt-4 shrink-0">
					<div className="text-center text-[7.5px] font-semibold text-gray-700 mb-1">
						Este reporte contiene información médica confidencial. Consulte a su médico para adecuada interpretación del mismo.
					</div>

					<table className="w-full border-none text-[7.5px] text-gray-500 table-fixed">
						<tbody>
							<tr className="border-none">
								<td className="w-1/4 border-none p-0 align-middle text-left">✉ info@PatoLab.org</td>
								<td className="w-1/4 border-none p-0 align-middle text-left">☎ +504 2510-6502</td>
								<td className="w-1/4 border-none p-0 align-middle text-left">📞 +504 9442 8529</td>
								<td className="w-1/4 border-none p-0 text-right align-middle leading-tight max-w-[180px] truncate">
									📍 Bo. Los Andes, SPS
								</td>
							</tr>
						</tbody>
					</table>

					<div className="mt-2 text-[7.5px] font-bold text-gray-600">
						Página {pageNum} de {totalNumPages}
					</div>
				</div>
			</div>
		);
	};

	return (
		<EditorLayout
			breadcrumbs={[
				{ title: 'Muestras', href: '/specimens' },
				{ title: specimen.sequence_code, href: `/specimens?specimen=${specimen.sequence_code}&action=view` },
				{ title: 'Editor de Informe', href: '#' }
			]}
			headerRight={
				<div className="flex items-center gap-3">
					<CollaboratorsList users={allCollaborators} />
					<div className="h-6 w-px bg-border/80" />
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
						{isAutosaving ? (
							<>
								<div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
								<span className="font-medium text-amber-600 dark:text-amber-500 animate-pulse">Guardando...</span>
							</>
						) : (
							<>
								<div className="h-2 w-2 rounded-full bg-emerald-500" />
								<span className="font-medium text-emerald-600 dark:text-emerald-500">{timeString}</span>
							</>
						)}
					</div>
					<button
						data-slot="button"
						onClick={handleManualSave}
						disabled={globalSaveState === 'saving' || globalSaveState === 'saved' || isSavedRecently || isAutosaving}
						className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-emerald-600 text-white shadow-xs hover:bg-emerald-600/90 py-2 has-[>svg]:px-3 h-10 px-5 text-sm w-full md:w-auto cursor-pointer"
					>
						{globalSaveState === 'saving' ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin mr-1" />
								Guardando...
							</>
						) : (globalSaveState === 'saved' || isSavedRecently) ? (
							<>
								<Check className="h-4 w-4 mr-1 text-white" />
								¡Guardado!
							</>
						) : (
							<>
								<Save className="h-4 w-4 mr-1" />
								Guardar
							</>
						)}
					</button>
				</div>
			}
		>
			<Head title={`Editor de Informe - ${specimen.sequence_code}`} />
			<style dangerouslySetInnerHTML={{ __html: editorStyles }} />

			<div className="items-start bg-slate-50/50 dark:bg-slate-900/10 h-[100vh]">

				{/* LEFT COLUMN: Inputs and Editors */}
				<div className="overflow-auto h-[calc(100vh-64px)] w-screen lg:w-[50vw]">

					{/* Header bar with Back button and Status Badge */}
					<div className="p-6 flex items-center justify-between border-b sticky top-0 z-10 bg-background">
						<div className="flex items-center gap-3">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => router.visit('/specimens')}
								className="h-8 w-8 cursor-pointer"
							>
								<ArrowLeft className="h-4 w-4" />
							</Button>
							<div>
								<h1 className="text-lg font-bold tracking-tight">Editor de Informe</h1>
								<p className="text-xs text-muted-foreground">{specimen.type.name} &bull; {specimen.examination.name}</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground">Fase actual:</span>
							<span
								className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider"
								style={{
									backgroundColor: specimen.status === 'macroscopic_review' ? '#8b5cf620' : specimen.status === 'processing' ? '#f59e0b20' : specimen.status === 'microscopic_review' ? '#d946ef20' : '#10b98120',
									color: specimen.status === 'macroscopic_review' ? '#8b5cf6' : specimen.status === 'processing' ? '#d97706' : specimen.status === 'microscopic_review' ? '#d946ef' : '#059669',
									border: `1px solid ${specimen.status === 'macroscopic_review' ? '#8b5cf630' : specimen.status === 'processing' ? '#d9770630' : specimen.status === 'microscopic_review' ? '#d946ef30' : '#05966930'}`
								}}
							>
								{specimen.status === 'macroscopic_review' ? 'Macroscopía' : specimen.status === 'processing' ? 'Procesando' : specimen.status === 'microscopic_review' ? 'Microscopía' : 'Finalizado'}
							</span>
						</div>
					</div>

					{/* Sticky Contextual Formatting Toolbar */}
					{activeEditor && (
						<div className="sticky top-[93px] z-10 bg-background/95 transition-all duration-205">
							<div className="flex items-center justify-strech bg-muted/40 border-b border-border px-6">
								<div className="w-full overflow-x-auto min-h-[36px] flex justify-between">
									<EditorToolbar editor={activeEditor} specimenSequenceCode={specimen.sequence_code} />
								</div>

								{activeField && (
									<div className='h-[36px] flex items-center'>
										<div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-card">
											<div className={cn(
												"h-2 w-2 rounded-full",
												activeField === 'diagnosis' && "bg-blue-500 animate-pulse",
												activeField === 'macroscopy' && "bg-violet-500 animate-pulse",
												activeField === 'microscopy' && "bg-fuchsia-500 animate-pulse",
											)} />
											<span className="text-muted-foreground text-[9px] uppercase tracking-wider font-bold">
												{activeField === 'diagnosis' ? 'Diagnóstico' : activeField === 'macroscopy' ? 'Macroscopía' : 'Microscopía'}
											</span>
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					<div className='p-6 flex flex-col gap-5'>

						{/* Specimen and Customer Summary Card */}
						<div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs relative">
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-md font-semibold flex items-center gap-2 text-primary">
									<UserRound className="h-4 w-4" /> Resumen de Paciente y Muestra
								</h3>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setIsSpecimenSheetOpen(true)}
									className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full cursor-pointer"
									title="Ver detalles de la muestra"
								>
									<Eye className="h-4 w-4" />
								</Button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
								<div className="space-y-2">
									<p>
										<span className="text-muted-foreground font-medium">Paciente:</span>{" "}
										<strong className="text-card-foreground">
											{specimen.customer_relation.name} (
											{specimen.customer_relation.type === 'empresa' ? 'Empresa' : 'Cliente'})
										</strong>
									</p>
									<p><span className="text-muted-foreground font-medium">Edad / Sexo:</span> <strong className="text-card-foreground">{specimen.customer_relation.age ?? 'N/A'} años ({specimen.customer_relation.gender})</strong></p>
									<p><span className="text-muted-foreground font-medium">Médico Remitente:</span> <strong className="text-card-foreground">{specimen.referrer_relation.name}</strong></p>
								</div>
								<div className="space-y-2">
									<p><span className="text-muted-foreground font-medium">Tipo:</span> <strong className="text-card-foreground">{specimen.type.name} - {specimen.examination.name}</strong></p>
									<p><span className="text-muted-foreground font-medium">Categoría:</span> <strong className="text-card-foreground">{specimen.category?.name || 'N/A'}</strong></p>
									<p><span className="text-muted-foreground font-medium">Fecha Recibo:</span> <strong className="text-card-foreground">{new Date(specimen.created_at).toLocaleDateString('es-HN')}</strong></p>
								</div>
							</div>
						</div>

						{/* Report Date Picker Card */}
						<div className="flex flex-col md:flex-row items-center justify-start gap-4">
							<label htmlFor="report-date" className="block text-sm font-semibold flex items-center gap-2">
								<Calendar className="h-4 w-4 text-muted-foreground" /> Fecha del Reporte
							</label>
							<div className="relative max-w-sm">
								<input
									type="date"
									id="report-date"
									value={reportDate}
									onChange={(e) => handleUpdateDate(e.target.value)}
									className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
								/>
							</div>
						</div>

						{/* Diagnosis Editor Section */}
						<div className="space-y-3">
							<div className="flex items-center justify-between pl-3 border-l-4 border-blue-500/80">
								<h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2">
									<FileText className="h-4 w-4 text-blue-500" /> Diagnóstico Patológico
								</h3>
							</div>

							{isDiagnosisEditable ? (
								<CollaborativeEditor
									reportId={report.id}
									field="diagnosis"
									userName={auth.user.name}
									cursorColor={auth.user.cursor_color || '#3b82f6'}
									initialContent={diagnosisHtml}
									onUpdate={setDiagnosisHtml}
									onUsersChange={setDiagnosisUsers}
									specimenSequenceCode={specimen.sequence_code}
									doc={diagnosisDoc}
									provider={diagnosisProvider}
									onFocus={(editor) => handleEditorFocus(editor, 'diagnosis')}
									onBlur={handleEditorBlur}
								/>
							) : (
								<ReadOnlyEditor content={diagnosisHtml} />
							)}
						</div>

						{/* Macroscopy Editor Section */}
						<div className="space-y-3">
							<div className="flex items-center justify-between pl-3 border-l-4 border-violet-500/80">
								<h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2">
									<Microscope className="h-4 w-4 text-violet-500" /> Descripción Macroscópica
								</h3>
							</div>

							{isMacroscopyEditable ? (
								<CollaborativeEditor
									reportId={report.id}
									field="macroscopy"
									userName={auth.user.name}
									cursorColor={auth.user.cursor_color || '#8b5cf6'}
									initialContent={macroscopyHtml}
									onUpdate={setMacroscopyHtml}
									onUsersChange={setMacroscopyUsers}
									specimenSequenceCode={specimen.sequence_code}
									doc={macroscopyDoc}
									provider={macroscopyProvider}
									onFocus={(editor) => handleEditorFocus(editor, 'macroscopy')}
									onBlur={handleEditorBlur}
								/>
							) : (
								<ReadOnlyEditor content={macroscopyHtml} />
							)}

							{specimen.status === 'macroscopic_review' && (
								<div className="flex justify-end pt-2">
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												className="bg-violet-600 hover:bg-violet-700 text-white font-semibold cursor-pointer shadow-sm"
											>
												Completar Macroscopía y Enviar a Procesamiento
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>¿Confirmar completado de macroscopía?</AlertDialogTitle>
												<AlertDialogDescription>
													Esta acción marcará la descripción macroscópica como completada y enviará la muestra a la fase de procesamiento en laboratorio. El estado de la muestra cambiará a <strong>Procesando</strong>.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancelar</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => handleTransitionState('processing')}
													className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
												>
													Confirmar y Enviar
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							)}
						</div>

						{/* Microscopy Editor Section */}
						<div className="space-y-3">
							<div className="flex items-center justify-between pl-3 border-l-4 border-fuchsia-500/80">
								<h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2">
									<Microscope className="h-4 w-4 text-fuchsia-500" /> Descripción Microscópica
								</h3>
							</div>

							{/* Status: before processing - hidden or inactive */}
							{(specimen.status === 'received' || specimen.status === 'macroscopic_review') && (
								<div className="flex flex-col items-center justify-center p-8 bg-muted/30 border border-dashed rounded-lg text-center">
									<AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
									<h4 className="text-xs font-semibold text-muted-foreground">Fase no iniciada</h4>
									<p className="text-[10px] text-muted-foreground max-w-xs mt-1">
										Esta sección estará disponible una vez finalizada la descripción macroscópica y completada la fase de procesamiento.
									</p>
								</div>
							)}

							{/* Status: processing - locked with button in middle to start microscopy */}
							{specimen.status === 'processing' && (
								<div className="relative border rounded-lg overflow-hidden bg-muted/10 p-6 min-h-[160px] flex flex-col items-center justify-center text-center">
									<div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex flex-col items-center justify-center p-4">
										<h4 className="text-xs font-bold mb-2">Fase de Procesamiento en Curso</h4>
										<p className="text-[10px] text-muted-foreground mb-4 max-w-xs">
											Haga clic a continuación para pasar la muestra a revisión microscópica e iniciar la redacción colaborativa del reporte.
										</p>
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold cursor-pointer shadow-sm"
												>
													Iniciar Fase de Microscopía
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>¿Iniciar fase de microscopía?</AlertDialogTitle>
													<AlertDialogDescription>
														Esta acción dará por finalizado el procesamiento físico/químico en laboratorio y habilitará la edición de la descripción microscópica y el diagnóstico de forma colaborativa. El estado cambiará a <strong>Microscopía</strong>.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancelar</AlertDialogCancel>
													<AlertDialogAction
														onClick={() => handleTransitionState('microscopic_review')}
														className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white cursor-pointer"
													>
														Iniciar Microscopía
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								</div>
							)}

							{/* Status: microscopic_review or finalized - load collaborative editor */}
							{(specimen.status === 'microscopic_review' || specimen.status === 'finalized' || specimen.status === 'delivered') && (
								<>
									{isMicroscopyEditable ? (
										<CollaborativeEditor
											reportId={report.id}
											field="microscopy"
											userName={auth.user.name}
											cursorColor={auth.user.cursor_color || '#d946ef'}
											initialContent={microscopyHtml}
											onUpdate={setMicroscopyHtml}
											onUsersChange={setMicroscopyUsers}
											specimenSequenceCode={specimen.sequence_code}
											doc={microscopyDoc}
											provider={microscopyProvider}
											onFocus={(editor) => handleEditorFocus(editor, 'microscopy')}
											onBlur={handleEditorBlur}
										/>
									) : (
										<ReadOnlyEditor content={microscopyHtml} />
									)}

									{isMicroscopyEditable && (
										<div className="flex justify-end pt-2">
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold cursor-pointer shadow-sm"
													>
														Finalizar Reporte de Anatomía Patológica
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>¿Confirmar finalización del reporte?</AlertDialogTitle>
														<AlertDialogDescription>
															Esta acción cerrará definitivamente la redacción de las descripciones del informe médico. El estado de la muestra cambiará a <strong>Finalizado</strong>, bloqueando cualquier edición futura.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancelar</AlertDialogCancel>
														<AlertDialogAction
															onClick={() => handleTransitionState('finalized')}
															className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white cursor-pointer"
														>
															Finalizar Reporte
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</div>
									)}
								</>
							)}
						</div>
					</div>

				</div>

				{/* RIGHT COLUMN: Live PDF Preview */}
				<div className="block lg:fixed lg:top-[64px] left-[50vw] w-screen lg:w-[50vw] flex flex-col h-[calc(100vh-64px)] min-h-[500px] space-y-3">

					<div className="relative flex-1 flex flex-col bg-slate-200 dark:bg-slate-950/20 overflow-hidden shadow-xs">

						{/* Floating Controls Overlay */}
						<div className="absolute top-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-center gap-2 sm:justify-between pointer-events-none">
							{/* Zoom Controls (Glassmorphism) */}
							<div className="pointer-events-auto flex items-center gap-1.5 bg-background/80 dark:bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-border/50 shadow-md text-xs">
								<button
									type="button"
									onClick={() => {
										setZoomMode('manual');
										setZoomScale(prev => Math.max(0.3, prev - 0.1));
									}}
									className="h-6 w-6 flex items-center justify-center font-bold hover:bg-muted rounded-full cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
									title="Zoom Out"
								>
									-
								</button>
								<span className="px-1 min-w-[36px] text-center font-mono font-semibold text-foreground">
									{Math.round(zoomScale * 100)}%
								</span>
								<button
									type="button"
									onClick={() => {
										setZoomMode('manual');
										setZoomScale(prev => Math.min(1.5, prev + 0.1));
									}}
									className="h-6 w-6 flex items-center justify-center font-bold hover:bg-muted rounded-full cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
									title="Zoom In"
								>
									+
								</button>
								<div className="h-3.5 w-px bg-border/80 mx-1" />
								<button
									type="button"
									onClick={() => {
										setZoomMode('fit');
										if (containerRef.current) {
											const scale = (containerRef.current.clientWidth - 32) / 800;
											setZoomScale(Math.min(scale, 1.2));
										}
									}}
									className={cn(
										"px-2.5 py-1 rounded-full hover:bg-muted cursor-pointer transition-colors font-medium text-[10px] text-muted-foreground hover:text-foreground",
										zoomMode === 'fit' && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
									)}
								>
									Ajustar
								</button>
							</div>

							{/* Floating Download Button */}
							<a
								href={`/specimens/${specimen.sequence_code}/report-editor/pdf`}
								target="_blank"
								rel="noopener noreferrer"
								className="pointer-events-auto inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-full shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto"
							>
								<Download className="h-3.5 w-3.5" />
								{isFinished ? 'Descargar Informe' : 'Descargar Previsualización'}
							</a>
						</div>

						{/* Scrollable Preview Pane */}
						<div ref={containerRef} className="flex-1 p-4 pt-24 sm:pt-16 overflow-y-auto overflow-x-auto">
							<div style={{ height: `${(1035 * totalPages + 24 * (totalPages - 1)) * zoomScale}px`, width: `${800 * zoomScale}px`, margin: '0 auto', position: 'relative' }}>
								<div
									className="origin-top-left shrink-0"
									style={{
										transform: `scale(${zoomScale})`,
									}}
								>
									{Array.from({ length: totalPages }).map((_, i) => (
										<Fragment key={i}>
											{renderPreviewPage(i + 1)}
										</Fragment>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>

			</div>

			<SpecimenViewSheet
				specimen={specimen}
				open={isSpecimenSheetOpen}
				onOpenChange={setIsSpecimenSheetOpen}
				onEditClick={() => {
					router.visit(`/specimens?specimen=${specimen.sequence_code || specimen.id}&action=edit`);
				}}
			/>

			{/* Hidden container for layout measurement */}
			<div
				ref={hiddenContainerRef}
				className="absolute opacity-0 pointer-events-none"
				style={{
					width: '704px', // 800 - 96px padding
					top: '-9999px',
					left: '-9999px',
					fontFamily: "'Outfit', 'Helvetica Neue', Arial, sans-serif",
					fontSize: '10.5px',
					lineHeight: '1.45',
					color: '#1f2937',
				}}
			>
				{/* 1. Header (for measurement) */}
				<div data-block-type="header-measure" className="border-b-2 border-slate-800 pb-3 mb-4">
					<div className="flex justify-between items-start">
						<div>
							<img className="max-h-[52px] w-auto mb-1" src="/images/patolab-logo-horizontal.png" alt="Logo PatoLab" />
							<span className="text-[8px] italic text-gray-600 block mt-0.5">Calidad Diagnóstica a su Servicio</span>
						</div>
						<div className="text-right">
							<div className="bg-slate-100 border border-slate-300 text-slate-800 font-mono font-bold text-[9.5px] px-2.5 py-1 rounded">
								Biopsia N° {specimen.sequence_code}
							</div>
						</div>
					</div>
					<h3 className="text-center text-xs font-bold tracking-wider mt-3 uppercase text-slate-800">Informe de Anatomía Patológica</h3>
				</div>

				{/* 2. Footer (for measurement) */}
				<div data-block-type="footer-measure" className="border-t border-slate-800 pt-3 mt-4">
					<div className="text-center text-[7.5px] font-semibold text-gray-700 mb-1">
						Este reporte contiene información médica confidencial.
					</div>
					<table className="w-full border-none text-[7.5px] text-gray-500 table-fixed">
						<tbody>
							<tr className="border-none">
								<td className="w-1/4 border-none p-0 align-middle text-left">✉ info@PatoLab.org</td>
							</tr>
						</tbody>
					</table>
					<div className="mt-2 text-[7.5px] font-bold text-gray-600">
						Página 1 de 1
					</div>
				</div>

				{/* 3. Patient Metadata Card */}
				<div data-block-type="patient-card">
					<PatientMetadataCard specimen={specimen} />
				</div>

				{/* 4. Diagnosis Header & Content */}
				{(diagnosisHtml || specimen.diagnosis) && (
					<>
						<div data-block-type="section-header" data-block-title="Diagnóstico">
							<SectionHeader title="Diagnóstico" />
						</div>
						{parseHtmlToBlocks(diagnosisHtml || specimen.diagnosis || '').map((html, idx) => (
							<div
								key={`diag-html-${idx}`}
								data-block-type="html"
								className="text-[9.5px] leading-relaxed text-gray-800 preview-content"
								dangerouslySetInnerHTML={{ __html: html }}
							/>
						))}
					</>
				)}

				{/* 5. Macroscopy Header & Content */}
				<div data-block-type="section-header" data-block-title="Descripción Macroscópica">
					<SectionHeader title="Descripción Macroscópica" />
				</div>
				{parseHtmlToBlocks(macroscopyHtml || '<i>Pendiente de revisión macroscópica.</i>').map((html, idx) => (
					<div
						key={`macro-html-${idx}`}
						data-block-type="html"
						className="text-[9px] leading-relaxed text-gray-800 preview-content"
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				))}

				{/* 6. Page Break */}
				{isMicroscopyVisible && (
					<div data-block-type="page-break" style={{ height: '0px' }} />
				)}

				{/* 7. Microscopy Header & Content */}
				{isMicroscopyVisible && (
					<>
						<div data-block-type="section-header" data-block-title="Descripción Microscópica">
							<SectionHeader title="Descripción Microscópica" />
						</div>
						{parseHtmlToBlocks(microscopyHtml || '<i>Pendiente de revisión microscópica.</i>').map((html, idx) => (
							<div
								key={`micro-html-${idx}`}
								data-block-type="html"
								className="text-[9px] leading-relaxed text-gray-800 preview-content"
								dangerouslySetInnerHTML={{ __html: html }}
							/>
						))}
					</>
				)}

				{/* 8. Pathologist Signature Block */}
				<div data-block-type="signature">
					<SignatureBlock
						pathologistName={pathologistName}
						pathologistTitle={pathologistTitle}
						reportDate={reportDate}
						isLastPage={false}
					/>
				</div>
			</div>
		</EditorLayout>
	);
}
