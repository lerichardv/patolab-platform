import { Head, Link } from '@inertiajs/react';
import { format, add, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Microscope,
    Calendar,
    Clock,
    Tag,
    User,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    ShieldAlert,
    MapPin,
    Activity,
    FileText,
    ArrowLeft,
} from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import GuestLayout from '@/layouts/guest-layout';

interface Props {
    specimen: any;
}

const STATUS_STEPS = [
    {
        key: 'received',
        label: 'Recibida',
        desc: 'Muestra ingresada en el sistema.',
    },
    {
        key: 'macroscopic_review',
        label: 'Rev. Macroscópica',
        desc: 'Análisis físico y macroscópico de la muestra.',
    },
    {
        key: 'processing',
        label: 'En procesamiento',
        desc: 'Procesamiento en laboratorio.',
    },
    {
        key: 'microscopic_review',
        label: 'Rev. Microscópica',
        desc: 'Análisis microscópico por patólogo.',
    },
    {
        key: 'finalized',
        label: 'Finalizada',
        desc: 'Diagnóstico concluido y reporte firmado.',
    },
    {
        key: 'delivered',
        label: 'Entregada',
        desc: 'El reporte físico o digital fue entregado al paciente.',
    },
];

export default function PublicProgress({ specimen }: Props) {
    if (!specimen) {
        return (
            <GuestLayout showLogo={true} title="Error">
                <Card className="w-full max-w-md border-destructive/20 bg-card/60 shadow-lg backdrop-blur-md">
                    <CardContent className="space-y-4 pt-6 text-center">
                        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
                        <h1 className="text-xl font-bold text-destructive">
                            Error
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Muestra no encontrada o enlace inválido.
                        </p>
                    </CardContent>
                </Card>
            </GuestLayout>
        );
    }

    const formattedDate = specimen.created_at
        ? format(new Date(specimen.created_at), "dd 'de' MMMM, yyyy - HH:mm", {
              locale: es,
          })
        : 'N/A';

    const getEstimatedDate = () => {
        if (
            !specimen.category ||
            !specimen.category.unit ||
            !specimen.category.quantity ||
            !specimen.created_at
        ) {
            return null;
        }

        const createdAt = new Date(specimen.created_at);
        const unitMap: Record<string, string> = {
            minutes: 'minutes',
            hours: 'hours',
            days: 'days',
            weeks: 'weeks',
        };
        const duration = {
            [unitMap[specimen.category.unit] || 'days']:
                specimen.category.quantity,
        };

        return add(createdAt, duration);
    };

    const estimatedDate = getEstimatedDate();
    const formattedEstimatedDate = estimatedDate
        ? format(estimatedDate, "dd 'de' MMMM, yyyy - HH:mm", { locale: es })
        : null;

    const isCompleted = ['finalized', 'delivered', 'cancelled'].includes(
        specimen.status,
    );
    const isOverdue = estimatedDate
        ? isPast(estimatedDate) && !isToday(estimatedDate) && !isCompleted
        : false;
    const isEstimatedToday = estimatedDate
        ? isToday(estimatedDate) && !isCompleted
        : false;

    // Determine active step index
    const currentStepIndex = STATUS_STEPS.findIndex(
        (step) => step.key === specimen.status,
    );
    const isCancelled = specimen.status === 'cancelled';

    return (
        <GuestLayout showLogo={true} title={specimen.sequence_code}>
            <Head title={`Progreso Muestra ${specimen.sequence_code || ''}`} />
            <div className="w-full max-w-4xl space-y-6">
                {specimen.group && (
                    <div className="mb-2 flex justify-start">
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="group gap-2 text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
                        >
                            <Link
                                href={`/specimen-group/${specimen.group.id}?token=${specimen.group.access_token}`}
                            >
                                <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                                Ver grupo completo
                            </Link>
                        </Button>
                    </div>
                )}
                {/* Status Hero Card */}
                <Card className="overflow-hidden border-border/50 bg-card/60 shadow-xl backdrop-blur-md">
                    <div
                        className="h-[4px] w-full bg-gradient-to-r transition-all duration-500"
                        style={{
                            backgroundImage: isCancelled
                                ? 'linear-gradient(to right, #ef4444, #f43f5e)'
                                : specimen.status === 'received'
                                  ? 'linear-gradient(to right, #3b82f6, #6366f1)'
                                  : specimen.status === 'macroscopic_review'
                                    ? 'linear-gradient(to right, #8b5cf6, #a855f7)'
                                    : specimen.status === 'processing'
                                      ? 'linear-gradient(to right, #f59e0b, #eab308)'
                                      : specimen.status === 'microscopic_review'
                                        ? 'linear-gradient(to right, #d946ef, #ec4899)'
                                        : specimen.status === 'finalized'
                                          ? 'linear-gradient(to right, #10b981, #14b8a6)'
                                          : specimen.status === 'delivered'
                                            ? 'linear-gradient(to right, #64748b, #94a3b8)'
                                            : 'linear-gradient(to right, #cbd5e1, #e2e8f0)',
                        }}
                    />
                    <CardHeader className="pb-4">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                    <Microscope className="h-6 w-6 text-primary" />{' '}
                                    Estado de la Muestra -{' '}
                                    {specimen.sequence_code}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Registrado el {formattedDate}
                                </p>
                            </div>

                            <div>
                                {isCancelled ? (
                                    <Badge className="bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600">
                                        Cancelada
                                    </Badge>
                                ) : (
                                    <Badge
                                        className="px-3 py-1 text-sm font-semibold text-white"
                                        style={{
                                            backgroundColor:
                                                specimen.status === 'received'
                                                    ? '#3b82f6'
                                                    : specimen.status ===
                                                        'macroscopic_review'
                                                      ? '#8b5cf6'
                                                      : specimen.status ===
                                                          'processing'
                                                        ? '#f59e0b'
                                                        : specimen.status ===
                                                            'microscopic_review'
                                                          ? '#d946ef'
                                                          : specimen.status ===
                                                              'finalized'
                                                            ? '#10b981'
                                                            : specimen.status ===
                                                                'delivered'
                                                              ? '#64748b'
                                                              : '#cbd5e1',
                                        }}
                                    >
                                        {specimen.status === 'received'
                                            ? 'Recibida'
                                            : specimen.status ===
                                                'macroscopic_review'
                                              ? 'Rev. Macroscópica'
                                              : specimen.status === 'processing'
                                                ? 'En procesamiento'
                                                : specimen.status ===
                                                    'microscopic_review'
                                                  ? 'Rev. Microscópica'
                                                  : specimen.status ===
                                                      'finalized'
                                                    ? 'Finalizada'
                                                    : specimen.status ===
                                                        'delivered'
                                                      ? 'Entregada'
                                                      : specimen.status}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* General Specimen Info Grid */}
                        <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/40 bg-muted/30 p-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <User className="h-3.5 w-3.5" /> Paciente
                                </span>
                                <p className="text-sm font-semibold">
                                    {specimen.customer_relation?.name || 'N/A'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Tag className="h-3.5 w-3.5" /> Examen
                                    Solicitado
                                </span>
                                <p className="text-sm font-semibold">
                                    {specimen.type?.name} -{' '}
                                    {specimen.examination?.name}
                                </p>
                            </div>

                            {formattedEstimatedDate && !isCompleted && (
                                <div
                                    className={`col-span-1 space-y-1 rounded-lg border p-2 sm:col-span-2 ${
                                        isOverdue
                                            ? 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300'
                                            : isEstimatedToday
                                              ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                    }`}
                                >
                                    <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                                        <Clock className="h-3 w-3" />
                                        {isOverdue
                                            ? 'Retrasado'
                                            : isEstimatedToday
                                              ? 'Estimado hoy'
                                              : 'Estimado'}
                                    </span>
                                    <p className="mt-1 text-xs leading-none font-semibold">
                                        {formattedEstimatedDate}
                                    </p>
                                </div>
                            )}
                        </div>

                        <Separator className="bg-border/40" />

                        {/* Progress Steps Timeline */}
                        {isCancelled ? (
                            <div className="flex flex-col items-center justify-center space-y-2 rounded-xl border border-red-500/20 bg-red-500/5 py-6 text-center">
                                <AlertTriangle className="h-10 w-10 text-red-500" />
                                <h3 className="font-bold text-red-700 dark:text-red-400">
                                    Análisis Cancelado
                                </h3>
                                <p className="max-w-md text-sm text-muted-foreground">
                                    Este análisis de muestra ha sido cancelado.
                                    Por favor, póngase en contacto con el
                                    laboratorio para más información.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <h3 className="flex items-center gap-2 text-base font-semibold">
                                    <Clock className="h-4 w-4 text-primary" />{' '}
                                    Línea de Tiempo del Progreso
                                </h3>

                                <div className="relative space-y-8 pl-6 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-[2px] before:bg-border/60 md:pl-8">
                                    {STATUS_STEPS.map((step, idx) => {
                                        const isPastStep =
                                            idx < currentStepIndex;
                                        const isCurrentStep =
                                            idx === currentStepIndex;

                                        return (
                                            <div
                                                key={step.key}
                                                className="group relative"
                                            >
                                                {/* Step Node Icon/Indicator */}
                                                <div
                                                    className={`absolute top-1 -left-[27px] z-10 flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-300 md:-left-[31px] ${
                                                        isPastStep
                                                            ? 'border-emerald-600 bg-emerald-500 text-white shadow-md'
                                                            : isCurrentStep
                                                              ? 'scale-110 border-blue-700 bg-blue-600 text-white shadow-md ring-4 ring-blue-500/20'
                                                              : 'border-border bg-background text-muted-foreground'
                                                    }`}
                                                >
                                                    {isPastStep ? (
                                                        <CheckCircle2 className="h-4 w-4 stroke-[3]" />
                                                    ) : isCurrentStep ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <span className="text-[10px] font-bold">
                                                            {idx + 1}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Step Content */}
                                                <div
                                                    className={`transition-all duration-200 ${
                                                        isCurrentStep
                                                            ? 'translate-x-1 opacity-100'
                                                            : isPastStep
                                                              ? 'opacity-80'
                                                              : 'opacity-50'
                                                    }`}
                                                >
                                                    <h4 className="flex items-center gap-2 text-sm font-bold">
                                                        {step.label}
                                                        {isCurrentStep && (
                                                            <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400">
                                                                Etapa Actual
                                                            </span>
                                                        )}
                                                    </h4>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {step.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </GuestLayout>
    );
}
