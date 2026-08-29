export const editorStyles = `
  /* Reset default spacing on elements to ensure exact metric calculations */
  .preview-content, .preview-content *, .tiptap, .tiptap * {
    box-sizing: border-box;
  }
  .preview-content p, .preview-content h1, .preview-content h2, .preview-content h3, .preview-content h4, .preview-content h5, .preview-content h6, .preview-content ul, .preview-content ol, .preview-content li, .preview-content table, .preview-content tr, .preview-content th, .preview-content td {
    margin: 0;
    padding: 0;
  }
  .preview-content > *:first-child {
    margin-top: 0 !important;
  }
  .preview-content {
    margin-bottom: 0mm;
  }

  /* ── Base ── */
  .tiptap {
    outline: none;
    min-height: 160px;
    font-size: 8pt;
    line-height: 1.25;
  }

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
  .tiptap p {
    margin-bottom: 0.5rem;
    font-size: 8pt;
    line-height: 1.25;
  }
  .preview-content p {
    margin-bottom: 1.98mm;
    line-height: 3.53mm; /* 8pt * 1.25 */
    text-align: justify;
    font-size: 2.82mm; /* 8pt */
    min-height: 3.53mm;
  }

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
  
  .tiptap ul[data-list-style-type="disc"], .preview-content ul[data-list-style-type="disc"] { list-style-type: disc; }
  .tiptap ul[data-list-style-type="circle"], .preview-content ul[data-list-style-type="circle"] { list-style-type: circle; }
  .tiptap ul[data-list-style-type="square"], .preview-content ul[data-list-style-type="square"] { list-style-type: square; }
  .tiptap ul[data-list-style-type="none"], .preview-content ul[data-list-style-type="none"] { list-style-type: none; }
  
  .tiptap ul[data-list-style-type="dash"],
  .tiptap ul[data-list-style-type="checkmark"],
  .tiptap ul[data-list-style-type="arrow"],
  .preview-content ul[data-list-style-type="dash"],
  .preview-content ul[data-list-style-type="checkmark"],
  .preview-content ul[data-list-style-type="arrow"] {
      list-style-type: none !important;
  }

  .tiptap ul[data-list-style-type="dash"] > li,
  .tiptap ul[data-list-style-type="checkmark"] > li,
  .tiptap ul[data-list-style-type="arrow"] > li,
  .preview-content ul[data-list-style-type="dash"] > li,
  .preview-content ul[data-list-style-type="checkmark"] > li,
  .preview-content ul[data-list-style-type="arrow"] > li {
      position: relative;
  }

  .tiptap ul[data-list-style-type="dash"] > li::before {
      content: "–";
      position: absolute;
      left: -1rem;
  }
  .tiptap ul[data-list-style-type="checkmark"] > li::before {
      content: "✓";
      position: absolute;
      left: -1rem;
      color: #10b981;
  }
  .tiptap ul[data-list-style-type="arrow"] > li::before {
      content: "➢";
      position: absolute;
      left: -1rem;
  }

  .preview-content ul[data-list-style-type="dash"] > li::before {
      content: "–";
      position: absolute;
      left: -4.2mm;
  }
  .preview-content ul[data-list-style-type="checkmark"] > li::before {
      content: "✓";
      position: absolute;
      left: -4.2mm;
      color: #10b981;
  }
  .preview-content ul[data-list-style-type="arrow"] > li::before {
      content: "➢";
      position: absolute;
      left: -4.2mm;
  }
  
  .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
  .preview-content ol { list-style-type: decimal; padding-left: 6.35mm; margin-bottom: 1.98mm; }
  
  .tiptap ul,
  .tiptap ol,
  .tiptap li {
    font-size: 8pt;
    line-height: 1.25;
  }
  .preview-content,
  .preview-content ul,
  .preview-content ol,
  .preview-content li {
    font-size: 2.82mm; /* 8pt */
  }

  .tiptap li { margin-bottom: 0.80mm; }
  .preview-content li { margin-bottom: 0.80mm; line-height: 3.53mm; }
  .tiptap li:last-child, .preview-content li:last-child { margin-bottom: 0mm; }

  .preview-content li p,
  .preview-content ul p,
  .preview-content ol p {
    margin: 0 !important;
    margin-bottom: 0 !important;
    line-height: inherit !important;
    font-size: 2.82mm !important; /* 8pt */
    min-height: 0 !important;
  }

  .tiptap li p,
  .tiptap ul p,
  .tiptap ol p {
    margin: 0 !important;
    margin-bottom: 0 !important;
    line-height: inherit !important;
    font-size: 8pt !important;
    min-height: 0 !important;
  }

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
    margin-top: 0.50mm;
    margin-bottom: 0.50mm;
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
    display: flex;
    flex-wrap: nowrap;
    gap: 1.50mm;
    margin: 1.00mm 0mm;
    max-width: 100%;
  }

  .preview-content .grid-image-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    max-width: 100%;
  }

  .preview-content div[data-type="image-grid"] img {
    object-fit: cover;
    margin: 0 !important;
    display: block;
    border-radius: 4px;
  }

  /* Active Editor inside TipTap (React Node View container) */
  .tiptap [data-type="image-grid"] {
    display: block;
    margin: 1rem 0;
    width: 100%;
  }

  .tiptap [data-type="image-grid"] [data-node-view-content],
  .tiptap [data-type="image-grid"] [data-node-view-content-react] {
    display: flex;
    flex-wrap: nowrap;
    gap: 12px;
    width: 100%;
  }

  .tiptap [data-type="image-grid"] [data-node-view-content] > *,
  .tiptap [data-type="image-grid"] [data-node-view-content-react] > * {
    display: block;
    margin: 0 !important;
  }

  .tiptap [data-type="image-grid"] [data-node-view-content] img,
  .tiptap [data-type="image-grid"] [data-node-view-content-react] img {
    object-fit: cover;
    margin: 0 !important;
    border-radius: 4px;
  }

  /* Alignment styling for standalone image wrappers */
  .tiptap [data-resize-container] {
    display: block;
    width: fit-content;
  }

  .image-wrapper {
    display: block;
    width: fit-content;
    max-width: 100%;
  }

  .image-wrapper.align-center {
    margin-left: auto !important;
    margin-right: auto !important;
  }

  .image-wrapper.align-left {
    margin-left: 0 !important;
    margin-right: auto !important;
  }

  .image-wrapper.align-right {
    margin-left: auto !important;
    margin-right: 0 !important;
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
  .preview-content table th p,
  .preview-content table td p,
  .preview-content table p,
  .tiptap table th p,
  .tiptap table td p,
  .tiptap table p {
    margin: 0 !important;
    line-height: inherit !important;
    font-size: inherit !important;
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
  /* Only show on standalone images – image-grid has its own crop/resize UI */
  .tiptap [data-type="image-grid"] [data-resize-wrapper] .image-crop-btn,
  .tiptap [data-type="image-grid"] [data-resize-handle] {
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

  /* ── Image Captions ── */
  .image-caption-container {
    margin-top: 0px;
    width: 100%;
    text-align: center;
  }
  .image-caption-input {
    transition: border-color 0.15s ease-in-out;
  }
  .image-caption-input:focus {
    border-color: #6366f1 !important;
    border-style: solid !important;
  }
  .image-caption, .gallery-image-caption, figcaption {
    font-size: 11px;
    color: #64748b;
    text-align: center;
    margin-top: 4px;
    font-style: italic;
    line-height: 1.3;
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
