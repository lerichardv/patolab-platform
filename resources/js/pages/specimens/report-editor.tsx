import { HocuspocusProvider } from '@hocuspocus/provider';
import { Head, router } from '@inertiajs/react';

import { ResizableNodeView, Extension, Node as TiptapNode } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Highlight from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useEditor, EditorContent, mergeAttributes, ReactNodeViewRenderer } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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
	Sheet as SheetIcon,
	AlertCircle,
	Eye,
	Save,
	Loader2,
	Maximize2,
	Lock,
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
} from 'lucide-react';
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
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from '@/components/ui/popover';
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetDescription,
} from '@/components/ui/sheet';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import EditorLayout from '@/layouts/editor-layout';
import { cn } from '@/lib/utils';
import AIDictationSheet from './ai-dictation-sheet';
import AIGrammarSheet from './ai-grammar-sheet';
import SpecimenPathologistSheet from './specimen-pathologist-sheet';
import SpecimenViewSheet from './specimen-view-sheet';
import ImageGridComponent, { ImageCropperDialog } from './image-grid-component';

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
		pivot?: {
			macroscopy_access: boolean;
			microscopy_access: boolean;
		};
	}>;
}

interface Props {
	specimen: Specimen;
	report: SpecimenReport | null;
	auth: {
		user: {
			id: number;
			name: string;
			cursor_color?: string;
		};
	};
	pathologists?: any[];
}

const editorStyles = `
  /* ── Base ── */
  .tiptap { outline: none; min-height: 160px; }

  /* ── Dictation Caret Style ── */
  .tiptap.is-dictating {
    caret-color: #dc2626 !important;
  }

  .dictation-caret-indicator {
    display: inline-block;
    width: 4px;
    height: 1.25em;
    background-color: #dc2626; /* red-600 */
    margin-left: -2px;
    margin-right: -2px;
    vertical-align: middle;
    position: relative;
    animation: dictation-blink 1s steps(2, start) infinite;
  }

  /* Blinking recording dot next to the caret */
  .dictation-caret-indicator::after {
    content: '';
    position: absolute;
    top: -3px;
    right: -4px;
    width: 6px;
    height: 6px;
    background-color: #ef4444;
    border-radius: 50%;
    animation: dictation-pulse 1.2s ease-out infinite;
  }

  @keyframes dictation-blink {
    to {
      visibility: hidden;
    }
  }

  @keyframes dictation-pulse {
    0% {
      transform: scale(0.8);
      opacity: 1;
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    70% {
      transform: scale(1.4);
      opacity: 0;
      box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
    }
    100% {
      transform: scale(0.8);
      opacity: 0;
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
  }

  /* ── Dictation Highlight Style ── */
  .tiptap .dictation-highlight {
    background-color: rgb(220 252 231) !important;
    color: rgb(21 128 61) !important;
    border-radius: 2px;
  }
  .dark .tiptap .dictation-highlight,
  [class*="dark"] .tiptap .dictation-highlight {
    background-color: rgba(20, 83, 45, 0.4) !important;
    color: rgb(74 222 128) !important;
    border-radius: 2px;
  }

  /* ── Paragraphs ── */
  .tiptap p { margin-bottom: 0.5rem; }
  .preview-content p { margin-bottom: 1.98mm; line-height: 3.97mm; text-align: justify; font-size: 2.51mm; }

  /* ── Headings ── */
  .tiptap h1 { font-size: 1.4rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; color: #111827; }
  .preview-content h1 { font-size: 4.23mm; font-weight: 700; margin-top: 3.97mm; margin-bottom: 2.65mm; color: #111827; line-height: 5.29mm; }
  
  .tiptap h2 { font-size: 1.2rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.4rem; color: #1f2937; }
  .preview-content h2 { font-size: 3.70mm; font-weight: 600; margin-top: 1.59mm; margin-bottom: 1.59mm; color: #1f2937; line-height: 4.76mm; }
  
  .tiptap h3 { font-size: 1.05rem; font-weight: 600; margin-top: 0.6rem; margin-bottom: 0.3rem; color: #374151; }
  .preview-content h3 { font-size: 3.18mm; font-weight: 600; margin-top: 1.98mm; margin-bottom: 1.98mm; color: #374151; line-height: 3.97mm; }
  
  .tiptap h4 { font-size: 0.95rem; font-weight: 600; margin-top: 0.5rem; margin-bottom: 0.25rem; color: #4b5563; }
  .preview-content h4 { font-size: 2.91mm; font-weight: 600; margin-top: 1.32mm; margin-bottom: 1.32mm; color: #4b5563; line-height: 3.97mm; }

  /* ── Lists ── */
  .tiptap ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
  .preview-content ul { list-style-type: disc; padding-left: 6.35mm; margin-bottom: 1.98mm; }
  
  .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
  .preview-content ol { list-style-type: decimal; padding-left: 6.35mm; margin-bottom: 1.98mm; }
  
  .tiptap li { margin-bottom: 0.15rem; }
  .preview-content li { margin-bottom: 0mm; line-height: 3.97mm; }

  /* ── Inline marks ── */
  .tiptap u, .preview-content u { text-decoration: underline; }
  .tiptap s, .preview-content s { text-decoration: line-through; }

  .tiptap mark {
    background-color: #fef08a;
    color: inherit;
    border-radius: 2px;
    padding: 0 2px;
  }
  .preview-content mark {
    background-color: #fef08a;
    color: inherit;
    border-radius: 0.53mm;
    padding: 0mm 0.53mm;
  }

  /* ── Blockquote ── */
  .tiptap blockquote {
    border-left: 3px solid #d1d5db;
    padding-left: 1rem;
    color: #6b7280;
    font-style: italic;
    margin: 0.5rem 0;
  }
  .preview-content blockquote {
    border-left: 0.79mm solid #d1d5db;
    padding-left: 4.23mm;
    color: #6b7280;
    font-style: italic;
    margin: 1.32mm 0mm;
  }

  /* ── Code ── */
  .tiptap code {
    background: #f3f4f6;
    border-radius: 3px;
    padding: 0.1em 0.3em;
    font-size: 0.85em;
    font-family: monospace;
  }
  .preview-content code {
    background: #f3f4f6;
    border-radius: 0.79mm;
    padding: 0.1em 0.3em;
    font-size: 0.85em;
    font-family: monospace;
  }

  /* ── Alignments ── */
  .tiptap .align-left, .preview-content .align-left { text-align: left; }
  .tiptap .align-center, .preview-content .align-center { text-align: center; }
  .tiptap .align-right, .preview-content .align-right { text-align: right; }
  .tiptap .align-justify, .preview-content .align-justify { text-align: justify; }

  /* ── Images ── */
  .tiptap img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 0.5rem 0;
    display: block;
  }
  .preview-content img {
    max-width: 100%;
    height: auto;
    border-radius: 1.06mm;
    margin: 1.32mm 0mm;
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

  /* ── Image Grid ── */
  .preview-content div[data-type="image-grid"] {
    display: grid;
    gap: 12px;
    margin: 1rem 0;
    width: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    background-color: rgba(248, 250, 252, 0.1);
  }

  .dark .preview-content div[data-type="image-grid"],
  [class*="dark"] .preview-content div[data-type="image-grid"] {
    border-color: rgba(30, 41, 59, 0.8);
    background-color: rgba(2, 6, 23, 0.05);
  }

  .preview-content div[data-type="image-grid"][data-columns="1"] {
    grid-template-columns: repeat(1, 1fr);
  }

  .preview-content div[data-type="image-grid"][data-columns="2"] {
    grid-template-columns: repeat(2, 1fr);
  }

  .preview-content div[data-type="image-grid"][data-columns="3"] {
    grid-template-columns: repeat(3, 1fr);
  }

  .preview-content div[data-type="image-grid"][data-columns="4"] {
    grid-template-columns: repeat(4, 1fr);
  }

  .preview-content div[data-type="image-grid"] img {
    max-width: 100% !important;
    height: auto !important;
    object-fit: cover;
    margin: 0 auto !important;
    display: block;
    border-radius: 4px;
  }

  /* Active Editor inside TipTap (React Node View container) */
  .tiptap .node-imageGrid {
    display: block;
    margin: 1rem 0;
    width: 100%;
  }

  .tiptap .node-imageGrid [data-node-view-content] {
    display: block;
    width: 100%;
  }

  .tiptap [data-type="image-grid"] [data-node-view-content-react] {
    display: grid;
    gap: 12px;
    width: 100%;
  }

  .tiptap [data-type="image-grid"][data-columns="1"] [data-node-view-content-react] {
    grid-template-columns: repeat(1, 1fr);
  }

  .tiptap [data-type="image-grid"][data-columns="2"] [data-node-view-content-react] {
    grid-template-columns: repeat(2, 1fr);
  }

  .tiptap [data-type="image-grid"][data-columns="3"] [data-node-view-content-react] {
    grid-template-columns: repeat(3, 1fr);
  }

  .tiptap [data-type="image-grid"][data-columns="4"] [data-node-view-content-react] {
    grid-template-columns: repeat(4, 1fr);
  }

  .tiptap [data-type="image-grid"] [data-node-view-content-react] > * {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 !important;
    width: 100%;
  }

  .tiptap [data-type="image-grid"] [data-node-view-content-react] img {
    max-width: 100% !important;
    height: auto !important;
    object-fit: cover;
    margin: 0 !important;
    border-radius: 4px;
  }

  /* Alignment styling for the resizable image wrapper in the editor */
  .tiptap [data-resize-container]:has(img.align-center),
  .tiptap [data-resize-container]:has(img[data-align="center"]),
  .tiptap .image-wrapper:has(img.align-center),
  .tiptap .image-wrapper:has(img[data-align="center"]) {
    display: flex;
    justify-content: center;
	align-items: flex-start;
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
  .tiptap table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5rem 0 0.75rem;
    font-size: 9.5px;
  }
  .preview-content table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1.32mm;
    margin-bottom: 2.65mm;
  }
  
  .tiptap table th, .tiptap table td {
    border: 1px solid #d1d5db;
    padding: 5px 8px;
    text-align: left;
    vertical-align: top;
    position: relative;
  }
  .preview-content table th, .preview-content table td {
    border: 0.26mm solid #d1d5db;
    padding: 1.06mm 1.59mm;
    text-align: left;
    vertical-align: top;
    font-size: 2.51mm;
    line-height: 3.97mm;
  }
  .tiptap table th {
    background-color: #f3f4f6;
    font-weight: 600;
  }
  .preview-content table th {
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

  /* Crop button for individual images (not inside image-grid) */
  .tiptap [data-resize-wrapper] {
    position: relative;
  }
  /* Only show on standalone images – image-grid has its own crop UI */
  .tiptap [data-type="image-grid"] [data-resize-wrapper] .image-crop-btn {
    display: none !important;
  }
  .tiptap [data-resize-wrapper] .image-crop-btn {
    position: absolute;
    top: 12px;
    right: 5px;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background-color: #ffffff;
    border: none;
    color: #334155;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    opacity: 0;
    transition: opacity 0.2s;
    cursor: pointer;
  }
  /* Dark mode: html.dark is toggled by applyTheme() via document.documentElement.classList */
  html.dark .tiptap [data-resize-wrapper] .image-crop-btn {
    background-color: #1e293b;
    color: #e2e8f0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  .tiptap [data-resize-wrapper]:hover .image-crop-btn {
    opacity: 1;
  }
  .tiptap [data-resize-wrapper] .image-crop-btn:hover {
    background-color: #f1f5f9;
  }
  html.dark .tiptap [data-resize-wrapper] .image-crop-btn:hover {
    background-color: #334155;
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

const COLLABORATION_SERVER_URL =
	import.meta.env.VITE_COLLABORATION_SERVER_URL || 'http://127.0.0.1:1234';
const WS_COLLABORATION_SERVER_URL = COLLABORATION_SERVER_URL.startsWith('https')
	? COLLABORATION_SERVER_URL.replace(/^https/, 'wss')
	: COLLABORATION_SERVER_URL.replace(/^http/, 'ws');

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
							const currentPath = new URL(el.src, window.location.href).pathname;
							let newPath = updatedNode.attrs.src;
							if (newPath.startsWith('http://') || newPath.startsWith('https://')) {
								newPath = new URL(newPath).pathname;
							}
							if (currentPath !== newPath) {
								el.src = updatedNode.attrs.src;
							}
						} catch (e) {
							// fallback
							if (el.getAttribute('src') !== updatedNode.attrs.src) {
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
				if (dom.closest('[data-type="image-grid"]')) return;

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
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="image-grid"]' }];
	},

	renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, { 'data-type': 'image-grid' }),
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

const DictationCursor = Extension.create<DictationCursorOptions>({
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
	DictationCursor.configure({ isDictating: false }),
	Highlight.configure({ multicolor: true }),
	ImageGrid,
];

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

		editor.chain().focus().insertContent(text).run();
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
								if (editor?.isActive('image')) {
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
								editor?.isActive('image', {
									alignment: 'center',
								})
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
									editor
										?.chain()
										.focus()
										.setTextAlign('right')
										.run();
								}
							}}
							active={
								editor?.isActive({ textAlign: 'right' }) ||
								editor?.isActive('image', {
									alignment: 'right',
								})
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
								editor?.isActive('image', {
									alignment: 'justify',
								})
							}
							title="Justificar"
						>
							<AlignJustify className="h-3.5 w-3.5" />
						</ToolbarBtn>

						<ToolbarDivider />

						{/* Lists & quote */}
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
				StarterKit,
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

	const [isFocused, setIsFocused] = useState(false);
	const [individualCroppingImage, setIndividualCroppingImage] = useState<{
		src: string;
		pos: number;
	} | null>(null);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({ undoRedo: false }),
			TableKit.configure({
				table: { resizable: true },
			}),
			...sharedExtensions.map(ext => {
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
		if (!editor) return;

		const handleOpenCropper = (e: Event) => {
			const customEvent = e as CustomEvent<{ src: string; pos: number; editor: any }>;
			if (customEvent.detail.editor === editor) {
				setIndividualCroppingImage({
					src: customEvent.detail.src,
					pos: customEvent.detail.pos,
				});
			}
		};

		document.addEventListener('open-image-cropper', handleOpenCropper);
		return () => {
			document.removeEventListener('open-image-cropper', handleOpenCropper);
		};
	}, [editor]);

	const handleCropIndividualImage = async (croppedBlob: Blob) => {
		if (!individualCroppingImage || !editor) return;

		const uploadToast = toast.loading('Guardando imagen recortada...');
		const file = new File([croppedBlob], 'cropped.jpg', { type: 'image/jpeg' });
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
					editor.chain().focus()
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
						if (!open) setIndividualCroppingImage(null);
					}}
					onCrop={handleCropIndividualImage}
				/>
			)}
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
		/>
	);
}

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
	| 'image';
	height: number;
	title?: string;
	html?: string;
	className?: string;
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
	maxCharsPerLine: number = 140,
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
	const srcMatch = blockHtml.match(/<img[^>]+src=["\']([^"\']+)["\']/i);
	const heightMatch = blockHtml.match(/<img[^>]+height=["\'](\d+)["\']/i);
	const widthMatch = blockHtml.match(/<img[^>]+width=["\'](\d+)["\']/i);

	let height = heightMatch ? parseInt(heightMatch[1], 10) : null;
	const width = widthMatch ? parseInt(widthMatch[1], 10) : null;

	if (height && width) {
		if (width > 704) {
			height = Math.round(height * (704 / width));
		}

		const heightMm = (height * 25.4) / 96;

		return heightMm + 7.94;
	}

	return 47.64;
}

function getInnerHtml(html: string, tag: string): string {
	const regex = new RegExp(`^<${tag}[^>]*>(.*)<\\/${tag}>$`, 'is');
	const match = html.match(regex);

	return match ? match[1] : html;
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

		const imgCount = (blockHtml.match(/<img/gi) || []).length || 1;
		const rows = Math.ceil(imgCount / columns);

		const itemWidth = 185.9 / columns;
		const itemHeight = itemWidth * 0.65;
		const gridHeight = (rows * itemHeight) + ((rows - 1) * 3.18) + 5.3;

		return {
			type: 'image',
			html: blockHtml,
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

	if (
		tag === 'img' ||
		(blockHtml.includes('<img') && !blockHtml.includes('<p'))
	) {
		return {
			type: 'image',
			html: blockHtml,
			height: getImageHeight(blockHtml),
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
		height: lines * 3.97,
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

	return { tag, items };
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

function PatientMetadataCard({ specimen }: { specimen: Specimen }) {
	return (
		<table
			style={{
				width: '100%',
				border: '0.26mm solid #bfdbfe',
				borderRadius: '1.59mm',
				backgroundColor: '#eff6ff',
				marginBottom: '3.97mm',
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
							fontSize: '2.51mm',
							lineHeight: '3.97mm',
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
						{specimen.customer_relation.gender === 'M' ||
							specimen.customer_relation.gender === 'masculino' ||
							specimen.customer_relation.gender === 'Masculino'
							? 'M'
							: 'F'}
						<br />
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Médico Remitente:
						</strong>{' '}
						{specimen.referrer_relation.name}
						<br />
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Diagnóstico Clínico:
						</strong>{' '}
						{specimen.diagnosis || 'N/A'}
					</td>
					<td
						style={{
							width: '45%',
							padding: '1.32mm 2.12mm 1.32mm 3.18mm',
							verticalAlign: 'top',
							fontSize: '2.51mm',
							lineHeight: '3.97mm',
							border: 'none',
						}}
					>
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Hospital/Clínica:
						</strong>{' '}
						{specimen.referrer_relation.notes || 'HDV'}
						<br />
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Sitio Preciso de la Muestra:
						</strong>{' '}
						{specimen.anatomic_site}
						<br />
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Fecha de la Toma:
						</strong>{' '}
						{new Date(specimen.created_at).toLocaleDateString(
							'es-HN',
						)}
						<br />
						<strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
							Fecha de Recibo:
						</strong>{' '}
						{new Date(specimen.created_at).toLocaleDateString(
							'es-HN',
						)}
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
	pathologistName,
	pathologistTitle,
	reportDate,
}: {
	pathologistName: string;
	pathologistTitle: string;
	reportDate: string;
	isLastPage?: boolean;
}) {
	return (
		<div
			style={{
				marginTop: '3.97mm',
				height: '19.84mm',
				textAlign: 'center',
				lineHeight: '3.97mm',
			}}
			className="shrink-0"
		>
			<div
				style={{
					width: '58.21mm',
					borderTop: '0.40mm solid #4b5563',
					margin: '0 auto 1.32mm auto',
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
				{pathologistName}
			</div>
			<div
				style={{
					fontSize: '2.25mm',
					color: '#4b5563',
					fontWeight: 500,
					textTransform: 'uppercase',
				}}
			>
				{pathologistTitle}
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
				{reportDate
					? new Date(reportDate + 'T00:00:00').toLocaleDateString(
						'es-HN',
						{
							day: '2-digit',
							month: '2-digit',
							year: '2-digit',
						},
					)
					: new Date().toLocaleDateString('es-HN', {
						day: '2-digit',
						month: '2-digit',
						year: '2-digit',
					})}
			</div>
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
}: Props) {
	const currentUserSpecimenRelation = specimen.users?.find(
		(u: any) => u.id === auth.user.id,
	);

	const hasMacroAccess =
		!!currentUserSpecimenRelation?.pivot?.macroscopy_access;
	const hasMicroAccess =
		!!currentUserSpecimenRelation?.pivot?.microscopy_access;

	let accessBadgeLabel = 'Solo Lectura';
	let accessBadgeStyle = {
		backgroundColor: 'rgba(100, 116, 139, 0.15)',
		color: '#64748b',
		borderColor: 'rgba(100, 116, 139, 0.25)',
	};

	if (hasMacroAccess && hasMicroAccess) {
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
		'diagnosis' | 'macroscopy' | 'microscopy' | null
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
		field: 'diagnosis' | 'macroscopy' | 'microscopy',
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
	const [macroscopyHtml, setMacroscopyHtml] = useState(
		report?.macroscopy_html || '',
	);
	const [microscopyHtml, setMicroscopyHtml] = useState(
		report?.microscopy_html || '',
	);
	const [diagnosisHtml, setDiagnosisHtml] = useState(
		report?.diagnosis_html || '',
	);
	const [macroscopyUsers, setMacroscopyUsers] = useState<Collaborator[]>([]);

	const isMicroscopyVisible = [
		'microscopic_review',
		'finalized',
		'delivered',
	].includes(specimen.status);
	const isFinished = ['finalized', 'delivered'].includes(specimen.status);
	const [sessionEditingEnabled, setSessionEditingEnabled] = useState(false);
	const [microscopyUsers, setMicroscopyUsers] = useState<Collaborator[]>([]);
	const [diagnosisUsers, setDiagnosisUsers] = useState<Collaborator[]>([]);

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
	const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
	const dialogPreviewRef = useRef<HTMLDivElement>(null);
	const dialogPreviewContainerRef = useRef<HTMLDivElement>(null);

	const calculateLayout = () => {
		const pageContentHeight = 190.5; // mm
		const lineHeight = 3.97; // mm
		const maxCharsPerLine = 140;
		const signatureHeight = 19.84; // mm

		const patientCardHeight = estimatePatientCardHeight(specimen);

		const blocks: any[] = [];

		// 1. Patient card block
		blocks.push({
			type: 'patient-card',
			height: patientCardHeight,
			id: 'patient-card',
		});

		// 2. Diagnosis
		const diagHtml = diagnosisHtml || specimen.diagnosis || '';

		if (diagHtml) {
			blocks.push({
				type: 'section-header',
				title: 'Diagnóstico',
				height: 7.94, // 2 lines * 3.97
				id: 'diag-header',
			});
			const diagBlocks = parseHtmlToBlocks(diagHtml);
			diagBlocks.forEach((bHtml, idx) => {
				const b = classifyBlock(bHtml, maxCharsPerLine);
				b.id = `diag-block-${idx}`;
				blocks.push(b);
			});
		}

		// 3. Macroscopy
		const macroHtml =
			macroscopyHtml || '<i>Pendiente de revisión macroscópica.</i>';
		blocks.push({
			type: 'section-header',
			title: 'Descripción Macroscópica',
			height: 7.94,
			id: 'macro-header',
		});
		const macroBlocks = parseHtmlToBlocks(macroHtml);
		macroBlocks.forEach((bHtml, idx) => {
			const b = classifyBlock(bHtml, maxCharsPerLine);
			b.id = `macro-block-${idx}`;
			blocks.push(b);
		});

		// 4. Microscopy
		if (isMicroscopyVisible) {
			const microHtml =
				microscopyHtml || '<i>Pendiente de revisión microscópica.</i>';
			blocks.push({
				type: 'section-header',
				title: 'Descripción Microscópica',
				height: 7.94,
				id: 'micro-header',
			});
			const microBlocks = parseHtmlToBlocks(microHtml);
			microBlocks.forEach((bHtml, idx) => {
				const b = classifyBlock(bHtml, maxCharsPerLine);
				b.id = `micro-block-${idx}`;
				blocks.push(b);
			});
		}

		const computedPages: MeasuredBlock[][] = [];
		let currentPage: MeasuredBlock[] = [];
		let currentHeight = 0.0;
		let pageIndex = 0;

		for (let bIndex = 0; bIndex < blocks.length; bIndex++) {
			const block = blocks[bIndex];
			let maxHeightForPage = pageContentHeight;

			if (block.type === 'patient-card') {
				currentPage.push(block);
				currentHeight += block.height;
				continue;
			}

			if (block.type === 'section-header') {
				if (currentHeight + block.height > maxHeightForPage) {
					computedPages.push(currentPage);
					currentPage = [];
					currentHeight = 0.0;
					pageIndex++;
					maxHeightForPage = pageContentHeight;
				}

				currentPage.push(block);
				currentHeight += block.height;
				continue;
			}

			if (block.type === 'page-break') {
				if (currentPage.length > 0) {
					computedPages.push(currentPage);
					currentPage = [];
					currentHeight = 0.0;
					pageIndex++;
				}

				continue;
			}

			if (block.type === 'heading') {
				const headingCost = block.height;
				let nextBlockStartsNewPage = false;

				// Keep with Next constraint
				if (bIndex + 1 < blocks.length) {
					const nextBlock = blocks[bIndex + 1];
					let minNextHeight = 2.0 * lineHeight;

					if (nextBlock.type === 'image') {
						minNextHeight = nextBlock.height;
					} else if (nextBlock.type === 'heading') {
						minNextHeight = nextBlock.height;
					}

					if (
						currentHeight + headingCost + minNextHeight >
						maxHeightForPage
					) {
						nextBlockStartsNewPage = true;
					}
				}

				if (
					currentHeight + headingCost > maxHeightForPage ||
					nextBlockStartsNewPage
				) {
					if (currentPage.length > 0) {
						computedPages.push(currentPage);
						currentPage = [];
						currentHeight = 0.0;
						pageIndex++;
						maxHeightForPage = pageContentHeight;
					}
				}

				currentPage.push(block);
				currentHeight += headingCost;
				continue;
			}

			if (block.type === 'image') {
				if (currentHeight + block.height > maxHeightForPage) {
					computedPages.push(currentPage);
					currentPage = [];
					currentHeight = 0.0;
					pageIndex++;
					maxHeightForPage = pageContentHeight;
				}

				currentPage.push(block);
				currentHeight += block.height;
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
					maxHeightForPage = pageContentHeight;
					const remaining = maxHeightForPage - currentHeight;

					if (remaining <= 0.5 * lineHeight) {
						computedPages.push(currentPage);
						currentPage = [];
						currentHeight = 0.0;
						pageIndex++;
						continue;
					}

					const linesToFit = Math.min(
						Math.floor(remaining / lineHeight),
						lines.length - i,
					);

					if (linesToFit <= 0) {
						computedPages.push(currentPage);
						currentPage = [];
						currentHeight = 0.0;
						pageIndex++;
						continue;
					}

					const slice = lines.slice(i, i + linesToFit);

					const isLastSlice = i + linesToFit >= lines.length;
					const classAttr = block.className || 'section-content';
					const style = isLastSlice
						? ''
						: 'style="margin-bottom: 0px;"';

					const sliceHtml = `<${block.tag} class="${classAttr}" ${style}>${slice.join('')}</${block.tag}>`;
					const blockCost =
						linesToFit * lineHeight +
						(isLastSlice ? 0.5 * lineHeight : 0.0);

					currentPage.push({
						id: `${block.id}-slice-${i}`,
						type: 'html',
						html: sliceHtml,
						height: blockCost,
					});

					currentHeight += blockCost;
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
					maxHeightForPage = pageContentHeight;
					const remaining = maxHeightForPage - currentHeight;

					if (remaining <= 1.0 * lineHeight) {
						computedPages.push(currentPage);
						currentPage = [];
						currentHeight = 0.0;
						pageIndex++;
						continue;
					}

					const itemHtml = listItems[i];
					const itemPlainText = itemHtml
						.replace(/<[^>]+>/g, '')
						.trim();
					const itemTextLines = Math.max(
						1,
						Math.ceil(itemPlainText.length / (maxCharsPerLine - 5)),
					);
					const itemHeight = itemTextLines * lineHeight;

					if (itemHeight > remaining) {
						if (currentHeight === 0) {
							const startAttr =
								tag === 'ol' && olStartIndex > 1
									? ` start="${olStartIndex}"`
									: '';
							currentPage.push({
								id: `${block.id}-item-${i}`,
								type: 'html',
								html: `<${tag} class="section-content"${startAttr}>${itemHtml}</${tag}>`,
								height: itemHeight + 0.5 * lineHeight,
							});
							currentHeight += itemHeight + 0.5 * lineHeight;
							i++;
							olStartIndex++;
						} else {
							computedPages.push(currentPage);
							currentPage = [];
							currentHeight = 0.0;
							pageIndex++;
						}
					} else {
						const itemsToFit: string[] = [];
						let accumulatedHeight = 0;

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
							const nextItemHeight = nextItemLines * lineHeight;

							const isLastOfAll = i === listItems.length - 1;
							const spacingOverhead = isLastOfAll
								? 0.5 * lineHeight
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
								(isLastOfAll ? 0.5 * lineHeight : 0.0);

							const startAttr =
								tag === 'ol' && olStartIndex > 1
									? ` start="${olStartIndex}"`
									: '';
							currentPage.push({
								id: `${block.id}-items-${i}`,
								type: 'html',
								html: `<${tag} class="section-content"${startAttr}>${itemsToFit.join('')}</${tag}>`,
								height: cost,
							});
							currentHeight += cost;
							olStartIndex += itemsToFit.length;
						} else {
							computedPages.push(currentPage);
							currentPage = [];
							currentHeight = 0.0;
							pageIndex++;
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
					maxHeightForPage = pageContentHeight;
					const remaining = maxHeightForPage - currentHeight;

					if (remaining <= 5 * lineHeight) {
						computedPages.push(currentPage);
						currentPage = [];
						currentHeight = 0.0;
						pageIndex++;
						continue;
					}

					const headerHeight =
						headerHtml === '' ? 0.0 : 2.0 * lineHeight;
					const remainingForRows = remaining - headerHeight;

					const rowsToFit: string[] = [];
					let accumulatedHeight = 0;

					while (i < rows.length) {
						const row = rows[i];
						const charsPerCell = Math.floor(
							maxCharsPerLine / colCount,
						);
						const rowLines =
							Math.max(
								1,
								Math.ceil(row.maxCellTextLen / charsPerCell),
							) + 1;
						const rowHeight = rowLines * lineHeight;

						const isLastRow = i === rows.length - 1;
						const tableSpacing = isLastRow ? 1.0 * lineHeight : 0.0;

						if (
							accumulatedHeight + rowHeight + tableSpacing >
							remainingForRows
						) {
							if (rowsToFit.length === 0 && currentHeight === 0) {
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
							(isLastRow ? 1.0 * lineHeight : 0.0);

						const classMatch = block.html.match(
							/class=["\']([^"\']+)["\']/i,
						);
						const tableClass = classMatch
							? classMatch[1]
							: 'section-content';

						let tableWrapperHtml = `<table class="${tableClass}">`;

						if (headerHtml) {
							tableWrapperHtml += `<thead>${headerHtml}</thead>`;
						}

						tableWrapperHtml += `<tbody>${rowsToFit.join('')}</tbody></table>`;

						currentPage.push({
							id: `${block.id}-table-slice-${i}`,
							type: 'html',
							html: tableWrapperHtml,
							height: cost,
						});
						currentHeight += cost;
					} else {
						computedPages.push(currentPage);
						currentPage = [];
						currentHeight = 0.0;
						pageIndex++;
					}
				}

				continue;
			}
		}

		if (currentPage.length > 0) {
			computedPages.push(currentPage);
		}

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

		setPages(computedPages);
	};

	useIsomorphicLayoutEffect(() => {
		calculateLayout();
	}, [
		diagnosisHtml,
		macroscopyHtml,
		microscopyHtml,
		reportDate,
		specimen,
		isMicroscopyVisible,
		isLoading,
	]);

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
	}, [macroscopyHtml, microscopyHtml, diagnosisHtml, reportDate]);

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
	const [macroscopyDoc, setMacroscopyDoc] = useState<Y.Doc | null>(null);
	const [macroscopyProvider, setMacroscopyProvider] =
		useState<HocuspocusProvider | null>(null);
	const [microscopyDoc, setMicroscopyDoc] = useState<Y.Doc | null>(null);
	const [microscopyProvider, setMicroscopyProvider] =
		useState<HocuspocusProvider | null>(null);
	const [diagnosisDoc, setDiagnosisDoc] = useState<Y.Doc | null>(null);
	const [diagnosisProvider, setDiagnosisProvider] =
		useState<HocuspocusProvider | null>(null);
	const [saveStatusDoc, setSaveStatusDoc] = useState<Y.Doc | null>(null);
	const [saveStatusProvider, setSaveStatusProvider] =
		useState<HocuspocusProvider | null>(null);
	const [globalSaveState, setGlobalSaveState] = useState<
		'idle' | 'saving' | 'saved'
	>('idle');

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
	];
	const [zoomScale, setZoomScale] = useState(1);
	const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
	const containerRef = useRef<HTMLDivElement>(null);
	const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
	const [fullscreenZoomScale, setFullscreenZoomScale] = useState(1);
	const [fullscreenZoomMode, setFullscreenZoomMode] = useState<
		'fit' | 'manual'
	>('fit');
	const fullscreenContainerRef = useRef<HTMLDivElement>(null);
	const [isSpecimenSheetOpen, setIsSpecimenSheetOpen] = useState(false);

	useEffect(() => {
		if (!containerRef.current || zoomMode !== 'fit') {
			return;
		}

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
		if (
			!fullscreenContainerRef.current ||
			fullscreenZoomMode !== 'fit' ||
			!isFullscreenOpen
		) {
			return;
		}

		const handleResize = () => {
			const parent = fullscreenContainerRef.current;

			if (parent) {
				const parentWidth = parent.clientWidth;
				const scale = (parentWidth - 48) / 800;
				setFullscreenZoomScale(Math.min(scale, 1.5));
			}
		};

		handleResize();
		const observer = new ResizeObserver(handleResize);
		observer.observe(fullscreenContainerRef.current);

		return () => observer.disconnect();
	}, [fullscreenZoomMode, isFullscreenOpen, isLoading]);

	useEffect(() => {
		if (report) {
			const rawDate = report.report_date || '';
			const match = rawDate.match(/\d{4}-\d{2}-\d{2}/);
			setReportDate(match ? match[0] : rawDate.split('T')[0] || '');
			setMacroscopyHtml(report.macroscopy_html || '');
			setMicroscopyHtml(report.microscopy_html || '');
			setDiagnosisHtml(report.diagnosis_html || '');
		}
	}, [report]);

	const handleCreateReport = () => {
		router.post(
			`/specimens/${specimen.sequence_code}/report-editor`,
			{},
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
	};

	const handleTransitionState = (targetStatus: Specimen['status']) => {
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
				},
				onError: () => {
					toast.error('Error al actualizar el estado del proceso');
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
					<div className="relative max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card p-8 shadow-xl backdrop-blur-md">
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
						<Button
							size="lg"
							onClick={handleCreateReport}
							className="w-full cursor-pointer font-semibold shadow-md shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.99]"
						>
							Crear Reporte
						</Button>
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
	const isDiagnosisEditable =
		(!['finalized', 'delivered'].includes(specimen.status) ||
			(isFinished && sessionEditingEnabled)) &&
		(hasMacroAccess || hasMicroAccess);

	// Pathologist information logic
	const pathologist = specimen.users?.[0];
	const pathologistName = pathologist
		? pathologist.name
		: 'DRA. ESTEFANY LAGOS';
	const pathologistTitle = pathologist
		? pathologist.role?.name || 'PATOLOGÍA ONCOLÓGICA'
		: 'PATOLOGÍA ONCOLÓGICA';

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
				{/* Header preview */}
				<div
					style={{
						width: '100%',
						height: '34.93mm',
						marginBottom: '3.97mm',
					}}
				>
					<div
						style={{
							width: '100%',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
							marginBottom: '0.53mm',
						}}
					>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
							}}
						>
							<img
								style={{
									maxHeight: '13.76mm',
									width: 'auto',
									marginBottom: '1.06mm',
								}}
								src="/images/patolab-logo-horizontal.png"
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
							<div
								id={`preview-logo-text-fallback-${pageNum}`}
								style={{ display: 'none' }}
							>
								<div
									style={{
										fontSize: '5.82mm',
										fontWeight: 800,
										color: '#1e3a8a',
										fontFamily: 'Outfit, sans-serif',
									}}
								>
									PatoLab
								</div>
								<div
									style={{
										fontSize: '2.12mm',
										color: '#6b7280',
										fontFamily: 'Outfit, sans-serif',
										letterSpacing: '0.13mm',
									}}
								>
									LABORATORIO DE PATOLOGÍA & CITOLOGÍA
								</div>
							</div>
							<div
								style={{
									fontSize: '2.38mm',
									fontStyle: 'italic',
									color: '#4b5563',
									marginTop: '0.26mm',
								}}
							>
								Calidad Diagnóstica a su Servicio
							</div>
						</div>
						<div
							style={{
								display: 'flex',
								justifyContent: 'flex-end',
								alignItems: 'flex-start',
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
								Biopsia N° {specimen.sequence_code}
							</div>
						</div>
					</div>
					<div
						style={{
							textAlign: 'center',
							fontSize: '4.23mm',
							fontWeight: 700,
							color: '#000000',
							marginTop: '0.53mm',
							marginBottom: '0.79mm',
							letterSpacing: '0.13mm',
							paddingBottom: '3.18mm',
							textTransform: 'uppercase',
						}}
					>
						INFORME DE MUESTRA {specimen.sequence_code}
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
						height: '190.50mm',
						maxHeight: '190.50mm',
						overflow: 'hidden',
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
									pathologistName={pathologistName}
									pathologistTitle={pathologistTitle}
									reportDate={reportDate}
								/>
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
						bottom: '12mm',
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
										width: '25%',
										verticalAlign: 'middle',
										fontSize: '2.12mm',
										color: '#4b5563',
										border: 'none',
										padding: '0mm',
									}}
								>
									✉ info@PatoLab.org
								</td>
								<td
									style={{
										width: '25%',
										verticalAlign: 'middle',
										fontSize: '2.12mm',
										color: '#4b5563',
										border: 'none',
										padding: '0mm',
									}}
								>
									☎ +504 2510-6502
								</td>
								<td
									style={{
										width: '25%',
										verticalAlign: 'middle',
										fontSize: '2.12mm',
										color: '#4b5563',
										border: 'none',
										padding: '0mm',
									}}
								>
									📞 +504 9442 8529
								</td>
								<td
									style={{
										width: '25%',
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
											maxWidth: '52.92mm',
										}}
									>
										<span style={{ fontSize: '1.98mm' }}>
											📍 Bo. Los Andes, SPS
										</span>
									</div>
								</td>
							</tr>
						</tbody>
					</table>

					<div
						style={{
							position: 'absolute',
							bottom: '0mm',
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
						) : globalSaveState === 'saved' || isSavedRecently ? (
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
						) : globalSaveState === 'saved' || isSavedRecently ? (
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
								onClick={() => router.visit('/my-assignments')}
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
												Esta acción permitirá modificar
												el diagnóstico, la macroscopía y
												la microscopía de este reporte
												finalizado únicamente durante
												esta sesión.
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
								<span className="animate-pulse rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
									Edición Activa
								</span>
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
											: specimen.status === 'processing'
												? 'Procesando'
												: specimen.status ===
													'microscopic_review'
													? 'Microscopía'
													: 'Finalizado'}
									</span>
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
										onSheetOpenChange={updateAISheetOpen}
										onPopoverOpenChange={updatePopoverOpen}
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
									<UserRound className="h-4 w-4" /> Resumen de
									Paciente y Muestra {specimen.sequence_code}
								</h3>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setIsSpecimenSheetOpen(true)}
									className="h-7 w-7 cursor-pointer rounded-full text-muted-foreground hover:bg-primary/5 hover:text-primary"
									title="Ver detalles de la muestra"
								>
									<Eye className="h-4 w-4" />
								</Button>
							</div>
							<div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
								<div className="space-y-2">
									<p>
										<span className="font-medium text-muted-foreground">
											Paciente:
										</span>{' '}
										<strong className="text-card-foreground">
											{specimen.customer_relation.name} (
											{specimen.customer_relation.type ===
												'empresa'
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
											{specimen.customer_relation.age ??
												'N/A'}{' '}
											años (
											{specimen.customer_relation.gender})
										</strong>
									</p>
									<p>
										<span className="font-medium text-muted-foreground">
											Médico Remitente:
										</span>{' '}
										<strong className="text-card-foreground">
											{specimen.referrer_relation.name}
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
											Categoría:
										</span>{' '}
										<strong className="text-card-foreground">
											{specimen.category?.name || 'N/A'}
										</strong>
									</p>
									<p>
										<span className="font-medium text-muted-foreground">
											Fecha Recibo:
										</span>{' '}
										<strong className="text-card-foreground">
											{new Date(
												specimen.created_at,
											).toLocaleDateString('es-HN')}
										</strong>
									</p>
								</div>
							</div>
						</div>

						{/* Report Date Picker Card */}
						<div className="flex flex-col items-center justify-start gap-4 md:flex-row">
							<label
								htmlFor="report-date"
								className="block flex items-center gap-2 text-sm font-semibold"
							>
								<Calendar className="h-4 w-4 text-muted-foreground" />{' '}
								Fecha del Reporte
							</label>
							<div className="relative max-w-sm">
								<input
									type="date"
									id="report-date"
									value={reportDate}
									disabled={
										(isFinished &&
											!sessionEditingEnabled) ||
										(!hasMacroAccess && !hasMicroAccess)
									}
									onChange={(e) =>
										handleUpdateDate(e.target.value)
									}
									className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60"
								/>
							</div>
						</div>

						{/* Diagnosis Editor Section */}
						<div className="space-y-3">
							<div className="flex items-center justify-between border-l-4 border-blue-500/80 pl-3">
								<h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
									<FileText className="h-4 w-4 text-blue-500" />{' '}
									Diagnóstico Patológico
								</h3>
							</div>

							{isDiagnosisEditable ? (
								<CollaborativeEditor
									reportId={report.id}
									field="diagnosis"
									userName={auth.user.name}
									cursorColor={
										auth.user.cursor_color || '#3b82f6'
									}
									initialContent={diagnosisHtml}
									onUpdate={setDiagnosisHtml}
									onUsersChange={setDiagnosisUsers}
									specimenSequenceCode={
										specimen.sequence_code
									}
									doc={diagnosisDoc}
									provider={diagnosisProvider}
									onFocus={(editor) =>
										handleEditorFocus(editor, 'diagnosis')
									}
									onBlur={handleEditorBlur}
								/>
							) : (
								<ReadOnlyEditor content={diagnosisHtml} />
							)}
						</div>

						{/* Macroscopy Editor Section */}
						<div className="space-y-3">
							<div className="flex items-center justify-between border-l-4 border-violet-500/80 pl-3">
								<h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
									<Microscope className="h-4 w-4 text-violet-500" />{' '}
									Descripción Macroscópica
								</h3>
							</div>

							{isMacroscopyEditable ? (
								<CollaborativeEditor
									reportId={report.id}
									field="macroscopy"
									userName={auth.user.name}
									cursorColor={
										auth.user.cursor_color || '#8b5cf6'
									}
									initialContent={macroscopyHtml}
									onUpdate={setMacroscopyHtml}
									onUsersChange={setMacroscopyUsers}
									specimenSequenceCode={
										specimen.sequence_code
									}
									doc={macroscopyDoc}
									provider={macroscopyProvider}
									onFocus={(editor) =>
										handleEditorFocus(editor, 'macroscopy')
									}
									onBlur={handleEditorBlur}
								/>
							) : (
								<ReadOnlyEditor content={macroscopyHtml} />
							)}

							{specimen.status === 'macroscopic_review' && (
								<div className="flex justify-end pt-2">
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button className="cursor-pointer bg-violet-600 font-semibold text-white shadow-sm hover:bg-violet-700">
												Completar Macroscopía y Enviar a
												Procesamiento
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>
													¿Confirmar completado de
													macroscopía?
												</AlertDialogTitle>
												<AlertDialogDescription>
													Esta acción marcará la
													descripción macroscópica
													como completada y enviará la
													muestra a la fase de
													procesamiento en
													laboratorio. El estado de la
													muestra cambiará a{' '}
													<strong>Procesando</strong>.
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
							<div className="flex items-center justify-between border-l-4 border-fuchsia-500/80 pl-3">
								<h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">
									<Microscope className="h-4 w-4 text-fuchsia-500" />{' '}
									Descripción Microscópica
								</h3>
							</div>

							{/* Status: before processing - hidden or inactive */}
							{(specimen.status === 'received' ||
								specimen.status === 'macroscopic_review') && (
									<div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center">
										<AlertCircle className="mb-2 h-6 w-6 text-muted-foreground" />
										<h4 className="text-xs font-semibold text-muted-foreground">
											Fase no iniciada
										</h4>
										<p className="mt-1 max-w-xs text-[10px] text-muted-foreground">
											Esta sección estará disponible una vez
											finalizada la descripción macroscópica y
											completada la fase de procesamiento.
										</p>
									</div>
								)}

							{/* Status: processing - locked with button in middle to start microscopy */}
							{specimen.status === 'processing' && (
								<div className="relative flex min-h-[160px] flex-col items-center justify-center overflow-hidden rounded-lg border bg-muted/10 p-6 text-center">
									<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 p-4 backdrop-blur-xs">
										<h4 className="mb-2 text-xs font-bold">
											Fase de Procesamiento en Curso
										</h4>
										<p className="mb-4 max-w-xs text-[10px] text-muted-foreground">
											Haga clic a continuación para pasar
											la muestra a revisión microscópica e
											iniciar la redacción colaborativa
											del reporte.
										</p>
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button className="cursor-pointer bg-fuchsia-600 font-semibold text-white shadow-sm hover:bg-fuchsia-700">
													Iniciar Fase de Microscopía
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														¿Iniciar fase de
														microscopía?
													</AlertDialogTitle>
													<AlertDialogDescription>
														Esta acción dará por
														finalizado el
														procesamiento
														físico/químico en
														laboratorio y habilitará
														la edición de la
														descripción microscópica
														y el diagnóstico de
														forma colaborativa. El
														estado cambiará a{' '}
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
														Iniciar Microscopía
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								</div>
							)}

							{/* Status: microscopic_review or finalized - load collaborative editor */}
							{(specimen.status === 'microscopic_review' ||
								specimen.status === 'finalized' ||
								specimen.status === 'delivered') && (
									<>
										{isMicroscopyEditable ? (
											<CollaborativeEditor
												reportId={report.id}
												field="microscopy"
												userName={auth.user.name}
												cursorColor={
													auth.user.cursor_color ||
													'#d946ef'
												}
												initialContent={microscopyHtml}
												onUpdate={setMicroscopyHtml}
												onUsersChange={setMicroscopyUsers}
												specimenSequenceCode={
													specimen.sequence_code
												}
												doc={microscopyDoc}
												provider={microscopyProvider}
												onFocus={(editor) =>
													handleEditorFocus(
														editor,
														'microscopy',
													)
												}
												onBlur={handleEditorBlur}
											/>
										) : (
											<ReadOnlyEditor
												content={microscopyHtml}
											/>
										)}

										{isMicroscopyEditable && (
											<div className="flex justify-end pt-2">
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															onClick={() =>
																setHasScrolledToEnd(
																	false,
																)
															}
															className="cursor-pointer bg-fuchsia-600 font-semibold text-white shadow-sm hover:bg-fuchsia-700"
														>
															Finalizar Reporte de
															Anatomía Patológica
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent className="sm:max-w-5xl">
														<AlertDialogHeader>
															<AlertDialogTitle>
																¿Confirmar
																finalización del
																reporte?
															</AlertDialogTitle>
															<AlertDialogDescription>
																Revise el informe
																completo antes de
																finalizar. Desplace
																hasta el final de la
																previsualización
																para habilitar el
																botón de
																confirmación.
															</AlertDialogDescription>
														</AlertDialogHeader>

														{/* Report Preview with Zoom Controls */}
														<div className="my-2 overflow-hidden rounded-lg border bg-muted/10">
															<div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2">
																<h4 className="shrink-0 text-xs font-bold">
																	Previsualización
																	del Reporte
																</h4>
																<div className="flex items-center gap-1 rounded-full border border-border/50 bg-background/80 px-2 py-1 text-[10px] shadow-xs backdrop-blur-md dark:bg-slate-900/80">
																	<button
																		type="button"
																		onClick={() =>
																			setDialogZoomScale(
																				(
																					prev,
																				) =>
																					Math.max(
																						0.3,
																						prev -
																						0.1,
																					),
																			)
																		}
																		className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
																		title="Zoom Out"
																	>
																		-
																	</button>
																	<span className="min-w-[32px] px-1 text-center font-mono font-semibold text-foreground">
																		{Math.round(
																			dialogZoomScale *
																			100,
																		)}
																		%
																	</span>
																	<button
																		type="button"
																		onClick={() =>
																			setDialogZoomScale(
																				(
																					prev,
																				) =>
																					Math.min(
																						1.5,
																						prev +
																						0.1,
																					),
																			)
																		}
																		className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
																		title="Zoom In"
																	>
																		+
																	</button>
																	<div className="mx-1 h-3 w-px bg-border/80" />
																	<button
																		type="button"
																		onClick={() => {
																			if (
																				dialogPreviewContainerRef.current
																			) {
																				const scale =
																					(dialogPreviewContainerRef
																						.current
																						.clientWidth -
																						32) /
																					800;
																				setDialogZoomScale(
																					Math.min(
																						scale,
																					),
																				);
																			}
																		}}
																		className="cursor-pointer rounded-full px-2 py-0.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
																	>
																		Ajustar
																	</button>
																</div>
															</div>
															<div
																ref={
																	dialogPreviewContainerRef
																}
																className="flex max-h-[55vh] justify-center overflow-y-auto p-4"
																onScroll={(e) => {
																	const el =
																		e.currentTarget;

																	if (
																		el.scrollTop +
																		el.clientHeight >=
																		el.scrollHeight -
																		20
																	) {
																		setHasScrolledToEnd(
																			true,
																		);
																	}
																}}
																onMouseEnter={(
																	e,
																) => {
																	const el =
																		e.currentTarget;

																	if (
																		el.scrollHeight <=
																		el.clientHeight +
																		2
																	) {
																		setHasScrolledToEnd(
																			true,
																		);
																	}
																}}
															>
																<div
																	ref={
																		dialogPreviewRef
																	}
																	className="shrink-0"
																	style={{
																		width: '800px',
																		transform: `scale(${dialogZoomScale})`,
																		transformOrigin:
																			'top center',
																	}}
																>
																	{Array.from({
																		length: totalPages,
																	}).map(
																		(_, i) => (
																			<Fragment
																				key={
																					i
																				}
																			>
																				{renderPreviewPage(
																					i +
																					1,
																				)}
																			</Fragment>
																		),
																	)}
																</div>
															</div>
														</div>

														{!hasScrolledToEnd && (
															<p className="text-center text-[11px] text-muted-foreground">
																Desplace hasta el
																final de la
																previsualización
																para habilitar la
																finalización del
																reporte.
															</p>
														)}
														<AlertDialogFooter>
															<AlertDialogCancel>
																Cancelar
															</AlertDialogCancel>
															<AlertDialogAction
																onClick={() =>
																	handleTransitionState(
																		'finalized',
																	)
																}
																disabled={
																	!hasScrolledToEnd
																}
																className="cursor-pointer bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-40"
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
				<div className="left-[50vw] block flex h-[calc(100vh-64px)] min-h-[500px] w-screen flex-col space-y-3 lg:fixed lg:top-[64px] lg:w-[50vw]">
					<div className="relative flex flex-1 flex-col overflow-hidden bg-slate-200 shadow-xs dark:bg-slate-950/20">
						{/* Floating Controls Overlay */}
						<div className="pointer-events-none absolute top-4 right-4 left-4 z-20 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
							{/* Zoom Controls (Glassmorphism) */}
							<div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs shadow-md backdrop-blur-md dark:bg-slate-900/80">
								<button
									type="button"
									onClick={() => {
										setZoomMode('manual');
										setZoomScale((prev) =>
											Math.max(0.3, prev - 0.1),
										);
									}}
									className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
									title="Zoom Out"
								>
									-
								</button>
								<span className="min-w-[36px] px-1 text-center font-mono font-semibold text-foreground">
									{Math.round(zoomScale * 100)}%
								</span>
								<button
									type="button"
									onClick={() => {
										setZoomMode('manual');
										setZoomScale((prev) =>
											Math.min(1.5, prev + 0.1),
										);
									}}
									className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
									title="Zoom In"
								>
									+
								</button>
								<div className="mx-1 h-3.5 w-px bg-border/80" />
								<button
									type="button"
									onClick={() => {
										setZoomMode('fit');

										if (containerRef.current) {
											const scale =
												(containerRef.current
													.clientWidth -
													32) /
												800;
											setZoomScale(Math.min(scale, 1.2));
										}
									}}
									className={cn(
										'cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
										zoomMode === 'fit' &&
										'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
									)}
								>
									Ajustar
								</button>
								<div className="mx-1 h-3.5 w-px bg-border/80" />
								<button
									type="button"
									onClick={() => {
										setIsFullscreenOpen(true);
									}}
									className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
									title="Pantalla Completa"
								>
									<Maximize2 className="h-3.5 w-3.5" />
								</button>
							</div>

							{/* Floating Download Button */}
							<a
								href={`/specimens/${specimen.sequence_code}/report-editor/pdf`}
								target="_blank"
								rel="noopener noreferrer"
								className="pointer-events-auto inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-md transition-all hover:scale-[1.02] hover:bg-primary/95 active:scale-[0.98] sm:w-auto"
							>
								<Download className="h-3.5 w-3.5" />
								{isFinished
									? 'Descargar Informe'
									: 'Descargar Previsualización'}
							</a>
						</div>

						{/* Scrollable Preview Pane */}
						<div
							ref={containerRef}
							className="flex-1 overflow-x-auto overflow-y-auto p-4 pt-24 sm:pt-16"
						>
							<div
								style={{
									height: `${(1035 * totalPages + 24 * (totalPages - 1)) * zoomScale}px`,
									width: `${800 * zoomScale}px`,
									margin: '0 auto',
									position: 'relative',
								}}
							>
								<div
									className="shrink-0 origin-top-left"
									style={{
										transform: `scale(${zoomScale})`,
									}}
								>
									{Array.from({ length: totalPages }).map(
										(_, i) => (
											<Fragment key={i}>
												{renderPreviewPage(i + 1)}
											</Fragment>
										),
									)}
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
					router.visit(
						`/specimens?specimen=${specimen.sequence_code || specimen.id}&action=edit`,
					);
				}}
				onAssignPathologistClick={() => setIsAssignSheetOpen(true)}
			/>

			<SpecimenPathologistSheet
				specimen={specimen}
				open={isAssignSheetOpen}
				onOpenChange={setIsAssignSheetOpen}
				pathologists={pathologists}
			/>

			<Sheet open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
				<SheetContent
					side="bottom"
					className="mx-auto flex h-[96vh] w-[98vw] max-w-none flex-col justify-start overflow-hidden rounded-t-2xl border-t bg-slate-200 p-0 dark:bg-slate-950/20 [&>button]:top-4 [&>button]:right-6 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:border [&>button]:bg-background/80 [&>button]:shadow-xs [&>button]:backdrop-blur-xs"
				>
					<div className="flex items-center justify-between border-b bg-background px-6 py-3 shadow-xs">
						<div className="flex items-center gap-2">
							<FileText className="h-5 w-5 text-primary" />
							<div>
								<SheetTitle className="text-sm font-semibold">
									Vista Completa de Reporte
								</SheetTitle>
								<SheetDescription className="text-[10px] text-muted-foreground">
									Paciente: {specimen.customer_relation.name}{' '}
									| Código: {specimen.sequence_code}
								</SheetDescription>
							</div>
						</div>

						{/* Zoom Controls inside Fullscreen Sheet */}
						<div className="mr-12 flex items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs shadow-sm backdrop-blur-md dark:bg-slate-900/80">
							<button
								type="button"
								onClick={() => {
									setFullscreenZoomMode('manual');
									setFullscreenZoomScale((prev) =>
										Math.max(0.3, prev - 0.1),
									);
								}}
								className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								title="Zoom Out"
							>
								-
							</button>
							<span className="min-w-[36px] px-1 text-center font-mono font-semibold text-foreground">
								{Math.round(fullscreenZoomScale * 100)}%
							</span>
							<button
								type="button"
								onClick={() => {
									setFullscreenZoomMode('manual');
									setFullscreenZoomScale((prev) =>
										Math.min(2.0, prev + 0.1),
									);
								}}
								className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								title="Zoom In"
							>
								+
							</button>
							<div className="mx-1 h-3.5 w-px bg-border/80" />
							<button
								type="button"
								onClick={() => {
									setFullscreenZoomMode('fit');

									if (fullscreenContainerRef.current) {
										const scale =
											(fullscreenContainerRef.current
												.clientWidth -
												48) /
											800;
										setFullscreenZoomScale(
											Math.min(scale, 1.5),
										);
									}
								}}
								className={cn(
									'cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
									fullscreenZoomMode === 'fit' &&
									'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
								)}
							>
								Ajustar
							</button>
						</div>
					</div>

					{/* Scrollable Preview Pane inside Sheet */}
					<div
						ref={fullscreenContainerRef}
						className="flex flex-1 justify-center overflow-x-auto overflow-y-auto bg-slate-200 p-6 dark:bg-slate-950/20"
					>
						<div
							style={{
								height: `${(1035 * totalPages + 24 * (totalPages - 1)) * fullscreenZoomScale}px`,
								width: `${800 * fullscreenZoomScale}px`,
								position: 'relative',
							}}
						>
							<div
								className="shrink-0 origin-top-left"
								style={{
									transform: `scale(${fullscreenZoomScale})`,
								}}
							>
								{Array.from({ length: totalPages }).map(
									(_, i) => (
										<Fragment key={i}>
											{renderPreviewPage(i + 1)}
										</Fragment>
									),
								)}
							</div>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</EditorLayout>
	);
}
