import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Download,
    FileCheck,
    FlaskConical,
    Microscope,
    User,
} from 'lucide-react';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes/customer-portal';
import { report } from '@/routes/customer-portal/specimens';

interface CustomerSummary {
    id: number;
    name: string;
    id_number: string;
    gender?: string;
    age?: number | string;
    age_unit?: string;
    formatted_age?: string;
    phone?: string;
}

interface SpecimenDetail {
    id: number;
    sequence_code: string;
    status: string;
    status_label?: string;
    status_color?: string;
    received_at: string | null;
    macroscopic_review_at: string | null;
    processing_at: string | null;
    microscopic_review_at: string | null;
    finalized_at: string | null;
    delivered_at: string | null;
    sample_collection_date: string | null;
    clinical_notes?: string | null;
    anatomic_site?: string | null;
    report_id: number | null;
    customer_relation?: CustomerSummary;
    customerRelation?: CustomerSummary;
    type?: {
        id: number;
        name: string;
        active_states?: Array<{
            status: string;
            step_order?: number;
            active?: boolean;
        }>;
        activeStates?: Array<{
            status: string;
            step_order?: number;
            active?: boolean;
        }>;
    };
    examination?: {
        id: number;
        name: string;
    };
    category?: {
        id: number;
        name: string;
    };
    report?: {
        id: number;
        report_code?: string;
        finalization_date?: string | null;
    };
}

export interface TimelineStep {
    key: string;
    step_number: number;
    label: string;
    color?: string;
    description?: string;
    date?: string | null;
    date_key?: string;
    is_completed: boolean;
    is_current: boolean;
}

export interface StatusMeta {
    key: string;
    label: string;
    color: string;
    is_cancelled: boolean;
}

interface Props {
    specimen: SpecimenDetail;
    can_download_report: boolean;
    timeline_steps?: TimelineStep[];
    status_meta?: StatusMeta;
}

const STATUS_ICONS: Record<
    string,
    React.ComponentType<{ className?: string }>
> = {
    received: Clock,
    macroscopic_review: Microscope,
    processing: FlaskConical,
    microscopic_review: Microscope,
    finalized: FileCheck,
    delivered: CheckCircle2,
};

const STATUS_VARIANTS: Record<string, string> = {
    received:
        'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    macroscopic_review:
        'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    processing:
        'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    microscopic_review:
        'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800',
    finalized:
        'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    delivered:
        'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    cancelled:
        'bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
};

const DEFAULT_STEPS = [
    {
        key: 'received',
        label: 'Recibida',
        dateKey: 'received_at',
    },
    {
        key: 'macroscopic_review',
        label: 'Rev. Macroscópica',
        dateKey: 'macroscopic_review_at',
    },
    {
        key: 'processing',
        label: 'En Procesamiento',
        dateKey: 'processing_at',
    },
    {
        key: 'microscopic_review',
        label: 'Rev. Microscópica',
        dateKey: 'microscopic_review_at',
    },
    {
        key: 'finalized',
        label: 'Finalizada',
        dateKey: 'finalized_at',
    },
    {
        key: 'delivered',
        label: 'Entregada',
        dateKey: 'delivered_at',
    },
];

export default function CustomerPortalShow({
    specimen,
    can_download_report,
    timeline_steps,
    status_meta,
}: Props) {
    const isCancelled = specimen.status === 'cancelled';
    const patient = specimen.customer_relation || specimen.customerRelation;
    const patientAge =
        patient?.formatted_age ||
        (patient?.age != null
            ? `${patient.age} ${
                  patient.age_unit === 'months'
                      ? 'meses'
                      : patient.age_unit === 'days'
                        ? 'días'
                        : 'años'
              }`
            : null);

    const steps = useMemo<TimelineStep[]>(() => {
        if (timeline_steps && timeline_steps.length > 0) {
            return timeline_steps;
        }

        const activeStatesConfig: Array<{
            status: string;
            step_order?: number;
            active?: boolean;
        }> = specimen.type?.active_states || specimen.type?.activeStates || [];

        const activeList = activeStatesConfig.filter(
            (s) => s.active !== false && s.status !== 'cancelled',
        );

        const baseList =
            activeList.length > 0
                ? (activeList
                      .map((s) =>
                          DEFAULT_STEPS.find((ds) => ds.key === s.status),
                      )
                      .filter(Boolean) as typeof DEFAULT_STEPS)
                : DEFAULT_STEPS;

        const currentIndex = baseList.findIndex(
            (s) => s.key === specimen.status,
        );

        return baseList.map((step, idx) => {
            const dateVal = (specimen as any)[step.dateKey];
            const isDelivered = specimen.status === 'delivered';
            const isCompleted =
                isDelivered || (currentIndex !== -1 && idx < currentIndex);
            const isCurrent = currentIndex !== -1 && idx === currentIndex;

            return {
                key: step.key,
                step_number: idx + 1,
                label: step.label,
                date: dateVal,
                date_key: step.dateKey,
                is_completed: isCompleted,
                is_current: isCurrent,
            };
        });
    }, [timeline_steps, specimen]);

    return (
        <div className="flex flex-col gap-6">
            <Head
                title={`Estudio ${specimen.sequence_code} — Portal de Clientes`}
            />

            {/* Back Button & Header */}
            <div className="flex flex-col gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="w-fit text-xs text-muted-foreground hover:text-foreground"
                >
                    <Link href={dashboard().url}>
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                        Volver a la lista de estudios
                    </Link>
                </Button>

                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
                                {specimen.sequence_code}
                            </h1>
                            <Badge
                                className={`border text-xs font-semibold ${
                                    STATUS_VARIANTS[specimen.status] ||
                                    'bg-muted text-foreground'
                                }`}
                            >
                                {status_meta?.label ||
                                    specimen.status_label ||
                                    specimen.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Paciente:{' '}
                            <strong className="text-foreground">
                                {patient?.name || 'N/A'}
                            </strong>
                            {patientAge && ` • ${patientAge}`}
                        </p>
                    </div>

                    {can_download_report && (
                        <Button
                            asChild
                            className="h-9 bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                            <a
                                href={report(specimen.sequence_code).url}
                                download
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Download className="mr-1.5 h-4 w-4" />
                                Descargar Reporte PDF
                            </a>
                        </Button>
                    )}
                </div>
            </div>

            {/* Stepper Timeline Card */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        Progreso del Estudio
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                    {isCancelled ? (
                        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-xs text-destructive">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>
                                Este estudio ha sido cancelado. Para más
                                detalles comuníquese con el laboratorio.
                            </span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:auto-cols-fr md:grid-flow-col">
                            {steps.map((step) => {
                                const StepIcon =
                                    STATUS_ICONS[step.key] || Clock;
                                const isCompleted = step.is_completed;
                                const isCurrent = step.is_current;
                                const dateVal =
                                    step.date ||
                                    (step.date_key
                                        ? (specimen as any)[step.date_key]
                                        : null);

                                return (
                                    <div
                                        key={step.key}
                                        className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                                            isCurrent
                                                ? 'border-primary bg-primary/10 shadow-sm'
                                                : isCompleted
                                                  ? 'border-border/60 bg-muted/40'
                                                  : 'border-border/20 bg-muted/10 opacity-50'
                                        }`}
                                    >
                                        <div
                                            className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full ${
                                                isCurrent
                                                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                                                    : isCompleted
                                                      ? 'bg-emerald-600 text-white'
                                                      : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {isCompleted && !isCurrent ? (
                                                <CheckCircle2 className="h-4 w-4" />
                                            ) : (
                                                <StepIcon className="h-4 w-4" />
                                            )}
                                        </div>
                                        <span className="text-xs font-semibold text-foreground">
                                            {step.label}
                                        </span>
                                        {dateVal && (
                                            <span className="mt-1 text-[10px] text-muted-foreground">
                                                {new Date(
                                                    dateVal,
                                                ).toLocaleDateString('es-HN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                })}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Details Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Patient Information Card */}
                <Card className="border-border/60 bg-card/60">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                            <User className="h-4 w-4 text-primary" />
                            Datos del Paciente
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                        <div className="flex justify-between border-b border-border/40 py-1">
                            <span className="text-muted-foreground">
                                Nombre Completo:
                            </span>
                            <span className="font-medium text-foreground">
                                {patient?.name || 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-border/40 py-1">
                            <span className="text-muted-foreground">
                                Identidad / RTN:
                            </span>
                            <span className="font-medium text-foreground">
                                {patient?.id_number || 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-border/40 py-1">
                            <span className="text-muted-foreground">Edad:</span>
                            <span className="font-medium text-foreground">
                                {patientAge || 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-border/40 py-1">
                            <span className="text-muted-foreground">Sexo:</span>
                            <span className="font-medium text-foreground">
                                {patient?.gender || 'N/A'}
                            </span>
                        </div>
                        {patient?.phone && (
                            <div className="flex justify-between py-1">
                                <span className="text-muted-foreground">
                                    Teléfono:
                                </span>
                                <span className="font-medium text-foreground">
                                    {patient.phone}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Study & Sample Details Card */}
                <Card className="border-border/60 bg-card/60">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                            <Microscope className="h-4 w-4 text-primary" />
                            Información del Estudio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                        <div className="flex justify-between border-b border-border/40 py-1">
                            <span className="text-muted-foreground">
                                Tipo de Examen:
                            </span>
                            <span className="font-medium text-foreground">
                                {specimen.examination?.name ||
                                    specimen.type?.name ||
                                    'Patología General'}
                            </span>
                        </div>
                        {specimen.category?.name && (
                            <div className="flex justify-between border-b border-border/40 py-1">
                                <span className="text-muted-foreground">
                                    Categoría:
                                </span>
                                <span className="font-medium text-foreground">
                                    {specimen.category.name}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between border-b border-border/40 py-1">
                            <span className="text-muted-foreground">
                                Fecha de Recepción:
                            </span>
                            <span className="font-medium text-foreground">
                                {specimen.received_at
                                    ? new Date(
                                          specimen.received_at,
                                      ).toLocaleDateString('es-HN', {
                                          day: '2-digit',
                                          month: 'long',
                                          year: 'numeric',
                                      })
                                    : 'N/A'}
                            </span>
                        </div>
                        {specimen.sample_collection_date && (
                            <div className="flex justify-between border-b border-border/40 py-1">
                                <span className="text-muted-foreground">
                                    Fecha de Toma de Muestra:
                                </span>
                                <span className="font-medium text-foreground">
                                    {new Date(
                                        specimen.sample_collection_date,
                                    ).toLocaleDateString('es-HN')}
                                </span>
                            </div>
                        )}
                        {specimen.anatomic_site && (
                            <div className="flex justify-between py-1">
                                <span className="text-muted-foreground">
                                    Sitio Anatómico:
                                </span>
                                <span className="font-medium text-foreground">
                                    {specimen.anatomic_site}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Diagnostic Report Card */}
            <Card className="border-border/60 bg-card/60">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                        <FileCheck className="h-4 w-4 text-primary" />
                        Informe Diagnóstico Oficial
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {can_download_report ? (
                        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                                    <FileCheck className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-foreground">
                                        Reporte Firmado Disponible
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Código de validación:{' '}
                                        {specimen.report?.report_code ||
                                            specimen.sequence_code}
                                    </span>
                                </div>
                            </div>
                            <Button
                                asChild
                                className="bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                                <a
                                    href={report(specimen.sequence_code).url}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                    Descargar PDF Oficial
                                </a>
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/40 p-4">
                            <Clock className="h-5 w-5 shrink-0 text-amber-500" />
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-foreground">
                                    Informe en Proceso de Análisis
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    El informe diagnóstico final estará
                                    disponible en este panel en formato PDF una
                                    vez que el médico patólogo complete la
                                    revisión microscópica y firme el documento.
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
