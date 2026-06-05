import { Head, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
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

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
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
`;

// ─────────────────────────────────────────────────────────────
// Shared extension list (no collaboration, used by ReadOnlyEditor)
// ─────────────────────────────────────────────────────────────
const sharedExtensions = [
	Image.configure({ allowBase64: false }),
	TableRow,
	TableHeader,
	TableCell,
	TextAlign.configure({ types: ['heading', 'paragraph'] }),
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
			<div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-muted/40 border-b border-border">

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
					onClick={() => editor?.chain().focus().setTextAlign('left').run()}
					active={editor?.isActive({ textAlign: 'left' })}
					title="Alinear a la izquierda"
				>
					<AlignLeft className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor?.chain().focus().setTextAlign('center').run()}
					active={editor?.isActive({ textAlign: 'center' })}
					title="Centrar"
				>
					<AlignCenter className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor?.chain().focus().setTextAlign('right').run()}
					active={editor?.isActive({ textAlign: 'right' })}
					title="Alinear a la derecha"
				>
					<AlignRight className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
					active={editor?.isActive({ textAlign: 'justify' })}
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
			Table.configure({ resizable: false }),
			...sharedExtensions,
		],
		content,
		editable: false,
	}, [content]);

	return (
		<div className="border rounded-lg bg-muted/10 text-card-foreground shadow-xs overflow-hidden">
			<EditorContent editor={editor} className="p-4 min-h-[160px] focus:outline-hidden" />
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
}: {
	reportId: number;
	field: string;
	userName: string;
	cursorColor: string;
	initialContent: string;
	onUpdate: (html: string) => void;
	onUsersChange: (users: Array<{ name: string; color: string }>) => void;
	specimenSequenceCode: string;
}) {
	const [doc] = useState(() => new Y.Doc());
	const [provider] = useState(() => {
		const wsProvider = new HocuspocusProvider({
			url: 'ws://127.0.0.1:1234',
			name: `report-${reportId}-${field}`,
			document: doc,
			token: 'secure-token-or-session-id',
		});
		wsProvider.awareness?.setLocalStateField('user', { name: userName, color: cursorColor });
		return wsProvider;
	});

	const disconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (disconnectTimeoutRef.current) {
			clearTimeout(disconnectTimeoutRef.current);
			disconnectTimeoutRef.current = null;
		}
		provider.awareness?.setLocalStateField('user', { name: userName, color: cursorColor });
		return () => {
			disconnectTimeoutRef.current = setTimeout(() => {
				console.log(`🔌 Disconnecting room: report-${reportId}-${field}`);
				provider.destroy();
				doc.destroy();
			}, 100);
		};
	}, [provider, doc, userName, cursorColor, reportId, field]);

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

	const editor = useEditor({
		extensions: [
			StarterKit.configure({ undoRedo: false }),
			Table.configure({ resizable: true }),
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
		content: initialContent,
		editable: true,
		onUpdate({ editor }) {
			setTimeout(() => { onUpdate(editor.getHTML()); }, 0);
		},
	});

	return (
		<div className="border rounded-lg bg-card text-card-foreground shadow-xs overflow-hidden">
			<EditorToolbar editor={editor} specimenSequenceCode={specimenSequenceCode} />
			<EditorContent editor={editor} className="p-4 min-h-[160px] focus:outline-hidden" />
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
}) {
	const [isMounted, setIsMounted] = useState(false);
	useEffect(() => { setIsMounted(true); }, []);

	if (!isMounted || typeof window === 'undefined') {
		return (
			<div className="border rounded-lg bg-card text-card-foreground shadow-xs overflow-hidden">
				<div className="h-10 bg-muted/40 border-b border-border" />
				<div className="p-4 min-h-[160px] flex items-center justify-center">
					<span className="text-xs text-muted-foreground animate-pulse">Cargando editor colaborativo...</span>
				</div>
			</div>
		);
	}

	return <CollaborativeEditorInner {...props} />;
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
		<TooltipProvider delayDuration={100}>
			<div className="flex items-center -space-x-2 mr-2">
				{uniqueUsers.map((user, idx) => {
					const initials = getInitials(user.name);
					return (
						<Tooltip key={`${user.name}-${idx}`}>
							<TooltipTrigger asChild>
								<div
									className="relative flex items-center justify-center h-8 w-8 rounded-full border-2 border-background text-white font-bold select-none text-[11px] shadow-xs cursor-default hover:z-10 hover:scale-110 transition-all duration-200"
									style={{ backgroundColor: user.color || '#3b82f6' }}
								>
									{initials}
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="text-xs py-1 px-2 font-medium bg-popover text-popover-foreground border border-border shadow-md">
								{user.name}
							</TooltipContent>
						</Tooltip>
					);
				})}
			</div>
		</TooltipProvider>
	);
}

export default function ReportWorkspace({ specimen, report, auth }: Props) {
	const [reportDate, setReportDate] = useState(report?.report_date || new Date().toISOString().split('T')[0]);
	const [macroscopyHtml, setMacroscopyHtml] = useState(report?.macroscopy_html || '');
	const [microscopyHtml, setMicroscopyHtml] = useState(report?.microscopy_html || '');
	const [macroscopyUsers, setMacroscopyUsers] = useState<Collaborator[]>([]);
	const [microscopyUsers, setMicroscopyUsers] = useState<Collaborator[]>([]);

	const [dateDoc, setDateDoc] = useState<Y.Doc | null>(null);
	const [dateProvider, setDateProvider] = useState<HocuspocusProvider | null>(null);
	const reportDateRef = useRef(reportDate);

	useEffect(() => {
		reportDateRef.current = reportDate;
	}, [reportDate]);

	useEffect(() => {
		if (!report) return;

		const doc = new Y.Doc();
		const provider = new HocuspocusProvider({
			url: 'ws://127.0.0.1:1234',
			name: `report-${report.id}-report_date`,
			document: doc,
			token: 'secure-token-or-session-id',
		});

		setDateDoc(doc);
		setDateProvider(provider);

		const ytext = doc.getText('content');
		const handleYjsChange = () => {
			const val = ytext.toString();
			if (val && val !== reportDateRef.current) {
				setReportDate(val);
			}
		};
		ytext.observe(handleYjsChange);

		return () => {
			ytext.unobserve(handleYjsChange);
			provider.destroy();
			doc.destroy();
			setDateDoc(null);
			setDateProvider(null);
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
	];
	const [zoomScale, setZoomScale] = useState(1);
	const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
	const containerRef = useRef<HTMLDivElement>(null);
	const [isLoading, setIsLoading] = useState(true);

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
			setReportDate(report.report_date);
			setMacroscopyHtml(report.macroscopy_html || '');
			setMicroscopyHtml(report.microscopy_html || '');
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

	// Pathologist information logic
	const pathologist = specimen.users?.[0];
	const pathologistName = pathologist ? pathologist.name : 'DRA. ESTEFANY LAGOS';
	const pathologistTitle = pathologist ? (pathologist.role?.name || 'PATOLOGÍA ONCOLÓGICA') : 'PATOLOGÍA ONCOLÓGICA';

	return (
		<EditorLayout
			breadcrumbs={[
				{ title: 'Muestras', href: '/specimens' },
				{ title: specimen.sequence_code, href: `/specimens?specimen=${specimen.sequence_code}&action=view` },
				{ title: 'Editor de Informe', href: '#' }
			]}
			headerRight={<CollaboratorsList users={allCollaborators} />}
		>
			<Head title={`Editor de Informe - ${specimen.sequence_code}`} />
			<style dangerouslySetInnerHTML={{ __html: editorStyles }} />

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 min-h-screen items-start bg-slate-50/50 dark:bg-slate-900/10">

				{/* LEFT COLUMN: Inputs and Editors */}
				<div className="lg:col-span-6 space-y-6">

					{/* Header bar with Back button and Status Badge */}
					<div className="flex items-center justify-between border-b pb-4">
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

					{/* Specimen and Customer Summary Card */}
					<div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs relative overflow-hidden">
						<div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/80" />
						<h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
							<UserRound className="h-4 w-4" /> Resumen de Paciente y Muestra
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
							<div className="space-y-2">
								<p><span className="text-muted-foreground font-medium">Paciente:</span> <strong className="text-card-foreground">{specimen.customer_relation.name}</strong></p>
								<p><span className="text-muted-foreground font-medium">Edad / Sexo:</span> <strong className="text-card-foreground">{specimen.customer_relation.age ?? 'N/A'} años ({specimen.customer_relation.gender})</strong></p>
								<p><span className="text-muted-foreground font-medium">Médico Remitente:</span> <strong className="text-card-foreground">{specimen.referrer_relation.name}</strong></p>
							</div>
							<div className="space-y-2">
								<p><span className="text-muted-foreground font-medium">Sitio de la Muestra:</span> <strong className="text-card-foreground">{specimen.anatomic_site}</strong></p>
								<p><span className="text-muted-foreground font-medium">Diagnóstico Clínico:</span> <strong className="text-card-foreground">{specimen.diagnosis || 'N/A'}</strong></p>
								<p><span className="text-muted-foreground font-medium">Fecha Recibo:</span> <strong className="text-card-foreground">{new Date(specimen.created_at).toLocaleDateString('es-HN')}</strong></p>
							</div>
						</div>
					</div>

					{/* Report Date Picker Card */}
					<div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs">
						<label htmlFor="report-date" className="block text-sm font-semibold mb-2 flex items-center gap-2">
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

					{/* Macroscopy Editor Section */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold flex items-center gap-2">
								<Microscope className="h-4 w-4 text-violet-500" /> Descripción Macroscópica
							</h3>
							{isMacroscopyEditable && (
								<span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
									<Check className="h-3 w-3" /> Editable colaborativo
								</span>
							)}
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
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold flex items-center gap-2">
								<Microscope className="h-4 w-4 text-fuchsia-500" /> Descripción Microscópica
							</h3>
							{specimen.status === 'microscopic_review' && (
								<span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
									<Check className="h-3 w-3" /> Editable colaborativo
								</span>
							)}
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

				{/* RIGHT COLUMN: Live PDF Preview */}
				<div className="lg:col-span-6 lg:sticky lg:top-6 space-y-4">
					<div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
						<span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vista Previa del Informe</span>

						{/* Zoom Controls */}
						<div className="flex items-center gap-1 bg-muted/60 p-1 rounded-md border border-border/50 text-xs">
							<button
								type="button"
								onClick={() => {
									setZoomMode('manual');
									setZoomScale(prev => Math.max(0.3, prev - 0.1));
								}}
								className="h-6 w-6 flex items-center justify-center font-bold hover:bg-accent rounded cursor-pointer transition-colors"
								title="Zoom Out"
							>
								-
							</button>
							<span className="px-1.5 min-w-[36px] text-center font-mono font-semibold">
								{Math.round(zoomScale * 100)}%
							</span>
							<button
								type="button"
								onClick={() => {
									setZoomMode('manual');
									setZoomScale(prev => Math.min(1.5, prev + 0.1));
								}}
								className="h-6 w-6 flex items-center justify-center font-bold hover:bg-accent rounded cursor-pointer transition-colors"
								title="Zoom In"
							>
								+
							</button>
							<div className="h-4 w-px bg-border mx-1" />
							<button
								type="button"
								onClick={() => {
									setZoomMode('fit');
									// Trigger recalculation immediately
									if (containerRef.current) {
										const scale = (containerRef.current.clientWidth - 32) / 800;
										setZoomScale(Math.min(scale, 1.2));
									}
								}}
								className={cn(
									"px-2 py-0.5 rounded hover:bg-accent cursor-pointer transition-colors font-medium text-[10px]",
									zoomMode === 'fit' && "bg-primary/10 text-primary hover:bg-primary/20"
								)}
							>
								Ajustar
							</button>
						</div>

						<a
							href={`/specimens/${specimen.sequence_code}/report-editor/pdf`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
						>
							<Download className="h-3.5 w-3.5" /> Descargar PDF
						</a>
					</div>

					<div ref={containerRef} className="border border-border/80 rounded-xl bg-slate-100 dark:bg-slate-950/20 p-4 max-h-[85vh] overflow-y-auto overflow-x-auto">
						<div style={{ height: `${1035 * zoomScale}px`, width: `${800 * zoomScale}px`, margin: '0 auto', position: 'relative' }}>
							<div
								className="w-[800px] min-h-[1035px] bg-white text-slate-800 p-12 border shadow-2xl relative flex flex-col font-sans select-none origin-top-left shrink-0"
								style={{
									transform: `scale(${zoomScale})`,
									aspectRatio: '8.5/11'
								}}
							>

								{/* Header preview */}
								<div className="border-b-2 border-slate-800 pb-3 mb-4">
									<div className="flex justify-between items-start">
										<div>
											<img
												className="max-h-[52px] w-auto mb-1"
												src="/images/patolab-logo-horizontal.png"
												alt="Logo PatoLab"
												onError={(e) => {
													e.currentTarget.style.display = 'none';
													const fallback = document.getElementById('preview-logo-text-fallback');
													if (fallback) fallback.style.display = 'block';
												}}
											/>
											<div id="preview-logo-text-fallback" style={{ display: 'none' }}>
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
									<h3 className="text-center text-xs font-bold tracking-wider mt-3 uppercase">Informe de Anatomía Patológica</h3>
								</div>

								{/* Patient Metadata preview */}
								<div className="border border-blue-200 bg-blue-50/50 rounded p-3 mb-4 text-[9px] grid grid-cols-2 gap-4">
									<div className="space-y-1">
										<p><strong className="text-blue-900">Nombre:</strong> {specimen.customer_relation.name}</p>
										<p><strong className="text-blue-900">Edad / Sexo:</strong> {specimen.customer_relation.age ?? 'N/A'} años / {specimen.customer_relation.gender}</p>
										<p><strong className="text-blue-900">Médico Remitente:</strong> {specimen.referrer_relation.name}</p>
										<p><strong className="text-blue-900">Diagnóstico Clínico:</strong> {specimen.diagnosis || 'N/A'}</p>
									</div>
									<div className="space-y-1">
										<p><strong className="text-blue-900">Hospital/Clínica:</strong> {specimen.referrer_relation.notes || 'HDV'}</p>
										<p><strong className="text-blue-900">Sitio Preciso de la Muestra:</strong> {specimen.anatomic_site}</p>
										<p><strong className="text-blue-900">Fecha de la Toma:</strong> {new Date(specimen.created_at).toLocaleDateString('es-HN')}</p>
										<p><strong className="text-blue-900">Fecha de Recibo:</strong> {new Date(specimen.created_at).toLocaleDateString('es-HN')}</p>
									</div>
								</div>

								{/* Diagnosis block */}
								{specimen.diagnosis && (
									<div className="mb-4">
										<h4 className="text-[9.5px] font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1.5 uppercase">Diagnóstico</h4>
										<div className="text-[9.5px] leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: specimen.diagnosis }} />
									</div>
								)}

								{/* Macroscopy Preview */}
								<div className="mb-4">
									<h4 className="text-[9.5px] font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1.5 uppercase">Descripción Macroscópica</h4>
									<div
										className="text-[9px] leading-relaxed text-gray-800 preview-content"
										dangerouslySetInnerHTML={{ __html: macroscopyHtml || '<i>Pendiente de revisión macroscópica.</i>' }}
									/>
								</div>

								{/* Microscopy Preview */}
								{(specimen.status === 'microscopic_review' || specimen.status === 'finalized' || specimen.status === 'delivered') && (
									<div className="mb-4">
										<h4 className="text-[9.5px] font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1.5 uppercase">Descripción Microscópica</h4>
										<div
											className="text-[9px] leading-relaxed text-gray-800 preview-content"
											dangerouslySetInnerHTML={{ __html: microscopyHtml || '<i>Pendiente de revisión microscópica.</i>' }}
										/>
									</div>
								)}

								{/* Pathologist Signature Preview */}
								<div className="mt-auto pt-6 text-center">
									<div className="w-[180px] border-t border-gray-400 mx-auto mb-1" />
									<div className="text-[9px] font-bold text-gray-800 uppercase">{pathologistName}</div>
									<div className="text-[7.5px] text-gray-500 font-medium uppercase tracking-wide">{pathologistTitle}</div>
									<div className="text-[8px] font-bold text-gray-600 mt-2">
										FECHA: {reportDate ? new Date(reportDate).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : new Date().toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
									</div>
								</div>

							</div>
						</div>
					</div>
				</div>

			</div>
		</EditorLayout>
	);
}
