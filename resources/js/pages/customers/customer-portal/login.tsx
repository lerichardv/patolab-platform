import { Head, useForm } from '@inertiajs/react';
import { Mail, ShieldCheck } from 'lucide-react';
import type { FormEventHandler } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store as storeLogin } from '@/routes/customer-portal/login';

interface LoginProps {
    status?: string;
}

export default function CustomerPortalLogin({ status }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(storeLogin().url, {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-6 md:p-10">
            <Head title="Acceso al Portal de Clientes — PatoLab" />

            {/* Friendly Free-Form Organic Gradient Background */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                {/* Top-Left: Fresh Mint & Teal aurora */}
                <div className="absolute -top-[15%] -left-[10%] h-[600px] w-[600px] rounded-[45%_55%_70%_35%/50%_45%_55%_50%] bg-gradient-to-br from-emerald-400/25 via-teal-400/20 to-cyan-300/10 blur-[110px] dark:from-emerald-500/15 dark:via-teal-500/10 dark:to-transparent" />

                {/* Top-Right: Gentle Sky & Lavender Violet */}
                <div className="absolute -top-[10%] -right-[10%] h-[550px] w-[550px] rounded-[55%_45%_40%_60%/40%_50%_60%_50%] bg-gradient-to-bl from-sky-400/25 via-indigo-400/20 to-violet-300/15 blur-[120px] dark:from-sky-500/15 dark:via-indigo-500/15 dark:to-transparent" />

                {/* Center: Friendly warm peach/amber ambient glow */}
                <div className="absolute top-[35%] left-[20%] h-[450px] w-[500px] rounded-[60%_40%_50%_50%/50%_60%_40%_50%] bg-gradient-to-r from-amber-300/20 via-orange-300/15 to-rose-300/15 blur-[100px] dark:from-amber-500/10 dark:via-rose-500/10 dark:to-transparent" />

                {/* Bottom-Left: Serene Marine Blue & Cyan */}
                <div className="absolute -bottom-[15%] -left-[5%] h-[550px] w-[550px] rounded-[50%_50%_40%_60%/60%_40%_60%_40%] bg-gradient-to-tr from-cyan-400/20 via-blue-500/20 to-teal-300/10 blur-[120px] dark:from-cyan-600/15 dark:via-blue-600/10 dark:to-transparent" />

                {/* Bottom-Right: Soft Violet & Rose Petal */}
                <div className="absolute -right-[10%] -bottom-[10%] h-[600px] w-[600px] rounded-[40%_60%_60%_40%/50%_50%_40%_60%] bg-gradient-to-tl from-violet-400/20 via-rose-300/15 to-indigo-400/15 blur-[110px] dark:from-violet-600/15 dark:via-rose-600/10 dark:to-transparent" />

                {/* Subtle Organic Radial Light Texture */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(0,0,0,0))]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="flex flex-col gap-6">
                    {/* Brand Header */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative mb-2 flex h-20 w-20 items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl dark:bg-primary/20" />
                            <img
                                src="/images/patolab-isotipo.png"
                                alt="PatoLab Logo"
                                className="relative size-24 object-contain transition-transform duration-300 hover:scale-105"
                            />
                        </div>
                        <h1 className="text-center text-3xl font-bold tracking-tight text-foreground">
                            Portal de Clientes y Pacientes
                        </h1>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            Acceda de manera exclusiva a los datos de sus
                            pacientes
                        </p>
                    </div>

                    <Card className="border border-white/60 bg-card/80 shadow-2xl shadow-primary/10 backdrop-blur-2xl dark:border-white/10 dark:bg-card/60">
                        <CardHeader className="pb-4 text-center">
                            <CardTitle className="text-lg font-semibold tracking-tight">
                                Iniciar Sesión
                            </CardTitle>
                            <CardDescription className="text-xs text-balance text-muted-foreground">
                                Ingrese su correo electrónico y contraseña
                                asignada para consultar sus reportes
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            {status && (
                                <div className="mb-4 rounded-md bg-green-500/10 p-3 text-center text-xs font-medium text-green-600 dark:text-green-400">
                                    {status}
                                </div>
                            )}

                            <form
                                onSubmit={submit}
                                className="flex flex-col gap-5"
                            >
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="email"
                                        className="text-xs font-medium"
                                    >
                                        Correo Electrónico
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={data.email}
                                            className="pl-9"
                                            autoComplete="username"
                                            autoFocus
                                            placeholder="correo@ejemplo.com"
                                            onChange={(e) =>
                                                setData('email', e.target.value)
                                            }
                                        />
                                    </div>
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="password"
                                        className="text-xs font-medium"
                                    >
                                        Contraseña
                                    </Label>
                                    <div className="relative">
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            value={data.password}
                                            autoComplete="current-password"
                                            placeholder="••••••••"
                                            onChange={(e) =>
                                                setData(
                                                    'password',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <InputError message={errors.password} />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="remember"
                                        name="remember"
                                        checked={data.remember}
                                        onCheckedChange={(checked) =>
                                            setData(
                                                'remember',
                                                checked as boolean,
                                            )
                                        }
                                    />
                                    <Label
                                        htmlFor="remember"
                                        className="cursor-pointer text-xs font-normal text-muted-foreground"
                                    >
                                        Recordar mi sesión
                                    </Label>
                                </div>

                                <Button
                                    type="submit"
                                    className="mt-2 w-full font-medium"
                                    disabled={processing}
                                >
                                    {processing
                                        ? 'Iniciando sesión...'
                                        : 'Entrar al Portal'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <p className="text-center text-xs text-muted-foreground">
                        ¿Tiene problemas para acceder? Comuníquese con la
                        recepción de PatoLab para verificar sus credenciales.
                    </p>
                </div>
            </div>
        </div>
    );
}
