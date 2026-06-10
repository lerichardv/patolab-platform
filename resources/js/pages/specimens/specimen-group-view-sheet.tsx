import {
    Microscope,
    CreditCard,
    ExternalLink,
    Download,
    FileText,
    FileImage,
    Copy,
    Check,
} from 'lucide-react';
import * as React from 'react';
import HeadingSheet from '@/components/heading-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface Props {
    group: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SpecimenGroupViewSheet({
    group,
    open,
    onOpenChange,
}: Props) {
    if (!group) {
        return null;
    }

    const [copied, setCopied] = React.useState(false);
    const [copiedSpecimenId, setCopiedSpecimenId] = React.useState<
        number | null
    >(null);

    const copyPublicLink = () => {
        if (!group.access_token) {
            return;
        }

        const url = `${window.location.origin}/specimen-group/${group.id}?token=${group.access_token}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const copySpecimenPublicLink = (specimen: any) => {
        if (!specimen.access_token) {
            return;
        }

        const url = `${window.location.origin}/specimen/${specimen.sequence_code}?token=${specimen.access_token}`;
        navigator.clipboard.writeText(url);
        setCopiedSpecimenId(specimen.id);
        setTimeout(() => setCopiedSpecimenId(null), 2000);
    };

    const invoice = group.invoice;
    const specimens = group.specimens || [];

    const getPaymentTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            cash: 'Efectivo',
            card: 'Tarjeta de Crédito',
            'credit card': 'Tarjeta de Crédito',
            transfer: 'Transferencia Bancaria',
            'bank transfer': 'Transferencia Bancaria',
            check: 'Cheque',
            credit: 'Crédito',
        };

        return labels[type] || type;
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
            <SheetContent className="z-[100] w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[1000px] lg:max-w-[1100px]">
                <div className="flex h-full flex-col gap-6 pb-8">
                    {/* Header */}
                    <div className="flex items-center gap-3 border-b pr-12 pb-4">
                        <div>
                            <HeadingSheet
                                title={`Grupo: ${group.name}`}
                                description={`Detalles y facturación del grupo de muestras.`}
                            />
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 gap-6 px-5 lg:grid-cols-3">
                        {/* Specimens List (Left 2 Columns) */}
                        <div className="space-y-6 lg:col-span-2">
                            {group.access_token && (
                                <div className="space-y-4 rounded-lg border border-dashed border-primary/20 bg-card bg-primary/[0.01] p-5 text-card-foreground shadow-sm">
                                    <div className="flex flex-col space-y-1.5">
                                        <span className="flex items-center gap-1.5 font-sans text-sm font-semibold text-primary">
                                            <ExternalLink className="h-4 w-4" />{' '}
                                            Enlace Público de Progreso del Grupo
                                        </span>
                                        <p className="text-xs text-muted-foreground">
                                            Comparta este enlace con el cliente
                                            para que pueda consultar el estado
                                            de todas las muestras del grupo.
                                        </p>
                                        <div className="mt-1.5 flex w-full gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={`${window.location.origin}/specimen-group/${group.id}?token=${group.access_token}`}
                                                className="flex-1 rounded-md border bg-background px-3 py-1.5 font-mono text-xs outline-none select-all"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={copyPublicLink}
                                                className="flex h-9 shrink-0 items-center gap-1.5"
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
                                                href={`/specimen-group/${group.id}?token=${group.access_token}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                                            >
                                                Abrir
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                    <Microscope className="h-5 w-5" /> Muestras
                                    en el Grupo ({specimens.length})
                                </h3>
                                <Separator />

                                <div className="space-y-4">
                                    {specimens.map((specimen: any) => (
                                        <div
                                            key={specimen.id}
                                            className="space-y-3 rounded-lg border bg-muted/10 p-4 transition-all hover:bg-muted/20"
                                        >
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-2">
                                                    {specimen.sequence_code && (
                                                        <span className="rounded border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                                                            {
                                                                specimen.sequence_code
                                                            }
                                                        </span>
                                                    )}
                                                    <span
                                                        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white"
                                                        style={{
                                                            backgroundColor:
                                                                specimen.status_color ||
                                                                '#cbd5e1',
                                                        }}
                                                    >
                                                        {specimen.status ===
                                                        'received'
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
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        className="h-2.5 w-2.5 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                specimen
                                                                    .priority
                                                                    ?.color,
                                                        }}
                                                    />
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {
                                                            specimen.priority
                                                                ?.name
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                                                <div>
                                                    <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                        Paciente
                                                    </span>
                                                    <span className="font-medium text-foreground">
                                                        {specimen
                                                            .customer_relation
                                                            ?.name || 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                        Examen
                                                    </span>
                                                    <span className="font-medium text-foreground">
                                                        {specimen.type?.name} -{' '}
                                                        {
                                                            specimen.examination
                                                                ?.name
                                                        }
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                        Tiempo / Categoría
                                                    </span>
                                                    <span className="font-medium text-foreground">
                                                        {specimen.category
                                                            ?.name || 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                        Médico Remitente
                                                    </span>
                                                    <span className="font-medium text-foreground">
                                                        {specimen
                                                            .referrer_relation
                                                            ?.name || 'N/A'}
                                                    </span>
                                                </div>
                                                {specimen.anatomic_site && (
                                                    <div className="sm:col-span-2">
                                                        <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                            Sitio Anatómico
                                                        </span>
                                                        <span className="font-medium text-foreground">
                                                            {
                                                                specimen.anatomic_site
                                                            }
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Specimen public link */}
                                            {specimen.access_token && (
                                                <div className="mt-3 flex flex-col gap-1.5 rounded-md border border-dashed bg-background p-2 text-xs">
                                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                                                        <ExternalLink className="h-3 w-3 text-primary" />{' '}
                                                        Enlace Público
                                                        Individual
                                                    </span>
                                                    <div className="flex w-full gap-2">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={`${window.location.origin}/specimen/${specimen.sequence_code}?token=${specimen.access_token}`}
                                                            className="flex-1 rounded border bg-muted/30 px-2.5 py-1 font-mono text-[11px] outline-none select-all"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                copySpecimenPublicLink(
                                                                    specimen,
                                                                )
                                                            }
                                                            className="flex h-7 shrink-0 items-center gap-1 px-2.5 text-[11px]"
                                                        >
                                                            {copiedSpecimenId ===
                                                            specimen.id ? (
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
                                                            href={`/specimen/${specimen.sequence_code}?token=${specimen.access_token}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex h-7 items-center justify-center rounded border bg-background px-2.5 text-[11px] hover:bg-accent"
                                                        >
                                                            Abrir
                                                        </a>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Specimen medical order file */}
                                            {specimen.medical_order_file && (
                                                <div className="mt-3 flex items-center justify-between rounded-md border bg-background p-2 text-xs">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        {isImageFile(
                                                            specimen.medical_order_file,
                                                        ) ? (
                                                            <FileImage className="h-4 w-4 shrink-0 text-blue-500" />
                                                        ) : (
                                                            <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                                        )}
                                                        <span className="max-w-[240px] truncate font-medium">
                                                            Orden Médica:{' '}
                                                            {specimen.medical_order_file
                                                                .split('/')
                                                                .pop()}
                                                        </span>
                                                    </div>
                                                    <div className="flex shrink-0 gap-1.5">
                                                        <a
                                                            href={`/storage/${specimen.medical_order_file}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex h-7 items-center justify-center gap-1 rounded-md border bg-background px-2.5 text-[11px] font-medium hover:bg-accent"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />{' '}
                                                            Ver
                                                        </a>
                                                        <a
                                                            href={`/storage/${specimen.medical_order_file}`}
                                                            download
                                                            className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-primary px-2.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                                                        >
                                                            <Download className="h-3 w-3" />{' '}
                                                            Descargar
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Billing Info (Right Column) */}
                        <div className="space-y-6">
                            {invoice && (
                                <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                        <CreditCard className="h-5 w-5" />{' '}
                                        Facturación del Grupo
                                    </h3>
                                    <Separator />

                                    <div className="space-y-4 text-sm">
                                        <div className="space-y-1">
                                            <span className="block text-xs text-muted-foreground">
                                                Número de Factura
                                            </span>
                                            <span className="font-semibold text-foreground">
                                                {invoice.full_invoice_number}
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="block text-xs text-muted-foreground">
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

                                        <Separator />

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">
                                                    Importe Neto:
                                                </span>
                                                <span>
                                                    L.{' '}
                                                    {parseFloat(
                                                        invoice.amount,
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                                                <span>Descuentos:</span>
                                                <span>
                                                    - L.{' '}
                                                    {parseFloat(
                                                        invoice.discount,
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs font-semibold">
                                                <span className="text-muted-foreground">
                                                    Subtotal:
                                                </span>
                                                <span>
                                                    L.{' '}
                                                    {parseFloat(
                                                        invoice.subtotal,
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                            <Separator />
                                            <div className="flex justify-between text-sm font-bold text-primary">
                                                <span>Total Factura:</span>
                                                <span>
                                                    L.{' '}
                                                    {parseFloat(
                                                        invoice.total,
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                <span>Total Pagado:</span>
                                                <span>
                                                    L.{' '}
                                                    {parseFloat(
                                                        invoice.total_paid || 0,
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        {invoice.invoice_file && (
                                            <div className="pt-2">
                                                <a
                                                    href={`/storage/${invoice.invoice_file}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />{' '}
                                                    Ver Factura PDF
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Proof of payment */}
                            {invoice && invoice.proof_of_payment && (
                                <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                        <FileText className="h-5 w-5" />{' '}
                                        Comprobante de Pago
                                    </h3>
                                    <Separator />

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between rounded bg-muted/40 p-2.5 text-xs">
                                            <div className="flex min-w-0 items-center gap-2">
                                                {isImageFile(
                                                    invoice.proof_of_payment,
                                                ) ? (
                                                    <FileImage className="h-4 w-4 shrink-0 text-blue-500" />
                                                ) : (
                                                    <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                                )}
                                                <span className="max-w-[150px] truncate font-medium">
                                                    {invoice.proof_of_payment
                                                        .split('/')
                                                        .pop()}
                                                </span>
                                            </div>
                                            <a
                                                href={`/storage/${invoice.proof_of_payment}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border bg-background px-3 text-xs font-medium hover:bg-accent"
                                            >
                                                <ExternalLink className="h-3 w-3" />{' '}
                                                Ver
                                            </a>
                                        </div>
                                        {isImageFile(
                                            invoice.proof_of_payment,
                                        ) && (
                                            <div className="flex max-h-[200px] items-center justify-center overflow-hidden rounded-md border bg-muted/10">
                                                <img
                                                    src={`/storage/${invoice.proof_of_payment}`}
                                                    alt="Comprobante de Pago"
                                                    className="max-h-[200px] max-w-full object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
