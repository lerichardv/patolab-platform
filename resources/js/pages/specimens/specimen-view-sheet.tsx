import { usePage } from '@inertiajs/react';
import { format, add, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Microscope,
    User,
    FileText,
    Calendar,
    Clock,
    Tag,
    AlertCircle,
    CreditCard,
    Download,
    ExternalLink,
    Edit,
    MapPin,
    Activity,
    FileImage,
    Coins,
    Copy,
    Check,
    Layers,
    UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import HeadingSheet from '@/components/heading-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface Props {
    specimen: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEditClick: () => void;
    preventCloseOnOutsideClick?: boolean;
    onEditInvoiceClick?: (invoice: any) => void;
    onAssignPathologistClick?: () => void;
}

export default function SpecimenViewSheet({
    specimen,
    open,
    onOpenChange,
    onEditClick,
    preventCloseOnOutsideClick,
    onEditInvoiceClick,
    onAssignPathologistClick,
}: Props) {
    const { auth } = usePage<any>().props;

    if (!specimen) {
        return null;
    }

    const [copied, setCopied] = useState(false);
    const [copiedGroup, setCopiedGroup] = useState(false);

    const copyPublicLink = () => {
        if (!specimen.access_token) {
            return;
        }

        const url = `${window.location.origin}/specimen/${specimen.sequence_code}?token=${specimen.access_token}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const copyGroupPublicLink = () => {
        if (!specimen.group || !specimen.group.access_token) {
            return;
        }

        const url = `${window.location.origin}/specimen-group/${specimen.group.id}?token=${specimen.group.access_token}`;
        navigator.clipboard.writeText(url);
        setCopiedGroup(true);
        setTimeout(() => setCopiedGroup(false), 2000);
    };

    const invoice =
        specimen.is_group && specimen.group && specimen.group.invoice
            ? specimen.group.invoice
            : specimen.invoice_relation;
    const credit = invoice?.credit_relation;

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

    const durationText =
        specimen.category?.quantity && specimen.category?.unit
            ? `${specimen.category.quantity} ${
                  specimen.category.unit === 'minutes'
                      ? 'minutos'
                      : specimen.category.unit === 'hours'
                        ? 'horas'
                        : specimen.category.unit === 'days'
                          ? 'días'
                          : specimen.category.unit === 'weeks'
                            ? 'semanas'
                            : specimen.category.unit
              }`
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
    const isFuture = estimatedDate
        ? !isPast(estimatedDate) && !isToday(estimatedDate) && !isCompleted
        : false;

    let containerClass =
        'bg-primary/5 dark:bg-primary/10 border-primary/20 text-primary';
    let textClass = 'text-primary';
    let labelClass = 'text-muted-foreground';
    let iconClass = 'text-primary';
    let badgeLabel = 'Fecha Estimada de Finalización';

    if (isOverdue) {
        containerClass =
            'bg-destructive/10 dark:bg-destructive/20 border-destructive/20 text-destructive';
        textClass = 'text-destructive';
        labelClass = 'text-destructive/80';
        iconClass = 'text-destructive';
        badgeLabel = 'Fecha Estimada de Finalización (Vencida)';
    } else if (isEstimatedToday) {
        containerClass =
            'bg-yellow-100/50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/30 text-yellow-800 dark:text-yellow-300';
        textClass = 'text-yellow-800 dark:text-yellow-300';
        labelClass = 'text-yellow-800/80 dark:text-yellow-300/80';
        iconClass = 'text-yellow-600 dark:text-yellow-400';
        badgeLabel = 'Fecha Estimada de Finalización (Hoy)';
    } else if (isFuture) {
        containerClass =
            'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300';
        textClass = 'text-emerald-800 dark:text-emerald-300';
        labelClass = 'text-emerald-800/80 dark:text-emerald-300/80';
        iconClass = 'text-emerald-600 dark:text-emerald-400';
    }

    const getPaymentTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            cash: 'Efectivo',
            card: 'Tarjeta',
            'credit card': 'Tarjeta de Crédito',
            transfer: 'Transferencia',
            'bank transfer': 'Transferencia Bancaria',
            check: 'Cheque',
            credit: 'Crédito',
        };

        return labels[type] || type;
    };

    const formatPaymentDate = (dateStr: string | null | undefined) => {
        if (!dateStr) {
            return '';
        }

        try {
            // Extract date part YYYY-MM-DD
            const datePart = dateStr.split(/[ T]/)[0];
            const parts = datePart.split('-');

            if (parts.length !== 3) {
                return dateStr;
            }

            const [year, month, day] = parts.map(Number);

            if (isNaN(year) || isNaN(month) || isNaN(day)) {
                return dateStr;
            }

            // Create date in local timezone
            const date = new Date(year, month - 1, day);

            return format(date, "dd 'de' MMMM, yyyy", { locale: es });
        } catch (e) {
            return dateStr;
        }
    };

    const getFileExtension = (path: string) => {
        return path.split('.').pop()?.toLowerCase();
    };

    const isImageFile = (path: string) => {
        const ext = getFileExtension(path);

        return ext
            ? ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)
            : false;
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[1000px] lg:max-w-[1100px]"
                onPointerDownOutside={(e) => {
                    if (preventCloseOnOutsideClick) {
                        e.preventDefault();
                    }
                }}
                onInteractOutside={(e) => {
                    if (preventCloseOnOutsideClick) {
                        e.preventDefault();
                    }
                }}
                onEscapeKeyDown={(e) => {
                    if (preventCloseOnOutsideClick) {
                        e.preventDefault();
                    }
                }}
            >
                <div className="flex h-full flex-col gap-6 pb-8">
                    {/* Header */}
                    <div className="flex flex-col gap-4 border-b pr-12 pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <HeadingSheet
                                title="Detalles de la Muestra"
                                description={`Registrada el ${formattedDate}`}
                            />
                        </div>
                        <div className="flex w-full justify-center gap-2 sm:w-auto sm:justify-start">
                            {invoice &&
                                onEditInvoiceClick &&
                                auth.permissions?.includes(
                                    'specimens.edit',
                                ) && (
                                    <Button
                                        onClick={() => {
                                            onOpenChange(false);
                                            onEditInvoiceClick(invoice);
                                        }}
                                        variant="outline"
                                        className="flex items-center gap-2"
                                    >
                                        <CreditCard className="h-4 w-4" />{' '}
                                        Editar Factura
                                    </Button>
                                )}
                            {auth.permissions?.includes('specimens.edit') && (
                                <Button
                                    onClick={onEditClick}
                                    className="flex items-center gap-2"
                                >
                                    <Edit className="h-4 w-4" /> Editar Muestra
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 gap-6 px-5 md:grid-cols-2">
                        {/* Left Column: Specimen Info */}
                        <div className="space-y-6">
                            <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                    <Microscope className="h-5 w-5" />{' '}
                                    Información General
                                </h3>
                                <Separator />

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {specimen.sequence_code && (
                                        <div className="space-y-1 rounded-md border border-dashed bg-muted/40 p-2.5 sm:col-span-2">
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Tag className="h-3.5 w-3.5" />{' '}
                                                Código de Secuencia (Muestra)
                                            </span>
                                            <p className="font-mono text-sm font-bold text-primary">
                                                {specimen.sequence_code}
                                            </p>
                                        </div>
                                    )}
                                    {specimen.group && (
                                        <div className="flex animate-in flex-col gap-2 space-y-1 rounded-md border border-dashed border-purple-500/25 bg-purple-500/5 p-2.5 duration-200 fade-in-50 sm:col-span-2 dark:bg-purple-500/10">
                                            <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-300">
                                                <Layers className="h-3.5 w-3.5 text-purple-500" />{' '}
                                                Grupo de Muestras
                                            </span>
                                            <p className="text-sm font-bold text-purple-700 dark:text-purple-200">
                                                {specimen.group.name}
                                            </p>

                                            {specimen.group.access_token && (
                                                <div className="mt-1 flex flex-col gap-1.5 space-y-1 border-t pt-2">
                                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-300">
                                                        <ExternalLink className="h-3 w-3 text-purple-500" />{' '}
                                                        Enlace Público del Grupo
                                                    </span>
                                                    <div className="flex w-full gap-2">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={`${window.location.origin}/specimen-group/${specimen.group.id}?token=${specimen.group.access_token}`}
                                                            className="flex-1 rounded border border-purple-500/20 bg-background px-2.5 py-1 font-mono text-[11px] outline-none select-all"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={
                                                                copyGroupPublicLink
                                                            }
                                                            className="flex h-8 shrink-0 items-center gap-1.5 border-purple-500/20 px-2.5 text-[11px] hover:bg-purple-500/10 hover:text-purple-700"
                                                        >
                                                            {copiedGroup ? (
                                                                <>
                                                                    <Check className="h-3 w-3 text-emerald-500" />{' '}
                                                                    Copiado
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="h-3 w-3" />{' '}
                                                                    Copiar
                                                                </>
                                                            )}
                                                        </Button>
                                                        <a
                                                            href={`/specimen-group/${specimen.group.id}?token=${specimen.group.access_token}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex h-8 items-center justify-center rounded border border-purple-500/20 bg-background px-2.5 text-xs font-medium hover:bg-purple-500/10 hover:text-purple-700"
                                                        >
                                                            Abrir
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {specimen.access_token && (
                                        <div className="flex flex-col gap-2 space-y-1 rounded-md border border-dashed bg-muted/40 p-2.5 sm:col-span-2">
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <ExternalLink className="h-3.5 w-3.5 text-primary" />{' '}
                                                Enlace de Muestra Público
                                            </span>
                                            <div className="flex w-full gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={`${window.location.origin}/specimen/${specimen.sequence_code}?token=${specimen.access_token}`}
                                                    className="flex-1 rounded-md border bg-background px-3 py-1 font-mono text-xs outline-none select-all"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={copyPublicLink}
                                                    className="flex h-8 shrink-0 items-center gap-1.5"
                                                >
                                                    {copied ? (
                                                        <>
                                                            <Check className="h-3.5 w-3.5 text-emerald-500" />{' '}
                                                            Copiado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="h-3.5 w-3.5" />{' '}
                                                            Copiar
                                                        </>
                                                    )}
                                                </Button>
                                                <a
                                                    href={`/specimen/${specimen.sequence_code}?token=${specimen.access_token}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 text-xs hover:bg-accent hover:text-accent-foreground"
                                                >
                                                    Abrir
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {formattedEstimatedDate && !isCompleted && (
                                        <div
                                            className={`space-y-1 rounded-md border p-2.5 sm:col-span-2 ${containerClass}`}
                                        >
                                            <span
                                                className={`flex items-center gap-1 text-xs ${labelClass}`}
                                            >
                                                <Calendar
                                                    className={`h-3.5 w-3.5 ${iconClass}`}
                                                />
                                                {badgeLabel}
                                            </span>
                                            <p
                                                className={`text-sm font-semibold ${textClass}`}
                                            >
                                                {formattedEstimatedDate}
                                            </p>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <User className="h-3.5 w-3.5" />{' '}
                                            Paciente
                                        </span>
                                        <p className="text-sm font-medium">
                                            {specimen.customer_relation?.name ||
                                                'N/A'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Tag className="h-3.5 w-3.5" />{' '}
                                            Categoría
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium">
                                                {specimen.category?.name ||
                                                    'N/A'}
                                            </p>
                                            {durationText && (
                                                <div className="inline-flex w-fit items-center gap-1 rounded-full border border-transparent bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />{' '}
                                                    {durationText}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3.5 w-3.5" />{' '}
                                            Estado
                                        </span>
                                        <div>
                                            <span
                                                className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                                                style={{
                                                    backgroundColor:
                                                        specimen.status_color ||
                                                        '#cbd5e1',
                                                }}
                                            >
                                                {specimen.status === 'received'
                                                    ? 'Recibida'
                                                    : specimen.status ===
                                                        'macroscopic_review'
                                                      ? 'Rev. Macroscópica'
                                                      : specimen.status ===
                                                          'processing'
                                                        ? 'En Proceso'
                                                        : specimen.status ===
                                                            'microscopic_review'
                                                          ? 'Rev. Microscópica'
                                                          : specimen.status ===
                                                              'finalized'
                                                            ? 'Finalizada'
                                                            : specimen.status ===
                                                                'delivered'
                                                              ? 'Entregada'
                                                              : specimen.status ===
                                                                  'cancelled'
                                                                ? 'Cancelada'
                                                                : specimen.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <AlertCircle className="h-3.5 w-3.5" />{' '}
                                            Prioridad
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-3 w-3 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        specimen.priority
                                                            ?.color ||
                                                        '#cbd5e1',
                                                }}
                                            />
                                            <span className="text-sm font-medium">
                                                {specimen.priority?.name ||
                                                    'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <span className="text-xs text-muted-foreground">
                                            Examen
                                        </span>
                                        <p className="text-sm font-medium">
                                            {specimen.type?.name} -{' '}
                                            {specimen.examination?.name}
                                        </p>
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <MapPin className="h-3.5 w-3.5" />{' '}
                                            Sitio Anatómico
                                        </span>
                                        <p className="text-sm font-medium">
                                            {specimen.anatomic_site || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <span className="text-xs text-muted-foreground">
                                            Médico Referente
                                        </span>
                                        <p className="text-sm font-medium">
                                            {specimen.referrer_relation?.name ||
                                                'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Clinical Notes & Diagnosis */}
                            <div className="mb-10 space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                    <Activity className="h-5 w-5" /> Detalles
                                    Clínicos
                                </h3>
                                <Separator />
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">
                                            Diagnóstico Clínico
                                        </span>
                                        <p className="min-h-[50px] rounded bg-muted/40 p-2.5 text-sm whitespace-pre-wrap">
                                            {specimen.diagnosis ||
                                                'Sin diagnóstico registrado.'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">
                                            Notas Clínicas
                                        </span>
                                        <p className="min-h-[50px] rounded bg-muted/40 p-2.5 text-sm whitespace-pre-wrap">
                                            {specimen.clinical_notes ||
                                                'Sin notas clínicas.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Medical Order File */}
                            {specimen.medical_order_file && (
                                <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                        <FileText className="h-5 w-5" /> Orden
                                        Médica
                                    </h3>
                                    <Separator />
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between rounded bg-muted/40 p-3">
                                            <div className="flex items-center gap-2">
                                                {isImageFile(
                                                    specimen.medical_order_file,
                                                ) ? (
                                                    <FileImage className="h-5 w-5 text-blue-500" />
                                                ) : (
                                                    <FileText className="h-5 w-5 text-red-500" />
                                                )}
                                                <span className="max-w-[200px] truncate text-xs font-medium">
                                                    {specimen.medical_order_file
                                                        .split('/')
                                                        .pop()}
                                                </span>
                                            </div>
                                            <div className="flex gap-1">
                                                <a
                                                    href={`/storage/${specimen.medical_order_file}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />{' '}
                                                    Ver
                                                </a>
                                                <a
                                                    href={`/storage/${specimen.medical_order_file}`}
                                                    download
                                                    className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                                >
                                                    <Download className="h-3.5 w-3.5" />{' '}
                                                    Descargar
                                                </a>
                                            </div>
                                        </div>

                                        {isImageFile(
                                            specimen.medical_order_file,
                                        ) && (
                                            <div className="flex max-h-[250px] items-center justify-center overflow-hidden rounded-md border bg-muted/20">
                                                <img
                                                    src={`/storage/${specimen.medical_order_file}`}
                                                    alt="Orden Médica"
                                                    className="max-h-[250px] max-w-full object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Invoice & Credit Info */}
                        <div className="space-y-6">
                            {/* Assigned Pathologists */}
                            <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                        <User className="h-5 w-5" /> Patólogos
                                        Asignados
                                    </h3>
                                    {onAssignPathologistClick &&
                                        auth.permissions?.includes(
                                            'specimens.manage',
                                        ) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    onOpenChange(false);
                                                    onAssignPathologistClick();
                                                }}
                                                className="h-8 gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
                                            >
                                                <UserPlus className="h-3.5 w-3.5" />{' '}
                                                Asignar
                                            </Button>
                                        )}
                                </div>
                                <Separator />
                                {specimen.users && specimen.users.length > 0 ? (
                                    <div className="overflow-hidden rounded-lg border border-border/85 bg-muted/5">
                                        <table className="w-full border-collapse text-left text-sm">
                                            <thead>
                                                <tr className="border-b bg-muted/50 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                    <th className="p-3">
                                                        Nombre
                                                    </th>
                                                    <th className="p-3">
                                                        Correo Electrónico
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60">
                                                {specimen.users.map(
                                                    (user: any) => (
                                                        <tr
                                                            key={user.id}
                                                            className="transition-colors hover:bg-muted/20"
                                                        >
                                                            <td className="p-3 font-medium text-foreground">
                                                                {user.name}
                                                            </td>
                                                            <td className="p-3 text-muted-foreground">
                                                                {user.email}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="space-y-3 rounded-lg border border-dashed bg-muted/10 px-4 py-6 text-center">
                                        <p className="text-xs text-muted-foreground">
                                            No hay patólogos asignados a esta
                                            muestra.
                                        </p>
                                        {onAssignPathologistClick &&
                                            auth.permissions?.includes(
                                                'specimens.manage',
                                            ) && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        onOpenChange(false);
                                                        onAssignPathologistClick();
                                                    }}
                                                    className="mx-auto flex h-8 items-center gap-1.5 border-primary/20 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
                                                >
                                                    <UserPlus className="h-3.5 w-3.5" />{' '}
                                                    Asignar Patólogo
                                                </Button>
                                            )}
                                    </div>
                                )}
                            </div>

                            {invoice ? (
                                <>
                                    <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                        <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                            <CreditCard className="h-5 w-5" />{' '}
                                            Información de Facturación
                                        </h3>
                                        <Separator />

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground">
                                                        Número de Factura
                                                    </span>
                                                    <p className="text-sm font-semibold">
                                                        {
                                                            invoice.full_invoice_number
                                                        }
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground">
                                                        Método de Pago
                                                    </span>
                                                    <div>
                                                        <Badge
                                                            variant={
                                                                invoice.payment_type ===
                                                                'credit'
                                                                    ? 'destructive'
                                                                    : 'default'
                                                            }
                                                            className="capitalize"
                                                        >
                                                            {getPaymentTypeLabel(
                                                                invoice.payment_type,
                                                            )}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CAI Details */}
                                            {invoice.cai_range && (
                                                <div className="space-y-1 rounded bg-muted/30 p-3 text-xs">
                                                    <p className="font-semibold text-muted-foreground">
                                                        Datos del Rango CAI:
                                                    </p>
                                                    <p>
                                                        <span className="font-medium">
                                                            CAI:
                                                        </span>{' '}
                                                        {invoice.cai_range.cai}
                                                    </p>
                                                    <p>
                                                        <span className="font-medium">
                                                            Rango:
                                                        </span>{' '}
                                                        {
                                                            invoice.cai_range
                                                                .from_number
                                                        }{' '}
                                                        al{' '}
                                                        {
                                                            invoice.cai_range
                                                                .to_number
                                                        }
                                                    </p>
                                                </div>
                                            )}

                                            {/* Detalles de Método de Pago */}
                                            {(invoice.payment_type !==
                                                'credit' ||
                                                (invoice.payment_type ===
                                                    'credit' &&
                                                    parseFloat(
                                                        invoice.total_paid,
                                                    ) > 0)) && (
                                                <div className="space-y-2.5 rounded-lg border border-border bg-muted/20 p-4">
                                                    <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                        Detalles del Pago{' '}
                                                        {invoice.payment_type ===
                                                            'credit' &&
                                                            '(Pago Inicial)'}
                                                    </h4>

                                                    {invoice.payment_method_date && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">
                                                                Fecha de Pago:
                                                            </span>
                                                            <span className="font-medium">
                                                                {formatPaymentDate(
                                                                    invoice.payment_method_date,
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Cash */}
                                                    {invoice.cash_value !==
                                                        null &&
                                                        parseFloat(
                                                            invoice.cash_value,
                                                        ) > 0 && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">
                                                                    Efectivo
                                                                    Recibido:
                                                                </span>
                                                                <span className="font-medium text-foreground">
                                                                    L.{' '}
                                                                    {parseFloat(
                                                                        invoice.cash_value,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}

                                                    {/* Check */}
                                                    {invoice.check_number && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">
                                                                Número de
                                                                Cheque:
                                                            </span>
                                                            <span className="font-mono font-medium text-foreground">
                                                                {
                                                                    invoice.check_number
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                    {invoice.check_value !==
                                                        null &&
                                                        parseFloat(
                                                            invoice.check_value,
                                                        ) > 0 && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">
                                                                    Monto del
                                                                    Cheque:
                                                                </span>
                                                                <span className="font-medium text-foreground">
                                                                    L.{' '}
                                                                    {parseFloat(
                                                                        invoice.check_value,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}

                                                    {/* Credit Card */}
                                                    {invoice.card_last_4 && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">
                                                                Tarjeta (Últimos
                                                                4):
                                                            </span>
                                                            <span className="font-mono font-medium text-foreground">
                                                                **** **** ****{' '}
                                                                {
                                                                    invoice.card_last_4
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                    {invoice.card_expiration && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">
                                                                Vencimiento
                                                                Tarjeta:
                                                            </span>
                                                            <span className="font-medium text-foreground">
                                                                {
                                                                    invoice.card_expiration
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                    {invoice.card_authorization_code && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">
                                                                Aut. Tarjeta:
                                                            </span>
                                                            <span className="font-mono font-medium text-foreground">
                                                                {
                                                                    invoice.card_authorization_code
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                    {invoice.card_value_charged !==
                                                        null &&
                                                        parseFloat(
                                                            invoice.card_value_charged,
                                                        ) > 0 && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">
                                                                    Monto
                                                                    Cobrado
                                                                    (Tarjeta):
                                                                </span>
                                                                <span className="font-medium text-foreground">
                                                                    L.{' '}
                                                                    {parseFloat(
                                                                        invoice.card_value_charged,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}

                                                    {/* Bank Transfer */}
                                                    {invoice.transfer_bank && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">
                                                                Banco
                                                                Transferencia:
                                                            </span>
                                                            <span className="font-medium text-foreground">
                                                                {
                                                                    invoice
                                                                        .transfer_bank
                                                                        .name
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                    {invoice.transfer_authorization_code && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">
                                                                Referencia/Autorización:
                                                            </span>
                                                            <span className="font-mono font-medium text-foreground">
                                                                {
                                                                    invoice.transfer_authorization_code
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                    {invoice.transfer_value !==
                                                        null &&
                                                        parseFloat(
                                                            invoice.transfer_value,
                                                        ) > 0 && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">
                                                                    Monto
                                                                    Transferido:
                                                                </span>
                                                                <span className="font-medium text-foreground">
                                                                    L.{' '}
                                                                    {parseFloat(
                                                                        invoice.transfer_value,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                </div>
                                            )}

                                            <Separator />

                                            {/* Totals Table */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">
                                                        Importe
                                                    </span>
                                                    <span>
                                                        L.{' '}
                                                        {parseFloat(
                                                            invoice.amount,
                                                        ).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                                                    <span>Descuento</span>
                                                    <span>
                                                        - L.{' '}
                                                        {parseFloat(
                                                            invoice.discount,
                                                        ).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">
                                                        Subtotal
                                                    </span>
                                                    <span>
                                                        L.{' '}
                                                        {parseFloat(
                                                            invoice.subtotal,
                                                        ).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">
                                                        Exento
                                                    </span>
                                                    <span>
                                                        L.{' '}
                                                        {parseFloat(
                                                            invoice.exempt_amount,
                                                        ).toFixed(2)}
                                                    </span>
                                                </div>
                                                <Separator />
                                                <div className="flex justify-between text-base font-bold text-primary">
                                                    <span>Total Facturado</span>
                                                    <span>
                                                        L.{' '}
                                                        {parseFloat(
                                                            invoice.total,
                                                        ).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {invoice.invoice_file && (
                                                <div className="flex gap-2 pt-2">
                                                    <a
                                                        href={`/storage/${invoice.invoice_file}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />{' '}
                                                        Ver Factura PDF
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Credit Status Card */}
                                    {invoice.payment_type === 'credit' &&
                                        credit && (
                                            <div className="space-y-4 rounded-lg border border-yellow-500/30 bg-card bg-yellow-500/[0.02] p-5 text-card-foreground shadow-sm">
                                                <h3 className="flex items-center gap-2 text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                                                    <Coins className="h-5 w-5" />{' '}
                                                    Estado de Cuenta de Crédito
                                                </h3>
                                                <Separator />

                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-3 gap-2 text-center">
                                                        <div className="rounded bg-muted/40 p-2">
                                                            <span className="text-[10px] text-muted-foreground uppercase">
                                                                Crédito
                                                            </span>
                                                            <p className="text-sm font-semibold text-foreground">
                                                                L.{' '}
                                                                {parseFloat(
                                                                    credit.credit_amount,
                                                                ).toFixed(2)}
                                                            </p>
                                                        </div>
                                                        <div className="rounded bg-green-500/10 p-2">
                                                            <span className="text-[10px] text-green-600 uppercase dark:text-green-400">
                                                                Pagado
                                                            </span>
                                                            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                                                L.{' '}
                                                                {parseFloat(
                                                                    credit.amount_paid,
                                                                ).toFixed(2)}
                                                            </p>
                                                        </div>
                                                        <div className="rounded bg-red-500/10 p-2">
                                                            <span className="text-[10px] text-red-600 uppercase dark:text-red-400">
                                                                Pendiente
                                                            </span>
                                                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                                                                L.{' '}
                                                                {parseFloat(
                                                                    credit.amount_remaining,
                                                                ).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Visual Bar */}
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs text-muted-foreground">
                                                            <span>
                                                                Progreso de Pago
                                                            </span>
                                                            <span>
                                                                {(
                                                                    (parseFloat(
                                                                        credit.amount_paid,
                                                                    ) /
                                                                        parseFloat(
                                                                            credit.credit_amount,
                                                                        )) *
                                                                    100
                                                                ).toFixed(0)}
                                                                %
                                                            </span>
                                                        </div>
                                                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                                            <div
                                                                className="h-full bg-green-500 transition-all duration-300"
                                                                style={{
                                                                    width: `${Math.min(100, Math.max(0, (parseFloat(credit.amount_paid) / parseFloat(credit.credit_amount)) * 100))}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    {/* Proof of Payment File */}
                                    {invoice.proof_of_payment && (
                                        <div className="mb-10 space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                            <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                                <FileText className="h-5 w-5" />{' '}
                                                Comprobante de Pago
                                            </h3>
                                            <Separator />

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between rounded bg-muted/40 p-3">
                                                    <div className="flex items-center gap-2">
                                                        {isImageFile(
                                                            invoice.proof_of_payment,
                                                        ) ? (
                                                            <FileImage className="h-5 w-5 text-blue-500" />
                                                        ) : (
                                                            <FileText className="h-5 w-5 text-red-500" />
                                                        )}
                                                        <span className="max-w-[200px] truncate text-xs font-medium">
                                                            {invoice.proof_of_payment
                                                                .split('/')
                                                                .pop()}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <a
                                                            href={`/storage/${invoice.proof_of_payment}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />{' '}
                                                            Ver
                                                        </a>
                                                    </div>
                                                </div>

                                                {isImageFile(
                                                    invoice.proof_of_payment,
                                                ) && (
                                                    <div className="flex max-h-[250px] items-center justify-center overflow-hidden rounded-md border bg-muted/20">
                                                        <img
                                                            src={`/storage/${invoice.proof_of_payment}`}
                                                            alt="Comprobante de Pago"
                                                            className="max-h-[250px] max-w-full object-contain"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-2 rounded-lg border border-dashed p-6 text-center">
                                    <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold">
                                        Sin facturación registrada
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Esta muestra no tiene un comprobante de
                                        facturación asociado.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
