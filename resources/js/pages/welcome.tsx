import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, login, register } from '@/routes';

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Bienvenido" />
            <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
                {/* Background Gradients */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] h-[800px] w-[800px] rounded-full bg-blue-600/15 blur-[140px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] h-[800px] w-[800px] rounded-full bg-indigo-600/15 blur-[140px]" />
                    <div className="absolute top-[20%] right-[10%] h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[100px]" />
                    <div className="absolute bottom-[20%] left-[10%] h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[100px]" />
                </div>

                <div className="relative z-10 flex flex-col items-center gap-8 text-center">
                    {/* Logo Section */}
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-background shadow-2xl ring-1 ring-border">
                            <img src="/images/patolab-isotipo.png" alt="PatoLab Logo" className="size-20" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
                                PatoLab
                            </h1>
                            <p className="text-xl text-muted-foreground sm:text-2xl font-light">
                                Software de Gestión de Laboratorio.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="inline-flex h-12 items-center justify-center rounded-xl px-8 text-sm font-semibold transition-all shadow-sm bg-gradient-to-r from-[rgba(34,197,94,0.1)] to-[rgba(59,130,246,0.1)] border-2 border-[rgba(156,163,175,0.5)] text-[rgb(30,64,175)] dark:from-[rgba(74,222,128,0.15)] dark:to-[rgba(96,165,250,0.15)] dark:border-[rgba(156,163,175,0.4)] dark:text-[rgb(147,197,253)] hover:scale-105"
                            >
                                Ir al Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="inline-flex h-12 items-center justify-center rounded-xl px-8 text-sm font-semibold transition-all shadow-sm bg-gradient-to-r from-[rgba(34,197,94,0.1)] to-[rgba(59,130,246,0.1)] border-2 border-[rgba(156,163,175,0.5)] text-[rgb(30,64,175)] dark:from-[rgba(74,222,128,0.15)] dark:to-[rgba(96,165,250,0.15)] dark:border-[rgba(156,163,175,0.4)] dark:text-[rgb(147,197,253)] hover:scale-105"
                                >
                                    Iniciar sesión
                                </Link>
                                <Link
                                    href={register()}
                                    className="inline-flex h-12 items-center justify-center rounded-xl px-8 text-sm font-semibold transition-all shadow-sm bg-background border-2 border-border/50 text-foreground hover:scale-105 hover:from-[rgba(34,197,94,0.1)] hover:to-[rgba(59,130,246,0.1)] dark:hover:from-[rgba(74,222,128,0.15)] dark:hover:to-[rgba(96,165,250,0.15)] hover:bg-gradient-to-r hover:text-[rgb(30,64,175)] dark:hover:text-[rgb(147,197,253)] hover:border-[rgba(156,163,175,0.5)]"
                                >
                                    Crear cuenta
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer simple */}
                <div className="absolute bottom-8 text-sm text-muted-foreground/60">
                    &copy; {new Date().getFullYear()} PatoLab. Todos los derechos reservados.
                </div>
            </div>
        </>
    );
}
