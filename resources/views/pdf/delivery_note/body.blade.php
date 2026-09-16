<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Nota de Entrega {{ $specimen ? $specimen->sequence_code : 'OT-' . $workOrder->id }}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body, div, p, span, h1, h2, h3, h4, h5, h6, ul, ol, li, table, tr, th, td, blockquote, img {
            margin: 0;
            padding: 0;
            border: 0;
        }

        .section-content > *:first-child {
            margin-top: 0 !important;
        }

        @page {
            size: 215.9mm 279.4mm;
            margin: 0;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 2.78mm;
            color: #1f2937;
            line-height: 3.97mm;
            background-color: #ffffff;
            margin: 0mm;
            padding: 0mm;
            -webkit-print-color-adjust: exact;
        }

        .report-page {
            width: 215.9mm;
            height: 279.4mm;
            padding: 12mm 15mm 12mm 15mm;
            position: relative;
            box-sizing: border-box;
            page-break-after: always;
            overflow: hidden;
            background-color: #ffffff;
        }

        .report-page:last-child {
            page-break-after: avoid;
        }

        .page-content {
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
        }

        header.report-header {
            width: 100%;
            margin-bottom: 4.5mm;
        }

        .header-table {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: -2.0mm;
            margin-bottom: 0.5mm;
            position: relative;
        }

        .header-logo-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .header-logo-img {
            height: 11mm;
            max-height: 11mm;
            width: auto;
            margin-left: auto;
            margin-right: auto;
            margin-bottom: 0.6mm;
        }

        .report-pre-title {
            font-size: 2.3mm;
            line-height: 3.0mm;
            text-align: center;
            font-style: italic;
        }

        .report-title {
            text-align: center;
            font-size: 4.8mm;
            line-height: 5.0mm;
            font-weight: 700;
            color: #000000;
            margin-top: 1.7mm;
            margin-bottom: 0.6mm;
            text-transform: uppercase;
        }

        .header-divider {
            width: 100%;
            height: 0.5mm;
            background-color: #000000;
            margin-top: 0.5mm;
        }

        footer.report-footer {
            position: absolute;
            bottom: 5mm;
            left: 15mm;
            right: 15mm;
            height: 24mm;
        }

        .footer-divider {
            width: 100%;
            height: 0.53mm;
            background-color: #000000;
            margin-bottom: 0.79mm;
        }

        .confidentiality-notice {
            text-align: center;
            font-size: 3.18mm;
            font-weight: 600;
            color: #374151;
            margin-bottom: 1.59mm;
        }

        .footer-contact-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
        }

        .footer-contact-table tr, .footer-contact-table td {
            border: none;
            padding: 0;
        }

        .contact-col {
            vertical-align: middle;
            font-size: 3.18mm;
            color: #4b5563;
        }

        .contact-text {
            font-size: 3.18mm;
            color: #4b5563;
        }

        .page-number-box {
            position: absolute;
            bottom: 4mm;
            left: 0;
            font-size: 3.18mm;
            font-weight: 600;
            color: #4b5563;
        }

        /* Content Styling */
        .section-content, .preview-content {
            font-size: 2.82mm;
            color: #1f2937;
            text-align: justify;
            margin-bottom: 0mm;
            line-height: 3.53mm;
        }

        .section-content p, .section-content h1, .section-content h2, .section-content h3, .section-content h4, .section-content h5, .section-content h6, .section-content ul, .section-content ol, .section-content li, .section-content table, .section-content tr, .section-content th, .section-content td,
        .preview-content p, .preview-content h1, .preview-content h2, .preview-content h3, .preview-content h4, .preview-content h5, .preview-content h6, .preview-content ul, .preview-content ol, .preview-content li, .preview-content table, .preview-content tr, .preview-content th, .preview-content td {
            margin: 0;
            padding: 0;
        }

        .section-content p, .preview-content p {
            margin-bottom: 1.98mm;
            text-align: justify;
            line-height: 3.53mm;
            font-size: 2.82mm;
            min-height: 3.53mm;
        }

        .section-content ul, .preview-content ul {
            list-style-type: disc;
            padding-left: 6.35mm;
            margin-bottom: 1.98mm;
        }

        .section-content ul[data-list-style-type="disc"], .preview-content ul[data-list-style-type="disc"] {
            list-style-type: disc;
        }

        .section-content ul[data-list-style-type="circle"], .preview-content ul[data-list-style-type="circle"] {
            list-style-type: circle;
        }

        .section-content ul[data-list-style-type="square"], .preview-content ul[data-list-style-type="square"] {
            list-style-type: square;
        }

        .section-content ul[data-list-style-type="dash"],
        .section-content ul[data-list-style-type="checkmark"],
        .section-content ul[data-list-style-type="arrow"],
        .preview-content ul[data-list-style-type="dash"],
        .preview-content ul[data-list-style-type="checkmark"],
        .preview-content ul[data-list-style-type="arrow"] {
            list-style-type: none !important;
        }

        .section-content ul[data-list-style-type="dash"] > li,
        .section-content ul[data-list-style-type="checkmark"] > li,
        .section-content ul[data-list-style-type="arrow"] > li,
        .preview-content ul[data-list-style-type="dash"] > li,
        .preview-content ul[data-list-style-type="checkmark"] > li,
        .preview-content ul[data-list-style-type="arrow"] > li {
            position: relative;
        }

        .section-content ul[data-list-style-type="dash"] > li::before,
        .preview-content ul[data-list-style-type="dash"] > li::before {
            content: "–";
            position: absolute;
            left: -4.2mm;
        }

        .section-content ul[data-list-style-type="checkmark"] > li::before,
        .preview-content ul[data-list-style-type="checkmark"] > li::before {
            content: "✓";
            position: absolute;
            left: -4.2mm;
            color: #10b981;
        }

        .section-content ul[data-list-style-type="arrow"] > li::before,
        .preview-content ul[data-list-style-type="arrow"] > li::before {
            content: "➢";
            position: absolute;
            left: -4.2mm;
        }

        .section-content ul[data-list-style-type="none"], .preview-content ul[data-list-style-type="none"] {
            list-style-type: none;
        }

        .section-content ol, .preview-content ol {
            list-style-type: decimal;
            padding-left: 6.35mm;
            margin-bottom: 1.98mm;
        }

        .section-content,
        .section-content ul,
        .section-content ol,
        .section-content li,
        .preview-content,
        .preview-content ul,
        .preview-content ol,
        .preview-content li {
            font-size: 2.82mm;
        }

        .section-content li, .preview-content li {
            margin-bottom: 0.80mm;
            line-height: 3.53mm;
        }

        .section-content li:last-child, .preview-content li:last-child {
            margin-bottom: 0mm;
        }

        .section-content li p,
        .section-content ul p,
        .section-content ol p,
        .preview-content li p,
        .preview-content ul p,
        .preview-content ol p {
            margin: 0 !important;
            margin-bottom: 0 !important;
            line-height: inherit !important;
            font-size: 2.82mm !important;
            min-height: 0 !important;
        }

        .section-content h1, .preview-content h1 {
            font-size: 4.23mm;
            font-weight: 700;
            margin-top: 3.97mm;
            margin-bottom: 2.65mm;
            color: #111827;
            line-height: 5.29mm;
        }

        .section-content h2, .preview-content h2 {
            font-size: 3.70mm;
            font-weight: 600;
            margin-top: 1.59mm;
            margin-bottom: 1.59mm;
            color: #1f2937;
            line-height: 4.76mm;
        }

        .section-content h3, .preview-content h3 {
            font-size: 3.18mm;
            font-weight: 600;
            margin-top: 1.98mm;
            margin-bottom: 1.98mm;
            color: #374151;
            line-height: 3.97mm;
        }

        .section-content h4, .preview-content h4 {
            font-size: 2.91mm;
            font-weight: 600;
            margin-top: 1.32mm;
            margin-bottom: 1.32mm;
            color: #4b5563;
            line-height: 3.97mm;
        }

        .section-content h5, .preview-content h5 {
            font-size: 2.65mm;
            font-weight: 600;
            margin-top: 1.00mm;
            margin-bottom: 1.00mm;
            color: #4b5563;
            line-height: 3.53mm;
        }

        .section-content h6, .preview-content h6 {
            font-size: 2.50mm;
            font-weight: 600;
            margin-top: 0.80mm;
            margin-bottom: 0.80mm;
            color: #6b7280;
            line-height: 3.53mm;
        }

        .section-content u, .preview-content u {
            text-decoration: underline;
        }

        .section-content s, .section-content del, .preview-content s, .preview-content del {
            text-decoration: line-through;
        }

        .section-content mark, .preview-content mark {
            background-color: #fef08a;
            color: inherit;
            border-radius: 0.53mm;
            padding: 0mm 0.53mm;
        }

        .section-content .dictation-highlight, .preview-content .dictation-highlight {
            background-color: rgb(220 252 231);
            color: rgb(21 128 61);
            border-radius: 0.53mm;
        }

        .section-content blockquote, .preview-content blockquote {
            border-left: 0.79mm solid #d1d5db;
            padding-left: 4.23mm;
            color: #6b7280;
            font-style: italic;
            margin: 1.32mm 0mm;
        }

        .section-content code, .preview-content code {
            background: #f3f4f6;
            border-radius: 0.79mm;
            padding: 0.1em 0.3em;
            font-size: 0.85em;
            font-family: monospace;
        }

        .section-content .align-left, .preview-content .align-left {
            text-align: left;
        }

        .section-content .align-center, .preview-content .align-center {
            text-align: center;
        }

        .section-content .align-right, .preview-content .align-right {
            text-align: right;
        }

        .section-content .align-justify, .preview-content .align-justify {
            text-align: justify;
        }

        .section-content table, .preview-content table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1.32mm;
            margin-bottom: 2.65mm;
        }

        .section-content table th, .section-content table td,
        .preview-content table th, .preview-content table td {
            border: 0.26mm solid #d1d5db;
            padding: 1.06mm 1.59mm;
            font-size: 2.51mm;
            text-align: left;
            line-height: 3.97mm;
        }

        .section-content table th p,
        .section-content table td p,
        .section-content table p,
        .preview-content table th p,
        .preview-content table td p,
        .preview-content table p {
            margin: 0 !important;
            line-height: inherit !important;
            font-size: inherit !important;
        }

        .section-content table th, .preview-content table th {
            background-color: #f3f4f6;
            font-weight: 600;
        }

        .section-content .tableWrapper,
        .preview-content .tableWrapper {
            overflow-x: auto;
            width: 100%;
            margin: 1.32mm 0mm 2.65mm;
        }

        .section-content img, .preview-content img {
            max-width: 100%;
            height: auto;
            border-radius: 1.06mm;
            margin-top: 0.50mm;
            margin-bottom: 0.50mm;
            display: block;
        }

        /* ── Image Alignment ── */
        .section-content img[style*="text-align: center"],
        .section-content img.align-center,
        .preview-content img[style*="text-align: center"],
        .preview-content img.align-center {
            margin-left: auto;
            margin-right: auto;
            display: block;
        }

        .section-content img[style*="text-align: right"],
        .section-content img.align-right,
        .preview-content img[style*="text-align: right"],
        .preview-content img.align-right {
            margin-left: auto;
            margin-right: 0;
            display: block;
        }

        .section-content img[style*="text-align: left"],
        .section-content img.align-left,
        .preview-content img[style*="text-align: left"],
        .preview-content img.align-left {
            margin-left: 0;
            margin-right: auto;
            display: block;
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

        .section-content div[data-type="image-grid"],
        .preview-content div[data-type="image-grid"] {
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 1.50mm;
            margin: 1.00mm 0mm;
            max-width: 100%;
        }

        .section-content div[data-type="image-grid"].align-center,
        .preview-content div[data-type="image-grid"].align-center {
            margin-left: auto !important;
            margin-right: auto !important;
        }

        .section-content div[data-type="image-grid"].align-left,
        .preview-content div[data-type="image-grid"].align-left {
            margin-left: 0 !important;
            margin-right: auto !important;
        }

        .section-content div[data-type="image-grid"].align-right,
        .preview-content div[data-type="image-grid"].align-right {
            margin-left: auto !important;
            margin-right: 0 !important;
        }

        .section-content .grid-image-container,
        .preview-content .grid-image-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            max-width: 100%;
        }

        .section-content div[data-type="image-grid"] img,
        .preview-content div[data-type="image-grid"] img {
            object-fit: cover;
            margin: 0 !important;
            display: block;
            border-radius: 4px;
        }

        .section-content div[data-type="image-grid"] > img,
        .preview-content div[data-type="image-grid"] > img {
            flex: 1 1 0px !important;
            min-width: 0 !important;
            max-width: 100% !important;
            height: auto;
            object-fit: cover;
        }

        /* ── Image Captions ── */
        .section-content .image-caption-container,
        .preview-content .image-caption-container,
        .image-caption-container {
            margin-top: 0px;
            width: 100%;
            text-align: center;
        }

        .section-content .image-caption,
        .section-content .gallery-image-caption,
        .section-content figcaption,
        .preview-content .image-caption,
        .preview-content .gallery-image-caption,
        .preview-content figcaption,
        .image-caption,
        .gallery-image-caption,
        figcaption {
            font-size: 11px;
            color: #64748b;
            text-align: center;
            margin-top: 4px;
            font-style: italic;
            line-height: 1.3;
        }

        /* Signatures block */
        .signatures-wrapper {
            margin-top: 3.5mm;
            width: 100%;
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .signatures-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
        }

        .signatures-table td {
            border: none;
            padding: 0;
            vertical-align: bottom;
        }

        .signature-line-box {
            width: 65mm;
            margin: 0 auto;
            text-align: center;
        }

        .signature-gap {
            height: 13.5mm;
            width: 100%;
        }

        .signature-line {
            width: 100%;
            border-top: 0.40mm solid #1f2937;
            margin-bottom: 1.5mm;
        }

        .signature-label {
            font-size: 3.18mm;
            font-weight: 700;
            color: #1f2937;
            letter-spacing: 0.2mm;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    @foreach ($pages as $pageIndex => $pageBlocks)
        <div class="report-page">
            @include('pdf.delivery_note.header', [
                'specimen' => $specimen,
                'workOrder' => $workOrder,
                'pageNum' => $pageIndex + 1
            ])

            <div class="page-content">
                @foreach ($pageBlocks as $block)
                    @if ($block['type'] === 'signatures')
                        <div class="signatures-wrapper">
                            <table class="signatures-table">
                                <tr>
                                    <td style="width: 45%;">
                                        <div class="signature-line-box">
                                            <div class="signature-gap"></div>
                                            <div class="signature-line"></div>
                                            <div class="signature-label">FIRMA ENTREGA</div>
                                        </div>
                                    </td>
                                    <td style="width: 10%;"></td>
                                    <td style="width: 45%;">
                                        <div class="signature-line-box">
                                            <div class="signature-gap"></div>
                                            <div class="signature-line"></div>
                                            <div class="signature-label">FIRMA RECIBE</div>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    @else
                        <div class="section-content preview-content">
                            {!! $block['html'] ?? '' !!}
                        </div>
                    @endif
                @endforeach
            </div>

            @include('pdf.delivery_note.footer', [
                'pageNum' => $pageIndex + 1,
                'totalPages' => count($pages)
            ])
        </div>
    @endforeach
</body>
</html>
