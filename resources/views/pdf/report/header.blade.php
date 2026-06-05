@php
    $logoPath = public_path('images/patolab-logo-horizontal.png');
    $logoBase64 = '';
    if (file_exists($logoPath)) {
        $logoData = base64_encode(file_get_contents($logoPath));
        $logoBase64 = 'data:image/png;base64,' . $logoData;
    }
@endphp

<header class="report-header">
    <div class="header-table">
        <div class="header-logo-cell">
            @if(!empty($logoBase64))
                <img class="header-logo-img" src="{{ $logoBase64 }}" alt="Logo PatoLab">
            @else
                <div style="font-size: 22px; font-weight: 800; color: #1e3a8a; font-family: 'Outfit', sans-serif;">PatoLab</div>
                <div style="font-size: 8px; color: #6b7280; font-family: 'Outfit', sans-serif; letter-spacing: 0.5px;">LABORATORIO DE PATOLOGÍA & CITOLOGÍA</div>
            @endif
            <div class="header-tagline">Calidad Diagnóstica a su Servicio</div>
        </div>
        <div class="header-code-cell">
            <div class="specimen-badge">Biopsia N° {{ $specimen->sequence_code }}</div>
        </div>
    </div>
    <div class="report-title">INFORME DE ANATOMÍA PATOLÓGICA</div>
    <div class="header-divider"></div>
</header>
