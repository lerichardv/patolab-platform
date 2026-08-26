@php
    $logoPath = public_path('images/patolab-logo-horizontal-full.png');
    $logoBase64 = '';
    if (file_exists($logoPath)) {
        $logoData = base64_encode(file_get_contents($logoPath));
        $logoBase64 = 'data:image/png;base64,' . $logoData;
    }

    $qrCodePath = $specimen->report->report_validation_qr_code ?? null;
    $qrBase64 = '';
    if (!empty($qrCodePath)) {
        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($qrCodePath)) {
            $qrData = base64_encode(\Illuminate\Support\Facades\Storage::disk('public')->get($qrCodePath));
            $mime = \Illuminate\Support\Facades\Storage::disk('public')->mimeType($qrCodePath) ?: 'image/png';
            $qrBase64 = 'data:' . $mime . ';base64,' . $qrData;
        } elseif (file_exists(public_path($qrCodePath))) {
            $qrData = base64_encode(file_get_contents(public_path($qrCodePath)));
            $qrBase64 = 'data:image/png;base64,' . $qrData;
        }
    }
@endphp

<header class="report-header">
    <div class="header-table">
        <div class="header-qr-cell">
            <div class="qr-instruction-text">Escanee para validar la autenticidad del informe</div>
            @if(!empty($qrBase64))
                <img class="header-qr-img" src="{{ $qrBase64 }}" alt="QR de Validación">
            @else
                <div class="header-qr-placeholder">
                    <span>QR</span>
                </div>
            @endif
        </div>
        <div class="header-logo-cell">
            @if(!empty($logoBase64))
                <img class="header-logo-img" src="{{ $logoBase64 }}" alt="Logo PatoLab">
            @else
                <div style="font-size: 8.5mm; font-weight: 800; color: #1e3a8a; font-family: Arial, Helvetica, sans-serif; text-align: center;">PatoLab</div>
                <div style="font-size: 2.12mm; color: #6b7280; font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.13mm; text-align: center;">LABORATORIO DE PATOLOGÍA & CITOLOGÍA</div>
            @endif
        </div>
        <div class="header-code-cell">
            <div class="specimen-badge">N° {{ $specimen->sequence_code }}</div>
        </div>
    </div>
    <div class="report-pre-title">Calidad diagnóstica a su servicio</div>
    <div class="report-title">INFORME DE ANATOMÍA PATOLÓGICA</div>
    <div class="header-divider"></div>
</header>
