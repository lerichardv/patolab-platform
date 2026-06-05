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
            size: 216mm 279mm;
            margin: 45mm 15mm 30mm 15mm;
        }

        body {
            font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif;
            font-size: 10.5px;
            color: #1f2937;
            line-height: 1.45;
            background-color: #ffffff;
        }

        /* Header styling (fixed top) */
        header.report-header {
            position: fixed;
            top: 5mm;
            left: 15mm;
            right: 15mm;
            height: 35mm;
        }

        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2px;
        }

        .header-logo-cell {
            width: 60%;
            vertical-align: top;
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
            width: 40%;
            text-align: right;
            vertical-align: top;
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
            font-size: 12px;
            font-weight: 700;
            color: #000000;
            margin-top: 2px;
            margin-bottom: 3px;
            letter-spacing: 0.5px;
        }

        .header-divider {
            width: 100%;
            height: 2px;
            background-color: #000000;
            margin-top: 2px;
        }

        /* Footer styling (fixed bottom) */
        footer.report-footer {
            position: fixed;
            bottom: 5mm;
            left: 15mm;
            right: 15mm;
            height: 20mm;
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

        .page-num-counter::after {
            content: "Página " counter(page) " de " counter(pages);
        }

        /* Patient Metadata Card */
        .patient-card {
            width: 100%;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            background-color: #eff6ff;
            margin-bottom: 15px;
            padding: 8px 12px;
            border-collapse: collapse;
        }

        .patient-card td {
            padding: 3px 6px;
            vertical-align: top;
            font-size: 9.5px;
        }

        .patient-card strong {
            color: #1e3a8a;
            font-weight: 600;
        }

        /* Report Sections styling */
        .section-container {
            margin-bottom: 12px;
        }

        .section-header-title {
            font-size: 11px;
            font-weight: 700;
            color: #000000;
            margin-bottom: 5px;
            text-transform: uppercase;
        }

        .section-content {
            font-size: 10px;
            color: #1f2937;
            text-align: justify;
            margin-bottom: 10px;
            line-height: 1.5;
        }

        .section-content p {
            margin-bottom: 0.5rem;
            text-align: justify;
        }

        .section-content ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin-bottom: 0.5rem;
        }

        .section-content ol {
            list-style-type: decimal;
            padding-left: 1.5rem;
            margin-bottom: 0.5rem;
        }

        .section-content h1 {
            font-size: 1.4rem;
            font-weight: 700;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
            color: #111827;
        }

        .section-content h2 {
            font-size: 1.2rem;
            font-weight: 600;
            margin-top: 0.75rem;
            margin-bottom: 0.4rem;
            color: #1f2937;
        }

        .section-content h3 {
            font-size: 1.1rem;
            font-weight: 600;
            margin-top: 0.6rem;
            margin-bottom: 0.3rem;
            color: #374151;
        }

        .section-content h4 {
            font-size: 1rem;
            font-weight: 600;
            margin-top: 0.5rem;
            margin-bottom: 0.3rem;
            color: #4b5563;
        }

        .section-content h5 {
            font-size: 0.9rem;
            font-weight: 600;
            margin-top: 0.5rem;
            margin-bottom: 0.3rem;
            color: #6b7280;
        }

        .section-content u {
            text-decoration: underline;
        }

        .section-content table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0.5rem;
            margin-bottom: 0.75rem;
        }

        .section-content table th, .section-content table td {
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            font-size: 9.5px;
            text-align: left;
        }

        .section-content table th {
            background-color: #f3f4f6;
            font-weight: 600;
        }

        .section-content img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
            display: block;
        }

        /* ── Image Alignment for PDF ── */
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

        /* Prevent heading-only breaks */
        .section-container {
            page-break-inside: avoid;
        }

        .signature-block-container {
            page-break-inside: avoid;
            margin-top: 35px;
            text-align: center;
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
            margin-top: 10px;
        }

        .page-break {
            page-break-after: always;
            break-after: page;
        }
    </style>
</head>
<body>
 
    @include('pdf.report.header')
 
    <!-- Patient Metadata Card (only on Page 1) -->
    <table class="patient-card">
        <tr>
            <td style="width: 55%; border-right: 1px solid #bfdbfe;">
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
 
    <!-- Clinical Diagnosis / Main Diagnosis Section -->
    @if(!empty($report->diagnosis_html) || !empty($specimen->diagnosis))
    <div class="section-container">
        <div class="section-header-title">DIAGNÓSTICO</div>
        <div class="section-content">
            {!! !empty($report->diagnosis_html) ? $report->diagnosis_html : $specimen->diagnosis !!}
        </div>
    </div>
    @endif
 
    <!-- Macroscopy Section -->
    <div class="section-container">
        <div class="section-header-title">DESCRIPCIÓN MACROSCÓPICA</div>
        <div class="section-content">
            {!! !empty($report->macroscopy_html) ? $report->macroscopy_html : '<i>Pendiente de revisión macroscópica.</i>' !!}
        </div>
    </div>
 
    <!-- Microscopy Section -->
    @if($specimen->status === 'microscopic_review' || $specimen->status === 'finalized' || $specimen->status === 'delivered')
    <div class="page-break"></div>
    <div class="section-container">
        <div class="section-header-title">DESCRIPCIÓN MICROSCÓPICA</div>
        <div class="section-content">
            {!! !empty($report->microscopy_html) ? $report->microscopy_html : '<i>Pendiente de revisión microscópica.</i>' !!}
        </div>
    </div>
    @endif
 
    <!-- Pathologist Signature Block -->
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
 
    @include('pdf.report.footer')
 
</body>
</html>
