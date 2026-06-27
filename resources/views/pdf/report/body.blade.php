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
            font-size: 2.78mm;
            color: #1f2937;
            line-height: 3.97mm;
            background-color: #ffffff;
            margin: 0mm;
            padding: 0mm;
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

        /* Content height budget (48 lines max at 3.97mm/line = 190.56mm) */
        .page-content {
            width: 100%;
            height: 190.50mm;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
        }

        /* Header styling (normal flow inside page) */
        header.report-header {
            width: 100%;
            height: 34.93mm;
            margin-bottom: 3.97mm;
        }

        .header-table {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.53mm;
        }

        .header-logo-cell {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }

        .header-logo-img {
            max-height: 13.76mm;
            width: auto;
        }

        .header-tagline {
            font-size: 2.38mm;
            font-style: italic;
            color: #4b5563;
            margin-top: 0.26mm;
        }

        .header-code-cell {
            display: flex;
            justify-content: flex-end;
            align-items: flex-start;
        }

        .specimen-badge {
            background-color: #f3f4f6;
            border: 0.26mm solid #d1d5db;
            color: #374151;
            font-family: monospace;
            font-weight: 800;
            font-size: 2.91mm;
            padding: 1.06mm 2.12mm;
            border-radius: 1.06mm;
            display: inline-block;
        }

        .report-title {
            text-align: center;
            font-size: 4.23mm;
            font-weight: 700;
            color: #000000;
            margin-top: 0.53mm;
            margin-bottom: 0.79mm;
            letter-spacing: 0.13mm;
            padding-bottom: 3.18mm;
        }

        .header-divider {
            width: 100%;
            height: 0.53mm;
            background-color: #000000;
            margin-top: 0.53mm;
        }

        /* Footer styling (absolute at the bottom of page box) */
        footer.report-footer {
            position: absolute;
            bottom: 12mm;
            left: 15mm;
            right: 15mm;
            height: 20.11mm;
        }

        .footer-divider {
            width: 100%;
            height: 0.53mm;
            background-color: #000000;
            margin-bottom: 0.79mm;
        }

        .confidentiality-notice {
            text-align: center;
            font-size: 2.12mm;
            font-weight: 600;
            color: #374151;
            margin-bottom: 1.32mm;
        }

        .footer-contact-table {
            width: 100%;
            border-collapse: collapse;
        }

        .contact-col {
            width: 25%;
            vertical-align: middle;
            font-size: 2.12mm;
            color: #4b5563;
        }

        .contact-icon {
            font-size: 2.65mm;
            margin-right: 0.79mm;
            color: #1e3a8a;
        }

        .page-number-box {
            position: absolute;
            bottom: 0mm;
            left: 0mm;
            font-size: 2.12mm;
            font-weight: 600;
            color: #4b5563;
        }

        /* Patient Metadata Card */
        .patient-card {
            width: 100%;
            border: 0.26mm solid #bfdbfe;
            border-radius: 1.59mm;
            background-color: #eff6ff;
            margin-bottom: 3.97mm;
            padding: 2.65mm 3.70mm;
            border-collapse: collapse;
        }

        .patient-card td {
            padding: 1.32mm 2.12mm;
            vertical-align: top;
            font-size: 2.51mm;
            line-height: 3.97mm;
        }

        .patient-card strong {
            color: #1e3a8a;
            font-weight: 600;
        }

        /* Section titles */
        .section-header-title {
            font-size: 2.91mm;
            font-weight: 700;
            color: #000000;
            margin-top: 2.65mm;
            margin-bottom: 1.32mm;
            text-transform: uppercase;
            line-height: 3.97mm;
            height: 3.97mm;
        }

        /* Content Styling */
        .section-content {
            font-size: 2.51mm;
            color: #1f2937;
            text-align: justify;
            margin-bottom: 1.98mm; /* 0.5 lines */
            line-height: 3.97mm;
        }

        .section-content p {
            margin-bottom: 1.98mm;
            text-align: justify;
            line-height: 3.97mm;
        }

        .section-content ul {
            list-style-type: disc;
            padding-left: 6.35mm;
            margin-bottom: 1.98mm;
        }

        .section-content ol {
            list-style-type: decimal;
            padding-left: 6.35mm;
            margin-bottom: 1.98mm;
        }

        .section-content li {
            margin-bottom: 0mm;
            line-height: 3.97mm;
        }

        .section-content h1 {
            font-size: 4.23mm;
            font-weight: 700;
            margin-top: 3.97mm;
            margin-bottom: 2.65mm;
            color: #111827;
            line-height: 5.29mm;
        }

        .section-content h2 {
            font-size: 3.70mm;
            font-weight: 600;
            margin-top: 1.59mm;
            margin-bottom: 1.59mm;
            color: #1f2937;
            line-height: 4.76mm;
        }

        .section-content h3 {
            font-size: 3.18mm;
            font-weight: 600;
            margin-top: 1.98mm;
            margin-bottom: 1.98mm;
            color: #374151;
            line-height: 3.97mm;
        }

        .section-content h4 {
            font-size: 2.91mm;
            font-weight: 600;
            margin-top: 1.32mm;
            margin-bottom: 1.32mm;
            color: #4b5563;
            line-height: 3.97mm;
        }

        .section-content u {
            text-decoration: underline;
        }

        .section-content s, .section-content del {
            text-decoration: line-through;
        }

        .section-content mark {
            background-color: #fef08a;
            color: inherit;
            border-radius: 0.53mm;
            padding: 0mm 0.53mm;
        }

        .section-content blockquote {
            border-left: 0.79mm solid #d1d5db;
            padding-left: 4.23mm;
            color: #6b7280;
            font-style: italic;
            margin: 1.32mm 0mm;
        }

        .section-content code {
            background: #f3f4f6;
            border-radius: 0.79mm;
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
            margin-top: 1.32mm;
            margin-bottom: 2.65mm;
        }

        .section-content table th, .section-content table td {
            border: 0.26mm solid #d1d5db;
            padding: 1.06mm 1.59mm;
            font-size: 2.51mm;
            text-align: left;
            line-height: 3.97mm;
        }

        .section-content table th {
            background-color: #f3f4f6;
            font-weight: 600;
        }

        .section-content img {
            max-width: 100%;
            height: auto;
            border-radius: 1.06mm;
            margin-top: 1.32mm;
            margin-bottom: 1.32mm;
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

        /* ── Image Grid ── */
        .section-content div[data-type="image-grid"] {
            display: grid;
            gap: 3.18mm;
            margin-top: 2.65mm;
            margin-bottom: 2.65mm;
            width: 100%;
            border: 0.26mm solid #e2e8f0;
            border-radius: 2.12mm;
            padding: 2.65mm;
            background-color: rgba(248, 250, 252, 0.1);
        }

        .section-content div[data-type="image-grid"][data-columns="1"] {
            grid-template-columns: repeat(1, 1fr);
        }

        .section-content div[data-type="image-grid"][data-columns="2"] {
            grid-template-columns: repeat(2, 1fr);
        }

        .section-content div[data-type="image-grid"][data-columns="3"] {
            grid-template-columns: repeat(3, 1fr);
        }

        .section-content div[data-type="image-grid"][data-columns="4"] {
            grid-template-columns: repeat(4, 1fr);
        }

        .section-content div[data-type="image-grid"] img {
            width: 100% !important;
            height: auto !important;
            object-fit: cover;
            border-radius: 1.06mm;
            margin: 0 auto !important;
            display: block;
        }

        /* Pathologist Signature Block */
        .signature-block-container {
            margin-top: 3.97mm;
            text-align: center;
            line-height: 3.97mm;
        }

        .signature-line {
            width: 58.21mm;
            border-top: 0.40mm solid #4b5563;
            margin: 0 auto 1.32mm auto;
        }

        .pathologist-name {
            font-size: 2.65mm;
            font-weight: 700;
            color: #1f2937;
            text-transform: uppercase;
        }

        .pathologist-title {
            font-size: 2.25mm;
            color: #4b5563;
            font-weight: 500;
            text-transform: uppercase;
        }

        .date-signature {
            font-size: 2.38mm;
            font-weight: 600;
            color: #374151;
            margin-top: 1.32mm;
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
                        <div class="signatures-container" style="display: flex; flex-direction: column; gap: 4mm; margin-top: 4mm; align-items: center; width: 100%;">
                            @php
                                $assignedUsers = $specimen->users;
                                if ($assignedUsers->isEmpty()) {
                                    $assignedUsers = collect([
                                        (object)[
                                            'id' => 0,
                                            'name' => 'DRA. ESTEFANY LAGOS',
                                            'role' => (object)['name' => 'PATOLOGÍA ONCOLÓGICA'],
                                            'signature_url' => null,
                                            'user_signature' => null,
                                            'signature_base64' => null,
                                        ]
                                    ]);
                                }
                                $chunks = $assignedUsers->chunk(2);
                            @endphp

                            @foreach($chunks as $row)
                                <div class="signature-row" style="display: flex; justify-content: center; align-items: flex-end; gap: 15mm; width: 100%;">
                                    @foreach($row as $pathologist)
                                        <div class="signature-item" style="width: 58.21mm; text-align: center; display: flex; flex-direction: column; align-items: center;">
                                            @if(!empty($pathologist->signature_base64))
                                                <img src="{{ $pathologist->signature_base64 }}" style="max-height: 12mm; width: auto; margin-bottom: 2mm; display: block;" />
                                            @elseif(!empty($pathologist->signature_url))
                                                <img src="{{ $pathologist->signature_url }}" style="max-height: 12mm; width: auto; margin-bottom: 2mm; display: block;" />
                                            @else
                                                <div style="height: 14mm;"></div>
                                            @endif
                                            <div class="signature-line" style="width: 100%; border-top: 0.40mm solid #4b5563; margin-bottom: 1.32mm;"></div>
                                            <div class="pathologist-name" style="font-size: 2.65mm; font-weight: 700; color: #1f2937; text-transform: uppercase;">{{ $pathologist->name }}</div>
                                            <div class="pathologist-title" style="font-size: 2.25mm; color: #4b5563; font-weight: 500; text-transform: uppercase;">{{ $pathologist->role ? $pathologist->role->name : 'PATOLOGÍA ONCOLÓGICA' }}</div>
                                            <div class="date-signature" style="font-size: 2.38mm; font-weight: 600; color: #374151; margin-top: 1.32mm;">FECHA: {{ $report->report_date ? \Carbon\Carbon::parse($report->report_date)->format('d/m/y') : now()->format('d/m/y') }}</div>
                                        </div>
                                    @endforeach
                                </div>
                            @endforeach
                        </div>
                    @endif
                @endforeach
            </div>

            @include('pdf.report.footer', ['pageNum' => $index + 1, 'totalPages' => count($pages)])

        </div>
    @endforeach

</body>
</html>
