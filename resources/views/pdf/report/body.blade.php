<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Espécimen {{ $specimen->sequence_code }}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
 
        @page {
            size: 215.9mm 279.4mm;
            margin: 0;
        }

        body {
            font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif;
            font-size: 10.5px;
            color: #1f2937;
            line-height: 15px;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
        }

        /* Explicit Page Container for high-fidelity paginated reports */
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

        /* Content height budget (48 lines max at 15px/line = 720px) */
        .page-content {
            width: 100%;
            height: 720px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
        }

        /* Header styling (normal flow inside page) */
        header.report-header {
            width: 100%;
            height: 132px;
            margin-bottom: 15px;
        }

        .header-table {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2px;
        }

        .header-logo-cell {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }

        .header-logo-img {
            max-height: 52px;
            width: auto;
        }

        .header-tagline {
            font-size: 9px;
            font-style: italic;
            color: #4b5563;
            margin-top: 1px;
        }

        .header-code-cell {
            display: flex;
            justify-content: flex-end;
            align-items: flex-start;
        }

        .specimen-badge {
            background-color: #f3f4f6;
            border: 1px solid #d1d5db;
            color: #374151;
            font-family: monospace;
            font-weight: 800;
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
        }

        .report-title {
            text-align: center;
            font-size: 16px;
            font-weight: 700;
            color: #000000;
            margin-top: 2px;
            margin-bottom: 3px;
            letter-spacing: 0.5px;
			padding-bottom: 12px;
        }

        .header-divider {
            width: 100%;
            height: 2px;
            background-color: #000000;
            margin-top: 2px;
        }

        /* Footer styling (absolute at the bottom of page box) */
        footer.report-footer {
            position: absolute;
            bottom: 12mm;
            left: 15mm;
            right: 15mm;
            height: 76px;
        }

        .footer-divider {
            width: 100%;
            height: 2px;
            background-color: #000000;
            margin-bottom: 3px;
        }

        .confidentiality-notice {
            text-align: center;
            font-size: 8px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 5px;
        }

        .footer-contact-table {
            width: 100%;
            border-collapse: collapse;
        }

        .contact-col {
            width: 25%;
            vertical-align: middle;
            font-size: 8px;
            color: #4b5563;
        }

        .contact-icon {
            font-size: 10px;
            margin-right: 3px;
            color: #1e3a8a;
        }

        .page-number-box {
            position: absolute;
            bottom: 0px;
            left: 0;
            font-size: 8px;
            font-weight: 600;
            color: #4b5563;
        }

        /* Patient Metadata Card */
        .patient-card {
            width: 100%;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            background-color: #eff6ff;
            margin-bottom: 15px;
            padding: 10px 14px;
            border-collapse: collapse;
        }

        .patient-card td {
            padding: 5px 8px;
            vertical-align: top;
            font-size: 9.5px;
            line-height: 15px;
        }

        .patient-card strong {
            color: #1e3a8a;
            font-weight: 600;
        }

        /* Section titles */
        .section-header-title {
            font-size: 11px;
            font-weight: 700;
            color: #000000;
            margin-top: 10px;
            margin-bottom: 5px;
            text-transform: uppercase;
            line-height: 15px;
            height: 15px;
        }

        /* Content Styling */
        .section-content {
            font-size: 9.5px;
            color: #1f2937;
            text-align: justify;
            margin-bottom: 7.5px; /* 0.5 lines */
            line-height: 15px;
        }

        .section-content p {
            margin-bottom: 7.5px;
            text-align: justify;
            line-height: 15px;
        }

        .section-content ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin-bottom: 7.5px;
        }

        .section-content ol {
            list-style-type: decimal;
            padding-left: 1.5rem;
            margin-bottom: 7.5px;
        }

        .section-content li {
            margin-bottom: 0px;
            line-height: 15px;
        }

        .section-content h1 {
            font-size: 16px;
            font-weight: 700;
            margin-top: 15px;
            margin-bottom: 10px;
            color: #111827;
            line-height: 20px;
        }

        .section-content h2 {
            font-size: 14px;
            font-weight: 600;
            margin-top: 6px;
            margin-bottom: 6px;
            color: #1f2937;
            line-height: 18px;
        }

        .section-content h3 {
            font-size: 12px;
            font-weight: 600;
            margin-top: 7.5px;
            margin-bottom: 7.5px;
            color: #374151;
            line-height: 15px;
        }

        .section-content h4 {
            font-size: 11px;
            font-weight: 600;
            margin-top: 5px;
            margin-bottom: 5px;
            color: #4b5563;
            line-height: 15px;
        }

        .section-content u {
            text-decoration: underline;
        }

        .section-content s, .section-content del {
            text-decoration: line-through;
        }

        .section-content blockquote {
            border-left: 3px solid #d1d5db;
            padding-left: 1rem;
            color: #6b7280;
            font-style: italic;
            margin: 5px 0;
        }

        .section-content code {
            background: #f3f4f6;
            border-radius: 3px;
            padding: 0.1em 0.3em;
            font-size: 0.85em;
            font-family: monospace;
        }

        .section-content .align-left {
            text-align: left;
        }

        .section-content .align-center {
            text-align: center;
        }

        .section-content .align-right {
            text-align: right;
        }

        .section-content .align-justify {
            text-align: justify;
        }

        .section-content table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
            margin-bottom: 10px;
        }

        .section-content table th, .section-content table td {
            border: 1px solid #d1d5db;
            padding: 4px 6px;
            font-size: 9.5px;
            text-align: left;
            line-height: 15px;
        }

        .section-content table th {
            background-color: #f3f4f6;
            font-weight: 600;
        }

        .section-content img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin-top: 5px;
            margin-bottom: 5px;
            display: block;
        }

        /* ── Image Alignment ── */
        .section-content img[style*="text-align: center"],
        .section-content img.align-center {
            margin-left: auto;
            margin-right: auto;
            display: block;
        }

        .section-content img[style*="text-align: right"],
        .section-content img.align-right {
            margin-left: auto;
            margin-right: 0;
            display: block;
        }

        .section-content img[style*="text-align: left"],
        .section-content img.align-left {
            margin-left: 0;
            margin-right: auto;
            display: block;
        }

        /* Pathologist Signature Block */
        .signature-block-container {
            margin-top: 15px;
            text-align: center;
            line-height: 15px;
        }

        .signature-line {
            width: 220px;
            border-top: 1.5px solid #4b5563;
            margin: 0 auto 5px auto;
        }

        .pathologist-name {
            font-size: 10px;
            font-weight: 700;
            color: #1f2937;
            text-transform: uppercase;
        }

        .pathologist-title {
            font-size: 8.5px;
            color: #4b5563;
            font-weight: 500;
            text-transform: uppercase;
        }

        .date-signature {
            font-size: 9px;
            font-weight: 600;
            color: #374151;
            margin-top: 5px;
        }
    </style>
</head>
<body>

    @foreach($pages as $index => $pageBlocks)
        <div class="report-page">
            
            @include('pdf.report.header')

            <div class="page-content">
                @foreach($pageBlocks as $block)
                    @if($block['type'] === 'patient-card')
                        <table class="patient-card">
                            <tr>
                                <td style="width: 55%;">
                                    <strong>Nombre:</strong> {{ $customer->name ?? 'N/A' }}<br>
                                    <strong>Edad:</strong> {{ $customer->age ?? 'N/A' }} años &nbsp;&nbsp;&nbsp; <strong>Sexo:</strong> {{ $customer->gender === 'M' || $customer->gender === 'masculino' || $customer->gender === 'Masculino' ? 'M' : 'F' }}<br>
                                    <strong>Médico Remitente:</strong> {{ $referrer->name ?? 'N/A' }}<br>
                                    <strong>Diagnóstico Clínico:</strong> {{ $specimen->diagnosis ?? 'N/A' }}
                                </td>
                                <td style="width: 45%; padding-left: 12px;">
                                    <strong>Hospital/Clínica:</strong> {{ $referrer->notes ?? 'HDV' }}<br>
                                    <strong>Sitio Preciso de la Muestra:</strong> {{ $specimen->anatomic_site ?? 'N/A' }}<br>
                                    <strong>Fecha de la Toma:</strong> {{ $specimen->created_at ? $specimen->created_at->format('d/m/Y') : 'N/A' }}<br>
                                    <strong>Fecha de Recibo:</strong> {{ $specimen->created_at ? $specimen->created_at->format('d/m/Y') : 'N/A' }}
                                </td>
                            </tr>
                        </table>
                    @elseif($block['type'] === 'section-header')
                        <div class="section-header-title">{{ $block['title'] }}</div>
                    @elseif($block['type'] === 'html' || $block['type'] === 'paragraph' || $block['type'] === 'list' || $block['type'] === 'table' || $block['type'] === 'image' || $block['type'] === 'heading')
                        <div class="{!! $block['class'] ?? 'section-content' !!}">
                            {!! $block['html'] !!}
                        </div>
                    @elseif($block['type'] === 'signature')
                        <div class="signature-block-container">
                            <div class="signature-line"></div>
                            @php
                                $pathologist = $specimen->users->first();
                                $pathologistName = $pathologist ? $pathologist->name : 'DRA. ESTEFANY LAGOS';
                                $pathologistTitle = $pathologist ? ($pathologist->role ? $pathologist->role->name : 'PATOLOGÍA ONCOLÓGICA') : 'PATOLOGÍA ONCOLÓGICA';
                            @endphp
                            <div class="pathologist-name">{{ $pathologistName }}</div>
                            <div class="pathologist-title">{{ $pathologistTitle }}</div>
                            <div class="date-signature">FECHA: {{ $report->report_date ? \Carbon\Carbon::parse($report->report_date)->format('d/m/y') : now()->format('d/m/y') }}</div>
                        </div>
                    @endif
                @endforeach
            </div>

            @include('pdf.report.footer', ['pageNum' => $index + 1, 'totalPages' => count($pages)])

        </div>
    @endforeach

</body>
</html>
