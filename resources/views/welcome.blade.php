<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'light') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex, nofollow">
        <title>Bienvenido - {{ config('app.name', 'PatoLab') }}</title>

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "light" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts
        @vite(['resources/css/app.css'])
    </head>
    <body class="font-sans antialiased">
        <div class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
            <!-- Background Gradients -->
            <div class="absolute inset-0 z-0 overflow-hidden">
                <div class="absolute top-[-10%] left-[-10%] h-[800px] w-[800px] rounded-full bg-blue-600/15 blur-[140px]"></div>
                <div class="absolute right-[-10%] bottom-[-10%] h-[800px] w-[800px] rounded-full bg-indigo-600/15 blur-[140px]"></div>
                <div class="absolute top-[20%] right-[10%] h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[100px]"></div>
                <div class="absolute bottom-[20%] left-[10%] h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[100px]"></div>
            </div>

            <div class="relative z-10 flex flex-col items-center gap-8 text-center">
                <!-- Logo Section -->
                <div class="flex flex-col items-center gap-6">
                    <div class="flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-background shadow-2xl ring-1 ring-border">
                        <img
                            src="/images/patolab-isotipo.png"
                            alt="PatoLab Logo"
                            class="size-20"
                        />
                    </div>
                    <div class="space-y-2">
                        <h1 class="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
                            PatoLab
                        </h1>
                        <p class="text-xl font-light text-muted-foreground sm:text-2xl">
                            Software de Gestión de Laboratorio.
                        </p>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="mt-4 flex flex-col gap-4 sm:flex-row">
                    @auth
                        <a
                            href="{{ route('dashboard') }}"
                            class="inline-flex h-12 items-center justify-center rounded-xl border-2 border-[rgba(156,163,175,0.5)] bg-gradient-to-r from-[rgba(34,197,94,0.1)] to-[rgba(59,130,246,0.1)] px-8 text-sm font-semibold text-[rgb(30,64,175)] shadow-sm transition-all hover:scale-105 dark:border-[rgba(156,163,175,0.4)] dark:from-[rgba(74,222,128,0.15)] dark:to-[rgba(96,165,250,0.15)] dark:text-[rgb(147,197,253)]"
                        >
                            Ir al Dashboard
                        </a>
                    @else
                        <a
                            href="{{ route('login') }}"
                            class="inline-flex h-12 items-center justify-center rounded-xl border-2 border-[rgba(156,163,175,0.5)] bg-gradient-to-r from-[rgba(34,197,94,0.1)] to-[rgba(59,130,246,0.1)] px-8 text-sm font-semibold text-[rgb(30,64,175)] shadow-sm transition-all hover:scale-105 dark:border-[rgba(156,163,175,0.4)] dark:from-[rgba(74,222,128,0.15)] dark:to-[rgba(96,165,250,0.15)] dark:text-[rgb(147,197,253)]"
                        >
                            Iniciar sesión
                        </a>
                    @endauth
                </div>
            </div>

            <!-- Footer simple -->
            <div class="absolute bottom-8 text-sm text-muted-foreground/60">
                &copy; {{ date('Y') }} PatoLab. Todos los derechos reservados.
            </div>
        </div>
    </body>
</html>
