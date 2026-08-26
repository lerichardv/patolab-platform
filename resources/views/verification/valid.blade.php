<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Verificación Oficial de Documento — PatoLab</title>
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />

    <style>
        :root {
            --bg-color: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --badge-bg: rgba(16, 185, 129, 0.1);
            --badge-border: rgba(16, 185, 129, 0.25);
            --badge-text: #047857;
            --primary: #10b981;
            --primary-hover: #059669;
            --primary-text: #ffffff;
            --card-bg: rgba(255, 255, 255, 0.85);
            --card-border: rgba(226, 232, 240, 0.9);
            --subcard-bg: rgba(248, 250, 252, 0.75);
            --subcard-border: rgba(226, 232, 240, 0.8);
            --border-color: rgba(226, 232, 240, 0.8);
            --orb-1: rgba(16, 185, 129, 0.18);
            --orb-2: rgba(37, 99, 235, 0.15);
            --orb-3: rgba(6, 182, 212, 0.15);
            --orb-4: rgba(16, 185, 129, 0.12);
            --orb-5: rgba(59, 130, 246, 0.12);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Instrument Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            position: relative;
            overflow-x: hidden;
        }

        .ambient-container {
            position: fixed;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
            z-index: 0;
        }

        .orb {
            position: absolute;
            border-radius: 9999px;
            filter: blur(120px);
            animation: pulse-slow 8s ease-in-out infinite alternate;
        }

        .orb-1 { top: -10%; left: -10%; width: 600px; height: 600px; background: var(--orb-1); }
        .orb-2 { bottom: -10%; right: -10%; width: 600px; height: 600px; background: var(--orb-2); animation-delay: -2s; }
        .orb-3 { top: 10%; right: 10%; width: 400px; height: 400px; background: var(--orb-3); animation-delay: -4s; }
        .orb-4 { bottom: 20%; left: 10%; width: 400px; height: 400px; background: var(--orb-4); animation-delay: -6s; }
        .orb-5 { top: 40%; left: 30%; width: 300px; height: 300px; background: var(--orb-5); animation-delay: -1s; }

        @keyframes pulse-slow {
            0% { transform: scale(1) translate(0, 0); opacity: 0.8; }
            50% { transform: scale(1.08) translate(15px, -15px); opacity: 1; }
            100% { transform: scale(0.95) translate(-10px, 10px); opacity: 0.85; }
        }

        .main-wrapper {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 520px;
            padding: 2.5rem 1.25rem 2rem;
            margin: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .card-container {
            width: 100%;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 1.5rem;
            overflow: hidden;
            box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.12);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }

        .card-header {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            padding: 2rem 1.5rem 1.75rem;
            text-align: center;
            color: #ffffff;
            position: relative;
        }

        .header-icon-box {
            width: 4rem;
            height: 4rem;
            margin: 0 auto 0.85rem;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
        }

        .card-header h1 {
            font-size: 1.45rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
            letter-spacing: -0.01em;
        }

        .card-header p {
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
        }

        .details-body {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .detail-row {
            padding-bottom: 0.85rem;
            border-bottom: 1px solid var(--border-color);
        }

        .detail-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }

        .detail-label {
            font-size: 0.725rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            font-weight: 600;
            margin-bottom: 0.2rem;
            display: block;
        }

        .detail-value {
            font-size: 0.975rem;
            font-weight: 600;
            color: var(--text-main);
            word-break: break-word;
        }

        .detail-value.mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            letter-spacing: 0.02em;
        }

        .hash-box {
            background: var(--subcard-bg);
            border: 1px solid var(--subcard-border);
            border-radius: 0.85rem;
            padding: 0.85rem 1rem;
        }

        .hash-text {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.725rem;
            color: var(--text-muted);
            word-break: break-all;
            line-height: 1.4;
        }

        .action-container {
            margin-top: 0.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .btn-primary {
            background: #10b981;
            color: #ffffff;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.85rem;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
            transition: all 0.2s ease;
        }

        .btn-primary:hover {
            background: #059669;
            transform: translateY(-1px);
            box-shadow: 0 6px 18px rgba(16, 185, 129, 0.4);
        }

        footer {
            position: relative;
            z-index: 10;
            padding: 1.25rem 1rem 2rem;
            text-align: center;
            font-size: 0.8rem;
            color: var(--text-muted);
            opacity: 0.85;
        }
    </style>
</head>
<body>
    <div class="ambient-container">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
        <div class="orb orb-4"></div>
        <div class="orb orb-5"></div>
    </div>

    <main class="main-wrapper">
        <div style="margin-bottom: 1.5rem;">
            <img src="/images/patolab-logo-horizontal-full.png" alt="PatoLab Logo" style="height: 72px; width: auto; object-fit: contain;">
        </div>

        <div class="card-container">
            <div class="card-header">
                <div class="header-icon-box">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h1>Informe Auténtico</h1>
                <p>Certificado por Laboratorio PatoLab</p>
            </div>

            <div class="details-body">
                <div class="detail-row">
                    <span class="detail-label">Código de Informe</span>
                    <p class="detail-value mono" style="color: #047857;">{{ $reportCode }}</p>
                </div>

                @if(!empty($sequenceCode))
                <div class="detail-row">
                    <span class="detail-label">Código de Muestra</span>
                    <p class="detail-value mono">{{ $sequenceCode }}</p>
                </div>
                @endif

                <div class="detail-row">
                    <span class="detail-label">Paciente</span>
                    <p class="detail-value">{{ $patientName }}</p>
                </div>

                @if(!empty($specimenType) && $specimenType !== 'N/A')
                <div class="detail-row">
                    <span class="detail-label">Tipo de Muestra</span>
                    <p class="detail-value">{{ $specimenType }}</p>
                </div>
                @endif

                <div class="detail-row">
                    <span class="detail-label">Estudio Clínico</span>
                    @if(isset($studiesList) && count($studiesList) > 0)
                        <div class="studies-list" style="display: flex; flex-direction: column; gap: 0.35rem;">
                            @foreach($studiesList as $studyItem)
                                <div class="detail-value">{{ $studyItem }}</div>
                            @endforeach
                        </div>
                    @else
                        <p class="detail-value">{{ $study }}</p>
                    @endif
                </div>

                <div class="detail-row">
                    <span class="detail-label">Patólogo Responsable</span>
                    <p class="detail-value">{{ $pathologist }}</p>
                </div>

                <div class="detail-row">
                    <span class="detail-label">Fecha de Emisión</span>
                    <p class="detail-value" style="font-size: 0.9rem; font-weight: 500;">
                        {{ $issuedAt ? \Carbon\Carbon::parse($issuedAt)->format('d/m/Y h:i A') : 'N/A' }}
                    </p>
                </div>

                <div class="hash-box">
                    <span class="detail-label">Huella Digital SHA-256 (Firma en Disco)</span>
                    <p class="hash-text">{{ $pdfHash }}</p>
                </div>

                @if(!empty($pdfUrl))
                <div class="action-container">
                    <a href="{{ $pdfUrl }}" target="_blank" class="btn-primary">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Descargar Reporte PDF Oficial
                    </a>
                </div>
                @endif
            </div>
        </div>
    </main>

    <footer>
        &copy; <span id="year"></span> PatoLab — Sistema de Autenticación de Informes.
    </footer>

    <script>
        (function() {
            const yearEl = document.getElementById('year');
            if (yearEl) yearEl.textContent = new Date().getFullYear();
        })();
    </script>
</body>
</html>
