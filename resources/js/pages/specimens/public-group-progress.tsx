import { Head, Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Microscope,
    Layers,
    ExternalLink,
    ShieldAlert,
    User,
    Tag,
    Clock,
    ArrowRight,
    AlertCircle,
    FileText,
    ChevronDown,
    CheckCircle2,
    Loader2,
    AlertTriangle,
} from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import GuestLayout from '@/layouts/guest-layout';

interface Props {
    group: any;
}

const STATUS_LABELS: Record<string, string> = {
    received: 'Recibida',
    macroscopic_review: 'Rev. Macroscópica',
    processing: 'En Procesamiento',
    microscopic_review: 'Rev. Microscópica',
    finalized: 'Finalizada',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
    received: '#3b82f6', // blue-500
    macroscopic_review: '#8b5cf6', // violet-500
    processing: '#f59e0b', // amber-500
    microscopic_review: '#d946ef', // fuchsia-500
    finalized: '#10b981', // emerald-500
    delivered: '#64748b', // slate-500
    cancelled: '#ef4444', // red-500
};

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

export default function PublicGroupProgress({ group }: Props) {
    const [expandedSpecimens, setExpandedSpecimens] = React.useState<
        Record<number, boolean>
    >({});

    const toggleTimeline = (specimenId: number) => {
        setExpandedSpecimens((prev) => ({
            ...prev,
            [specimenId]: !prev[specimenId],
        }));
    };

    if (!group) {
        return (
            <GuestLayout showLogo={true} title="Error">
                <Card className="w-full max-w-md border-destructive/20 bg-card/60 shadow-lg backdrop-blur-md">
                    <CardContent className="space-y-4 pt-6 text-center">
                        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
                        <h1 className="text-xl font-bold text-destructive">
                            Error
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Grupo de muestras no encontrado o enlace inválido.
                        </p>
                    </CardContent>
                </Card>
            </GuestLayout>
        );
    }

    const specimens = group.specimens || [];
    const formattedDate = group.created_at
        ? format(new Date(group.created_at), "dd 'de' MMMM, yyyy - HH:mm", {
              locale: es,
          })
        : 'N/A';

    return (
        <GuestLayout showLogo={true} title={group.name}>
            <Head title={`Progreso del Grupo ${group.name}`} />
            <div className="w-full max-w-4xl space-y-6">
                {/* Group Hero Card */}
                <Card className="animate-in overflow-hidden border-border/50 bg-card/60 shadow-xl backdrop-blur-md duration-300 fade-in-50">
                    <div className="h-[4px] w-full bg-gradient-to-r from-violet-600 via-primary to-blue-600" />
                    <CardHeader className="pb-4">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                    <Layers className="h-6 w-6 text-primary" />{' '}
                                    Progreso de Grupo - {group.name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Registrado el {formattedDate}
                                </p>
                            </div>
                            <div>
                                <Badge className="bg-purple-600 px-3 py-1 text-sm font-semibold text-white hover:bg-purple-700">
                                    Grupo de Muestras
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Group Info Grid */}
                        <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/40 bg-muted/30 p-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                    <User className="h-3.5 w-3.5" /> Cliente de
                                    Facturación
                                </span>
                                <p className="text-sm font-semibold text-foreground">
                                    {group.customer?.name ||
                                        group.invoice?.customer?.name ||
                                        'N/A'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                    <Microscope className="h-3.5 w-3.5" />{' '}
                                    Muestras Agrupadas
                                </span>
                                <p className="text-sm font-semibold text-foreground">
                                    {specimens.length} Muestras
                                </p>
                            </div>
                        </div>

                        <Separator className="bg-border/40" />

                        {/* Title */}
                        <div className="space-y-4">
                            <h3 className="flex items-center gap-2 text-base font-semibold">
                                <Clock className="h-4 w-4 text-primary" /> Lista
                                de Muestras del Grupo
                            </h3>

                            {/* Specimen Cards list */}
                            <div className="space-y-4">
                                {specimens.map((specimen: any) => {
                                    const isCancelled =
                                        specimen.status === 'cancelled';

                                    return (
                                        <div
                                            key={specimen.id}
                                            className="relative flex cursor-pointer flex-col gap-4 overflow-hidden rounded-xl border border-border/40 bg-card/45 p-4 shadow-sm transition-all duration-300 hover:border-primary/25 hover:bg-card/85 md:pl-6"
                                            onClick={() =>
                                                toggleTimeline(specimen.id)
                                            }
                                        >
                                            {/* Left status vertical indicator */}
                                            <div
                                                className="absolute top-0 bottom-0 left-0 w-[4px]"
                                                style={{
                                                    backgroundImage: isCancelled
                                                        ? 'linear-gradient(to bottom, #ef4444, #f43f5e)'
                                                        : specimen.status ===
                                                            'received'
                                                          ? 'linear-gradient(to bottom, #3b82f6, #6366f1)'
                                                          : specimen.status ===
                                                              'macroscopic_review'
                                                            ? 'linear-gradient(to bottom, #8b5cf6, #a855f7)'
                                                            : specimen.status ===
                                                                'processing'
                                                              ? 'linear-gradient(to bottom, #f59e0b, #eab308)'
                                                              : specimen.status ===
                                                                  'microscopic_review'
                                                                ? 'linear-gradient(to bottom, #d946ef, #ec4899)'
                                                                : specimen.status ===
                                                                    'finalized'
                                                                  ? 'linear-gradient(to bottom, #10b981, #14b8a6)'
                                                                  : specimen.status ===
                                                                      'delivered'
                                                                    ? 'linear-gradient(to bottom, #64748b, #94a3b8)'
                                                                    : 'linear-gradient(to bottom, #cbd5e1, #e2e8f0)',
                                                }}
                                            />

                                            {/* Specimen main details row */}
                                            <div className="flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                {/* Specimen Info */}
                                                <div className="flex-1 space-y-2.5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {specimen.sequence_code && (
                                                            <span className="rounded border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                                                                {
                                                                    specimen.sequence_code
                                                                }
                                                            </span>
                                                        )}

                                                        {/* Status interactive click handler */}
                                                        <div
                                                            className="group/badge flex items-center gap-1.5 select-none"
                                                            title="Haga clic para ver todo el proceso"
                                                        >
                                                            <Badge
                                                                className="px-2 py-0.5 text-[10px] font-semibold text-white transition-opacity hover:opacity-90"
                                                                style={{
                                                                    backgroundColor:
                                                                        STATUS_COLORS[
                                                                            specimen
                                                                                .status
                                                                        ] ||
                                                                        '#cbd5e1',
                                                                }}
                                                            >
                                                                {STATUS_LABELS[
                                                                    specimen
                                                                        .status
                                                                ] ||
                                                                    specimen.status}
                                                            </Badge>
                                                            <ChevronDown
                                                                className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${expandedSpecimens[specimen.id] ? 'rotate-180 text-primary' : 'group-hover/badge:text-foreground'}`}
                                                            />
                                                        </div>

                                                        {specimen.priority && (
                                                            <div className="ml-1 flex items-center gap-1.5">
                                                                <div
                                                                    className="h-1.5 w-1.5 rounded-full"
                                                                    style={{
                                                                        backgroundColor:
                                                                            specimen
                                                                                .priority
                                                                                .color,
                                                                    }}
                                                                />
                                                                <span className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                                    {
                                                                        specimen
                                                                            .priority
                                                                            .name
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                                                        <div className="space-y-0.5">
                                                            <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                                                                <User className="h-3 w-3" />{' '}
                                                                Paciente
                                                            </span>
                                                            <p className="font-semibold text-foreground">
                                                                {specimen
                                                                    .customer_relation
                                                                    ?.name ||
                                                                    'N/A'}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                                                                <Tag className="h-3 w-3" />{' '}
                                                                Examen
                                                                Solicitado
                                                            </span>
                                                            <p className="font-semibold text-foreground">
                                                                {
                                                                    specimen
                                                                        .type
                                                                        ?.name
                                                                }{' '}
                                                                -{' '}
                                                                {
                                                                    specimen
                                                                        .examination
                                                                        ?.name
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Link to detail */}
                                                <div
                                                    className="mt-2 flex shrink-0 items-center md:mt-0"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-full gap-1.5 text-xs font-semibold transition-all hover:border-transparent hover:bg-primary hover:text-primary-foreground md:w-auto"
                                                    >
                                                        <a
                                                            href={`/specimen/${specimen.sequence_code}?token=${specimen.access_token}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            Ver muestra
                                                            individual{' '}
                                                            <ArrowRight className="h-3.5 w-3.5" />
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Collapsible Timeline Progress */}
                                            {expandedSpecimens[specimen.id] && (
                                                <div
                                                    className="mt-1 w-full animate-in space-y-4 border-t border-border/40 pt-4 duration-250 slide-in-from-top-3"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    {isCancelled ? (
                                                        <div className="flex flex-col items-center justify-center space-y-2 rounded-xl border border-red-500/20 bg-red-500/5 py-4 text-center">
                                                            <AlertTriangle className="h-8 w-8 text-red-500" />
                                                            <h4 className="text-xs font-bold text-red-700 dark:text-red-400">
                                                                Análisis
                                                                Cancelado
                                                            </h4>
                                                            <p className="max-w-sm text-[11px] text-muted-foreground">
                                                                Este análisis de
                                                                muestra ha sido
                                                                cancelado. Por
                                                                favor, póngase
                                                                en contacto con
                                                                el laboratorio
                                                                para más
                                                                información.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4 pl-2">
                                                            <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground/80">
                                                                <Clock className="h-3.5 w-3.5 text-primary" />{' '}
                                                                Historial de
                                                                Progreso de{' '}
                                                                {
                                                                    specimen.sequence_code
                                                                }
                                                            </h4>

                                                            <div className="relative space-y-5 pl-6 before:absolute before:top-2 before:bottom-2 before:left-[9px] before:w-[1.5px] before:bg-border/60">
                                                                {STATUS_STEPS.map(
                                                                    (
                                                                        step,
                                                                        idx,
                                                                    ) => {
                                                                        const isDelivered =
                                                                            specimen.status ===
                                                                            'delivered';
                                                                        const currentStepIndex =
                                                                            STATUS_STEPS.findIndex(
                                                                                (
                                                                                    s,
                                                                                ) =>
                                                                                    s.key ===
                                                                                    specimen.status,
                                                                            );
                                                                        const isPastStep =
                                                                            isDelivered
                                                                                ? true
                                                                                : idx <
                                                                                  currentStepIndex;
                                                                        const isCurrentStep =
                                                                            isDelivered
                                                                                ? false
                                                                                : idx ===
                                                                                  currentStepIndex;

                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    step.key
                                                                                }
                                                                                className="group relative"
                                                                            >
                                                                                {/* Step Node Icon/Indicator */}
                                                                                <div
                                                                                    className={`absolute top-0.5 -left-[23px] z-10 flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-300 ${
                                                                                        isPastStep
                                                                                            ? 'border-emerald-600 bg-emerald-50 text-white shadow-sm'
                                                                                            : isCurrentStep
                                                                                              ? 'scale-110 border-blue-700 bg-blue-600 text-white shadow-md ring-4 ring-blue-500/20'
                                                                                              : 'border-border bg-background text-muted-foreground'
                                                                                    }`}
                                                                                >
                                                                                    {isPastStep ? (
                                                                                        <CheckCircle2 className="h-3 w-3 stroke-[3] text-emerald-600" />
                                                                                    ) : isCurrentStep ? (
                                                                                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                                                    ) : (
                                                                                        <span className="text-[9px] font-semibold">
                                                                                            {idx +
                                                                                                1}
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Step Content */}
                                                                                <div
                                                                                    className={`transition-all duration-200 ${
                                                                                        isCurrentStep
                                                                                            ? 'translate-x-0.5 opacity-100'
                                                                                            : isPastStep
                                                                                              ? 'opacity-80'
                                                                                              : 'opacity-40'
                                                                                    }`}
                                                                                >
                                                                                    <h5 className="flex items-center gap-1.5 text-xs font-bold">
                                                                                        {
                                                                                            step.label
                                                                                        }
                                                                                        {isCurrentStep && (
                                                                                            <span className="py-0.2 rounded border border-blue-500/20 bg-blue-500/10 px-1.5 text-[9px] font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400">
                                                                                                Actual
                                                                                            </span>
                                                                                        )}
                                                                                    </h5>
                                                                                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                                                                                        {
                                                                                            step.desc
                                                                                        }
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {specimens.length === 0 && (
                                    <div className="rounded-xl border border-dashed bg-muted/10 py-12 text-center text-muted-foreground">
                                        <Microscope className="mx-auto mb-2 h-10 w-10 animate-pulse text-muted-foreground/45" />
                                        <p className="text-sm font-medium">
                                            No hay muestras registradas en este
                                            grupo.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </GuestLayout>
    );
}
