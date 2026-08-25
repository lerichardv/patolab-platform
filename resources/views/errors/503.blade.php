<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Mantenimiento del Sistema — PatoLab</title>
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
            --badge-bg: rgba(37, 99, 235, 0.08);
            --badge-border: rgba(37, 99, 235, 0.2);
            --badge-text: #1d4ed8;
            --primary: #1d4ed8;
            --primary-hover: #1e40af;
            --primary-text: #ffffff;
            --subcard-bg: rgba(248, 250, 252, 0.65);
            --subcard-border: rgba(226, 232, 240, 0.8);
            --border-color: rgba(226, 232, 240, 0.8);
            --orb-1: rgba(37, 99, 235, 0.18);
            --orb-2: rgba(79, 70, 229, 0.18);
            --orb-3: rgba(14, 165, 233, 0.15);
            --orb-4: rgba(139, 92, 246, 0.14);
            --orb-5: rgba(6, 182, 212, 0.12);
        }

        html.dark {
            --bg-color: #0b0f19;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --badge-bg: rgba(59, 130, 246, 0.15);
            --badge-border: rgba(59, 130, 246, 0.3);
            --badge-text: #93c5fd;
            --primary: #3b82f6;
            --primary-hover: #60a5fa;
            --primary-text: #0b0f19;
            --subcard-bg: rgba(30, 41, 59, 0.35);
            --subcard-border: rgba(51, 65, 85, 0.4);
            --border-color: rgba(51, 65, 85, 0.5);
            --orb-1: rgba(37, 99, 235, 0.25);
            --orb-2: rgba(79, 70, 229, 0.22);
            --orb-3: rgba(14, 165, 233, 0.2);
            --orb-4: rgba(139, 92, 246, 0.18);
            --orb-5: rgba(6, 182, 212, 0.15);
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
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* Ambient glowing orbs matching login page */
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

        .orb-1 {
            top: -10%;
            left: -10%;
            width: 600px;
            height: 600px;
            background: var(--orb-1);
        }

        .orb-2 {
            bottom: -10%;
            right: -10%;
            width: 600px;
            height: 600px;
            background: var(--orb-2);
            animation-delay: -2s;
        }

        .orb-3 {
            top: 10%;
            right: 10%;
            width: 400px;
            height: 400px;
            background: var(--orb-3);
            animation-delay: -4s;
        }

        .orb-4 {
            bottom: 20%;
            left: 10%;
            width: 400px;
            height: 400px;
            background: var(--orb-4);
            animation-delay: -6s;
        }

        .orb-5 {
            top: 40%;
            left: 30%;
            width: 300px;
            height: 300px;
            background: var(--orb-5);
            animation-delay: -1s;
        }

        @keyframes pulse-slow {
            0% { transform: scale(1) translate(0, 0); opacity: 0.8; }
            50% { transform: scale(1.08) translate(15px, -15px); opacity: 1; }
            100% { transform: scale(0.95) translate(-10px, 10px); opacity: 0.85; }
        }

        /* Top control bar */
        .top-bar {
            position: relative;
            z-index: 20;
            width: 100%;
            max-width: 800px;
            padding: 1.5rem 1.5rem 0.5rem;
            display: flex;
            justify-content: flex-end;
            align-items: center;
        }

        .theme-toggle-btn {
            background: rgba(255, 255, 255, 0.6);
            border: 1px solid var(--border-color);
            color: var(--text-main);
            padding: 0.45rem 0.85rem;
            border-radius: 0.75rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.85rem;
            font-weight: 500;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            transition: all 0.2s ease;
        }

        html.dark .theme-toggle-btn {
            background: rgba(15, 23, 42, 0.6);
        }

        .theme-toggle-btn:hover {
            transform: translateY(-1px);
            border-color: var(--primary);
        }

        /* Main Container */
        .main-wrapper {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 600px;
            padding: 1.5rem 1.25rem 2rem;
            margin: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        /* Logo Area */
        .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
        }

        .logo-img {
            height: 128px;
            width: auto;
            object-fit: contain;
            display: block;
        }

        /* Status Badge */
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--badge-bg);
            border: 1px solid var(--badge-border);
            color: var(--badge-text);
            padding: 0.4rem 1rem;
            border-radius: 9999px;
            font-size: 0.825rem;
            font-weight: 600;
            letter-spacing: 0.01em;
            margin-bottom: 1.5rem;
        }

        .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: currentColor;
            position: relative;
        }

        .pulse-dot::after {
            content: '';
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background-color: currentColor;
            opacity: 0.4;
            animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes ping {
            75%, 100% {
                transform: scale(2.2);
                opacity: 0;
            }
        }

        /* Animated Cog Box */
        .illustration-box {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(6, 182, 212, 0.1));
            border: 1px solid var(--badge-border);
            border-radius: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary);
            position: relative;
        }

        .spin-cog {
            animation: spin 16s linear infinite;
        }

        .activity-indicator {
            position: absolute;
            right: -4px;
            bottom: -4px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--primary);
            color: var(--primary-text);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* Typography */
        h1 {
            font-size: 1.85rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.25;
            margin-bottom: 0.75rem;
            color: var(--text-main);
        }

        @media (min-width: 640px) {
            h1 {
                font-size: 2.1rem;
            }
        }

        .description {
            font-size: 0.95rem;
            line-height: 1.6;
            color: var(--text-muted);
            margin-bottom: 2rem;
            max-width: 480px;
            text-wrap: balance;
        }

        /* Actions & Countdown Area */
        .reconnect-box {
            background: var(--subcard-bg);
            border: 1px dashed var(--subcard-border);
            border-radius: 1.15rem;
            padding: 1.35rem 1.5rem;
            margin-bottom: 1.5rem;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.85rem;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        }

        .countdown-text {
            font-size: 0.85rem;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        .countdown-number {
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            color: var(--primary);
            background: var(--badge-bg);
            padding: 0.15rem 0.5rem;
            border-radius: 0.4rem;
        }

        .progress-bar-container {
            width: 100%;
            max-width: 280px;
            height: 5px;
            background: var(--border-color);
            border-radius: 9999px;
            overflow: hidden;
        }

        .progress-bar-fill {
            height: 100%;
            width: 100%;
            background: linear-gradient(90deg, #2563eb, #06b6d4);
            border-radius: 9999px;
            transition: width 1s linear;
        }

        .btn-check {
            background: var(--primary);
            color: var(--primary-text);
            border: none;
            padding: 0.65rem 1.5rem;
            border-radius: 0.75rem;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
            transition: all 0.2s ease;
        }

        .btn-check:hover:not(:disabled) {
            background: var(--primary-hover);
            transform: translateY(-1px);
            box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
        }

        .btn-check:disabled {
            opacity: 0.75;
            cursor: not-allowed;
        }

        .status-feedback {
            font-size: 0.825rem;
            color: var(--text-muted);
            min-height: 1.25rem;
            transition: all 0.2s ease;
        }

        /* Footer */
        footer {
            position: relative;
            z-index: 10;
            padding: 1.25rem 1rem 2rem;
            text-align: center;
            font-size: 0.8rem;
            color: var(--text-muted);
            opacity: 0.85;
        }

        .spin {
            animation: spin 1s linear infinite;
        }
    </style>

    <script>
        // System / Local Dark Mode Detection
        (function() {
            try {
                const storedTheme = localStorage.getItem('appearance');
                if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            } catch (e) {}
        })();
    </script>
</head>
<body>
    <!-- Background Ambient Gradients matching login page -->
    <div class="ambient-container">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
        <div class="orb orb-4"></div>
        <div class="orb orb-5"></div>
    </div>

    <!-- Main Content -->
    <main class="main-wrapper">
        <!-- Logo -->
        <div class="logo-container">
            <img src="/images/patolab-isotipo.png" alt="PatoLab Logo" class="logo-img">
        </div>

        <!-- Status Pill -->
        <div class="status-badge">
            <span class="pulse-dot"></span>
            <span>Actualización y Mantenimiento Programado</span>
        </div>

        <!-- Animated Cog / Gear -->
        <div class="illustration-box">
            <svg class="spin-cog" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/>
                <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
                <path d="M12 2v2"/>
                <path d="M12 22v-2"/>
                <path d="m17 20.66-1-1.73"/>
                <path d="M11 10.27 7 3.34"/>
                <path d="m20.66 17-1.73-1"/>
                <path d="m3.34 7 1.73 1"/>
                <path d="M14 12h8"/>
                <path d="M2 12h2"/>
                <path d="m20.66 7-1.73 1"/>
                <path d="m3.34 17 1.73-1"/>
                <path d="m17 3.34-1 1.73"/>
                <path d="m11 13.73-4 6.93"/>
            </svg>
            <div class="activity-indicator">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
            </div>
        </div>

        <!-- Headings -->
        <h1>Estamos mejorando la plataforma</h1>
        <p class="description">
            Estamos ejecutando actualizaciones y mantenimiento del sistema. El acceso se restablecerá en breve.
        </p>

        <!-- Live Reconnect and Countdown Box -->
        <div class="reconnect-box">
            <div class="countdown-text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Comprobando disponibilidad en</span>
                <span id="countdown" class="countdown-number">30s</span>
            </div>

            <div class="progress-bar-container">
                <div id="progress-bar" class="progress-bar-fill"></div>
            </div>

            <button id="btn-check" class="btn-check" type="button">
                <svg id="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
                <span>Verificar disponibilidad ahora</span>
            </button>

            <div id="status-feedback" class="status-feedback"></div>
        </div>
    </main>

    <!-- Footer -->
    <footer>
        &copy; <span id="year"></span> PatoLab — Plataforma Integral de Patología y Diagnóstico Clínico.
    </footer>

    <script>
        (function() {
            // Set dynamic year
            const yearEl = document.getElementById('year');
            if (yearEl) {
                yearEl.textContent = new Date().getFullYear();
            }

            // Theme management
            const themeBtn = document.getElementById('theme-toggle');
            const sunIcon = document.getElementById('theme-icon-sun');
            const moonIcon = document.getElementById('theme-icon-moon');
            const themeLabel = document.getElementById('theme-label');

            function updateThemeUI(isDark) {
                if (isDark) {
                    document.documentElement.classList.add('dark');
                    if (sunIcon) sunIcon.style.display = 'block';
                    if (moonIcon) moonIcon.style.display = 'none';
                    if (themeLabel) themeLabel.textContent = 'Modo Claro';
                } else {
                    document.documentElement.classList.remove('dark');
                    if (sunIcon) sunIcon.style.display = 'none';
                    if (moonIcon) moonIcon.style.display = 'block';
                    if (themeLabel) themeLabel.textContent = 'Modo Oscuro';
                }
            }

            const isInitiallyDark = document.documentElement.classList.contains('dark');
            updateThemeUI(isInitiallyDark);

            if (themeBtn) {
                themeBtn.addEventListener('click', function() {
                    const isDark = document.documentElement.classList.toggle('dark');
                    try {
                        localStorage.setItem('appearance', isDark ? 'dark' : 'light');
                        document.cookie = "appearance=" + (isDark ? 'dark' : 'light') + ";path=/;max-age=31536000;SameSite=Lax";
                    } catch (e) {}
                    updateThemeUI(isDark);
                });
            }

            // Auto-Check & Reconnect Countdown Logic
            const CHECK_INTERVAL = 30; // seconds
            let secondsLeft = CHECK_INTERVAL;
            let isChecking = false;

            const countdownEl = document.getElementById('countdown');
            const progressBar = document.getElementById('progress-bar');
            const btnCheck = document.getElementById('btn-check');
            const btnIcon = document.getElementById('btn-icon');
            const feedbackEl = document.getElementById('status-feedback');

            function updateCountdownUI() {
                if (countdownEl) {
                    countdownEl.textContent = secondsLeft + 's';
                }
                if (progressBar) {
                    const percentage = (secondsLeft / CHECK_INTERVAL) * 100;
                    progressBar.style.width = percentage + '%';
                }
            }

            async function checkServerStatus() {
                if (isChecking) return;
                isChecking = true;
                if (btnCheck) btnCheck.disabled = true;
                if (btnIcon) btnIcon.classList.add('spin');
                if (feedbackEl) {
                    feedbackEl.textContent = 'Verificando disponibilidad del servidor...';
                    feedbackEl.style.color = 'var(--primary)';
                }

                try {
                    const response = await fetch('/up?t=' + Date.now(), {
                        method: 'GET',
                        cache: 'no-store',
                        headers: { 'Accept': 'application/json, text/plain, */*' }
                    });

                    if (response.ok || response.status === 200) {
                        if (feedbackEl) {
                            feedbackEl.textContent = '¡Sistema restablecido! Redirigiendo...';
                            feedbackEl.style.color = '#16a34a';
                        }
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 1000);
                        return;
                    } else {
                        if (feedbackEl) {
                            feedbackEl.textContent = 'El mantenimiento continúa en progreso. Verificaremos de nuevo en breve.';
                            feedbackEl.style.color = 'var(--text-muted)';
                        }
                    }
                } catch (err) {
                    if (feedbackEl) {
                        feedbackEl.textContent = 'El mantenimiento continúa en progreso. Verificaremos de nuevo en breve.';
                        feedbackEl.style.color = 'var(--text-muted)';
                    }
                } finally {
                    isChecking = false;
                    if (btnCheck) btnCheck.disabled = false;
                    if (btnIcon) btnIcon.classList.remove('spin');
                    secondsLeft = CHECK_INTERVAL;
                    updateCountdownUI();
                }
            }

            // Initialize UI countdown immediately
            updateCountdownUI();

            // Run countdown tick every second
            setInterval(() => {
                if (isChecking) return;
                secondsLeft--;
                if (secondsLeft <= 0) {
                    checkServerStatus();
                } else {
                    updateCountdownUI();
                }
            }, 1000);

            if (btnCheck) {
                btnCheck.addEventListener('click', checkServerStatus);
            }
        })();
    </script>
</body>
</html>
