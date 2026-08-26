<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Documento No Válido — PatoLab</title>
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
            --badge-bg: rgba(225, 29, 72, 0.1);
            --badge-border: rgba(225, 29, 72, 0.25);
            --badge-text: #be123c;
            --primary: #e11d48;
            --primary-hover: #be123c;
            --primary-text: #ffffff;
            --card-bg: rgba(255, 255, 255, 0.85);
            --card-border: rgba(226, 232, 240, 0.9);
            --subcard-bg: rgba(254, 242, 242, 0.75);
            --subcard-border: rgba(254, 202, 202, 0.8);
            --border-color: rgba(226, 232, 240, 0.8);
            --orb-1: rgba(225, 29, 72, 0.18);
            --orb-2: rgba(239, 68, 68, 0.15);
            --orb-3: rgba(244, 63, 94, 0.15);
            --orb-4: rgba(225, 29, 72, 0.12);
            --orb-5: rgba(190, 18, 60, 0.12);
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
            max-width: 480px;
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
            background: linear-gradient(135deg, #be123c 0%, #e11d48 100%);
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
            padding: 1.75rem 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            text-align: center;
        }

        .reason-text {
            font-size: 0.95rem;
            line-height: 1.5;
            color: var(--text-main);
            font-weight: 500;
        }

        .alert-box {
            background: var(--subcard-bg);
            border: 1px solid var(--subcard-border);
            border-radius: 0.85rem;
            padding: 1rem;
            text-align: left;
            font-size: 0.825rem;
            line-height: 1.5;
            color: var(--badge-text);
        }

        .alert-box strong {
            font-weight: 700;
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
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </div>
                <h1>Documento No Válido</h1>
                <p>Alerta de Autenticidad</p>
            </div>

            <div class="details-body">
                <p class="reason-text">
                    {{ $reason ?? 'El código escaneado no corresponde a ningún informe emitido por PatoLab o el enlace ha expirado.' }}
                </p>

                <div class="alert-box">
                    <strong>Advertencia:</strong> Si este documento fue entregado como un informe original, comuníquese inmediatamente con la administración del laboratorio PatoLab para verificar su autenticidad.
                </div>
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
