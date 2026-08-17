import { PDFViewer } from '@embedpdf/react-pdf-viewer';
import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Head, router } from '@inertiajs/react';

import { TableKit } from '@tiptap/extension-table';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
	Microscope,
	Plus,
	Calendar,
	Check,
	FileText,
	ArrowLeft,
	ArrowDown,
	Unlock,
	UserRound,
	MapPin,
	Sheet as SheetIcon,
	AlertCircle,
	Eye,
	Save,
	Loader2,
	Lock,
	Edit,
	MoreVertical,
	UserPlus,
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
	Mic,
	MicOff,
	Sparkles,
	Highlighter,
	X,
	LayoutGrid,
	CaseSensitive,
	ChevronDown,
	GripVertical,
} from 'lucide-react';
import { Mail, Phone, Scissors } from 'lucide-react';
import React, { useState, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import * as Y from 'yjs';
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
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetDescription,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import EditorLayout from '@/layouts/editor-layout';
import { cn } from '@/lib/utils';
import CustomerSheet from '../../customers/customer-sheet';
import ReferrerSheet from '../../referrers/referrer-sheet';
import SpecimenPathologistSheet from '../specimen-pathologist-sheet';
import SpecimenSheet from '../specimen-sheet';
import SpecimenViewSheet from '../specimen-view-sheet';
import AIDictationSheet from './ai-dictation-sheet';
import AIGrammarSheet from './ai-grammar-sheet';
import LivePdfPreview from './live-pdf-preview';
import SpecimenInsumosCard from './specimen-insumos-card';
import { CollaborativeEditor } from './components/collaborative-editor';
import { CompleteMicroscopyDialog } from './components/complete-microscopy-dialog';
import { EditorRegistryContext } from './components/editor-registry-context';
import { editorStyles } from './components/editor-styles';
import { MissingSignaturesDialog } from './components/missing-signatures-dialog';
import {
	COLLABORATION_SERVER_URL,
	WS_COLLABORATION_SERVER_URL,
	CustomBulletList,
	sharedExtensions,
	HIGHLIGHT_COLORS,
} from './components/tiptap-extensions';
import ManageCuttingsSheet from './cuttings/manage-cuttings-sheet';
import ImageGridComponent, { ImageCropperDialog } from './image-grid-component';

interface Collaborator {
	name: string;
	color: string;
}

interface SpecimenReport {
	id: number;
	report_date: string;
	finalization_date?: string;
	macroscopy_html: string | null;
	microscopy_html: string | null;
	diagnosis_html: string | null;
	clinical_details_html: string | null;
	comments_notes_html: string | null;
	protocols_html: string | null;
	legend_html: string | null;
	open_text_html: string | null;
	open_text_label: string | null;
	addendum_html: string | null;
	macroscopy_finalization_datetime: string | null;
	microscopy_finalization_datetime: string | null;
	report_finalization_datetime: string | null;
	sections_order: Array<{
		key: string;
		order: number;
		active: boolean;
	}> | null;
	headings_toggles: Record<string, boolean> | null;
}

interface Specimen {
	id: number;
	sequence_code: string;
	sample_collection_date?: string;
	anatomic_site: string;
	diagnosis: string | null;
	clinical_notes: string | null;
	status:
	| 'received'
	| 'macroscopic_review'
	| 'processing'
	| 'microscopic_review'
	| 'finalized'
	| 'delivered'
	| 'cancelled';
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
		id: number;
		name: string;
		role?: {
			name: string;
		};
		user_signature?: string | null;
		signature_url?: string | null;
		pivot?: {
			macroscopy_access: boolean;
			microscopy_access: boolean;
		};
	}>;
	collaborators?: Array<{
		id: number;
		name: string;
		role?: {
			name: string;
		};
		user_signature?: string | null;
		signature_url?: string | null;
		pivot?: {
			macroscopy_access: boolean;
			microscopy_access: boolean;
		};
	}>;
	products?: any[];
	cuttings?: any[];
}

interface Props {
	specimen: Specimen;
	report: SpecimenReport | null;
	auth: {
		user: {
			id: number;
			name: string;
			cursor_color?: string;
			role?: {
				slug: string;
			};
		};
		permissions?: string[];
	};
	pathologists?: any[];
	products?: any[];
	cutting_codes: any[];
	cutting_prefixes: any[];
	cutting_slide_types: any[];
	users: any[];
	templates?: any[];
	specimenTypes?: any[];
	examinations?: any[];
	categories?: any[];
	referrers?: any[];
	referrerTypes?: any[];
	priorities?: any[];
	locations?: any[];
	sequences?: any[];
	activeLocationId?: number | null;
	banks?: any[];
}

// ─────────────────────────────────────────────────────────────
// Toolbar helpers
// ─────────────────────────────────────────────────────────────
const ToolbarContext = React.createContext<{ isDictating: boolean }>({
	isDictating: false,
});

function ToolbarDivider() {
	return <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

function ToolbarBtn({
	onClick,
	active,
	title,
	disabled = false,
	onMouseDown,
	children,
}: {
	onClick: () => void;
	active?: boolean;
	title: string;
	disabled?: boolean;
	onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
	children: React.ReactNode;
}) {
	const { isDictating } = React.useContext(ToolbarContext);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					onMouseDown={onMouseDown}
					disabled={disabled || isDictating}
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

function FontSizeDropdown({
	editor,
	onPopoverOpenChange,
}: {
	editor: Editor | null;
	onPopoverOpenChange?: (open: boolean) => void;
}) {
	const [customPt, setCustomPt] = useState('');
	const [open, setOpen] = useState(false);

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		onPopoverOpenChange?.(newOpen);
	};

	const applyFontSize = (size: string | null) => {
		if (!editor) {
			return;
		}

		if (size) {
			editor
				.chain()
				.focus()
				.setMark('textStyle', { fontSize: size })
				.run();
		} else {
			editor
				.chain()
				.focus()
				.setMark('textStyle', { fontSize: null })
				.run();
		}

		handleOpenChange(false);
	};

	const handleCustomSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const num = parseFloat(customPt.trim());

		if (!isNaN(num) && num > 0) {
			applyFontSize(`${num}pt`);
			setCustomPt('');
		}
	};

	const currentFontSize = editor?.getAttributes('textStyle').fontSize;
	const displaySize = currentFontSize
		? currentFontSize.replace(/pt|px/g, '')
		: '8';

	const ptPresets = [
		'8',
		'9',
		'10',
		'11',
		'12',
		'14',
		'16',
		'18',
		'20',
		'24',
		'28',
		'36',
	];

	return (
		<DropdownMenu open={open} onOpenChange={handleOpenChange}>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							disabled={!editor}
							onMouseDown={(e) => e.preventDefault()}
							className={cn(
								'inline-flex h-7 items-center gap-1 rounded border border-input bg-background px-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-hidden',
								'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
								currentFontSize &&
								'border-blue-300 bg-blue-50 font-bold text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
							)}
						>
							<span className="text-[11px] font-bold text-muted-foreground">
								Aa
							</span>
							<span className="w-7 text-center text-xs font-semibold">
								{displaySize}pt
							</span>
							<ChevronDown className="h-3 w-3 opacity-60" />
						</button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="bottom" className="py-1 text-xs">
					Tamaño de fuente (pt)
				</TooltipContent>
			</Tooltip>
			<DropdownMenuContent
				align="start"
				onCloseAutoFocus={(e) => e.preventDefault()}
				className="w-48 bg-popover p-1 text-popover-foreground shadow-md"
			>
				<div className="px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
					Tamaño de Fuente (pt)
				</div>
				<div className="grid grid-cols-4 gap-1 p-1">
					{ptPresets.map((sz) => {
						const val = `${sz}pt`;
						const isSelected =
							currentFontSize === val || displaySize === sz;

						return (
							<button
								key={sz}
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => applyFontSize(val)}
								className={cn(
									'flex h-7 items-center justify-center rounded text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
									isSelected &&
									'bg-primary font-bold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
								)}
							>
								{sz}pt
							</button>
						);
					})}
				</div>
				<form
					onSubmit={handleCustomSubmit}
					className="mt-1 flex items-center gap-1 border-t px-1 pt-1.5"
				>
					<input
						type="number"
						step="0.5"
						min="5"
						max="120"
						placeholder="Valor pt"
						value={customPt}
						onChange={(e) => setCustomPt(e.target.value)}
						className="h-6 w-full rounded border border-input bg-background px-1.5 text-xs focus:ring-1 focus:ring-ring focus:outline-hidden"
					/>
					<button
						type="submit"
						disabled={!customPt.trim()}
						onMouseDown={(e) => e.preventDefault()}
						className="h-6 shrink-0 cursor-pointer rounded bg-primary px-2 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						pt
					</button>
				</form>
				<div className="mt-1 border-t pt-1">
					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => applyFontSize(null)}
						className="flex h-6 w-full items-center justify-center gap-1 rounded text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
					>
						Por defecto
					</button>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function LineHeightDropdown({
	editor,
	onPopoverOpenChange,
}: {
	editor: Editor | null;
	onPopoverOpenChange?: (open: boolean) => void;
}) {
	const [customVal, setCustomVal] = useState('');
	const [open, setOpen] = useState(false);

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		onPopoverOpenChange?.(newOpen);
	};

	const applyLineHeight = (val: string | null) => {
		if (!editor) {
			return;
		}

		if (val) {
			editor.chain().focus().setLineHeight(val).run();
		} else {
			editor.chain().focus().unsetLineHeight().run();
		}

		handleOpenChange(false);
	};

	const handleCustomSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const num = parseFloat(customVal.trim());

		if (!isNaN(num) && num > 0) {
			applyLineHeight(num.toString());
			setCustomVal('');
		}
	};

	const currentLineHeight =
		editor?.getAttributes('paragraph').lineHeight ||
		editor?.getAttributes('heading').lineHeight;

	const options = [
		{ label: '0.85 (Muy compacto)', value: '0.85' },
		{ label: '0.95 (Compacto)', value: '0.95' },
		{ label: '1.0 (Sencillo)', value: '1.0' },
		{ label: '1.15 (Estándar 1.15)', value: '1.15' },
		{ label: '1.25 (1.25x)', value: '1.25' },
		{ label: '1.5 (1.5 líneas)', value: '1.5' },
		{ label: '1.75 (1.75x)', value: '1.75' },
		{ label: '2.0 (Doble)', value: '2.0' },
	];

	return (
		<DropdownMenu open={open} onOpenChange={handleOpenChange}>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							disabled={!editor}
							onMouseDown={(e) => e.preventDefault()}
							className={cn(
								'inline-flex h-7 items-center gap-1 rounded border border-input bg-background px-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-hidden',
								'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
								currentLineHeight &&
								'border-blue-300 bg-blue-50 font-bold text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
							)}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="h-3.5 w-3.5 text-muted-foreground"
							>
								<path d="M21 6H3" />
								<path d="M21 12H9" />
								<path d="M21 18H3" />
								<path d="M3 12v6" />
								<path d="M6 15l-3 3-3-3" />
							</svg>
							<span className="text-xs font-semibold">
								{currentLineHeight || '1.25'}
							</span>
							<ChevronDown className="h-3 w-3 opacity-60" />
						</button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="bottom" className="py-1 text-xs">
					Interlineado / Espaciado de párrafo (Word / Office)
				</TooltipContent>
			</Tooltip>
			<DropdownMenuContent
				align="start"
				onCloseAutoFocus={(e) => e.preventDefault()}
				className="w-52 bg-popover p-1 text-popover-foreground shadow-md"
			>
				<div className="px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
					Interlineado
				</div>
				<div className="space-y-0.5">
					{options.map((opt) => (
						<DropdownMenuItem
							key={opt.value}
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => applyLineHeight(opt.value)}
							className={cn(
								'flex cursor-pointer items-center justify-between px-2 py-1 text-xs',
								currentLineHeight === opt.value &&
								'bg-primary font-semibold text-primary-foreground',
							)}
						>
							<span>{opt.label}</span>
						</DropdownMenuItem>
					))}
				</div>
				<form
					onSubmit={handleCustomSubmit}
					className="mt-1 flex items-center gap-1 border-t px-1 pt-1.5"
				>
					<input
						type="number"
						step="0.05"
						min="0.5"
						max="5.0"
						placeholder="Personalizado (ej. 1.3)"
						value={customVal}
						onChange={(e) => setCustomVal(e.target.value)}
						className="h-6 w-full rounded border border-input bg-background px-1.5 text-xs focus:ring-1 focus:ring-ring focus:outline-hidden"
					/>
					<button
						type="submit"
						disabled={!customVal.trim()}
						onMouseDown={(e) => e.preventDefault()}
						className="h-6 shrink-0 cursor-pointer rounded bg-primary px-2 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						OK
					</button>
				</form>
				<div className="mt-1 border-t pt-1">
					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => applyLineHeight(null)}
						className="flex h-6 w-full items-center justify-center gap-1 rounded text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
					>
						Por defecto
					</button>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function EditorToolbar({
	editor,
	specimenSequenceCode,
	reportId,
	field,
	onDictationChange,
	isSheetOpen: propsIsSheetOpen,
	onSheetOpenChange: propsOnSheetOpenChange,
	onPopoverOpenChange,
	isDictationSheetOpen,
	onDictationSheetOpenChange,
}: {
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
}) {
	const isSheetOpen = propsIsSheetOpen;
	const setIsSheetOpen = propsOnSheetOpenChange;
	const setIsDictationSheetOpen = onDictationSheetOpenChange;

	// Force update on editor transactions so button active states update reactively
	const [, setTick] = useState(0);
	const dictationStartPosRef = useRef<number | null>(null);

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

	const isDictating = isDictationSheetOpen;

	useEffect(() => {
		onDictationChange?.(isDictating);
	}, [isDictating, onDictationChange]);
	const [selectedText, setSelectedText] = useState('');
	const hasReplacedRef = useRef(false);

	const activeSelectionText = editor
		? editor.state.doc.textBetween(
			editor.state.selection.from,
			editor.state.selection.to,
			'\n',
		)
		: '';
	const hasSelection = activeSelectionText.trim().length > 0;

	const transformTextCase = (
		type: 'uppercase' | 'lowercase' | 'capitalize' | 'sentence',
	) => {
		if (!editor) {
			return;
		}

		editor
			.chain()
			.focus()
			.command(({ tr, state }) => {
				const { from, to } = state.selection;

				if (from === to) {
					return false;
				}

				const text = state.doc.textBetween(from, to, '\n');
				let newText = '';

				if (type === 'uppercase') {
					newText = text.toUpperCase();
				} else if (type === 'lowercase') {
					newText = text.toLowerCase();
				} else if (type === 'capitalize') {
					newText = text.replace(/\b\w/g, (c) => c.toUpperCase());
				} else if (type === 'sentence') {
					newText = text
						.toLowerCase()
						.replace(
							/(^\s*|[.!?]\s+)([a-z])/g,
							(m, p1, p2) => p1 + p2.toUpperCase(),
						);
				}

				tr.insertText(newText, from, to);

				return true;
			})
			.run();
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

		const selected = editor.state.doc.textBetween(
			editor.state.selection.from,
			editor.state.selection.to,
			'\n',
		);

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
		<ToolbarContext.Provider value={{ isDictating }}>
			<TooltipProvider delayDuration={400}>
				<div className="flex w-full flex-col bg-muted/40">
					<div className="flex w-full flex-wrap items-center gap-0.5 p-1.5">
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
									title="Añadir columna"
								>
									<span className="text-[9px] leading-none font-bold">
										+C
									</span>
								</ToolbarBtn>
								<ToolbarBtn
									onClick={() =>
										editor
											?.chain()
											.focus()
											.addRowAfter()
											.run()
									}
									title="Añadir fila"
								>
									<span className="text-[9px] leading-none font-bold">
										+F
									</span>
								</ToolbarBtn>
								<ToolbarBtn
									onClick={() =>
										editor
											?.chain()
											.focus()
											.deleteColumn()
											.run()
									}
									title="Eliminar columna"
								>
									<span className="text-[9px] leading-none font-bold text-red-500">
										−C
									</span>
								</ToolbarBtn>
								<ToolbarBtn
									onClick={() =>
										editor
											?.chain()
											.focus()
											.deleteRow()
											.run()
									}
									title="Eliminar fila"
								>
									<span className="text-[9px] leading-none font-bold text-red-500">
										−F
									</span>
								</ToolbarBtn>
								<ToolbarBtn
									onClick={() =>
										editor
											?.chain()
											.focus()
											.deleteTable()
											.run()
									}
									title="Eliminar tabla"
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

// ─────────────────────────────────────────────────────────────
// Read-only preview editor (no collaboration, no toolbar)
// ─────────────────────────────────────────────────────────────
function ReadOnlyEditor({ content }: { content: string }) {
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
			<div className="flex justify-end pt-1">
				<span className="flex items-center gap-1 rounded border border-slate-500/10 bg-slate-500/5 px-2 py-0.5 text-[9px] font-bold tracking-wider text-slate-500 uppercase">
					<Lock className="h-3.5 w-3.5" /> Solo lectura
				</span>
			</div>
		</div>
	);
}
// ─────────────────────────────────────────────────────────────

const isEmptyHtml = (html: string | null | undefined): boolean => {
	if (!html) {
		return true;
	}

	// SSR fallback since DOMParser is not available on server
	if (typeof window === 'undefined') {
		if (html.includes('<img') || html.includes('<table')) {
			return false;
		}

		const cleanStr = html
			.replace(/<[^>]*>/g, '')
			.replace(/\u00a0/g, ' ')
			.trim();

		return cleanStr === '';
	}

	try {
		const doc = new DOMParser().parseFromString(html, 'text/html');
		const body = doc.body;

		if (body.querySelector('img') || body.querySelector('table')) {
			return false;
		}

		const text = (body.textContent || '').replace(/\u00a0/g, ' ').trim();

		return text === '';
	} catch (e) {
		if (html.includes('<img') || html.includes('<table')) {
			return false;
		}

		const cleanStr = html
			.replace(/<[^>]*>/g, '')
			.replace(/\u00a0/g, ' ')
			.trim();

		return cleanStr === '';
	}
};

const getInitials = (name: string) => {
	const parts = name.trim().split(/\s+/);

	if (parts.length === 0) {
		return '';
	}

	if (parts.length === 1) {
		return parts[0].substring(0, 2).toUpperCase();
	}

	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Shows connected users as Google-style overlapping avatar bubbles.
function CollaboratorsList({ users }: { users: Collaborator[] }) {
	if (users.length === 0) {
		return null;
	}

	const uniqueUsersMap = new Map<string, Collaborator>();
	users.forEach((u) => {
		if (u.name) {
			uniqueUsersMap.set(u.name, u);
		}
	});
	const uniqueUsers = Array.from(uniqueUsersMap.values());

	return (
		<div className="mr-2 flex items-center -space-x-2">
			{uniqueUsers.map((user, idx) => {
				const initials = getInitials(user.name);

				return (
					<div key={`${user.name}-${idx}`} className="group relative">
						<div
							className="relative flex h-8 w-8 cursor-default items-center justify-center rounded-full border-2 border-background text-[11px] font-bold text-white shadow-xs transition-all duration-200 select-none hover:z-10 hover:scale-110"
							style={{ backgroundColor: user.color || '#3b82f6' }}
						>
							{initials}
						</div>
						{/* Custom Traditional Tooltip - Bottom Left, No Arrow */}
						<div className="pointer-events-none absolute top-full right-0 z-50 mt-1.5 hidden rounded-md border border-slate-800/80 bg-slate-900 px-2 py-1 text-[10px] font-semibold whitespace-nowrap text-white shadow-md select-none group-hover:block">
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
	type:
	| 'patient-card'
	| 'section-header'
	| 'html'
	| 'page-break'
	| 'signature'
	| 'heading'
	| 'image'
	| 'cuttings-summary'
	| 'new-cuttings-summary';
	height: number;
	title?: string;
	html?: string;
	className?: string;
	text?: string;
}

function estimatePatientCardHeight(specimen: Specimen) {
	const customer = specimen.customer_relation;
	const referrer = specimen.referrer_relation;

	const customerName = customer?.name || '';
	const referrerName = referrer?.name || '';
	const specimenDiagnosis = specimen.diagnosis || '';
	const referrerNotes = referrer?.notes || '';
	const anatomicSite = specimen.anatomic_site || '';

	// Left column
	const left1 = Math.ceil((8 + customerName.length) / 60);
	const left2 = 1; // age/gender
	const left3 = Math.ceil((18 + referrerName.length) / 60);
	const left4 = Math.ceil((21 + specimenDiagnosis.length) / 60);
	const leftLines = left1 + left2 + left3 + left4;

	// Right column
	const right1 = Math.ceil((18 + referrerNotes.length) / 50);
	const right2 = Math.ceil((29 + anatomicSite.length) / 50);
	const rightLines = right1 + right2 + 2;

	const totalLines = Math.max(leftLines, rightLines) + 2;

	return totalLines * 3.97;
}

function splitHtmlIntoLines(
	html: string,
	maxCharsPerLine: number = 155,
): string[] {
	if (!html) {
		return [];
	}

	const tokenRegex = /(<\/?[a-zA-Z0-9]+(?:\s+[^>]*)?>|[^<]+)/g;
	const tokens = html.match(tokenRegex) || [];

	const lines: string[] = [];
	let currentLineHtml = '';
	let currentLineLength = 0;
	const activeTagsStack: string[] = [];

	const closeActiveTags = () => {
		let closing = '';

		for (let i = activeTagsStack.length - 1; i >= 0; i--) {
			const tagMatch = activeTagsStack[i].match(/<([a-zA-Z0-9]+)/);

			if (tagMatch) {
				closing += `</${tagMatch[1]}>`;
			}
		}

		return closing;
	};

	const openActiveTags = () => {
		return activeTagsStack.join('');
	};

	for (const token of tokens) {
		if (token.startsWith('<')) {
			if (token.startsWith('</')) {
				activeTagsStack.pop();
				currentLineHtml += token;
			} else if (
				token.endsWith('/>') ||
				token.toLowerCase() === '<br>' ||
				token.toLowerCase() === '<br/>'
			) {
				if (
					token.toLowerCase() === '<br>' ||
					token.toLowerCase() === '<br/>'
				) {
					currentLineHtml += closeActiveTags();
					lines.push(currentLineHtml);
					currentLineHtml = openActiveTags();
					currentLineLength = 0;
				} else {
					currentLineHtml += token;
				}
			} else {
				activeTagsStack.push(token);
				currentLineHtml += token;
			}
		} else {
			const words = token.match(/(\s+|\S+)/g) || [];

			for (const word of words) {
				if (
					currentLineLength + word.length > maxCharsPerLine &&
					currentLineLength > 0
				) {
					currentLineHtml += closeActiveTags();
					lines.push(currentLineHtml);

					currentLineHtml = openActiveTags();
					currentLineLength = 0;
				}

				currentLineHtml += word;
				currentLineLength += word.length;
			}
		}
	}

	if (currentLineLength > 0 || currentLineHtml.trim() !== '') {
		currentLineHtml += closeActiveTags();
		lines.push(currentLineHtml);
	}

	return lines;
}

function getImageHeight(blockHtml: string): number {
	const wAttrMatch = blockHtml.match(/<img[^>]+width=["\'](\d+)["\']/i);
	const swMatch = blockHtml.match(/width:\s*(\d+)px/i);
	let attrWidth = wAttrMatch
		? parseInt(wAttrMatch[1], 10)
		: swMatch
			? parseInt(swMatch[1], 10)
			: null;

	const hAttrMatch = blockHtml.match(/<img[^>]+height=["\'](\d+)["\']/i);
	const shMatch = blockHtml.match(/height:\s*(\d+)px/i);
	let attrHeight = hAttrMatch
		? parseInt(hAttrMatch[1], 10)
		: shMatch
			? parseInt(shMatch[1], 10)
			: null;

	if ((!attrWidth || !attrHeight) && typeof document !== 'undefined') {
		const srcMatch = blockHtml.match(/src=["\']([^"\']+)["\']/i);

		if (srcMatch && srcMatch[1]) {
			const src = srcMatch[1];
			const imgs = document.getElementsByTagName('img');

			for (let i = 0; i < imgs.length; i++) {
				const imgEl = imgs[i];

				if (imgEl.src === src || imgEl.getAttribute('src') === src) {
					if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
						if (!attrWidth && !attrHeight) {
							attrWidth = imgEl.naturalWidth;
							attrHeight = imgEl.naturalHeight;
						} else if (attrWidth && !attrHeight) {
							attrHeight = Math.round(
								attrWidth *
								(imgEl.naturalHeight / imgEl.naturalWidth),
							);
						} else if (!attrWidth && attrHeight) {
							attrWidth = Math.round(
								attrHeight *
								(imgEl.naturalWidth / imgEl.naturalHeight),
							);
						}
					}

					break;
				}
			}
		}
	}

	const width = attrWidth ?? 704;
	let height = attrHeight;

	if (!height) {
		height = width; // 1:1 default fallback
	}

	if (width > 704) {
		height = Math.round(height * (704 / width));
	}

	const heightMm = (height * 25.4) / 96;

	return heightMm + 1.0;
}

function getImageAspectRatio(imgTag: string): number {
	const wAttrMatch = imgTag.match(/width=["\'](\d+)["\']/i);
	const swMatch = imgTag.match(/width:\s*(\d+)px/i);
	const attrWidth = wAttrMatch
		? parseInt(wAttrMatch[1], 10)
		: swMatch
			? parseInt(swMatch[1], 10)
			: null;

	const hAttrMatch = imgTag.match(/height=["\'](\d+)["\']/i);
	const shMatch = imgTag.match(/height:\s*(\d+)px/i);
	const attrHeight = hAttrMatch
		? parseInt(hAttrMatch[1], 10)
		: shMatch
			? parseInt(shMatch[1], 10)
			: null;

	if (attrHeight && attrWidth && attrWidth > 0) {
		return attrHeight / attrWidth;
	}

	if (typeof document !== 'undefined') {
		const srcMatch = imgTag.match(/src=["\']([^"\']+)["\']/i);

		if (srcMatch && srcMatch[1]) {
			const src = srcMatch[1];
			const imgs = document.getElementsByTagName('img');

			for (let i = 0; i < imgs.length; i++) {
				const imgEl = imgs[i];

				if (imgEl.src === src || imgEl.getAttribute('src') === src) {
					if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
						return imgEl.naturalHeight / imgEl.naturalWidth;
					}

					break;
				}
			}
		}
	}

	return 1.0;
}

function getInnerHtml(html: string, tag: string): string {
	const regex = new RegExp(`^<${tag}[^>]*>(.*)<\\/${tag}>$`, 'is');
	const match = html.match(regex);

	return match ? match[1] : html;
}

function getRootElementAttributes(htmlStr: string): {
	style: string;
	extraAttrs: string;
} {
	if (typeof window === 'undefined') return { style: '', extraAttrs: '' };
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(htmlStr, 'text/html');
		const elem = doc.body.firstElementChild;
		if (!elem) return { style: '', extraAttrs: '' };

		const styleAttr = elem.getAttribute('style') || '';

		let extraAttrs = '';
		for (let i = 0; i < elem.attributes.length; i++) {
			const attr = elem.attributes[i];
			if (
				attr.name !== 'style' &&
				attr.name !== 'class' &&
				attr.name !== 'id'
			) {
				extraAttrs += ` ${attr.name}="${attr.value.replace(/"/g, '&quot;')}"`;
			}
		}

		return { style: styleAttr, extraAttrs };
	} catch (e) {
		return { style: '', extraAttrs: '' };
	}
}

function getBlockLineHeight(
	block: { html?: string },
	baseLineHeight: number,
): number {
	if (!block.html) {
		return baseLineHeight;
	}

	const html = block.html;
	let fontSize = 2.82; // Default 8pt in mm

	let hasPt = false;
	let hasPx = false;
	let maxPt = 8.0;
	let maxPx = 10.66;

	const ptRegex = /font-size:\s*([\d\.]+)pt/gi;
	let match;
	while ((match = ptRegex.exec(html)) !== null) {
		const val = parseFloat(match[1]);
		if (val > maxPt) {
			maxPt = val;
		}
		hasPt = true;
	}

	if (!hasPt) {
		const pxRegex = /font-size:\s*([\d\.]+)px/gi;
		while ((match = pxRegex.exec(html)) !== null) {
			const val = parseFloat(match[1]);
			if (val > maxPx) {
				maxPx = val;
			}
			hasPx = true;
		}
	}

	if (hasPt) {
		fontSize = maxPt * 0.352777;
	} else if (hasPx) {
		fontSize = maxPx * 0.264583;
	}

	let multiplier = 1.25; // Default multiplier
	const lhMatch = html.match(/line-height:\s*([\d\.]+)/i);
	if (lhMatch) {
		multiplier = parseFloat(lhMatch[1]);
	}

	return fontSize * multiplier;
}

function classifyBlock(blockHtml: string, maxCharsPerLine: number): any {
	const tagMatch = blockHtml.match(/^<([a-zA-Z0-9]+)/);
	const tag = tagMatch ? tagMatch[1].toLowerCase() : 'p';

	if (blockHtml.includes('data-type="image-grid"')) {
		let columns = 2;
		const colMatch = blockHtml.match(/data-columns=["\'](\d+)["\']/i);

		if (colMatch) {
			columns = parseInt(colMatch[1], 10);
		}

		if (columns < 1) {
			columns = 2;
		}

		let align = 'center';
		const alignMatch = blockHtml.match(/data-align=["\']([^"\']+)["\']/i);

		if (alignMatch) {
			align = alignMatch[1];
		}

		let width: number | null = null;
		const widthMatch = blockHtml.match(
			/(?:width|data-width)=["\'](\d+)["\']/i,
		);

		if (widthMatch) {
			width = parseInt(widthMatch[1], 10);
		}

		const imgRegex = /<img[^>]+>/gi;
		const imgTags: string[] = [];
		let match;

		while ((match = imgRegex.exec(blockHtml)) !== null) {
			imgTags.push(match[0]);
		}

		const usableWidth = width ? 185.9 * (width / 704) : 185.9;
		const gap = 1.5; // mm

		// Group images into a single row of up to 4 images
		const slicedTags = imgTags.slice(0, 4);
		const rowsOfImages: string[][] = [slicedTags];

		let gridHeight = 2.0;
		rowsOfImages.forEach((rowImages, i) => {
			let aspectSum = 0.0;
			rowImages.forEach((imgTag) => {
				const aspect = getImageAspectRatio(imgTag);

				if (aspect > 0.0) {
					aspectSum += 1.0 / aspect;
				} else {
					aspectSum += 1.0;
				}
			});

			if (aspectSum <= 0.0) {
				aspectSum = 1.0;
			}

			const N = rowImages.length;
			const maxRowHeight =
				N === 1 ? Math.min(120.0, usableWidth) : usableWidth * 1.5;
			let rowHeight = 0.0;

			if (N > 0) {
				const calculatedHeight =
					(usableWidth - (N - 1) * gap) / aspectSum;
				rowHeight = Math.min(calculatedHeight, maxRowHeight);
			}

			gridHeight += rowHeight;

			if (i > 0) {
				gridHeight += 1.5;
			}
		});

		return {
			type: 'image-grid',
			html: blockHtml,
			columns,
			alignment: align,
			width,
			images: imgTags,
			height: gridHeight,
		};
	}

	if (
		blockHtml.includes('page-break') ||
		blockHtml.includes('page-break-after') ||
		blockHtml.includes('break-after')
	) {
		return {
			type: 'page-break',
			html: blockHtml,
			height: 0.0,
		};
	}

	if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
		let height = 7.94;

		if (tag === 'h1') {
			height = 11.91;
		} else if (tag === 'h2') {
			height = 9.925;
		}

		return {
			type: 'heading',
			tag,
			html: blockHtml,
			height,
		};
	}

	if (tag === 'ul' || tag === 'ol') {
		return {
			type: 'list',
			tag,
			html: blockHtml,
			height: 0.0,
		};
	}

	if (tag === 'table') {
		return {
			type: 'table',
			html: blockHtml,
			height: 0.0,
		};
	}

	if (tag === 'img' || blockHtml.includes('<img')) {
		const srcMatch = blockHtml.match(/src=["\']([^"\']+)["\']/i);
		const src = srcMatch ? srcMatch[1] : '';

		const widthMatch =
			blockHtml.match(/width=["\'](\d+)["\']/i) ||
			blockHtml.match(/width:\s*(\d+)px/i);
		const width = widthMatch ? `${widthMatch[1]}px` : 'auto';

		const heightMatch =
			blockHtml.match(/height=["\'](\d+)["\']/i) ||
			blockHtml.match(/height:\s*(\d+)px/i);
		const height = heightMatch ? `${heightMatch[1]}px` : 'auto';

		const alignMatch =
			blockHtml.match(/data-align=["\']([^"\']+)["\']/i) ||
			blockHtml.match(/class=["\']([^"\']*align-[^"\']*)["\']/i);
		let align = 'center';
		if (alignMatch) {
			const alignVal = alignMatch[1];
			if (alignVal.includes('left')) align = 'left';
			else if (alignVal.includes('right')) align = 'right';
			else if (alignVal.includes('justify')) align = 'justify';
		}

		const captionMatch =
			blockHtml.match(/data-caption=["\']([^"\']+)["\']/i) ||
			blockHtml.match(/alt=["\']([^"\']+)["\']/i);
		const caption = captionMatch ? captionMatch[1] : '';

		const isLeft = align === 'left';
		const isRight = align === 'right';
		const marginLeft = isLeft ? '0' : 'auto';
		const marginRight = isRight ? '0' : 'auto';

		const imgStyles = [
			`display: block`,
			`max-width: 100%`,
			`height: ${height}`,
		];
		if (width !== 'auto') {
			imgStyles.push(`width: ${width}`);
		} else {
			imgStyles.push(`width: auto`);
		}

		let captionHtml = '';
		if (caption) {
			captionHtml = `<div class="image-caption" style="text-align: center; margin-top: 1.06mm; font-style: italic; font-size: 8.5pt; color: #64748b; line-height: 1.2;">${caption}</div>`;
		}

		const wrappedHtml = `<div class="image-wrapper align-${align}" style="display: block; margin-left: ${marginLeft}; margin-right: ${marginRight}; width: fit-content; max-width: 100%;">
            <img src="${src}" class="align-${align}" style="${imgStyles.join('; ')};" />
            ${captionHtml}
        </div>`;

		const widthPx = widthMatch ? parseInt(widthMatch[1], 10) : 360;
		let captionHeight = 0.0;
		if (caption) {
			const maxCharsForCaption = Math.max(
				15,
				Math.floor(widthPx * 0.176),
			);
			const captionLines = Math.max(
				1,
				Math.ceil(caption.length / maxCharsForCaption),
			);
			captionHeight = captionLines * 3.6 + 1.06;
		}

		return {
			type: 'image',
			html: wrappedHtml,
			height: getImageHeight(blockHtml) + captionHeight,
		};
	}

	const classMatch = blockHtml.match(/class=["\']([^"\']+)["\']/i);
	const className = classMatch ? classMatch[1] : '';

	const plainText = blockHtml.replace(/<[^>]+>/g, '').trim();
	const lines = Math.max(1, Math.ceil(plainText.length / maxCharsPerLine));

	return {
		type: 'paragraph',
		tag,
		html: blockHtml,
		className,
		height: lines * getBlockLineHeight({ html: blockHtml }, 3.53),
	};
}

function paginateList(listHtml: string) {
	const tag = listHtml.startsWith('<ol') ? 'ol' : 'ul';
	const itemRegex = /<li[^>]*>(.*?)<\/li>/gis;
	const items: string[] = [];
	let match;

	while ((match = itemRegex.exec(listHtml)) !== null) {
		items.push(match[0]);
	}

	const listStyleTypeMatch = listHtml.match(
		/data-list-style-type=["']([^"']+)["']/i,
	);
	const listStyleType = listStyleTypeMatch ? listStyleTypeMatch[1] : null;

	const styleMatch = listHtml.match(/style=["']([^"']+)["']/i);
	const styleAttr = styleMatch ? styleMatch[1] : null;

	return { tag, items, listStyleType, styleAttr };
}

function paginateTable(tableHtml: string) {
	const trRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
	const rows: { html: string; maxCellTextLen: number }[] = [];
	let match;
	let headerHtml = '';
	let colCount = 1;

	while ((match = trRegex.exec(tableHtml)) !== null) {
		const trHtml = match[0];
		const isHeader = trHtml.includes('<th') || trHtml.includes('thead');

		if (isHeader) {
			headerHtml += trHtml;
			const thCount = (trHtml.match(/<th/gi) || []).length;
			colCount = Math.max(colCount, thCount);
		} else {
			const tdCount = (trHtml.match(/<td/gi) || []).length;
			colCount = Math.max(colCount, tdCount);

			const tdRegex = /<td[^>]*>(.*?)<\/td>/gis;
			let tdMatch;
			let maxCellTextLen = 0;

			while ((tdMatch = tdRegex.exec(trHtml)) !== null) {
				const cellText = tdMatch[1].replace(/<[^>]+>/g, '').trim();
				maxCellTextLen = Math.max(maxCellTextLen, cellText.length);
			}

			rows.push({
				html: trHtml,
				maxCellTextLen,
			});
		}
	}

	return { headerHtml, rows, colCount };
}

function parseHtmlToBlocks(html: string): string[] {
	if (!html) {
		return [];
	}

	if (typeof window === 'undefined') {
		return [html];
	}

	const div = document.createElement('div');
	div.innerHTML = html;

	const blocks: string[] = [];
	let currentText = '';

	Array.from(div.childNodes).forEach((node) => {
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

function PatientMetadataCard({
	specimen,
	sampleCollectionDate,
	reportDate,
}: {
	specimen: Specimen;
	sampleCollectionDate: string;
	reportDate: string;
}) {
	return (
		<table
			style={{
				width: '100%',
				border: '0.26mm solid #bfdbfe',
				borderRadius: '1.59mm',
				backgroundColor: '#eff6ff',
				marginBottom: '2.97mm',
				padding: '2.65mm 3.70mm',
				borderCollapse: 'collapse',
			}}
			className="shrink-0"
		>
			<tbody>
				<tr>
					<td
						style={{
							width: '55%',
							padding: '1.32mm 2.12mm',
							verticalAlign: 'top',
							fontSize: '2.91mm',
							lineHeight: '4.23mm',
							border: 'none',
						}}
					>
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Nombre:
						</strong>{' '}
						{specimen.customer_relation.name}
						<br />
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Edad:
						</strong>{' '}
						{specimen.customer_relation.age ?? 'N/A'} años
						&nbsp;&nbsp;&nbsp;{' '}
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Sexo:
						</strong>{' '}
						{['m', 'masculino', 'hombre'].includes(
							(
								specimen.customer_relation.gender || ''
							).toLowerCase(),
						)
							? 'M'
							: ['f', 'femenino', 'mujer'].includes(
								(
									specimen.customer_relation.gender || ''
								).toLowerCase(),
							)
								? 'F'
								: ['o', 'otro'].includes(
									(
										specimen.customer_relation.gender ||
										''
									).toLowerCase(),
								)
									? 'O'
									: 'N/A'}
						<br />
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Médico Remitente:
						</strong>{' '}
						{specimen.referrer_relation.name}
						<br />
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Hospital/Clínica:
						</strong>{' '}
						{specimen.referrer_relation.notes}
					</td>
					<td
						style={{
							width: '45%',
							padding: '1.32mm 2.12mm 1.32mm 3.18mm',
							verticalAlign: 'top',
							fontSize: '2.91mm',
							lineHeight: '4.23mm',
							border: 'none',
						}}
					>
						{/* <strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
                            Tipo de muestra:
                        </strong>{' '}
                        {(specimen.type?.name || 'N/A') +
                            ' - ' +
                            (specimen.examination?.name || 'N/A')} */}
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Diagnóstico Clínico:
						</strong>{' '}
						{specimen.diagnosis || ''}
						<br />
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Sitio Anatómico:
						</strong>{' '}
						{specimen.anatomic_site || 'N/A'}
						<br />
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Fecha de la toma:
						</strong>{' '}
						{sampleCollectionDate
							? new Date(
								sampleCollectionDate + 'T00:00:00',
							).toLocaleDateString('es-HN')
							: 'N/A'}
						<br />
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Fecha de Recepción:
						</strong>{' '}
						{reportDate
							? new Date(
								reportDate + 'T00:00:00',
							).toLocaleDateString('es-HN')
							: 'N/A'}
					</td>
				</tr>
			</tbody>
		</table>
	);
}

function SectionHeader({ title }: { title: string }) {
	return (
		<div
			style={{
				fontSize: '2.91mm',
				fontWeight: 700,
				color: '#000000',
				marginTop: '2.65mm',
				marginBottom: '1.32mm',
				textTransform: 'uppercase',
				lineHeight: '3.97mm',
				height: '3.97mm',
			}}
			className="shrink-0"
		>
			{title}
		</div>
	);
}

function SignatureBlock({
	users,
	reportDate,
	finalizationDate,
}: {
	users?: Array<{
		id: number;
		name: string;
		role?: {
			name: string;
		};
		user_signature?: string | null;
		signature_url?: string | null;
	}>;
	reportDate: string;
	finalizationDate: string;
}) {
	if (!users || users.length === 0) {
		return null;
	}

	const assignedUsers = users;

	// Chunk assignedUsers into rows of 2
	const chunks: (typeof assignedUsers)[] = [];

	for (let i = 0; i < assignedUsers.length; i += 2) {
		chunks.push(assignedUsers.slice(i, i + 2));
	}

	return (
		<div
			style={{
				marginTop: '3.97mm',
				display: 'flex',
				flexDirection: 'column',
				gap: '4mm',
				alignItems: 'center',
				width: '100%',
			}}
			className="shrink-0"
		>
			{chunks.map((row, rowIndex) => (
				<div
					key={rowIndex}
					style={{
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'flex-end',
						gap: '15mm',
						width: '100%',
					}}
				>
					{row.map((pathologist) => (
						<div
							key={pathologist.id}
							style={{
								width: '58.21mm',
								textAlign: 'center',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
							}}
						>
							{pathologist.signature_url ? (
								<img
									src={pathologist.signature_url}
									alt={`Firma de ${pathologist.name}`}
									style={{
										maxHeight: '12mm',
										width: 'auto',
										marginBottom: '2mm',
										display: 'block',
									}}
								/>
							) : (
								<div style={{ height: '14mm' }} />
							)}
							<div
								style={{
									width: '100%',
									borderTop: '0.40mm solid #4b5563',
									marginBottom: '1.32mm',
								}}
							/>
							<div
								style={{
									fontSize: '2.65mm',
									fontWeight: 700,
									color: '#1f2937',
									textTransform: 'uppercase',
								}}
							>
								{pathologist.name}
							</div>
							<div
								style={{
									fontSize: '2.25mm',
									color: '#4b5563',
									fontWeight: 500,
									textTransform: 'uppercase',
								}}
							>
								{pathologist.role?.name ||
									'PATOLOGÍA ONCOLÓGICA'}
							</div>
							<div
								style={{
									fontSize: '2.38mm',
									fontWeight: 600,
									color: '#374151',
									marginTop: '1.32mm',
								}}
							>
								FECHA:{' '}
								{finalizationDate
									? new Date(
										finalizationDate + 'T00:00:00',
									).toLocaleDateString('es-HN', {
										day: '2-digit',
										month: '2-digit',
										year: '2-digit',
									})
									: new Date().toLocaleDateString('es-HN', {
										day: '2-digit',
										month: '2-digit',
										year: '2-digit',
									})}
							</div>
						</div>
					))}
				</div>
			))}
		</div>
	);
}

function ShadowRoot({
	children,
	className,
	style,
}: {
	children: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

	useEffect(() => {
		if (containerRef.current) {
			let root = containerRef.current.shadowRoot;

			if (!root) {
				root = containerRef.current.attachShadow({ mode: 'open' });
			}

			let styleContainer = root.querySelector('#shadow-style-container');

			if (!styleContainer) {
				styleContainer = document.createElement('div');
				styleContainer.id = 'shadow-style-container';
				(styleContainer as HTMLDivElement).style.display = 'none';
				root.appendChild(styleContainer);
			}

			const copyStyles = () => {
				if (!styleContainer) {
					return;
				}

				styleContainer.innerHTML = '';

				const links = document.querySelectorAll(
					'link[rel="stylesheet"]',
				);
				links.forEach((link) => {
					styleContainer.appendChild(link.cloneNode(true));
				});

				const styles = document.querySelectorAll('style');
				styles.forEach((style) => {
					styleContainer.appendChild(style.cloneNode(true));
				});
			};

			copyStyles();

			const observer = new MutationObserver((mutations) => {
				let shouldUpdate = false;

				for (const mutation of mutations) {
					for (const node of Array.from(mutation.addedNodes)) {
						if (
							node.nodeName === 'STYLE' ||
							(node.nodeName === 'LINK' &&
								(node as HTMLLinkElement).rel === 'stylesheet')
						) {
							shouldUpdate = true;
							break;
						}
					}

					if (shouldUpdate) {
						break;
					}
				}

				if (shouldUpdate) {
					copyStyles();
				}
			});

			observer.observe(document.head, { childList: true, subtree: true });
			setShadowRoot(root);

			return () => {
				observer.disconnect();
			};
		}
	}, []);

	return (
		<div ref={containerRef} className={className} style={style}>
			{shadowRoot && createPortal(children, shadowRoot)}
		</div>
	);
}

export default function ReportWorkspace({
	specimen,
	report,
	auth,
	pathologists = [],
	products = [],
	cutting_codes = [],
	cutting_prefixes = [],
	cutting_slide_types = [],
	users = [],
	templates = [],
	specimenTypes = [],
	examinations = [],
	categories = [],
	referrers = [],
	referrerTypes = [],
	priorities = [],
	locations = [],
	sequences = [],
	activeLocationId = null,
	banks = [],
}: Props) {
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
	const [editorTemplateId, setEditorTemplateId] = useState<string>('');
	const [isApplyTemplateOpen, setIsApplyTemplateOpen] =
		useState<boolean>(false);
	const [isEditSpecimenOpen, setIsEditSpecimenOpen] =
		useState<boolean>(false);
	const [isEditCustomerOpen, setIsEditCustomerOpen] =
		useState<boolean>(false);
	const [isEditReferrerOpen, setIsEditReferrerOpen] =
		useState<boolean>(false);

	const canEditSpecimen = auth.permissions?.includes('specimens.edit');
	const canEditCustomer = auth.permissions?.includes('patients.edit');
	const canEditReferrer = auth.permissions?.includes('referrers.edit');
	const editorRefs = useRef<Record<string, any>>({});

	const registerEditor = (field: string, editor: any) => {
		editorRefs.current[field] = editor;
	};

	const handleInsertConcatenatedString = (text: string) => {
		const editor = editorRefs.current['macroscopy'];

		if (editor) {
			setTimeout(() => {
				const container = document.getElementById(
					'editor-container-macroscopy',
				);

				if (container) {
					container.scrollIntoView({
						behavior: 'smooth',
						block: 'center',
					});
				}

				editor.commands.focus();
				const from = editor.state.selection.from;

				editor.chain().insertContent(`<p>${text}</p>`).run();

				const startPos = from;
				const endPos = startPos + text.length;

				editor
					.chain()
					.setTextSelection({ from: startPos, to: endPos })
					.run();
			}, 200);
		}
	};

	useEffect(() => {
		if (templates && templates.length === 1) {
			setSelectedTemplateId(String(templates[0].id));
		}
	}, [templates]);

	const currentUserSpecimenRelation = specimen.users?.find(
		(u: any) => u.id === auth.user.id,
	);
	const currentUserCollaboratorRelation = specimen.collaborators?.find(
		(u: any) => u.id === auth.user.id,
	);

	const hasMacroAccess =
		!!currentUserSpecimenRelation?.pivot?.macroscopy_access ||
		!!currentUserCollaboratorRelation?.pivot?.macroscopy_access;
	const hasMicroAccess =
		!!currentUserSpecimenRelation?.pivot?.microscopy_access ||
		!!currentUserCollaboratorRelation?.pivot?.microscopy_access;

	const isAssigned =
		!!currentUserSpecimenRelation || !!currentUserCollaboratorRelation;

	const hasCuttingsPermission =
		auth.user.role?.slug === 'admin' ||
		auth.permissions?.includes('cuttings.manage');

	let accessBadgeLabel = 'Solo Lectura';
	let accessBadgeStyle = {
		backgroundColor: 'rgba(100, 116, 139, 0.15)',
		color: '#64748b',
		borderColor: 'rgba(100, 116, 139, 0.25)',
	};

	if (!isAssigned) {
		accessBadgeLabel = 'No Asignado — Sin acceso de edición';
		accessBadgeStyle = {
			backgroundColor: 'rgba(239, 68, 68, 0.15)',
			color: '#ef4444',
			borderColor: 'rgba(239, 68, 68, 0.25)',
		};
	} else if (hasMacroAccess && hasMicroAccess) {
		accessBadgeLabel = 'Acceso a Macro y Microscopía';
		accessBadgeStyle = {
			backgroundColor: 'rgba(16, 185, 129, 0.15)',
			color: '#10b981',
			borderColor: 'rgba(16, 185, 129, 0.25)',
		};
	} else if (hasMacroAccess) {
		accessBadgeLabel = 'Acceso a Macroscopía';
		accessBadgeStyle = {
			backgroundColor: 'rgba(16, 185, 129, 0.15)',
			color: '#10b981',
			borderColor: 'rgba(16, 185, 129, 0.25)',
		};
	} else if (hasMicroAccess) {
		accessBadgeLabel = 'Acceso a Microscopía';
		accessBadgeStyle = {
			backgroundColor: 'rgba(16, 185, 129, 0.15)',
			color: '#10b981',
			borderColor: 'rgba(16, 185, 129, 0.25)',
		};
	}

	const [isLoading, setIsLoading] = useState(true);
	const [isAssignSheetOpen, setIsAssignSheetOpen] = useState(false);
	const [isManageCuttingsOpen, setIsManageCuttingsOpen] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 300);

		return () => clearTimeout(timer);
	}, []);

	const [activeEditor, _setActiveEditor] = useState<Editor | null>(null);
	const activeEditorRef = useRef<Editor | null>(null);
	const setActiveEditor = (editor: Editor | null) => {
		_setActiveEditor(editor);
		activeEditorRef.current = editor;
	};

	const [activeField, setActiveField] = useState<
		| 'diagnosis'
		| 'macroscopy'
		| 'microscopy'
		| 'clinical_details'
		| 'comments_notes'
		| 'protocols'
		| 'legend'
		| 'open_text'
		| 'addendum'
		| null
	>(null);
	const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [isAISheetOpen, setIsAISheetOpen] = useState(false);
	const isAISheetOpenRef = useRef(false);
	const updateAISheetOpen = (open: boolean) => {
		setIsAISheetOpen(open);
		isAISheetOpenRef.current = open;

		if (!open) {
			setTimeout(() => {
				if (
					!isAISheetOpenRef.current &&
					!isDictationSheetOpenRef.current &&
					activeEditorRef.current &&
					!activeEditorRef.current.isFocused
				) {
					setActiveEditor(null);
					setActiveField(null);
				}
			}, 100);
		}
	};

	const [isDictationSheetOpen, setIsDictationSheetOpen] = useState(false);
	const isDictationSheetOpenRef = useRef(false);
	const updateDictationSheetOpen = (open: boolean) => {
		setIsDictationSheetOpen(open);
		isDictationSheetOpenRef.current = open;

		if (!open) {
			setTimeout(() => {
				if (
					!isDictationSheetOpenRef.current &&
					!isAISheetOpenRef.current &&
					activeEditorRef.current &&
					!activeEditorRef.current.isFocused
				) {
					setActiveEditor(null);
					setActiveField(null);
				}
			}, 100);
		}
	};

	const isPopoverOpenRef = useRef(false);
	const updatePopoverOpen = (open: boolean) => {
		isPopoverOpenRef.current = open;

		if (!open) {
			setTimeout(() => {
				if (
					!isPopoverOpenRef.current &&
					!isAISheetOpenRef.current &&
					!isDictationSheetOpenRef.current &&
					activeEditorRef.current &&
					!activeEditorRef.current.isFocused
				) {
					setActiveEditor(null);
					setActiveField(null);
				}
			}, 150);
		}
	};

	const handleEditorFocus = (
		editor: Editor,
		field:
			| 'diagnosis'
			| 'macroscopy'
			| 'microscopy'
			| 'clinical_details'
			| 'comments_notes'
			| 'protocols'
			| 'legend'
			| 'open_text'
			| 'addendum',
	) => {
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
			if (
				isAISheetOpenRef.current ||
				isPopoverOpenRef.current ||
				isDictationSheetOpenRef.current
			) {
				return;
			}

			setActiveEditor(null);
			setActiveField(null);
		}, 200);
	};

	const [reportDate, setReportDate] = useState(
		report?.report_date
			? report.report_date.split('T')[0]
			: new Date().toISOString().split('T')[0],
	);
	const [sampleCollectionDate, setSampleCollectionDate] = useState(
		specimen?.sample_collection_date
			? specimen.sample_collection_date.split('T')[0]
			: new Date().toISOString().split('T')[0],
	);
	const [finalizationDate, setFinalizationDate] = useState(
		report?.finalization_date
			? report.finalization_date.split('T')[0]
			: new Date().toISOString().split('T')[0],
	);
	const [macroscopyHtml, setMacroscopyHtml] = useState(
		report?.macroscopy_html || '',
	);
	const [microscopyHtml, setMicroscopyHtml] = useState(
		report?.microscopy_html || '',
	);
	const [diagnosisHtml, setDiagnosisHtml] = useState(
		report?.diagnosis_html || '',
	);
	const [clinicalDetailsHtml, setClinicalDetailsHtml] = useState(
		report?.clinical_details_html || '',
	);
	const [commentsNotesHtml, setCommentsNotesHtml] = useState(
		report?.comments_notes_html || '',
	);
	const [protocolsHtml, setProtocolsHtml] = useState(
		report?.protocols_html || '',
	);
	const [legendHtml, setLegendHtml] = useState(report?.legend_html || '');
	const [openTextHtml, setOpenTextHtml] = useState(
		report?.open_text_html || '',
	);
	const [openTextLabel, setOpenTextLabel] = useState(
		report?.open_text_label || 'Texto Libre',
	);
	const [addendumHtml, setAddendumHtml] = useState(
		report?.addendum_html || '',
	);

	const defaultSectionsOrder = [
		{ key: 'clinical_details_html', order: 1, active: true },
		{ key: 'diagnosis_html', order: 2, active: true },
		{ key: 'macroscopy_html', order: 3, active: true },
		{ key: 'microscopy_html', order: 4, active: true },
		{ key: 'comments_notes_html', order: 5, active: true },
		{ key: 'protocols_html', order: 6, active: true },
		{ key: 'legend_html', order: 7, active: true },
		{ key: 'open_text_html', order: 8, active: true },
	];

	const [sectionsOrder, setSectionsOrder] = useState<
		Array<{ key: string; order: number; active: boolean }>
	>(() => {
		if (
			report?.sections_order &&
			Array.isArray(report.sections_order) &&
			report.sections_order.length > 0
		) {
			const loaded = [...report.sections_order].sort(
				(a, b) => a.order - b.order,
			);
			// Merge in any new keys not present in the saved order
			const loadedKeys = new Set(loaded.map((s) => s.key));
			const nextOrder = loaded.length + 1;
			defaultSectionsOrder.forEach((def, i) => {
				if (!loadedKeys.has(def.key)) {
					loaded.push({ ...def, order: nextOrder + i });
				}
			});

			return loaded;
		}

		return defaultSectionsOrder;
	});

	const defaultHeadingsToggles: Record<string, boolean> = {
		clinical_details_html: true,
		diagnosis_html: true,
		macroscopy_html: true,
		microscopy_html: true,
		comments_notes_html: true,
		protocols_html: true,
		legend_html: false,
		open_text_html: true,
		addendum_html: true,
	};

	const [headingsToggles, setHeadingsToggles] = useState<
		Record<string, boolean>
	>(() => {
		if (
			report?.headings_toggles &&
			typeof report.headings_toggles === 'object'
		) {
			return { ...defaultHeadingsToggles, ...report.headings_toggles };
		}

		return defaultHeadingsToggles;
	});

	const openTextLabelRef = useRef(openTextLabel);
	useEffect(() => {
		openTextLabelRef.current = openTextLabel;
	}, [openTextLabel]);

	const handleOpenTextLabelChange = (val: string) => {
		setOpenTextLabel(val);

		if (openTextLabelDoc) {
			const ytext = openTextLabelDoc.getText('content');
			openTextLabelDoc.transact(() => {
				ytext.delete(0, ytext.length);
				ytext.insert(0, val);
			});
		}
	};

	const handleHeadingToggle = (key: string, value: boolean) => {
		if (!isAssigned) {
			return;
		}

		const updated = { ...headingsToggles, [key]: value };
		setHeadingsToggles(updated);

		if (headingsTogglesDoc) {
			const ytext = headingsTogglesDoc.getText('content');
			headingsTogglesDoc.transact(() => {
				ytext.delete(0, ytext.length);
				ytext.insert(0, JSON.stringify(updated));
			});
		} else {
			// Persist immediately via the save endpoint
			const csrfToken =
				(
					document.querySelector(
						'meta[name="csrf-token"]',
					) as HTMLMetaElement
				)?.content ?? '';

			fetch(`/specimens/${specimen.sequence_code}/report-editor/save`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRF-TOKEN': csrfToken,
					Accept: 'application/json',
				},
				body: JSON.stringify({ headings_toggles: updated }),
			}).catch((err) => {
				console.error('Failed to persist headings_toggles:', err);
			});
		}
	};

	const handleDragEnd = (result: DropResult) => {
		if (!result.destination) {
			return;
		}

		const items = Array.from(sectionsOrder);
		const [reorderedItem] = items.splice(result.source.index, 1);
		items.splice(result.destination.index, 0, reorderedItem);

		const updatedItems = items.map((item, idx) => ({
			...item,
			order: idx + 1,
		}));

		setSectionsOrder(updatedItems);

		if (sectionsOrderDoc) {
			const ytext = sectionsOrderDoc.getText('content');
			sectionsOrderDoc.transact(() => {
				ytext.delete(0, ytext.length);
				ytext.insert(0, JSON.stringify(updatedItems));
			});
		}
	};
	const [macroscopyUsers, setMacroscopyUsers] = useState<Collaborator[]>([]);
	const [microscopyUsers, setMicroscopyUsers] = useState<Collaborator[]>([]);
	const [diagnosisUsers, setDiagnosisUsers] = useState<Collaborator[]>([]);
	const [clinicalDetailsUsers, setClinicalDetailsUsers] = useState<
		Collaborator[]
	>([]);
	const [commentsNotesUsers, setCommentsNotesUsers] = useState<
		Collaborator[]
	>([]);
	const [protocolsUsers, setProtocolsUsers] = useState<Collaborator[]>([]);
	const [legendUsers, setLegendUsers] = useState<Collaborator[]>([]);
	const [openTextUsers, setOpenTextUsers] = useState<Collaborator[]>([]);
	const [addendumUsers, setAddendumUsers] = useState<Collaborator[]>([]);

	const isMicroscopyVisible = [
		'microscopic_review',
		'finalized',
		'delivered',
	].includes(specimen.status);
	const isFinished = ['finalized', 'delivered'].includes(specimen.status);
	const [sessionEditingEnabled, setSessionEditingEnabled] = useState(false);

	const [isManualSaving, setIsManualSaving] = useState(false);
	const [isSavedRecently, setIsSavedRecently] = useState(false);
	const [isAutosaving, setIsAutosaving] = useState(false);
	const [lastSaved, setLastSaved] = useState<Date | null>(new Date());
	const [timeString, setTimeString] = useState('Justo ahora');

	const hasMounted = useRef(false);
	const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const [pages, setPages] = useState<MeasuredBlock[][]>([]);
	const useIsomorphicLayoutEffect =
		typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

	const [dialogZoomScale, setDialogZoomScale] = useState(0.75);
	const [showCompleteMicroscopyDialog, setShowCompleteMicroscopyDialog] =
		useState(false);
	const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
	const [tempPdfUrl, setTempPdfUrl] = useState<string | null>(null);
	const [tempPdfTotalPages, setTempPdfTotalPages] = useState(1);
	const [showSignatureWarning, setShowSignatureWarning] = useState(false);
	const [unsignedPathologists, setUnsignedPathologists] = useState<
		Array<{ id: number; name: string }>
	>([]);

	const calculateLayout = () => {
		const letterToIndex = (letter: string): number => {
			let index = 0;
			const len = letter.length;

			for (let i = 0; i < len; i++) {
				index = index * 26 + (letter.charCodeAt(i) - 64);
			}

			return index;
		};

		const indexToLetter = (index: number): string => {
			let letter = '';

			while (index > 0) {
				const temp = (index - 1) % 26;
				letter = String.fromCharCode(65 + temp) + letter;
				index = Math.floor((index - temp - 1) / 26);
			}

			return letter;
		};

		const areTwoCodesConsecutive = (
			code1: string,
			code2: string,
		): boolean => {
			const len1 = code1.length;
			const len2 = code2.length;

			if (len1 !== len2 || len1 === 0) {
				return false;
			}

			if (len1 > 1) {
				const pref1 = code1.substring(0, len1 - 1);
				const pref2 = code2.substring(0, len2 - 1);

				if (pref1 !== pref2) {
					return false;
				}
			}

			const lastChar1 = code1.charCodeAt(len1 - 1);
			const lastChar2 = code2.charCodeAt(len2 - 1);

			return lastChar2 === lastChar1 + 1;
		};

		const pageContentHeight = 205.0; // mm
		const lineHeight = 3.53; // mm (8pt * 1.25)
		const maxCharsPerLine = 155;
		const pathologistsCount = specimen.users?.length || 0;
		const rowsCount = Math.ceil(pathologistsCount / 2);
		const signatureHeight = rowsCount * 25.0; // 25mm per row

		const patientCardHeight = estimatePatientCardHeight(specimen);

		const blocks: any[] = [];

		// Pre-calculate cuttings-summary block if we have cuttings
		let cuttingsBlock: MeasuredBlock | null = null;
		let newCuttingsBlock: MeasuredBlock | null = null;
		const hasPushedCuttings = false;
		const cuttings = specimen.cuttings || [];

		// Split cuttings into regular (non-new) and new
		const regularCuttings = cuttings.filter((c: any) => !c.is_new_cut);
		const newCuttings = cuttings.filter((c: any) => c.is_new_cut);

		const buildCuttingsSummaryBlock = (
			cuttingsList: any[],
			blockType: 'cuttings-summary' | 'new-cuttings-summary',
			blockId: string,
			prefix: string,
		): MeasuredBlock | null => {
			if (cuttingsList.length === 0) {
				return null;
			}

			// Sort alphabetically (by length first, then natural comparison)
			cuttingsList.sort((a: any, b: any) => {
				const codeA = a.code?.code || '';
				const codeB = b.code?.code || '';
				const lenA = codeA.length;
				const lenB = codeB.length;

				if (lenA !== lenB) {
					return lenA - lenB;
				}

				return codeA.localeCompare(codeB, undefined, {
					numeric: true,
					sensitivity: 'base',
				});
			});

			interface TempRun {
				startIndex: number;
				endIndex: number;
				description: string;
				prefix: string;
				items: any[];
			}

			const tempRuns: TempRun[] = [];
			cuttingsList.forEach((cutting: any, idx: number) => {
				const desc = cutting.description || '';
				const prefix = cutting.prefix?.prefix || '';

				if (
					tempRuns.length > 0 &&
					tempRuns[tempRuns.length - 1].description === desc &&
					tempRuns[tempRuns.length - 1].prefix === prefix
				) {
					const lastRun = tempRuns[tempRuns.length - 1];
					lastRun.endIndex = idx;
					lastRun.items.push(cutting);
				} else {
					tempRuns.push({
						startIndex: idx,
						endIndex: idx,
						description: desc,
						prefix: prefix,
						items: [cutting],
					});
				}
			});

			const groups: {
				startIndex: number;
				endIndex: number;
				description: string;
				prefix: string;
				totalCuts: number;
				count: number;
			}[] = [];

			tempRuns.forEach((run) => {
				const subGroups: any[][] = [];
				let currentSubGroup: any[] = [];

				run.items.forEach((item, idx) => {
					const realIdx = run.startIndex + idx;
					const code = item.code?.code || indexToLetter(realIdx + 1);

					if (currentSubGroup.length === 0) {
						currentSubGroup.push(item);
					} else {
						const prevItem =
							currentSubGroup[currentSubGroup.length - 1];
						const prevRealIdx = run.startIndex + idx - 1;
						const prevCode =
							prevItem.code?.code ||
							indexToLetter(prevRealIdx + 1);

						if (areTwoCodesConsecutive(prevCode, code)) {
							currentSubGroup.push(item);
						} else {
							subGroups.push(currentSubGroup);
							currentSubGroup = [item];
						}
					}
				});

				if (currentSubGroup.length > 0) {
					subGroups.push(currentSubGroup);
				}

				let startIdxInCuttingsList = run.startIndex;
				subGroups.forEach((sub) => {
					const subCount = sub.length;
					let totalCuts = 0;
					sub.forEach((item) => {
						totalCuts += item.number_of_cuttings ?? 0;
					});

					const endIdxInCuttingsList =
						startIdxInCuttingsList + subCount - 1;

					groups.push({
						startIndex: startIdxInCuttingsList,
						endIndex: endIdxInCuttingsList,
						description: run.description,
						prefix: run.prefix,
						totalCuts,
						count: subCount,
					});

					startIdxInCuttingsList += subCount;
				});
			});

			const cutsList: string[] = [];
			groups.forEach((g) => {
				const startCutting = cuttingsList[g.startIndex];
				const endCutting = cuttingsList[g.endIndex];
				const startLetter =
					startCutting?.code?.code || indexToLetter(g.startIndex + 1);
				const endLetter =
					endCutting?.code?.code || indexToLetter(g.endIndex + 1);
				const label =
					g.startIndex === g.endIndex
						? startLetter
						: `${startLetter}-${endLetter}`;

				const formattedDesc = g.description ? `${g.description} ` : '';
				const cutsVal =
					g.totalCuts === 0 && g.prefix
						? g.prefix
						: g.prefix
							? `${g.prefix} ${g.totalCuts}`
							: g.totalCuts;
				cutsList.push(
					`${label}) ${formattedDesc}${cutsVal}x${g.count}`,
				);
			});

			const concatenatedCuts = `${prefix} ${cutsList.join('; ')}.`;
			const charsCount = concatenatedCuts.length;
			const lines = Math.max(1, Math.ceil(charsCount / maxCharsPerLine));
			const cutsHeight = lines * lineHeight + 2.0;

			return {
				type: blockType,
				height: cutsHeight,
				text: concatenatedCuts,
				id: blockId,
			};
		};

		if (cuttings.length > 0) {
			cuttingsBlock = buildCuttingsSummaryBlock(
				regularCuttings,
				'cuttings-summary',
				'cuttings-summary',
				'Cortes:',
			);
			newCuttingsBlock = buildCuttingsSummaryBlock(
				newCuttings,
				'new-cuttings-summary',
				'new-cuttings-summary',
				'Nuevos Cortes:',
			);
		}

		// 1. Patient card block
		blocks.push({
			type: 'patient-card',
			height: patientCardHeight,
			id: 'patient-card',
		});

		// Loop through sectionsOrder to build blocks in the correct order
		sectionsOrder.forEach((section) => {
			const active = section.active !== false;

			if (!active) {
				return;
			}

			const showHeading = headingsToggles[section.key] ?? true;

			if (section.key === 'clinical_details_html') {
				const clinHtml = clinicalDetailsHtml || '';

				if (!isEmptyHtml(clinHtml)) {
					if (showHeading) {
						blocks.push({
							type: 'section-header',
							title: 'Datos Clínicos',
							height: 7.94,
							id: 'clin-header',
						});
					}

					const clinBlocks = parseHtmlToBlocks(clinHtml);
					clinBlocks.forEach((bHtml, idx) => {
						const b = classifyBlock(bHtml, maxCharsPerLine);
						b.id = `clin-block-${idx}`;
						blocks.push(b);
					});
				}
			} else if (section.key === 'diagnosis_html') {
				const diagHtml = diagnosisHtml || specimen.diagnosis || '';

				if (!isEmptyHtml(diagHtml)) {
					if (showHeading) {
						blocks.push({
							type: 'section-header',
							title: 'Diagnóstico',
							height: 7.94, // 2 lines * 3.97
							id: 'diag-header',
						});
					}

					const diagBlocks = parseHtmlToBlocks(diagHtml);
					diagBlocks.forEach((bHtml, idx) => {
						const b = classifyBlock(bHtml, maxCharsPerLine);
						b.id = `diag-block-${idx}`;
						blocks.push(b);
					});
				}
			} else if (section.key === 'macroscopy_html') {
				const macroHtml = macroscopyHtml || '';

				if (!isEmptyHtml(macroHtml)) {
					if (showHeading) {
						blocks.push({
							type: 'section-header',
							title: 'Descripción Macroscópica',
							height: 7.94,
							id: 'macro-header',
						});
					}

					const macroBlocks = parseHtmlToBlocks(macroHtml);
					macroBlocks.forEach((bHtml, idx) => {
						const b = classifyBlock(bHtml, maxCharsPerLine);
						b.id = `macro-block-${idx}`;
						blocks.push(b);
					});
				}

				/*
				// Cuttings summary block always goes after the macroscopy editor/blocks
				if (!hasPushedCuttings) {
					if (cuttingsBlock) {
						blocks.push(cuttingsBlock);
					}

					if (newCuttingsBlock) {
						blocks.push(newCuttingsBlock);
					}

					hasPushedCuttings = true;
				}
				*/
			} else if (section.key === 'microscopy_html') {
				if (isMicroscopyVisible) {
					const microHtml = microscopyHtml || '';

					if (!isEmptyHtml(microHtml)) {
						if (showHeading) {
							blocks.push({
								type: 'section-header',
								title: 'Descripción Microscópica',
								height: 7.94,
								id: 'micro-header',
							});
						}

						const microBlocks = parseHtmlToBlocks(microHtml);
						microBlocks.forEach((bHtml, idx) => {
							const b = classifyBlock(bHtml, maxCharsPerLine);
							b.id = `micro-block-${idx}`;
							blocks.push(b);
						});
					}
				}
			} else if (section.key === 'comments_notes_html') {
				const commHtml = commentsNotesHtml || '';

				if (!isEmptyHtml(commHtml)) {
					if (showHeading) {
						blocks.push({
							type: 'section-header',
							title: 'Comentarios y Notas',
							height: 7.94,
							id: 'comm-header',
						});
					}

					const commBlocks = parseHtmlToBlocks(commHtml);
					commBlocks.forEach((bHtml, idx) => {
						const b = classifyBlock(bHtml, maxCharsPerLine);
						b.id = `comm-block-${idx}`;
						blocks.push(b);
					});
				}
			} else if (section.key === 'protocols_html') {
				const protHtml = protocolsHtml || '';

				if (!isEmptyHtml(protHtml)) {
					if (showHeading) {
						blocks.push({
							type: 'section-header',
							title: 'Protocolos',
							height: 7.94,
							id: 'prot-header',
						});
					}

					const protBlocks = parseHtmlToBlocks(protHtml);
					protBlocks.forEach((bHtml, idx) => {
						const b = classifyBlock(bHtml, maxCharsPerLine);
						b.id = `prot-block-${idx}`;
						blocks.push(b);
					});
				}
			} else if (section.key === 'legend_html') {
				const legHtml = legendHtml || '';

				if (!isEmptyHtml(legHtml)) {
					if (showHeading) {
						blocks.push({
							type: 'section-header',
							title: 'Leyenda',
							height: 7.94,
							id: 'leg-header',
						});
					}

					const legBlocks = parseHtmlToBlocks(legHtml);
					legBlocks.forEach((bHtml, idx) => {
						const b = classifyBlock(bHtml, maxCharsPerLine);
						b.id = `leg-block-${idx}`;
						blocks.push(b);
					});
				}
			} else if (section.key === 'open_text_html') {
				const openHtml = openTextHtml || '';

				if (!isEmptyHtml(openHtml)) {
					if (showHeading) {
						blocks.push({
							type: 'section-header',
							title: openTextLabel || 'Texto Libre',
							height: 7.94,
							id: 'open-text-header',
						});
					}

					const openBlocks = parseHtmlToBlocks(openHtml);
					openBlocks.forEach((bHtml, idx) => {
						const b = classifyBlock(bHtml, maxCharsPerLine);
						b.id = `open-text-block-${idx}`;
						blocks.push(b);
					});
				}
			}
		});

		/*
		// Fallback: If for some reason cuttings summary wasn't pushed (e.g. macroscopy section was inactive or missing)
		if (!hasPushedCuttings) {
			if (cuttingsBlock) {
				blocks.push(cuttingsBlock);
			}

			if (newCuttingsBlock) {
				blocks.push(newCuttingsBlock);
			}
		}
		*/

		const paginateBlocksJS = (blocksList: any[]): MeasuredBlock[][] => {
			const pagesList: MeasuredBlock[][] = [];
			let currentPageList: MeasuredBlock[] = [];
			let currentHeightList = 0.0;

			for (let bIndex = 0; bIndex < blocksList.length; bIndex++) {
				const block = blocksList[bIndex];
				let maxHeightForPage = pageContentHeight;

				if (block.type === 'patient-card') {
					currentPageList.push(block);
					currentHeightList += block.height;
					continue;
				}

				if (block.type === 'section-header') {
					if (currentHeightList + block.height > maxHeightForPage) {
						pagesList.push(currentPageList);
						currentPageList = [];
						currentHeightList = 0.0;
						maxHeightForPage = pageContentHeight;
					}

					currentPageList.push(block);
					currentHeightList += block.height;
					continue;
				}

				if (block.type === 'page-break') {
					if (currentPageList.length > 0) {
						pagesList.push(currentPageList);
						currentPageList = [];
						currentHeightList = 0.0;
					}

					continue;
				}

				if (block.type === 'heading') {
					const headingCost = block.height;
					let nextBlockStartsNewPage = false;

					// Keep with Next constraint
					if (bIndex + 1 < blocksList.length) {
						const nextBlock = blocksList[bIndex + 1];
						let minNextHeight = 2.0 * lineHeight;

						if (nextBlock.type === 'image') {
							minNextHeight = nextBlock.height;
						} else if (nextBlock.type === 'heading') {
							minNextHeight = nextBlock.height;
						}

						if (
							currentHeightList + headingCost + minNextHeight >
							maxHeightForPage
						) {
							nextBlockStartsNewPage = true;
						}
					}

					if (
						currentHeightList + headingCost > maxHeightForPage ||
						nextBlockStartsNewPage
					) {
						if (currentPageList.length > 0) {
							pagesList.push(currentPageList);
							currentPageList = [];
							currentHeightList = 0.0;
							maxHeightForPage = pageContentHeight;
						}
					}

					currentPageList.push(block);
					currentHeightList += headingCost;
					continue;
				}

				if (block.type === 'image-grid') {
					const columns = block.columns;
					const images = block.images;

					if (!images || images.length === 0) {
						currentPageList.push({
							id: `${block.id}-fallback`,
							type: 'html',
							html: block.html,
							height: 5.3,
						});
						currentHeightList += 5.3;
						continue;
					}

					const width = block.width || null;
					const usableWidth = width ? 185.9 * (width / 704) : 185.9;
					const gap = 1.5; // mm
					const slicedImages = images.slice(0, 4);
					const rowsRemaining: string[][] = [slicedImages];

					const rowHeights = rowsRemaining.map((rowImages) => {
						let aspectSum = 0.0;
						rowImages.forEach((imgTag: string) => {
							const aspect = getImageAspectRatio(imgTag);

							if (aspect > 0.0) {
								aspectSum += 1.0 / aspect;
							} else {
								aspectSum += 1.0;
							}
						});

						if (aspectSum <= 0) {
							aspectSum = 1.0;
						}

						const N = rowImages.length;
						const maxRowHeight =
							N === 1
								? Math.min(120.0, usableWidth)
								: usableWidth * 1.5;
						const calculatedHeight =
							(usableWidth - (N - 1) * gap) / aspectSum;

						return Math.min(calculatedHeight, maxRowHeight);
					});

					const rowCaptionHeights = rowsRemaining.map((rowImages) => {
						let maxCaptionHeight = 0.0;
						const N = rowImages.length;
						const colWidthMm = (usableWidth - (N - 1) * gap) / N;
						const maxCharsForCaption = Math.max(
							12,
							Math.floor(colWidthMm / 1.5),
						);

						rowImages.forEach((imgTag: string) => {
							const captionMatch =
								imgTag.match(
									/data-caption=["\']([^"\']*)["\']/i,
								) || imgTag.match(/alt=["\']([^"\']*)["\']/i);
							const caption = captionMatch ? captionMatch[1] : '';
							if (caption) {
								const captionLines = Math.max(
									1,
									Math.ceil(
										caption.length / maxCharsForCaption,
									),
								);
								const captionHeight = captionLines * 3.6 + 1.06;
								if (captionHeight > maxCaptionHeight) {
									maxCaptionHeight = captionHeight;
								}
							}
						});

						return maxCaptionHeight;
					});

					let rowIndex = 0;

					while (rowIndex < rowsRemaining.length) {
						const remaining = maxHeightForPage - currentHeightList;
						const minGridHeight =
							rowHeights[rowIndex] +
							rowCaptionHeights[rowIndex] +
							2.0;

						if (
							remaining < minGridHeight &&
							currentPageList.length > 0
						) {
							pagesList.push(currentPageList);
							currentPageList = [];
							currentHeightList = 0.0;
							continue;
						}

						let r = 0;

						for (
							let tempR = 1;
							tempR <= rowsRemaining.length - rowIndex;
							tempR++
						) {
							let cost = 2.0;

							for (let i = 0; i < tempR; i++) {
								cost +=
									rowHeights[rowIndex + i] +
									rowCaptionHeights[rowIndex + i];

								if (i > 0) {
									cost += 1.5;
								}
							}

							if (cost <= remaining) {
								r = tempR;
							} else {
								break;
							}
						}

						if (r === 0) {
							if (currentPageList.length > 0) {
								pagesList.push(currentPageList);
								currentPageList = [];
								currentHeightList = 0.0;
								continue;
							} else {
								r = 1;
							}
						}

						const sliceImages: string[] = [];

						for (let i = 0; i < r; i++) {
							const rowIdx = rowIndex + i;
							const rowImages = rowsRemaining[rowIdx];
							const H_j = rowHeights[rowIdx];

							rowImages.forEach((imgTag) => {
								const aspect = getImageAspectRatio(imgTag);
								const widthMm =
									aspect > 0.0 ? H_j / aspect : H_j;
								const styleRule = `height: ${H_j}mm; width: 100%; object-fit: cover; border-radius: 1.06mm;`;

								let processedTag = imgTag;
								const styleMatch = processedTag.match(
									/style=["\']([^"\']*)["\']/i,
								);

								if (styleMatch) {
									processedTag = processedTag.replace(
										/style=["\']([^"\']*)["\']/i,
										`style="${styleRule}"`,
									);
								} else {
									processedTag = processedTag.replace(
										'<img',
										`<img style="${styleRule}"`,
									);
								}

								let caption = '';
								const capMatch =
									imgTag.match(/data-caption=["']([^"']*)["']/i) ||
									imgTag.match(/alt=["']([^"']*)["']/i);
								if (capMatch) {
									caption = capMatch[1];
								}

								const captionHtml = caption
									? `<div class="gallery-image-caption" style="text-align: center; margin-top: 1.06mm; font-style: italic; font-size: 8.5pt; color: #64748b; line-height: 1.2; width: 100%; word-break: break-word;">${caption}</div>`
									: '';

								const wrappedImg = `<div class="grid-image-container" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: ${widthMm}mm; max-width: 100%;">${processedTag}${captionHtml}</div>`;
								sliceImages.push(wrappedImg);
							});
						}

						const align = block.alignment || 'center';
						const isLeft = align === 'left';
						const isRight = align === 'right';
						const marginLeft = isLeft ? '0' : 'auto';
						const marginRight = isRight ? 'auto' : 'auto';
						const styles = [
							'display: flex',
							'flex-wrap: nowrap',
							`gap: ${gap}mm`,
							`margin-left: ${marginLeft}`,
							`margin-right: ${marginRight}`,
						];

						if (width) {
							styles.push(`width: ${width}px`);
						}

						const styleStr = styles.join('; ') + ';';

						const sliceHtml = `<div data-type="image-grid" class="align-${align}" data-columns="${columns}" data-align="${align}"${width ? ` width="${width}"` : ''} style="${styleStr}">${sliceImages.join('')}</div>`;

						let cost = 2.0;

						for (let i = 0; i < r; i++) {
							cost +=
								rowHeights[rowIndex + i] +
								rowCaptionHeights[rowIndex + i];

							if (i > 0) {
								cost += 1.5;
							}
						}

						currentPageList.push({
							id: `${block.id}-row-${rowIndex}-slice-${r}`,
							type: 'html',
							html: sliceHtml,
							height: cost,
						});

						currentHeightList += cost;
						rowIndex += r;
					}

					continue;
				}

				if (block.type === 'image') {
					if (currentHeightList + block.height > maxHeightForPage) {
						pagesList.push(currentPageList);
						currentPageList = [];
						currentHeightList = 0.0;
						maxHeightForPage = pageContentHeight;
					}

					currentPageList.push(block);
					currentHeightList += block.height;
					continue;
				}

				if (
					block.type === 'cuttings-summary' ||
					block.type === 'new-cuttings-summary'
				) {
					if (currentHeightList + block.height > maxHeightForPage) {
						pagesList.push(currentPageList);
						currentPageList = [];
						currentHeightList = 0.0;
						maxHeightForPage = pageContentHeight;
					}

					currentPageList.push(block);
					currentHeightList += block.height;
					continue;
				}

				if (block.type === 'paragraph') {
					const paraInnerHtml = getInnerHtml(block.html, block.tag);
					const lines = splitHtmlIntoLines(
						paraInnerHtml,
						maxCharsPerLine,
					);

					let i = 0;

					while (i < lines.length) {
						const fontLineHeight = getBlockLineHeight(
							block,
							lineHeight,
						);
						const remaining = maxHeightForPage - currentHeightList;

						if (remaining <= 0.5 * fontLineHeight) {
							pagesList.push(currentPageList);
							currentPageList = [];
							currentHeightList = 0.0;
							continue;
						}

						const linesToFit = Math.min(
							Math.floor(remaining / fontLineHeight),
							lines.length - i,
						);

						if (linesToFit <= 0) {
							pagesList.push(currentPageList);
							currentPageList = [];
							currentHeightList = 0.0;
							continue;
						}

						const slice = lines.slice(i, i + linesToFit);
						const isLastSlice = i + linesToFit >= lines.length;
						const classAttr = block.class || 'section-content';
						const { style: originalStyle, extraAttrs } =
							getRootElementAttributes(block.html);
						let mergedStyle = originalStyle;
						if (!isLastSlice) {
							mergedStyle = mergedStyle
								? `${mergedStyle.trim().endsWith(';') ? mergedStyle : mergedStyle + ';'} margin-bottom: 0px;`
								: 'margin-bottom: 0px;';
						}
						const styleAttrStr = mergedStyle
							? ` style="${mergedStyle}"`
							: '';

						const sliceHtml = `<${block.tag} class="${classAttr}"${styleAttrStr}${extraAttrs}>${slice.join('')}</${block.tag}>`;
						const blockCost =
							linesToFit * fontLineHeight +
							(isLastSlice ? 0.5 * fontLineHeight : 0.0);

						currentPageList.push({
							id: `${block.id}-slice-${i}`,
							type: 'html',
							html: sliceHtml,
							height: blockCost,
						});

						currentHeightList += blockCost;
						i += linesToFit;
					}

					continue;
				}

				if (block.type === 'list') {
					const listData = paginateList(block.html);
					const listItems = listData.items;
					const tag = listData.tag;

					let i = 0;
					let olStartIndex = 1;

					while (i < listItems.length) {
						const fontLineHeight = lineHeight;
						const remaining = maxHeightForPage - currentHeightList;

						if (remaining <= 1.0 * fontLineHeight) {
							pagesList.push(currentPageList);
							currentPageList = [];
							currentHeightList = 0.0;
							continue;
						}

						const itemHtml = listItems[i];
						const itemPlainText = itemHtml
							.replace(/<[^>]+>/g, '')
							.trim();
						const itemTextLines = Math.max(
							1,
							Math.ceil(
								itemPlainText.length / (maxCharsPerLine - 5),
							),
						);
						const itemHeight = itemTextLines * fontLineHeight;

						if (itemHeight > remaining) {
							if (currentHeightList === 0.0) {
								const startAttr =
									tag === 'ol' && olStartIndex > 1
										? ` start="${olStartIndex}"`
										: '';
								const listStyleAttr = listData.listStyleType
									? ` data-list-style-type="${listData.listStyleType}"`
									: '';
								const styleAttr = listData.styleAttr
									? ` style="${listData.styleAttr}"`
									: '';
								currentPageList.push({
									id: `${block.id}-item-${i}`,
									type: 'html',
									html: `<${tag} class="section-content"${startAttr}${listStyleAttr}${styleAttr}>${itemHtml}</${tag}>`,
									height: itemHeight + 0.5 * fontLineHeight,
								});
								currentHeightList +=
									itemHeight + 0.5 * fontLineHeight;
								i++;
								olStartIndex++;
							} else {
								pagesList.push(currentPageList);
								currentPageList = [];
								currentHeightList = 0.0;
							}
						} else {
							const itemsToFit: string[] = [];
							let accumulatedHeight = 0.0;

							while (i < listItems.length) {
								const nextItemHtml = listItems[i];
								const nextItemPlainText = nextItemHtml
									.replace(/<[^>]+>/g, '')
									.trim();
								const nextItemLines = Math.max(
									1,
									Math.ceil(
										nextItemPlainText.length /
										(maxCharsPerLine - 5),
									),
								);
								const nextItemHeight =
									nextItemLines * fontLineHeight;

								const isLastOfAll = i === listItems.length - 1;
								const spacingOverhead = isLastOfAll
									? 0.5 * fontLineHeight
									: 0.0;

								if (
									accumulatedHeight +
									nextItemHeight +
									spacingOverhead >
									remaining
								) {
									break;
								}

								itemsToFit.push(nextItemHtml);
								accumulatedHeight += nextItemHeight;
								i++;
							}

							if (itemsToFit.length > 0) {
								const isLastOfAll = i >= listItems.length;
								const cost =
									accumulatedHeight +
									(isLastOfAll ? 0.5 * fontLineHeight : 0.0);

								const startAttr =
									tag === 'ol' && olStartIndex > 1
										? ` start="${olStartIndex}"`
										: '';
								const listStyleAttr = listData.listStyleType
									? ` data-list-style-type="${listData.listStyleType}"`
									: '';
								const styleAttr = listData.styleAttr
									? ` style="${listData.styleAttr}"`
									: '';
								currentPageList.push({
									id: `${block.id}-items-${olStartIndex}`,
									type: 'html',
									html: `<${tag} class="section-content"${startAttr}${listStyleAttr}${styleAttr}>${itemsToFit.join(
										'',
									)}</${tag}>`,
									height: cost,
								});
								currentHeightList += cost;
								olStartIndex += itemsToFit.length;
							} else {
								pagesList.push(currentPageList);
								currentPageList = [];
								currentHeightList = 0.0;
							}
						}
					}

					continue;
				}

				if (block.type === 'table') {
					const tableData = paginateTable(block.html);
					const headerHtml = tableData.headerHtml;
					const rows = tableData.rows;
					const colCount = tableData.colCount;

					let i = 0;

					while (i < rows.length) {
						const fontLineHeight = getBlockLineHeight(
							block,
							lineHeight,
						);
						const remaining = maxHeightForPage - currentHeightList;

						if (remaining <= 5 * fontLineHeight) {
							pagesList.push(currentPageList);
							currentPageList = [];
							currentHeightList = 0.0;
							continue;
						}

						const headerHeight = headerHtml
							? 2.0 * fontLineHeight
							: 0.0;
						const remainingForRows = remaining - headerHeight;

						const rowsToFit: string[] = [];
						let accumulatedHeight = 0.0;

						while (i < rows.length) {
							const row = rows[i];
							const charsPerCell = Math.floor(
								maxCharsPerLine / colCount,
							);
							const rowLines =
								Math.max(
									1,
									Math.ceil(
										row.maxCellTextLen / charsPerCell,
									),
								) + 1;
							const rowHeight = rowLines * fontLineHeight;

							const isLastRow = i === rows.length - 1;
							const tableSpacing = isLastRow
								? 1.0 * fontLineHeight
								: 0.0;

							if (
								accumulatedHeight + rowHeight + tableSpacing >
								remainingForRows
							) {
								if (
									rowsToFit.length === 0 &&
									currentHeightList === 0.0
								) {
									rowsToFit.push(row.html);
									accumulatedHeight += rowHeight;
									i++;
								}

								break;
							}

							rowsToFit.push(row.html);
							accumulatedHeight += rowHeight;
							i++;
						}

						if (rowsToFit.length > 0) {
							const isLastRow = i >= rows.length;
							const cost =
								accumulatedHeight +
								headerHeight +
								(isLastRow ? 1.0 * fontLineHeight : 0.0);

							const classMatch = block.html.match(
								/class=["\']([^"\']+)["\']/i,
							);
							const tableClass = classMatch
								? classMatch[1]
								: 'section-content';

							const styleMatch = block.html.match(
								/style=["\']([^"\']+)["\']/i,
							);
							const tableStyle = styleMatch
								? styleMatch[1]
								: '';

							const styleAttr = tableStyle
								? ` style="${tableStyle}"`
								: '';

							let tableWrapperHtml = `<table class="${tableClass}"${styleAttr}>`;

							if (headerHtml) {
								tableWrapperHtml += `<thead>${headerHtml}</thead>`;
							}

							tableWrapperHtml += `<tbody>${rowsToFit.join(
								'',
							)}</tbody></table>`;

							currentPageList.push({
								id: `${block.id}-table-slice-${i}`,
								type: 'html',
								html: tableWrapperHtml,
								height: cost,
							});
							currentHeightList += cost;
						} else {
							pagesList.push(currentPageList);
							currentPageList = [];
							currentHeightList = 0.0;
						}
					}

					continue;
				}
			}

			if (currentPageList.length > 0) {
				pagesList.push(currentPageList);
			}

			return pagesList;
		};

		const computedPages = paginateBlocksJS(blocks);

		if (computedPages.length === 0) {
			computedPages.push([
				{
					id: 'patient-card',
					type: 'patient-card',
					height: patientCardHeight,
				},
			]);
		}

		const lastPageIndex = computedPages.length - 1;
		let lastPageHeight = 0.0;
		computedPages[lastPageIndex].forEach((b) => {
			lastPageHeight += b.height;
		});

		const maxHeightForLastPage = pageContentHeight;

		if (signatureHeight > 0) {
			if (lastPageHeight + signatureHeight > maxHeightForLastPage) {
				computedPages.push([
					{
						id: 'signature',
						type: 'signature',
						height: signatureHeight,
					},
				]);
			} else {
				computedPages[lastPageIndex].push({
					id: 'signature',
					type: 'signature',
					height: signatureHeight,
				});
			}
		}

		// Addendum pagination
		const addendumHtmlValue = addendumHtml || '';

		if (!isEmptyHtml(addendumHtmlValue)) {
			const addendumBlocks: any[] = [];
			const showAddendumHeading =
				headingsToggles['addendum_html'] ?? true;

			if (showAddendumHeading) {
				addendumBlocks.push({
					type: 'section-header',
					title: 'Addendum',
					height: 7.94,
					id: 'addendum-header',
				});
			}

			const rawAddendumBlocks = parseHtmlToBlocks(addendumHtmlValue);
			rawAddendumBlocks.forEach((bHtml, idx) => {
				const b = classifyBlock(bHtml, maxCharsPerLine);
				b.id = `addendum-block-${idx}`;
				addendumBlocks.push(b);
			});

			const addendumPages = paginateBlocksJS(addendumBlocks);
			addendumPages.forEach((aPage) => {
				computedPages.push(aPage);
			});
		}

		setPages(computedPages);
	};

	useIsomorphicLayoutEffect(() => {
		calculateLayout();
	}, [
		diagnosisHtml,
		macroscopyHtml,
		microscopyHtml,
		clinicalDetailsHtml,
		commentsNotesHtml,
		protocolsHtml,
		legendHtml,
		openTextHtml,
		openTextLabel,
		addendumHtml,
		reportDate,
		sampleCollectionDate,
		finalizationDate,
		specimen,
		isMicroscopyVisible,
		isLoading,
		sectionsOrder,
		headingsToggles,
	]);

	const calculateLayoutRef = useRef(calculateLayout);
	calculateLayoutRef.current = calculateLayout;

	useEffect(() => {
		const handleImageLoad = (e: Event) => {
			const target = e.target as HTMLElement;

			if (target && target.tagName === 'IMG') {
				calculateLayoutRef.current();
			}
		};

		window.addEventListener('load', handleImageLoad, true);

		return () => {
			window.removeEventListener('load', handleImageLoad, true);
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
		}, 1000);

		return () => {
			if (autosaveTimeoutRef.current) {
				clearTimeout(autosaveTimeoutRef.current);
			}
		};
	}, [
		macroscopyHtml,
		microscopyHtml,
		diagnosisHtml,
		clinicalDetailsHtml,
		commentsNotesHtml,
		protocolsHtml,
		legendHtml,
		openTextHtml,
		openTextLabel,
		addendumHtml,
		reportDate,
		sampleCollectionDate,
		finalizationDate,
	]);

	const notifyCollaborationServer = async () => {
		try {
			const serverUrl = COLLABORATION_SERVER_URL;
			await fetch(`${serverUrl}/api/refresh-insumos`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					reportId: report?.id,
				}),
			});
			console.log('Collaboration server notified of data update');
		} catch (error) {
			console.error('Failed to notify collaboration server:', error);
		}
	};

	// Format relative time passed since last saved
	const getRelativeTimeString = (date: Date | null) => {
		if (!date) {
			return 'Sin guardar';
		}

		const diffMs = Date.now() - date.getTime();
		const diffSec = Math.floor(diffMs / 1000);

		if (diffSec < 5) {
			return 'Justo ahora';
		}

		if (diffSec < 60) {
			return 'Hace unos segundos';
		}

		const diffMin = Math.floor(diffSec / 60);

		if (diffMin === 1) {
			return 'Hace 1 minuto';
		}

		return `Hace ${diffMin} minutos`;
	};

	// Recalculate relative time every 10 seconds
	useEffect(() => {
		if (!lastSaved) {
			return;
		}

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
	const [dateProvider, setDateProvider] = useState<HocuspocusProvider | null>(
		null,
	);
	const [sampleCollectionDateDoc, setSampleCollectionDateDoc] =
		useState<Y.Doc | null>(null);
	const [sampleCollectionDateProvider, setSampleCollectionDateProvider] =
		useState<HocuspocusProvider | null>(null);
	const [finalizationDateDoc, setFinalizationDateDoc] =
		useState<Y.Doc | null>(null);
	const [finalizationDateProvider, setFinalizationDateProvider] =
		useState<HocuspocusProvider | null>(null);
	const [macroscopyDoc, setMacroscopyDoc] = useState<Y.Doc | null>(null);
	const [macroscopyProvider, setMacroscopyProvider] =
		useState<HocuspocusProvider | null>(null);
	const [microscopyDoc, setMicroscopyDoc] = useState<Y.Doc | null>(null);
	const [microscopyProvider, setMicroscopyProvider] =
		useState<HocuspocusProvider | null>(null);
	const [diagnosisDoc, setDiagnosisDoc] = useState<Y.Doc | null>(null);
	const [diagnosisProvider, setDiagnosisProvider] =
		useState<HocuspocusProvider | null>(null);
	const [clinicalDetailsDoc, setClinicalDetailsDoc] = useState<Y.Doc | null>(
		null,
	);
	const [clinicalDetailsProvider, setClinicalDetailsProvider] =
		useState<HocuspocusProvider | null>(null);
	const [commentsNotesDoc, setCommentsNotesDoc] = useState<Y.Doc | null>(
		null,
	);
	const [commentsNotesProvider, setCommentsNotesProvider] =
		useState<HocuspocusProvider | null>(null);
	const [protocolsDoc, setProtocolsDoc] = useState<Y.Doc | null>(null);
	const [protocolsProvider, setProtocolsProvider] =
		useState<HocuspocusProvider | null>(null);
	const [legendDoc, setLegendDoc] = useState<Y.Doc | null>(null);
	const [legendProvider, setLegendProvider] =
		useState<HocuspocusProvider | null>(null);
	const [insumosDoc, setInsumosDoc] = useState<Y.Doc | null>(null);
	const [insumosProvider, setInsumosProvider] =
		useState<HocuspocusProvider | null>(null);
	const [saveStatusDoc, setSaveStatusDoc] = useState<Y.Doc | null>(null);
	const [saveStatusProvider, setSaveStatusProvider] =
		useState<HocuspocusProvider | null>(null);
	const [sectionsOrderDoc, setSectionsOrderDoc] = useState<Y.Doc | null>(
		null,
	);
	const [sectionsOrderProvider, setSectionsOrderProvider] =
		useState<HocuspocusProvider | null>(null);
	const [openTextDoc, setOpenTextDoc] = useState<Y.Doc | null>(null);
	const [openTextProvider, setOpenTextProvider] =
		useState<HocuspocusProvider | null>(null);
	const [openTextLabelDoc, setOpenTextLabelDoc] = useState<Y.Doc | null>(
		null,
	);
	const [openTextLabelProvider, setOpenTextLabelProvider] =
		useState<HocuspocusProvider | null>(null);
	const [addendumDoc, setAddendumDoc] = useState<Y.Doc | null>(null);
	const [addendumProvider, setAddendumProvider] =
		useState<HocuspocusProvider | null>(null);
	const [headingsTogglesDoc, setHeadingsTogglesDoc] = useState<Y.Doc | null>(
		null,
	);
	const [headingsTogglesProvider, setHeadingsTogglesProvider] =
		useState<HocuspocusProvider | null>(null);
	const [globalSaveState, setGlobalSaveState] = useState<
		'idle' | 'saving' | 'saved'
	>('idle');

	const lastTemplateAppliedTime = useRef<number>(0);

	useEffect(() => {
		const activeProvider =
			macroscopyProvider ||
			microscopyProvider ||
			diagnosisProvider ||
			clinicalDetailsProvider;

		if (!activeProvider) {
			return;
		}

		const handleAwarenessUpdate = () => {
			const states = activeProvider.awareness?.getStates() || new Map();
			states.forEach((state: any) => {
				if (
					state.templateApplied &&
					state.templateApplied.time > lastTemplateAppliedTime.current
				) {
					lastTemplateAppliedTime.current =
						state.templateApplied.time;

					if (state.user && state.user.name !== auth.user.name) {
						toast.success(
							`${state.user.name} ha aplicado la plantilla ${state.templateApplied.name || 'de reporte'} en tiempo real.`,
						);
					}
				}
			});
		};

		activeProvider.awareness?.on('update', handleAwarenessUpdate);

		return () => {
			activeProvider.awareness?.off('update', handleAwarenessUpdate);
		};
	}, [
		macroscopyProvider,
		microscopyProvider,
		diagnosisProvider,
		clinicalDetailsProvider,
		auth.user.name,
	]);

	const handleApplyTemplate = () => {
		if (!editorTemplateId) {
			return;
		}

		const csrfToken =
			(
				document.querySelector(
					'meta[name="csrf-token"]',
				) as HTMLMetaElement
			)?.content ?? '';

		fetch(
			`/specimens/${specimen.sequence_code}/report-editor/apply-template`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRF-TOKEN': csrfToken,
					Accept: 'application/json',
				},
				body: JSON.stringify({ template_id: editorTemplateId }),
			},
		)
			.then(async (res) => {
				const data = await res.json();

				if (!res.ok) {
					throw new Error(
						data.error || 'Error al aplicar la plantilla.',
					);
				}

				return data;
			})
			.then((data) => {
				const template = data.template;

				if (!template) {
					return;
				}

				// 1. Update all Tiptap collaborative editors
				const fieldToTemplateKey: Record<string, string> = {
					clinical_details: 'clinical_details_html',
					diagnosis: 'diagnosis_html',
					macroscopy: 'macroscopy_html',
					microscopy: 'microscopy_html',
					comments_notes: 'comments_notes_html',
					protocols: 'protocols_html',
					legend: 'legend_html',
					open_text: 'open_text_html',
					addendum: 'addendum_html',
				};

				Object.keys(fieldToTemplateKey).forEach((field) => {
					const editor = editorRefs.current[field];
					const templateKey = fieldToTemplateKey[field];
					const templateContent = template[templateKey] || '';

					if (editor) {
						const currentContent = editor.getHTML();
						const isCurrentEmpty =
							!currentContent ||
							currentContent === '<p></p>' ||
							currentContent === '<p></p><p></p>';
						const mergedContent = isCurrentEmpty
							? templateContent
							: templateContent + currentContent;
						editor.commands.setContent(mergedContent);
					}
				});

				// 2. Update sections order Yjs document
				if (sectionsOrderDoc) {
					const ytextOrder = sectionsOrderDoc.getText('content');
					ytextOrder.delete(0, ytextOrder.toString().length);
					ytextOrder.insert(
						0,
						JSON.stringify(template.sections_order || []),
					);
				}

				// Update open text label Yjs document
				if (openTextLabelDoc) {
					const ytextLabel = openTextLabelDoc.getText('content');
					ytextLabel.delete(0, ytextLabel.toString().length);
					ytextLabel.insert(
						0,
						template.open_text_label || 'Texto Libre',
					);
				}

				// Update headings toggles Yjs document
				if (headingsTogglesDoc) {
					const ytextToggles = headingsTogglesDoc.getText('content');
					ytextToggles.delete(0, ytextToggles.toString().length);
					ytextToggles.insert(
						0,
						JSON.stringify(template.headings_toggles || {}),
					);
				}

				// 3. Update local states
				if (template.sections_order) {
					const loaded = [...template.sections_order].sort(
						(a, b) => a.order - b.order,
					);
					const loadedKeys = new Set(loaded.map((s) => s.key));
					const nextOrder = loaded.length + 1;
					defaultSectionsOrder.forEach((def, i) => {
						if (!loadedKeys.has(def.key)) {
							loaded.push({ ...def, order: nextOrder + i });
						}
					});
					setSectionsOrder(loaded);
				}

				if (template.open_text_label) {
					setOpenTextLabel(template.open_text_label);
				}

				if (template.headings_toggles) {
					setHeadingsToggles(template.headings_toggles);
				}

				// 4. Broadcast awareness state change to notify other peers
				const activeProvider =
					macroscopyProvider ||
					microscopyProvider ||
					diagnosisProvider ||
					clinicalDetailsProvider;

				if (activeProvider && activeProvider.awareness) {
					activeProvider.awareness.setLocalStateField(
						'templateApplied',
						{
							by: auth.user.name,
							name: template.user?.name
								? `de ${template.user.name}`
								: 'de reporte',
							time: Date.now(),
						},
					);
				}

				toast.success('Plantilla aplicada y sincronizada con éxito.');
				setIsApplyTemplateOpen(false);
				setEditorTemplateId('');
			})
			.catch((err) => {
				toast.error(err.message || 'Error al aplicar la plantilla.');
				console.error(err);
			});
	};

	const reportDateRef = useRef(reportDate);
	const sampleCollectionDateRef = useRef(sampleCollectionDate);
	const finalizationDateRef = useRef(finalizationDate);

	useEffect(() => {
		reportDateRef.current = reportDate;
	}, [reportDate]);

	useEffect(() => {
		sampleCollectionDateRef.current = sampleCollectionDate;
	}, [sampleCollectionDate]);

	useEffect(() => {
		finalizationDateRef.current = finalizationDate;
	}, [finalizationDate]);

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

		const csrfToken =
			(
				document.querySelector(
					'meta[name="csrf-token"]',
				) as HTMLMetaElement
			)?.content ?? '';

		const macroscopyBase64 = macroscopyDoc
			? uint8ToBase64(Y.encodeStateAsUpdate(macroscopyDoc))
			: null;
		const microscopyBase64 = microscopyDoc
			? uint8ToBase64(Y.encodeStateAsUpdate(microscopyDoc))
			: null;
		const diagnosisBase64 = diagnosisDoc
			? uint8ToBase64(Y.encodeStateAsUpdate(diagnosisDoc))
			: null;
		const clinicalDetailsBase64 = clinicalDetailsDoc
			? uint8ToBase64(Y.encodeStateAsUpdate(clinicalDetailsDoc))
			: null;
		const commentsNotesBase64 = commentsNotesDoc
			? uint8ToBase64(Y.encodeStateAsUpdate(commentsNotesDoc))
			: null;
		const protocolsBase64 = protocolsDoc
			? uint8ToBase64(Y.encodeStateAsUpdate(protocolsDoc))
			: null;
		const legendBase64 = legendDoc
			? uint8ToBase64(Y.encodeStateAsUpdate(legendDoc))
			: null;
		const dateBase64 = dateDoc
			? uint8ToBase64(Y.encodeStateAsUpdate(dateDoc))
			: null;

		fetch(`/specimens/${specimen.sequence_code}/report-editor/save`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRF-TOKEN': csrfToken,
				Accept: 'application/json',
			},
			body: JSON.stringify({
				report_date: reportDate,
				sample_collection_date: sampleCollectionDate,
				finalization_date: finalizationDate,
				macroscopy_html: macroscopyHtml,
				microscopy_html: microscopyHtml,
				diagnosis_html: diagnosisHtml,
				clinical_details_html: clinicalDetailsHtml,
				comments_notes_html: commentsNotesHtml,
				protocols_html: protocolsHtml,
				legend_html: legendHtml,
				yjs_macroscopy_state: macroscopyBase64,
				yjs_microscopy_state: microscopyBase64,
				yjs_diagnosis_state: diagnosisBase64,
				yjs_clinical_details_state: clinicalDetailsBase64,
				yjs_comments_notes_state: commentsNotesBase64,
				yjs_protocols_state: protocolsBase64,
				yjs_legend_state: legendBase64,
				yjs_report_date_state: dateBase64,
				sections_order: sectionsOrder,
				headings_toggles: headingsToggles,
			}),
		})
			.then(async (res) => {
				const data = await res.json();

				if (!res.ok) {
					throw new Error(
						data.message || 'Error al guardar el reporte',
					);
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
		if (!report) {
			return;
		}

		// 1. Date room
		const dDoc = new Y.Doc();
		const dProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-report_date`,
			document: dDoc,
			token: 'secure-token-or-session-id',
		});

		setDateDoc(dDoc);
		setDateProvider(dProvider);

		const ytext = dDoc.getText('content');
		const handleYjsChange = () => {
			const val = ytext.toString().trim();

			if (val) {
				const match = val.match(/\d{4}-\d{2}-\d{2}/);
				const dateVal = match ? match[0] : val.split('T')[0];

				if (dateVal && dateVal !== reportDateRef.current) {
					setReportDate(dateVal);
				}
			}
		};
		ytext.observe(handleYjsChange);

		// 1.2. Sample Collection Date room
		const scDoc = new Y.Doc();
		const scProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-sample_collection_date`,
			document: scDoc,
			token: 'secure-token-or-session-id',
		});

		setSampleCollectionDateDoc(scDoc);
		setSampleCollectionDateProvider(scProvider);

		const ytextSc = scDoc.getText('content');
		const handleScYjsChange = () => {
			const val = ytextSc.toString().trim();

			if (val) {
				const match = val.match(/\d{4}-\d{2}-\d{2}/);
				const dateVal = match ? match[0] : val.split('T')[0];

				if (dateVal && dateVal !== sampleCollectionDateRef.current) {
					setSampleCollectionDate(dateVal);
				}
			}
		};
		ytextSc.observe(handleScYjsChange);

		// 1.3. Finalization Date room
		const fDoc = new Y.Doc();
		const fProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-finalization_date`,
			document: fDoc,
			token: 'secure-token-or-session-id',
		});

		setFinalizationDateDoc(fDoc);
		setFinalizationDateProvider(fProvider);

		const ytextF = fDoc.getText('content');
		const handleFYjsChange = () => {
			const val = ytextF.toString().trim();

			if (val) {
				const match = val.match(/\d{4}-\d{2}-\d{2}/);
				const dateVal = match ? match[0] : val.split('T')[0];

				if (dateVal && dateVal !== finalizationDateRef.current) {
					setFinalizationDate(dateVal);
				}
			}
		};
		ytextF.observe(handleFYjsChange);

		// 2. Macroscopy room
		const macDoc = new Y.Doc();
		const macProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-macroscopy`,
			document: macDoc,
			token: 'secure-token-or-session-id',
		});
		macProvider.awareness?.setLocalStateField('user', {
			name: auth.user.name,
			color: auth.user.cursor_color || '#8b5cf6',
		});

		setMacroscopyDoc(macDoc);
		setMacroscopyProvider(macProvider);

		// 3. Microscopy room
		const micDoc = new Y.Doc();
		const micProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-microscopy`,
			document: micDoc,
			token: 'secure-token-or-session-id',
		});
		micProvider.awareness?.setLocalStateField('user', {
			name: auth.user.name,
			color: auth.user.cursor_color || '#d946ef',
		});

		setMicroscopyDoc(micDoc);
		setMicroscopyProvider(micProvider);

		// 4. Diagnosis room
		const diagDoc = new Y.Doc();
		const diagProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-diagnosis`,
			document: diagDoc,
			token: 'secure-token-or-session-id',
		});
		diagProvider.awareness?.setLocalStateField('user', {
			name: auth.user.name,
			color: auth.user.cursor_color || '#3b82f6',
		});

		setDiagnosisDoc(diagDoc);
		setDiagnosisProvider(diagProvider);

		// 4.1 Clinical Details room
		const clinDoc = new Y.Doc();
		const clinProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-clinical_details`,
			document: clinDoc,
			token: 'secure-token-or-session-id',
		});
		clinProvider.awareness?.setLocalStateField('user', {
			name: auth.user.name,
			color: auth.user.cursor_color || '#10b981',
		});
		setClinicalDetailsDoc(clinDoc);
		setClinicalDetailsProvider(clinProvider);

		// 4.2 Comments Notes room
		const commDoc = new Y.Doc();
		const commProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-comments_notes`,
			document: commDoc,
			token: 'secure-token-or-session-id',
		});
		commProvider.awareness?.setLocalStateField('user', {
			name: auth.user.name,
			color: auth.user.cursor_color || '#f59e0b',
		});
		setCommentsNotesDoc(commDoc);
		setCommentsNotesProvider(commProvider);

		// 4.3 Protocols room
		const protDoc = new Y.Doc();
		const protProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-protocols`,
			document: protDoc,
			token: 'secure-token-or-session-id',
		});
		protProvider.awareness?.setLocalStateField('user', {
			name: auth.user.name,
			color: auth.user.cursor_color || '#2563eb',
		});
		setProtocolsDoc(protDoc);
		setProtocolsProvider(protProvider);

		// 4.4 Legend room
		const legDoc = new Y.Doc();
		const legProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-legend`,
			document: legDoc,
			token: 'secure-token-or-session-id',
		});
		legProvider.awareness?.setLocalStateField('user', {
			name: auth.user.name,
			color: auth.user.cursor_color || '#64748b',
		});
		setLegendDoc(legDoc);
		setLegendProvider(legProvider);

		// 4.5 Insumos room (real-time reload notifier)
		const insDoc = new Y.Doc();
		const insProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-insumos`,
			document: insDoc,
			token: 'secure-token-or-session-id',
		});
		setInsumosDoc(insDoc);
		setInsumosProvider(insProvider);

		const ytextInsumos = insDoc.getText('content');
		const handleInsumosYjsChange = () => {
			const val = ytextInsumos.toString();

			if (val) {
				console.log(`Insumos refreshed via collaboration: ${val}`);
				router.reload({
					only: ['specimen'],
				});
			}
		};
		ytextInsumos.observe(handleInsumosYjsChange);

		// 5. Save Status room
		const saveDoc = new Y.Doc();
		const saveProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
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

		// 6. Sections Order room
		const orderDoc = new Y.Doc();
		const orderProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-sections_order`,
			document: orderDoc,
			token: 'secure-token-or-session-id',
		});

		setSectionsOrderDoc(orderDoc);
		setSectionsOrderProvider(orderProvider);

		const ytextOrder = orderDoc.getText('content');
		const handleOrderYjsChange = () => {
			const val = ytextOrder.toString().trim();

			if (val) {
				try {
					const parsed = JSON.parse(val);

					if (Array.isArray(parsed) && parsed.length > 0) {
						// Merge in any new keys (e.g. open_text_html) missing from the synced order
						const parsedKeys = new Set(
							parsed.map((s: { key: string }) => s.key),
						);
						const nextOrder = parsed.length + 1;
						defaultSectionsOrder.forEach((def, i) => {
							if (!parsedKeys.has(def.key)) {
								parsed.push({ ...def, order: nextOrder + i });
							}
						});

						setSectionsOrder((prev) => {
							const currentKeysStr = JSON.stringify(prev);
							const newKeysStr = JSON.stringify(parsed);

							if (currentKeysStr !== newKeysStr) {
								return parsed;
							}

							return prev;
						});
					}
				} catch (e) {
					console.error(
						'Failed to parse sections_order from Yjs update:',
						e,
					);
				}
			}
		};
		ytextOrder.observe(handleOrderYjsChange);

		// 6.1. Open Text Label room
		const labelDoc = new Y.Doc();
		const labelProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-open_text_label`,
			document: labelDoc,
			token: 'secure-token-or-session-id',
		});
		setOpenTextLabelDoc(labelDoc);
		setOpenTextLabelProvider(labelProvider);
		const ytextLabel = labelDoc.getText('content');
		const handleLabelYjsChange = () => {
			const val = ytextLabel.toString().trim();

			if (val && val !== openTextLabelRef.current) {
				setOpenTextLabel(val);
			}
		};
		ytextLabel.observe(handleLabelYjsChange);

		// 6.2. Headings Toggles room
		const togglesDoc = new Y.Doc();
		const togglesProvider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-headings_toggles`,
			document: togglesDoc,
			token: 'secure-token-or-session-id',
		});
		setHeadingsTogglesDoc(togglesDoc);
		setHeadingsTogglesProvider(togglesProvider);
		const ytextToggles = togglesDoc.getText('content');
		const handleTogglesYjsChange = () => {
			const val = ytextToggles.toString().trim();

			if (val) {
				try {
					const parsed = JSON.parse(val);

					if (parsed && typeof parsed === 'object') {
						setHeadingsToggles((prev) => {
							if (
								JSON.stringify(prev) !== JSON.stringify(parsed)
							) {
								return { ...defaultHeadingsToggles, ...parsed };
							}

							return prev;
						});
					}
				} catch (e) {
					console.error('Failed to parse headings_toggles:', e);
				}
			}
		};
		ytextToggles.observe(handleTogglesYjsChange);

		// 6.3. Open Text room
		const openTextD = new Y.Doc();
		const openTextP = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-open_text`,
			document: openTextD,
			token: 'secure-token-or-session-id',
		});
		openTextP.awareness?.setLocalStateField('user', {
			name: auth.user.name,
			color: auth.user.cursor_color || '#6366f1',
		});
		setOpenTextDoc(openTextD);
		setOpenTextProvider(openTextP);

		// 6.4. Addendum room
		const addendumD = new Y.Doc();
		const addendumP = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
			name: `report-${report.id}-addendum`,
			document: addendumD,
			token: 'secure-token-or-session-id',
		});
		addendumP.awareness?.setLocalStateField('user', {
			name: auth.user.name,
			color: auth.user.cursor_color || '#f59e0b',
		});
		setAddendumDoc(addendumD);
		setAddendumProvider(addendumP);

		return () => {
			ytext.unobserve(handleYjsChange);
			ytextSc.unobserve(handleScYjsChange);
			ytextF.unobserve(handleFYjsChange);
			ytextSave.unobserve(handleSaveYjsChange);
			ytextInsumos.unobserve(handleInsumosYjsChange);
			ytextOrder.unobserve(handleOrderYjsChange);
			ytextLabel.unobserve(handleLabelYjsChange);
			ytextToggles.unobserve(handleTogglesYjsChange);
			dProvider.destroy();
			dDoc.destroy();
			scProvider.destroy();
			scDoc.destroy();
			fProvider.destroy();
			fDoc.destroy();
			macProvider.destroy();
			macDoc.destroy();
			micProvider.destroy();
			micDoc.destroy();
			diagProvider.destroy();
			diagDoc.destroy();
			clinProvider.destroy();
			clinDoc.destroy();
			commProvider.destroy();
			commDoc.destroy();
			protProvider.destroy();
			protDoc.destroy();
			legProvider.destroy();
			legDoc.destroy();
			insProvider.destroy();
			insDoc.destroy();
			saveProvider.destroy();
			saveDoc.destroy();
			orderProvider.destroy();
			orderDoc.destroy();
			labelProvider.destroy();
			labelDoc.destroy();
			togglesProvider.destroy();
			togglesDoc.destroy();
			openTextP.destroy();
			openTextD.destroy();
			addendumP.destroy();
			addendumD.destroy();
			setDateDoc(null);
			setDateProvider(null);
			setSampleCollectionDateDoc(null);
			setSampleCollectionDateProvider(null);
			setFinalizationDateDoc(null);
			setFinalizationDateProvider(null);
			setMacroscopyDoc(null);
			setMacroscopyProvider(null);
			setMicroscopyDoc(null);
			setMicroscopyProvider(null);
			setDiagnosisDoc(null);
			setDiagnosisProvider(null);
			setClinicalDetailsDoc(null);
			setClinicalDetailsProvider(null);
			setCommentsNotesDoc(null);
			setCommentsNotesProvider(null);
			setProtocolsDoc(null);
			setProtocolsProvider(null);
			setLegendDoc(null);
			setLegendProvider(null);
			setInsumosDoc(null);
			setInsumosProvider(null);
			setSaveStatusDoc(null);
			setSaveStatusProvider(null);
			setSectionsOrderDoc(null);
			setSectionsOrderProvider(null);
			setOpenTextLabelDoc(null);
			setOpenTextLabelProvider(null);
			setHeadingsTogglesDoc(null);
			setHeadingsTogglesProvider(null);
			setOpenTextDoc(null);
			setOpenTextProvider(null);
			setAddendumDoc(null);
			setAddendumProvider(null);
		};
	}, [report?.id]);

	const [statusDoc, setStatusDoc] = useState<Y.Doc | null>(null);
	const [statusProvider, setStatusProvider] =
		useState<HocuspocusProvider | null>(null);
	const specimenStatusRef = useRef(specimen.status);

	useEffect(() => {
		specimenStatusRef.current = specimen.status;
	}, [specimen.status]);

	useEffect(() => {
		if (!report) {
			return;
		}

		const doc = new Y.Doc();
		const provider = new HocuspocusProvider({
			url: WS_COLLABORATION_SERVER_URL,
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
				toast.info(
					`El estado de la muestra ha cambiado a: ${statusName}`,
				);
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
		...clinicalDetailsUsers,
		...commentsNotesUsers,
		...protocolsUsers,
		...legendUsers,
	];
	const [isSpecimenSheetOpen, setIsSpecimenSheetOpen] = useState(false);

	useEffect(() => {
		if (report) {
			const rawDate = report.report_date || '';
			const match = rawDate.match(/\d{4}-\d{2}-\d{2}/);
			setReportDate(match ? match[0] : rawDate.split('T')[0] || '');
			const rawCollectionDate = specimen.sample_collection_date || '';
			const matchColl = rawCollectionDate.match(/\d{4}-\d{2}-\d{2}/);
			setSampleCollectionDate(
				matchColl
					? matchColl[0]
					: rawCollectionDate.split('T')[0] || '',
			);
			const rawFinalDate = report.finalization_date || '';
			const matchFinal = rawFinalDate.match(/\d{4}-\d{2}-\d{2}/);
			setFinalizationDate(
				matchFinal ? matchFinal[0] : rawFinalDate.split('T')[0] || '',
			);
			setMacroscopyHtml(report.macroscopy_html || '');
			setMicroscopyHtml(report.microscopy_html || '');
			setDiagnosisHtml(report.diagnosis_html || '');
		}
	}, [report, specimen]);

	const handleCreateReport = () => {
		if (templates && templates.length > 0 && !selectedTemplateId) {
			toast.error('Debe seleccionar una plantilla para continuar.');

			return;
		}

		router.post(
			`/specimens/${specimen.sequence_code}/report-editor`,
			{ template_id: selectedTemplateId || null },
			{
				onSuccess: () => {
					toast.success(
						'Reporte creado y estado actualizado a revisión macroscópica',
					);
				},
				onError: (errors) => {
					toast.error('Error al crear el reporte');
					console.error(errors);
				},
			},
		);
	};

	const handleUpdateDate = (dateVal: string) => {
		if (!dateVal) {
			return;
		}

		const match = dateVal.match(/\d{4}-\d{2}-\d{2}/);
		const sanitized = match ? match[0] : dateVal;

		setReportDate(sanitized);

		if (dateDoc) {
			const ytext = dateDoc.getText('content');

			if (ytext.toString().trim() !== sanitized) {
				dateDoc.transact(() => {
					ytext.delete(0, ytext.length);
					ytext.insert(0, sanitized);
				});
			}
		}

		// Also persist directly to database
		const csrfToken =
			(
				document.querySelector(
					'meta[name="csrf-token"]',
				) as HTMLMetaElement
			)?.content ?? '';

		fetch(`/specimens/${specimen.sequence_code}/report-editor/save`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRF-TOKEN': csrfToken,
				Accept: 'application/json',
			},
			body: JSON.stringify({ report_date: sanitized }),
		})
			.then(() => {
				router.reload({ only: ['specimen', 'report'] });
			})
			.catch((err) => {
				console.error('Failed to persist report_date:', err);
			});
	};

	const handleUpdateSampleCollectionDate = (dateVal: string) => {
		if (!dateVal) {
			return;
		}

		const match = dateVal.match(/\d{4}-\d{2}-\d{2}/);
		const sanitized = match ? match[0] : dateVal;

		setSampleCollectionDate(sanitized);

		if (sampleCollectionDateDoc) {
			const ytext = sampleCollectionDateDoc.getText('content');

			if (ytext.toString().trim() !== sanitized) {
				sampleCollectionDateDoc.transact(() => {
					ytext.delete(0, ytext.length);
					ytext.insert(0, sanitized);
				});
			}
		}

		const csrfToken =
			(
				document.querySelector(
					'meta[name="csrf-token"]',
				) as HTMLMetaElement
			)?.content ?? '';

		fetch(`/specimens/${specimen.sequence_code}/report-editor/save`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRF-TOKEN': csrfToken,
				Accept: 'application/json',
			},
			body: JSON.stringify({ sample_collection_date: sanitized }),
		})
			.then(() => {
				router.reload({ only: ['specimen', 'report'] });
			})
			.catch((err) => {
				console.error('Failed to persist sample_collection_date:', err);
			});
	};

	const handleUpdateFinalizationDate = (dateVal: string) => {
		if (!dateVal) {
			return Promise.resolve();
		}

		const match = dateVal.match(/\d{4}-\d{2}-\d{2}/);
		const sanitized = match ? match[0] : dateVal;

		setFinalizationDate(sanitized);

		if (finalizationDateDoc) {
			const ytext = finalizationDateDoc.getText('content');

			if (ytext.toString().trim() !== sanitized) {
				finalizationDateDoc.transact(() => {
					ytext.delete(0, ytext.length);
					ytext.insert(0, sanitized);
				});
			}
		}

		const csrfToken =
			(
				document.querySelector(
					'meta[name="csrf-token"]',
				) as HTMLMetaElement
			)?.content ?? '';

		return fetch(
			`/specimens/${specimen.sequence_code}/report-editor/save`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRF-TOKEN': csrfToken,
					Accept: 'application/json',
				},
				body: JSON.stringify({ finalization_date: sanitized }),
			},
		)
			.then(() => {
				router.reload({ only: ['specimen', 'report'] });
			})
			.catch((err) => {
				console.error('Failed to persist finalization_date:', err);
			});
	};

	const handleStartMicroscopyFinalization = async () => {
		setIsGeneratingPdf(true);

		const d = new Date();
		const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

		await handleUpdateFinalizationDate(todayStr);

		const csrfToken =
			(
				document.querySelector(
					'meta[name="csrf-token"]',
				) as HTMLMetaElement
			)?.content ?? '';

		try {
			const response = await fetch(
				`/specimens/${specimen.sequence_code}/report-editor/generate-temp-pdf`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-CSRF-TOKEN': csrfToken,
						Accept: 'application/json',
					},
				},
			);

			if (!response.ok) {
				const errorData = await response.json();

				throw new Error(
					errorData.error ||
					'Error al generar la previsualización del PDF.',
				);
			}

			const data = await response.json();
			let pdfUrl = data.url;

			if (pdfUrl && pdfUrl.startsWith('http')) {
				try {
					const parsed = new URL(pdfUrl);
					pdfUrl = parsed.pathname + parsed.search + parsed.hash;
				} catch (e) {
					console.error(e);
				}
			}

			setTempPdfUrl(pdfUrl);
			setTempPdfTotalPages(data.total_pages || 1);
			setShowCompleteMicroscopyDialog(true);
		} catch (error: any) {
			toast.error(
				error.message || 'Error al generar el PDF de previsualización.',
			);
		} finally {
			setIsGeneratingPdf(false);
		}
	};

	const handleTransitionState = (targetStatus: Specimen['status']) => {
		if (targetStatus === 'finalized') {
			const unsignedUsers =
				specimen.users?.filter(
					(u) => !u.user_signature && !u.signature_url,
				) || [];

			if (unsignedUsers.length > 0) {
				setUnsignedPathologists(unsignedUsers);
				setShowSignatureWarning(true);
				toast.error('Faltan firmas de patólogos');

				return;
			}
		}

		router.post(
			`/specimens/${specimen.sequence_code}/report-editor/transition-state`,
			{
				status: targetStatus,
			},
			{
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

					setSessionEditingEnabled(false);
				},
				onError: (errors) => {
					if (errors && errors.error) {
						toast.error(errors.error);
					} else if (errors && typeof errors === 'object') {
						const firstKey = Object.keys(errors)[0];

						if (firstKey && errors[firstKey]) {
							toast.error(errors[firstKey] as string);
						} else {
							toast.error(
								'Error al actualizar el estado del proceso',
							);
						}
					} else {
						toast.error(
							'Error al actualizar el estado del proceso',
						);
					}
				},
			},
		);
	};

	// Loader for 300ms
	if (isLoading) {
		return (
			<EditorLayout
				breadcrumbs={[
					{ title: 'Mis Asignaciones', href: '/my-assignments' },
					{
						title: specimen.sequence_code,
						href: `/specimens?specimen=${specimen.sequence_code}&action=view`,
					},
					{ title: 'Editor de Informe', href: '#' },
				]}
			>
				<Head title={`Cargando Editor - ${specimen.sequence_code}`} />
				<div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
					<div className="relative flex items-center justify-center">
						<div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
						<div className="absolute h-6 w-6 rounded-full bg-primary/10" />
					</div>
					<p className="animate-pulse text-sm font-semibold text-muted-foreground">
						Cargando editor de informe...
					</p>
				</div>
			</EditorLayout>
		);
	}

	// Blank screen when report does not exist
	if (!report) {
		return (
			<EditorLayout
				breadcrumbs={[
					{ title: 'Mis Asignaciones', href: '/my-assignments' },
					{ title: 'Editor de Informe', href: '#' },
				]}
			>
				<Head title={`Crear Reporte - ${specimen.sequence_code}`} />
				<div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
					<div className="relative max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-card p-8 shadow-xl backdrop-blur-md">
						<div className="absolute top-0 right-0 left-0 h-1.5 bg-primary" />
						<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
							<FileText className="h-8 w-8" />
						</div>
						<h2 className="mb-3 text-2xl font-bold tracking-tight">
							Reporte no iniciado
						</h2>
						<p className="mb-6 text-sm leading-relaxed text-muted-foreground">
							Esta muestra aún no posee un registro de reporte. Al
							iniciar el reporte se creará la plantilla del
							documento y el estado cambiará de{' '}
							<span className="font-semibold text-primary">
								Recibido
							</span>{' '}
							a{' '}
							<span className="font-semibold text-violet-500">
								Revisión Macroscópica
							</span>
							.
						</p>
						{!isAssigned ? (
							<div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-left text-xs text-destructive">
								<Info className="h-5 w-5 shrink-0 text-destructive" />
								<div>
									<span className="mb-0.5 block font-semibold text-destructive">
										Acceso no autorizado
									</span>
									No estás asignado a esta muestra, por lo que
									no tienes permisos para iniciar o crear el
									reporte.
								</div>
							</div>
						) : (
							<>
								{templates && templates.length > 0 ? (
									<div className="mb-6 text-left">
										<label className="mb-2 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
											Seleccionar Plantilla de Reporte
										</label>
										<Select
											value={selectedTemplateId}
											onValueChange={
												setSelectedTemplateId
											}
										>
											<SelectTrigger className="h-12 w-full text-foreground">
												<SelectValue placeholder="Seleccione una plantilla..." />
											</SelectTrigger>
											<SelectContent className="max-h-[300px]">
												{templates.map((temp) => (
													<SelectItem
														key={temp.id}
														value={String(temp.id)}
														className="group"
													>
														<div className="flex flex-row flex-nowrap gap-3 py-1 text-left">
															<span className="text-sm font-semibold text-foreground group-focus:text-white group-data-[highlighted]:text-white">
																{temp.name ||
																	'Plantilla sin nombre'}
															</span>
															<span className="mt-0.5 text-xs text-muted-foreground group-focus:text-white/80 group-data-[highlighted]:text-white/80">
																{
																	temp
																		.specimen_type
																		?.name
																}{' '}
																-{' '}
																{
																	temp
																		.specimen_type_examination
																		?.name
																}{' '}
																(
																{temp.user
																	?.name ||
																	'Sin propietario'}
																)
															</span>
														</div>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								) : (
									<div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-left text-xs text-muted-foreground">
										<Info className="h-5 w-5 shrink-0 text-muted-foreground" />
										<div>
											<span className="mb-0.5 block font-semibold text-foreground">
												Sin plantillas disponibles
											</span>
											No se encontraron plantillas para
											este tipo de muestra y examen. Se
											creará un reporte en blanco.
										</div>
									</div>
								)}
								<Button
									size="lg"
									onClick={handleCreateReport}
									disabled={
										templates &&
										templates.length > 0 &&
										!selectedTemplateId
									}
									className="w-full cursor-pointer font-semibold shadow-md shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.99]"
								>
									Crear Reporte
								</Button>
							</>
						)}
					</div>
				</div>
			</EditorLayout>
		);
	}

	const isMacroscopyEditable =
		(['macroscopic_review', 'processing', 'microscopic_review'].includes(
			specimen.status,
		) ||
			(isFinished && sessionEditingEnabled)) &&
		hasMacroAccess;
	const isMicroscopyEditable =
		(specimen.status === 'microscopic_review' ||
			(isFinished && sessionEditingEnabled)) &&
		hasMicroAccess;
	const totalPages = pages.length > 0 ? pages.length : 1;

	const renderPreviewPage = (pageNum: number) => {
		const pageBlocks = pages[pageNum - 1] || [];
		const totalNumPages = pages.length > 0 ? pages.length : 1;

		return (
			<ShadowRoot
				className="relative mb-6 flex shrink-0 origin-top-left flex-col overflow-hidden border bg-white text-left font-sans text-slate-800 shadow-2xl select-none"
				style={{
					width: '215.9mm',
					height: '279.4mm',
					padding: '12mm 15mm 12mm 15mm',
					aspectRatio: '8.5/11',
				}}
			>
				<style dangerouslySetInnerHTML={{ __html: editorStyles }} />
				{/* Header preview */}
				<div
					style={{
						width: '100%',
						height: '27.0mm',
						marginBottom: '2.5mm',
					}}
				>
					<div
						style={{
							width: '100%',
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'flex-start',
							marginBottom: '0.53mm',
							position: 'relative',
							marginTop: '-4mm',
						}}
					>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
							}}
						>
							<img
								style={{
									maxHeight: '16mm',
									width: 'auto',
									marginBottom: '1.06mm',
									marginLeft: 'auto',
									marginRight: 'auto',
								}}
								src="/images/patolab-logo-horizontal-full.png"
								alt="Logo PatoLab"
								onError={(e) => {
									e.currentTarget.style.display = 'none';
									const fallback = document.getElementById(
										`preview-logo-text-fallback-${pageNum}`,
									);

									if (fallback) {
										fallback.style.display = 'block';
									}
								}}
							/>
						</div>
						<div
							style={{
								position: 'absolute',
								right: '0mm',
								top: '0mm',
							}}
						>
							<div
								style={{
									backgroundColor: '#f3f4f6',
									border: '0.26mm solid #d1d5db',
									color: '#374151',
									fontFamily: 'monospace',
									fontWeight: 800,
									fontSize: '2.91mm',
									padding: '1.06mm 2.12mm',
									borderRadius: '1.06mm',
									display: 'inline-block',
								}}
							>
								N° {specimen.sequence_code}
							</div>
						</div>
					</div>

					<div
						style={{
							textAlign: 'center',
							fontSize: '2.5mm',
							fontStyle: 'italic',
						}}
					>
						Calidad diagnóstica a su servicio
					</div>

					<div
						style={{
							textAlign: 'center',
							fontSize: '4.23mm',
							fontWeight: 700,
							color: '#000000',
							marginTop: '0.63mm',
							marginBottom: '0.69mm',
							letterSpacing: '0.13mm',
							paddingBottom: '3.18mm',
							textTransform: 'uppercase',
						}}
					>
						INFORME DE ANATOMÍA PATOLÓGICA
					</div>
					<div
						style={{
							width: '100%',
							height: '0.53mm',
							backgroundColor: '#000000',
							marginTop: '0.53mm',
						}}
					></div>
				</div>

				{/* Page Content */}
				<div
					style={{
						width: '100%',
						height: '205.00mm',
						maxHeight: '205.00mm',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'flex-start',
					}}
				>
					{pageBlocks.map((block) => {
						if (block.type === 'patient-card') {
							return (
								<PatientMetadataCard
									key={block.id}
									specimen={specimen}
									sampleCollectionDate={sampleCollectionDate}
									reportDate={reportDate}
								/>
							);
						}

						if (block.type === 'section-header') {
							return (
								<SectionHeader
									key={block.id}
									title={block.title || ''}
								/>
							);
						}

						if (block.type === 'signature') {
							return (
								<SignatureBlock
									key={block.id}
									users={specimen.users}
									reportDate={reportDate}
									finalizationDate={finalizationDate}
								/>
							);
						}

						if (block.type === 'cuttings-summary') {
							return (
								<div
									key={block.id}
									className="preview-content shrink-0 select-none"
									style={{
										fontSize: '2.51mm',
										lineHeight: '3.97mm',
										textAlign: 'justify',
										marginTop: '2.0mm',
										marginBottom: '2.0mm',
										fontFamily: 'inherit',
										fontWeight: 'normal',
									}}
								>
									<u>Cortes</u>:{' '}
									{block.text?.replace('Cortes: ', '')}
								</div>
							);
						}

						if (block.type === 'new-cuttings-summary') {
							return (
								<div
									key={block.id}
									className="preview-content shrink-0 select-none"
									style={{
										fontSize: '2.51mm',
										lineHeight: '3.97mm',
										textAlign: 'justify',
										marginTop: '2.0mm',
										marginBottom: '2.0mm',
										fontFamily: 'inherit',
										fontWeight: 'normal',
									}}
								>
									<u>Nuevos Cortes</u>:{' '}
									{block.text?.replace('Nuevos Cortes: ', '')}
								</div>
							);
						}

						if (
							block.type === 'html' ||
							block.type === 'heading' ||
							block.type === 'image'
						) {
							return (
								<div
									key={block.id}
									className={cn(
										block.className || 'section-content',
										'preview-content shrink-0',
									)}
									dangerouslySetInnerHTML={{
										__html: block.html || '',
									}}
								/>
							);
						}

						return null;
					})}
				</div>

				{/* Footer preview */}
				<div
					style={{
						position: 'absolute',
						bottom: '5mm',
						left: '15mm',
						right: '15mm',
						height: '20.11mm',
					}}
				>
					<div
						style={{
							width: '100%',
							height: '0.53mm',
							backgroundColor: '#000000',
							marginBottom: '0.79mm',
						}}
					></div>
					<div
						style={{
							textAlign: 'center',
							fontSize: '2.12mm',
							fontWeight: 600,
							color: '#374151',
							marginBottom: '1.32mm',
						}}
					>
						Este reporte contiene información médica confidencial.
						Consulte a su médico para adecuada interpretación del
						mismo.
					</div>

					<table
						style={{
							width: '100%',
							borderCollapse: 'collapse',
							border: 'none',
						}}
					>
						<tbody>
							<tr style={{ border: 'none' }}>
								<td
									style={{
										width: '30%',
										verticalAlign: 'middle',
										fontSize: '2.12mm',
										color: '#4b5563',
										border: 'none',
										padding: '0mm',
									}}
								>
									<Mail
										style={{
											display: 'inline-block',
											marginRight: '0.79mm',
											color: '#1e3a8a',
											width: '2.65mm',
											height: '2.65mm',
											verticalAlign: 'middle',
										}}
									/>
									info@PatoLab.org
								</td>
								<td
									style={{
										width: '30%',
										verticalAlign: 'middle',
										fontSize: '2.12mm',
										color: '#4b5563',
										border: 'none',
										padding: '0mm',
									}}
								>
									<Phone
										style={{
											display: 'inline-block',
											marginRight: '0.79mm',
											color: '#1e3a8a',
											width: '2.65mm',
											height: '2.65mm',
											verticalAlign: 'middle',
										}}
									/>
									+504 9442 8529
								</td>
								<td
									style={{
										width: '40%',
										verticalAlign: 'middle',
										fontSize: '2.12mm',
										color: '#4b5563',
										border: 'none',
										padding: '0mm',
										textAlign: 'right',
									}}
								>
									<div
										style={{
											display: 'inline-block',
											textAlign: 'left',
											maxWidth: '70mm',
										}}
									>
										<MapPin
											style={{
												display: 'inline-block',
												marginRight: '0.79mm',
												color: '#1e3a8a',
												width: '2.65mm',
												height: '2.65mm',
												verticalAlign: 'top',
												marginTop: '0.2mm',
											}}
										/>
										<span
											style={{
												fontSize: '1.5mm',
												lineHeight: '1.15',
												display: 'inline-block',
												verticalAlign: 'top',
												maxWidth: '64mm',
											}}
										>
											Barrio los Andes: 7, 12-13 Calle
											Avenida, Sector N.O., Casa NO.: 105,
											Departamento: Cortes, Municipio: San
											Pedro Sula
										</span>
									</div>
								</td>
							</tr>
						</tbody>
					</table>

					<div
						style={{
							position: 'absolute',
							bottom: '4mm',
							left: '0mm',
							fontSize: '2.12mm',
							fontWeight: 600,
							color: '#4b5563',
						}}
					>
						Página {pageNum} de {totalNumPages}
					</div>
				</div>
			</ShadowRoot>
		);
	};

	return (
		<EditorRegistryContext.Provider value={{ registerEditor }}>
			<EditorLayout
				breadcrumbs={[
					{ title: 'Mis Asignaciones', href: '/my-assignments' },
					{
						title: specimen.sequence_code,
						href: `/specimens?specimen=${specimen.sequence_code}&action=view`,
					},
					{ title: 'Editor de Informe', href: '#' },
				]}
				headerRight={
					<div className="flex items-center gap-3">
						<CollaboratorsList users={allCollaborators} />
						<div className="h-6 w-px bg-border/80" />
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
							{globalSaveState === 'saving' ? (
								<>
									<div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
									<span className="animate-pulse font-medium text-amber-600 dark:text-amber-500">
										Guardando...
									</span>
								</>
							) : isAutosaving ? (
								<>
									<div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
									<span className="animate-pulse font-medium text-indigo-600 dark:text-indigo-500">
										Escribiendo...
									</span>
								</>
							) : globalSaveState === 'saved' ||
								isSavedRecently ? (
								<>
									<div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
									<span className="font-medium text-emerald-600 dark:text-emerald-500">
										¡Guardado!
									</span>
								</>
							) : (
								<>
									<div className="h-2 w-2 rounded-full bg-emerald-500" />
									<span className="font-medium text-emerald-600 dark:text-emerald-500">
										{timeString}
									</span>
								</>
							)}
						</div>
						<button
							data-slot="button"
							onClick={handleManualSave}
							disabled={
								globalSaveState === 'saving' ||
								globalSaveState === 'saved' ||
								isSavedRecently ||
								isAutosaving
							}
							className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium whitespace-nowrap text-white shadow-xs transition-[color,box-shadow] outline-none hover:bg-emerald-600/90 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 has-[>svg]:px-3 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:w-auto dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
						>
							{globalSaveState === 'saving' ? (
								<>
									<Loader2 className="mr-1 h-4 w-4 animate-spin" />
									Guardando...
								</>
							) : globalSaveState === 'saved' ||
								isSavedRecently ? (
								<>
									<Check className="mr-1 h-4 w-4 text-white" />
									¡Guardado!
								</>
							) : (
								<>
									<Save className="mr-1 h-4 w-4" />
									Guardar
								</>
							)}
						</button>
					</div>
				}
			>
				<Head title={`Editor de Informe - ${specimen.sequence_code}`} />
				<style dangerouslySetInnerHTML={{ __html: editorStyles }} />

				<div className="h-[100vh] items-start bg-slate-50/50 dark:bg-slate-900/10">
					{/* LEFT COLUMN: Inputs and Editors */}
					<div className="h-[calc(100vh-64px)] w-screen overflow-auto lg:w-[50vw]">
						{/* Header bar with Back button and Status Badge */}
						<div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-6">
							<div className="flex items-center gap-3">
								<Button
									variant="ghost"
									size="icon"
									onClick={() =>
										router.visit('/my-assignments')
									}
									className="h-8 w-8 cursor-pointer"
								>
									<ArrowLeft className="h-4 w-4" />
								</Button>
								<div>
									<div className="flex items-center gap-2">
										<div>
											<h1 className="text-xl font-bold tracking-tight">
												Editor de Informe
											</h1>
											<p className="text-xs text-muted-foreground">
												{specimen.type.name} &bull;{' '}
												{specimen.examination.name}
											</p>
										</div>
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2">
								{isFinished && !sessionEditingEnabled && (
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												className="cursor-pointer border-amber-500/50 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
											>
												Activar edición
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>
													¿Activar edición?
												</AlertDialogTitle>
												<AlertDialogDescription>
													Esta acción permitirá
													modificar el diagnóstico, la
													macroscopía y la microscopía
													de este reporte finalizado
													únicamente durante esta
													sesión.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel className="cursor-pointer">
													Cancelar
												</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => {
														setSessionEditingEnabled(
															true,
														);
														toast.success(
															'Edición activada para esta sesión',
														);
													}}
													className="cursor-pointer bg-amber-600 text-white hover:bg-amber-700"
												>
													Activar
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								)}
								{isFinished && sessionEditingEnabled && (
									<div className="flex items-center gap-2">
										<span className="animate-pulse rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
											Edición Activa
										</span>
										<Button
											onClick={
												handleStartMicroscopyFinalization
											}
											disabled={isGeneratingPdf}
											size="sm"
											className="cursor-pointer gap-2 bg-fuchsia-600 font-semibold text-white shadow-sm hover:bg-fuchsia-700"
										>
											{isGeneratingPdf ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />
													<span>Generando...</span>
												</>
											) : (
												<>
													<Check className="h-4 w-4" />
													<span>
														Finalizar Reporte
													</span>
												</>
											)}
										</Button>
									</div>
								)}
								<div className="flex flex-col items-end gap-2">
									<div className="flex items-center gap-2">
										<span className="text-[10px] tracking-tight text-muted-foreground uppercase">
											Fase actual
										</span>
										<span
											className="rounded-full px-2.5 py-1 text-xs font-semibold tracking-wider uppercase"
											style={{
												backgroundColor:
													specimen.status ===
														'macroscopic_review'
														? '#8b5cf620'
														: specimen.status ===
															'processing'
															? '#f59e0b20'
															: specimen.status ===
																'microscopic_review'
																? '#d946ef20'
																: '#10b98120',
												color:
													specimen.status ===
														'macroscopic_review'
														? '#8b5cf6'
														: specimen.status ===
															'processing'
															? '#d97706'
															: specimen.status ===
																'microscopic_review'
																? '#d946ef'
																: '#059669',
												border: `1px solid ${specimen.status === 'macroscopic_review' ? '#8b5cf630' : specimen.status === 'processing' ? '#d9770630' : specimen.status === 'microscopic_review' ? '#d946ef30' : '#05966930'}`,
											}}
										>
											{specimen.status ===
												'macroscopic_review'
												? 'Macroscopía'
												: specimen.status ===
													'processing'
													? 'Procesando'
													: specimen.status ===
														'microscopic_review'
														? 'Microscopía'
														: 'Finalizado'}
										</span>
										{hasCuttingsPermission && (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-7 w-7 cursor-pointer text-violet-600 hover:bg-violet-100 hover:text-violet-700 dark:text-violet-400 dark:hover:bg-violet-900/30"
												onClick={() =>
													setIsManageCuttingsOpen(
														true,
													)
												}
												title="Gestionar Cortes"
											>
												<Scissors className="h-4 w-4" />
											</Button>
										)}
									</div>
									<div className="flex items-center gap-2">
										<span className="text-[10px] tracking-tight text-muted-foreground uppercase">
											Su acceso:
										</span>
										<span
											className="text-[11px] font-bold tracking-wider uppercase"
											style={{
												color: accessBadgeStyle.color,
											}}
										>
											{accessBadgeLabel}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Sticky Contextual Formatting Toolbar */}
						{activeEditor && (
							<div className="sticky top-[93px] z-10 bg-background/95 transition-all duration-205">
								<div className="justify-strech flex items-center border-b border-border bg-muted/40 px-6">
									<div className="flex min-h-[36px] w-full justify-between overflow-x-auto">
										<EditorToolbar
											editor={activeEditor}
											specimenSequenceCode={
												specimen.sequence_code
											}
											reportId={report?.id ?? 0}
											field={activeField}
											isSheetOpen={isAISheetOpen}
											onSheetOpenChange={
												updateAISheetOpen
											}
											onPopoverOpenChange={
												updatePopoverOpen
											}
											isDictationSheetOpen={
												isDictationSheetOpen
											}
											onDictationSheetOpenChange={
												updateDictationSheetOpen
											}
										/>
									</div>

									{activeField && (
										<div className="flex h-[36px] items-center">
											<div className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-semibold">
												<div
													className={cn(
														'h-2 w-2 rounded-full',
														activeField ===
														'diagnosis' &&
														'animate-pulse bg-blue-500',
														activeField ===
														'macroscopy' &&
														'animate-pulse bg-violet-500',
														activeField ===
														'microscopy' &&
														'animate-pulse bg-fuchsia-500',
													)}
												/>
												<span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
													{activeField === 'diagnosis'
														? 'Diagnóstico'
														: activeField ===
															'macroscopy'
															? 'Macroscopía'
															: 'Microscopía'}
												</span>
											</div>
										</div>
									)}
								</div>
							</div>
						)}

						<div className="flex flex-col gap-5 p-6">
							{/* Specimen and Customer Summary Card */}
							<div className="relative rounded-xl border border-border/80 bg-card p-5 shadow-xs">
								<div className="mb-3 flex items-center justify-between">
									<h3 className="text-md flex items-center gap-2 font-semibold text-primary">
										<UserRound className="h-4 w-4" />{' '}
										Resumen de Paciente y Muestra{' '}
										{specimen.sequence_code}
									</h3>
									<div className="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											onClick={() =>
												setIsSpecimenSheetOpen(true)
											}
											className="h-7 w-7 cursor-pointer rounded-full text-muted-foreground hover:bg-primary/5 hover:text-primary"
											title="Ver detalles de la muestra"
										>
											<Eye className="h-4 w-4" />
										</Button>
										{(canEditSpecimen ||
											canEditCustomer ||
											canEditReferrer) && (
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 cursor-pointer rounded-full text-muted-foreground hover:bg-primary/5 hover:text-primary"
															title="Acciones de edición"
														>
															<MoreVertical className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														{canEditSpecimen && (
															<DropdownMenuItem
																onClick={() =>
																	setIsEditSpecimenOpen(
																		true,
																	)
																}
																className="cursor-pointer"
															>
																<Edit className="mr-2 h-4 w-4" />
																<span>
																	Editar Muestra
																</span>
															</DropdownMenuItem>
														)}
														{canEditCustomer && (
															<DropdownMenuItem
																onClick={() =>
																	setIsEditCustomerOpen(
																		true,
																	)
																}
																className="cursor-pointer"
															>
																<UserRound className="mr-2 h-4 w-4" />
																<span>
																	Editar Paciente
																</span>
															</DropdownMenuItem>
														)}
														{canEditReferrer && (
															<DropdownMenuItem
																onClick={() =>
																	setIsEditReferrerOpen(
																		true,
																	)
																}
																className="cursor-pointer"
															>
																<UserPlus className="mr-2 h-4 w-4" />
																<span>
																	Editar Remitente
																</span>
															</DropdownMenuItem>
														)}
													</DropdownMenuContent>
												</DropdownMenu>
											)}
									</div>
								</div>
								<div className="mb-3 grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
									<div className="space-y-2">
										<p>
											<span className="font-medium text-muted-foreground">
												Paciente:
											</span>{' '}
											<strong className="text-card-foreground">
												{
													specimen.customer_relation
														.name
												}{' '}
												(
												{specimen.customer_relation
													.type === 'empresa'
													? 'Empresa'
													: 'Cliente'}
												)
											</strong>
										</p>
										<p>
											<span className="font-medium text-muted-foreground">
												Edad / Sexo:
											</span>{' '}
											<strong className="text-card-foreground">
												{specimen.customer_relation
													.age ?? 'N/A'}{' '}
												años (
												{
													specimen.customer_relation
														.gender
												}
												)
											</strong>
										</p>
										<p>
											<span className="font-medium text-muted-foreground">
												Médico Remitente:
											</span>{' '}
											<strong className="text-card-foreground">
												{
													specimen.referrer_relation
														.name
												}
											</strong>
										</p>
									</div>
									<div className="space-y-2">
										<p>
											<span className="font-medium text-muted-foreground">
												Tipo:
											</span>{' '}
											<strong className="text-card-foreground">
												{specimen.type.name} -{' '}
												{specimen.examination.name}
											</strong>
										</p>
										<p>
											<span className="font-medium text-muted-foreground">
												Diagnóstico Clínico:
											</span>{' '}
											<strong className="text-card-foreground">
												{specimen.diagnosis || 'N/A'}
											</strong>
										</p>
										<p>
											<span className="font-medium text-muted-foreground">
												Sitio Anatómico:
											</span>{' '}
											<strong className="text-card-foreground">
												{specimen.anatomic_site ||
													'N/A'}
											</strong>
										</p>
									</div>
								</div>

								<div className="flex w-full flex-row flex-nowrap items-center justify-stretch gap-5 pt-3">
									<div className="flex w-full flex-col items-start gap-1.5">
										<label
											htmlFor="report-date"
											className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-foreground"
										>
											<Calendar className="h-4 w-4 text-muted-foreground" />{' '}
											Fecha de Recepción
										</label>
										<div className="w-full">
											<DatePicker
												value={reportDate}
												disabled={
													(isFinished &&
														!sessionEditingEnabled) ||
													(!hasMacroAccess &&
														!hasMicroAccess)
												}
												onChange={handleUpdateDate}
											/>
										</div>
									</div>
									<div className="flex w-full flex-col items-start gap-1.5">
										<label
											htmlFor="sample-collection-date"
											className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-foreground"
										>
											<Calendar className="h-4 w-4 text-muted-foreground" />{' '}
											Fecha de la toma
										</label>
										<div className="w-full">
											<DatePicker
												value={sampleCollectionDate}
												disabled={
													(isFinished &&
														!sessionEditingEnabled) ||
													(!hasMacroAccess &&
														!hasMicroAccess)
												}
												onChange={
													handleUpdateSampleCollectionDate
												}
											/>
										</div>
									</div>
									<div className="flex w-full flex-col items-start gap-1.5">
										<label
											htmlFor="finalization-date"
											className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-foreground"
										>
											<Calendar className="h-4 w-4 text-muted-foreground" />{' '}
											Fecha de finalización
										</label>
										<div className="w-full">
											<DatePicker
												value={finalizationDate}
												disabled={
													(isFinished &&
														!sessionEditingEnabled) ||
													(!hasMacroAccess &&
														!hasMicroAccess)
												}
												onChange={
													handleUpdateFinalizationDate
												}
											/>
										</div>
									</div>
								</div>
							</div>

							<SpecimenInsumosCard
								specimen={specimen}
								products={products}
								isFinished={isFinished}
								sessionEditingEnabled={sessionEditingEnabled}
								hasMacroAccess={hasMacroAccess}
								hasMicroAccess={hasMicroAccess}
							/>

							{/* Template Selector */}
							<div className="flex w-full flex-row flex-nowrap items-end gap-2.5">
								{/* Seleccionar Plantilla de Reporte on the same line */}
								{templates && templates.length > 0 && (
									<div className="flex max-w-[calc(100%-110px)] flex-col items-start gap-1.5">
										<span className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-foreground">
											<FileText className="h-4 w-4 text-muted-foreground" />{' '}
											Plantilla
										</span>
										<div className="w-full">
											<Select
												value={editorTemplateId}
												onValueChange={
													setEditorTemplateId
												}
												disabled={
													isFinished ||
													(!hasMacroAccess &&
														!hasMicroAccess)
												}
											>
												<SelectTrigger className="h-10 w-full bg-card px-3 text-sm text-foreground">
													<SelectValue placeholder="Seleccione plantilla..." />
												</SelectTrigger>
												<SelectContent
													className="max-h-[300px]"
													align="start"
												>
													{templates.map((temp) => (
														<SelectItem
															key={temp.id}
															value={String(
																temp.id,
															)}
															className="group"
														>
															<div className="flex flex-row flex-nowrap gap-3 py-1 text-left">
																<span className="text-xs font-semibold text-foreground group-focus:text-white group-data-[highlighted]:text-white">
																	{temp.name ||
																		'Plantilla sin nombre'}
																</span>
																<span className="mt-0.5 text-[10px] text-muted-foreground group-focus:text-white/80 group-data-[highlighted]:text-white/80">
																	{
																		temp
																			.specimen_type
																			?.name
																	}{' '}
																	-{' '}
																	{
																		temp
																			.specimen_type_examination
																			?.name
																	}{' '}
																	(
																	{temp.user
																		?.name ||
																		'Sin propietario'}
																	)
																</span>
															</div>
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>
								)}
								{templates && templates.length > 0 && (
									<>
										{editorTemplateId && !isFinished && (
											<Button
												variant="default"
												onClick={() =>
													setIsApplyTemplateOpen(true)
												}
												className="flex h-9 w-[110px] items-center gap-2 bg-primary px-5 text-sm text-primary-foreground hover:bg-primary/95"
											>
												<Check className="h-4 w-4" />
												Aplicar
											</Button>
										)}
									</>
								)}
							</div>

							{/* Confirmation dialog for applying a new template */}
							<AlertDialog
								open={isApplyTemplateOpen}
								onOpenChange={setIsApplyTemplateOpen}
							>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											¿Está seguro de que desea aplicar la
											plantilla?
										</AlertDialogTitle>
										<AlertDialogDescription className="space-y-3 text-left">
											<span>
												Esto colocará el contenido de la
												plantilla al inicio de cada
												editor y mantendrá el contenido
												actual del reporte a
												continuación.
											</span>
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>
											Cancelar
										</AlertDialogCancel>
										<AlertDialogAction
											onClick={handleApplyTemplate}
											className="bg-primary text-primary-foreground hover:bg-primary/90"
										>
											Aplicar plantilla
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>

							<DragDropContext onDragEnd={handleDragEnd}>
								<Droppable droppableId="report-editors">
									{(provided) => (
										<div
											{...provided.droppableProps}
											ref={provided.innerRef}
											className="space-y-6"
										>
											{sectionsOrder.map(
												(section, index) => {
													const isClin =
														section.key ===
														'clinical_details_html';
													const isDiag =
														section.key ===
														'diagnosis_html';
													const isOpenText =
														section.key ===
														'open_text_html';
													const isMacro =
														section.key ===
														'macroscopy_html';
													const isMicro =
														section.key ===
														'microscopy_html';
													const isComm =
														section.key ===
														'comments_notes_html';
													const isProt =
														section.key ===
														'protocols_html';
													const isLeg =
														section.key ===
														'legend_html';

													return (
														<Draggable
															key={section.key}
															draggableId={
																section.key
															}
															index={index}
															isDragDisabled={
																!hasMacroAccess &&
																!hasMicroAccess
															}
														>
															{(
																provided,
																snapshot,
															) => (
																<div
																	ref={
																		provided.innerRef
																	}
																	{...provided.draggableProps}
																	className={cn(
																		'space-y-3 rounded-xl border border-transparent transition-all duration-200',
																		snapshot.isDragging &&
																		'rotate-1 border-primary/20 bg-card/65 shadow-lg ring-1 ring-primary/10 backdrop-blur-xs',
																	)}
																>
																	{isClin && (
																		<>
																			<div
																				{...provided.dragHandleProps}
																				className="flex cursor-grab items-center justify-between rounded-r-md border-l-4 border-emerald-500/85 py-0.5 pr-2 pl-2 transition-colors select-none hover:bg-slate-100/50 active:cursor-grabbing dark:hover:bg-slate-800/30"
																			>
																				<div className="flex items-center gap-1.5">
																					<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
																					<h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
																						<FileText className="h-4 w-4 text-emerald-500" />{' '}
																						Datos
																						Clínicos
																					</h3>
																				</div>
																				<TooltipProvider>
																					<Tooltip>
																						<TooltipTrigger
																							asChild
																						>
																							<div
																								className="flex items-center gap-1.5"
																								onClick={(
																									e,
																								) =>
																									e.stopPropagation()
																								}
																							>
																								<Switch
																									id="toggle-clinical_details_html"
																									checked={
																										headingsToggles[
																										'clinical_details_html'
																										] ??
																										true
																									}
																									onCheckedChange={(
																										v,
																									) =>
																										handleHeadingToggle(
																											'clinical_details_html',
																											v,
																										)
																									}
																									className="scale-75"
																									disabled={
																										!isAssigned
																									}
																								/>
																							</div>
																						</TooltipTrigger>
																						<TooltipContent side="top">
																							{(headingsToggles[
																								'clinical_details_html'
																							] ??
																								true)
																								? 'Ocultar título en PDF'
																								: 'Mostrar título en PDF'}
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>
																			</div>

																			{(![
																				'finalized',
																				'delivered',
																			].includes(
																				specimen.status,
																			) ||
																				(isFinished &&
																					sessionEditingEnabled)) &&
																				(hasMacroAccess ||
																					hasMicroAccess) ? (
																				<CollaborativeEditor
																					reportId={
																						report.id
																					}
																					field="clinical_details"
																					userName={
																						auth
																							.user
																							.name
																					}
																					cursorColor={
																						auth
																							.user
																							.cursor_color ||
																						'#10b981'
																					}
																					initialContent={
																						clinicalDetailsHtml
																					}
																					onUpdate={
																						setClinicalDetailsHtml
																					}
																					onUsersChange={
																						setClinicalDetailsUsers
																					}
																					specimenSequenceCode={
																						specimen.sequence_code
																					}
																					doc={
																						clinicalDetailsDoc
																					}
																					provider={
																						clinicalDetailsProvider
																					}
																					onFocus={(
																						editor,
																					) =>
																						handleEditorFocus(
																							editor,
																							'clinical_details',
																						)
																					}
																					onBlur={
																						handleEditorBlur
																					}
																				/>
																			) : (
																				<ReadOnlyEditor
																					content={
																						clinicalDetailsHtml
																					}
																				/>
																			)}
																		</>
																	)}

																	{isDiag && (
																		<>
																			<div
																				{...provided.dragHandleProps}
																				className="flex cursor-grab items-center justify-between rounded-r-md border-l-4 border-blue-500/80 py-0.5 pr-2 pl-2 transition-colors select-none hover:bg-slate-100/50 active:cursor-grabbing dark:hover:bg-slate-800/30"
																			>
																				<div className="flex items-center gap-1.5">
																					<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
																					<h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
																						<FileText className="h-4 w-4 text-blue-500" />{' '}
																						Diagnóstico
																						Patológico
																					</h3>
																				</div>
																				<TooltipProvider>
																					<Tooltip>
																						<TooltipTrigger
																							asChild
																						>
																							<div
																								className="flex items-center gap-1.5"
																								onClick={(
																									e,
																								) =>
																									e.stopPropagation()
																								}
																							>
																								<Switch
																									id="toggle-diagnosis_html"
																									checked={
																										headingsToggles[
																										'diagnosis_html'
																										] ??
																										true
																									}
																									onCheckedChange={(
																										v,
																									) =>
																										handleHeadingToggle(
																											'diagnosis_html',
																											v,
																										)
																									}
																									className="scale-75"
																									disabled={
																										!isAssigned
																									}
																								/>
																							</div>
																						</TooltipTrigger>
																						<TooltipContent side="top">
																							{(headingsToggles[
																								'diagnosis_html'
																							] ??
																								true)
																								? 'Ocultar título en PDF'
																								: 'Mostrar título en PDF'}
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>
																			</div>

																			{(![
																				'finalized',
																				'delivered',
																			].includes(
																				specimen.status,
																			) ||
																				(isFinished &&
																					sessionEditingEnabled)) &&
																				(hasMacroAccess ||
																					hasMicroAccess) ? (
																				<CollaborativeEditor
																					reportId={
																						report.id
																					}
																					field="diagnosis"
																					userName={
																						auth
																							.user
																							.name
																					}
																					cursorColor={
																						auth
																							.user
																							.cursor_color ||
																						'#3b82f6'
																					}
																					initialContent={
																						diagnosisHtml
																					}
																					onUpdate={
																						setDiagnosisHtml
																					}
																					onUsersChange={
																						setDiagnosisUsers
																					}
																					specimenSequenceCode={
																						specimen.sequence_code
																					}
																					doc={
																						diagnosisDoc
																					}
																					provider={
																						diagnosisProvider
																					}
																					onFocus={(
																						editor,
																					) =>
																						handleEditorFocus(
																							editor,
																							'diagnosis',
																						)
																					}
																					onBlur={
																						handleEditorBlur
																					}
																				/>
																			) : (
																				<ReadOnlyEditor
																					content={
																						diagnosisHtml
																					}
																				/>
																			)}
																		</>
																	)}

																	{isMacro && (
																		<>
																			<div
																				{...provided.dragHandleProps}
																				className="flex cursor-grab items-center justify-between rounded-r-md border-l-4 border-violet-500/80 py-0.5 pr-4 pl-2 transition-colors select-none hover:bg-slate-100/50 active:cursor-grabbing dark:hover:bg-slate-800/30"
																			>
																				<div className="flex items-center gap-1.5">
																					<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
																					<h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
																						<Microscope className="h-4 w-4 text-violet-500" />{' '}
																						Descripción
																						Macroscópica
																					</h3>
																				</div>
																				<div className="flex items-center gap-2">
																					<TooltipProvider>
																						<Tooltip>
																							<TooltipTrigger
																								asChild
																							>
																								<div
																									className="flex items-center gap-1.5"
																									onClick={(
																										e,
																									) =>
																										e.stopPropagation()
																									}
																								>
																									<Switch
																										id="toggle-macroscopy_html"
																										checked={
																											headingsToggles[
																											'macroscopy_html'
																											] ??
																											true
																										}
																										onCheckedChange={(
																											v,
																										) =>
																											handleHeadingToggle(
																												'macroscopy_html',
																												v,
																											)
																										}
																										className="scale-75"
																										disabled={
																											!isAssigned
																										}
																									/>
																								</div>
																							</TooltipTrigger>
																							<TooltipContent side="top">
																								{(headingsToggles[
																									'macroscopy_html'
																								] ??
																									true)
																									? 'Ocultar título en PDF'
																									: 'Mostrar título en PDF'}
																							</TooltipContent>
																						</Tooltip>
																					</TooltipProvider>
																					{hasCuttingsPermission && (
																						<Button
																							type="button"
																							variant="outline"
																							size="sm"
																							className="h-8 cursor-pointer gap-1.5 border-violet-500/30 text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:border-violet-500/20 dark:text-violet-400 dark:hover:bg-violet-500/10"
																							onClick={() =>
																								setIsManageCuttingsOpen(
																									true,
																								)
																							}
																						>
																							<Scissors className="h-3.5 w-3.5" />
																							<span>
																								Gestionar
																								Cortes
																							</span>
																						</Button>
																					)}
																				</div>
																			</div>

																			{isMacroscopyEditable ? (
																				<CollaborativeEditor
																					reportId={
																						report.id
																					}
																					field="macroscopy"
																					userName={
																						auth
																							.user
																							.name
																					}
																					cursorColor={
																						auth
																							.user
																							.cursor_color ||
																						'#8b5cf6'
																					}
																					initialContent={
																						macroscopyHtml
																					}
																					onUpdate={
																						setMacroscopyHtml
																					}
																					onUsersChange={
																						setMacroscopyUsers
																					}
																					specimenSequenceCode={
																						specimen.sequence_code
																					}
																					doc={
																						macroscopyDoc
																					}
																					provider={
																						macroscopyProvider
																					}
																					onFocus={(
																						editor,
																					) =>
																						handleEditorFocus(
																							editor,
																							'macroscopy',
																						)
																					}
																					onBlur={
																						handleEditorBlur
																					}
																				/>
																			) : (
																				<ReadOnlyEditor
																					content={
																						macroscopyHtml
																					}
																				/>
																			)}

																			{specimen.status ===
																				'macroscopic_review' && (
																					<div className="flex justify-end pt-2">
																						<AlertDialog>
																							<AlertDialogTrigger
																								asChild
																							>
																								<Button className="cursor-pointer bg-violet-600 font-semibold text-white shadow-sm hover:bg-violet-700">
																									Completar
																									Macroscopía
																									y
																									Enviar
																									a
																									Procesamiento
																								</Button>
																							</AlertDialogTrigger>
																							<AlertDialogContent>
																								<AlertDialogHeader>
																									<AlertDialogTitle>
																										¿Confirmar
																										completado
																										de
																										macroscopía?
																									</AlertDialogTitle>
																									<AlertDialogDescription>
																										Esta
																										acción
																										marcará
																										la
																										descripción
																										macroscópica
																										como
																										completada
																										y
																										enviará
																										la
																										muestra
																										a
																										la
																										fase
																										de
																										procesamiento
																										en
																										laboratorio.
																										El
																										estado
																										de
																										la
																										muestra
																										cambiará
																										a{' '}
																										<strong>
																											Procesando
																										</strong>

																										.
																									</AlertDialogDescription>
																								</AlertDialogHeader>
																								<AlertDialogFooter>
																									<AlertDialogCancel>
																										Cancelar
																									</AlertDialogCancel>
																									<AlertDialogAction
																										onClick={() =>
																											handleTransitionState(
																												'processing',
																											)
																										}
																										className="cursor-pointer bg-violet-600 text-white hover:bg-violet-700"
																									>
																										Confirmar
																										y
																										Enviar
																									</AlertDialogAction>
																								</AlertDialogFooter>
																							</AlertDialogContent>
																						</AlertDialog>
																					</div>
																				)}
																		</>
																	)}

																	{isMicro && (
																		<>
																			<div
																				{...provided.dragHandleProps}
																				className="flex cursor-grab items-center justify-between rounded-r-md border-l-4 border-fuchsia-500/80 py-0.5 pr-2 pl-2 transition-colors select-none hover:bg-slate-100/50 active:cursor-grabbing dark:hover:bg-slate-800/30"
																			>
																				<div className="flex items-center gap-1.5">
																					<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
																					<h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
																						<Microscope className="h-4 w-4 text-fuchsia-500" />{' '}
																						Descripción
																						Microscópica
																					</h3>
																				</div>
																				<TooltipProvider>
																					<Tooltip>
																						<TooltipTrigger
																							asChild
																						>
																							<div
																								className="flex items-center gap-1.5"
																								onClick={(
																									e,
																								) =>
																									e.stopPropagation()
																								}
																							>
																								<Switch
																									id="toggle-microscopy_html"
																									checked={
																										headingsToggles[
																										'microscopy_html'
																										] ??
																										true
																									}
																									onCheckedChange={(
																										v,
																									) =>
																										handleHeadingToggle(
																											'microscopy_html',
																											v,
																										)
																									}
																									className="scale-75"
																									disabled={
																										!isAssigned
																									}
																								/>
																							</div>
																						</TooltipTrigger>
																						<TooltipContent side="top">
																							{(headingsToggles[
																								'microscopy_html'
																							] ??
																								true)
																								? 'Ocultar título en PDF'
																								: 'Mostrar título en PDF'}
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>
																			</div>

																			{(specimen.status ===
																				'received' ||
																				specimen.status ===
																				'macroscopic_review') && (
																					<div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center">
																						<AlertCircle className="mb-2 h-6 w-6 text-muted-foreground" />
																						<h4 className="text-xs font-semibold text-muted-foreground">
																							Fase
																							no
																							iniciada
																						</h4>
																						<p className="mt-1 max-w-xs text-[10px] text-muted-foreground">
																							Esta
																							sección
																							estará
																							disponible
																							una
																							vez
																							finalizada
																							la
																							descripción
																							macroscópica
																							y
																							completada
																							la
																							fase
																							de
																							procesamiento.
																						</p>
																					</div>
																				)}

																			{specimen.status ===
																				'processing' && (
																					<div className="relative flex min-h-[160px] flex-col items-center justify-center overflow-hidden rounded-lg border bg-muted/10 p-6 text-center">
																						<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 p-4 backdrop-blur-xs">
																							<h4 className="mb-2 text-xs font-bold">
																								Fase
																								de
																								Procesamiento
																								en
																								Curso
																							</h4>
																							<p className="mb-4 max-w-xs text-[10px] text-muted-foreground">
																								Haga
																								clic
																								a
																								continuación
																								para
																								pasar
																								la
																								muestra
																								a
																								revisión
																								microscópica
																								e
																								iniciar
																								la
																								redacción
																								colaborativa
																								del
																								reporte.
																							</p>
																							<AlertDialog>
																								<AlertDialogTrigger
																									asChild
																								>
																									<Button className="cursor-pointer bg-fuchsia-600 font-semibold text-white shadow-sm hover:bg-fuchsia-700">
																										Iniciar
																										Fase
																										de
																										Microscopía
																									</Button>
																								</AlertDialogTrigger>
																								<AlertDialogContent>
																									<AlertDialogHeader>
																										<AlertDialogTitle>
																											¿Iniciar
																											fase
																											de
																											microscopía?
																										</AlertDialogTitle>
																										<AlertDialogDescription>
																											Esta
																											acción
																											dará
																											por
																											finalizado
																											el
																											procesamiento
																											físico/químico
																											en
																											laboratorio
																											y
																											habilitará
																											la
																											edición
																											de
																											la
																											descripción
																											microscópica
																											y
																											el
																											diagnóstico
																											de
																											forma
																											colaborativa.
																											El
																											estado
																											cambiará
																											a{' '}
																											<strong>
																												Microscopía
																											</strong>

																											.
																										</AlertDialogDescription>
																									</AlertDialogHeader>
																									<AlertDialogFooter>
																										<AlertDialogCancel>
																											Cancelar
																										</AlertDialogCancel>
																										<AlertDialogAction
																											onClick={() =>
																												handleTransitionState(
																													'microscopic_review',
																												)
																											}
																											className="cursor-pointer bg-fuchsia-600 text-white hover:bg-fuchsia-700"
																										>
																											Iniciar
																											Microscopía
																										</AlertDialogAction>
																									</AlertDialogFooter>
																								</AlertDialogContent>
																							</AlertDialog>
																						</div>
																					</div>
																				)}

																			{(specimen.status ===
																				'microscopic_review' ||
																				specimen.status ===
																				'finalized' ||
																				specimen.status ===
																				'delivered') && (
																					<>
																						{isMicroscopyEditable ? (
																							<CollaborativeEditor
																								reportId={
																									report.id
																								}
																								field="microscopy"
																								userName={
																									auth
																										.user
																										.name
																								}
																								cursorColor={
																									auth
																										.user
																										.cursor_color ||
																									'#d946ef'
																								}
																								initialContent={
																									microscopyHtml
																								}
																								onUpdate={
																									setMicroscopyHtml
																								}
																								onUsersChange={
																									setMicroscopyUsers
																								}
																								specimenSequenceCode={
																									specimen.sequence_code
																								}
																								doc={
																									microscopyDoc
																								}
																								provider={
																									microscopyProvider
																								}
																								onFocus={(
																									editor,
																								) =>
																									handleEditorFocus(
																										editor,
																										'microscopy',
																									)
																								}
																								onBlur={
																									handleEditorBlur
																								}
																							/>
																						) : (
																							<ReadOnlyEditor
																								content={
																									microscopyHtml
																								}
																							/>
																						)}

																						{(specimen.status ===
																							'microscopic_review' ||
																							(isFinished &&
																								sessionEditingEnabled)) && (
																								<div className="flex justify-end pt-2">
																									<Button
																										onClick={
																											handleStartMicroscopyFinalization
																										}
																										disabled={
																											isGeneratingPdf
																										}
																										className="cursor-pointer gap-2 bg-fuchsia-600 font-semibold text-white shadow-sm hover:bg-fuchsia-700"
																									>
																										{isGeneratingPdf ? (
																											<>
																												<Loader2 className="h-4 w-4 animate-spin" />
																												<span>
																													Generando
																													previsualización...
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
																	)}

																	{isComm && (
																		<>
																			<div
																				{...provided.dragHandleProps}
																				className="flex cursor-grab items-center justify-between rounded-r-md border-l-4 border-amber-500/85 py-0.5 pr-2 pl-2 transition-colors select-none hover:bg-slate-100/50 active:cursor-grabbing dark:hover:bg-slate-800/30"
																			>
																				<div className="flex items-center gap-1.5">
																					<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
																					<h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
																						<FileText className="h-4 w-4 text-amber-500" />{' '}
																						Comentarios
																						y
																						Notas
																					</h3>
																				</div>
																				<TooltipProvider>
																					<Tooltip>
																						<TooltipTrigger
																							asChild
																						>
																							<div
																								className="flex items-center gap-1.5"
																								onClick={(
																									e,
																								) =>
																									e.stopPropagation()
																								}
																							>
																								<Switch
																									id="toggle-comments_notes_html"
																									checked={
																										headingsToggles[
																										'comments_notes_html'
																										] ??
																										true
																									}
																									onCheckedChange={(
																										v,
																									) =>
																										handleHeadingToggle(
																											'comments_notes_html',
																											v,
																										)
																									}
																									className="scale-75"
																									disabled={
																										!isAssigned
																									}
																								/>
																							</div>
																						</TooltipTrigger>
																						<TooltipContent side="top">
																							{(headingsToggles[
																								'comments_notes_html'
																							] ??
																								true)
																								? 'Ocultar título en PDF'
																								: 'Mostrar título en PDF'}
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>
																			</div>

																			{(![
																				'finalized',
																				'delivered',
																			].includes(
																				specimen.status,
																			) ||
																				(isFinished &&
																					sessionEditingEnabled)) &&
																				(hasMacroAccess ||
																					hasMicroAccess) ? (
																				<CollaborativeEditor
																					reportId={
																						report.id
																					}
																					field="comments_notes"
																					userName={
																						auth
																							.user
																							.name
																					}
																					cursorColor={
																						auth
																							.user
																							.cursor_color ||
																						'#f59e0b'
																					}
																					initialContent={
																						commentsNotesHtml
																					}
																					onUpdate={
																						setCommentsNotesHtml
																					}
																					onUsersChange={
																						setCommentsNotesUsers
																					}
																					specimenSequenceCode={
																						specimen.sequence_code
																					}
																					doc={
																						commentsNotesDoc
																					}
																					provider={
																						commentsNotesProvider
																					}
																					onFocus={(
																						editor,
																					) =>
																						handleEditorFocus(
																							editor,
																							'comments_notes',
																						)
																					}
																					onBlur={
																						handleEditorBlur
																					}
																				/>
																			) : (
																				<ReadOnlyEditor
																					content={
																						commentsNotesHtml
																					}
																				/>
																			)}
																		</>
																	)}

																	{isProt && (
																		<>
																			<div
																				{...provided.dragHandleProps}
																				className="flex cursor-grab items-center justify-between rounded-r-md border-l-4 border-blue-600/85 py-0.5 pr-2 pl-2 transition-colors select-none hover:bg-slate-100/50 active:cursor-grabbing dark:hover:bg-slate-800/30"
																			>
																				<div className="flex items-center gap-1.5">
																					<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
																					<h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
																						<FileText className="h-4 w-4 text-blue-600" />{' '}
																						Protocolos
																					</h3>
																				</div>
																				<TooltipProvider>
																					<Tooltip>
																						<TooltipTrigger
																							asChild
																						>
																							<div
																								className="flex items-center gap-1.5"
																								onClick={(
																									e,
																								) =>
																									e.stopPropagation()
																								}
																							>
																								<Switch
																									id="toggle-protocols_html"
																									checked={
																										headingsToggles[
																										'protocols_html'
																										] ??
																										true
																									}
																									onCheckedChange={(
																										v,
																									) =>
																										handleHeadingToggle(
																											'protocols_html',
																											v,
																										)
																									}
																									className="scale-75"
																									disabled={
																										!isAssigned
																									}
																								/>
																							</div>
																						</TooltipTrigger>
																						<TooltipContent side="top">
																							{(headingsToggles[
																								'protocols_html'
																							] ??
																								true)
																								? 'Ocultar título en PDF'
																								: 'Mostrar título en PDF'}
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>
																			</div>

																			{(![
																				'finalized',
																				'delivered',
																			].includes(
																				specimen.status,
																			) ||
																				(isFinished &&
																					sessionEditingEnabled)) &&
																				(hasMacroAccess ||
																					hasMicroAccess) ? (
																				<CollaborativeEditor
																					reportId={
																						report.id
																					}
																					field="protocols"
																					userName={
																						auth
																							.user
																							.name
																					}
																					cursorColor={
																						auth
																							.user
																							.cursor_color ||
																						'#2563eb'
																					}
																					initialContent={
																						protocolsHtml
																					}
																					onUpdate={
																						setProtocolsHtml
																					}
																					onUsersChange={
																						setProtocolsUsers
																					}
																					specimenSequenceCode={
																						specimen.sequence_code
																					}
																					doc={
																						protocolsDoc
																					}
																					provider={
																						protocolsProvider
																					}
																					onFocus={(
																						editor,
																					) =>
																						handleEditorFocus(
																							editor,
																							'protocols',
																						)
																					}
																					onBlur={
																						handleEditorBlur
																					}
																				/>
																			) : (
																				<ReadOnlyEditor
																					content={
																						protocolsHtml
																					}
																				/>
																			)}
																		</>
																	)}

																	{isLeg && (
																		<>
																			<div
																				{...provided.dragHandleProps}
																				className="flex cursor-grab items-center justify-between rounded-r-md border-l-4 border-slate-500/85 py-0.5 pr-2 pl-2 transition-colors select-none hover:bg-slate-100/50 active:cursor-grabbing dark:hover:bg-slate-800/30"
																			>
																				<div className="flex items-center gap-1.5">
																					<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
																					<h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
																						<FileText className="h-4 w-4 text-slate-500" />{' '}
																						Leyenda
																					</h3>
																				</div>
																				<TooltipProvider>
																					<Tooltip>
																						<TooltipTrigger
																							asChild
																						>
																							<div
																								className="flex items-center gap-1.5"
																								onClick={(
																									e,
																								) =>
																									e.stopPropagation()
																								}
																							>
																								<Switch
																									id="toggle-legend_html"
																									checked={
																										headingsToggles[
																										'legend_html'
																										] ??
																										true
																									}
																									onCheckedChange={(
																										v,
																									) =>
																										handleHeadingToggle(
																											'legend_html',
																											v,
																										)
																									}
																									className="scale-75"
																									disabled={
																										!isAssigned
																									}
																								/>
																							</div>
																						</TooltipTrigger>
																						<TooltipContent side="top">
																							{(headingsToggles[
																								'legend_html'
																							] ??
																								true)
																								? 'Ocultar título en PDF'
																								: 'Mostrar título en PDF'}
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>
																			</div>

																			{(![
																				'finalized',
																				'delivered',
																			].includes(
																				specimen.status,
																			) ||
																				(isFinished &&
																					sessionEditingEnabled)) &&
																				(hasMacroAccess ||
																					hasMicroAccess) ? (
																				<CollaborativeEditor
																					reportId={
																						report.id
																					}
																					field="legend"
																					userName={
																						auth
																							.user
																							.name
																					}
																					cursorColor={
																						auth
																							.user
																							.cursor_color ||
																						'#64748b'
																					}
																					initialContent={
																						legendHtml
																					}
																					onUpdate={
																						setLegendHtml
																					}
																					onUsersChange={
																						setLegendUsers
																					}
																					specimenSequenceCode={
																						specimen.sequence_code
																					}
																					doc={
																						legendDoc
																					}
																					provider={
																						legendProvider
																					}
																					onFocus={(
																						editor,
																					) =>
																						handleEditorFocus(
																							editor,
																							'legend',
																						)
																					}
																					onBlur={
																						handleEditorBlur
																					}
																				/>
																			) : (
																				<ReadOnlyEditor
																					content={
																						legendHtml
																					}
																				/>
																			)}
																		</>
																	)}

																	{isOpenText && (
																		<>
																			<div
																				{...provided.dragHandleProps}
																				className="flex cursor-grab items-center justify-between rounded-r-md border-l-4 border-amber-500/85 py-0.5 pr-2 pl-2 transition-colors select-none hover:bg-slate-100/50 active:cursor-grabbing dark:hover:bg-slate-800/30"
																			>
																				<div className="mr-4 flex w-full items-center gap-1.5">
																					<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
																					<FileText className="h-4 w-4 shrink-0 text-amber-500" />
																					{(![
																						'finalized',
																						'delivered',
																					].includes(
																						specimen.status,
																					) ||
																						(isFinished &&
																							sessionEditingEnabled)) &&
																						(hasMacroAccess ||
																							hasMicroAccess) ? (
																						<input
																							type="text"
																							value={
																								openTextLabel
																							}
																							onChange={(
																								e,
																							) =>
																								handleOpenTextLabelChange(
																									e
																										.target
																										.value,
																								)
																							}
																							className="w-full border-b border-transparent bg-transparent px-1 py-0.5 text-base font-bold tracking-tight text-slate-800 hover:border-slate-300 focus:border-primary focus:outline-hidden dark:text-slate-200"
																							placeholder="Texto Libre"
																							onClick={(
																								e,
																							) =>
																								e.stopPropagation()
																							}
																						/>
																					) : (
																						<h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
																							{
																								openTextLabel
																							}
																						</h3>
																					)}
																				</div>
																				<TooltipProvider>
																					<Tooltip>
																						<TooltipTrigger
																							asChild
																						>
																							<div
																								className="flex items-center gap-1.5"
																								onClick={(
																									e,
																								) =>
																									e.stopPropagation()
																								}
																							>
																								<Switch
																									id="toggle-open_text_html"
																									checked={
																										headingsToggles[
																										'open_text_html'
																										] ??
																										true
																									}
																									onCheckedChange={(
																										v,
																									) =>
																										handleHeadingToggle(
																											'open_text_html',
																											v,
																										)
																									}
																									className="scale-75"
																									disabled={
																										!isAssigned
																									}
																								/>
																							</div>
																						</TooltipTrigger>
																						<TooltipContent side="top">
																							{(headingsToggles[
																								'open_text_html'
																							] ??
																								true)
																								? 'Ocultar título en PDF'
																								: 'Mostrar título en PDF'}
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>
																			</div>

																			{(![
																				'finalized',
																				'delivered',
																			].includes(
																				specimen.status,
																			) ||
																				(isFinished &&
																					sessionEditingEnabled)) &&
																				(hasMacroAccess ||
																					hasMicroAccess) ? (
																				<CollaborativeEditor
																					reportId={
																						report.id
																					}
																					field="open_text"
																					userName={
																						auth
																							.user
																							.name
																					}
																					cursorColor={
																						auth
																							.user
																							.cursor_color ||
																						'#d97706'
																					}
																					initialContent={
																						openTextHtml
																					}
																					onUpdate={
																						setOpenTextHtml
																					}
																					onFocus={(
																						editor,
																					) =>
																						handleEditorFocus(
																							editor,
																							'open_text',
																						)
																					}
																					onBlur={
																						handleEditorBlur
																					}
																					onUsersChange={
																						setOpenTextUsers
																					}
																					specimenSequenceCode={
																						specimen.sequence_code
																					}
																					doc={
																						openTextDoc!
																					}
																					provider={
																						openTextProvider!
																					}
																				/>
																			) : (
																				<ReadOnlyEditor
																					content={
																						openTextHtml
																					}
																				/>
																			)}
																		</>
																	)}
																</div>
															)}
														</Draggable>
													);
												},
											)}
											{provided.placeholder}
										</div>
									)}
								</Droppable>
							</DragDropContext>

							<div className="mt-8 space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
								<div className="flex items-center justify-between py-0.5 pr-2 transition-colors select-none">
									<div className="flex items-center gap-1.5">
										<FileText className="h-4 w-4 shrink-0 text-violet-500" />
										<h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
											Addendum
										</h3>
									</div>
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div
													className="flex items-center gap-1.5"
													onClick={(e) =>
														e.stopPropagation()
													}
												>
													<Switch
														id="toggle-addendum_html"
														checked={
															headingsToggles[
															'addendum_html'
															] ?? true
														}
														onCheckedChange={(v) =>
															handleHeadingToggle(
																'addendum_html',
																v,
															)
														}
														className="scale-75"
														disabled={!isAssigned}
													/>
												</div>
											</TooltipTrigger>
											<TooltipContent side="top">
												{(headingsToggles[
													'addendum_html'
												] ?? true)
													? 'Ocultar título en PDF'
													: 'Mostrar título en PDF'}
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>

								{(!['finalized', 'delivered'].includes(
									specimen.status,
								) ||
									(isFinished && sessionEditingEnabled)) &&
									(hasMacroAccess || hasMicroAccess) ? (
									<CollaborativeEditor
										reportId={report.id}
										field="addendum"
										userName={auth.user.name}
										cursorColor={
											auth.user.cursor_color || '#8b5cf6'
										}
										initialContent={addendumHtml}
										onUpdate={setAddendumHtml}
										onFocus={(editor) =>
											handleEditorFocus(
												editor,
												'addendum',
											)
										}
										onBlur={handleEditorBlur}
										onUsersChange={setAddendumUsers}
										specimenSequenceCode={
											specimen.sequence_code
										}
										doc={addendumDoc!}
										provider={addendumProvider!}
									/>
								) : (
									<ReadOnlyEditor content={addendumHtml} />
								)}
							</div>
						</div>
					</div>

					<LivePdfPreview
						specimen={specimen}
						isFinished={isFinished}
						isLoading={isLoading}
						totalPages={totalPages}
						renderPreviewPage={renderPreviewPage}
					/>
				</div>

				<SpecimenViewSheet
					key={
						isSpecimenSheetOpen
							? `view_${specimen.id}_${specimen.sample_collection_date || ''}_${specimen.report?.report_date || ''}`
							: 'closed_view'
					}
					specimen={specimen}
					open={isSpecimenSheetOpen}
					onOpenChange={setIsSpecimenSheetOpen}
					onEditClick={() => {
						setIsSpecimenSheetOpen(false);
						setIsEditSpecimenOpen(true);
					}}
					onAssignPathologistClick={() => setIsAssignSheetOpen(true)}
				/>

				<SpecimenPathologistSheet
					specimen={specimen}
					open={isAssignSheetOpen}
					onOpenChange={setIsAssignSheetOpen}
					pathologists={pathologists}
				/>

				<ManageCuttingsSheet
					specimen={specimen}
					cuttingCodes={cutting_codes}
					cuttingPrefixes={cutting_prefixes}
					cuttingSlideTypes={cutting_slide_types}
					users={users}
					open={isManageCuttingsOpen}
					onOpenChange={setIsManageCuttingsOpen}
					canEdit={isAssigned}
					onInsertConcatenatedString={handleInsertConcatenatedString}
				/>
				<CustomerSheet
					customer={specimen.customer_relation as any}
					open={isEditCustomerOpen}
					onOpenChange={setIsEditCustomerOpen}
					onSuccess={() => {
						router.reload({
							only: ['specimen'],
							onSuccess: () => {
								notifyCollaborationServer();
							},
						});
					}}
				/>

				<ReferrerSheet
					referrer={specimen.referrer_relation as any}
					referrerTypes={referrerTypes}
					open={isEditReferrerOpen}
					onOpenChange={setIsEditReferrerOpen}
					onSuccess={() => {
						router.reload({
							only: ['specimen'],
							onSuccess: () => {
								notifyCollaborationServer();
							},
						});
					}}
				/>

				<SpecimenSheet
					key={
						isEditSpecimenOpen
							? `edit_${specimen.id}_${specimen.sample_collection_date || ''}_${specimen.report?.report_date || ''}`
							: 'closed_edit'
					}
					specimen={specimen}
					open={isEditSpecimenOpen}
					onOpenChange={setIsEditSpecimenOpen}
					specimenTypes={specimenTypes}
					examinations={examinations}
					categories={categories}
					referrers={referrers}
					referrerTypes={referrerTypes}
					priorities={priorities}
					locations={locations}
					sequences={sequences}
					activeLocationId={activeLocationId}
					products={[]}
					banks={[]}
					showPaymentMethodEdition={false}
					onSuccess={() => {
						router.reload({
							only: ['specimen'],
							onSuccess: () => {
								notifyCollaborationServer();
							},
						});
					}}
				/>

				<MissingSignaturesDialog
					open={showSignatureWarning}
					onOpenChange={setShowSignatureWarning}
					unsignedPathologists={unsignedPathologists}
				/>

				<CompleteMicroscopyDialog
					open={showCompleteMicroscopyDialog}
					onOpenChange={setShowCompleteMicroscopyDialog}
					tempPdfUrl={tempPdfUrl}
					onConfirm={() => handleTransitionState('finalized')}
				/>
			</EditorLayout>
		</EditorRegistryContext.Provider>
	);
}
